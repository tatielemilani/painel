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
  telefone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
  botao: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/>',
  lupa: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  atualizar: '<path d="M21 12a9 9 0 1 1-2.6-6.4L21 8"/><path d="M21 3v5h-5"/>',
  alvo: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  esquerda: '<path d="m15 18-6-6 6-6"/>',
  direita: '<path d="m9 18 6-6-6-6"/>',
  baixo: '<path d="m6 9 6 6 6-6"/>',
  brilho: '<path d="M12 3l1.9 5.6L19.5 11l-5.6 1.9L12 18.5l-1.9-5.6L4.5 11l5.6-2.4z"/><path d="M19 3v4M17 5h4"/>',
  nuvem: '<path d="M17.5 19H8a5 5 0 1 1 1.3-9.8A6 6 0 0 1 20.8 11 4 4 0 0 1 17.5 19z"/>',
  clique: '<path d="m9 9 5 12 1.8-5.2L21 14z"/><path d="M7.2 2.2 8 5.1M5.1 8 2.2 7.2M14 4.1 12 6.2M6.2 12l-2.1 2"/>',
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

  // Envios dos últimos N dias (status, motivo e data), de 1000 em 1000.
  async entregas(dias = 30) {
    if (!sb) return [];
    try {
      const desde = new Date(Date.now() - dias * 86400000).toISOString();
      const todas = [];
      for (let de = 0; de < 20000; de += 1000) {
        const { data, error } = await sb.from("ig_deliveries").select("status,motivo,ts")
          .gte("ts", desde).order("ts", { ascending: false }).range(de, de + 999);
        if (error) throw error;
        todas.push(...data);
        if (data.length < 1000) break;
      }
      return todas;
    } catch (e) { console.warn("entregas:", e); return []; }
  },

  // Teste A/B de uma automação: por versão (0 = A, 1 = B...), quantas foram enviadas
  // e quantas pessoas continuaram a conversa (tocaram no botão e foram além da Mensagem 1).
  async statsVersoes(automationId) {
    if (!sb) return null;
    try {
      const contar = async (consulta) => { const { count, error } = await consulta; if (error) throw error; return count || 0; };
      return await Promise.all([0, 1, 2, 3].map(async (v) => ({
        enviadas: await contar(sb.from("ig_deliveries").select("id", { count: "exact", head: true })
          .eq("automation_id", automationId).eq("status", "ok").eq("variante", v)),
        continuaram: await contar(sb.from("ig_leads").select("ig_user_id", { count: "exact", head: true })
          .eq("automation_id", automationId).eq("variante", v).neq("flow_step", "1")),
      })));
    } catch (e) { console.warn("statsVersoes:", e); return null; }
  },

  // Marcas e propostas (abas Marcas e Propostas)
  async marcas() {
    if (!sb) return [];
    try {
      const { data, error } = await sb.from("marcas").select("*").order("nome");
      if (error) throw error;
      return data || [];
    } catch (e) { console.warn("marcas:", e); return []; }
  },
  async propostas() {
    if (!sb) return [];
    try {
      const { data, error } = await sb.from("propostas").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (e) { console.warn("propostas:", e); return []; }
  },
  // Cria (sem id) ou atualiza (com id). Devolve { ok, erro }.
  async salvarLinha(tabela, linha) {
    if (!sb) return { ok: false, erro: "sem banco" };
    try {
      const { id, ...dados } = linha;
      dados.updated_at = new Date().toISOString();
      const { error } = id
        ? await sb.from(tabela).update(dados).eq("id", id)
        : await sb.from(tabela).insert(dados);
      if (error) throw error;
      return { ok: true };
    } catch (e) { return { ok: false, erro: e.message || String(e) }; }
  },
  async apagarLinha(tabela, id) {
    if (!sb) return false;
    try { const { error } = await sb.from(tabela).delete().eq("id", id); return !error; } catch { return false; }
  },
  salvarMarca(linha) { return this.salvarLinha("marcas", linha); },
  apagarMarca(id) { return this.apagarLinha("marcas", id); },
  salvarProposta(linha) { return this.salvarLinha("propostas", linha); },
  apagarProposta(id) { return this.apagarLinha("propostas", id); },

  // Leitura genérica: lista(tabela, (consulta) => consulta.eq(...).order(...))
  async lista(tabela, filtrar = (c) => c) {
    if (!sb) return [];
    try {
      const { data, error } = await filtrar(sb.from(tabela).select("*"));
      if (error) throw error;
      return data || [];
    } catch (e) { console.warn(`${tabela}:`, e); return []; }
  },
  // Foco e top 3 de um mês ("2026-10").
  async planMes(mes) {
    const vazio = { mes, foco: "", top3: ["", "", ""] };
    const [linha] = await this.lista("plan_mes", (c) => c.eq("mes", mes));
    return linha ? { ...vazio, ...linha } : vazio;
  },
  async salvarPlanMes(linha) {
    if (!sb) return { ok: false, erro: "sem banco" };
    try {
      const { error } = await sb.from("plan_mes").upsert({ ...linha, updated_at: new Date().toISOString() });
      if (error) throw error;
      return { ok: true };
    } catch (e) { return { ok: false, erro: e.message || String(e) }; }
  },

  // Selos do topo da aba Instagram: validade do token e entregas nas últimas 24h.
  async statusConta() {
    const vazio = { tokenExpira: null, tokenOk: null, entregas24h: 0 };
    if (!sb) return vazio;
    try {
      const desde = new Date(Date.now() - 86400000).toISOString();
      const [token, entregas] = await Promise.all([
        sb.from("ig_token_status").select("expires_at,last_ok,last_error").eq("id", "main").maybeSingle(),
        sb.from("ig_deliveries").select("*", { count: "exact", head: true }).eq("status", "ok").gte("ts", desde),
      ]);
      return {
        tokenExpira: token.data?.expires_at || null, tokenOk: token.data?.last_ok ?? null,
        tokenErro: token.data?.last_error || null, entregas24h: entregas.count || 0,
      };
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

  // Renova o token do Instagram agora (botão no topo). Devolve { ok, expira_em } ou { ok: false, erro }.
  async renovarToken() {
    if (!sb) return { ok: false, erro: "sem banco" };
    try {
      const { data, error } = await sb.functions.invoke("ig-token-refresh", { method: "POST" });
      if (error) {
        let erro = error.message;
        try { erro = (await error.context.json()).erro || erro; } catch { /* sem detalhe */ }
        return { ok: false, erro };
      }
      return data;
    } catch (e) { return { ok: false, erro: e.message || String(e) }; }
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
  async insights(dias = 30) {
    const r = (await this.chamarFuncao(`ig-insights?dias=${dias || "tudo"}`)) || { conectado: false };
    if (r.conta?.username) this.contaIG = r.conta.username; // o @ aparece no topo do celular da prévia
    return r;
  },
  contaIG: null,
  // Gráfico dia a dia de "engajadas" ou "interacoes" (null = deu erro)
  async serieInsights(tipo, dias = 30) { return this.chamarFuncao(`ig-insights?dias=${dias || "tudo"}&serie=${tipo}`); },
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
  // Apaga o arquivo da pasta (Storage) e da biblioteca.
  async apagarArquivo(arquivo) {
    if (!sb) return false;
    try {
      const caminho = decodeURIComponent(String(arquivo.public_url || "").split("/ig-assets/")[1] || "");
      if (caminho) await sb.storage.from("ig-assets").remove([caminho]);
      const { error } = await sb.from("ig_assets").delete().eq("id", arquivo.id);
      return !error;
    } catch { return false; }
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

  // Mural dos Sonhos: fotos na pasta PRIVADA "mural" (abrem por link temporário de 1 hora).
  async sonhosComFoto() {
    const lista = await this.lista("sonhos", (c) => c.order("created_at"));
    const caminhos = lista.map((s) => s.arquivo).filter(Boolean);
    if (sb && caminhos.length) {
      try {
        const { data } = await sb.storage.from("mural").createSignedUrls(caminhos, 3600);
        const links = new Map((data || []).map((d) => [d.path, d.signedUrl]));
        lista.forEach((s) => { if (s.arquivo) s.foto = links.get(s.arquivo) || null; });
      } catch (e) { console.warn("mural:", e); }
    }
    lista.forEach((s) => { if (!s.foto && s.imagem_url) s.foto = s.imagem_url; });
    return lista;
  },
  async enviarSonho(arquivo) {
    if (!sb) return { ok: false, erro: "sem banco" };
    const caminho = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${(arquivo.name.split(".").pop() || "jpg").toLowerCase()}`;
    try {
      const up = await sb.storage.from("mural").upload(caminho, arquivo, { contentType: arquivo.type });
      if (up.error) throw up.error;
      const { error } = await sb.from("sonhos").insert({ titulo: arquivo.name.replace(/\.[^.]+$/, "").slice(0, 80) || "Sonho", arquivo: caminho });
      if (error) { await sb.storage.from("mural").remove([caminho]); throw error; }
      return { ok: true };
    } catch (e) { return { ok: false, erro: e.message || String(e) }; }
  },
  async apagarSonho(sonho) {
    if (!sb) return false;
    try {
      if (sonho.arquivo) await sb.storage.from("mural").remove([sonho.arquivo]);
      const { error } = await sb.from("sonhos").delete().eq("id", sonho.id);
      return !error;
    } catch { return false; }
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
const ROTAS = { inicio: telaInicio, calendario: telaCalendario, instagram: telaInstagram, focos: telaFocos };

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
// INSTAGRAM (sub-abas: Visão geral, Automações, Leads, Análises, Marcas, Propostas)
// ---------------------------------------------------------------------
function telaInstagram(p, sub) {
  const ABAS = {
    visao: ["📊 Visão geral", telaVisaoGeral],
    automacoes: ["Automações", telaAutomacoes],
    leads: ["Leads", telaInteracoes],
    analises: ["Análises", telaAnalises],
    marcas: ["Marcas", telaMarcas],
    propostas: ["📥 Propostas", telaPropostas],
  };
  // links antigos: #instagram/interacoes vira Leads, #instagram/metricas vira Análises
  const apelidos = { interacoes: "leads", metricas: "analises" };
  const aba = ABAS[sub] ? sub : ABAS[apelidos[sub]] ? apelidos[sub] : "visao";
  const selos = h("div", { class: "selos" });
  const area = h("div");
  p.append(
    h("div", { class: "cabecalho", style: "margin-bottom:16px" }, h("h1", {}, "📸 Automação do Instagram"), selos),
    h("nav", { class: "abas", "aria-label": "Seções do Instagram" },
      Object.entries(ABAS).map(([chave, [titulo]]) =>
        h("a", { href: `#instagram/${chave}`, class: aba === chave ? "ativo" : "", "aria-current": aba === chave ? "page" : null }, titulo))),
    area,
  );
  const atualizarSelos = () => Dados.statusConta().then((status) => selos.replaceChildren(...selosDaConta(status, atualizarSelos)));
  atualizarSelos();
  ABAS[aba][1](area);
}

// Selos do topo: validade do token (clicando, renova na hora) e mensagens enviadas nas últimas 24h.
function selosDaConta(status, aoRenovar) {
  const expira = status.tokenExpira ? new Date(status.tokenExpira) : null;
  const dias = expira ? Math.max(0, Math.round((expira - Date.now()) / 86400000)) : null;
  let cor = "cinza", texto = Dados.semBanco ? "Token não conectado" : "Token sem data", dica;
  if (status.tokenOk === false) { cor = "vermelho"; texto = "Token com erro"; }
  else if (dias !== null) { cor = dias < 10 ? "vermelho" : "verde"; texto = `Token ${dias} ${dias === 1 ? "dia" : "dias"}`; }
  dica = expira
    ? `Vence em ${expira.toLocaleDateString("pt-BR")}. Renova sozinho toda segunda-feira. Clique pra renovar agora.`
    : "Clique pra renovar agora e ver quando vence.";
  if (status.tokenOk === false && status.tokenErro) dica = `Última renovação falhou: ${status.tokenErro}. Clique pra tentar de novo.`;

  const botaoToken = h("button", {
    class: "selo-topo selo-botao", type: "button", title: dica, "aria-label": `${texto}. ${dica}`,
    onclick: async () => {
      if (Dados.semBanco) { toast("No modo de teste local não dá pra renovar o token. Use o painel publicado."); return; }
      botaoToken.disabled = true;
      botaoToken.lastChild.textContent = "Renovando...";
      const r = await Dados.renovarToken();
      if (r.ok) toast(`Token renovado! Vence em ${new Date(r.expira_em).toLocaleDateString("pt-BR")}.`, "sucesso");
      else toast(`Não consegui renovar: ${r.erro}`, "erro");
      aoRenovar?.();
    },
  }, h("span", { class: `bolinha ${cor}` }), icone("atualizar"), h("span", {}, texto));
  return [
    botaoToken,
    h("span", { class: "selo-topo", title: "Mensagens enviadas pelas automações nas últimas 24 horas" },
      icone("enviar"), `${fmt(status.entregas24h)} entregas`, h("span", { class: "mudo" }, "24h")),
  ];
}

// ---------- Análises ----------
const PERIODOS =[[7, "7 dias"], [30, "30 dias"], [90, "90 dias"], [0, "Tudo"]];
let periodoAnalises = 30; // lembra o período escolhido enquanto o painel está aberto
let graficoAnalises = "alcance"; // qual gráfico aparece (muda clicando no cartão)
// Contas engajadas e interações são buscadas dia a dia, só quando a pessoa clica.
// Ficam guardadas aqui (por tipo e período) pra não buscar de novo à toa.
const GRAFICOS_SOB_DEMANDA = {
  engajadas: ["🤝 Contas engajadas por dia", "contas engajadas"],
  interacoes: ["💬 Interações por dia", "interações"],
};
const seriesGuardadas = new Map();

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

  const pilulas = h("div", { class: "pilulas", role: "group", "aria-label": "Período" });
  const botaoRecarregar = h("button", {
    class: "btn", type: "button",
    onclick: () => { seriesGuardadas.clear(); carregarConta(); },
  }, icone("atualizar"), "Atualizar");
  const cartoes = h("div", { class: "grade-cartoes cartoes-analise" });
  const grafico = h("div", { class: "cartao" });
  const melhores = h("section", { class: "secao" });
  const barraAtualizacao = h("div", { class: "cartao barra-atualizacao" });
  const ranking = h("section", { class: "secao" });
  const conteudo = h("div", {}, cartoes, grafico, melhores, barraAtualizacao, ranking);

  area.append(
    h("div", { class: "cabecalho", style: "margin-bottom:12px" },
      h("div", {}, h("h2", {}, "Análises"), h("p", { class: "sub" }, "Como a sua conta está indo no período escolhido."))),
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
    ins = await Dados.insights(periodoAnalises);
    botaoRecarregar.disabled = false;
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
      cartao(t.contas_engajadas, "Contas engajadas", t.contas_engajadas === null ? "O Instagram só informa o total de contas engajadas em períodos de até 30 dias" : null, "engajadas"),
      cartao(t.interacoes, "Interações", "Curtidas, comentários, salvos, compartilhamentos e respostas no período", "interacoes"),
    );
  }

  function desenharGrafico() {
    const dica = h("span", { class: "mudo", style: "font-weight:400;font-size:13px" }, "(passe o mouse pra ver os números)");
    if (GRAFICOS_SOB_DEMANDA[graficoAnalises]) {
      const tipo = graficoAnalises, periodo = periodoAnalises;
      const [titulo, unidade] = GRAFICOS_SOB_DEMANDA[tipo];
      grafico.replaceChildren(h("h3", {}, titulo), h("p", { class: "carregando" }, "Buscando dia a dia no Instagram..."));
      const chave = `${tipo}:${periodo}`;
      if (!seriesGuardadas.has(chave)) seriesGuardadas.set(chave, Dados.serieInsights(tipo, periodo));
      seriesGuardadas.get(chave).then((r) => {
        if (!r) seriesGuardadas.delete(chave); // deu erro: tenta de novo no próximo clique
        if (graficoAnalises !== tipo || periodoAnalises !== periodo) return; // trocou de gráfico no meio
        let corpo;
        if (!r) corpo = h("p", { class: "ajuda" }, "Não consegui buscar esse gráfico agora. Tente de novo.");
        else if (!r.serie) corpo = h("p", { class: "ajuda" }, `${r.motivo} Escolha 7, 30 ou 90 dias pra ver o gráfico.`);
        else if (!r.serie.length) corpo = h("p", { class: "ajuda" }, `O Instagram não devolveu dados pra esse gráfico. ${r.motivo || ""}`);
        else corpo = graficoBarras(r.serie, unidade, { largo: true });
        grafico.replaceChildren(
          h("h3", {}, r?.porBloco ? "💬 Interações a cada 30 dias" : titulo, " ", r?.serie?.length ? dica : null),
          corpo);
      });
      return;
    }
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
// opcoes.largo: largura toda (Análises). opcoes.compacto: sem eixos nem datas, com o
// "trilho" bege atrás de cada barra (painéis da Visão geral).
function graficoBarras(serie, unidade, opcoes = {}) {
  if (!serie?.length) return h("p", { class: "ajuda" }, "Sem dados pra esse período.");
  const compacto = !!opcoes.compacto;
  const L = opcoes.largo ? 1000 : 600;
  const A = compacto ? 150 : opcoes.largo ? 190 : 200;
  const topo = compacto ? 0 : 14, base = compacto ? A : opcoes.largo ? 162 : 172, esq = compacto ? 0 : 40;
  const rotulo = (p) => p.rotulo || dataCurta(p.data);
  const max = Math.max(1, ...serie.map((s) => s.valor));
  const passo = (L - esq) / serie.length;
  const larg = compacto ? passo * 0.82 : Math.max(4, Math.min(26, passo * 0.62));
  const ns = "http://www.w3.org/2000/svg";
  const s = (tag, at) => { const e = document.createElementNS(ns, tag); for (const k in at) e.setAttribute(k, at[k]); return e; };
  const texto = (x, y, t, ancora) => { const e = s("text", { x, y, "text-anchor": ancora }); e.textContent = t; return e; };

  const svg = s("svg", { viewBox: `0 0 ${L} ${A}`, role: "img", "aria-label": `${unidade} por dia` });
  if (!compacto) {
    for (const v of [max, Math.round(max / 2)]) {
      const y = base - (v / max) * (base - topo);
      svg.append(s("line", { x1: esq, x2: L, y1: y, y2: y, class: "grade" }), texto(esq - 8, y + 4, fmt(v), "end"));
    }
    svg.append(s("line", { x1: esq, x2: L, y1: base, y2: base, class: "eixo" }));
  }

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
    // Trilho: a coluna bege inteira atrás da barra (só no compacto)
    if (compacto) svg.append(s("rect", { x, y: topo, width: larg, height: base - topo, rx: 4, class: "trilho" }));
    svg.append(barra, alvo);
    if (!compacto && (i === 0 || i === meio || i === serie.length - 1)) svg.append(texto(cx, base + 18, rotulo(ponto), "middle"));
  });
  return caixa;
}

// ---------- Visão geral ----------
const DIA_MS = 86400000;
const somaValores = (s) => (s || []).reduce((t, p) => t + (p.valor || 0), 0);
const decimal1 = (n) => Number(n || 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
// "qua, 08/07"
const diaDaSemana = (iso) => new Date(`${String(iso).slice(0, 10)}T12:00:00`)
  .toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" }).replace(".", "");

async function telaVisaoGeral(area) {
  const cartoes = h("div", { class: "grade-cartoes cartoes-visao" }, h("p", { class: "carregando" }, "Carregando..."));
  const graficos = h("div", { class: "grade-2" });
  const inferior = h("div", { class: "grade-2" });
  area.append(cartoes, graficos, inferior);

  const [ins, leads, entregas] = await Promise.all([Dados.insights(30), Dados.leadsCompletos(), Dados.entregas(30)]);
  const listaLeads = leads || [];
  const desde15 = Date.now() - 15 * DIA_MS;
  const conectado = !!ins?.conectado;
  const novos = conectado ? (ins.novos_seguidores || []).slice(-15) : [];
  const alcance = conectado ? (ins.alcance || []).slice(-15) : [];
  const leads15 = listaLeads.filter((l) => new Date(l.created_at).getTime() >= desde15).length;
  const dms = entregas.filter((e) => e.status === "ok");
  const dms15 = dms.filter((e) => new Date(e.ts).getTime() >= desde15).length;

  const subiu = (n) => h("span", { class: "subiu" }, `↑ +${fmt(n)}`);
  const cartao = (emoji, rotulo, valor, detalhe, destaque) => h("div", { class: `cartao cartao-visao${destaque ? " destaque" : ""}` },
    h("span", { class: "rotulo" }, `${emoji} ${rotulo}`), h("div", { class: "valor" }, valor), h("div", { class: "detalhe" }, detalhe));
  cartoes.replaceChildren(
    cartao("👥", "Seguidores", conectado ? fmt(ins.conta?.seguidores) : "-",
      conectado ? [subiu(somaValores(novos)), " em 15 dias"] : "conecte o Instagram"),
    cartao("🎯", "Leads captados", fmt(listaLeads.length), [subiu(leads15), " em 15 dias"], true),
    cartao("💌", "DMs enviadas", fmt(dms.length), [subiu(dms15), " em 15 dias · total de 30 dias"]),
    cartao("📣", "Alcance", conectado ? fmt(somaValores(alcance)) : "-", "contas alcançadas · 15 dias"),
  );

  graficos.replaceChildren(
    painelGrafico("📈", "Crescimento do perfil", "novos seguidores por dia · 15 dias · passe o mouse",
      `+${fmt(somaValores(novos))}`, "seguidores", novos, "novos seguidores", "+", conectado),
    painelGrafico("📣", "Alcance", "contas alcançadas por dia · 15 dias · passe o mouse",
      fmt(somaValores(alcance)), "contas", alcance, "contas alcançadas", "", conectado),
  );
  inferior.replaceChildren(painelSaude(entregas), painelQuerem(listaLeads));
}

function painelGrafico(emoji, titulo, sub, numero, sufixo, serie, unidade, sinal, conectado) {
  const media = serie.length ? somaValores(serie) / serie.length : 0;
  const pico = serie.reduce((m, p) => (p.valor > (m?.valor ?? -1) ? p : m), null);
  return h("div", { class: "cartao painel" },
    h("div", { class: "painel-titulo" }, h("strong", {}, `${emoji} ${titulo}`), " ", h("span", { class: "mudo" }, sub)),
    conectado
      ? [
        h("div", { class: "numero-grande" }, numero, " ", h("span", { class: "sufixo" }, sufixo)),
        graficoBarras(serie, unidade, { compacto: true }),
        h("div", { class: "eixo-x" }, h("span", {}, "15 dias atrás"), h("span", {}, "hoje")),
        pico ? h("p", { class: "ajuda rodape-painel" },
          "média ", h("strong", {}, `${decimal1(media)}/dia`), ` · pico ${sinal}${fmt(pico.valor)} em ${diaDaSemana(pico.data)}`) : null,
      ]
      : h("p", { class: "ajuda" }, "Conecte o Instagram pra ver esse gráfico."));
}

// Saúde do envio: quantas DMs saíram, falharam ou esperam na fila, e os erros mais comuns.
function painelSaude(entregas) {
  const cont = { ok: 0, erro: 0, na_fila: 0 };
  const motivos = new Map();
  for (const e of entregas) {
    cont[e.status] = (cont[e.status] || 0) + 1;
    if (e.status === "erro" && e.motivo) motivos.set(e.motivo, (motivos.get(e.motivo) || 0) + 1);
  }
  const total = cont.ok + cont.erro + cont.na_fila;
  const pct = (n) => (total ? (n / total) * 100 : 0);
  const topo = [...motivos].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const legenda = (classe, n, texto) => h("span", { class: "item-legenda" }, h("span", { class: `ponto ${classe}` }), h("strong", {}, fmt(n)), ` ${texto}`);
  return h("div", { class: "cartao painel" },
    h("div", { class: "painel-titulo" }, h("strong", {}, "🛡️ Saúde do envio"), " ", h("span", { class: "mudo" }, "últimos 30 dias")),
    total
      ? h("div", { class: "barra-saude", role: "img", "aria-label": `${cont.ok} entregues, ${cont.erro} falharam, ${cont.na_fila} na fila` },
        h("span", { class: "ok", style: `width:${pct(cont.ok)}%` }),
        h("span", { class: "erro", style: `width:${pct(cont.erro)}%` }),
        h("span", { class: "fila", style: `width:${pct(cont.na_fila)}%` }))
      : h("div", { class: "barra-saude vazia" }),
    h("div", { class: "legenda-saude" }, legenda("ok", cont.ok, "entregues"), legenda("erro", cont.erro, "falharam"), legenda("fila", cont.na_fila, "na fila")),
    topo.length
      ? h("ul", { class: "lista-motivos" }, topo.map(([m, n]) => h("li", {}, h("span", { class: "motivo", title: m }, m), h("strong", {}, fmt(n)))))
      : h("p", { class: "ajuda" }, total ? "Nenhuma falha nos últimos 30 dias. 🎉" : "Nenhuma mensagem enviada nos últimos 30 dias."));
}

// O que as pessoas querem: quantos leads cada automação trouxe, e de onde vieram.
function painelQuerem(leads) {
  const porAuto = new Map();
  const porOrigem = { comment: 0, dm: 0, story_reply: 0 };
  for (const l of leads) {
    const nome = l.automacao_nome || "Automação apagada";
    porAuto.set(nome, (porAuto.get(nome) || 0) + 1);
    if (l.last_source in porOrigem) porOrigem[l.last_source]++;
  }
  const topo = [...porAuto].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const max = Math.max(1, ...topo.map(([, n]) => n));
  return h("div", { class: "cartao painel" },
    h("div", { class: "painel-titulo" }, h("strong", {}, "💡 O que as pessoas querem"), " ", h("span", { class: "mudo" }, "por automação")),
    topo.length
      ? h("ul", { class: "lista-querem" }, topo.map(([nome, n]) => h("li", {},
        h("span", { class: "nome", title: nome }, nome),
        h("span", { class: "trilho-h" }, h("span", { style: `width:${(n / max) * 100}%` })),
        h("strong", {}, fmt(n)))))
      : h("p", { class: "ajuda" }, "Quando as automações começarem a trazer leads, aparece aqui o que mais chama atenção."),
    h("p", { class: "ajuda rodape-painel" },
      `📍 ${fmt(porOrigem.comment)} comentário · ${fmt(porOrigem.dm)} direct · ${fmt(porOrigem.story_reply)} story`));
}

// ---------- Formulário em janela (Marcas e Propostas) ----------
// campos: [{ chave, rotulo, tipo: texto|email|tel|url|numero|data|select|textarea, opcoes, obrigatorio, placeholder }]
function abrirFormulario({ titulo, campos, valores = {}, aoSalvar, textoSalvar = "Salvar" }) {
  const entradas = {};
  const erro = h("p", { class: "login-erro", role: "alert" });
  const linhas = campos.map((c) => {
    const id = `campo-${c.chave}`;
    let entrada;
    if (c.tipo === "select") {
      entrada = h("select", { class: "campo", id }, (c.opcoes || []).map(([v, t]) => h("option", { value: v, selected: String(valores[c.chave] ?? "") === String(v) }, t)));
    } else if (c.tipo === "textarea") {
      entrada = h("textarea", { class: "campo", id, value: valores[c.chave] ?? "", placeholder: c.placeholder || null, style: "min-height:80px" });
    } else {
      const tipos = { email: "email", tel: "tel", url: "url", data: "date", numero: "text" };
      entrada = h("input", {
        class: "campo", id, type: tipos[c.tipo] || "text", value: valores[c.chave] ?? "", placeholder: c.placeholder || null,
        inputmode: c.tipo === "numero" ? "decimal" : null,
      });
    }
    entradas[c.chave] = entrada;
    return h("div", { class: `grupo${c.largo ? " campo-largo" : ""}` },
      h("label", { class: "rotulo", for: id }, c.rotulo, c.obrigatorio ? h("span", { class: "obrigatorio" }, " *") : null), entrada);
  });
  const salvar = h("button", { class: "btn btn-primario", type: "submit" }, textoSalvar);
  const fechar = () => { fundo.remove(); document.removeEventListener("keydown", aoTeclar); };
  const aoTeclar = (e) => { if (e.key === "Escape") fechar(); };
  const form = h("form", {
    class: "modal cartao", novalidate: true, role: "dialog", "aria-modal": "true", "aria-label": titulo,
    onsubmit: async (e) => {
      e.preventDefault();
      const dados = {};
      for (const c of campos) {
        let v = entradas[c.chave].value.trim();
        if (c.tipo === "numero" && v) {
          // aceita "1.500,00", "1500,5" e "1500.50"
          v = Number(v.includes(",") ? v.replace(/\./g, "").replace(",", ".") : v);
          if (Number.isNaN(v)) { erro.textContent = `"${c.rotulo}" precisa ser um número.`; return; }
        }
        dados[c.chave] = v === "" ? null : v;
      }
      const falta = campos.filter((c) => c.obrigatorio && dados[c.chave] === null);
      if (falta.length) { erro.textContent = `Preencha: ${falta.map((c) => c.rotulo).join(", ")}.`; return; }
      salvar.disabled = true;
      const ok = await aoSalvar(dados);
      salvar.disabled = false;
      if (ok) fechar();
    },
  },
  h("div", { class: "modal-topo" }, h("h2", {}, titulo),
    h("button", { class: "btn btn-fantasma btn-icone", type: "button", "aria-label": "Fechar", onclick: () => fechar() }, icone("x"))),
  h("div", { class: "modal-campos" }, linhas),
  erro,
  h("div", { class: "modal-acoes" }, h("button", { class: "btn", type: "button", onclick: () => fechar() }, "Cancelar"), salvar));
  const fundo = h("div", { class: "modal-fundo", onmousedown: (e) => { if (e.target === fundo) fechar(); } }, form);
  document.body.append(fundo);
  document.addEventListener("keydown", aoTeclar);
  form.querySelector(".campo")?.focus();
}

const reais = (v) => (v === null || v === undefined ? "-" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
const dataBR = (d) => (d ? new Date(`${String(d).slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR") : "-");
const avisoSemBanco = () => toast("Modo de teste local: pra salvar de verdade, entre pelo painel publicado (veja o LEIA-ME).");

// ---------- Marcas ----------
const STATUS_MARCA = { prospeccao: "Prospecção", em_contato: "Em contato", negociando: "Negociando", parceira: "Parceira", pausada: "Pausada" };
const CAMPOS_MARCA = [
  { chave: "nome", rotulo: "Nome da marca", obrigatorio: true, placeholder: "Ex: Marca de cosméticos" },
  { chave: "instagram", rotulo: "@ no Instagram", placeholder: "@marca" },
  { chave: "segmento", rotulo: "Segmento", placeholder: "Ex: beleza, moda, casa" },
  { chave: "status", rotulo: "Status", tipo: "select", opcoes: Object.entries(STATUS_MARCA) },
  { chave: "contato_nome", rotulo: "Pessoa de contato" },
  { chave: "email", rotulo: "E-mail", tipo: "email" },
  { chave: "telefone", rotulo: "Telefone", tipo: "tel" },
  { chave: "site", rotulo: "Site", tipo: "url", placeholder: "https://..." },
  { chave: "observacoes", rotulo: "Observações", tipo: "textarea", largo: true },
];
const arrobaLimpa = (v) => (v ? String(v).trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^@/, "").replace(/\/.*$/, "") || null : null);

async function telaMarcas(area) {
  const filtro = { busca: "", status: "" };
  let marcas = [], propostas = [];
  const busca = h("input", {
    class: "campo campo-busca", type: "search", placeholder: "Buscar marca, @ ou segmento", "aria-label": "Buscar marcas",
    oninput: (e) => { filtro.busca = e.target.value; desenhar(); },
  });
  const pilulas = h("div", { class: "pilulas pilulas-pequenas", role: "group", "aria-label": "Filtrar por status" });
  const lista = h("div", { class: "grade-marcas" }, h("p", { class: "carregando" }, "Carregando..."));
  area.append(
    h("div", { class: "cabecalho", style: "margin-bottom:16px" },
      h("div", {}, h("h2", {}, "Marcas"), h("p", { class: "sub" }, "As marcas com quem você fala ou quer fazer parceria.")),
      h("div", { class: "acoes-planilha" }, h("span", { class: "busca-caixa" }, icone("lupa"), busca),
        h("button", { class: "btn btn-primario", type: "button", onclick: () => editar(null) }, icone("mais"), "Nova marca"))),
    pilulas, lista);

  await carregar();

  async function carregar() {
    [marcas, propostas] = await Promise.all([Dados.marcas(), Dados.propostas()]);
    desenhar();
  }

  function editar(marca) {
    abrirFormulario({
      titulo: marca ? "Editar marca" : "Nova marca",
      campos: CAMPOS_MARCA,
      valores: marca ? { ...marca, instagram: marca.instagram ? `@${marca.instagram}` : "" } : { status: "prospeccao" },
      aoSalvar: async (dados) => {
        if (Dados.semBanco) { avisoSemBanco(); return false; }
        const r = await Dados.salvarMarca({ ...dados, instagram: arrobaLimpa(dados.instagram), id: marca?.id });
        if (!r.ok) { toast(`Não consegui salvar: ${r.erro}`, "erro"); return false; }
        toast("Marca salva!", "sucesso");
        await carregar();
        return true;
      },
    });
  }

  function desenhar() {
    const contagem = Object.fromEntries(Object.keys(STATUS_MARCA).map((s) => [s, marcas.filter((m) => m.status === s).length]));
    pilulas.replaceChildren(...[["", `Todas (${marcas.length})`], ...Object.entries(STATUS_MARCA).map(([s, t]) => [s, `${t} (${contagem[s]})`])]
      .map(([s, t]) => h("button", {
        type: "button", class: `pilula${filtro.status === s ? " ativa" : ""}`, "aria-pressed": String(filtro.status === s),
        onclick: () => { filtro.status = s; desenhar(); },
      }, t)));

    const termo = filtro.busca.trim().toLowerCase();
    const visiveis = marcas
      .filter((m) => !filtro.status || m.status === filtro.status)
      .filter((m) => !termo || [m.nome, m.instagram, m.segmento, m.contato_nome].some((v) => String(v || "").toLowerCase().includes(termo)));

    if (!marcas.length) {
      lista.replaceChildren(estadoVazio("usuarios", "Nenhuma marca ainda",
        "Cadastre as marcas com quem você conversa ou quer trabalhar, e acompanhe as propostas de cada uma.",
        h("button", { class: "btn btn-primario", type: "button", onclick: () => editar(null) }, icone("mais"), "Nova marca")));
      return;
    }
    if (!visiveis.length) { lista.replaceChildren(h("p", { class: "carregando" }, "Nenhuma marca com esse filtro.")); return; }

    lista.replaceChildren(...visiveis.map((m) => {
      const dela = propostas.filter((p) => p.marca_id === m.id);
      const fechado = dela.filter((p) => p.status === "aceita" || p.status === "paga").reduce((t, p) => t + Number(p.valor || 0), 0);
      return h("div", { class: "cartao cartao-marca" },
        h("div", { class: "marca-topo" },
          h("div", { style: "min-width:0" },
            h("h3", {}, m.nome),
            m.instagram ? h("a", { href: `https://instagram.com/${encodeURIComponent(m.instagram)}`, target: "_blank", rel: "noopener" }, `@${m.instagram}`) : null),
          h("span", { class: `selo selo-${m.status}` }, STATUS_MARCA[m.status])),
        m.segmento ? h("span", { class: "chip" }, m.segmento) : null,
        (m.contato_nome || m.email) ? h("p", { class: "ajuda", style: "margin:8px 0 0" }, [m.contato_nome, m.email].filter(Boolean).join(" · ")) : null,
        h("p", { class: "marca-numeros" }, `${dela.length} ${dela.length === 1 ? "proposta" : "propostas"}`, fechado ? ` · ${reais(fechado)} fechado` : ""),
        h("div", { class: "marca-acoes" },
          h("button", { class: "btn btn-pequeno", type: "button", onclick: () => editar(m) }, icone("lapis"), "Editar"),
          h("a", { class: "btn btn-pequeno", href: "#instagram/propostas" }, "Ver propostas"),
          h("button", {
            class: "btn btn-fantasma btn-icone btn-perigo", type: "button", title: "Apagar", "aria-label": `Apagar ${m.nome}`,
            onclick: async () => {
              if (!confirm(`Apagar a marca "${m.nome}"? As propostas dela também serão apagadas. Isso não tem volta.`)) return;
              if (await Dados.apagarMarca(m.id)) { toast("Marca apagada."); carregar(); } else toast("Não consegui apagar.", "erro");
            },
          }, icone("lixo"))));
    }));
  }
}

// ---------- Propostas ----------
const STATUS_PROPOSTA = { rascunho: "Rascunho", enviada: "Enviada", negociando: "Negociando", aceita: "Aceita", recusada: "Recusada", paga: "Paga" };

async function telaPropostas(area) {
  const filtro = { status: "" };
  let marcas = [], propostas = [];
  const resumo = h("div", { class: "grade-cartoes cartoes-visao" });
  const pilulas = h("div", { class: "pilulas pilulas-pequenas", role: "group", "aria-label": "Filtrar por status" });
  const corpo = h("div", { class: "cartao planilha-cartao" }, h("p", { class: "carregando" }, "Carregando..."));
  area.append(
    h("div", { class: "cabecalho", style: "margin-bottom:16px" },
      h("div", {}, h("h2", {}, "Propostas"), h("p", { class: "sub" }, "O que você enviou pras marcas, quanto vale e em que pé está.")),
      h("button", { class: "btn btn-primario", type: "button", onclick: () => editar(null) }, icone("mais"), "Nova proposta")),
    resumo, pilulas, corpo);

  await carregar();

  async function carregar() {
    [marcas, propostas] = await Promise.all([Dados.marcas(), Dados.propostas()]);
    desenhar();
  }

  function editar(proposta) {
    if (!marcas.length) {
      toast("Cadastre uma marca primeiro (aba Marcas).");
      location.hash = "#instagram/marcas";
      return;
    }
    abrirFormulario({
      titulo: proposta ? "Editar proposta" : "Nova proposta",
      campos: [
        { chave: "marca_id", rotulo: "Marca", tipo: "select", obrigatorio: true, opcoes: [["", "Escolha a marca"], ...marcas.map((m) => [m.id, m.nome])] },
        { chave: "titulo", rotulo: "Título", obrigatorio: true, placeholder: "Ex: Campanha de lançamento" },
        { chave: "valor", rotulo: "Valor (R$)", tipo: "numero", placeholder: "Ex: 1.500,00" },
        { chave: "status", rotulo: "Status", tipo: "select", opcoes: Object.entries(STATUS_PROPOSTA) },
        { chave: "enviada_em", rotulo: "Enviada em", tipo: "data" },
        { chave: "prazo", rotulo: "Prazo de entrega", tipo: "data" },
        { chave: "entregaveis", rotulo: "Entregáveis", tipo: "textarea", largo: true, placeholder: "Ex: 2 reels + 3 stories" },
        { chave: "observacoes", rotulo: "Observações", tipo: "textarea", largo: true },
      ],
      valores: proposta
        ? { ...proposta, valor: proposta.valor !== null && proposta.valor !== undefined ? String(proposta.valor).replace(".", ",") : "" }
        : { status: "rascunho" },
      aoSalvar: async (dados) => {
        if (Dados.semBanco) { avisoSemBanco(); return false; }
        const r = await Dados.salvarProposta({ ...dados, id: proposta?.id });
        if (!r.ok) { toast(`Não consegui salvar: ${r.erro}`, "erro"); return false; }
        toast("Proposta salva!", "sucesso");
        await carregar();
        return true;
      },
    });
  }

  function desenhar() {
    const soma = (lista) => lista.reduce((t, p) => t + Number(p.valor || 0), 0);
    const por = (...st) => propostas.filter((p) => st.includes(p.status));
    const abertas = por("enviada", "negociando"), fechadas = por("aceita", "paga"), recusadas = por("recusada");
    const decididas = fechadas.length + recusadas.length;
    const cartao = (emoji, rotulo, valor, detalhe, destaque) => h("div", { class: `cartao cartao-visao${destaque ? " destaque" : ""}` },
      h("span", { class: "rotulo" }, `${emoji} ${rotulo}`), h("div", { class: "valor" }, valor), h("div", { class: "detalhe" }, detalhe));
    resumo.replaceChildren(
      cartao("📤", "Em aberto", reais(soma(abertas)), `${abertas.length} enviada(s) ou negociando`),
      cartao("🤝", "Fechadas", reais(soma(fechadas)), `${fechadas.length} aceita(s) ou paga(s)`, true),
      cartao("💰", "Recebido", reais(soma(por("paga"))), `${por("paga").length} paga(s)`),
      cartao("🎯", "Taxa de aceite", decididas ? `${Math.round((fechadas.length / decididas) * 100)}%` : "-", "das propostas já respondidas"),
    );

    pilulas.replaceChildren(...[["", `Todas (${propostas.length})`], ...Object.entries(STATUS_PROPOSTA).map(([s, t]) => [s, `${t} (${por(s).length})`])]
      .map(([s, t]) => h("button", {
        type: "button", class: `pilula${filtro.status === s ? " ativa" : ""}`, "aria-pressed": String(filtro.status === s),
        onclick: () => { filtro.status = s; desenhar(); },
      }, t)));

    if (!propostas.length) {
      corpo.replaceChildren(estadoVazioSimples("enviar", "Nenhuma proposta ainda",
        marcas.length ? "Registre as propostas que você manda pras marcas e acompanhe até o pagamento." : "Primeiro cadastre uma marca na aba Marcas, depois registre as propostas aqui."));
      return;
    }
    const nomeMarca = new Map(marcas.map((m) => [m.id, m.nome]));
    const hoje = new Date().toISOString().slice(0, 10);
    const visiveis = propostas.filter((p) => !filtro.status || p.status === filtro.status);
    corpo.replaceChildren(visiveis.length
      ? h("div", { class: "planilha" }, h("table", {},
        h("colgroup", {}, [26, 16, 13, 15, 11, 11, 8].map((w) => h("col", { style: `width:${w}%` }))),
        h("thead", {}, h("tr", {}, ["Proposta", "Marca", "Valor", "Status", "Enviada", "Prazo", ""].map((t) => h("th", { scope: "col" }, h("span", { class: "ordenar", style: "cursor:default" }, t))))),
        h("tbody", {}, visiveis.map((p) => {
          const atrasada = p.prazo && p.prazo < hoje && !["paga", "recusada"].includes(p.status);
          return h("tr", {},
            h("td", { "data-rotulo": "Proposta", title: p.entregaveis || p.titulo }, h("strong", {}, p.titulo)),
            h("td", { "data-rotulo": "Marca" }, nomeMarca.get(p.marca_id) || "-"),
            h("td", { "data-rotulo": "Valor" }, reais(p.valor)),
            h("td", { "data-rotulo": "Status" }, h("select", {
              class: `campo campo-mini selo-select selo-${p.status}`, "aria-label": `Status de ${p.titulo}`,
              onchange: async (e) => {
                if (Dados.semBanco) { avisoSemBanco(); e.target.value = p.status; return; }
                const novo = e.target.value;
                if ((await Dados.salvarProposta({ id: p.id, status: novo })).ok) { p.status = novo; toast(`Status: ${STATUS_PROPOSTA[novo]}.`); desenhar(); }
                else { e.target.value = p.status; toast("Não consegui mudar o status.", "erro"); }
              },
            }, Object.entries(STATUS_PROPOSTA).map(([v, t]) => h("option", { value: v, selected: v === p.status }, t)))),
            h("td", { "data-rotulo": "Enviada" }, dataBR(p.enviada_em)),
            h("td", { "data-rotulo": "Prazo", class: atrasada ? "atrasada" : null, title: atrasada ? "Prazo passou" : null }, dataBR(p.prazo)),
            h("td", { "data-rotulo": "Ações" }, h("div", { class: "acoes-linha" },
              h("button", { class: "btn btn-fantasma btn-icone btn-mini", type: "button", title: "Editar", "aria-label": `Editar ${p.titulo}`, onclick: () => editar(p) }, icone("lapis")),
              h("button", {
                class: "btn btn-fantasma btn-icone btn-mini btn-perigo", type: "button", title: "Apagar", "aria-label": `Apagar ${p.titulo}`,
                onclick: async () => {
                  if (!confirm(`Apagar a proposta "${p.titulo}"?`)) return;
                  if (await Dados.apagarProposta(p.id)) { toast("Proposta apagada."); carregar(); } else toast("Não consegui apagar.", "erro");
                },
              }, icone("lixo")))));
        }))))
      : h("p", { class: "carregando" }, "Nenhuma proposta com esse status."));
  }
}

// ---------- Automações (lista) ----------
async function telaAutomacoes(area) {
  const lista = h("div", { class: "lista" }, h("p", { class: "carregando" }, "Carregando..."));
  const contagem = h("span", { class: "contagem-autos" });
  const abrir = (auto) => Editor.abrir(auto, { aoSalvar: () => recarregar() });

  area.append(...[
    h("div", { class: "barra-autos" },
      contagem,
      h("div", { class: "acoes-autos" },
        h("button", { class: "btn btn-claro", type: "button", onclick: () => abrirMidia() }, "🖼️ Mídia"),
        h("button", { class: "btn btn-primario", type: "button", onclick: () => abrir(null) }, "+ Nova automação"))),
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
    const ativas = autos.filter((a) => a.active).length;
    contagem.textContent = `${autos.length} ${autos.length === 1 ? "automação" : "automações"} · ${ativas} ${ativas === 1 ? "ativa" : "ativas"}`;
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
    ? [h("span", { class: "chip chip-neutro" }, "qualquer palavra")]
    : (a.keyword || "").split(",").map((s) => s.trim()).filter(Boolean).map((k) => h("span", { class: "chip chip-palavra-auto" }, k));
  const n = a.media_ids?.length || 0;
  const qtdPosts = n ? `${n} ${n === 1 ? "post" : "posts"}` : "todos os posts";

  // Pra onde o botão leva: o link, a conversa ou nada
  const passos = a.flow?.steps || [];
  const link = passos.flatMap((s) => s.buttons || []).find((b) => b.url)?.url;
  const destino = link
    ? h("a", { class: "destino-auto", href: link, target: "_blank", rel: "noopener", title: link }, "🔗 ", link.replace(/^https?:\/\/(www\.)?/i, ""))
    : passos.length > 1
      ? h("span", { class: "destino-auto" }, `💬 conversa com ${passos.length} mensagens`)
      : h("span", { class: "destino-auto mudo" }, "🔗 (sem link)");

  const item = h("div", { class: `cartao item-auto${a.active ? "" : " desligada"}` });
  const chave = h("label", { class: "chave chave-verde", title: "Ligar ou desligar" },
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
    h("div", { class: "info" },
      h("div", { class: "linha-titulo-auto" }, h("h3", {}, a.nome || "Sem nome"), h("span", { class: "chip chip-gatilho" }, "💬 Comentário")),
      h("div", { class: "linha-palavras" }, palavras, h("span", { class: "posts-auto" }, `· ${qtdPosts}`)),
      destino),
    h("div", { class: "acoes" },
      chave,
      h("button", { class: "btn btn-editar", type: "button", "aria-label": `Editar ${a.nome || "automação"}`, onclick: () => abrir(a) }, "Editar"),
      h("button", {
        class: "btn btn-icone btn-lixo", title: "Apagar", "aria-label": `Apagar ${a.nome || "automação"}`,
        onclick: async () => {
          if (!confirm(`Apagar a automação "${a.nome}"? Isso não tem volta.`)) return;
          if (await Dados.apagarAutomacao(a.id)) { toast("Automação apagada."); recarregar(); }
          else toast("Não consegui apagar. Tente de novo.", "erro");
        },
      }, icone("lixo"))),
  );
  return item;
}

// ---------- Mídia: a biblioteca de arquivos (PDF, áudio, foto, vídeo) ----------
const TIPO_ARQUIVO = { image: ["🖼️", "foto"], audio: ["🎧", "áudio"], video: ["🎬", "vídeo"], file: ["📄", "arquivo"] };
const tamanho = (b) => (!b ? "" : b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`);

function abrirMidia() {
  const lista = h("div", { class: "lista-midia" }, h("p", { class: "carregando" }, "Carregando..."));
  const input = h("input", {
    type: "file", hidden: true, accept: "image/*,audio/*,video/*,application/pdf",
    onchange: async (e) => {
      const f = e.target.files[0];
      e.target.value = "";
      if (!f) return;
      enviar.disabled = true;
      enviar.textContent = "Enviando...";
      const r = await Dados.enviarArquivo(f);
      enviar.disabled = false;
      enviar.textContent = "+ Enviar arquivo";
      if (r.ok) toast("Arquivo adicionado.", "sucesso"); else toast(r.erro, "erro");
      carregar();
    },
  });
  const enviar = h("button", {
    class: "btn btn-primario", type: "button",
    onclick: () => (Dados.semBanco ? avisoSemBanco() : input.click()),
  }, "+ Enviar arquivo");
  const fechar = () => { fundo.remove(); document.removeEventListener("keydown", aoTeclar); };
  const aoTeclar = (e) => { if (e.key === "Escape") fechar(); };
  const janela = h("div", { class: "modal cartao", role: "dialog", "aria-modal": "true", "aria-label": "Mídia" },
    h("div", { class: "modal-topo" },
      h("div", {}, h("h2", {}, "🖼️ Mídia"), h("p", { class: "sub", style: "margin:2px 0 0" }, "Arquivos pra mandar junto com as mensagens: PDF, áudio, foto ou vídeo.")),
      h("button", { class: "btn btn-fantasma btn-icone", type: "button", "aria-label": "Fechar", onclick: fechar }, icone("x"))),
    lista,
    h("div", { class: "modal-acoes" }, input, enviar));
  const fundo = h("div", { class: "modal-fundo", onmousedown: (e) => { if (e.target === fundo) fechar(); } }, janela);
  document.body.append(fundo);
  document.addEventListener("keydown", aoTeclar);
  carregar();

  async function carregar() {
    const arquivos = await Dados.arquivos();
    if (!arquivos.length) {
      lista.replaceChildren(estadoVazioSimples("imagem", "Sua biblioteca está vazia",
        Dados.semBanco ? "A biblioteca funciona no painel publicado." : "Envie um PDF, áudio, foto ou vídeo pra usar nas automações."));
      return;
    }
    lista.replaceChildren(...arquivos.map((a) => {
      const [emoji, nome] = TIPO_ARQUIVO[a.tipo] || TIPO_ARQUIVO.file;
      return h("div", { class: "item-midia" },
        h("span", { class: "emoji-midia", "aria-hidden": "true" }, emoji),
        h("div", { class: "info-midia" },
          h("strong", { title: a.nome }, a.nome),
          h("span", {}, [nome, tamanho(a.size_bytes), a.created_at ? new Date(a.created_at).toLocaleDateString("pt-BR") : ""].filter(Boolean).join(" · "))),
        h("a", { class: "btn btn-pequeno", href: a.public_url, target: "_blank", rel: "noopener" }, "Abrir"),
        h("button", {
          class: "btn btn-icone btn-lixo", type: "button", title: "Apagar", "aria-label": `Apagar ${a.nome}`,
          onclick: async () => {
            if (!confirm(`Apagar "${a.nome}"? As automações que usam esse arquivo deixam de enviar ele.`)) return;
            if (await Dados.apagarArquivo(a)) { toast("Arquivo apagado."); carregar(); } else toast("Não consegui apagar.", "erro");
          },
        }, icone("lixo")));
    }));
  }
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
      h("div", {}, h("h2", {}, "Seus leads"), h("p", { class: "sub" }, "Todo mundo que já falou com as suas automações")),
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

// ---------------------------------------------------------------------
// FOCOS E METAS (sub-abas: Planejamento, Metas do Ano, Mural dos Sonhos, Calendário)
// ---------------------------------------------------------------------
const linkSeguro = (v) => (/^https?:\/\//i.test(v) ? v : `https://${v}`);
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const DIAS_SEMANA = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const chaveMes = (d) => iso(d).slice(0, 7);
const inicioDoMes = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1);
let mesFocos = inicioDoMes(); // mês que aparece no Planejamento e no Calendário
let anoMetas = new Date().getFullYear();

// Semanas (segunda a domingo) que cobrem o mês: [[7 datas], [7 datas], ...]
function semanasDoMes(primeiro) {
  const ultimo = new Date(primeiro.getFullYear(), primeiro.getMonth() + 1, 0);
  const recuo = (primeiro.getDay() + 6) % 7;
  const semanas = [];
  for (let s = new Date(primeiro.getFullYear(), primeiro.getMonth(), 1 - recuo); s <= ultimo; s = new Date(s.getFullYear(), s.getMonth(), s.getDate() + 7)) {
    semanas.push(Array.from({ length: 7 }, (_, i) => new Date(s.getFullYear(), s.getMonth(), s.getDate() + i)));
  }
  return semanas;
}

// "Hoje  <  >  Outubro 2026"
function navegadorMes(aoMudar) {
  const mudar = (d) => { mesFocos = d; aoMudar(); };
  const nome = MESES[mesFocos.getMonth()];
  return h("div", { class: "plan-nav" },
    h("button", { class: "btn plan-hoje", type: "button", onclick: () => mudar(inicioDoMes()) }, "Hoje"),
    h("button", { class: "btn btn-fantasma btn-icone", type: "button", "aria-label": "Mês anterior", onclick: () => mudar(new Date(mesFocos.getFullYear(), mesFocos.getMonth() - 1, 1)) }, icone("esquerda")),
    h("button", { class: "btn btn-fantasma btn-icone", type: "button", "aria-label": "Próximo mês", onclick: () => mudar(new Date(mesFocos.getFullYear(), mesFocos.getMonth() + 1, 1)) }, icone("direita")),
    h("h2", {}, `${nome[0].toUpperCase()}${nome.slice(1)} ${mesFocos.getFullYear()}`));
}

// Salva e avisa se der erro. Devolve true/false.
async function salvarOuAvisar(tabela, linha) {
  if (Dados.semBanco) { avisoSemBanco(); return false; }
  const r = await Dados.salvarLinha(tabela, linha);
  if (!r.ok) toast(`Não consegui salvar: ${r.erro}`, "erro");
  return r.ok;
}

function telaFocos(p, sub) {
  const ABAS = {
    planejamento: ["Planejamento", "calendario", telaPlanejamento],
    metas: ["Metas do Ano", "alvo", telaMetas],
    mural: ["Mural dos Sonhos", "brilho", telaMural],
    calendario: ["Calendário", "calendario", telaCalendarioFocos],
  };
  const aba = ABAS[sub] ? sub : "planejamento";
  const area = h("div");
  p.append(
    h("div", { class: "abas-pilula-barra" },
      h("nav", { class: "abas-pilula", "aria-label": "Seções de Focos e metas" },
        Object.entries(ABAS).map(([chave, [titulo, ic]]) =>
          h("a", { href: `#focos/${chave}`, class: aba === chave ? "ativo" : "", "aria-current": aba === chave ? "page" : null }, icone(ic), titulo))),
      h("button", {
        class: "btn btn-google", type: "button",
        onclick: () => toast("A conexão com o Google Agenda ainda não está ativa. Em breve!"),
      }, icone("calendario"), "Conectar Google Calendar")),
    area,
  );
  ABAS[aba][2](area);
}

// ---------- Planejamento ----------
async function telaPlanejamento(area) {
  let plano = null, tarefas = [], habitos = [];
  const abertas = new Set();
  let abrirAtual = true;  // na primeira vez, abre a semana de hoje
  let focarDia = null;    // depois de adicionar tarefa, volta o cursor pro mesmo dia
  const caixa = h("div");
  area.append(caixa);
  await carregar();

  async function carregar() {
    const mes = chaveMes(mesFocos);
    const semanas = semanasDoMes(mesFocos);
    const de = iso(semanas[0][0]), ate = iso(semanas.at(-1)[6]);
    [plano, tarefas, habitos] = await Promise.all([
      Dados.planMes(mes),
      Dados.lista("plan_tarefas", (c) => c.gte("data", de).lte("data", ate).order("created_at")),
      Dados.lista("plan_habitos", (c) => c.eq("mes", mes).order("created_at")),
    ]);
    plano.top3 = [0, 1, 2].map((i) => (Array.isArray(plano.top3) ? plano.top3[i] : "") || "");
    desenhar();
  }

  async function salvarPlano() {
    if (Dados.semBanco) { avisoSemBanco(); return; }
    const r = await Dados.salvarPlanMes({ mes: plano.mes, foco: plano.foco || null, top3: plano.top3 });
    if (!r.ok) toast(`Não consegui salvar: ${r.erro}`, "erro");
  }

  function desenhar() {
    const mes = chaveMes(mesFocos);
    const hoje = new Date();
    const hojeIso = iso(hoje);
    const doMes = tarefas.filter((t) => String(t.data).startsWith(mes));
    const feitas = doMes.filter((t) => t.feita).length;
    const pct = doMes.length ? Math.round((feitas / doMes.length) * 100) : 0;
    const diasNoMes = new Date(mesFocos.getFullYear(), mesFocos.getMonth() + 1, 0).getDate();
    const ehMesAtual = chaveMes(hoje) === mes;

    const novoHabito = () => abrirFormulario({
      titulo: "Novo hábito",
      campos: [{ chave: "nome", rotulo: "Hábito", obrigatorio: true, placeholder: "Ex: Gravar 1 vídeo por dia", largo: true }],
      textoSalvar: "Criar",
      aoSalvar: async (d) => { if (!(await salvarOuAvisar("plan_habitos", { mes, nome: d.nome, dias: [] }))) return false; await carregar(); return true; },
    });

    const cartaoFoco = h("div", { class: "cartao plan-cartao" },
      h("h3", { class: "plan-rotulo" }, "Foco do mês"),
      h("label", { class: "plan-foco" }, h("span", { "aria-hidden": "true" }, "✨"),
        h("input", {
          class: "plan-campo", value: plano.foco || "", placeholder: "Qual é o foco?", "aria-label": "Foco do mês",
          onchange: (e) => { plano.foco = e.target.value.trim(); salvarPlano(); },
        })));

    const cartaoProgresso = h("div", { class: "cartao plan-cartao" },
      h("h3", { class: "plan-rotulo" }, "Progresso do mês"),
      h("div", { class: "plan-progresso" }, h("strong", {}, `${pct}%`), h("span", {}, `${feitas}/${doMes.length} tarefas`)),
      h("div", { class: "plan-barra", role: "progressbar", "aria-valuenow": pct, "aria-valuemin": 0, "aria-valuemax": 100 },
        h("span", { style: `width:${pct}%` })));

    const cartaoHabitos = h("div", { class: "cartao plan-cartao" },
      h("div", { class: "plan-rotulo-linha" }, h("h3", { class: "plan-rotulo" }, "Hábitos do mês"),
        h("button", { class: "btn btn-fantasma btn-icone btn-mini", type: "button", "aria-label": "Novo hábito", onclick: novoHabito }, icone("mais"))),
      habitos.length
        ? h("ul", { class: "plan-habitos" }, habitos.map((hb) => {
          const dias = Array.isArray(hb.dias) ? hb.dias : [];
          const feitoHoje = ehMesAtual && dias.includes(hoje.getDate());
          return h("li", {},
            ehMesAtual ? h("button", {
              class: `plan-check${feitoHoje ? " marcado" : ""}`, type: "button", "aria-pressed": String(feitoHoje),
              title: feitoHoje ? "Feito hoje (clique pra desmarcar)" : "Marcar como feito hoje", "aria-label": `${hb.nome}: feito hoje`,
              onclick: async () => {
                const novos = feitoHoje ? dias.filter((d) => d !== hoje.getDate()) : [...dias, hoje.getDate()].sort((a, b) => a - b);
                if (await salvarOuAvisar("plan_habitos", { id: hb.id, dias: novos })) { hb.dias = novos; desenhar(); }
              },
            }, icone("check")) : null,
            h("span", { class: "plan-habito-nome" }, hb.nome),
            h("span", { class: "plan-habito-dias", title: "Dias feitos neste mês" }, `${dias.length}/${diasNoMes}`),
            h("button", {
              class: "btn btn-fantasma btn-icone btn-mini btn-perigo plan-apagar", type: "button", "aria-label": `Apagar hábito ${hb.nome}`,
              onclick: async () => {
                if (!confirm(`Apagar o hábito "${hb.nome}"?`)) return;
                if (await Dados.apagarLinha("plan_habitos", hb.id)) carregar(); else toast("Não consegui apagar.", "erro");
              },
            }, icone("x")));
        }))
        : h("button", { class: "plan-link", type: "button", onclick: novoHabito }, "+ Criar primeiro hábito"));

    const cartaoTop3 = h("div", { class: "cartao plan-cartao" },
      h("h3", { class: "plan-rotulo" }, "Top 3 do mês"),
      h("ol", { class: "plan-top3" }, plano.top3.map((v, i) => h("li", {},
        h("span", { class: "plan-num" }, String(i + 1)),
        h("input", {
          class: "plan-campo", value: v, placeholder: `Prioridade ${i + 1}`, "aria-label": `Prioridade ${i + 1}`,
          onchange: (e) => { plano.top3[i] = e.target.value.trim(); salvarPlano(); },
        })))));

    const semanas = semanasDoMes(mesFocos);
    const listaSemanas = semanas.map((dias, i) => {
      const atual = dias.some((d) => iso(d) === hojeIso);
      if (abrirAtual && atual) abertas.add(i);
      const aberta = abertas.has(i);
      const daSemana = tarefas.filter((t) => t.data >= iso(dias[0]) && t.data <= iso(dias[6]));
      const fim = dias[6];
      return h("div", { class: `plan-semana${atual ? " atual" : ""}${aberta ? " aberta" : ""}` },
        h("button", {
          class: "plan-semana-topo", type: "button", "aria-expanded": String(aberta),
          onclick: () => { aberta ? abertas.delete(i) : abertas.add(i); desenhar(); },
        },
          h("strong", {}, `Semana ${i + 1}`),
          atual ? h("span", { class: "plan-atual" }, "Atual") : null,
          h("span", { class: "plan-intervalo" }, `${dias[0].getDate()} - ${fim.getDate()} de ${MESES[fim.getMonth()].slice(0, 3)}`),
          daSemana.length ? h("span", { class: "plan-contagem" }, `${daSemana.filter((t) => t.feita).length}/${daSemana.length}`) : null,
          icone("baixo")),
        aberta ? h("div", { class: "plan-dias" }, dias.map((d, j) => diaDaSemana(d, j, mes, hojeIso))) : null);
    });
    abrirAtual = false;

    caixa.replaceChildren(
      h("div", { class: "plan-cartoes" }, cartaoFoco, cartaoProgresso, cartaoHabitos, cartaoTop3),
      navegadorMes(() => { abertas.clear(); abrirAtual = true; carregar(); }),
      h("div", { class: "plan-semanas" }, listaSemanas));

    if (focarDia) { caixa.querySelector(`input[data-dia="${focarDia}"]`)?.focus(); focarDia = null; }
  }

  function diaDaSemana(d, j, mes, hojeIso) {
    const dia = iso(d);
    const doDia = tarefas.filter((t) => t.data === dia);
    return h("div", { class: `plan-dia${chaveMes(d) !== mes ? " fora" : ""}${dia === hojeIso ? " hoje" : ""}` },
      h("div", { class: "plan-dia-topo" }, h("span", {}, DIAS_SEMANA[j]), h("strong", {}, String(d.getDate()))),
      h("ul", { class: "plan-tarefas" }, doDia.map((t) => h("li", { class: t.feita ? "feita" : "" },
        h("input", {
          type: "checkbox", checked: !!t.feita, "aria-label": t.titulo,
          onchange: async (e) => {
            const feita = e.target.checked;
            if (await salvarOuAvisar("plan_tarefas", { id: t.id, feita })) { t.feita = feita; desenhar(); } else e.target.checked = !feita;
          },
        }),
        h("span", {}, t.titulo),
        h("button", {
          class: "plan-apagar", type: "button", "aria-label": `Apagar ${t.titulo}`,
          onclick: async () => { if (await Dados.apagarLinha("plan_tarefas", t.id)) carregar(); else toast("Não consegui apagar.", "erro"); },
        }, icone("x"))))),
      h("input", {
        class: "plan-nova", placeholder: "+ Tarefa", "data-dia": dia, "aria-label": `Nova tarefa em ${dataBR(dia)}`,
        onkeydown: async (e) => {
          if (e.key !== "Enter" || !e.target.value.trim()) return;
          const titulo = e.target.value.trim();
          e.target.disabled = true;
          if (await salvarOuAvisar("plan_tarefas", { data: dia, titulo })) { focarDia = dia; await carregar(); }
          else e.target.disabled = false;
        },
      }));
  }
}

// ---------- Calendário (mês inteiro: tarefas, campanhas, follow-ups e vencimentos) ----------
const TIPOS_CAL = {
  campanha: ["Campanhas", "Campanha"],
  tarefa: ["Tarefas", "Tarefa"],
  followup: ["Follow-ups", "Follow-up"],
  vencimento: ["Vencimentos", "Vencimento"],
};
const DIAS_DOMINGO = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
const tiposVisiveis = new Set(Object.keys(TIPOS_CAL)); // filtro da legenda (lembra enquanto o painel está aberto)

async function telaCalendarioFocos(area) {
  let dias = [], itens = [];
  const caixa = h("div");
  area.append(caixa);
  await carregar();

  async function carregar() {
    const y = mesFocos.getFullYear(), m = mesFocos.getMonth();
    const inicio = new Date(y, m, 1 - mesFocos.getDay());
    const ultimo = new Date(y, m + 1, 0);
    const fim = new Date(y, m + 1, 6 - ultimo.getDay());
    dias = [];
    for (let d = inicio; d <= fim; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) dias.push(d);
    const de = iso(inicio), ate = iso(fim);
    const [tarefas, eventos, propostas] = await Promise.all([
      Dados.lista("plan_tarefas", (c) => c.gte("data", de).lte("data", ate).order("created_at")),
      Dados.lista("cal_eventos", (c) => c.gte("data", de).lte("data", ate).order("created_at")),
      Dados.lista("propostas", (c) => c.gte("prazo", de).lte("prazo", ate)),
    ]);
    itens = [
      ...eventos.filter((e) => e.tipo === "campanha").map((e) => ({ ...e, tabela: "cal_eventos" })),
      ...tarefas.map((t) => ({ ...t, tipo: "tarefa", tabela: "plan_tarefas" })),
      ...eventos.filter((e) => e.tipo !== "campanha").map((e) => ({ ...e, tabela: "cal_eventos" })),
      // Prazo das propostas entra sozinho como vencimento (apaga lá na aba Propostas).
      ...propostas.map((p) => ({ tipo: "vencimento", data: String(p.prazo).slice(0, 10), titulo: `Prazo: ${p.titulo}` })),
    ];
    desenhar();
  }

  function adicionar(dia) {
    abrirFormulario({
      titulo: `Novo em ${dataBR(dia)}`,
      campos: [
        { chave: "titulo", rotulo: "Título", obrigatorio: true, largo: true, placeholder: "Ex: Entregar vídeo da marca X" },
        { chave: "tipo", rotulo: "Tipo", tipo: "select", opcoes: Object.entries(TIPOS_CAL).map(([k, [, um]]) => [k, um]) },
      ],
      valores: { tipo: "tarefa" },
      textoSalvar: "Adicionar",
      aoSalvar: async (v) => {
        const ok = v.tipo === "tarefa"
          ? await salvarOuAvisar("plan_tarefas", { data: dia, titulo: v.titulo })
          : await salvarOuAvisar("cal_eventos", { data: dia, tipo: v.tipo, titulo: v.titulo });
        if (!ok) return false;
        await carregar();
        return true;
      },
    });
  }

  function desenhar() {
    const mes = chaveMes(mesFocos), hojeIso = iso(new Date());
    const nome = MESES[mesFocos.getMonth()];
    const mudar = (delta) => { mesFocos = new Date(mesFocos.getFullYear(), mesFocos.getMonth() + delta, 1); carregar(); };
    caixa.replaceChildren(
      h("div", { class: "cal-legenda", role: "group", "aria-label": "Mostrar no calendário" },
        Object.entries(TIPOS_CAL).map(([tipo, [rotulo]]) => h("button", {
          type: "button", class: `cal-filtro${tiposVisiveis.has(tipo) ? "" : " desligado"}`, "aria-pressed": String(tiposVisiveis.has(tipo)),
          onclick: () => { tiposVisiveis.has(tipo) ? tiposVisiveis.delete(tipo) : tiposVisiveis.add(tipo); desenhar(); },
        }, h("span", { class: `cal-ponto cal-${tipo}` }), rotulo))),
      h("div", { class: "cartao cal-cartao" },
        h("div", { class: "cal-topo" },
          h("button", { class: "btn btn-fantasma btn-icone btn-mini", type: "button", "aria-label": "Mês anterior", onclick: () => mudar(-1) }, icone("esquerda")),
          h("h2", {}, `${nome[0].toUpperCase()}${nome.slice(1)} ${mesFocos.getFullYear()}`),
          h("button", { class: "btn btn-fantasma btn-icone btn-mini", type: "button", "aria-label": "Próximo mês", onclick: () => mudar(1) }, icone("direita"))),
        h("div", { class: "cal-grade" },
          DIAS_DOMINGO.map((d) => h("div", { class: "cal-cab" }, d)),
          dias.map((d) => {
            const dia = iso(d);
            const doDia = itens.filter((i) => i.data === dia && tiposVisiveis.has(i.tipo));
            return h("div", {
              class: `cal-dia${chaveMes(d) !== mes ? " fora" : ""}${dia === hojeIso ? " hoje" : ""}`,
              onclick: (e) => { if (!e.target.closest("button, .cal-evento")) adicionar(dia); },
            },
              h("div", { class: "cal-dia-topo" },
                h("span", { class: "cal-num" }, String(d.getDate())),
                h("button", { class: "cal-add", type: "button", "aria-label": `Adicionar em ${dataBR(dia)}`, onclick: () => adicionar(dia) }, icone("mais"))),
              doDia.slice(0, 3).map((i) => h("span", { class: `cal-evento cal-${i.tipo}${i.feita ? " feita" : ""}`, title: i.titulo },
                h("span", { class: "cal-evento-texto" }, i.titulo),
                i.tabela ? h("button", {
                  class: "cal-apagar", type: "button", "aria-label": `Apagar ${i.titulo}`,
                  onclick: async () => {
                    if (!confirm(`Apagar "${i.titulo}"?`)) return;
                    if (await Dados.apagarLinha(i.tabela, i.id)) carregar(); else toast("Não consegui apagar.", "erro");
                  },
                }, icone("x")) : null)),
              doDia.length > 3 ? h("span", { class: "cal-mais" }, `+${doDia.length - 3}`) : null);
          }))));
  }
}

// ---------- Metas do Ano ----------
const CATEGORIAS_PADRAO = [
  { nome: "Saúde", emoji: "💪" },
  { nome: "Trabalho", emoji: "💼" },
  { nome: "Dinheiro", emoji: "💰" },
  { nome: "Relacionamento", emoji: "❤️" },
];
// Padrão + as que você criou (meta_categorias).
const juntarCategorias = (criadas) => [...CATEGORIAS_PADRAO, ...criadas.filter((c) => !CATEGORIAS_PADRAO.some((p) => p.nome === c.nome))];
const emojiDe = (nome, categorias) => categorias.find((c) => c.nome === nome)?.emoji || "🎯";

// Janela base das Metas (cabeçalho, corpo com rolagem e rodapé). lateral = abre do lado direito.
function janelaMeta({ titulo, iconeTopo, lateral, extraTopo }) {
  const corpo = h("div", { class: "jm-corpo" });
  const rodape = h("div", { class: "jm-rodape" });
  const fechar = () => { fundo.remove(); document.removeEventListener("keydown", aoTeclar); };
  const aoTeclar = (e) => { if (e.key === "Escape") fechar(); };
  const caixa = h("div", { class: `jm${lateral ? " jm-lateral" : ""}`, role: "dialog", "aria-modal": "true", "aria-label": titulo },
    h("div", { class: "jm-topo" },
      iconeTopo,
      h("h2", {}, titulo),
      extraTopo || null,
      h("button", { class: "btn btn-fantasma btn-icone jm-fechar", type: "button", "aria-label": "Fechar", onclick: fechar }, icone("x"))),
    corpo, rodape);
  const fundo = h("div", { class: `jm-fundo${lateral ? " jm-fundo-lateral" : ""}`, onmousedown: (e) => { if (e.target === fundo) fechar(); } }, caixa);
  document.body.append(fundo);
  document.addEventListener("keydown", aoTeclar);
  return { corpo, rodape, fechar, caixa };
}

// Grade de categorias em botões, com "+ Criar categoria".
function escolhaCategoria(lerCategorias, atual, aoEscolher, aoCriar) {
  const grade = h("div", { class: "jm-categorias", role: "radiogroup", "aria-label": "Categoria" });
  let escolhida = atual;
  const desenhar = () => {
    const criando = h("div", { class: "jm-nova-cat", hidden: true },
      h("input", { class: "campo jm-emoji", maxlength: 4, placeholder: "🎯", "aria-label": "Emoji da categoria" }),
      h("input", { class: "campo", placeholder: "Nome da categoria", "aria-label": "Nome da categoria" }),
      h("button", {
        class: "btn btn-primario btn-pequeno", type: "button",
        onclick: async () => {
          const [emoji, nome] = [...criando.querySelectorAll("input")].map((i) => i.value.trim());
          if (!nome) return;
          if (lerCategorias().some((c) => c.nome.toLowerCase() === nome.toLowerCase())) { toast("Essa categoria já existe."); return; }
          if (!(await aoCriar({ nome, emoji: emoji || "🎯" }))) return;
          escolhida = nome; aoEscolher(nome); desenhar();
        },
      }, "Criar"));
    grade.replaceChildren(
      ...lerCategorias().map((c) => h("button", {
        type: "button", role: "radio", class: `jm-cat${escolhida === c.nome ? " ativa" : ""}`, "aria-checked": String(escolhida === c.nome),
        onclick: () => { escolhida = c.nome; aoEscolher(c.nome); desenhar(); },
      }, h("span", { class: "jm-cat-emoji", "aria-hidden": "true" }, c.emoji || "🎯"), h("span", {}, c.nome))),
      h("button", {
        type: "button", class: "jm-cat jm-cat-criar",
        onclick: () => { criando.hidden = false; criando.querySelectorAll("input")[1].focus(); },
      }, icone("mais"), h("span", {}, "Criar categoria")),
      criando);
  };
  desenhar();
  return grade;
}

// Campo de prazo em pílula ("Definir prazo").
function campoPrazo(valor, aoMudar, id) {
  return h("label", { class: "jm-prazo" }, icone("calendario"),
    h("input", { type: "date", id, value: valor || "", "aria-label": "Prazo final", oninput: (e) => aoMudar(e.target.value) }));
}

async function telaMetas(area) {
  let metas = [], categorias = CATEGORIAS_PADRAO;
  const caixa = h("div");
  area.append(caixa);
  await carregar();

  async function carregar() {
    let criadas;
    [metas, criadas] = await Promise.all([
      Dados.lista("metas_ano", (c) => c.eq("ano", anoMetas).order("created_at")),
      Dados.lista("meta_categorias", (c) => c.order("created_at")),
    ]);
    categorias = juntarCategorias(criadas);
    desenhar();
  }

  async function criarCategoria(cat) {
    if (!(await salvarOuAvisar("meta_categorias", cat))) return false;
    categorias = juntarCategorias([...categorias, cat]);
    return true;
  }

  // ----- Nova Meta / Editar (painel lateral) -----
  function editar(meta) {
    const d = {
      categoria: meta?.categoria || "", titulo: meta?.titulo || "", primeiro_passo: meta?.primeiro_passo || "",
      prazo: meta?.prazo ? String(meta.prazo).slice(0, 10) : "", progresso: meta?.progresso ?? 0,
    };
    const j = janelaMeta({ titulo: meta ? "Editar Meta" : "Nova Meta", iconeTopo: h("span", { class: "jm-icone" }, icone("alvo")), lateral: true });
    const salvar = h("button", { class: "btn btn-primario jm-principal", type: "button", disabled: true }, meta ? "Salvar Meta" : "Adicionar Meta");
    const conferir = () => { salvar.disabled = !(d.categoria && d.titulo.trim() && d.primeiro_passo.trim()); };
    const rotulo = (texto, para, obrigatorio) => h("label", { class: "jm-rotulo", for: para }, texto, obrigatorio ? " *" : "");
    const progresso = h("span", { class: "jm-progresso-valor" }, `${d.progresso}%`);

    j.corpo.append(h("div", {}, // h() ignora o null (o campo de progresso só aparece ao editar)
      h("div", { class: "jm-grupo" }, h("span", { class: "jm-rotulo" }, "Categoria *"),
        escolhaCategoria(() => categorias, d.categoria, (c) => { d.categoria = c; conferir(); }, criarCategoria)),
      h("div", { class: "jm-grupo" }, rotulo("Nome da Meta", "jm-nome", true),
        h("input", { class: "campo jm-campo", id: "jm-nome", value: d.titulo, placeholder: "Ex: Atingir 50 mil seguidores", oninput: (e) => { d.titulo = e.target.value; conferir(); } })),
      h("div", { class: "jm-grupo" }, rotulo("Primeiro passo", "jm-passo", true),
        h("input", { class: "campo jm-campo", id: "jm-passo", value: d.primeiro_passo, placeholder: "Qual a primeira ação concreta pra isso acontecer?", oninput: (e) => { d.primeiro_passo = e.target.value; conferir(); } })),
      h("div", { class: "jm-grupo" }, rotulo("Prazo final (opcional)", "jm-prazo"), campoPrazo(d.prazo, (v) => { d.prazo = v; }, "jm-prazo")),
      meta ? h("div", { class: "jm-grupo" }, h("label", { class: "jm-rotulo", for: "jm-progresso" }, "Progresso ", progresso),
        h("input", {
          type: "range", id: "jm-progresso", class: "jm-range", min: 0, max: 100, step: 5, value: d.progresso,
          oninput: (e) => { d.progresso = Number(e.target.value); progresso.textContent = `${d.progresso}%`; },
        })) : null));
    j.rodape.append(h("button", { class: "btn jm-secundario", type: "button", onclick: j.fechar }, "Cancelar"), salvar);
    salvar.onclick = async () => {
      salvar.disabled = true;
      const linha = { categoria: d.categoria, titulo: d.titulo.trim(), primeiro_passo: d.primeiro_passo.trim(), prazo: d.prazo || null, progresso: d.progresso, ano: anoMetas, id: meta?.id };
      if (await salvarOuAvisar("metas_ano", linha)) { j.fechar(); toast(meta ? "Meta salva!" : "Meta adicionada!", "sucesso"); carregar(); }
      else conferir();
    };
    conferir();
    j.caixa.querySelector(meta ? "#jm-nome" : ".jm-cat")?.focus();
  }

  // ----- Planejar Metas: Sonhar, Escolher, Agir -----
  function planejar() {
    const ETAPAS = [["Sonhar", "nuvem"], ["Escolher", "clique"], ["Agir", "raio"]];
    const st = { etapa: 0, sonho: "", itens: [], escolhidas: [] };
    const etapaTexto = h("span", { class: "jm-etapa" });
    const j = janelaMeta({ titulo: `Planejar Metas ${anoMetas}`, iconeTopo: h("span", { class: "jm-icone-solto" }, icone("brilho")), extraTopo: etapaTexto });
    j.caixa.classList.add("jm-planejar");

    // Separa o texto livre em ideias (uma por linha, ou por ponto e vírgula / ponto final).
    const separar = (texto) => [...new Set(texto.split(/\n|;|\.(?:\s|$)/).map((t) => t.replace(/^[-*•\d.)\s]+/, "").trim()).filter((t) => t.length > 1))];

    const desenhar = () => {
      etapaTexto.textContent = `Etapa ${st.etapa + 1} de 3`;
      const passos = h("div", { class: "jm-passos" },
        h("div", { class: "plan-barra jm-barra" }, h("span", { style: `width:${((st.etapa + 1) / 3) * 100}%` })),
        h("div", { class: "jm-passos-lista" }, ETAPAS.map(([nome, ic], i) => h("div", { class: `jm-passo${i === st.etapa ? " atual" : ""}${i < st.etapa ? " feito" : ""}` },
          h("span", { class: "jm-passo-icone" }, icone(i < st.etapa ? "check" : ic)), h("span", {}, nome)))));
      const cabeca = (titulo, sub) => h("div", { class: "jm-etapa-cabeca" }, h("h3", {}, titulo), h("p", {}, sub));
      const voltar = h("button", { class: "btn jm-secundario", type: "button", onclick: () => { st.etapa--; desenhar(); } }, icone("voltar"), "Voltar");
      const avancar = (texto, pode, acao) => h("button", { class: "btn btn-primario jm-principal", type: "button", disabled: !pode, onclick: acao }, texto, icone("direita"));
      let conteudo, botoes;

      if (st.etapa === 0) {
        const continuar = avancar("Continuar", !!st.sonho.trim(), () => {
          // Mantém o que já foi marcado se a pessoa voltar e seguir de novo.
          const novas = separar(st.sonho);
          st.itens = [...new Set([...st.itens.filter((i) => novas.includes(i) || st.escolhidas.some((e) => e.texto === i)), ...novas])];
          st.etapa = 1; desenhar();
        });
        conteudo = h("div", {},
          cabeca("Sonhar", "Antes de organizar, vamos esvaziar a cabeça."),
          h("label", { class: "jm-rotulo", for: "jm-sonho" }, `Se ${anoMetas} fosse o melhor ano da sua vida, o que teria acontecido?`),
          h("textarea", {
            class: "campo jm-sonho", id: "jm-sonho", value: st.sonho,
            placeholder: "Escreva tudo que vier à mente, sem filtro. Pode ser grande ou pequeno...\nDica: uma ideia por linha.",
            oninput: (e) => { st.sonho = e.target.value; continuar.disabled = !st.sonho.trim(); },
          }));
        botoes = [h("span"), continuar];
      } else if (st.etapa === 1) {
        const marcada = (t) => st.escolhidas.some((e) => e.texto === t);
        const extra = h("input", {
          class: "campo jm-campo", placeholder: "+ Adicionar outra ideia e apertar Enter", "aria-label": "Adicionar outra ideia",
          onkeydown: (e) => {
            const v = e.target.value.trim();
            if (e.key !== "Enter" || !v) return;
            if (!st.itens.includes(v)) st.itens.push(v);
            if (!marcada(v) && st.escolhidas.length < 5) st.escolhidas.push({ texto: v, titulo: v, categoria: "", primeiro_passo: "", prazo: "" });
            desenhar(); j.caixa.querySelector(".jm-ideias + .jm-campo")?.focus();
          },
        });
        conteudo = h("div", {},
          cabeca("Escolher", "Quais dessas ideias viram metas neste ano? Escolha até 5."),
          h("div", { class: "jm-ideias" }, st.itens.map((t) => h("button", {
            type: "button", class: `jm-ideia${marcada(t) ? " ativa" : ""}`, "aria-pressed": String(marcada(t)),
            onclick: () => {
              if (marcada(t)) st.escolhidas = st.escolhidas.filter((e) => e.texto !== t);
              else if (st.escolhidas.length >= 5) { toast("Escolha no máximo 5: foco é tudo!"); return; }
              else st.escolhidas.push({ texto: t, titulo: t, categoria: "", primeiro_passo: "", prazo: "" });
              desenhar();
            },
          }, h("span", { class: "jm-ideia-check" }, icone("check")), h("span", {}, t)))),
          extra,
          h("p", { class: "jm-contador" }, `${st.escolhidas.length} de 5 escolhidas`));
        botoes = [voltar, avancar("Continuar", st.escolhidas.length > 0, () => { st.etapa = 2; desenhar(); })];
      } else {
        const pronto = () => st.escolhidas.every((e) => e.titulo.trim() && e.categoria && e.primeiro_passo.trim());
        const criar = h("button", { class: "btn btn-primario jm-principal", type: "button", disabled: !pronto() }, `Criar ${st.escolhidas.length} ${st.escolhidas.length === 1 ? "meta" : "metas"}`);
        const conferir = () => { criar.disabled = !pronto(); };
        criar.onclick = async () => {
          criar.disabled = true;
          for (const e of st.escolhidas) {
            const ok = await salvarOuAvisar("metas_ano", { titulo: e.titulo.trim(), categoria: e.categoria, primeiro_passo: e.primeiro_passo.trim(), prazo: e.prazo || null, progresso: 0, ano: anoMetas });
            if (!ok) { conferir(); carregar(); return; }
          }
          j.fechar();
          toast(`${st.escolhidas.length} ${st.escolhidas.length === 1 ? "meta criada" : "metas criadas"}! Agora é agir. 💪`, "sucesso");
          carregar();
        };
        conteudo = h("div", {},
          cabeca("Agir", "Pra cada meta, escolha a categoria e o primeiro passo concreto."),
          h("div", { class: "jm-agir" }, st.escolhidas.map((e, i) => h("div", { class: "jm-agir-meta" },
            h("div", { class: "jm-grupo" }, h("label", { class: "jm-rotulo", for: `jm-a-nome-${i}` }, `Meta ${i + 1} *`),
              h("input", { class: "campo jm-campo", id: `jm-a-nome-${i}`, value: e.titulo, oninput: (ev) => { e.titulo = ev.target.value; conferir(); } })),
            h("div", { class: "jm-grupo" }, h("span", { class: "jm-rotulo" }, "Categoria *"),
              escolhaCategoria(() => categorias, e.categoria, (c) => { e.categoria = c; conferir(); }, criarCategoria)),
            h("div", { class: "jm-agir-linha" },
              h("div", { class: "jm-grupo" }, h("label", { class: "jm-rotulo", for: `jm-a-passo-${i}` }, "Primeiro passo *"),
                h("input", { class: "campo jm-campo", id: `jm-a-passo-${i}`, value: e.primeiro_passo, placeholder: "Qual a primeira ação concreta?", oninput: (ev) => { e.primeiro_passo = ev.target.value; conferir(); } })),
              h("div", { class: "jm-grupo" }, h("label", { class: "jm-rotulo", for: `jm-a-prazo-${i}` }, "Prazo (opcional)"),
                campoPrazo(e.prazo, (v) => { e.prazo = v; }, `jm-a-prazo-${i}`)))))));
        botoes = [voltar, criar];
      }
      j.corpo.replaceChildren(passos, conteudo);
      j.rodape.replaceChildren(...botoes);
      if (st.etapa === 0) j.caixa.querySelector("#jm-sonho")?.focus();
    };
    desenhar();
  }

  async function mudarProgresso(meta, delta) {
    const progresso = Math.min(100, Math.max(0, meta.progresso + delta));
    if (progresso === meta.progresso) return;
    if (await salvarOuAvisar("metas_ano", { id: meta.id, progresso })) { meta.progresso = progresso; desenhar(); }
  }

  function desenhar() {
    const concluidas = metas.filter((m) => m.progresso >= 100).length;
    const aFazer = metas.filter((m) => m.progresso <= 0).length;
    const emProgresso = metas.length - concluidas - aFazer;
    const geral = metas.length ? Math.round(metas.reduce((t, m) => t + m.progresso, 0) / metas.length) : 0;
    const barra = (pct) => h("div", { class: "plan-barra" }, h("span", { style: `width:${pct}%` }));
    const cartaoPct = (rotulo, pct, destaque) => h("div", { class: `cartao metas-cartao${destaque ? " destaque" : ""}` },
      h("div", { class: "metas-cartao-linha" }, h("span", { class: "metas-cartao-rotulo", title: rotulo }, rotulo), h("strong", {}, `${pct}%`)),
      barra(pct));
    // Os 2 cartões do meio mostram as metas mais adiantadas que ainda não foram concluídas.
    const andamento = [...metas].filter((m) => m.progresso < 100).sort((a, b) => b.progresso - a.progresso);
    const meio = [0, 1].map((i) => andamento[i] ? cartaoPct(andamento[i].titulo, andamento[i].progresso) : cartaoPct("Nenhuma meta", 0));
    const statusDe = (p) => (p >= 100 ? ["concluida", "Concluída"] : p > 0 ? ["progresso", "Em progresso"] : ["fazer", "A fazer"]);

    caixa.replaceChildren(
      h("div", { class: "metas-acoes" },
        h("button", { class: "btn metas-planejar", type: "button", onclick: planejar }, icone("brilho"), "Planejar Metas"),
        h("button", { class: "btn btn-primario metas-nova", type: "button", onclick: () => editar(null) }, icone("mais"), "Nova Meta")),
      h("div", { class: "metas-resumo" },
        cartaoPct("Progresso Geral", geral, true),
        ...meio,
        h("div", { class: "cartao metas-cartao metas-total" },
          h("div", {}, h("span", { class: "metas-cartao-rotulo" }, "Total"), h("strong", {}, fmt(metas.length))),
          h("ul", {},
            h("li", { class: "st-concluida" }, h("b", {}, fmt(concluidas)), concluidas === 1 ? " concluída" : " concluídas"),
            h("li", { class: "st-progresso" }, h("b", {}, fmt(emProgresso)), " em progresso"),
            h("li", { class: "st-fazer" }, h("b", {}, fmt(aFazer)), " a fazer")))),
      h("div", { class: "cartao metas-lista" },
        metas.length
          ? metas.map((m) => {
            const [st, stTexto] = statusDe(m.progresso);
            return h("div", { class: "meta-linha" },
              h("div", { class: "meta-info" },
                h("strong", {}, m.titulo),
                m.primeiro_passo ? h("p", { class: "meta-passo" }, h("span", {}, "Primeiro passo: "), m.primeiro_passo) : null,
                h("div", { class: "meta-detalhes" },
                  h("span", { class: "chip" }, `${emojiDe(m.categoria, categorias)} ${m.categoria || "Sem categoria"}`),
                  h("span", { class: `meta-status st-${st}` }, stTexto),
                  m.prazo ? h("span", { class: "ajuda", style: "margin:0" }, `até ${dataBR(m.prazo)}`) : null)),
              h("div", { class: "meta-barra" }, barra(m.progresso), h("strong", {}, `${m.progresso}%`)),
              h("div", { class: "meta-botoes" },
                h("button", { class: "btn btn-pequeno", type: "button", "aria-label": `Diminuir 10% de ${m.titulo}`, onclick: () => mudarProgresso(m, -10) }, "-10%"),
                h("button", { class: "btn btn-pequeno", type: "button", "aria-label": `Aumentar 10% de ${m.titulo}`, onclick: () => mudarProgresso(m, 10) }, "+10%"),
                h("button", { class: "btn btn-fantasma btn-icone btn-mini", type: "button", title: "Editar", "aria-label": `Editar ${m.titulo}`, onclick: () => editar(m) }, icone("lapis")),
                h("button", {
                  class: "btn btn-fantasma btn-icone btn-mini btn-perigo", type: "button", title: "Apagar", "aria-label": `Apagar ${m.titulo}`,
                  onclick: async () => {
                    if (!confirm(`Apagar a meta "${m.titulo}"?`)) return;
                    if (await Dados.apagarLinha("metas_ano", m.id)) carregar(); else toast("Não consegui apagar.", "erro");
                  },
                }, icone("lixo"))));
          })
          : h("div", { class: "metas-vazio" },
            h("span", { class: "metas-vazio-icone" }, icone("alvo")),
            h("h3", {}, "Nenhuma meta cadastrada"),
            h("p", {}, "Comece a criar suas metas para acompanhar seu progresso"),
            h("button", { class: "btn btn-primario metas-nova", type: "button", onclick: () => editar(null) }, "Criar primeira meta"))),
    );
  }
}

// ---------- Mural dos Sonhos (vision board com fotos do computador) ----------
const MAX_SONHOS = 20;

async function telaMural(area) {
  let sonhos = [], enviando = false;
  const caixa = h("div");
  const escolher = h("input", {
    type: "file", accept: "image/jpeg,image/png,image/webp,image/gif", multiple: true, hidden: true,
    onchange: (e) => { const arquivos = [...e.target.files]; e.target.value = ""; enviar(arquivos); },
  });
  area.append(caixa, escolher);
  await carregar();

  async function carregar() {
    sonhos = await Dados.sonhosComFoto();
    desenhar();
  }

  function abrirEscolha() {
    if (Dados.semBanco) { avisoSemBanco(); return; }
    if (sonhos.length >= MAX_SONHOS) { toast(`O mural já tem ${MAX_SONHOS} imagens. Apague uma pra colocar outra.`); return; }
    escolher.click();
  }

  async function enviar(arquivos) {
    const cabem = arquivos.slice(0, MAX_SONHOS - sonhos.length);
    if (cabem.length < arquivos.length) toast(`Só cabem mais ${cabem.length} ${cabem.length === 1 ? "imagem" : "imagens"} no mural.`);
    const validos = cabem.filter((f) => {
      if (!f.type.startsWith("image/")) { toast(`"${f.name}" não é uma imagem.`, "erro"); return false; }
      if (f.size > 10 * 1024 * 1024) { toast(`"${f.name}" passa de 10 MB.`, "erro"); return false; }
      return true;
    });
    if (!validos.length) return;
    enviando = true;
    desenhar();
    for (const f of validos) {
      const r = await Dados.enviarSonho(f);
      if (!r.ok) toast(`Não consegui enviar "${f.name}": ${r.erro}`, "erro");
    }
    enviando = false;
    await carregar();
  }

  function desenhar() {
    const vagas = Math.min(MAX_SONHOS, Math.max(8, Math.ceil((sonhos.length + 1) / 4) * 4));
    const cheios = sonhos.map((s) => h("div", { class: "mural-slot cheio" },
      s.foto
        ? h("img", { src: s.foto, alt: s.titulo || "Sonho", loading: "lazy", onerror: (e) => e.target.replaceWith(h("span", { class: "mural-sem-foto" }, icone("imagem"))) })
        : h("span", { class: "mural-sem-foto" }, icone("imagem")),
      h("button", {
        class: "mural-apagar", type: "button", title: "Tirar do mural", "aria-label": `Tirar ${s.titulo || "imagem"} do mural`,
        onclick: async () => {
          if (!confirm("Tirar essa imagem do mural?")) return;
          if (await Dados.apagarSonho(s)) carregar(); else toast("Não consegui apagar.", "erro");
        },
      }, icone("x"))));
    const vazios = Array.from({ length: vagas - sonhos.length }, () => h("button", { class: "mural-slot", type: "button", onclick: abrirEscolha },
      h("span", { class: "mural-slot-icone" }, icone("imagem")), h("span", {}, "Adicionar imagem")));
    const dica = (titulo, texto) => h("div", {}, h("strong", {}, titulo), h("p", {}, texto));

    caixa.replaceChildren(
      h("div", { class: "mural-topo" },
        h("div", { class: "mural-titulo" },
          h("span", { class: "mural-titulo-icone" }, icone("brilho")),
          h("h2", {}, `Mural dos Sonhos ${new Date().getFullYear()}`),
          h("span", { class: "sub" }, "Seu vision board pessoal: visualize seus objetivos")),
        h("div", { class: "mural-acoes" },
          h("span", { class: `mural-status${enviando ? " enviando" : ""}`, "aria-live": "polite" },
            enviando ? null : icone("check"), enviando ? "Salvando..." : "Tudo salvo"),
          h("button", { class: "btn btn-gradiente", type: "button", disabled: enviando, onclick: abrirEscolha }, icone("mais"), "Adicionar Imagem"))),
      h("div", { class: "mural-grade" }, cheios, vazios),
      h("p", { class: "mural-contagem" }, h("strong", {}, fmt(sonhos.length)), ` de ${MAX_SONHOS} imagens`),
      h("div", { class: "mural-dicas" },
        h("h3", {}, "💡 Dicas para seu Vision Board"),
        h("div", { class: "mural-dicas-grade" },
          dica("Visualize", "Adicione imagens que representem seus sonhos e objetivos de vida"),
          dica("Inspire-se", "Escolha imagens que te motivam e trazem energia positiva"),
          dica("Atualize", "Volte aqui sempre que precisar lembrar do que está buscando"))),
    );
  }
}

// Começa quando todos os scripts (inclusive o editor.js) já carregaram.
window.addEventListener("DOMContentLoaded", iniciar);
