// =====================================================================
// app.js: login, menu, Início, Calendário e Instagram (Métricas e lista
// de automações). O editor de automação fica no editor.js.
// =====================================================================

// ---------------------------------------------------------------------
// MODO: localhost / 127.0.0.1 / arquivo = teste local (sem Supabase).
// Qualquer outro endereço = produção (login e dados pelo Supabase).
// ---------------------------------------------------------------------
const CFG = window.APP_CONFIG || {};
const MODO_LOCAL = location.protocol === "file:" ||
  ["localhost", "127.0.0.1", "[::1]", ""].includes(location.hostname);
const preenchido = (v) => !!v && !/SEU_VALOR/i.test(v);

let sb = null; // cliente do Supabase (só em produção)
if (!MODO_LOCAL && window.supabase && preenchido(CFG.SUPABASE_URL) && preenchido(CFG.SUPABASE_ANON_KEY)) {
  try { sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY); }
  catch (e) { console.error("Supabase:", e); }
}

// ---------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------
const $ = (seletor, raiz = document) => raiz.querySelector(seletor);

// Cria um elemento: h("div", { class: "x", onclick: fn }, "texto", outroElemento)
function h(tag, attrs = {}, ...filhos) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (k === "class") el.className = v;
    else if (["value", "checked", "selected", "disabled", "hidden"].includes(k)) el[k] = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const f of filhos.flat(Infinity)) {
    if (f === null || f === undefined || f === false) continue;
    el.append(f.nodeType ? f : document.createTextNode(String(f)));
  }
  return el;
}

// Ícones (traço simples, herdam a cor do texto)
const ICONES = {
  raio: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
  casa: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
  calendario: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6"/>',
  sair: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  lapis: '<path d="M17 3a2.8 2.8 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
  lixo: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  usuarios: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  enviar: '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
  grafico: '<path d="M3 3v18h18"/><path d="M8 17v-5M13 17V8M18 17v-3"/>',
  balao: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  voltar: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
  fim: '<circle cx="12" cy="12" r="9"/><rect x="9" y="9" width="6" height="6" rx="1"/>',
  relogio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5M12 3v12"/>',
  arquivo: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
  imagem: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
  audio: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  video: '<rect x="2" y="6" width="14" height="12" rx="2"/><path d="m22 8-6 4 6 4z"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>',
  lupa: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  atualizar: '<path d="M21 12a9 9 0 1 1-2.6-6.4L21 8"/><path d="M21 3v5h-5"/>',
};
function icone(nome) {
  const s = h("span", { class: "ic", "aria-hidden": "true" });
  s.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONES[nome] || ""}</svg>`;
  return s;
}

// Avisinho no canto da tela
function toast(msg, tipo = "") {
  const t = h("div", { class: `toast ${tipo}` }, msg);
  $("#toasts").append(t);
  setTimeout(() => t.remove(), 5000);
}

const fmt = (n) => Number(n || 0).toLocaleString("pt-BR");
const dataCurta = (iso) => {
  const [, m, d] = String(iso || "").slice(0, 10).split("-");
  return d && m ? `${d}/${m}` : "";
};

// ---------------------------------------------------------------------
// DADOS: tudo tolerante a falha. Sem Supabase, devolve vazio ou zero.
// ---------------------------------------------------------------------
const Dados = {
  semBanco: !sb,

  // Lista de automações. null = deu erro ao carregar.
  async automacoes() {
    if (!sb) return [];
    try {
      const { data, error } = await sb.from("ig_automations").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (e) { console.warn("automacoes:", e); return null; }
  },

  async salvarAutomacao(linha) {
    if (!sb) return { ok: false, erro: "sem banco" };
    try {
      const dados = { ...linha, updated_at: new Date().toISOString() };
      const { data, error } = await sb.from("ig_automations").upsert(dados).select().single();
      if (error) throw error;
      return { ok: true, id: data.id };
    } catch (e) { return { ok: false, erro: e.message || String(e) }; }
  },

  async apagarAutomacao(id) {
    if (!sb) return false;
    try { const { error } = await sb.from("ig_automations").delete().eq("id", id); return !error; }
    catch { return false; }
  },

  async alternarAutomacao(id, active) {
    if (!sb) return false;
    try {
      const { error } = await sb.from("ig_automations")
        .update({ active, updated_at: new Date().toISOString() }).eq("id", id);
      return !error;
    } catch { return false; }
  },

  // Números do Início (contagens simples)
  async resumo() {
    const zero = { leads: 0, ativas: 0, dms7: 0 };
    if (!sb) return zero;
    const contar = async (consulta) => {
      try { const { count, error } = await consulta; if (error) throw error; return count || 0; }
      catch { return 0; }
    };
    const seteDias = new Date(Date.now() - 7 * 86400000).toISOString();
    const [leads, ativas, dms7] = await Promise.all([
      contar(sb.from("ig_leads").select("*", { count: "exact", head: true })),
      contar(sb.from("ig_automations").select("*", { count: "exact", head: true }).eq("active", true)),
      contar(sb.from("ig_deliveries").select("*", { count: "exact", head: true }).eq("status", "ok").gte("ts", seteDias)),
    ]);
    return { leads, ativas, dms7 };
  },

  async leads(limite = 10) {
    if (!sb) return [];
    try {
      const { data, error } = await sb.from("ig_leads").select("*").order("created_at", { ascending: false }).limit(limite);
      if (error) throw error;
      return data || [];
    } catch { return []; }
  },

  // Todos os leads (aba Interações), de 1000 em 1000 (limite do banco por requisição).
  // null = deu erro ao carregar.
  async leadsCompletos() {
    if (!sb) return [];
    try {
      const todos = [];
      for (let de = 0; ; de += 1000) {
        const { data, error } = await sb.from("ig_leads_resumo").select("*")
          .order("updated_at", { ascending: false }).range(de, de + 999);
        if (error) throw error;
        todos.push(...data);
        if (data.length < 1000) break;
      }
      return todos;
    } catch (e) { console.warn("leads:", e); return null; }
  },

  // Selos do topo da aba Análises: validade do token e entregas nas últimas 24h.
  async statusConta() {
    const vazio = { tokenExpira: null, tokenOk: null, entregas24h: 0 };
    if (!sb) return vazio;
    try {
      const desde = new Date(Date.now() - 86400000).toISOString();
      const [token, entregas] = await Promise.all([
        sb.from("ig_token_status").select("expires_at,last_ok").eq("id", "main").maybeSingle(),
        sb.from("ig_deliveries").select("*", { count: "exact", head: true }).eq("status", "ok").gte("ts", desde),
      ]);
      return { tokenExpira: token.data?.expires_at || null, tokenOk: token.data?.last_ok ?? null, entregas24h: entregas.count || 0 };
    } catch { return vazio; }
  },

  // Resultado da última análise de posts e comentários (guardado no banco).
  async analises() {
    const vazio = { meta: null, posts: [], comentaristas: [] };
    if (!sb) return vazio;
    try {
      const [meta, posts, comentaristas] = await Promise.all([
        sb.from("ig_analise").select("*").eq("id", "main").maybeSingle(),
        sb.from("ig_analise_posts").select("*").order("publicado_em", { ascending: false }).limit(1000),
        sb.from("ig_analise_comentaristas").select("username,comentarios").order("comentarios", { ascending: false }).limit(100),
      ]);
      return { meta: meta.data, posts: posts.data || [], comentaristas: comentaristas.data || [] };
    } catch { return vazio; }
  },

  // Roda a análise agora (pode levar até uns 2 minutos).
  async atualizarAnalises() {
    if (!sb) return { ok: false, erro: "sem banco" };
    try {
      const { data, error } = await sb.functions.invoke("ig-analises", { method: "POST" });
      if (error) {
        let erro = error.message;
        try { erro = (await error.context.json()).erro || erro; } catch { /* sem detalhe */ }
        return { ok: false, erro };
      }
      return data;
    } catch (e) { return { ok: false, erro: e.message || String(e) }; }
  },

  // Etiquetas do lead. Não mexe no updated_at: etiquetar não conta como interação
  // (é o updated_at que decide a exclusão após 12 meses sem interação).
  async salvarEtiquetas(igUserId, tags) {
    if (!sb) return false;
    try { const { error } = await sb.from("ig_leads").update({ tags }).eq("ig_user_id", igUserId); return !error; }
    catch { return false; }
  },

  // Funções na nuvem (exigem o login; o cliente manda o token sozinho)
  async chamarFuncao(nome) {
    if (!sb) return null;
    try {
      const { data, error } = await sb.functions.invoke(nome, { method: "GET" });
      if (error) throw error;
      return data;
    } catch (e) { console.warn(nome, e); return null; }
  },
  // Números da conta no período (dias = 7, 30, 90 ou 0 pra "tudo")
  async insights(dias = 30) { return (await this.chamarFuncao(`ig-insights?dias=${dias || "tudo"}`)) || { conectado: false }; },
  async midias() { return (await this.chamarFuncao("ig-media")) || { conectado: false, posts: [] }; },

  // Biblioteca de arquivos
  async arquivos() {
    if (!sb) return [];
    try {
      const { data, error } = await sb.from("ig_assets").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    } catch { return []; }
  },
  async enviarArquivo(arquivo) {
    if (!sb) return { ok: false, erro: "A biblioteca de arquivos funciona depois de configurar o Supabase." };
    const tipo = arquivo.type.startsWith("image/") ? "image"
      : arquivo.type.startsWith("audio/") ? "audio"
      : arquivo.type.startsWith("video/") ? "video" : "file";
    const caminho = `${Date.now()}-${arquivo.name.replace(/[^\w.-]+/g, "_")}`;
    try {
      const up = await sb.storage.from("ig-assets").upload(caminho, arquivo, { contentType: arquivo.type });
      if (up.error) throw up.error;
      const { data: pub } = sb.storage.from("ig-assets").getPublicUrl(caminho);
      const { data, error } = await sb.from("ig_assets")
        .insert({ nome: arquivo.name, tipo, public_url: pub.publicUrl, size_bytes: arquivo.size }).select().single();
      if (error) throw error;
      return { ok: true, arquivo: data };
    } catch (e) { return { ok: false, erro: `Não consegui enviar o arquivo: ${e.message || e}` }; }
  },
};

// ---------------------------------------------------------------------
// LOGIN
// ---------------------------------------------------------------------
const CHAVE_LOGIN_LOCAL = "login_local";
const lerLoginLocal = () => { try { return JSON.parse(localStorage.getItem(CHAVE_LOGIN_LOCAL)); } catch { return null; } };
let saindo = false;

function mostrarLogin(mensagem = "") {
  $("#tela-app").hidden = true;
  $("#tela-login").hidden = false;
  $("#aviso-login-local").hidden = !MODO_LOCAL;
  $("#login-erro").textContent = mensagem;
}

function entrar(email) {
  $("#tela-login").hidden = true;
  $("#tela-app").hidden = false;
  $("#usuario-email").textContent = email || "";
  $("#faixa-teste").hidden = !MODO_LOCAL;
  if (location.hash) navegar(); else location.hash = "#inicio";
}

$("#form-login").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("#login-email").value.trim();
  const senha = $("#login-senha").value;
  const erro = $("#login-erro");
  erro.textContent = "";

  // Modo teste local: qualquer e-mail + senha de 5 dígitos. (Não é segurança; só vale no localhost.)
  if (MODO_LOCAL) {
    if (!/^\S+@\S+\.\S+$/.test(email)) { erro.textContent = "Digite um e-mail válido."; return; }
    if (!/^\d{5}$/.test(senha)) { erro.textContent = "No modo de teste, a senha tem que ter 5 dígitos (só números)."; return; }
    try { localStorage.setItem(CHAVE_LOGIN_LOCAL, JSON.stringify({ email })); } catch { /* navegador sem armazenamento */ }
    entrar(email);
    return;
  }

  // Produção: Supabase Auth
  if (!sb) { erro.textContent = "O painel ainda não foi configurado. Preencha o config.js (veja o LEIA-ME)."; return; }
  if (!email || !senha) { erro.textContent = "Preencha o e-mail e a senha."; return; }
  const botao = $("#login-botao");
  botao.disabled = true;
  botao.textContent = "Entrando...";
  try {
    const { data, error } = await sb.auth.signInWithPassword({ email, password: senha });
    if (error) {
      erro.textContent = /fetch|network/i.test(error.message)
        ? "Não consegui conectar. Confira sua internet e tente de novo."
        : "E-mail ou senha incorretos.";
    } else {
      entrar(data.user.email);
    }
  } catch {
    erro.textContent = "Não consegui conectar. Confira sua internet e tente de novo.";
  } finally {
    botao.disabled = false;
    botao.textContent = "Entrar";
  }
});

$("#botao-sair").addEventListener("click", async () => {
  saindo = true;
  if (MODO_LOCAL) { try { localStorage.removeItem(CHAVE_LOGIN_LOCAL); } catch { /* ok */ } }
  else if (sb) { try { await sb.auth.signOut(); } catch { /* ok */ } }
  history.replaceState(null, "", location.pathname + location.search);
  $("#pagina").replaceChildren();
  $("#login-senha").value = "";
  mostrarLogin();
  saindo = false;
});

async function iniciar() {
  document.querySelectorAll("[data-icone]").forEach((el) => el.append(icone(el.dataset.icone)));

  if (MODO_LOCAL) {
    const login = lerLoginLocal();
    if (login?.email) entrar(login.email); else mostrarLogin();
    return;
  }
  if (!sb) { mostrarLogin(); return; }

  try {
    const { data } = await sb.auth.getSession();
    if (data.session) entrar(data.session.user.email); else mostrarLogin();
  } catch { mostrarLogin(); }

  // Sessão expirou (ou saiu em outra aba): volta pro login.
  sb.auth.onAuthStateChange((evento) => {
    if (evento === "SIGNED_OUT" && !saindo && !$("#tela-app").hidden) {
      mostrarLogin("Sua sessão expirou. Entre de novo.");
    }
  });
}

// ---------------------------------------------------------------------
// NAVEGAÇÃO (troca de tela sem recarregar a página)
// ---------------------------------------------------------------------
const ROTAS = { inicio: telaInicio, calendario: telaCalendario, instagram: telaInstagram };

function navegar() {
  if ($("#tela-app").hidden) return;
  const [rota, sub] = location.hash.slice(1).split("/");
  const nome = ROTAS[rota] ? rota : "inicio";
  document.querySelectorAll(".menu a").forEach((a) => a.classList.toggle("ativo", a.dataset.rota === nome));
  $("#lateral").classList.remove("aberta");
  const pagina = $("#pagina");
  pagina.replaceChildren();
  ROTAS[nome](pagina, sub);
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", navegar);
$("#botao-menu").addEventListener("click", () => $("#lateral").classList.toggle("aberta"));

// Peças repetidas
function cabecalho(titulo, subtitulo, ...extra) {
  return h("div", { class: "cabecalho" }, h("div", {}, h("h1", {}, titulo), h("p", { class: "sub" }, subtitulo)), ...extra);
}
function cartaoNumero(nomeIcone, rotulo, valor, detalhe) {
  const elValor = h("div", { class: "valor" }, valor);
  const el = h("div", { class: "cartao numero" },
    h("span", { class: "rotulo" }, icone(nomeIcone), rotulo), elValor, h("div", { class: "detalhe" }, detalhe));
  return { el, valor: elValor };
}
function estadoVazio(nomeIcone, titulo, texto, ...acoes) {
  return h("div", { class: "cartao vazio" },
    h("div", { class: "vazio-icone" }, icone(nomeIcone)), h("h2", {}, titulo), h("p", {}, texto), ...acoes);
}

// ---------------------------------------------------------------------
// INÍCIO
// ---------------------------------------------------------------------
function telaInicio(p) {
  const leads = cartaoNumero("usuarios", "Leads captados", "...", "no total");
  const ativas = cartaoNumero("raio", "Automações ativas", "...", "ligadas agora");
  const dms = cartaoNumero("enviar", "DMs enviadas", "...", "nos últimos 7 dias");
  const passo = (titulo, texto) => h("li", {}, h("strong", {}, titulo), texto);

  p.append(
    cabecalho("Bem-vindo ao seu painel", "Uma visão rápida do que está acontecendo."),
    h("div", { class: "grade-cartoes" }, leads.el, ativas.el, dms.el),
    h("div", { class: "secao" },
      h("h2", {}, "Atalhos"),
      h("div", { class: "atalhos" },
        h("a", { class: "btn btn-primario", href: "#instagram/automacoes" }, icone("raio"), "Minhas automações"),
        h("a", { class: "btn", href: "#instagram/analises" }, icone("grafico"), "Análises do Instagram"),
        h("a", { class: "btn", href: "#calendario" }, icone("calendario"), "Calendário"))),
    h("div", { class: "secao" },
      h("h2", {}, "Como funciona"),
      h("ol", { class: "passos-como" },
        passo("Alguém comenta", "a palavra-chave num post seu."),
        passo("Chega uma DM", "com a sua mensagem e um botão."),
        passo("A pessoa toca no botão", "e abre o link ou a conversa continua."),
        passo("O contato fica salvo", "como lead aqui no painel."))),
  );

  Dados.resumo().then((r) => {
    leads.valor.textContent = fmt(r.leads);
    ativas.valor.textContent = fmt(r.ativas);
    dms.valor.textContent = fmt(r.dms7);
  });
}

// ---------------------------------------------------------------------
// CALENDÁRIO (placeholder)
// ---------------------------------------------------------------------
function telaCalendario(p) {
  p.append(
    cabecalho("Calendário", "Planejamento de conteúdo."),
    estadoVazio("calendario", "Em breve", "Essa área vai chegar em breve pra você planejar seus conteúdos."),
  );
}

// ---------------------------------------------------------------------
// INSTAGRAM (sub-abas Análises, Automações e Interações)
// ---------------------------------------------------------------------
function telaInstagram(p, sub) {
  const ABAS = {
    analises: ["Análises", telaAnalises],
    automacoes: ["Automações", telaAutomacoes],
    interacoes: ["Interações", telaInteracoes],
  };
  const aba = ABAS[sub] ? sub : "analises"; // links antigos (#instagram/metricas) caem em Análises
  const area = h("div");
  p.append(
    cabecalho("Instagram", "Análises da conta e respostas automáticas no direct."),
    h("nav", { class: "abas" },
      Object.entries(ABAS).map(([chave, [titulo]]) =>
        h("a", { href: `#instagram/${chave}`, class: aba === chave ? "ativo" : "" }, titulo))),
    area,
  );
  ABAS[aba][1](area);
}

// ---------- Análises ----------
const PERIODOS =[[7, "7 dias"], [30, "30 dias"], [90, "90 dias"], [0, "Tudo"]];
let periodoAnalises = 30; // lembra o período escolhido enquanto o painel está aberto
let graficoAnalises = "alcance"; // qual gráfico aparece: "alcance" ou "novos" (clicando no cartão)

// Jeitos de ordenar os "Melhores posts". "Melhores" soma curtidas, comentários e salvos
// (comentário vale 2 e salvo vale 3, porque mostram mais interesse que uma curtida).
const ORDENS_POSTS = [
  ["melhores", "Melhores", (p) => p.curtidas + p.comentarios * 2 + (p.salvos || 0) * 3],
  ["curtidos", "Mais curtidos", (p) => p.curtidas],
  ["comentados", "Mais comentados", (p) => p.comentarios],
  ["salvos", "Mais salvos", (p) => p.salvos ?? -1],
  ["vistos", "Mais vistos", (p) => p.visualizacoes ?? -1],
];

// Acima de 90 dias, o gráfico junta os dias por mês (senão vira um risco por dia).
function alcanceAgrupado(serie, dias) {
  if (dias && dias <= 90) return { serie, titulo: "Alcance por dia" };
  const porMes = new Map();
  for (const p of serie) {
    const mes = p.data.slice(0, 7);
    const m = porMes.get(mes) || { data: `${mes}-01`, valor: 0, rotulo: `${mes.slice(5, 7)}/${mes.slice(0, 4)}` };
    m.valor += p.valor;
    porMes.set(mes, m);
  }
  return { serie: [...porMes.values()], titulo: "Alcance por mês" };
}

async function telaAnalises(area) {
  let ins = null;          // números da conta (buscados na hora)
  let analise = null;      // posts e comentaristas (guardados no banco)
  let ordemPosts = "melhores";
  let atualizando = false;

  const selos = h("div", { class: "selos" });
  const pilulas = h("div", { class: "pilulas", role: "group", "aria-label": "Período" });
  const botaoRecarregar = h("button", { class: "btn", type: "button", onclick: () => carregarConta() }, icone("atualizar"), "Atualizar");
  const cartoes = h("div", { class: "grade-cartoes cartoes-analise" });
  const grafico = h("div", { class: "cartao" });
  const melhores = h("section", { class: "secao" });
  const barraAtualizacao = h("div", { class: "cartao barra-atualizacao" });
  const ranking = h("section", { class: "secao" });
  const conteudo = h("div", {}, cartoes, grafico, melhores, barraAtualizacao, ranking);

  area.append(
    h("div", { class: "cabecalho", style: "margin-bottom:12px" },
      h("div", {}, h("h2", {}, "Análises"), h("p", { class: "sub" }, "Como a sua conta está indo no período escolhido.")),
      selos),
    h("div", { class: "linha-periodo" }, pilulas, botaoRecarregar),
    conteudo,
  );

  desenharPilulas();
  carregarAnalise();
  await carregarConta();

  function desenharPilulas() {
    pilulas.replaceChildren(...PERIODOS.map(([dias, texto]) => h("button", {
      type: "button", class: `pilula${dias === periodoAnalises ? " ativa" : ""}`, "aria-pressed": String(dias === periodoAnalises),
      onclick: () => { periodoAnalises = dias; desenharPilulas(); desenharMelhores(); carregarConta(); },
    }, texto)));
  }

  // ----- Números da conta (mudam com o período) -----
  async function carregarConta() {
    botaoRecarregar.disabled = true;
    cartoes.replaceChildren(h("p", { class: "carregando" }, "Carregando números..."));
    grafico.replaceChildren();
    const [resposta, status] = await Promise.all([Dados.insights(periodoAnalises), Dados.statusConta()]);
    ins = resposta;
    botaoRecarregar.disabled = false;
    desenharSelos(status);
    if (!ins?.conectado) {
      cartoes.replaceChildren();
      grafico.replaceChildren(estadoVazioSimples("instagram", "Conecte seu Instagram pra ver as análises",
        Dados.semBanco
          ? "Assim que o Supabase e o app do Meta estiverem configurados (veja o LEIA-ME), seus números aparecem aqui."
          : "O painel não conseguiu falar com o Instagram. Confira o token e o id da conta nos segredos das funções."));
      return;
    }
    desenharCartoes();
    desenharGrafico();
  }

  function desenharSelos(status) {
    const dias = status.tokenExpira ? Math.round((new Date(status.tokenExpira) - Date.now()) / 86400000) : null;
    let cor = "cinza", texto = "Token não conectado";
    if (status.tokenOk === false) { cor = "vermelho"; texto = "Token com erro"; }
    else if (dias !== null) { cor = dias < 10 ? "vermelho" : "verde"; texto = `Token ${dias} dias`; }
    else if (ins?.conectado) { cor = "verde"; texto = "Token ativo"; }
    selos.replaceChildren(
      h("span", { class: "selo-topo", title: "O token do Instagram renova sozinho toda segunda-feira" }, h("span", { class: `bolinha ${cor}` }), texto),
      h("span", { class: "selo-topo", title: "Mensagens enviadas pelas automações nas últimas 24 horas" },
        icone("enviar"), `${fmt(status.entregas24h)} entregas`, h("span", { class: "mudo" }, "24h")),
    );
  }

  function desenharCartoes() {
    const t = ins.totais || {};
    const sufixo = periodoAnalises ? `(${periodoAnalises}d)` : "(tudo)";
    // grafico: se tiver, o cartão vira botão e mostra o gráfico dele embaixo
    const cartao = (valor, rotulo, dica, grafico) => h(grafico ? "button" : "div", {
      class: `cartao numero-analise${grafico ? " clicavel" : ""}${grafico === graficoAnalises ? " ativo" : ""}`,
      type: grafico ? "button" : null,
      "aria-pressed": grafico ? String(grafico === graficoAnalises) : null,
      title: dica || (grafico ? "Clique pra ver o gráfico" : null),
      onclick: grafico ? () => { graficoAnalises = grafico; desenharCartoes(); desenharGrafico(); } : null,
    },
    h("div", { class: "valor" }, valor === null || valor === undefined ? "-" : fmt(valor)),
    h("div", { class: "detalhe" }, rotulo, grafico ? h("span", { class: "ver-grafico" }, icone("grafico")) : null));
    cartoes.replaceChildren(
      cartao(ins.conta?.seguidores, "Seguidores"),
      cartao(t.novos, `Novos seg. ${sufixo}`, t.novos === null ? "O Instagram só informa novos seguidores dos últimos 30 dias" : null, "novos"),
      cartao(t.alcance, `Alcance ${sufixo}`, null, "alcance"),
      cartao(t.contas_engajadas, "Contas engajadas", t.contas_engajadas === null ? "O Instagram só informa contas engajadas em períodos de até 30 dias" : null),
      cartao(t.interacoes, "Interações", "Curtidas, comentários, salvos, compartilhamentos e respostas no período"),
    );
  }

  function desenharGrafico() {
    const dica = h("span", { class: "mudo", style: "font-weight:400;font-size:13px" }, "(passe o mouse pra ver os números)");
    if (graficoAnalises === "novos") {
      // O Instagram só informa novos seguidores dos últimos 30 dias.
      const semDados = !periodoAnalises || periodoAnalises > 30;
      grafico.replaceChildren(
        h("h3", {}, "👥 Novos seguidores por dia ", semDados ? null : dica),
        semDados
          ? h("p", { class: "ajuda" }, "O Instagram só informa novos seguidores dos últimos 30 dias. Escolha 7 dias ou 30 dias pra ver o gráfico.")
          : graficoBarras(ins.novos_seguidores || [], "novos seguidores", { largo: true }),
      );
      return;
    }
    const { serie, titulo } = alcanceAgrupado(ins.alcance || [], periodoAnalises);
    grafico.replaceChildren(
      h("h3", {}, "📈 ", titulo, " ", dica),
      graficoBarras(serie, "contas alcançadas", { largo: true }),
    );
  }

  // ----- Posts e comentaristas (só mudam com "Atualizar agora") -----
  async function carregarAnalise() {
    analise = await Dados.analises();
    desenharMelhores();
    desenharBarraAtualizacao();
    desenharRanking();
  }

  function desenharMelhores() {
    if (!analise) return;
    const desde = periodoAnalises ? Date.now() - periodoAnalises * 86400000 : 0;
    const pontuar = ORDENS_POSTS.find(([chave]) => chave === ordemPosts)[2];
    const lista = analise.posts
      .filter((p) => new Date(p.publicado_em).getTime() >= desde)
      .sort((a, b) => pontuar(b) - pontuar(a))
      .slice(0, 10);
    melhores.replaceChildren(
      h("div", { class: "cabecalho-secao" },
        h("h2", {}, "🔥 Melhores posts ", h("span", { class: "mudo", style: "font-weight:400" }, periodoAnalises ? `(${periodoAnalises} dias)` : "(todos)")),
        h("div", { class: "pilulas pilulas-pequenas", role: "group", "aria-label": "Ordenar posts" },
          ORDENS_POSTS.map(([chave, texto]) => h("button", {
            type: "button", class: `pilula${chave === ordemPosts ? " ativa" : ""}`, "aria-pressed": String(chave === ordemPosts),
            onclick: () => { ordemPosts = chave; desenharMelhores(); },
          }, texto)))),
      lista.length
        ? h("div", { class: "grade-posts" }, lista.map(cartaoPost))
        : h("p", { class: "ajuda" }, analise.posts.length
          ? "Nenhum post publicado nesse período."
          : 'Clique em "Atualizar agora" (logo abaixo) pra analisar os seus posts.'),
      h("p", { class: "ajuda" }, "Só aparecem posts publicados por você. Collabs publicados pela marca (onde você entra como convidada) não vêm pela API do Instagram."),
    );
  }

  function cartaoPost(p) {
    const n = (v) => (v === null || v === undefined ? "-" : fmt(v));
    const legenda = (p.legenda || "").slice(0, 80);
    return h("a", { class: "cartao-post", href: p.link || null, target: "_blank", rel: "noopener", title: legenda || "Abrir o post no Instagram" },
      h("div", { class: "post-img" }, p.miniatura
        ? h("img", { src: p.miniatura, alt: legenda ? `Post: ${legenda}` : "Post", loading: "lazy", onerror: (e) => e.target.replaceWith(icone("imagem")) })
        : icone("imagem")),
      h("div", { class: "post-nums" },
        h("span", { title: "Curtidas" }, "❤️ ", n(p.curtidas)),
        h("span", { title: "Comentários" }, "💬 ", n(p.comentarios)),
        h("span", { title: "Salvos" }, "🔖 ", n(p.salvos)),
        h("span", { title: "Visualizações" }, "👀 ", n(p.visualizacoes))));
  }

  function desenharBarraAtualizacao() {
    const meta = analise?.meta;
    const quando = meta?.atualizado_em
      ? new Date(meta.atualizado_em).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
      : null;
    let detalhe = `${fmt(meta?.posts_analisados)} posts e ${fmt(meta?.comentarios_analisados)} comentários analisados. Só atualiza quando você clica.`;
    if (atualizando) detalhe = "Analisando seus posts e comentários... pode levar até 2 minutos. Pode continuar usando o painel.";
    else if (meta?.status === "erro") detalhe = `A última análise falhou: ${meta.erro}. Tente de novo.`;
    else if (meta?.status === "rodando") detalhe = "Uma análise começou e não terminou. Clique pra tentar de novo.";
    else if (!quando) detalhe = "Clique em Atualizar agora pra analisar os seus posts e comentários pela primeira vez.";
    barraAtualizacao.replaceChildren(
      h("div", {},
        h("strong", {}, "🕒 ", quando ? `Última atualização: ${quando}` : "Ainda não analisado"),
        h("p", { class: "ajuda", style: "margin:2px 0 0" }, detalhe)),
      h("button", { class: "btn", type: "button", disabled: atualizando, onclick: atualizarAgora },
        icone("atualizar"), atualizando ? "Analisando..." : "Atualizar agora"),
    );
  }

  async function atualizarAgora() {
    if (Dados.semBanco) { toast("As análises funcionam depois de configurar o Supabase e o Instagram (veja o LEIA-ME)."); return; }
    atualizando = true;
    desenharBarraAtualizacao();
    const r = await Dados.atualizarAnalises();
    atualizando = false;
    if (r.ok) toast(`Pronto! ${fmt(r.posts)} posts e ${fmt(r.comentarios)} comentários analisados.`, "sucesso");
    else toast(`Não consegui analisar: ${r.erro}`, "erro");
    await carregarAnalise();
  }

  function desenharRanking() {
    const lista = (analise?.comentaristas || []).slice(0, 20);
    const medalhas = ["🥇", "🥈", "🥉"];
    ranking.replaceChildren(
      h("h2", {}, "🏆 Quem mais comenta ", h("span", { class: "mudo", style: "font-weight:400;font-size:14px" }, "(todos os posts)")),
      h("p", { class: "ajuda", style: "margin:2px 0 10px" }, "Quem mais interage nos seus comentários, somando comentários e respostas."),
      lista.length
        ? h("ol", { class: "ranking cartao" }, lista.map((c, i) => h("li", {},
          h("span", { class: "posicao", "aria-label": `${i + 1}º lugar` }, medalhas[i] || `${i + 1}.`),
          h("a", { href: `https://instagram.com/${encodeURIComponent(c.username)}`, target: "_blank", rel: "noopener" }, `@${c.username}`),
          h("span", { class: "qtd" }, `${fmt(c.comentarios)} ${c.comentarios === 1 ? "comentário" : "comentários"}`))))
        : h("p", { class: "ajuda" }, 'Aparece depois da primeira análise (botão "Atualizar agora").'),
    );
  }
}

// Estado vazio sem o cartão em volta (pra usar dentro de outro cartão)
function estadoVazioSimples(nomeIcone, titulo, texto) {
  return h("div", { class: "vazio" }, h("div", { class: "vazio-icone" }, icone(nomeIcone)), h("h2", {}, titulo), h("p", {}, texto));
}

// Gráfico de barras simples (uma série), com o número de cada dia no hover.
function graficoBarras(serie, unidade, opcoes = {}) {
  if (!serie?.length) return h("p", { class: "ajuda" }, "Sem dados pra esse período.");
  // "largo": gráfico da largura toda (Análises); senão, metade da tela (Métricas).
  const L = opcoes.largo ? 1000 : 600, A = opcoes.largo ? 190 : 200, topo = 14, base = opcoes.largo ? 162 : 172, esq = 40;
  const rotulo = (p) => p.rotulo || dataCurta(p.data);
  const max = Math.max(1, ...serie.map((s) => s.valor));
  const passo = (L - esq) / serie.length;
  const larg = Math.max(4, Math.min(26, passo * 0.62));
  const ns = "http://www.w3.org/2000/svg";
  const s = (tag, at) => { const e = document.createElementNS(ns, tag); for (const k in at) e.setAttribute(k, at[k]); return e; };
  const texto = (x, y, t, ancora) => { const e = s("text", { x, y, "text-anchor": ancora }); e.textContent = t; return e; };

  const svg = s("svg", { viewBox: `0 0 ${L} ${A}`, role: "img", "aria-label": `${unidade} por dia` });
  for (const v of [max, Math.round(max / 2)]) {
    const y = base - (v / max) * (base - topo);
    svg.append(s("line", { x1: esq, x2: L, y1: y, y2: y, class: "grade" }), texto(esq - 8, y + 4, fmt(v), "end"));
  }
  svg.append(s("line", { x1: esq, x2: L, y1: base, y2: base, class: "eixo" }));

  const dica = h("div", { class: "dica-grafico", hidden: true });
  const caixa = h("div", { class: "grafico" }, svg, dica);
  const meio = Math.floor(serie.length / 2);

  serie.forEach((ponto, i) => {
    const cx = esq + passo * i + passo / 2;
    const alt = (ponto.valor / max) * (base - topo);
    const x = cx - larg / 2, y = base - alt, r = Math.min(4, larg / 2, alt);
    // barra com cantos arredondados só no topo, presa na linha de base
    const barra = s("path", {
      class: "barra",
      d: alt <= 0 ? "" : `M${x},${base} V${y + r} Q${x},${y} ${x + r},${y} H${x + larg - r} Q${x + larg},${y} ${x + larg},${y + r} V${base} Z`,
    });
    const alvo = s("rect", { x: esq + passo * i, y: topo, width: passo, height: base - topo, class: "alvo" });
    const mostrar = () => {
      caixa.classList.add("com-foco");
      barra.classList.add("foco");
      dica.replaceChildren(h("strong", {}, fmt(ponto.valor)), ` ${unidade}`, h("br"), rotulo(ponto));
      dica.style.left = `${(cx / L) * 100}%`;
      dica.style.top = `${(Math.min(y, base - 4) / A) * 100}%`;
      dica.hidden = false;
    };
    const esconder = () => { caixa.classList.remove("com-foco"); barra.classList.remove("foco"); dica.hidden = true; };
    alvo.addEventListener("mouseenter", mostrar);
    alvo.addEventListener("mouseleave", esconder);
    alvo.addEventListener("touchstart", mostrar, { passive: true });
    svg.append(barra, alvo);
    if (i === 0 || i === meio || i === serie.length - 1) svg.append(texto(cx, base + 18, rotulo(ponto), "middle"));
  });
  return caixa;
}

// ---------- Automações (lista) ----------
async function telaAutomacoes(area) {
  const lista = h("div", { class: "lista" }, h("p", { class: "carregando" }, "Carregando..."));
  const abrir = (auto) => Editor.abrir(auto, { aoSalvar: () => recarregar() });

  area.append(...[
    h("div", { class: "cabecalho", style: "margin-bottom:16px" },
      h("div", {}, h("h2", {}, "Suas automações"),
        h("p", { class: "sub" }, "Quem comenta a palavra-chave recebe a sua mensagem no direct.")),
      h("button", { class: "btn btn-primario", onclick: () => abrir(null) }, icone("mais"), "Nova automação")),
    Dados.semBanco
      ? h("div", { class: "aviso aviso-info", style: "margin-bottom:16px" }, icone("info"),
        h("span", {}, "Sem banco conectado: dá pra criar uma automação e ver a prévia funcionando. Salvar de verdade só depois de configurar o Supabase (veja o LEIA-ME)."))
      : null,
    lista,
  ].filter(Boolean));

  async function recarregar() {
    // As fotos dos posts vêm do Instagram na hora (os links das imagens expiram).
    const [autos, midias] = await Promise.all([Dados.automacoes(), Dados.midias()]);
    const posts = new Map((midias?.posts || []).map((p) => [p.id, p]));
    if (autos === null) {
      lista.replaceChildren(estadoVazio("info", "Não consegui carregar as automações",
        "Confira sua conexão e tente de novo.", h("button", { class: "btn", onclick: recarregar }, "Tentar de novo")));
      return;
    }
    if (!autos.length) {
      lista.replaceChildren(estadoVazio("raio", "Nenhuma automação ainda",
        "Crie a primeira: escolha a palavra que ativa e a mensagem que a pessoa recebe no direct.",
        h("button", { class: "btn btn-primario", onclick: () => abrir(null) }, icone("mais"), "Nova automação")));
      return;
    }
    lista.replaceChildren(...autos.map((a) => itemAutomacao(a, abrir, recarregar, posts)));
  }
  recarregar();
}

// Foto do post vinculado, na frente do nome. Sem post escolhido = vale pra todos.
function miniaturaAutomacao(a, posts) {
  const ids = a.media_ids || [];
  if (!ids.length) {
    return h("div", { class: "thumb-auto thumb-todos", title: "Vale pra todos os posts" }, icone("instagram"));
  }
  const post = posts.get(ids[0]);
  const legenda = post?.legenda ? post.legenda.slice(0, 80) : "";
  const el = h(post?.link ? "a" : "div", {
    class: "thumb-auto",
    title: legenda || "Post vinculado",
    href: post?.link || null, target: post?.link ? "_blank" : null, rel: post?.link ? "noopener" : null,
    "aria-label": post?.link ? "Abrir o post vinculado no Instagram" : null,
  }, post?.miniatura ? h("img", { src: post.miniatura, alt: legenda ? `Post: ${legenda}` : "Post vinculado", loading: "lazy" }) : icone("imagem"));
  if (ids.length > 1) el.append(h("span", { class: "thumb-mais" }, `+${ids.length - 1}`));
  return el;
}

function itemAutomacao(a, abrir, recarregar, posts = new Map()) {
  const palavras = a.match_any
    ? [h("span", { class: "chip" }, "qualquer palavra")]
    : (a.keyword || "").split(",").map((s) => s.trim()).filter(Boolean).map((k) => h("span", { class: "chip" }, k));
  const qtdPosts = a.media_ids?.length ? `${a.media_ids.length} post(s)` : "todos os posts";

  const item = h("div", { class: `cartao item-auto${a.active ? "" : " desligada"}` });
  const chave = h("label", { class: "chave", title: "Ligar ou desligar" },
    h("input", {
      type: "checkbox", checked: a.active, "aria-label": "Automação ativa",
      onchange: async (e) => {
        const ligar = e.target.checked;
        if (await Dados.alternarAutomacao(a.id, ligar)) {
          a.active = ligar;
          item.classList.toggle("desligada", !ligar);
          toast(ligar ? "Automação ligada." : "Automação desligada.");
        } else {
          e.target.checked = !ligar;
          toast("Não consegui mudar. Tente de novo.", "erro");
        }
      },
    }),
    h("span", { class: "trilho" }));

  item.append(
    miniaturaAutomacao(a, posts),
    h("div", { class: "info" }, h("h3", {}, a.nome || "Sem nome"), h("div", {}, palavras, h("span", { class: "chip" }, qtdPosts))),
    h("div", { class: "acoes" },
      chave,
      h("button", { class: "btn btn-fantasma btn-icone", title: "Editar", "aria-label": "Editar", onclick: () => abrir(a) }, icone("lapis")),
      h("button", {
        class: "btn btn-fantasma btn-icone btn-perigo", title: "Apagar", "aria-label": "Apagar",
        onclick: async () => {
          if (!confirm(`Apagar a automação "${a.nome}"? Isso não tem volta.`)) return;
          if (await Dados.apagarAutomacao(a.id)) { toast("Automação apagada."); recarregar(); }
          else toast("Não consegui apagar. Tente de novo.", "erro");
        },
      }, icone("lixo"))),
  );
  return item;
}

// ---------- Interações (planilha de leads) ----------
const ORIGEM = { comment: "comentário", dm: "direct", story_reply: "story" };
const ICONE_ORIGEM = { comment: "balao", dm: "enviar", story_reply: "imagem" };
const dataHora = (iso) => (iso
  ? new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })
  : "-");

// "há 21 min", "há 3 h", "há 2 dias"... (depois de 30 dias mostra a data)
function haQuanto(iso) {
  if (!iso) return "-";
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "agora mesmo";
  if (min < 60) return `há ${min} min`;
  const horas = Math.floor(min / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias <= 30) return dias === 1 ? "há 1 dia" : `há ${dias} dias`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

// Onde a pessoa parou na conversa (o número da mensagem vem do fluxo da automação).
function ondeParou(l, fluxos) {
  if (l.link_sent) return { texto: "recebeu o link", ok: true };
  const passos = fluxos.get(l.automation_id) || [];
  const n = passos.findIndex((s) => String(s.id) === String(l.flow_step)) + 1;
  if (n > 0) return { texto: `na mensagem ${n}`, ok: false };
  return { texto: "na conversa", ok: false };
}

// Colunas da planilha: título, valor (pra ordenar, buscar e exportar) e como aparece na tela.
function colunasLeads(fluxos) {
  const contato = (l) => [l.email, l.telefone].filter(Boolean).join(" / ");
  return [
    {
      chave: "username", titulo: "Pessoa", largura: 12,
      valor: (l) => (l.username ? `@${l.username}` : `ID ${l.ig_user_id}`),
      celula: (l) => (l.username
        ? h("a", { class: "pessoa", href: `https://instagram.com/${encodeURIComponent(l.username)}`, target: "_blank", rel: "noopener" }, `@${l.username}`)
        : h("span", { class: "mudo" }, `ID ${l.ig_user_id}`)),
    },
    {
      chave: "last_source", titulo: "Origem", largura: 11, valor: (l) => ORIGEM[l.last_source] || "",
      celula: (l) => (ORIGEM[l.last_source]
        ? h("span", { class: "chip chip-origem" }, icone(ICONE_ORIGEM[l.last_source]), ORIGEM[l.last_source])
        : h("span", { class: "mudo" }, "-")),
    },
    {
      chave: "last_keyword", titulo: "Palavra", largura: 10, valor: (l) => l.last_keyword || "",
      celula: (l) => (l.last_keyword ? h("span", { class: "chip chip-palavra", title: l.last_keyword }, l.last_keyword) : h("span", { class: "mudo" }, "-")),
    },
    {
      chave: "automacao_nome", titulo: "Automação", largura: 12, valor: (l) => l.automacao_nome || "apagada",
      celula: (l) => (l.automacao_nome ? h("strong", { class: "nome-auto" }, l.automacao_nome) : h("span", { class: "mudo" }, "apagada")),
    },
    { chave: "contato", titulo: "Contato", largura: 11, valor: contato, celula: (l) => contato(l) || h("span", { class: "mudo" }, "não deixou") },
    { chave: "tags", titulo: "Etiquetas", largura: 11, valor: (l) => (l.tags || []).join(", "), celula: null /* editável, ver abaixo */ },
    {
      chave: "interacoes", titulo: "Interações", largura: 9, numero: true, valor: (l) => Number(l.interacoes || 0),
      celula: (l) => fmt(l.interacoes), dica: "Quantas mensagens a automação já mandou pra essa pessoa",
    },
    {
      chave: "onde_parou", titulo: "Onde parou", largura: 14, valor: (l) => ondeParou(l, fluxos).texto,
      celula: (l) => {
        const o = ondeParou(l, fluxos);
        return h("span", { class: `selo${o.ok ? " selo-ok" : ""}` }, o.ok ? "✓ " : "", o.texto);
      },
    },
    {
      chave: "updated_at", titulo: "Última vez", largura: 10, valor: (l) => l.updated_at || "", exportar: (l) => dataHora(l.updated_at),
      celula: (l) => h("span", { title: dataHora(l.updated_at) }, haQuanto(l.updated_at)),
    },
  ];
}
// Colunas que vão só pra planilha baixada.
const EXTRAS_CSV = [
  ["Primeira vez", (l) => dataHora(l.created_at)],
  ["ID do Instagram", (l) => l.ig_user_id],
];

async function telaInteracoes(area) {
  const filtro = { busca: "", ordem: "updated_at", desc: true, clicou: false };
  let leads = [];
  let colunas = [];

  const busca = h("input", {
    class: "campo campo-busca", type: "search", placeholder: "Buscar por nome, palavra ou etiqueta", "aria-label": "Buscar pessoas",
    oninput: (e) => { filtro.busca = e.target.value; desenhar(); },
  });
  const baixar = h("button", { class: "btn", disabled: true, onclick: () => baixarCsv(visiveis(), colunas) },
    icone("download"), "Baixar planilha (CSV)");
  const resumo = h("div", { class: "grade-cartoes resumo-leads" });
  const corpo = h("div", { class: "cartao planilha-cartao" }, h("p", { class: "carregando" }, "Carregando..."));
  const rodape = h("p", { class: "ajuda rodape-planilha" });

  area.append(
    h("div", { class: "cabecalho", style: "margin-bottom:16px" },
      h("div", {}, h("h2", {}, "Suas interações"), h("p", { class: "sub" }, "Todo mundo que já falou com as suas automações")),
      h("div", { class: "acoes-planilha" }, h("span", { class: "busca-caixa" }, icone("lupa"), busca), baixar)),
    resumo, corpo, rodape,
  );

  // Leads + automações (pra saber em qual mensagem cada pessoa parou)
  const [resposta, autos] = await Promise.all([Dados.leadsCompletos(), Dados.automacoes()]);
  const fluxos = new Map((autos || []).map((a) => [a.id, a.flow?.steps || []]));
  colunas = colunasLeads(fluxos);
  if (resposta === null) {
    corpo.replaceWith(estadoVazio("info", "Não consegui carregar as interações", "Confira sua conexão e tente de novo.",
      h("button", { class: "btn", onclick: navegar }, "Tentar de novo")));
    return;
  }
  leads = resposta;
  desenharResumo();
  if (!leads.length) {
    corpo.replaceWith(estadoVazio("usuarios", "Ninguém por aqui ainda", Dados.semBanco
      ? "Assim que o Supabase e o Instagram estiverem ligados, cada pessoa que falar com uma automação aparece aqui."
      : "Quando alguém comentar uma palavra-chave e receber a sua DM, a pessoa aparece aqui."));
    return;
  }
  baixar.disabled = false;
  desenhar();

  // Os 4 cartões de resumo (sempre sobre todas as pessoas)
  function desenharResumo() {
    const seteDias = Date.now() - 7 * 86400000;
    const cartao = (rotulo, valor, detalhe) => h("div", { class: "cartao numero" },
      h("span", { class: "rotulo" }, rotulo), h("div", { class: "valor" }, fmt(valor)), h("div", { class: "detalhe" }, detalhe));
    resumo.replaceChildren(
      cartao("Pessoas", leads.length, "Já falaram com você"),
      cartao("Nos últimos 7 dias", leads.filter((l) => new Date(l.updated_at).getTime() >= seteDias).length, "Movimento recente"),
      cartao("Receberam o link", leads.filter((l) => l.link_sent).length, "Chegaram até o final da conversa"),
      cartao("Deixaram contato", leads.filter((l) => l.email || l.telefone).length, "E-mail ou telefone na conversa"),
    );
  }

  function visiveis() {
    const termo = filtro.busca.trim().toLowerCase();
    const col = colunas.find((c) => c.chave === filtro.ordem);
    return leads
      .filter((l) => !termo || colunas.some((c) => String(c.valor(l)).toLowerCase().includes(termo)))
      .sort((a, b) => {
        const va = col.valor(a), vb = col.valor(b);
        const r = col.numero ? va - vb : String(va).localeCompare(String(vb), "pt-BR");
        return filtro.desc ? -r : r;
      });
  }

  function desenhar() {
    const lista = visiveis();
    rodape.textContent = `Mostrando ${fmt(lista.length)} de ${fmt(leads.length)} ${leads.length === 1 ? "pessoa" : "pessoas"}`;
    // Clicar no título da coluna ordena; a setinha só aparece depois do primeiro clique.
    const cabecalhos = colunas.map((c) => {
      const ativa = filtro.clicou && filtro.ordem === c.chave;
      return h("th", { scope: "col", class: c.numero ? "num" : null, "aria-sort": ativa ? (filtro.desc ? "descending" : "ascending") : null, title: c.dica || null },
        h("button", {
          class: `ordenar${ativa ? " ativa" : ""}`, type: "button",
          onclick: () => {
            filtro.desc = filtro.ordem === c.chave ? !filtro.desc : !!c.numero || c.chave.endsWith("_at");
            filtro.ordem = c.chave;
            filtro.clicou = true;
            desenhar();
          },
        }, c.titulo, ativa ? h("span", { class: "seta" }, filtro.desc ? "↓" : "↑") : null));
    });
    const linhas = lista.map((l) => h("tr", {},
      colunas.map((c) => h("td", { class: c.numero ? "num" : null, "data-rotulo": c.titulo, title: c.chave === "tags" ? null : String((c.exportar || c.valor)(l)) || null },
        c.chave === "tags" ? celulaEtiquetas(l) : c.celula(l)))));
    corpo.replaceChildren(lista.length
      ? h("div", { class: "planilha" }, h("table", {},
        // As colunas dividem a largura da tela: nada de rolar pro lado.
        h("colgroup", {}, colunas.map((c) => h("col", { style: `width:${c.largura}%` }))),
        h("thead", {}, h("tr", {}, cabecalhos)), h("tbody", {}, linhas)))
      : h("p", { class: "carregando" }, "Ninguém encontrado com essa busca."));
  }

  // Etiquetas: clique, escreva separando por vírgula, Enter salva.
  function celulaEtiquetas(l) {
    const tags = l.tags || [];
    const caixa = h("button", {
      class: "etiquetas", type: "button", title: "Clique pra editar as etiquetas",
      "aria-label": `Editar etiquetas de ${l.username ? "@" + l.username : l.ig_user_id}`,
      onclick: () => editar(),
    }, tags.length ? tags.map((t) => h("span", { class: "tag" }, t)) : h("span", { class: "mudo" }, "sem etiqueta"));
    const lugar = h("div", {}, caixa);
    function editar() {
      const inp = h("input", {
        class: "campo campo-mini", value: tags.join(", "), placeholder: "cliente, vip", "aria-label": "Etiquetas separadas por vírgula",
      });
      let feito = false;
      const salvar = async () => {
        if (feito) return;
        feito = true;
        const novas = [...new Set(inp.value.split(",").map((t) => t.trim()).filter(Boolean))];
        if (JSON.stringify(novas) !== JSON.stringify(tags)) {
          if (await Dados.salvarEtiquetas(l.ig_user_id, novas)) { l.tags = novas; toast("Etiquetas salvas."); }
          else toast("Não consegui salvar as etiquetas.", "erro");
        }
        desenhar();
      };
      inp.addEventListener("keydown", (e) => {
        if (e.key === "Enter") salvar();
        if (e.key === "Escape") { feito = true; e.stopPropagation(); desenhar(); }
      });
      inp.addEventListener("blur", salvar);
      lugar.replaceChildren(inp);
      inp.focus();
    }
    return lugar;
  }
}

// Planilha pro Excel / Google Planilhas (separador ";" e acentos certos).
function baixarCsv(lista, colunas) {
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const cab = [...colunas.map((c) => c.titulo), ...EXTRAS_CSV.map(([t]) => t)];
  const linhas = lista.map((l) => [...colunas.map((c) => (c.exportar || c.valor)(l)), ...EXTRAS_CSV.map(([, f]) => f(l))]);
  const csv = "﻿" + [cab, ...linhas].map((r) => r.map(esc).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = h("a", { href: url, download: `interacoes-${new Date().toISOString().slice(0, 10)}.csv` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Começa quando todos os scripts (inclusive o editor.js) já carregaram.
window.addEventListener("DOMContentLoaded", iniciar);
