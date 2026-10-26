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

  // Funções na nuvem (exigem o login; o cliente manda o token sozinho)
  async chamarFuncao(nome) {
    if (!sb) return null;
    try {
      const { data, error } = await sb.functions.invoke(nome, { method: "GET" });
      if (error) throw error;
      return data;
    } catch (e) { console.warn(nome, e); return null; }
  },
  async insights() { return (await this.chamarFuncao("ig-insights")) || { conectado: false }; },
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
        h("a", { class: "btn", href: "#instagram/metricas" }, icone("grafico"), "Métricas do Instagram"),
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
// INSTAGRAM (sub-abas Métricas e Automações)
// ---------------------------------------------------------------------
function telaInstagram(p, sub) {
  const aba = sub === "automacoes" ? "automacoes" : "metricas";
  const area = h("div");
  p.append(
    cabecalho("Instagram", "Métricas da conta e respostas automáticas no direct."),
    h("nav", { class: "abas" },
      h("a", { href: "#instagram/metricas", class: aba === "metricas" ? "ativo" : "" }, "Métricas"),
      h("a", { href: "#instagram/automacoes", class: aba === "automacoes" ? "ativo" : "" }, "Automações")),
    area,
  );
  (aba === "metricas" ? telaMetricas : telaAutomacoes)(area);
}

// ---------- Métricas ----------
async function telaMetricas(area) {
  area.append(h("p", { class: "carregando" }, "Carregando métricas..."));
  const [ins, resumo] = await Promise.all([Dados.insights(), Dados.resumo()]);
  area.replaceChildren();

  const cardLeads = cartaoNumero("usuarios", "Leads captados", fmt(resumo.leads), "pelas automações").el;

  if (!ins?.conectado) {
    area.append(
      estadoVazio("instagram", "Conecte seu Instagram pra ver as métricas",
        Dados.semBanco
          ? "Assim que o Supabase e o app do Meta estiverem configurados (veja o LEIA-ME), seus seguidores, novos seguidores e alcance aparecem aqui."
          : "O painel não conseguiu falar com o Instagram. Confira o token e o id da conta nos segredos das funções."),
      h("div", { class: "grade-cartoes", style: "margin-top:16px" }, cardLeads),
    );
    return;
  }

  const soma = (s) => (s || []).reduce((t, x) => t + (x.valor || 0), 0);
  const token = ins.token;
  const diasToken = token?.expires_at ? Math.round((new Date(token.expires_at) - Date.now()) / 86400000) : null;

  area.append(
    h("div", { class: "grade-cartoes" },
      cartaoNumero("instagram", "Seguidores", fmt(ins.conta.seguidores), `@${ins.conta.username}`).el,
      cartaoNumero("mais", "Novos seguidores", fmt(soma(ins.novos_seguidores)), "últimos 15 dias").el,
      cartaoNumero("grafico", "Alcance", fmt(soma(ins.alcance)), "últimos 15 dias").el,
      cardLeads),
    (token && token.last_ok === false) || (diasToken !== null && diasToken < 10)
      ? h("div", { class: "aviso", style: "margin-top:16px" }, icone("info"),
        h("span", {}, token.last_ok === false
          ? "A última renovação do token falhou. Confira o robô ig-token-refresh."
          : `O token do Instagram vence em ${diasToken} dia(s).`))
      : null,
    h("div", { class: "grade-graficos" },
      cartaoGrafico("Novos seguidores por dia", ins.novos_seguidores, "novos seguidores"),
      cartaoGrafico("Alcance por dia", ins.alcance, "contas alcançadas")),
  );

  const leads = await Dados.leads(10);
  if (leads.length) {
    area.append(h("div", { class: "cartao secao" },
      h("h2", { style: "margin-bottom:8px" }, "Últimos leads"),
      h("div", { class: "tabela-caixa" }, h("table", {},
        h("thead", {}, h("tr", {}, h("th", {}, "Pessoa"), h("th", {}, "E-mail"), h("th", {}, "Origem"), h("th", {}, "Quando"))),
        h("tbody", {}, leads.map((l) => h("tr", {},
          h("td", {}, l.username ? `@${l.username}` : l.ig_user_id),
          h("td", {}, l.email || h("span", { class: "mudo" }, "não informado")),
          h("td", {}, { comment: "comentário", dm: "direct", story_reply: "story" }[l.last_source] || "-"),
          h("td", {}, new Date(l.created_at).toLocaleDateString("pt-BR")))))))));
  }
}

function cartaoGrafico(titulo, serie, unidade) {
  return h("div", { class: "cartao" }, h("h3", {}, titulo), graficoBarras(serie, unidade));
}

// Gráfico de barras simples (uma série), com o número de cada dia no hover.
function graficoBarras(serie, unidade) {
  if (!serie?.length) return h("p", { class: "ajuda" }, "Sem dados pra esse período.");
  const L = 600, A = 200, topo = 14, base = 172, esq = 40;
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
      dica.replaceChildren(h("strong", {}, fmt(ponto.valor)), ` ${unidade}`, h("br"), dataCurta(ponto.data));
      dica.style.left = `${(cx / L) * 100}%`;
      dica.style.top = `${(Math.min(y, base - 4) / A) * 100}%`;
      dica.hidden = false;
    };
    const esconder = () => { caixa.classList.remove("com-foco"); barra.classList.remove("foco"); dica.hidden = true; };
    alvo.addEventListener("mouseenter", mostrar);
    alvo.addEventListener("mouseleave", esconder);
    alvo.addEventListener("touchstart", mostrar, { passive: true });
    svg.append(barra, alvo);
    if (i === 0 || i === meio || i === serie.length - 1) svg.append(texto(cx, base + 18, dataCurta(ponto.data), "middle"));
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
    const autos = await Dados.automacoes();
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
    lista.replaceChildren(...autos.map((a) => itemAutomacao(a, abrir, recarregar)));
  }
  recarregar();
}

function itemAutomacao(a, abrir, recarregar) {
  const palavras = a.match_any
    ? [h("span", { class: "chip" }, "qualquer palavra")]
    : (a.keyword || "").split(",").map((s) => s.trim()).filter(Boolean).map((k) => h("span", { class: "chip" }, k));
  const posts = a.media_ids?.length ? `${a.media_ids.length} post(s)` : "todos os posts";

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
    h("div", { class: "info" }, h("h3", {}, a.nome || "Sem nome"), h("div", {}, palavras, h("span", { class: "chip" }, posts))),
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

// Começa quando todos os scripts (inclusive o editor.js) já carregaram.
window.addEventListener("DOMContentLoaded", iniciar);
