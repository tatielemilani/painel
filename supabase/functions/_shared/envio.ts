// =====================================================================
// envio.ts: tudo que MANDA mensagem (o passo do fluxo, o freio, o log).
// Usado pelo instagram-webhook e pelo ig-scheduler.
// =====================================================================
import { db, graph } from "./comum.ts";

// ---------------------------------------------------------------------
// Formato do campo "flow" da automação (veja o LEIA-ME)
// ---------------------------------------------------------------------
export type Botao = { title?: string; next?: number | string | null; url?: string | null };
export type Passo = {
  id: number | string;
  message?: string;
  buttons?: Botao[];
  assets?: string[];
  collect?: { field: string; next?: number | string | null };
  delay?: { seconds: number; next: number | string };
};
export type Automacao = {
  id: string;
  nome: string;
  keyword: string;
  match_any: boolean;
  active: boolean;
  media_ids: string[];
  public_reply: string;
  public_reply_variants: string[];
  flow: { steps: Passo[] };
  asset_ids: string[];
};

// Pra onde vai a mensagem: resposta privada a um comentário, ou DM pelo id da pessoa.
export type Destino = { comment_id: string } | { id: string };
export type ResultadoEnvio = { ok: boolean; hard: boolean; motivo: string; tipo: "flow" | "link" | "text" };

// A Mensagem 1 é SEMPRE o primeiro item do array (não procura id 0).
export const primeiroPasso = (a: Automacao) => a.flow?.steps?.[0] ?? null;
export const acharPasso = (a: Automacao, id: unknown) =>
  a.flow?.steps?.find((s) => String(s.id) === String(id)) ?? null;

// Limites do Instagram
const MAX_TITULO = 20;          // título do botão
const MAX_ANEXADOS = 3;         // botões anexados (button template)
const MAX_PILULAS = 13;         // quick replies
const MAX_TEXTO_TEMPLATE = 640;
const MAX_TEXTO = 1000;

// ---------------------------------------------------------------------
// Log de envio (tabela ig_deliveries)
// ---------------------------------------------------------------------
export async function registrarEnvio(d: {
  ig_user_id: string; automation_id?: string | null; canal: "private_reply" | "dm";
  tipo: string; status: "ok" | "erro" | "na_fila"; motivo?: string;
}) {
  const { error } = await db.from("ig_deliveries").insert(d);
  if (error) console.error("ig_deliveries:", error.message);
}

// ---------------------------------------------------------------------
// FREIO (balde de fichas no Postgres). Falha FECHADA: se a função não
// existir, NÃO envia (e avisa no log o que fazer).
// ---------------------------------------------------------------------
export async function freioPegarFicha(chave = "private_reply"): Promise<boolean> {
  const { data, error } = await db.rpc("take_send_slot", { p_key: chave });
  if (error) {
    console.error(
      "FREIO INDISPONÍVEL: rode o supabase/sql/02_freio.sql. Sem ele NENHUMA DM por comentário sai.",
      error.message,
    );
    return false;
  }
  return data === true;
}

export async function freioRegistrar(ok: boolean, hard: boolean, chave = "private_reply") {
  const { error } = await db.rpc("record_send_result", { p_key: chave, p_ok: ok, p_hard: hard });
  if (error) console.error("record_send_result:", error.message);
}

// ---------------------------------------------------------------------
// Envio cru de uma mensagem. Guarda o mid em ig_bot_sends (pra reconhecer o echo).
// ---------------------------------------------------------------------
export async function enviarMensagem(destino: Destino, message: unknown) {
  const r = await graph("/me/messages", { method: "POST", body: { recipient: destino, message } });
  const mid = r.data?.message_id;
  if (r.ok && mid) {
    const { error } = await db.from("ig_bot_sends").insert({ mid });
    if (error && error.code !== "23505") console.error("ig_bot_sends:", error.message);
  }
  return r;
}

// Arruma um link sem "https://" na frente.
function arrumarLink(url: string) {
  const u = (url ?? "").trim();
  if (!u) return "";
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}

// Converte os botões do passo em botões enviáveis. Botão sem destino é DESCARTADO.
type BotaoEnviavel = { tipo: "url" | "postback"; title: string; url?: string; payload?: string };
function botoesEnviaveis(a: Automacao, passo: Passo): BotaoEnviavel[] {
  const lista: BotaoEnviavel[] = [];
  for (const b of passo.buttons ?? []) {
    const url = b.url ? arrumarLink(b.url) : "";
    const temNext = b.next !== undefined && b.next !== null && b.next !== "";
    if (url) {
      lista.push({ tipo: "url", title: (b.title?.trim() || "Acessar").slice(0, MAX_TITULO), url });
    } else if (temNext) {
      lista.push({
        tipo: "postback",
        title: (b.title?.trim() || "Continuar").slice(0, MAX_TITULO),
        payload: `STEP:${a.id}:${b.next}`,
      });
    }
    // sem url e sem next = "encerrar": não vira botão
  }
  return lista;
}

// ---------------------------------------------------------------------
// sendStep: manda UM passo do fluxo, com os botões ANEXADOS ao balão
// (button template). Se o Instagram recusar, tenta como pílula
// (quick_reply) e por último como texto puro (com o link no texto),
// pra a mensagem nunca deixar de chegar.
// ---------------------------------------------------------------------
export async function sendStep(a: Automacao, passo: Passo, destino: Destino, igUserId: string): Promise<ResultadoEnvio> {
  const texto = (passo.message ?? "").trim() || "👇";
  const botoes = botoesEnviaveis(a, passo);
  const tipo: ResultadoEnvio["tipo"] = botoes.length === 0
    ? "text"
    : botoes.every((b) => b.tipo === "url") ? "link" : "flow";
  let motivoErro = "";

  const sucesso = async (motivo: string): Promise<ResultadoEnvio> => {
    if (passo.assets?.length) await enviarArquivos(passo.assets, igUserId, a.id);
    return { ok: true, hard: false, motivo, tipo };
  };

  // 1) Botões ANEXADOS (button template): no máximo 3.
  if (botoes.length > 0 && botoes.length <= MAX_ANEXADOS) {
    const r = await enviarMensagem(destino, {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text: texto.slice(0, MAX_TEXTO_TEMPLATE),
          buttons: botoes.map((b) =>
            b.tipo === "url"
              ? { type: "web_url", url: b.url, title: b.title }
              : { type: "postback", payload: b.payload, title: b.title }
          ),
        },
      },
    });
    if (r.ok) return await sucesso("botões anexados");
    motivoErro = `template: ${r.error?.message}`;
    if (r.hard) return { ok: false, hard: true, motivo: motivoErro, tipo }; // bloqueio: não insiste
  }

  // Os links não viram pílula: vão escritos no texto.
  const linhasLink = botoes.filter((b) => b.tipo === "url").map((b) => `${b.title}: ${b.url}`);
  const textoComLinks = [texto, ...linhasLink].join("\n\n").slice(0, MAX_TEXTO);

  // 2) Pílulas (quick_reply): só os botões que avançam. Até 13.
  const avancam = botoes.filter((b) => b.tipo === "postback");
  if (avancam.length > 0) {
    const r = await enviarMensagem(destino, {
      text: textoComLinks,
      quick_replies: avancam.slice(0, MAX_PILULAS).map((b) => ({
        content_type: "text", title: b.title, payload: b.payload,
      })),
    });
    if (r.ok) return await sucesso("fallback pílula");
    motivoErro = [motivoErro, `pílula: ${r.error?.message}`].filter(Boolean).join(" | ");
    if (r.hard) return { ok: false, hard: true, motivo: motivoErro, tipo };
  }

  // 3) Texto puro.
  const r = await enviarMensagem(destino, { text: textoComLinks });
  if (r.ok) return await sucesso(botoes.length ? "fallback texto" : "texto");
  motivoErro = [motivoErro, `texto: ${r.error?.message}`].filter(Boolean).join(" | ");
  return { ok: false, hard: !!r.hard, motivo: motivoErro, tipo };
}

// Manda os arquivos (PDF, áudio, foto, vídeo) pela DM. Falha aqui não derruba o passo.
async function enviarArquivos(ids: string[], igUserId: string, automationId: string) {
  const { data: arquivos } = await db.from("ig_assets").select("*").in("id", ids);
  for (const arq of arquivos ?? []) {
    // Reaproveita o upload anterior (attachment_id) quando o Instagram já devolveu um.
    const payload = arq.attachment_id
      ? { attachment_id: arq.attachment_id }
      : { url: arq.public_url, is_reusable: true };
    const r = await enviarMensagem({ id: igUserId }, { attachment: { type: arq.tipo, payload } });
    if (r.ok && r.data?.attachment_id && !arq.attachment_id) {
      await db.from("ig_assets").update({ attachment_id: r.data.attachment_id }).eq("id", arq.id);
    }
    if (!r.ok) {
      await registrarEnvio({
        ig_user_id: igUserId, automation_id: automationId, canal: "dm", tipo: "text", status: "erro",
        motivo: `arquivo "${arq.nome}" não enviado: ${r.error?.message}`,
      });
    }
  }
}

// ---------------------------------------------------------------------
// Depois de um passo enviado: atualiza o lead e agenda o que vier depois
// (pedido de dado ou envio com atraso).
// ---------------------------------------------------------------------
export async function depoisDoPasso(a: Automacao, passo: Passo, igUserId: string, extras: Record<string, unknown> = {}) {
  const lead: Record<string, unknown> = {
    ig_user_id: igUserId,
    automation_id: a.id,
    flow_step: String(passo.id),
    expecting: passo.collect?.field
      ? { field: passo.collect.field, automation_id: a.id, next: passo.collect.next ?? null }
      : null,
    updated_at: new Date().toISOString(),
    ...extras,
  };
  if ((passo.buttons ?? []).some((b) => !!b.url)) lead.link_sent = true;
  const { error } = await db.from("ig_leads").upsert(lead);
  if (error) console.error("ig_leads:", error.message);

  if (passo.delay?.seconds && passo.delay.next !== undefined && passo.delay.next !== null) {
    await db.from("ig_scheduled").insert({
      ig_user_id: igUserId,
      automation_id: a.id,
      step_id: String(passo.delay.next),
      send_at: new Date(Date.now() + passo.delay.seconds * 1000).toISOString(),
    });
  }
}

// ---------------------------------------------------------------------
// deliverAutomation: entrega a Mensagem 1 como resposta privada a um
// comentário, passando ANTES pelo freio.
// Retorna "ok", "throttled" (foi pra fila) ou "erro".
// ---------------------------------------------------------------------
export async function deliverAutomation(
  a: Automacao,
  ctx: { commentId: string; igUserId: string; username?: string | null; keyword?: string | null },
  opcoes: { viaFila?: boolean } = {},
): Promise<{ status: "ok" | "throttled" | "erro"; motivo?: string }> {
  const passo = primeiroPasso(a);
  if (!passo) {
    await registrarEnvio({
      ig_user_id: ctx.igUserId, automation_id: a.id, canal: "private_reply", tipo: "flow",
      status: "erro", motivo: "automação sem mensagem",
    });
    return { status: "erro", motivo: "automação sem mensagem" };
  }

  // Freio: sem ficha, vai pra fila (o ig-scheduler manda depois).
  if (!(await freioPegarFicha())) {
    if (!opcoes.viaFila) {
      const { error } = await db.from("ig_send_queue").upsert({
        comment_id: ctx.commentId, automation_id: a.id, ig_user_id: ctx.igUserId,
        username: ctx.username ?? null, keyword: ctx.keyword ?? null,
      }, { onConflict: "comment_id", ignoreDuplicates: true });
      if (error) {
        console.error("ig_send_queue:", error.message);
        return { status: "erro", motivo: "não consegui pôr na fila" };
      }
      await registrarEnvio({
        ig_user_id: ctx.igUserId, automation_id: a.id, canal: "private_reply", tipo: "flow",
        status: "na_fila", motivo: "freio: teto de envio atingido",
      });
    }
    return { status: "throttled" };
  }

  const r = await sendStep(a, passo, { comment_id: ctx.commentId }, ctx.igUserId);
  await freioRegistrar(r.ok, r.hard);
  await registrarEnvio({
    ig_user_id: ctx.igUserId, automation_id: a.id, canal: "private_reply",
    tipo: r.tipo, status: r.ok ? "ok" : "erro", motivo: r.motivo,
  });
  if (!r.ok) return { status: "erro", motivo: r.motivo };

  await depoisDoPasso(a, passo, ctx.igUserId, {
    username: ctx.username ?? null, last_source: "comment", last_keyword: ctx.keyword ?? null,
  });
  return { status: "ok" };
}
