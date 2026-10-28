// =====================================================================
// instagram-webhook: o CÉREBRO do sistema.
// Recebe os avisos do Instagram (comentários, mensagens, toques em botão)
// e responde sozinho.
//
// Precisa ser PÚBLICA (publicar com --no-verify-jwt), senão o Meta não consegue chamar.
// =====================================================================
import { db, env, graph, IG_ACCOUNT_ID, normalizar, primeiraVez } from "../_shared/comum.ts";
import {
  acharPasso, type Automacao, deliverAutomation, depoisDoPasso, enviarMensagem, primeiroPasso,
  registrarEnvio, sendStep,
} from "../_shared/envio.ts";

const VERIFY_TOKEN = env("VERIFY_TOKEN");
const APP_SECRET = env("APP_SECRET");
const APP_SECRET_ENFORCE = env("APP_SECRET_ENFORCE", "false") === "true";
// Contas de teste: ignoram a regra do "1 por dia".
const CONTAS_TESTE = env("TEST_IG_ACCOUNTS").split(",").map((s) => s.trim()).filter(Boolean);

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // ---------------------------------------------------------------
  // a) Verificação: o "aperto de mão" do Meta
  // ---------------------------------------------------------------
  if (req.method === "GET") {
    const modo = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const desafio = url.searchParams.get("hub.challenge");
    if (modo === "subscribe" && VERIFY_TOKEN && token === VERIFY_TOKEN) {
      return new Response(desafio ?? "", { status: 200 });
    }
    return new Response("Token de verificação inválido", { status: 403 });
  }

  if (req.method !== "POST") return new Response("ok", { status: 200 });

  // ---------------------------------------------------------------
  // b) Recebimento
  // ---------------------------------------------------------------
  const corpo = await req.text();

  // Assinatura: só BLOQUEIA se APP_SECRET_ENFORCE=true. Senão só avisa no log (modo teste).
  if (!(await assinaturaValida(corpo, req.headers.get("x-hub-signature-256")))) {
    if (APP_SECRET_ENFORCE) return new Response("Assinatura inválida", { status: 401 });
    console.warn("AVISO: assinatura inválida ou ausente (modo teste: processando mesmo assim).");
  }

  let payload: any;
  try {
    payload = JSON.parse(corpo);
  } catch {
    return new Response("JSON inválido", { status: 400 });
  }

  // Processa cada evento. Um erro não derruba os outros: o Meta precisa do 200.
  for (const entry of payload?.entry ?? []) {
    const contaId = String(entry.id ?? "");
    for (const change of entry.changes ?? []) {
      if (change.field === "comments") {
        await handleComment(change.value, contaId).catch((e) => console.error("handleComment:", e));
      }
    }
    for (const evento of entry.messaging ?? []) {
      await handleMessage(evento, contaId).catch((e) => console.error("handleMessage:", e));
    }
  }

  return new Response("EVENT_RECEIVED", { status: 200 });
});

// ---------------------------------------------------------------------
// Assinatura HMAC SHA-256 com o APP_SECRET
// ---------------------------------------------------------------------
async function assinaturaValida(corpo: string, cabecalho: string | null) {
  if (!APP_SECRET || !cabecalho?.startsWith("sha256=")) return false;
  const chave = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(APP_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const assinatura = await crypto.subtle.sign("HMAC", chave, new TextEncoder().encode(corpo));
  const esperado = [...new Uint8Array(assinatura)].map((b) => b.toString(16).padStart(2, "0")).join("");
  const recebido = cabecalho.slice(7);
  if (esperado.length !== recebido.length) return false;
  let dif = 0; // comparação em tempo constante
  for (let i = 0; i < esperado.length; i++) dif |= esperado.charCodeAt(i) ^ recebido.charCodeAt(i);
  return dif === 0;
}

// É a própria conta (dono do post)?
const ehPropriaConta = (id: string, contaId: string) => !!id && (id === IG_ACCOUNT_ID || id === contaId);

// ---------------------------------------------------------------------
// Achar a automação certa pra um texto (e um post, se for comentário)
// ---------------------------------------------------------------------
function casaPalavra(texto: string, a: Automacao) {
  const t = normalizar(texto);
  const palavras = (a.keyword ?? "").split(",").map(normalizar).filter(Boolean);
  return palavras.some((p) => {
    // Palavra só de letras/números: tem que aparecer inteira ("eu quero" casa "quero", "queroso" não).
    // Letra repetida também vale ("queroo", "queeero"). Emoji ou símbolo: basta conter.
    if (/^[a-z0-9 ]+$/.test(p)) {
      const molde = p.split(" ").map((w) => [...w].map((c) => `${c}+`).join("")).join(" +");
      return new RegExp(`(^|[^a-z0-9])${molde}([^a-z0-9]|$)`).test(t);
    }
    return t.includes(p);
  });
}

async function automacoesAtivas(): Promise<Automacao[]> {
  const { data, error } = await db.from("ig_automations").select("*").eq("active", true);
  if (error) console.error("ig_automations:", error.message);
  return (data ?? []) as Automacao[];
}

function escolherAutomacao(lista: Automacao[], texto: string, mediaId: string | null, permitirQualquer = true) {
  // Prioridade: post específico + palavra > post específico + qualquer
  //           > todos os posts + palavra > todos os posts + qualquer
  const candidatas = lista
    .filter((a) => !a.media_ids?.length || (mediaId !== null && a.media_ids.includes(mediaId)))
    .map((a) => {
      const porPalavra = casaPalavra(texto, a);
      const casa = porPalavra || (permitirQualquer && a.match_any);
      return { a, casa, nota: (a.media_ids?.length ? 2 : 0) + (porPalavra ? 1 : 0) };
    })
    .filter((c) => c.casa)
    .sort((x, y) => y.nota - x.nota);
  return candidatas[0]?.a ?? null;
}

// Regra do "1 por dia": já recebeu uma DM ok nas últimas 24h (ou tem algo esperando na fila)?
async function jaRecebeuHoje(igUserId: string) {
  const desde = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count } = await db.from("ig_deliveries").select("id", { count: "exact", head: true })
    .eq("ig_user_id", igUserId).eq("status", "ok").gte("ts", desde);
  if ((count ?? 0) > 0) return true;
  const { count: naFila } = await db.from("ig_send_queue").select("id", { count: "exact", head: true })
    .eq("ig_user_id", igUserId).eq("status", "pendente");
  return (naFila ?? 0) > 0;
}

// Resposta pública no comentário (alterna entre as variações A/B).
async function responderComentario(a: Automacao, commentId: string) {
  const opcoes = [a.public_reply, ...(a.public_reply_variants ?? [])]
    .map((s) => (s ?? "").trim()).filter(Boolean);
  if (!opcoes.length) return;
  const texto = opcoes[Math.floor(Math.random() * opcoes.length)];
  const r = await graph(`/${commentId}/replies`, { method: "POST", body: { message: texto } });
  if (!r.ok) console.error("Resposta pública falhou:", r.error?.message);
}

// ---------------------------------------------------------------------
// COMENTÁRIO
// ---------------------------------------------------------------------
async function handleComment(v: any, contaId: string) {
  const commentId = String(v?.id ?? "");
  const deId = String(v?.from?.id ?? "");
  const username = v?.from?.username ?? null;
  const texto = String(v?.text ?? "");
  const mediaId = v?.media?.id ? String(v.media.id) : null;
  if (!commentId || !deId) return;

  // Ignora comentário da própria conta (inclusive as respostas públicas do robô).
  if (ehPropriaConta(deId, contaId)) return;

  // 1) Ignora evento repetido.
  if (!(await primeiraVez(`c:${commentId}`))) return;

  // 3) Acha a automação (palavra + post).
  const a = escolherAutomacao(await automacoesAtivas(), texto, mediaId);
  if (!a) return;

  // 4) Regra do "1 por dia" (contas de teste ignoram).
  if (!CONTAS_TESTE.includes(deId) && (await jaRecebeuHoje(deId))) {
    console.log(`Pulando ${deId}: já recebeu DM nas últimas 24h.`);
    return;
  }

  // 5) Entrega.
  const keyword = texto.slice(0, 100);
  const res = await deliverAutomation(a, { commentId, igUserId: deId, username, keyword });

  if (res.status === "ok" || res.status === "throttled") {
    await responderComentario(a, commentId);
  }
  // Na fila: marca o lead (a DM está garantida). Se saiu, o deliverAutomation já marcou.
  // Se deu erro, NÃO marca: assim a pessoa pode tentar de novo.
  if (res.status === "throttled") {
    await db.from("ig_leads").upsert({
      ig_user_id: deId, username, last_source: "comment", last_keyword: keyword,
      automation_id: a.id, updated_at: new Date().toISOString(),
    });
  }
}

// ---------------------------------------------------------------------
// MENSAGEM / POSTBACK (toque em botão)
// ---------------------------------------------------------------------
async function handleMessage(ev: any, contaId: string) {
  const remetente = String(ev?.sender?.id ?? "");
  const msg = ev?.message;
  const postback = ev?.postback;

  // Echo = mensagem que a própria conta mandou. Se o mid está em ig_bot_sends foi o robô;
  // se não está, foi você respondendo à mão. Nos dois casos, não responde.
  if (msg?.is_echo) {
    const { data } = await db.from("ig_bot_sends").select("mid").eq("mid", msg.mid ?? "").maybeSingle();
    if (!data) console.log("Echo de resposta MANUAL sua (não foi o robô). Ignorando.");
    return;
  }
  if (!remetente || ehPropriaConta(remetente, contaId)) return;
  if (!msg && !postback) return; // leitura, reação etc.

  const mid = msg?.mid ?? postback?.mid;
  if (mid && !(await primeiraVez(`m:${mid}`))) return;

  // Toque em botão: chega como postback OU como quick_reply (mesmo payload). Trata os dois.
  const payload: string | undefined = postback?.payload ?? msg?.quick_reply?.payload;
  if (payload?.startsWith("STEP:")) {
    await avancarFluxo(remetente, payload);
    return;
  }

  const texto: string = msg?.text ?? "";
  if (!texto) return;

  // Um passo pediu um dado? Esta mensagem vira o dado.
  const { data: lead } = await db.from("ig_leads").select("*").eq("ig_user_id", remetente).maybeSingle();
  if (lead?.expecting?.field) {
    await coletarDado(remetente, lead, texto);
    return;
  }

  // Palavra-chave mandada direto na DM ("qualquer palavra" vale só pra comentário).
  const a = escolherAutomacao(await automacoesAtivas(), texto, null, false);
  if (!a) return; // texto solto: silêncio
  if (!CONTAS_TESTE.includes(remetente) && (await jaRecebeuHoje(remetente))) return;

  const passo = primeiroPasso(a);
  if (!passo) return;
  const r = await sendStep(a, passo, { id: remetente }, remetente);
  await registrarEnvio({
    ig_user_id: remetente, automation_id: a.id, canal: "dm", tipo: r.tipo,
    status: r.ok ? "ok" : "erro", motivo: r.motivo, variante: r.variante,
  });
  if (r.ok) await depoisDoPasso(a, passo, remetente, { last_source: "dm", last_keyword: texto.slice(0, 100), variante: r.variante });
}

// Payload "STEP:idDaAutomacao:proximoPasso". É ele que diz qual automação seguir,
// então duas automações com o mesmo texto de botão nunca se misturam.
async function avancarFluxo(igUserId: string, payload: string) {
  const [, autoId, ...resto] = payload.split(":");
  const stepId = resto.join(":");
  const { data } = await db.from("ig_automations").select("*").eq("id", autoId).maybeSingle();
  if (!data) return;
  const a = data as Automacao;
  const passo = acharPasso(a, stepId);
  if (!passo) return;

  // Já estamos na janela de 24h (a pessoa acabou de tocar): manda pela DM.
  const r = await sendStep(a, passo, { id: igUserId }, igUserId);
  await registrarEnvio({
    ig_user_id: igUserId, automation_id: a.id, canal: "dm", tipo: r.tipo,
    status: r.ok ? "ok" : "erro", motivo: r.motivo,
  });
  if (r.ok) await depoisDoPasso(a, passo, igUserId);
}

// Coleta de dado (email / telefone / outro), com validação.
async function coletarDado(igUserId: string, lead: any, texto: string) {
  const exp = lead.expecting as { field: string; automation_id: string; next?: string | number | null };
  const valor = texto.trim();

  if (exp.field === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor)) {
    await enviarMensagem({ id: igUserId }, { text: "Hmm, esse e-mail parece estranho. Pode mandar de novo?" });
    return;
  }
  if (exp.field === "telefone" && valor.replace(/\D/g, "").length < 10) {
    await enviarMensagem({ id: igUserId }, { text: "Hmm, esse número parece incompleto. Pode mandar de novo, com DDD?" });
    return;
  }

  const atualizacao: Record<string, unknown> = { expecting: null, updated_at: new Date().toISOString() };
  if (exp.field === "email") atualizacao.email = valor.toLowerCase();
  else if (exp.field === "telefone") atualizacao.telefone = valor;
  else atualizacao.extras = { ...(lead.extras ?? {}), [exp.field]: valor };
  await db.from("ig_leads").update(atualizacao).eq("ig_user_id", igUserId);

  if (exp.next === null || exp.next === undefined || exp.next === "") {
    await enviarMensagem({ id: igUserId }, { text: "Anotado! 🙌" });
    return;
  }
  await avancarFluxo(igUserId, `STEP:${exp.automation_id}:${exp.next}`);
}
