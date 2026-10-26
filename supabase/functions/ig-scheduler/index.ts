// =====================================================================
// ig-scheduler: o CARTEIRO. Roda a cada 1 minuto (pg_cron).
//  1) Esvazia a fila do freio (ig_send_queue).
//  2) Manda os passos com atraso que já venceram (ig_scheduled).
// Protegido pelo segredo SCHED_SECRET (header x-sched-key).
// Publicar com --no-verify-jwt (quem protege é o SCHED_SECRET).
// =====================================================================
import { chaveAgendadorOk, db, json } from "../_shared/comum.ts";
import {
  acharPasso, type Automacao, deliverAutomation, depoisDoPasso, registrarEnvio, sendStep,
} from "../_shared/envio.ts";

const SETE_DIAS = 7 * 24 * 3600 * 1000; // resposta a comentário só vale ~7 dias
const MAX_TENTATIVAS = 5;

Deno.serve(async (req) => {
  if (!chaveAgendadorOk(req)) return json({ erro: "não autorizado" }, 401);

  const resumo = { fila_enviados: 0, fila_erros: 0, fila_expirados: 0, freio_cheio: false, atrasados_enviados: 0 };

  // ---------------------------------------------------------------
  // 1) Fila do freio (do mais antigo pro mais novo)
  // ---------------------------------------------------------------
  const { data: fila } = await db.from("ig_send_queue").select("*")
    .eq("status", "pendente").order("created_at", { ascending: true }).limit(30);

  for (const item of fila ?? []) {
    if (Date.now() - new Date(item.created_at).getTime() > SETE_DIAS) {
      await db.from("ig_send_queue")
        .update({ status: "expirado", last_error: "comentário com mais de 7 dias" }).eq("id", item.id);
      resumo.fila_expirados++;
      continue;
    }

    const { data: a } = await db.from("ig_automations").select("*").eq("id", item.automation_id).maybeSingle();
    if (!a || !a.active) {
      await db.from("ig_send_queue")
        .update({ status: "erro", last_error: "automação apagada ou desligada" }).eq("id", item.id);
      resumo.fila_erros++;
      continue;
    }

    // Manda o passo 0 do fluxo (passa pelo freio de novo).
    const res = await deliverAutomation(a as Automacao, {
      commentId: item.comment_id, igUserId: item.ig_user_id, username: item.username, keyword: item.keyword,
    }, { viaFila: true });

    if (res.status === "throttled") {
      resumo.freio_cheio = true;
      break; // sem ficha: tenta no próximo minuto
    }
    if (res.status === "ok") {
      await db.from("ig_send_queue").update({ status: "enviado", sent_at: new Date().toISOString() }).eq("id", item.id);
      resumo.fila_enviados++;
    } else {
      const tentativas = (item.tentativas ?? 0) + 1;
      await db.from("ig_send_queue").update({
        tentativas, last_error: res.motivo ?? "erro", status: tentativas >= MAX_TENTATIVAS ? "erro" : "pendente",
      }).eq("id", item.id);
      resumo.fila_erros++;
    }
  }

  // ---------------------------------------------------------------
  // 2) Passos com atraso que já venceram
  // ---------------------------------------------------------------
  const { data: vencidos } = await db.from("ig_scheduled").select("*")
    .eq("sent", false).lte("send_at", new Date().toISOString()).limit(50);

  for (const ag of vencidos ?? []) {
    // Marca ANTES de mandar, pra nunca mandar duas vezes.
    const { data: marcado } = await db.from("ig_scheduled").update({ sent: true })
      .eq("id", ag.id).eq("sent", false).select("id");
    if (!marcado?.length) continue;

    const { data: a } = await db.from("ig_automations").select("*").eq("id", ag.automation_id).maybeSingle();
    const passo = a ? acharPasso(a as Automacao, ag.step_id) : null;
    if (!a || !passo) continue;

    const r = await sendStep(a as Automacao, passo, { id: ag.ig_user_id }, ag.ig_user_id);
    await registrarEnvio({
      ig_user_id: ag.ig_user_id, automation_id: a.id, canal: "dm", tipo: r.tipo,
      status: r.ok ? "ok" : "erro", motivo: r.motivo,
    });
    if (r.ok) {
      await depoisDoPasso(a as Automacao, passo, ag.ig_user_id);
      resumo.atrasados_enviados++;
    }
  }

  // Faxina: esquece eventos processados com mais de 7 dias.
  await db.from("ig_processed_events").delete().lt("created_at", new Date(Date.now() - SETE_DIAS).toISOString());

  return json(resumo);
});
