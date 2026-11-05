// =====================================================================
// push-lembretes: manda pro celular (notificação do app do painel) o que
// tem pra fazer no dia: tarefas, campanhas, follow-ups, vencimentos,
// conteúdos e a agenda do Google.
//   GET                      -> chave pública pro celular se inscrever
//   POST com x-sched-key     -> resumo do dia (o pg_cron chama às 8h)
//   POST com login do painel -> manda um teste agora: { "teste": true }
// Deixe o "Verify JWT" DESLIGADO: o pg_cron não manda login; a função
// confere sozinha a chave do agendador ou o login.
// As chaves de envio (VAPID) são criadas aqui mesmo na primeira vez e
// ficam na tabela push_chaves, que só as funções conseguem ler.
// =====================================================================
import webpush from "npm:web-push@3.6.7";
import { chaveAgendadorOk, cors, db, json } from "../_shared/comum.ts";
import { eventosDoIcs, linkValido } from "../agenda-google/ical.js";

async function chaves() {
  const { data } = await db.from("push_chaves").select("publica, privada").eq("id", "main").maybeSingle();
  if (data) return data;
  const novas = webpush.generateVAPIDKeys();
  const linha = { id: "main", publica: novas.publicKey, privada: novas.privateKey };
  await db.from("push_chaves").upsert(linha, { onConflict: "id", ignoreDuplicates: true });
  // Se duas chamadas criaram ao mesmo tempo, vale a que ficou no banco
  const { data: salva } = await db.from("push_chaves").select("publica, privada").eq("id", "main").single();
  return salva!;
}

// Data de hoje no horário de Brasília (AAAA-MM-DD)
const hojeBR = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

const ETAPA_CONTEUDO: Record<string, string> = { ideia: "Ideia", roteiro: "Roteiro", gravacao: "Gravar", edicao: "Editar", agendado: "Agendado" };

async function doDia(dia: string) {
  const [tarefas, eventos, conteudos, cfg] = await Promise.all([
    db.from("plan_tarefas").select("titulo").eq("data", dia).eq("feita", false).order("created_at"),
    db.from("cal_eventos").select("titulo, tipo").eq("data", dia).order("created_at"),
    db.from("conteudos").select("titulo, status").eq("data", dia).neq("status", "publicado"),
    db.from("config_painel").select("valor").eq("chave", "gcal_ical").maybeSingle(),
  ]);
  const itens: string[] = [
    ...(eventos.data || []).filter((e) => e.tipo === "campanha").map((e) => `📣 ${e.titulo}`),
    ...(tarefas.data || []).map((t) => `✅ ${t.titulo}`),
    ...(eventos.data || []).filter((e) => e.tipo === "followup").map((e) => `💬 ${e.titulo}`),
    ...(eventos.data || []).filter((e) => e.tipo === "vencimento").map((e) => `💸 ${e.titulo}`),
    ...(conteudos.data || []).map((c) => `🎬 ${c.titulo}${ETAPA_CONTEUDO[c.status] ? ` (${ETAPA_CONTEUDO[c.status]})` : ""}`),
  ];
  const url = cfg.data?.valor || "";
  if (url && linkValido(url)) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": "painel-tatiele" }, signal: AbortSignal.timeout(8000) });
      if (r.ok) for (const e of eventosDoIcs(await r.text(), dia, dia)) itens.push(`📅 ${e.hora ? `${e.hora} ` : ""}${e.titulo}`);
    } catch { /* sem a agenda do Google hoje */ }
  }
  return itens;
}

async function enviarATodos(aviso: { titulo: string; texto: string; tag: string; url: string }) {
  const k = await chaves();
  webpush.setVapidDetails("https://tatielemilani.com", k.publica, k.privada);
  const { data: inscricoes } = await db.from("push_inscricoes").select("id, endpoint, p256dh, auth");
  let enviados = 0;
  for (const i of inscricoes || []) {
    try {
      await webpush.sendNotification({ endpoint: i.endpoint, keys: { p256dh: i.p256dh, auth: i.auth } }, JSON.stringify(aviso), { TTL: 12 * 3600 });
      enviados++;
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) await db.from("push_inscricoes").delete().eq("id", i.id); // celular desinstalou ou desativou
      else console.error("push-lembretes:", status, (e as Error).message);
    }
  }
  return { enviados, aparelhos: (inscricoes || []).length };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method === "GET") return json({ publica: (await chaves()).publica });
  if (req.method !== "POST") return json({ erro: "Use GET ou POST" }, 405);

  const dia = hojeBR();
  if (chaveAgendadorOk(req)) {
    const itens = await doDia(dia);
    if (!itens.length) return json({ ok: true, nada: true }); // dia livre: não incomoda
    const texto = itens.slice(0, 6).join("\n") + (itens.length > 6 ? `\ne mais ${itens.length - 6}` : "");
    const r = await enviarATodos({ titulo: `Hoje você tem ${itens.length} ${itens.length === 1 ? "coisa" : "coisas"} pra fazer`, texto, tag: `dia-${dia}`, url: "./#focos/calendario" });
    return json({ ok: true, ...r });
  }

  // Teste pedido pelo painel: só quem está logado
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: quem } = await db.auth.getUser(token);
  if (!quem?.user) return json({ erro: "Faça login no painel." }, 401);
  const itens = await doDia(dia);
  const r = await enviarATodos({
    titulo: "Pronto! Avisos ligados 🔔",
    texto: itens.length ? `Hoje: ${itens.slice(0, 3).join(" • ")}${itens.length > 3 ? ` e mais ${itens.length - 3}` : ""}` : "Todo dia às 8h chega aqui o que você tem pra fazer.",
    tag: "teste", url: "./#focos/calendario",
  });
  return json({ ok: true, ...r });
});
