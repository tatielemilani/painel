// =====================================================================
// push-lembretes: manda pro celular (notificação do app do painel) o que
// tem pra fazer no dia: tarefas, campanhas, follow-ups, vencimentos, conteúdos e a agenda do Google.
// Tudo que está atrasado (tarefa não feita, conteúdo não publicado, etapa de campanha não passada)
// continua no aviso todo dia, no topo, até ser resolvido.
//   GET                      -> chave pública pro celular se inscrever
//   POST com x-sched-key     -> resumo do dia (o pg_cron chama às 8h); com { "teste": true }, só o teste
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

// Etapas das campanhas (mesma ordem do painel). Uma etapa com data até hoje continua
// no aviso todo dia até a campanha passar dela (botão "Fiz" no painel).
const ORDEM_CAMPANHA = ["briefing", "roteiro", "gravacao", "aprovacao", "postagem", "faturamento", "finalizada"];
const NOME_ETAPA: Record<string, string> = { roteiro: "Roteiro", gravacao: "Gravação", postagem: "Postagem" };
const dataCurta = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

async function doDia(dia: string) {
  const [tarefas, eventos, conteudos, cfg, campanhas] = await Promise.all([
    db.from("plan_tarefas").select("titulo, data").lte("data", dia).eq("feita", false).order("data").order("created_at"),
    db.from("cal_eventos").select("titulo, tipo, campanha_id").eq("data", dia).order("created_at"),
    db.from("conteudos").select("titulo, status, data").lte("data", dia).neq("status", "publicado").order("data"),
    db.from("config_painel").select("valor").eq("chave", "gcal_ical").maybeSingle(),
    db.from("campanhas").select("titulo, cliente, status, datas").neq("status", "finalizada"),
  ]);
  const etapas: { data: string; texto: string }[] = [];
  for (const c of campanhas.data || []) {
    for (const e of Object.keys(NOME_ETAPA)) {
      const d = c.datas?.[e];
      if (!d || d > dia || ORDEM_CAMPANHA.indexOf(e) < ORDEM_CAMPANHA.indexOf(c.status)) continue;
      etapas.push({ data: d, texto: `📣 ${NOME_ETAPA[e]}: ${c.titulo}${c.cliente ? ` (${c.cliente})` : ""}${d < dia ? ` · atrasada desde ${dataCurta(d)}` : ""}` });
    }
  }
  etapas.sort((a, b) => a.data.localeCompare(b.data));
  const desde = (d: string) => (d < dia ? ` · atrasada desde ${dataCurta(d)}` : "");
  const tarefasAtrasadas = (tarefas.data || []).filter((t) => t.data < dia);
  const tarefasHoje = (tarefas.data || []).filter((t) => t.data >= dia);
  const conteudosAtrasados = (conteudos.data || []).filter((c) => c.data < dia);
  const conteudosHoje = (conteudos.data || []).filter((c) => c.data >= dia);
  const nomeConteudo = (c: { titulo: string; status: string; data: string }) =>
    `🎬 ${c.titulo}${ETAPA_CONTEUDO[c.status] ? ` (${ETAPA_CONTEUDO[c.status]})` : ""}${desde(c.data)}`;
  const atrasados = etapas.filter((e) => e.data < dia).length + tarefasAtrasadas.length + conteudosAtrasados.length;
  const itens: string[] = [
    // Atrasados primeiro
    ...etapas.filter((e) => e.data < dia).map((e) => e.texto),
    ...tarefasAtrasadas.map((t) => `✅ ${t.titulo}${desde(t.data)}`),
    ...conteudosAtrasados.map(nomeConteudo),
    ...etapas.filter((e) => e.data >= dia).map((e) => e.texto),
    // Campanhas vêm acima, direto da campanha; aqui só eventos de campanha soltos
    ...(eventos.data || []).filter((e) => e.tipo === "campanha" && !e.campanha_id).map((e) => `📣 ${e.titulo}`),
    ...tarefasHoje.map((t) => `✅ ${t.titulo}`),
    ...(eventos.data || []).filter((e) => e.tipo === "followup").map((e) => `💬 ${e.titulo}`),
    ...(eventos.data || []).filter((e) => e.tipo === "vencimento").map((e) => `💸 ${e.titulo}`),
    ...conteudosHoje.map(nomeConteudo),
  ];
  const url = cfg.data?.valor || "";
  if (url && linkValido(url)) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": "painel-tatiele" }, signal: AbortSignal.timeout(8000) });
      if (r.ok) for (const e of eventosDoIcs(await r.text(), dia, dia)) itens.push(`📅 ${e.hora ? `${e.hora} ` : ""}${e.titulo}`);
    } catch { /* sem a agenda do Google hoje */ }
  }
  return { itens, atrasados, temCampanha: etapas.length > 0 };
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
      const { statusCode: status, body } = e as { statusCode?: number; body?: string };
      console.error("push-lembretes:", status, (e as Error).message, String(body || "").slice(0, 200));
      if (status === 404 || status === 410) await db.from("push_inscricoes").delete().eq("id", i.id); // celular desinstalou ou desativou
    }
  }
  return { enviados, aparelhos: (inscricoes || []).length };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method === "GET") return json({ publica: (await chaves()).publica });
  if (req.method !== "POST") return json({ erro: "Use GET ou POST" }, 405);

  const dia = hojeBR();
  const pedido = await req.json().catch(() => ({}));
  const teste = async () => {
    const { itens } = await doDia(dia);
    return json({ ok: true, ...(await enviarATodos({
      titulo: "Pronto! Avisos ligados 🔔",
      texto: itens.length ? `Hoje: ${itens.slice(0, 3).join(" • ")}${itens.length > 3 ? ` e mais ${itens.length - 3}` : ""}` : "Todo dia às 8h chega aqui o que você tem pra fazer.",
      tag: "teste", url: "./#focos/calendario",
    })) });
  };
  if (chaveAgendadorOk(req)) {
    if (pedido.teste) return await teste();
    const { itens, atrasados, temCampanha } = await doDia(dia);
    if (!itens.length) return json({ ok: true, nada: true }); // dia livre: não incomoda
    const texto = itens.slice(0, 6).join("\n") + (itens.length > 6 ? `\ne mais ${itens.length - 6}` : "");
    const r = await enviarATodos({ titulo: `Hoje você tem ${itens.length} ${itens.length === 1 ? "coisa" : "coisas"} pra fazer${atrasados ? ` (${atrasados} ${atrasados === 1 ? "atrasada" : "atrasadas"})` : ""}`, texto, tag: `dia-${dia}`, url: temCampanha ? "./#conteudo/profissional" : "./#focos/calendario" });
    return json({ ok: true, ...r });
  }

  // Teste pedido pelo painel: só quem está logado
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: quem } = await db.auth.getUser(token);
  if (!quem?.user) return json({ erro: "Faça login no painel." }, 401);
  return await teste();
});
