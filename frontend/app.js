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
  subir: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
  descer: '<path d="m22 17-8.5-8.5-5 5L2 7"/><path d="M16 17h6v-6"/>',
  carteira: '<path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3"/><path d="M21 9h-5a3 3 0 0 0 0 6h5z"/>',
  cartao: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
  estrela: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z"/>',
  filtro: '<path d="M3 4h18l-7 8.5V19l-4 2v-8.5z"/>',
  nuvem: '<path d="M17.5 19H8a5 5 0 1 1 1.3-9.8A6 6 0 0 1 20.8 11 4 4 0 0 1 17.5 19z"/>',
  clique: '<path d="m9 9 5 12 1.8-5.2L21 14z"/><path d="M7.2 2.2 8 5.1M5.1 8 2.2 7.2M14 4.1 12 6.2M6.2 12l-2.1 2"/>',
  camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
  megafone: '<path d="M3 11v3a1 1 0 0 0 1 1h2l6 4V6L6 10H4a1 1 0 0 0-1 1z"/><path d="M16 8.5a5 5 0 0 1 0 7"/><path d="M19 5.5a9 9 0 0 1 0 13"/>',
  predio: '<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M10 21v-3h4v3"/>',
  contrato: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
  olho: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  olhoFechado: '<path d="M9.9 4.2A10.4 10.4 0 0 1 12 4c6.4 0 10 8 10 8a17.6 17.6 0 0 1-2.2 3.3M6.6 6.6A17.4 17.4 0 0 0 2 12s3.6 8 10 8a9.7 9.7 0 0 0 5.4-1.6"/><path d="M14.1 14.1a3 3 0 1 1-4.2-4.2M2 2l20 20"/>',
  usuarioMais: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>',
  ordenar: '<path d="m3 8 4-4 4 4M7 4v16M21 16l-4 4-4-4M17 20V4"/>',
  setas: '<path d="m7 15 5 5 5-5M7 9l5-5 5 5"/>',
  coroa: '<path d="m2 8 4 10h12l4-10-5 4-5-7-5 7z"/><path d="M6 21h12"/>',
  aperto: '<path d="m11 17 2 2a1 1 0 1 0 3-3"/><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.9-3.9a3 3 0 0 0-4.2 0l-.9.9a1 1 0 1 1-3-3l2.8-2.8a5.8 5.8 0 0 1 7.1-.9l.5.3a3 3 0 0 0 2 .4L22 4"/><path d="m21 3 1 11h-2M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3M3 4h8"/>',
  cupom: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>',
  festa: '<path d="M5.8 11.3 2 22l10.7-3.8"/><path d="M4 3h.01M22 8h.01M15 2h.01M22 20h.01"/><path d="m22 2-2.2.7a3 3 0 0 0-2 3.4c.1.7-.4 1.4-1.1 1.4h-.4"/><path d="M11 13c1.9 1.9 2.8 4.2 2 5s-3.1-.1-5-2-2.8-4.2-2-5 3.1.1 5 2z"/>',
  etiqueta: '<path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z"/><circle cx="7.5" cy="7.5" r=".5"/>',
  balanca: '<path d="M12 3v18M7 21h10M4 7h16"/><path d="m4 7-3 7a3 3 0 0 0 6 0zM20 7l-3 7a3 3 0 0 0 6 0z"/>',
  mao: '<path d="M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v6M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-6-2.4l-3.6-3.6a2 2 0 0 1 2.8-2.8L7 15"/>',
  escudo: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
  marcador: '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
  alerta: '<path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3z"/><path d="M12 9v4M12 17h.01"/>',
  email: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
  bolinha: '<circle cx="12" cy="12" r="5" fill="currentColor" stroke="none"/>',
  youtube: '<path d="M2.5 17a24 24 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.6 49.6 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24 24 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.6 49.6 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3z"/>',
  pontos: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  sino: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
  lista: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  grade: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  dinheiro: '<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  pino: '<path d="M12 17v5"/><path d="M9 10.8V4h6v6.8l3 3.2v2H6v-2z"/>',
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
  // Google Agenda: eventos do período, lidos pelo endereço secreto (iCal) que você colou.
  async agendaGoogle(de, ate) {
    return (await this.chamarFuncao(`agenda-google?de=${de}&ate=${ate}`)) || { conectado: false, eventos: [] };
  },
  // Configurações do painel (chave e valor)
  async lerConfig(chave) {
    const [linha] = await this.lista("config_painel", (c) => c.eq("chave", chave));
    return linha?.valor ?? null;
  },
  gravarConfig(chave, valor) { return this.gravar("config_painel", { chave, valor }); },
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

  // Várias linhas de uma vez (importar extrato, recorrentes). Devolve { ok, erro }.
  async inserirVarias(tabela, linhas) {
    if (!sb) return { ok: false, erro: "sem banco" };
    try {
      const { error } = await sb.from(tabela).insert(linhas);
      if (error) throw error;
      return { ok: true };
    } catch (e) { return { ok: false, erro: e.message || String(e) }; }
  },
  async gravar(tabela, linha) {
    if (!sb) return { ok: false, erro: "sem banco" };
    try {
      const { error } = await sb.from(tabela).upsert({ ...linha, updated_at: new Date().toISOString() });
      if (error) throw error;
      return { ok: true };
    } catch (e) { return { ok: false, erro: e.message || String(e) }; }
  },
  // Categorias do Financeiro: cria, reativa ou esconde pelo par (tipo, nome).
  async salvarCategoriaFin(linha) {
    if (!sb) return { ok: false, erro: "sem banco" };
    try {
      const { error } = await sb.from("fin_categorias").upsert({ ...linha, updated_at: new Date().toISOString() }, { onConflict: "tipo,nome" });
      if (error) throw error;
      return { ok: true };
    } catch (e) { return { ok: false, erro: e.message || String(e) }; }
  },
  async apagarCategoriaFin(tipo, nome) {
    if (!sb) return false;
    try { const { error } = await sb.from("fin_categorias").delete().eq("tipo", tipo).eq("nome", nome); return !error; } catch { return false; }
  },
  // Apaga uma transação recorrente e as próximas (mesma recorrência, data igual ou depois).
  async apagarRecorrencia(recorrencia, desde) {
    if (!sb) return false;
    try {
      const { error } = await sb.from("fin_transacoes").delete().eq("recorrencia", recorrencia).gte("data", desde);
      return !error;
    } catch { return false; }
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
  // Tarefas da campanha no Calendário: apaga as antigas e grava as novas.
  async tarefasCampanha(campanhaId, eventos) {
    if (!sb) return { ok: false, erro: "sem banco" };
    try {
      const apagar = await sb.from("cal_eventos").delete().eq("campanha_id", campanhaId);
      if (apagar.error) throw apagar.error;
      if (eventos.length) { const { error } = await sb.from("cal_eventos").insert(eventos); if (error) throw error; }
      return { ok: true };
    } catch (e) { return { ok: false, erro: e.message || String(e) }; }
  },
  // Foto do perfil: fica no mesmo cofre privado do Mural, na pasta "perfil".
  async fotoPerfil() {
    const caminho = await this.lerConfig("foto_perfil");
    if (!sb || !caminho) return null;
    try {
      const { data } = await sb.storage.from("mural").createSignedUrl(caminho, 3600 * 12);
      return data?.signedUrl || null;
    } catch { return null; }
  },
  async enviarFotoPerfil(arquivo) {
    if (!sb) return { ok: false, erro: "sem banco" };
    const caminho = `perfil/${Date.now()}.${(arquivo.name.split(".").pop() || "jpg").toLowerCase()}`;
    try {
      const antiga = await this.lerConfig("foto_perfil");
      const up = await sb.storage.from("mural").upload(caminho, arquivo, { contentType: arquivo.type });
      if (up.error) throw up.error;
      const r = await this.gravarConfig("foto_perfil", caminho);
      if (!r.ok) { await sb.storage.from("mural").remove([caminho]); throw new Error(r.erro); }
      if (antiga) await sb.storage.from("mural").remove([antiga]);
      const { data } = await sb.storage.from("mural").createSignedUrl(caminho, 3600 * 12);
      return { ok: true, link: data?.signedUrl || null };
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
  $("#usuario-email").title = email || "";
  $("#faixa-teste").hidden = !MODO_LOCAL;
  carregarFoto();
  montarSinoGeral();
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

// Foto do perfil no menu: mostra a salva e troca ao clicar.
function mostrarFoto(link) {
  const botao = $("#perfil-foto");
  botao.querySelector("img")?.remove();
  if (link) botao.prepend(h("img", { src: link, alt: "" }));
  botao.classList.toggle("com-foto", !!link);
}
async function carregarFoto() {
  $("#perfil-inicial").textContent = ($("#perfil-nome").textContent.trim()[0] || "T").toUpperCase();
  mostrarFoto(await Dados.fotoPerfil());
}
// Sino geral: ao lado do nome no menu e, no celular, ao lado do botão do menu.
// Revê os avisos a cada 5 minutos enquanto o painel fica aberto.
let relogioAvisos = null;
function montarSinoGeral() {
  if (!$(".perfil .sino-geral")) {
    $(".perfil").append(botaoAvisos(null, "sino-geral", true));
    $("#botao-menu").before(botaoAvisos(null, "sino-celular", true));
  }
  Avisos.lidas = null;
  Avisos.primeira = true;
  atualizarAvisos(true);
  clearInterval(relogioAvisos);
  relogioAvisos = setInterval(() => { if (!$("#tela-app").hidden) atualizarAvisos(true); }, 5 * 60000);
}

$("#perfil-foto").addEventListener("click", () => $("#perfil-arquivo").click());
$("#perfil-arquivo").addEventListener("change", async (e) => {
  const arquivo = e.target.files[0];
  e.target.value = "";
  if (!arquivo) return;
  if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(arquivo.type)) { toast("Escolha uma foto JPG, PNG ou WEBP.", "erro"); return; }
  if (arquivo.size > 5 * 1024 * 1024) { toast("A foto pode ter até 5 MB.", "erro"); return; }
  if (Dados.semBanco) { avisoSemBanco(); return; }
  const r = await Dados.enviarFotoPerfil(arquivo);
  if (!r.ok) { toast(`Não consegui salvar a foto: ${r.erro}`, "erro"); return; }
  mostrarFoto(r.link);
  toast("Foto atualizada!", "sucesso");
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
const ROTAS = {
  inicio: telaInicio, focos: telaFocos, notas: telaNotas, financeiro: telaFinanceiro, precificacao: telaPrecificacao,
  conteudo: telaConteudo, clientes: telaClientes, contratos: telaContratos, instagram: telaInstagram,
};

function navegar() {
  if ($("#tela-app").hidden) return;
  // Link antigo: o Calendário agora fica só dentro de Focos e metas
  if (location.hash.startsWith("#calendario")) { location.replace("#focos/calendario"); return; }
  const [rota, sub] = location.hash.slice(1).split("/");
  const nome = ROTAS[rota] ? rota : "inicio";
  document.querySelectorAll(".menu a").forEach((a) => a.classList.toggle("ativo", a.dataset.rota === nome));
  $("#lateral").classList.remove("aberta");
  const pagina = $("#pagina");
  pagina.replaceChildren();
  ROTAS[nome](pagina, sub);
  atualizarAvisos();
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", navegar);
$("#botao-menu").addEventListener("click", () => $("#lateral").classList.toggle("aberta"));

// Menu do computador: fica recolhido (só ícones) e abre por cima da página ao passar
// o mouse ou tocar nele. Fecha sozinho ao sair com o mouse, clicar fora ou escolher uma aba.
const noComputador = () => window.matchMedia("(min-width: 761px)").matches;
let esperaAbrir = null;
function recolherMenu(sim) {
  clearTimeout(esperaAbrir);
  $("#tela-app").classList.toggle("recolhido", sim);
}
recolherMenu(true);
$("#lateral").addEventListener("mouseenter", () => { if (noComputador()) esperaAbrir = setTimeout(() => recolherMenu(false), 120); });
$("#lateral").addEventListener("mouseleave", () => { if (noComputador()) recolherMenu(true); });
// Toque (sem mouse): tocar no menu abre; escolher uma aba fecha
$("#lateral").addEventListener("click", (e) => {
  if (!noComputador()) return;
  if (e.target.closest(".menu a")) { recolherMenu(true); return; }
  if ($("#tela-app").classList.contains("recolhido") && !e.target.closest("button, a, input")) recolherMenu(false);
});
document.addEventListener("click", (e) => { if (noComputador() && !e.target.closest("#lateral")) recolherMenu(true); });
// Com o menu recolhido, o nome de cada aba aparece ao passar o mouse
document.querySelectorAll(".menu a").forEach((a) => { a.title = a.textContent.trim(); });
$("#botao-sair").title = "Sair";

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
// Nome de quem usa o painel (o que aparece no menu)
const nomeDona = () => $("#perfil-nome").textContent.trim() || "Tatiele";

// "Boa tarde, CEO Tatiele!" com a data de hoje por extenso
function saudacao() {
  const agora = new Date();
  const hora = agora.getHours();
  const periodo = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  const nome = nomeDona();
  const data = agora.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return h("div", { class: "saudacao" },
    h("h1", {}, `${periodo}, `, h("span", { class: "saudacao-ceo" }, "CEO"), ` ${nome}!`),
    h("p", { class: "sub" }, data.charAt(0).toUpperCase() + data.slice(1)));
}

function telaInicio(p) {
  const leads = cartaoNumero("usuarios", "Leads captados", "...", "no total");
  const ativas = cartaoNumero("raio", "Automações ativas", "...", "ligadas agora");
  const dms = cartaoNumero("enviar", "DMs enviadas", "...", "nos últimos 7 dias");
  const passo = (titulo, texto) => h("li", {}, h("strong", {}, titulo), texto);

  p.append(
    saudacao(),
    h("div", { class: "grade-cartoes" }, leads.el, ativas.el, dms.el),
    h("div", { class: "secao" },
      h("h2", {}, "Atalhos"),
      h("div", { class: "atalhos" },
        h("a", { class: "btn btn-primario", href: "#instagram/automacoes" }, icone("raio"), "Minhas automações"),
        h("a", { class: "btn", href: "#instagram/analises" }, icone("grafico"), "Análises do Instagram"),
        h("a", { class: "btn", href: "#focos/calendario" }, icone("calendario"), "Calendário"))),
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
const dinheiro = reais;
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
  // Semana atual, de segunda a domingo: "26 de outubro a 1 de novembro"
  const seg = new Date();
  seg.setDate(seg.getDate() - ((seg.getDay() + 6) % 7));
  const dom = new Date(seg.getFullYear(), seg.getMonth(), seg.getDate() + 6);
  const diaMes = (d) => `${d.getDate()} de ${MESES[d.getMonth()]}`;
  p.append(
    h("div", { class: "boas-vindas" },
      h("div", {},
        h("h1", {}, `Vamos planejar sua semana, ${nomeDona()} ✨`),
        h("p", { class: "sub" }, "Organize seus sonhos, metas e tarefas em um só lugar. Tudo o que você precisa para ter clareza e foco.")),
      h("div", { class: "boas-vindas-semana" },
        h("span", {}, "Semana atual"),
        h("strong", {}, `${diaMes(seg)} a ${diaMes(dom)}`))),
    h("div", { class: "abas-pilula-barra" },
      h("nav", { class: "abas-pilula", "aria-label": "Seções de Focos e metas" },
        Object.entries(ABAS).map(([chave, [titulo, ic]]) =>
          h("a", { href: `#focos/${chave}`, class: aba === chave ? "ativo" : "", "aria-current": aba === chave ? "page" : null }, icone(ic), titulo))),
      botaoGoogle(() => { area.replaceChildren(); ABAS[aba][2](area); })),
    area,
  );
  ABAS[aba][2](area);
}

// Botão "Conectar Google Calendar": mostra se já está ligado e abre a janela pra colar o link.
const LINK_ICAL = /^https:\/\/calendar\.google\.com\/calendar\/ical\/.+\.ics(\?.*)?$/i;
function botaoGoogle(aoMudar) {
  const botao = h("button", { class: "btn btn-google", type: "button", onclick: () => abrirConexaoGoogle(atualizar) },
    icone("calendario"), h("span", {}, "Conectar Google Calendar"));
  async function atualizar(mudou) {
    const ligado = !!(await Dados.lerConfig("gcal_ical"));
    botao.classList.toggle("ligado", ligado);
    botao.lastChild.textContent = ligado ? "Google Agenda conectado" : "Conectar Google Calendar";
    if (mudou) aoMudar?.();
  }
  atualizar(false);
  return botao;
}

async function abrirConexaoGoogle(aoMudar) {
  if (Dados.semBanco) { avisoSemBanco(); return; }
  const atual = await Dados.lerConfig("gcal_ical");
  const fechar = () => { fundo.remove(); document.removeEventListener("keydown", aoTeclar); };
  const aoTeclar = (e) => { if (e.key === "Escape") fechar(); };
  const erro = h("p", { class: "login-erro", role: "alert" });
  const campo = h("input", { class: "campo jm-campo", id: "gcal-link", type: "url", placeholder: "https://calendar.google.com/calendar/ical/.../basic.ics", autocomplete: "off" });
  const salvar = h("button", { class: "btn btn-primario jm-principal", type: "button" }, "Conectar");
  salvar.onclick = async () => {
    const link = campo.value.trim();
    if (!LINK_ICAL.test(link)) { erro.textContent = "Esse não parece o endereço secreto. Ele começa com https://calendar.google.com/calendar/ical/ e termina com .ics"; return; }
    salvar.disabled = true;
    const r = await Dados.gravarConfig("gcal_ical", link);
    if (!r.ok) { erro.textContent = `Não consegui salvar: ${r.erro}`; salvar.disabled = false; return; }
    // Testa na hora se o Google devolve a agenda
    const hoje = iso(new Date());
    const teste = await Dados.agendaGoogle(hoje, hoje);
    if (teste.erro) { erro.textContent = teste.erro; salvar.disabled = false; return; }
    fechar(); toast("Google Agenda conectado! Seus eventos já aparecem no Calendário e no Planejamento.", "sucesso"); aoMudar(true);
  };
  const passo = (n, texto) => h("li", {}, h("span", { class: "gcal-num" }, String(n)), h("span", {}, texto));
  const caixa = h("div", { class: "jm gcal-janela", role: "dialog", "aria-modal": "true", "aria-label": "Conectar Google Agenda" },
    h("div", { class: "jm-topo" }, h("span", { class: "jm-icone" }, icone("calendario")), h("h2", {}, "Conectar Google Agenda"),
      h("button", { class: "btn btn-fantasma btn-icone jm-fechar", type: "button", "aria-label": "Fechar", onclick: fechar }, icone("x"))),
    h("div", { class: "jm-corpo" },
      atual ? h("p", { class: "gcal-ligado" }, icone("check"), "Sua agenda já está conectada. Pra trocar, cole um link novo abaixo.") : null,
      h("ol", { class: "gcal-passos" },
        passo(1, "No computador, abra o Google Agenda e clique na engrenagem → Configurações."),
        passo(2, "No menu da esquerda, em \"Configurações das minhas agendas\", clique no seu nome."),
        passo(3, "Desça até \"Integrar agenda\" e copie o \"Endereço secreto no formato iCal\"."),
        passo(4, "Cole aqui embaixo e clique em Conectar.")),
      h("div", { class: "jm-grupo" }, h("label", { class: "jm-rotulo", for: "gcal-link" }, "Endereço secreto no formato iCal"), campo, erro),
      h("p", { class: "gcal-aviso" }, "🔒 Esse link é secreto: quem tiver ele vê sua agenda. Ele fica guardado só no seu banco, e o painel só lê (não muda nada no Google). Os eventos podem levar alguns minutos pra atualizar.")),
    h("div", { class: "jm-rodape" },
      atual ? h("button", {
        class: "btn btn-fantasma btn-perigo", type: "button",
        onclick: async () => {
          if (!confirm("Desconectar o Google Agenda do painel?")) return;
          const r = await Dados.gravarConfig("gcal_ical", null);
          if (!r.ok) { toast("Não consegui desconectar.", "erro"); return; }
          fechar(); toast("Google Agenda desconectado."); aoMudar(true);
        },
      }, "Desconectar") : h("span"),
      h("div", { class: "jm-rodape-dir" }, h("button", { class: "btn jm-secundario", type: "button", onclick: fechar }, "Cancelar"), salvar)));
  const fundo = h("div", { class: "jm-fundo", onmousedown: (e) => { if (e.target === fundo) fechar(); } }, caixa);
  document.body.append(fundo);
  document.addEventListener("keydown", aoTeclar);
  campo.focus();
}

// Eventos do Google num período: { conectado, eventos }. Avisa uma vez se der erro.
let avisouErroGoogle = false;
async function eventosGoogle(de, ate) {
  if (Dados.semBanco) return { conectado: false, eventos: [] };
  const r = await Dados.agendaGoogle(de, ate);
  if (r.erro && !avisouErroGoogle) { avisouErroGoogle = true; toast(`Google Agenda: ${r.erro}`, "erro"); }
  return { conectado: !!r.conectado, eventos: r.eventos || [] };
}
const textoGoogle = (e) => (e.hora ? `${e.hora} ${e.titulo}` : e.titulo);

// ---------- Planejamento ----------
async function telaPlanejamento(area) {
  let plano = null, tarefas = [], habitos = [], google = [];
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
    let g;
    [plano, tarefas, habitos, g] = await Promise.all([
      Dados.planMes(mes),
      Dados.lista("plan_tarefas", (c) => c.gte("data", de).lte("data", ate).order("created_at")),
      Dados.lista("plan_habitos", (c) => c.eq("mes", mes).order("created_at")),
      eventosGoogle(de, ate),
    ]);
    google = g.eventos;
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
      // Compromissos do Google Agenda (só pra ver; muda lá no Google)
      google.some((e) => e.data === dia) ? h("ul", { class: "plan-google" }, google.filter((e) => e.data === dia).map((e) =>
        h("li", { title: "Do Google Agenda" }, e.hora ? h("strong", {}, e.hora) : null, h("span", {}, e.titulo)))) : null,
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
  google: ["Google Agenda", "Google"], // só aparece com a agenda conectada (e não dá pra criar daqui)
};
const DIAS_DOMINGO = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
const tiposVisiveis = new Set(Object.keys(TIPOS_CAL)); // filtro da legenda (lembra enquanto o painel está aberto)

async function telaCalendarioFocos(area) {
  let dias = [], itens = [], googleLigado = false;
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
    const [tarefas, eventos, propostas, google] = await Promise.all([
      Dados.lista("plan_tarefas", (c) => c.gte("data", de).lte("data", ate).order("created_at")),
      Dados.lista("cal_eventos", (c) => c.gte("data", de).lte("data", ate).order("created_at")),
      Dados.lista("propostas", (c) => c.gte("prazo", de).lte("prazo", ate)),
      eventosGoogle(de, ate),
    ]);
    googleLigado = google.conectado;
    itens = [
      ...eventos.filter((e) => e.tipo === "campanha").map((e) => ({ ...e, tabela: "cal_eventos" })),
      ...tarefas.map((t) => ({ ...t, tipo: "tarefa", tabela: "plan_tarefas" })),
      ...eventos.filter((e) => e.tipo !== "campanha").map((e) => ({ ...e, tabela: "cal_eventos" })),
      // Prazo das propostas entra sozinho como vencimento (apaga lá na aba Propostas).
      ...propostas.map((p) => ({ tipo: "vencimento", data: String(p.prazo).slice(0, 10), titulo: `Prazo: ${p.titulo}` })),
      ...google.eventos.map((e) => ({ tipo: "google", data: e.data, titulo: textoGoogle(e) })),
    ];
    desenhar();
  }

  function adicionar(dia) {
    abrirFormulario({
      titulo: `Novo em ${dataBR(dia)}`,
      campos: [
        { chave: "titulo", rotulo: "Título", obrigatorio: true, largo: true, placeholder: "Ex: Entregar vídeo da marca X" },
        { chave: "tipo", rotulo: "Tipo", tipo: "select", opcoes: Object.entries(TIPOS_CAL).filter(([k]) => k !== "google").map(([k, [, um]]) => [k, um]) },
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
        Object.entries(TIPOS_CAL).filter(([tipo]) => tipo !== "google" || googleLigado).map(([tipo, [rotulo]]) => h("button", {
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
// Status: o escolhido na meta ou, se não escolheu, pelo progresso (0% em construção, 1 a 99% em progresso, 100% concluída).
const STATUS_META = { construcao: "Em construção", progresso: "Em progresso", concluida: "Concluída" };
const statusMeta = (m) => m.status || (m.progresso >= 100 ? "concluida" : m.progresso > 0 ? "progresso" : "construcao");
// Horizonte: o escolhido na meta ou, pela data, até 1 mês curto, até 6 meses médio, mais que isso longo.
const PRAZOS_META = { curto: "Curto prazo", medio: "Médio prazo", longo: "Longo prazo", sem: "Sem prazo" };
const HORIZONTES = { curto: "Curto prazo (até 1 mês)", medio: "Médio prazo (até 6 meses)", longo: "Longo prazo (mais de 6 meses)" };
const IMPACTOS = { baixo: "Baixo impacto", medio: "Médio impacto", alto: "Alto impacto" };
function tipoPrazo(m) {
  if (m.horizonte) return [m.horizonte, PRAZOS_META[m.horizonte]];
  if (!m.prazo) return ["sem", PRAZOS_META.sem];
  const dias = (new Date(`${String(m.prazo).slice(0, 10)}T12:00:00`) - Date.now()) / 86400000;
  const tipo = dias <= 31 ? "curto" : dias <= 183 ? "medio" : "longo";
  return [tipo, PRAZOS_META[tipo]];
}
// Progresso da meta: pela meta numérica; se não tiver, pelo checklist; concluída é sempre 100%.
function calcularProgresso(m) {
  if (m.status === "concluida") return 100;
  const alvo = Number(m.valor_meta), atual = Number(m.valor_atual) || 0;
  if (alvo > 0) return Math.min(100, Math.max(0, Math.round((atual / alvo) * 100)));
  const lista = Array.isArray(m.checklist) ? m.checklist : [];
  if (lista.length) return Math.round((lista.filter((i) => i.feita).length / lista.length) * 100);
  return m.progresso || 0;
}
const ultimoDiaDoAno = (ano) => `${ano}-12-31`;
const dataExtenso = (d) => { const x = new Date(`${String(d).slice(0, 10)}T12:00:00`); return `${x.getDate()} de ${MESES[x.getMonth()]} de ${x.getFullYear()}`; };
const dataLonga = (d) => { const x = new Date(`${String(d).slice(0, 10)}T12:00:00`); return `${x.getDate()} ${MESES[x.getMonth()].slice(0, 3)} ${x.getFullYear()}`; };
// Cor da etiqueta de cada categoria (as criadas por você ganham uma cor fixa pelo nome).
const CORES_CATEGORIA = { "Saúde": "azul", Trabalho: "roxo", Dinheiro: "verde", Relacionamento: "rosa" };
const corCategoria = (nome) => CORES_CATEGORIA[nome] ||
  ["laranja", "azul", "roxo", "verde", "rosa", "amarelo"][[...String(nome || "")].reduce((t, c) => t + c.charCodeAt(0), 0) % 6];

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
  // Estado da lista (fica enquanto a aba está aberta).
  const filtro = { categoria: "", prazo: "", status: "" };
  const selecionadas = new Set(), gruposFechados = new Set();
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

  // ----- Nova Meta (painel lateral) -----
  function novaMeta() {
    const d = { categoria: "", titulo: "", primeiro_passo: "", prazo: "" };
    const j = janelaMeta({ titulo: "Nova Meta", iconeTopo: h("span", { class: "jm-icone" }, icone("alvo")), lateral: true });
    const salvar = h("button", { class: "btn btn-primario jm-principal", type: "button", disabled: true }, "Adicionar Meta");
    const conferir = () => { salvar.disabled = !(d.categoria && d.titulo.trim() && d.primeiro_passo.trim()); };
    const rotulo = (texto, para, obrigatorio) => h("label", { class: "jm-rotulo", for: para }, texto, obrigatorio ? " *" : "");

    j.corpo.append(
      h("div", { class: "jm-grupo" }, h("span", { class: "jm-rotulo" }, "Categoria *"),
        escolhaCategoria(() => categorias, d.categoria, (c) => { d.categoria = c; conferir(); }, criarCategoria)),
      h("div", { class: "jm-grupo" }, rotulo("Nome da Meta", "jm-nome", true),
        h("input", { class: "campo jm-campo", id: "jm-nome", placeholder: "Ex: Atingir 50 mil seguidores", oninput: (e) => { d.titulo = e.target.value; conferir(); } })),
      h("div", { class: "jm-grupo" }, rotulo("Primeiro passo", "jm-passo", true),
        h("input", { class: "campo jm-campo", id: "jm-passo", placeholder: "Qual a primeira ação concreta pra isso acontecer?", oninput: (e) => { d.primeiro_passo = e.target.value; conferir(); } })),
      h("div", { class: "jm-grupo" }, rotulo("Prazo final (opcional)", "jm-prazo"), campoPrazo(d.prazo, (v) => { d.prazo = v; }, "jm-prazo")));
    j.rodape.append(h("button", { class: "btn jm-secundario", type: "button", onclick: j.fechar }, "Cancelar"), salvar);
    salvar.onclick = async () => {
      salvar.disabled = true;
      const passo = d.primeiro_passo.trim();
      // O primeiro passo já entra no checklist da meta.
      const linha = { categoria: d.categoria, titulo: d.titulo.trim(), primeiro_passo: passo, prazo: d.prazo || null, progresso: 0, ano: anoMetas, checklist: [{ texto: passo, feita: false }] };
      if (await salvarOuAvisar("metas_ano", linha)) { j.fechar(); toast("Meta adicionada!", "sucesso"); carregar(); }
      else conferir();
    };
    j.caixa.querySelector(".jm-cat")?.focus();
  }

  // ----- Planejar Metas: Sonhar, Escolher, Agir e o resumo no final -----
  // Toda meta planejada aqui vale até o último dia do ano.
  function planejar() {
    const ETAPAS = [["Sonhar", "nuvem"], ["Escolher", "clique"], ["Agir", "raio"]];
    const MAX = 5;
    const st = { etapa: 0, sonho: "", metas: [], nova: { titulo: "", categoria: "" } };
    const etapaTexto = h("span", { class: "jm-etapa" });
    const j = janelaMeta({ titulo: `Planejar Metas ${anoMetas}`, iconeTopo: h("span", { class: "jm-icone-solto" }, icone("brilho")), extraTopo: etapaTexto });
    j.caixa.classList.add("jm-planejar");
    const separar = (texto) => [...new Set(texto.split(/\n|;|\.(?:\s|$)/).map((t) => t.replace(/^[-*•\d.)\s]+/, "").trim()).filter((t) => t.length > 1))];

    const desenhar = () => {
      const pronto = st.etapa === 3;
      etapaTexto.textContent = pronto ? "" : `Etapa ${st.etapa + 1} de 3`;
      const passos = pronto ? null : h("div", { class: "jm-passos" },
        h("div", { class: "plan-barra jm-barra" }, h("span", { style: `width:${((st.etapa + 1) / 3) * 100}%` })),
        h("div", { class: "jm-passos-lista" }, ETAPAS.map(([nome, ic], i) => h("div", { class: `jm-passo${i === st.etapa ? " atual" : ""}${i < st.etapa ? " feito" : ""}` },
          h("span", { class: "jm-passo-icone" }, icone(ic)), h("span", {}, nome)))));
      const cabeca = (titulo, sub) => h("div", { class: "jm-etapa-cabeca" }, h("h3", {}, titulo), h("p", {}, sub));
      const voltar = h("button", { class: "btn jm-secundario", type: "button", onclick: () => { st.etapa--; desenhar(); } }, icone("voltar"), "Voltar");
      const avancar = (texto, pode, acao) => h("button", { class: "btn btn-primario jm-principal", type: "button", disabled: !pode, onclick: acao }, texto, icone("direita"));
      let conteudo, botoes;

      if (st.etapa === 0) {
        const continuar = avancar("Continuar", !!st.sonho.trim(), () => { st.etapa = 1; desenhar(); });
        conteudo = h("div", {},
          cabeca("Sonhar", "Antes de organizar, vamos esvaziar a cabeça."),
          h("label", { class: "jm-rotulo", for: "jm-sonho" }, `Se ${anoMetas} fosse o melhor ano da sua vida, o que teria acontecido?`),
          h("textarea", {
            class: "campo jm-sonho", id: "jm-sonho", value: st.sonho,
            placeholder: "Escreva tudo que vier à mente, sem filtro. Pode ser grande ou pequeno...",
            oninput: (e) => { st.sonho = e.target.value; continuar.disabled = !st.sonho.trim(); },
          }));
        botoes = [h("span"), continuar];
      } else if (st.etapa === 1) {
        const cheio = st.metas.length >= MAX;
        const adicionar = h("button", { class: "jm-adicionar", type: "button", disabled: true }, icone("mais"), "Adicionar meta");
        const conferir = () => { adicionar.disabled = !(st.nova.titulo.trim() && st.nova.categoria); };
        const nome = h("input", {
          class: "campo jm-campo", id: "jm-nova-meta", value: st.nova.titulo, placeholder: "Nome da meta...", "aria-label": "Nome da meta",
          oninput: (e) => { st.nova.titulo = e.target.value; conferir(); },
          onkeydown: (e) => { if (e.key === "Enter" && !adicionar.disabled) adicionar.click(); },
        });
        adicionar.onclick = () => {
          st.metas.push({ titulo: st.nova.titulo.trim(), categoria: st.nova.categoria, primeiro_passo: "" });
          st.nova = { titulo: "", categoria: st.nova.categoria };
          desenhar();
          j.caixa.querySelector("#jm-nova-meta")?.focus();
        };
        const usadas = new Set(st.metas.map((m) => m.titulo.toLowerCase()));
        const sugestoes = separar(st.sonho).filter((t) => !usadas.has(t.toLowerCase()));
        conteudo = h("div", {},
          cabeca("Escolher", "Não dá pra tudo. Escolher é abrir mão."),
          h("p", { class: "jm-texto" }, "Agora transforme seus pensamentos em no máximo 5 metas pra focar esse ano."),
          sugestoes.length && !cheio ? h("div", { class: "jm-sugestoes" },
            h("span", {}, "Do que você escreveu:"),
            sugestoes.slice(0, 8).map((t) => h("button", {
              type: "button", class: "jm-sugestao", title: "Usar como nome da meta",
              onclick: () => { st.nova.titulo = t; nome.value = t; conferir(); nome.focus(); },
            }, t))) : null,
          h("div", { class: "jm-metas-escolhidas" }, st.metas.map((m, i) => h("div", { class: "jm-escolhida" },
            h("span", { class: "jm-cat-emoji", "aria-hidden": "true" }, emojiDe(m.categoria, categorias)),
            h("div", {}, h("strong", {}, m.titulo), h("span", {}, m.categoria)),
            h("button", {
              class: "btn btn-fantasma btn-icone btn-mini btn-perigo", type: "button", "aria-label": `Tirar ${m.titulo}`,
              onclick: () => { st.metas.splice(i, 1); desenhar(); },
            }, icone("lixo"))))),
          cheio ? null : h("div", { class: "jm-nova-caixa" },
            nome,
            h("div", { class: "jm-cat-pilulas", role: "radiogroup", "aria-label": "Categoria" }, categorias.map((c) => h("button", {
              type: "button", role: "radio", class: `jm-cat-pilula${st.nova.categoria === c.nome ? " ativa" : ""}`, "aria-checked": String(st.nova.categoria === c.nome),
              onclick: (e) => {
                st.nova.categoria = c.nome;
                e.currentTarget.parentNode.querySelectorAll(".jm-cat-pilula").forEach((b) => { b.classList.toggle("ativa", b === e.currentTarget); b.setAttribute("aria-checked", String(b === e.currentTarget)); });
                conferir();
              },
            }, h("span", { "aria-hidden": "true" }, c.emoji || "🎯"), c.nome))),
            adicionar),
          h("p", { class: "jm-contador" }, `${st.metas.length}/${MAX} metas`));
        conferir();
        botoes = [voltar, avancar("Continuar", st.metas.length > 0, () => { st.etapa = 2; desenhar(); })];
      } else if (st.etapa === 2) {
        const todas = () => st.metas.every((m) => m.primeiro_passo.trim());
        const criar = h("button", { class: "btn btn-primario jm-principal", type: "button", disabled: !todas() }, `Criar ${st.metas.length} ${st.metas.length === 1 ? "meta" : "metas"}`);
        criar.onclick = async () => {
          criar.disabled = true;
          for (const m of st.metas) {
            if (m.salva) continue;
            const passo = m.primeiro_passo.trim();
            const ok = await salvarOuAvisar("metas_ano", {
              titulo: m.titulo, categoria: m.categoria, primeiro_passo: passo, prazo: ultimoDiaDoAno(anoMetas),
              progresso: 0, ano: anoMetas, checklist: [{ texto: passo, feita: false }],
            });
            if (!ok) { criar.disabled = false; carregar(); return; }
            m.salva = true;
          }
          carregar();
          st.etapa = 3; desenhar();
        };
        conteudo = h("div", {},
          cabeca("Agir", "Meta sem ação é só desejo. Qual é o primeiro passo de cada uma?"),
          h("p", { class: "jm-aviso-prazo" }, icone("calendario"), `Todas as metas vão até ${dataExtenso(ultimoDiaDoAno(anoMetas))}.`),
          h("div", { class: "jm-agir" }, st.metas.map((m, i) => h("div", { class: "jm-agir-meta" },
            h("div", { class: "jm-escolhida jm-escolhida-solta" },
              h("span", { class: "jm-cat-emoji", "aria-hidden": "true" }, emojiDe(m.categoria, categorias)),
              h("div", {}, h("strong", {}, m.titulo), h("span", {}, m.categoria))),
            h("div", { class: "jm-grupo" }, h("label", { class: "jm-rotulo", for: `jm-a-passo-${i}` }, "Primeiro passo *"),
              h("input", {
                class: "campo jm-campo", id: `jm-a-passo-${i}`, value: m.primeiro_passo, placeholder: "Qual a primeira ação concreta?",
                oninput: (ev) => { m.primeiro_passo = ev.target.value; criar.disabled = !todas(); },
              }))))));
        botoes = [voltar, criar];
      } else {
        const grupos = [...new Set(st.metas.map((m) => m.categoria))];
        conteudo = h("div", { class: "jm-pronto" },
          h("span", { class: "jm-pronto-icone" }, icone("check")),
          h("h3", {}, `Você planejou ${st.metas.length} ${st.metas.length === 1 ? "meta" : "metas"} pra ${anoMetas}!`),
          h("p", {}, "Planejar não é se prender, é se orientar."),
          h("div", { class: "jm-pronto-lista" }, grupos.map((cat) => h("div", {},
            h("h4", {}, h("span", { "aria-hidden": "true" }, emojiDe(cat, categorias)), cat),
            st.metas.filter((m) => m.categoria === cat).map((m) => h("div", { class: "jm-pronto-meta" },
              h("strong", {}, m.titulo), h("span", {}, icone("raio"), m.primeiro_passo)))))));
        botoes = [h("button", { class: "btn btn-primario jm-principal jm-centro", type: "button", onclick: j.fechar }, "Ver minhas metas", icone("direita"))];
      }
      j.corpo.replaceChildren(...[passos, conteudo].filter(Boolean));
      j.rodape.replaceChildren(...botoes);
      j.rodape.classList.toggle("jm-rodape-centro", pronto);
      if (st.etapa === 0) j.caixa.querySelector("#jm-sonho")?.focus();
    };
    desenhar();
  }

  // ----- Detalhes da Meta: onde você sustenta a meta no dia a dia -----
  function abrirDetalhes(meta) {
    const d = {
      ...meta,
      checklist: (Array.isArray(meta.checklist) ? meta.checklist : []).map((i) => ({ ...i })),
      status: statusMeta(meta),
      horizonte: tipoPrazo(meta)[0] === "sem" ? "medio" : tipoPrazo(meta)[0],
      impacto: meta.impacto || "medio",
      prazo: meta.prazo ? String(meta.prazo).slice(0, 10) : "",
    };
    const numero = (v) => {
      let s = String(v ?? "").trim();
      if (!s) return null;
      if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
      else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
      const n = Number(s);
      return Number.isFinite(n) ? n : null;
    };
    const prioridade = h("button", {
      type: "button", class: `jm-prioritaria${d.favorita ? " ativa" : ""}`, "aria-pressed": String(!!d.favorita),
      onclick: () => {
        d.favorita = !d.favorita;
        prioridade.classList.toggle("ativa", d.favorita);
        prioridade.setAttribute("aria-pressed", String(d.favorita));
        prioridade.lastChild.textContent = d.favorita ? "Prioritária" : "Marcar Prioritária";
      },
    }, icone("estrela"), h("span", {}, d.favorita ? "Prioritária" : "Marcar Prioritária"));
    const j = janelaMeta({ titulo: "Detalhes da Meta", iconeTopo: h("span", { class: "jm-icone-solto" }, icone("alvo")), extraTopo: prioridade });
    j.caixa.classList.add("jm-detalhes");

    const salvar = h("button", { class: "btn btn-primario jm-principal", type: "button" }, "Salvar Alterações");
    const grupo = (rotulo, campo, id) => h("div", { class: "jm-grupo" }, h("label", { class: "jm-rotulo", for: id }, rotulo), campo);
    const texto = (chave, id, ph, linhas) => linhas
      ? h("textarea", { class: "campo jm-campo jm-area", id, value: d[chave] || "", placeholder: ph, oninput: (e) => { d[chave] = e.target.value; atualizar(); } })
      : h("input", { class: "campo jm-campo", id, value: d[chave] || "", placeholder: ph, oninput: (e) => { d[chave] = e.target.value; atualizar(); } });
    const selecao = (chave, id, opcoes) => h("label", { class: "metas-select jm-select" },
      h("select", { id, onchange: (e) => { d[chave] = e.target.value; atualizar(); } },
        opcoes.map(([v, t]) => h("option", { value: v, selected: d[chave] === v }, t))),
      icone("baixo"));

    // Partes que mudam enquanto você digita
    const numTexto = h("span"), numPct = h("strong"), numBarra = h("span");
    const projecao = h("div", { class: "jm-projecao" });
    const execucao = h("p", { class: "jm-execucao" });
    const listaCheck = h("div", { class: "jm-checklist" });
    const insights = h("ul", { class: "jm-insights-lista" });

    function contaProjecao() {
      const alvo = numero(d.valor_meta), atual = numero(d.valor_atual) || 0;
      if (!(alvo > 0)) return null;
      const falta = alvo - atual;
      if (falta <= 0) return { feita: true };
      if (!d.prazo) return { semPrazo: true };
      const dias = Math.ceil((new Date(`${d.prazo}T23:59:59`) - Date.now()) / 86400000);
      if (dias <= 0) return { vencida: true, falta };
      return { falta, dias, mes: Math.ceil(falta / Math.max(1, dias / 30.44)), semana: Math.ceil(falta / Math.max(1, dias / 7)), dia: Math.ceil(falta / dias) };
    }

    function atualizar() {
      salvar.disabled = !String(d.titulo || "").trim();
      // Meta numérica
      const alvo = numero(d.valor_meta), atual = numero(d.valor_atual) || 0;
      const pctNum = alvo > 0 ? Math.min(100, Math.round((atual / alvo) * 100)) : 0;
      numTexto.textContent = alvo > 0 ? `${fmt(atual)} / ${fmt(alvo)}` : "Preencha a meta final pra acompanhar";
      numPct.textContent = alvo > 0 ? `${pctNum}%` : "";
      numBarra.style.width = `${pctNum}%`;
      // Projeção
      const p = contaProjecao();
      projecao.hidden = !p;
      if (p) {
        const bloco = (n, rotulo) => h("div", { class: "jm-proj-num" }, h("strong", {}, fmt(n)), h("span", {}, rotulo));
        projecao.replaceChildren(
          h("h4", {}, icone("grafico"), "Projeção para Atingir a Meta"),
          p.feita ? h("p", { class: "jm-proj-msg" }, "Meta numérica atingida! 🎉")
            : p.semPrazo ? h("p", { class: "jm-proj-msg" }, "Defina o prazo final pra ver quanto precisa por dia, semana e mês.")
              : p.vencida ? h("p", { class: "jm-proj-msg" }, `O prazo já passou e faltam ${fmt(p.falta)}. Que tal ajustar a data?`)
                : h("div", {},
                  h("div", { class: "jm-proj-grade" }, bloco(p.mes, "por mês"), bloco(p.semana, "por semana"), bloco(p.dia, "por dia")),
                  h("p", { class: "jm-proj-msg" }, "Faltam ", h("b", {}, fmt(p.falta)), " em ", h("b", {}, fmt(p.dias)), p.dias === 1 ? " dia" : " dias")));
      }
      // Execução e checklist
      const feitas = d.checklist.filter((i) => i.feita).length;
      execucao.textContent = `${d.checklist.length} ${d.checklist.length === 1 ? "subtarefa" : "subtarefas"}  ·  ${feitas} ${feitas === 1 ? "concluída" : "concluídas"}`;
      // Insights (regras simples a partir do que você preencheu)
      const dicas = [];
      if (d.status !== "concluida" && d.prazo && new Date(`${d.prazo}T23:59:59`) < new Date()) dicas.push("⏰ O prazo já passou. Ajuste a data ou o plano pra não perder o ritmo.");
      if (p && p.semana) dicas.push(`📊 Para atingir a meta no prazo, você precisa de ${fmt(p.semana)} por semana.`);
      if (d.checklist.length && feitas === d.checklist.length && d.status !== "concluida") dicas.push("✅ Você fez tudo do checklist! Adicione o próximo passo ou marque a meta como concluída.");
      if (d.impacto === "alto" && d.status === "construcao") dicas.push("🔥 Meta de alto impacto ainda em construção: comece pelo primeiro item do checklist hoje.");
      if (!String(d.por_que || "").trim()) dicas.push("💭 Escreva por que essa meta é importante: isso te segura nos dias difíceis.");
      if (!String(d.obstaculos || "").trim()) dicas.push("🧱 Pensar no que pode te atrapalhar ajuda a se preparar antes.");
      if (!dicas.length) dicas.push("🌟 Sua meta está bem planejada. Agora é constância!");
      insights.replaceChildren(...dicas.slice(0, 3).map((t) => h("li", {}, t)));
    }

    function desenharChecklist() {
      listaCheck.replaceChildren(...d.checklist.map((item, i) => h("div", { class: `jm-check-item${item.feita ? " feita" : ""}` },
        h("button", {
          type: "button", class: `metas-circulo${item.feita ? " marcado" : ""}`, "aria-pressed": String(!!item.feita), "aria-label": `Feito: ${item.texto}`,
          onclick: () => { item.feita = !item.feita; desenharChecklist(); atualizar(); },
        }, icone("check")),
        h("span", {}, item.texto),
        h("button", {
          type: "button", class: "plan-apagar", "aria-label": `Apagar ${item.texto}`,
          onclick: () => { d.checklist.splice(i, 1); desenharChecklist(); atualizar(); },
        }, icone("x")))));
    }

    const novaSub = h("input", { class: "campo jm-campo", placeholder: "Adicionar nova subtarefa...", "aria-label": "Nova subtarefa" });
    const botaoSub = h("button", { class: "btn btn-primario jm-principal jm-add-sub", type: "button", disabled: true }, icone("mais"), "Adicionar");
    const addSub = () => {
      const t = novaSub.value.trim();
      if (!t) return;
      d.checklist.push({ texto: t, feita: false });
      novaSub.value = ""; botaoSub.disabled = true;
      desenharChecklist(); atualizar(); novaSub.focus();
    };
    novaSub.oninput = () => { botaoSub.disabled = !novaSub.value.trim(); };
    novaSub.onkeydown = (e) => { if (e.key === "Enter") addSub(); };
    botaoSub.onclick = addSub;

    const opcoesCat = [...categorias.map((c) => [c.nome, `${c.emoji || "🎯"} ${c.nome}`])];
    if (d.categoria && !categorias.some((c) => c.nome === d.categoria)) opcoesCat.push([d.categoria, `🎯 ${d.categoria}`]);

    j.corpo.append(
      grupo(h("span", {}, "Título da Meta *"), texto("titulo", "jd-titulo", "Ex: Atingir 50 mil seguidores"), "jd-titulo"),
      grupo("Descrição", texto("descricao", "jd-descricao", "Descreva sua meta em detalhes...", true), "jd-descricao"),
      h("div", { class: "jm-duas" },
        grupo("Categoria", selecao("categoria", "jd-categoria", opcoesCat), "jd-categoria"),
        grupo("Status", selecao("status", "jd-status", Object.entries(STATUS_META)), "jd-status")),
      h("div", { class: "jm-duas" },
        grupo("Horizonte", selecao("horizonte", "jd-horizonte", Object.entries(HORIZONTES)), "jd-horizonte"),
        grupo("Impacto", selecao("impacto", "jd-impacto", Object.entries(IMPACTOS)), "jd-impacto")),
      grupo("Prazo Final", campoPrazo(d.prazo, (v) => { d.prazo = v; atualizar(); }, "jd-prazo"), "jd-prazo"),
      h("div", { class: "jm-caixa" },
        h("h4", {}, icone("alvo"), "Meta Numérica (opcional)"),
        h("div", { class: "jm-duas" },
          grupo("Meta Final", h("input", { class: "campo jm-campo", id: "jd-alvo", inputmode: "decimal", value: d.valor_meta ?? "", placeholder: "Ex: 1000", oninput: (e) => { d.valor_meta = e.target.value; atualizar(); } }), "jd-alvo"),
          grupo("Valor Atual", h("input", { class: "campo jm-campo", id: "jd-atual", inputmode: "decimal", value: d.valor_atual ?? "", placeholder: "Ex: 22", oninput: (e) => { d.valor_atual = e.target.value; atualizar(); } }), "jd-atual")),
        h("div", { class: "jm-num-linha" }, numTexto, numPct),
        h("div", { class: "plan-barra jm-num-barra" }, numBarra)),
      projecao,
      h("div", { class: "jm-caixa" }, h("h4", {}, icone("link"), "Conexão com Execução"), execucao),
      h("hr", { class: "jm-linha" }),
      h("h4", { class: "jm-secao" }, h("span", { class: "jm-lampada" }, "💡"), "Reflexão Estratégica"),
      grupo("Por que essa meta é importante?", texto("por_que", "jd-porque", "O que essa meta representa para você...", true), "jd-porque"),
      grupo("O que pode te atrapalhar?", texto("obstaculos", "jd-obstaculos", "Identifique possíveis obstáculos...", true), "jd-obstaculos"),
      h("hr", { class: "jm-linha" }),
      h("h4", { class: "jm-secao" }, "Checklist: o que já fiz para essa meta"),
      listaCheck,
      h("div", { class: "jm-add-linha" }, novaSub, botaoSub),
      h("div", { class: "jm-caixa jm-insights" }, h("h4", {}, h("span", { class: "jm-lampada" }, "💡"), "Insights"), insights));

    const apagar = h("button", {
      class: "btn btn-fantasma btn-perigo", type: "button",
      onclick: async () => {
        if (!confirm(`Apagar a meta "${meta.titulo}"? Isso não tem volta.`)) return;
        if (await Dados.apagarLinha("metas_ano", meta.id)) { j.fechar(); toast("Meta apagada."); carregar(); } else toast("Não consegui apagar.", "erro");
      },
    }, icone("lixo"), "Apagar");
    j.rodape.append(apagar, h("div", { class: "jm-rodape-dir" }, h("button", { class: "btn jm-secundario", type: "button", onclick: j.fechar }, "Cancelar"), salvar));

    salvar.onclick = async () => {
      salvar.disabled = true;
      const linha = {
        id: meta.id, titulo: String(d.titulo).trim(), descricao: d.descricao?.trim() || null, categoria: d.categoria,
        status: d.status, horizonte: d.horizonte, impacto: d.impacto, prazo: d.prazo || null,
        valor_meta: numero(d.valor_meta), valor_atual: numero(d.valor_atual),
        por_que: d.por_que?.trim() || null, mudanca: d.mudanca?.trim() || null, obstaculos: d.obstaculos?.trim() || null,
        micro_passo: d.micro_passo?.trim() || null, checklist: d.checklist, favorita: !!d.favorita,
      };
      linha.progresso = calcularProgresso(linha);
      // Chegou a 100% sozinha (meta numérica ou checklist): vira concluída.
      if (linha.progresso >= 100 && (linha.valor_meta > 0 || linha.checklist.length)) linha.status = "concluida";
      if (await salvarOuAvisar("metas_ano", linha)) { j.fechar(); toast("Meta salva!", "sucesso"); carregar(); }
      else salvar.disabled = false;
    };

    desenharChecklist();
    atualizar();
    j.caixa.querySelector("#jd-titulo")?.focus();
  }

  async function alternarFavorita(meta) {
    if (await salvarOuAvisar("metas_ano", { id: meta.id, favorita: !meta.favorita })) { meta.favorita = !meta.favorita; desenhar(); }
  }

  // Ações com as metas marcadas.
  async function concluirSelecionadas() {
    for (const m of metas.filter((x) => selecionadas.has(x.id))) {
      if (!(await salvarOuAvisar("metas_ano", { id: m.id, progresso: 100, status: "concluida" }))) break;
    }
    selecionadas.clear();
    carregar();
  }
  async function apagarSelecionadas() {
    const n = selecionadas.size;
    if (!confirm(`Apagar ${n} ${n === 1 ? "meta" : "metas"}? Isso não tem volta.`)) return;
    for (const id of selecionadas) await Dados.apagarLinha("metas_ano", id);
    selecionadas.clear();
    carregar();
  }

  function desenhar() {
    for (const id of [...selecionadas]) if (!metas.some((m) => m.id === id)) selecionadas.delete(id);
    const contar = (st) => metas.filter((m) => statusMeta(m) === st).length;
    const concluidas = contar("concluida"), emProgresso = contar("progresso"), aFazer = contar("construcao");
    const geral = metas.length ? Math.round(metas.reduce((t, m) => t + m.progresso, 0) / metas.length) : 0;
    const barra = (pct) => h("div", { class: "plan-barra" }, h("span", { style: `width:${pct}%` }));
    const cartaoPct = (rotulo, pct, destaque, emoji) => h("div", { class: `cartao metas-cartao${destaque ? " destaque" : ""}` },
      h("div", { class: "metas-cartao-linha" },
        h("span", { class: "metas-cartao-rotulo", title: rotulo }, emoji ? h("span", { class: "metas-emoji" }, emoji) : null, rotulo),
        h("strong", { class: destaque ? "" : "metas-pct-cat" }, `${pct}%`)),
      barra(pct));
    // Os 2 cartões do meio: as categorias com mais metas e o progresso médio de cada uma.
    const porCategoria = new Map();
    for (const m of metas) {
      const c = m.categoria || "Sem categoria";
      porCategoria.set(c, [...(porCategoria.get(c) || []), m]);
    }
    const topo = [...porCategoria.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 2);
    const meio = [0, 1].map((i) => {
      if (!topo[i]) return cartaoPct("Nenhuma meta", 0);
      const [nome, lista] = topo[i];
      return cartaoPct(nome, Math.round(lista.reduce((t, m) => t + m.progresso, 0) / lista.length), false, emojiDe(nome, categorias));
    });

    caixa.replaceChildren(
      h("div", { class: "metas-acoes" },
        h("button", { class: "btn metas-planejar", type: "button", onclick: planejar }, icone("brilho"), "Planejar Metas"),
        h("button", { class: "btn btn-primario metas-nova", type: "button", onclick: novaMeta }, icone("mais"), "Nova Meta")),
      h("div", { class: "metas-resumo" },
        cartaoPct("Progresso Geral", geral, true),
        ...meio,
        h("div", { class: "cartao metas-cartao metas-total" },
          h("div", {}, h("span", { class: "metas-cartao-rotulo" }, "Total"), h("strong", {}, fmt(metas.length))),
          h("ul", {},
            h("li", { class: "st-concluida" }, h("b", {}, fmt(concluidas)), concluidas === 1 ? " concluída" : " concluídas"),
            h("li", { class: "st-progresso" }, h("b", {}, fmt(emProgresso)), " em progresso"),
            h("li", { class: "st-fazer" }, h("b", {}, fmt(aFazer)), " a fazer")))),
      metas.length ? listaMetas() : h("div", { class: "cartao metas-lista" },
        h("div", { class: "metas-vazio" },
          h("span", { class: "metas-vazio-icone" }, icone("alvo")),
          h("h3", {}, "Nenhuma meta cadastrada"),
          h("p", {}, "Comece a criar suas metas para acompanhar seu progresso"),
          h("button", { class: "btn btn-primario metas-nova", type: "button", onclick: novaMeta }, "Criar primeira meta"))),
    );
  }

  function listaMetas() {
    const visiveis = metas.filter((m) =>
      (!filtro.categoria || (m.categoria || "Sem categoria") === filtro.categoria) &&
      (!filtro.prazo || tipoPrazo(m)[0] === filtro.prazo) &&
      (!filtro.status || statusMeta(m) === filtro.status));
    const todasMarcadas = visiveis.length > 0 && visiveis.every((m) => selecionadas.has(m.id));
    const seletor = (valor, opcoes, rotulo, chave) => h("label", { class: "metas-select" },
      h("select", {
        "aria-label": rotulo, onchange: (e) => { filtro[chave] = e.target.value; desenhar(); },
      }, opcoes.map(([v, t]) => h("option", { value: v, selected: valor === v }, t))),
      icone("baixo"));
    const nomesCat = [...new Set(metas.map((m) => m.categoria || "Sem categoria"))];

    const barraTopo = h("div", { class: "metas-filtros" },
      h("button", {
        type: "button", class: "metas-selecionar", "aria-pressed": String(todasMarcadas),
        onclick: () => { if (todasMarcadas) visiveis.forEach((m) => selecionadas.delete(m.id)); else visiveis.forEach((m) => selecionadas.add(m.id)); desenhar(); },
      }, h("span", { class: `metas-circulo${todasMarcadas ? " marcado" : ""}` }, icone("check")), "Selecionar"),
      h("span", { class: "metas-divisor" }),
      selecionadas.size
        ? h("div", { class: "metas-em-massa" },
          h("strong", {}, `${selecionadas.size} ${selecionadas.size === 1 ? "selecionada" : "selecionadas"}`),
          h("button", { class: "btn btn-pequeno", type: "button", onclick: concluirSelecionadas }, icone("check"), "Concluir"),
          h("button", { class: "btn btn-pequeno btn-perigo", type: "button", onclick: apagarSelecionadas }, icone("lixo"), "Apagar"),
          h("button", { class: "btn btn-fantasma btn-pequeno", type: "button", onclick: () => { selecionadas.clear(); desenhar(); } }, "Cancelar"))
        : h("div", { class: "metas-em-massa" },
          h("span", { class: "metas-filtro-icone", "aria-hidden": "true" }, icone("filtro")),
          seletor(filtro.categoria, [["", "Todas categorias"], ...nomesCat.map((c) => [c, `${emojiDe(c, categorias)} ${c}`])], "Filtrar por categoria", "categoria"),
          seletor(filtro.prazo, [["", "Todos prazos"], ...Object.entries(PRAZOS_META)], "Filtrar por prazo", "prazo"),
          seletor(filtro.status, [["", "Todos status"], ...Object.entries(STATUS_META)], "Filtrar por status", "status")));

    const grupos = Object.entries(STATUS_META).map(([st, nome]) => {
      const doGrupo = visiveis.filter((m) => statusMeta(m) === st)
        .sort((a, b) => (b.favorita === true) - (a.favorita === true) || String(a.created_at).localeCompare(String(b.created_at)));
      if (!doGrupo.length) return null;
      const fechado = gruposFechados.has(st);
      return h("div", { class: "metas-grupo" },
        h("button", {
          type: "button", class: `metas-grupo-topo${fechado ? " fechado" : ""}`, "aria-expanded": String(!fechado),
          onclick: () => { fechado ? gruposFechados.delete(st) : gruposFechados.add(st); desenhar(); },
        }, icone("baixo"), h("span", { class: `metas-ponto st-${st}` }), h("strong", {}, nome), h("span", { class: "metas-qtd" }, `(${doGrupo.length})`)),
        fechado ? null : doGrupo.map(linhaMeta));
    }).filter(Boolean);

    return h("div", { class: "cartao metas-lista" }, barraTopo,
      grupos.length ? grupos : h("p", { class: "carregando" }, "Nenhuma meta com esses filtros."));
  }

  function linhaMeta(m) {
    const st = statusMeta(m);
    const [, prazoTexto] = tipoPrazo(m);
    const marcada = selecionadas.has(m.id);
    // Clicar na linha abre os Detalhes da Meta (menos nos botões de selecionar e favoritar).
    return h("div", { class: `meta-item${marcada ? " marcada" : ""}` },
      h("div", { class: "meta-linha", onclick: (e) => { if (!e.target.closest(".metas-circulo, .meta-estrela, .meta-abrir")) abrirDetalhes(m); } },
        h("button", {
          type: "button", class: `metas-circulo${marcada ? " marcado" : ""}`, "aria-pressed": String(marcada), "aria-label": `Selecionar ${m.titulo}`,
          onclick: () => { marcada ? selecionadas.delete(m.id) : selecionadas.add(m.id); desenhar(); },
        }, icone("check")),
        h("button", {
          type: "button", class: `meta-estrela${m.favorita ? " ativa" : ""}`, "aria-pressed": String(!!m.favorita),
          title: m.favorita ? "Tirar das prioritárias" : "Marcar prioritária", "aria-label": `Prioritária: ${m.titulo}`, onclick: () => alternarFavorita(m),
        }, icone("estrela")),
        h("button", { type: "button", class: "meta-abrir", "aria-label": `Abrir detalhes de ${m.titulo}`, onclick: () => abrirDetalhes(m) }, icone("direita")),
        h("div", { class: "meta-info" },
          h("strong", {}, m.titulo),
          (m.descricao || m.primeiro_passo) ? h("span", { class: "meta-sub" }, m.descricao || m.primeiro_passo) : null),
        h("span", { class: `meta-cat cor-${corCategoria(m.categoria)}` }, h("span", { "aria-hidden": "true" }, emojiDe(m.categoria, categorias)), m.categoria || "Sem categoria"),
        h("span", { class: "meta-prazo-tipo" }, prazoTexto),
        h("span", { class: "meta-data" }, m.prazo ? dataLonga(m.prazo) : ""),
        h("div", { class: "meta-barra" }, h("div", { class: "plan-barra" }, h("span", { style: `width:${m.progresso}%` })), h("span", {}, `${m.progresso}%`)),
        h("span", { class: `meta-pilula st-${st}` }, h("span", { class: `metas-ponto st-${st}` }), STATUS_META[st])));
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

// ---------------------------------------------------------------------
// FINANCEIRO (receitas, despesas, meta do mês e lista colada)
// ---------------------------------------------------------------------
const CATS_FIN = {
  receita: [{ nome: "Outros", emoji: "📦" }, { nome: "Publicidade", emoji: "📢" }, { nome: "TikTok", emoji: "📱" }, { nome: "UGC Creator", emoji: "🎬" }],
  despesa: [
    { nome: "Alimentação", emoji: "🍽️" }, { nome: "Transporte", emoji: "🚗" }, { nome: "Moradia", emoji: "🏠" }, { nome: "Assinaturas", emoji: "💳" },
    { nome: "Equipamentos", emoji: "📷" }, { nome: "Saúde", emoji: "💊" }, { nome: "Lazer", emoji: "🎉" }, { nome: "Outros", emoji: "📦" },
  ],
};
const MESES_CURTOS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
let mesFin = new Date().getMonth(); // 0 a 11, ou "anual"
let anoFin = new Date().getFullYear();
let ocultarFin = (() => { try { return !!localStorage.getItem("fin_ocultar"); } catch { return false; } })();
let filtroFin = "todas";

// Palpite de categoria pela descrição (dá pra trocar antes de salvar).
const PALAVRAS_DESPESA = [
  [/uber|\b99\b|t[aá]xi|combust|gasolina|posto|estacionamento|metr[oô]|[oô]nibus|ped[aá]gio/i, "Transporte"],
  [/ifood|rappi|restaurante|almo[cç]o|jantar|lanche|mercado|padaria|caf[eé]|pizza|burger|a[cç]ougue|hortifruti/i, "Alimentação"],
  [/netflix|spotify|canva|adobe|chatgpt|openai|claude|anthropic|capcut|icloud|apple\.com|google|prime video|disney|hbo|assinatura|figma|youtube/i, "Assinaturas"],
  [/aluguel|condom|energia|\bluz\b|[aá]gua|sabesp|internet|vivo|claro|\btim\b|\boi\b|g[aá]s/i, "Moradia"],
  [/farm[aá]cia|drogaria|droga|m[eé]dic|consulta|exame|academia|smart ?fit|dentista|hospital|cl[ií]nica/i, "Saúde"],
  [/cinema|show|\bbar\b|viagem|hotel|airbnb|ingresso|passagem/i, "Lazer"],
  [/c[aâ]mera|ring ?light|trip[eé]|microfone|lente|notebook|kabum/i, "Equipamentos"],
];
function palpiteCategoria(descricao, tipo) {
  if (tipo === "receita") {
    if (/tiktok/i.test(descricao)) return "TikTok";
    if (/ugc/i.test(descricao)) return "UGC Creator";
    if (/publi|campanha|marca|parceria/i.test(descricao)) return "Publicidade";
    return "Outros";
  }
  return PALAVRAS_DESPESA.find(([re]) => re.test(descricao))?.[1] || "Outros";
}

// "R$ 1.234,56", "-45.90", "45,9" e "(12,00)" viram número (negativo quando tem sinal de menos ou parênteses).
function numeroBR(texto) {
  let s = String(texto ?? "").replace(/R\$|\s/g, "");
  if (!s) return null;
  const negativo = /^-|-$|^\(.*\)$/.test(s);
  s = s.replace(/[()+-]/g, "");
  if (s.includes(",") && s.includes(".")) s = s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  else if (s.includes(",")) s = s.replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  const n = Number(s);
  return Number.isFinite(n) ? (negativo ? -n : n) : null;
}

// Data em vários formatos (15/01, 15/01/26, 15/01/2026, 2026-01-15, 20260115) vira "2026-01-15".
function dataDe(texto) {
  const s = String(texto || "").trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/) || s.match(/^(\d{4})(\d{2})(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (!m) return null;
  const ano = m[3] ? (m[3].length === 2 ? `20${m[3]}` : m[3]) : String(anoFin);
  const [d, mes] = [Number(m[1]), Number(m[2])];
  if (d < 1 || d > 31 || mes < 1 || mes > 12) return null;
  return `${ano}-${String(mes).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// Lista colada (uma transação por linha). Sem sinal = despesa; "+" ou "recebi/pix recebido/salário" = receita.
function lerTexto(texto, cartao) {
  const itens = [];
  for (const bruta of String(texto).split(/\r?\n/)) {
    let linha = bruta.trim();
    if (!linha) continue;
    let parcela = null;
    linha = linha.replace(/\(?\s*parcela\s*(\d{1,2})\s*(?:\/|de)\s*(\d{1,2})\s*\)?/i, (_, a, b) => { parcela = `${a}/${b}`; return " "; });
    const valores = [...linha.matchAll(/[-+]?\s*(?:R\$\s*)?\d{1,3}(?:\.\d{3})*,\d{2}|[-+]?\s*(?:R\$\s*)?\d+[.,]\d{2}(?!\d)/g)];
    if (!valores.length) continue;
    const ultimo = valores.at(-1);
    const valor = numeroBR(ultimo[0]);
    if (valor === null || valor === 0) continue;
    linha = linha.slice(0, ultimo.index) + linha.slice(ultimo.index + ultimo[0].length);
    let data = null;
    linha = linha.replace(/^\s*(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|\d{4}-\d{2}-\d{2})/, (x) => { data = dataDe(x); return " "; });
    if (!parcela) linha = linha.replace(/\b(\d{1,2})\/(\d{1,2})\b/, (x, a, b) => { if (Number(a) <= Number(b)) { parcela = `${a}/${b}`; return " "; } return x; });
    const descricao = linha.replace(/\s+[-–|:]\s*$|^\s*[-–|:]\s+/g, "").replace(/\s{2,}/g, " ").trim() || "Sem descrição";
    const receita = /^\s*\+/.test(ultimo[0]) || /recebi|recebido|sal[aá]rio|transfer[eê]ncia recebida|pix de\b/i.test(descricao);
    const tipo = receita ? "receita" : "despesa";
    itens.push({ data: data || iso(new Date()), descricao, valor: Math.abs(valor), tipo, categoria: palpiteCategoria(descricao, tipo), parcela, cartao });
  }
  return itens;
}

// Soma um mês mantendo o dia (31/01 + 1 mês = 28 ou 29/02).
function somarMes(dataIso, n) {
  const [y, m, d] = dataIso.split("-").map(Number);
  const ultimo = new Date(y, m - 1 + n + 1, 0).getDate();
  return iso(new Date(y, m - 1 + n, Math.min(d, ultimo)));
}

async function telaFinanceiro(p) {
  // Com o olhinho fechado, todo valor em reais desta tela vira "R$ •••••".
  function reais(v) { return ocultarFin ? "R$ •••••" : dinheiro(v); }
  let transacoes = [], criadas = [], metas = [], anteriores = [];
  const selFin = new Set(); // transações marcadas na tabela
  const caixa = h("div");
  p.append(caixa);
  // As que vêm prontas (menos as que você escondeu) + as que você criou.
  const categoriasDe = (tipo) => {
    const ocultas = new Set(criadas.filter((c) => c.tipo === tipo && c.oculta).map((c) => c.nome));
    return [...CATS_FIN[tipo].filter((c) => !ocultas.has(c.nome)),
      ...criadas.filter((c) => c.tipo === tipo && !c.oculta && !CATS_FIN[tipo].some((x) => x.nome === c.nome))];
  };
  // O emoji continua aparecendo nas transações antigas mesmo se a categoria foi excluída.
  const emojiFin = (nome, tipo) => [...criadas.filter((c) => c.tipo === tipo && c.emoji), ...CATS_FIN[tipo]].find((c) => c.nome === nome)?.emoji || "📦";

  // Excluir categoria: a que você criou é apagada; a que vem pronta fica escondida. "Outros" não sai.
  async function excluirCategoria(tipo, nome) {
    if (Dados.semBanco) { avisoSemBanco(); return false; }
    const usadas = transacoes.filter((t) => t.tipo === tipo && t.categoria === nome).length;
    if (!confirm(`Excluir "${nome}"?${usadas ? `\n\nAs transações que já usam essa categoria continuam com ela.` : ""}`)) return false;
    const pronta = CATS_FIN[tipo].some((c) => c.nome === nome);
    const ok = pronta ? (await Dados.salvarCategoriaFin({ tipo, nome, oculta: true })).ok : await Dados.apagarCategoriaFin(tipo, nome);
    if (!ok) { toast("Não consegui excluir.", "erro"); return false; }
    criadas = criadas.filter((c) => !(c.tipo === tipo && c.nome === nome));
    if (pronta) criadas.push({ tipo, nome, oculta: true });
    toast(`"${nome}" excluída.`);
    return true;
  }
  await carregar();

  async function carregar() {
    const de = mesFin === "anual" ? `${anoFin}-01-01` : `${anoFin}-${String(mesFin + 1).padStart(2, "0")}-01`;
    const ate = mesFin === "anual" ? `${anoFin}-12-31` : iso(new Date(anoFin, mesFin + 1, 0));
    // Período anterior, pra comparar (mês passado, ou o ano passado na visão Anual).
    const deAnt = mesFin === "anual" ? `${anoFin - 1}-01-01` : iso(new Date(anoFin, mesFin - 1, 1));
    const ateAnt = mesFin === "anual" ? `${anoFin - 1}-12-31` : iso(new Date(anoFin, mesFin, 0));
    [transacoes, criadas, metas, anteriores] = await Promise.all([
      Dados.lista("fin_transacoes", (c) => c.gte("data", de).lte("data", ate).order("data", { ascending: false }).order("created_at", { ascending: false })),
      Dados.lista("fin_categorias", (c) => c.order("created_at")),
      Dados.lista("fin_metas", (c) => c.like("mes", `${anoFin}-%`)),
      Dados.lista("fin_transacoes", (c) => c.gte("data", deAnt).lte("data", ateAnt)),
    ]);
    desenhar();
    atualizarAvisos(true);
  }

  // Meta do mês (cartão Receita) ou do ano (botão lá em cima). A do ano fica guardada como o "mês 00".
  function definirMeta(doAno) {
    if (!doAno && mesFin === "anual") { definirMeta(true); return; }
    const mes = doAno ? `${anoFin}-00` : `${anoFin}-${String(mesFin + 1).padStart(2, "0")}`;
    const atual = metas.find((m) => m.mes === mes)?.meta_receita;
    abrirFormulario({
      titulo: doAno ? `Meta anual de receita: ${anoFin}` : `Meta de receita: ${MESES[mesFin]} ${anoFin}`,
      campos: [{ chave: "meta_receita", rotulo: `Quanto você quer faturar no ${doAno ? "ano" : "mês"} (R$)`, tipo: "numero", largo: true, placeholder: doAno ? "Ex: 60.000,00" : "Ex: 5.000,00" }],
      valores: { meta_receita: atual ? String(atual).replace(".", ",") : "" },
      aoSalvar: async (d) => {
        if (Dados.semBanco) { avisoSemBanco(); return false; }
        const r = await Dados.gravar("fin_metas", { mes, meta_receita: d.meta_receita });
        if (!r.ok) { toast(`Não consegui salvar: ${r.erro}`, "erro"); return false; }
        await carregar();
        return true;
      },
    });
  }

  async function apagar(t) {
    if (t.recorrencia && confirm(`"${t.descricao}" se repete todo mês. Apagar esta e as próximas?\n\nOK = esta e as próximas · Cancelar = escolher outra opção`)) {
      if (await Dados.apagarRecorrencia(t.recorrencia, t.data)) { toast("Transações apagadas."); carregar(); } else toast("Não consegui apagar.", "erro");
      return;
    }
    if (!confirm(`Apagar só "${t.descricao}" (${dataBR(t.data)})?`)) return;
    if (await Dados.apagarLinha("fin_transacoes", t.id)) { toast("Transação apagada."); carregar(); } else toast("Não consegui apagar.", "erro");
  }

  function desenhar() {
    const concl = transacoes.filter((t) => t.status === "concluido");
    const soma = (lista) => lista.reduce((s, t) => s + Number(t.valor || 0), 0);
    const entradas = soma(concl.filter((t) => t.tipo === "receita"));
    const saidas = soma(concl.filter((t) => t.tipo === "despesa"));
    const aReceber = soma(transacoes.filter((t) => t.tipo === "receita" && t.status === "pendente"));
    const receitas = transacoes.filter((t) => t.tipo === "receita");
    const despesas = transacoes.filter((t) => t.tipo === "despesa");
    const receitaPeriodo = soma(receitas);
    const nomePeriodo = mesFin === "anual" ? String(anoFin) : `${MESES[mesFin]} ${anoFin}`.toUpperCase();
    const metaAno = Number(metas.find((m) => m.mes === `${anoFin}-00`)?.meta_receita || 0);
    const meta = mesFin === "anual"
      ? Number(metaAno || metas.filter((m) => !m.mes.endsWith("-00")).reduce((s, m) => s + Number(m.meta_receita || 0), 0))
      : Number(metas.find((m) => m.mes === `${anoFin}-${String(mesFin + 1).padStart(2, "0")}`)?.meta_receita || 0);

    // Comparação com o período anterior: (atual - anterior) / anterior. Sem valor antes, não dá pra comparar.
    const conclAnt = anteriores.filter((t) => t.status === "concluido");
    const entradasAnt = soma(conclAnt.filter((t) => t.tipo === "receita"));
    const saidasAnt = soma(conclAnt.filter((t) => t.tipo === "despesa"));
    const receitaAnt = soma(anteriores.filter((t) => t.tipo === "receita"));
    const variacao = (atual, antes) => (antes ? Math.round(((atual - antes) / Math.abs(antes)) * 100) : null);
    const vsQuando = mesFin === "anual" ? "vs ano anterior" : "vs mês anterior";
    // menosEhBom: nas saídas, cair é bom (verde) e subir é ruim (vermelho).
    const selo = (pct, menosEhBom) => {
      if (pct === null) return h("span", { class: "fin-variacao fin-variacao-neutra", title: `Sem valor no período anterior pra comparar` }, `sem comparação ${vsQuando.replace("vs ", "com o ")}`);
      const bom = menosEhBom ? pct <= 0 : pct >= 0;
      return h("span", { class: `fin-variacao ${bom ? "fin-txt-verde" : "fin-txt-vermelho"}`, title: vsQuando }, `${pct > 0 ? "+" : ""}${pct}%`);
    };

    const cartao = (rotulo, valor, cor, ic, extra, comparacao) => h("div", { class: `cartao fin-cartao${extra ? ` ${extra}` : ""}` },
      h("div", { class: "fin-cartao-topo" }, h("span", {}, rotulo), h("span", { class: `fin-icone fin-${cor}` }, icone(ic))),
      h("strong", { class: `fin-valor fin-txt-${cor}` }, reais(valor)),
      comparacao || null);

    // Agrupa por categoria: [[nome, total], ...] do maior pro menor
    const porCategoria = (lista) => [...lista.reduce((m, t) => m.set(t.categoria, (m.get(t.categoria) || 0) + Number(t.valor)), new Map())].sort((a, b) => b[1] - a[1]);
    const barras = (lista, tipo) => {
      const total = lista.reduce((s, [, v]) => s + v, 0);
      return h("ul", { class: "fin-barras" }, lista.map(([nome, v]) => h("li", {},
        h("div", { class: "fin-barra-topo" }, h("span", {}, emojiFin(nome, tipo), " ", nome), h("strong", {}, reais(v)), h("span", { class: "fin-pct" }, `${Math.round((v / total) * 100)}%`)),
        h("div", { class: `plan-barra fin-barra-${tipo}` }, h("span", { style: `width:${(v / total) * 100}%` })))));
    };

    const saidasAberto = h("details", { class: "cartao fin-saidas" },
      h("summary", {}, h("span", {}, mesFin === "anual" ? "Saídas do ano" : "Saídas do mês"), h("strong", {}, reais(soma(despesas))), icone("baixo")),
      despesas.length ? barras(porCategoria(despesas), "despesa") : h("p", { class: "fin-vazio-mini" }, "Nenhuma despesa no período"));

    const visiveis = transacoes.filter((t) => filtroFin === "todas" || (filtroFin === "receitas" ? t.tipo === "receita" : t.tipo === "despesa"));

    const anoHoje = new Date().getFullYear();
    const anos = [];
    for (let a = Math.min(anoFin, anoHoje - 3); a <= Math.max(anoFin, anoHoje + 1); a++) anos.push(a);
    const nomeMes = mesFin === "anual" ? "Ano" : MESES[mesFin].charAt(0).toUpperCase() + MESES[mesFin].slice(1);

    caixa.replaceChildren(
      h("div", { class: "fin-topo" },
        h("span", { class: "fin-topo-icone" }, icone("carteira")),
        h("div", { class: "fin-topo-textos" },
          h("h1", {}, `Planejamento de ${nomeDona()}`),
          h("p", { class: "sub" }, `${nomeMes} de ${anoFin}`)),
        h("div", { class: "fin-topo-acoes" }, botaoAvisos("financeiro"),
          h("button", {
            class: "btn btn-fantasma btn-icone fin-olho", type: "button", "aria-pressed": String(ocultarFin),
            title: ocultarFin ? "Mostrar valores" : "Esconder valores", "aria-label": ocultarFin ? "Mostrar valores" : "Esconder valores",
            onclick: () => { ocultarFin = !ocultarFin; try { localStorage.setItem("fin_ocultar", ocultarFin ? "1" : ""); } catch { /* ok */ } desenhar(); },
          }, icone(ocultarFin ? "olhoFechado" : "olho")),
          h("select", { class: "campo fin-ano-sel", "aria-label": "Ano", onchange: (e) => { anoFin = Number(e.target.value); carregar(); } },
            anos.map((a) => h("option", { value: String(a), selected: a === anoFin }, String(a)))),
          h("button", { class: "btn fin-definir-meta", type: "button", title: `Meta de receita de ${anoFin}`, onclick: () => definirMeta(true) },
            metaAno ? `🎯 Meta ${anoFin}: ${reais(metaAno)}` : "🎯 Definir meta"),
          h("button", { class: "btn btn-primario fin-nova", type: "button", onclick: () => abrirTransacao(null) }, icone("mais"), "Nova Transação"))),
      h("div", { class: "fin-barra-meses" },
        h("nav", { class: "fin-meses", "aria-label": "Período" },
          h("button", { type: "button", class: `fin-anual${mesFin === "anual" ? " ativo" : ""}`, "aria-pressed": String(mesFin === "anual"), onclick: () => { mesFin = "anual"; carregar(); } }, "📊 Anual"),
          MESES_CURTOS.map((m, i) => h("button", { type: "button", class: `fin-mes${mesFin === i ? " ativo" : ""}`, "aria-pressed": String(mesFin === i), onclick: () => { mesFin = i; carregar(); } }, m))),
      ),
      h("div", { class: "fin-cartoes" },
        cartao("Entradas", entradas, "verde", "subir", null, selo(variacao(entradas, entradasAnt))),
        cartao("Saídas", saidas, "vermelho", "descer", null, selo(variacao(saidas, saidasAnt), true)),
        cartao("Saldo", entradas - saidas, entradas - saidas >= 0 ? "verde" : "vermelho", "carteira", null, selo(variacao(entradas - saidas, entradasAnt - saidasAnt))),
        cartao("A receber", aReceber, "neutro", "relogio", "fin-areceber")),
      h("div", { class: "fin-meio" },
        h("div", { class: "fin-coluna" },
          h("div", { class: "cartao fin-receita" },
            h("span", { class: "fin-rotulo" }, `Receita · ${nomePeriodo}`),
            h("strong", {}, reais(receitaPeriodo)),
            meta > 0
              ? h("div", {},
                h("button", { type: "button", class: "fin-meta-link", onclick: () => definirMeta(mesFin === "anual") }, `${Math.round((receitaPeriodo / meta) * 100)}% da meta ${mesFin === "anual" ? "do ano" : "do mês"} de ${reais(meta)}`),
                h("div", { class: "plan-barra fin-barra-receita" }, h("span", { style: `width:${Math.min(100, (receitaPeriodo / meta) * 100)}%` })))
              : h("button", { type: "button", class: "fin-meta-link", onclick: () => definirMeta(mesFin === "anual") }, mesFin === "anual" ? "sem meta do ano · definir meta" : "sem meta do mês · definir meta"),
            (() => {
              const pct = variacao(receitaPeriodo, receitaAnt);
              if (pct === null) return null;
              return h("div", { class: "fin-receita-comp" },
                h("span", { class: `fin-pilula-var ${pct >= 0 ? "fin-sobe" : "fin-desce"}` }, icone(pct >= 0 ? "subir" : "descer"), `${pct >= 0 ? "↑" : "↓"}${Math.abs(pct)}%`),
                h("span", {}, vsQuando));
            })()),
          saidasAberto),
        h("div", { class: "cartao fin-origem" },
          h("span", { class: "fin-rotulo" }, "De onde vem o dinheiro"),
          receitas.length ? barras(porCategoria(receitas), "receita") : h("p", { class: "fin-vazio-mini" }, "Nenhuma receita no período"))),
      h("div", { class: "fin-transacoes-topo" },
        h("h2", {}, "Transações"),
        h("div", { class: "fin-filtro", role: "group", "aria-label": "Filtrar transações" },
          [["todas", "Todas"], ["receitas", "Receitas"], ["despesas", "Despesas"], ["historico", "Histórico"]].map(([v, t]) => h("button", {
            type: "button", class: filtroFin === v ? "ativo" : "", "aria-pressed": String(filtroFin === v), onclick: () => { filtroFin = v; desenhar(); },
          }, t)))),
      filtroFin === "historico"
        ? historicoFinanceiro()
        : visiveis.length
          ? tabelaTransacoes(visiveis)
          : h("div", { class: "cartao fin-vazio" }, h("p", {}, "Nenhuma transação no período."),
            h("button", { class: "btn btn-primario fin-nova", type: "button", onclick: () => abrirTransacao(null) }, icone("mais"), "Adicionar transação")),
    );
  }

  // ----- Histórico: evolução dos últimos 6 meses (recebido, pendente e despesas) -----
  function historicoFinanceiro() {
    const caixaH = h("div", { class: "cartao fin-historico" },
      h("h3", { class: "fin-rotulo" }, "Evolução financeira"),
      h("p", { class: "carregando" }, "Carregando..."));
    // Termina no mês escolhido (na visão Anual, no mês atual ou em dezembro de anos passados)
    const hojeD = new Date();
    const fimMes = mesFin === "anual" ? (anoFin === hojeD.getFullYear() ? hojeD.getMonth() : anoFin < hojeD.getFullYear() ? 11 : 0) : mesFin;
    const meses = Array.from({ length: 6 }, (_, i) => new Date(anoFin, fimMes - 5 + i, 1));
    const de = iso(meses[0]);
    const ate = iso(new Date(anoFin, fimMes + 1, 0));
    Dados.lista("fin_transacoes", (c) => c.gte("data", de).lte("data", ate)).then((lista) => {
      const dados = meses.map((m) => {
        const chave = chaveMes(m);
        const doMes = lista.filter((t) => String(t.data || "").startsWith(chave));
        const soma = (f) => doMes.filter(f).reduce((s, t) => s + Number(t.valor || 0), 0);
        return {
          rotulo: `${MESES_CURTOS[m.getMonth()]}/${String(m.getFullYear()).slice(2)}`,
          recebido: soma((t) => t.tipo === "receita" && t.status === "concluido"),
          pendente: soma((t) => t.tipo === "receita" && t.status !== "concluido"),
          despesas: soma((t) => t.tipo === "despesa"),
        };
      });
      caixaH.replaceChildren(h("h3", { class: "fin-rotulo" }, "Evolução financeira"), ...graficoEvolucao(dados));
    });
    return caixaH;
  }

  // Gráfico de linhas suaves com área, cruz ao passar o mouse, legenda e tabela
  function graficoEvolucao(dados) {
    const SERIES = [
      ["despesas", "Despesas", "#c94a5f"],
      ["pendente", "Pendente", "#c98a2b"],
      ["recebido", "Recebido", "#14876f"],
    ];
    const L = 800, A = 260, mE = 64, mD = 92, mT = 14, mB = 34;
    const largura = L - mE - mD, altura = A - mT - mB;
    const maior = Math.max(...dados.flatMap((d) => SERIES.map(([k]) => d[k])), 0);
    // Topo "redondo" pro eixo (300, 600, 900, 1.200...)
    const passo = maior > 0 ? (() => { const bruto = maior / 4; const pot = 10 ** Math.floor(Math.log10(bruto)); return [1, 2, 2.5, 3, 5, 10].map((m) => m * pot).find((m) => m >= bruto); })() : 1;
    const topo = passo * 4;
    const x = (i) => mE + (dados.length > 1 ? (i / (dados.length - 1)) * largura : largura / 2);
    const y = (v) => mT + altura - (v / topo) * altura;
    const NS = "http://www.w3.org/2000/svg";
    const el = (tag, at = {}, ...filhos) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(at)) e.setAttribute(k, v); e.append(...filhos); return e; };
    const compacto = (v) => (ocultarFin ? "" : `R$ ${v.toLocaleString("pt-BR", { notation: "compact", maximumFractionDigits: 1 })}`);

    // Curva suave que não passa do valor real (monotônica): nunca desenha valor negativo
    function caminho(pts) {
      if (pts.length < 2) return `M${pts[0][0]},${pts[0][1]}`;
      const n = pts.length, dx = [], m = [], t = [];
      for (let i = 0; i < n - 1; i++) { dx[i] = pts[i + 1][0] - pts[i][0]; m[i] = (pts[i + 1][1] - pts[i][1]) / dx[i]; }
      t[0] = m[0]; t[n - 1] = m[n - 2];
      for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
      for (let i = 0; i < n - 1; i++) {
        if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
        const a = t[i] / m[i], b = t[i + 1] / m[i], s = a * a + b * b;
        if (s > 9) { const k = 3 / Math.sqrt(s); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; }
      }
      let d = `M${pts[0][0]},${pts[0][1]}`;
      for (let i = 0; i < n - 1; i++) {
        const h3 = dx[i] / 3;
        d += ` C${pts[i][0] + h3},${pts[i][1] + t[i] * h3} ${pts[i + 1][0] - h3},${pts[i + 1][1] - t[i + 1] * h3} ${pts[i + 1][0]},${pts[i + 1][1]}`;
      }
      return d;
    }

    const svg = el("svg", { viewBox: `0 0 ${L} ${A}`, class: "fin-evolucao", role: "img", "aria-label": "Evolução financeira dos últimos 6 meses: recebido, pendente e despesas" });
    const defs = el("defs");
    svg.append(defs);
    // Grade e eixo
    for (let i = 0; i <= 4; i++) {
      const v = passo * i;
      svg.append(el("line", { x1: mE, x2: L - mD, y1: y(v), y2: y(v), class: i ? "fe-grade" : "fe-base" }));
      if (!ocultarFin) svg.append(el("text", { x: mE - 10, y: y(v) + 4, "text-anchor": "end", class: "fe-eixo" }, compacto(v)));
    }
    dados.forEach((d, i) => svg.append(el("text", { x: x(i), y: A - 10, "text-anchor": i === 0 ? "start" : i === dados.length - 1 ? "end" : "middle", class: "fe-eixo" }, d.rotulo)));
    // Áreas e linhas
    const rotulosFim = [];
    SERIES.forEach(([k, nome, cor], si) => {
      const pts = dados.map((d, i) => [x(i), y(d[k])]);
      const linha = caminho(pts);
      defs.append(el("linearGradient", { id: `fe-g-${k}`, x1: 0, y1: 0, x2: 0, y2: 1 },
        el("stop", { offset: "0%", "stop-color": cor, "stop-opacity": ".16" }), el("stop", { offset: "100%", "stop-color": cor, "stop-opacity": "0" })));
      svg.append(el("path", { d: `${linha} L${pts.at(-1)[0]},${y(0)} L${pts[0][0]},${y(0)} Z`, fill: `url(#fe-g-${k})` }));
      svg.append(el("path", { d: linha, fill: "none", stroke: cor, "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round", class: `fe-linha fe-${k}` }));
      rotulosFim.push({ y: pts.at(-1)[1], nome, cor, si });
    });
    // Nome de cada linha no fim (afastados pra não encavalar)
    rotulosFim.sort((a, b) => a.y - b.y);
    for (let i = 1; i < rotulosFim.length; i++) if (rotulosFim[i].y - rotulosFim[i - 1].y < 15) rotulosFim[i].y = rotulosFim[i - 1].y + 15;
    rotulosFim.forEach((r) => {
      svg.append(el("circle", { cx: L - mD + 10, cy: r.y, r: 4, fill: r.cor }));
      svg.append(el("text", { x: L - mD + 18, y: r.y + 4, class: "fe-nome" }, r.nome));
    });
    // Passar o mouse: linha vertical + bolinhas + quadro com os valores do mês
    const cruz = el("line", { y1: mT, y2: y(0), class: "fe-cruz", visibility: "hidden" });
    const pontos = SERIES.map(([, , cor]) => el("circle", { r: 5, fill: cor, stroke: "#fff", "stroke-width": 2, visibility: "hidden" }));
    svg.append(cruz, ...pontos);
    const dica = h("div", { class: "fe-dica", hidden: true, role: "status" });
    const mostrar = (i) => {
      const d = dados[i];
      cruz.setAttribute("x1", x(i)); cruz.setAttribute("x2", x(i)); cruz.setAttribute("visibility", "visible");
      pontos.forEach((p, si) => { p.setAttribute("cx", x(i)); p.setAttribute("cy", y(d[SERIES[si][0]])); p.setAttribute("visibility", "visible"); });
      dica.replaceChildren(h("strong", {}, d.rotulo),
        ...[...SERIES].reverse().map(([k, nome, cor]) => h("span", {}, h("i", { style: `background:${cor}` }), nome, h("b", {}, reais(d[k])))));
      dica.hidden = false;
      dica.style.left = `${(x(i) / L) * 100}%`;
      dica.classList.toggle("fe-dica-esq", i > dados.length / 2);
    };
    const esconder = () => { cruz.setAttribute("visibility", "hidden"); pontos.forEach((p) => p.setAttribute("visibility", "hidden")); dica.hidden = true; };
    dados.forEach((d, i) => {
      const meia = dados.length > 1 ? largura / (dados.length - 1) / 2 : largura / 2;
      const alvo = el("rect", { x: x(i) - meia, y: mT, width: meia * 2, height: altura, fill: "transparent", tabindex: "0", "aria-label": `${d.rotulo}: recebido ${reais(d.recebido)}, pendente ${reais(d.pendente)}, despesas ${reais(d.despesas)}` });
      alvo.addEventListener("mouseenter", () => mostrar(i));
      alvo.addEventListener("focus", () => mostrar(i));
      alvo.addEventListener("blur", esconder);
      svg.append(alvo);
    });
    svg.addEventListener("mouseleave", esconder);

    const legenda = h("div", { class: "fe-legenda" }, SERIES.map(([, nome, cor]) => h("span", {}, h("i", { style: `background:${cor}` }), nome)));
    const tabela = h("details", { class: "fe-tabela" }, h("summary", {}, "Ver em tabela"),
      h("table", {}, h("thead", {}, h("tr", {}, h("th", {}, "Mês"), h("th", {}, "Recebido"), h("th", {}, "Pendente"), h("th", {}, "Despesas"))),
        h("tbody", {}, dados.map((d) => h("tr", {}, h("td", {}, d.rotulo), h("td", {}, reais(d.recebido)), h("td", {}, reais(d.pendente)), h("td", {}, reais(d.despesas)))))));
    if (!maior) return [h("p", { class: "fin-vazio-mini" }, "Nenhuma transação nos últimos 6 meses.")];
    return [h("div", { class: "fe-area" }, svg, dica), legenda, tabela];
  }

  // Valor líquido: o que entrou ou saiu de verdade. Vazio = igual ao bruto. Despesa aparece negativa.
  function liquidoDe(t) { return Number(t.valor_liquido ?? t.valor); }
  function textoStatus(t) { return t.status === "concluido" ? "Concluído" : t.tipo === "receita" ? "A receber" : "A pagar"; }

  async function trocarStatus(t) {
    const status = t.status === "concluido" ? "pendente" : "concluido";
    if (await salvarOuAvisar("fin_transacoes", { id: t.id, status })) { t.status = status; desenhar(); }
  }

  // Ações com as marcadas
  async function concluirMarcadas() {
    for (const t of transacoes.filter((x) => selFin.has(x.id) && x.status !== "concluido")) {
      if (!(await salvarOuAvisar("fin_transacoes", { id: t.id, status: "concluido" }))) break;
    }
    selFin.clear(); carregar();
  }
  async function apagarMarcadas() {
    const n = selFin.size;
    if (!confirm(`Apagar ${n} ${n === 1 ? "transação" : "transações"}? Isso não tem volta.`)) return;
    for (const id of selFin) await Dados.apagarLinha("fin_transacoes", id);
    selFin.clear(); toast(`${n} ${n === 1 ? "transação apagada" : "transações apagadas"}.`); carregar();
  }

  function tabelaTransacoes(lista) {
    for (const id of [...selFin]) if (!transacoes.some((t) => t.id === id)) selFin.delete(id);
    const todas = lista.length > 0 && lista.every((t) => selFin.has(t.id));
    const caixaMarcar = (marcado, rotulo, aoMudar) => h("input", { type: "checkbox", class: "fin-check", checked: marcado, "aria-label": rotulo, onchange: aoMudar });
    return h("div", { class: "cartao fin-tabela" },
      selFin.size ? h("div", { class: "fin-massa" },
        h("strong", {}, `${selFin.size} ${selFin.size === 1 ? "selecionada" : "selecionadas"}`),
        h("button", { class: "btn btn-pequeno", type: "button", onclick: concluirMarcadas }, icone("check"), "Marcar como concluído"),
        h("button", { class: "btn btn-pequeno btn-perigo", type: "button", onclick: apagarMarcadas }, icone("lixo"), "Apagar"),
        h("button", { class: "btn btn-fantasma btn-pequeno", type: "button", onclick: () => { selFin.clear(); desenhar(); } }, "Cancelar")) : null,
      h("div", { class: "fin-tr fin-th" },
        caixaMarcar(todas, "Selecionar todas", () => { if (todas) lista.forEach((t) => selFin.delete(t.id)); else lista.forEach((t) => selFin.add(t.id)); desenhar(); }),
        h("span", {}, "Fonte"), h("span", {}, "Descrição"), h("span", {}, "Cliente"),
        h("span", {}, "Valor bruto"), h("span", {}, "Valor líquido"), h("span", {}, "Data"), h("span", {}, "Status"), h("span")),
      lista.map((t) => {
        const receita = t.tipo === "receita";
        const liquido = liquidoDe(t);
        return h("div", {
          class: `fin-tr${selFin.has(t.id) ? " marcada" : ""}`,
          onclick: (e) => { if (!e.target.closest("input, button")) abrirTransacao(t); },
        },
          caixaMarcar(selFin.has(t.id), `Selecionar ${t.descricao}`, () => { selFin.has(t.id) ? selFin.delete(t.id) : selFin.add(t.id); desenhar(); }),
          h("span", { class: "fin-td-fonte", "data-rotulo": "Fonte" },
            h("span", { "aria-hidden": "true" }, emojiFin(t.categoria, t.tipo)),
            h("span", { class: "fin-td-texto", title: t.categoria }, t.categoria),
            h("span", { class: "fin-escopo", title: t.escopo === "empresa" ? "Empresa" : "Pessoal" }, t.escopo === "empresa" ? "💼" : "👤")),
          // Nome inteiro (quebra linha se for grande); as etiquetas vão pra baixo quando não cabem.
          h("span", { class: "fin-td-desc", "data-rotulo": "Descrição", title: t.descricao },
            h("span", { class: "fin-td-nome" }, t.descricao),
            t.recorrencia ? h("span", { class: "fin-tag fin-tag-azul" }, icone("atualizar"), "Recorrente") : null,
            t.parcela ? h("span", { class: "fin-tag" }, `${t.parcela}`) : null),
          h("span", { class: "fin-td-cliente", "data-rotulo": "Cliente", title: t.cliente || "" }, t.cliente || "-"),
          h("span", { class: `fin-txt-${receita ? "verde" : "vermelho"}`, "data-rotulo": "Valor bruto" }, reais(t.valor)),
          h("span", { class: `fin-txt-${receita ? "verde" : "vermelho"}`, "data-rotulo": "Valor líquido" }, `${receita ? "" : "-"}${reais(liquido)}`),
          h("span", { class: "fin-td-data", "data-rotulo": "Data" }, dataBR(t.data)),
          h("span", { "data-rotulo": "Status" },
            h("button", {
              type: "button", class: `fin-status ${t.status === "concluido" ? "fin-status-ok" : "fin-status-pendente"}`,
              title: "Clique pra trocar", "aria-label": `Status: ${textoStatus(t)}. Clique pra trocar.`, onclick: () => trocarStatus(t),
            }, textoStatus(t))),
          h("button", { type: "button", class: "fin-apagar", "aria-label": `Apagar ${t.descricao}`, onclick: () => apagar(t) }, icone("lixo")));
      }));
  }

  // ----- Nova Transação: Manual, Texto (colar lista) e Extrato (CSV/OFX) -----
  function abrirTransacao(existente) {
    const fechar = () => { fundo.remove(); document.removeEventListener("keydown", aoTeclar); };
    const aoTeclar = (e) => { if (e.key === "Escape") fechar(); };
    let aba = "manual";
    const abas = h("div", { class: "fin-abas", role: "tablist" });
    const corpo = h("div", { class: "fin-corpo" });
    const rodape = h("div", { class: "fin-rodape" });
    const caixaJanela = h("div", { class: "fin-janela", role: "dialog", "aria-modal": "true", "aria-label": existente ? "Editar Transação" : "Nova Transação" },
      h("div", { class: "fin-janela-topo" },
        h("button", { class: "fin-voltar", type: "button", onclick: fechar }, icone("voltar"), "Voltar"),
        h("h2", {}, existente ? "Editar Transação" : "Nova Transação"),
        h("button", { class: "btn btn-fantasma btn-icone", type: "button", "aria-label": "Fechar", onclick: fechar }, icone("x"))),
      existente ? null : abas, corpo, rodape);
    const fundo = h("div", { class: "jm-fundo", onmousedown: (e) => { if (e.target === fundo) fechar(); } }, caixaJanela);
    document.body.append(fundo);
    document.addEventListener("keydown", aoTeclar);

    const trocar = (nova) => { aba = nova; desenharAbas(); ({ manual: manual, texto: texto })[aba](); };
    const desenharAbas = () => abas.replaceChildren(...[["manual", "Manual", null], ["texto", "Colar texto", "brilho"]].map(([v, t, ic]) =>
      h("button", { type: "button", role: "tab", class: `fin-aba${aba === v ? " ativa" : ""}`, "aria-selected": String(aba === v), onclick: () => trocar(v) }, ic ? icone(ic) : null, t)));

    // --- Manual ---
    function manual() {
      const d = existente ? { ...existente, valor: String(existente.valor).replace(".", ","), valor_liquido: existente.valor_liquido == null ? "" : String(existente.valor_liquido).replace(".", ",") }
        : { tipo: "receita", escopo: "pessoal", categoria: "", cliente: "", descricao: "", valor: "", data: iso(new Date()), status: "concluido", recorrente: false, notas: "" };
      const salvar = h("button", { class: "btn btn-primario jm-principal", type: "button" }, existente ? "Salvar" : "Adicionar");
      const conferir = () => { salvar.disabled = !(d.categoria && String(d.descricao).trim() && numeroBR(d.valor) > 0 && d.data); };
      const par = (chave, opcoes) => h("div", { class: "fin-par" }, opcoes.map(([v, t, ic, cor]) => h("button", {
        type: "button", class: `fin-par-op${d[chave] === v ? ` ativo fin-par-${cor}` : ""}`, "aria-pressed": String(d[chave] === v),
        onclick: () => { d[chave] = v; if (chave === "tipo") d.categoria = ""; desenharManual(); },
      }, ic, t)));
      const grupo = (rotulo, campo, id) => h("div", { class: "jm-grupo" }, h("label", { class: "jm-rotulo", for: id }, rotulo), campo);
      const entrada = (chave, id, ph, extra = {}) => h("input", { class: "campo jm-campo", id, value: d[chave] ?? "", placeholder: ph, ...extra, oninput: (e) => { d[chave] = e.target.value; conferir(); } });

      function desenharManual() {
        const cats = categoriasDe(d.tipo);
        const criar = h("div", { class: "jm-nova-cat", hidden: true },
          h("input", { class: "campo jm-emoji", maxlength: 4, placeholder: "📦", "aria-label": "Emoji da categoria" }),
          h("input", { class: "campo", placeholder: "Nome da categoria", "aria-label": "Nome da categoria" }),
          h("button", {
            class: "btn btn-primario btn-pequeno", type: "button",
            onclick: async () => {
              const [emoji, nome] = [...criar.querySelectorAll("input")].map((i) => i.value.trim());
              if (!nome) return;
              if (cats.some((c) => c.nome.toLowerCase() === nome.toLowerCase())) { toast("Essa categoria já existe."); return; }
              if (Dados.semBanco) { avisoSemBanco(); return; }
              // Se for uma que você tinha excluído, ela volta.
              const r = await Dados.salvarCategoriaFin({ tipo: d.tipo, nome, emoji: emoji || "📦", oculta: false });
              if (!r.ok) { toast(`Não consegui salvar: ${r.erro}`, "erro"); return; }
              criadas = criadas.filter((c) => !(c.tipo === d.tipo && c.nome === nome));
              criadas.push({ tipo: d.tipo, nome, emoji: emoji || "📦", oculta: false });
              d.categoria = nome; desenharManual();
            },
          }, "Criar"));
        corpo.replaceChildren(h("div", { class: "fin-form" },
          grupo("Tipo", par("tipo", [["receita", "Receita", icone("subir"), "verde"], ["despesa", "Despesa", icone("descer"), "vermelho"]])),
          grupo(h("span", {}, "Tipo de gasto *"), par("escopo", [["pessoal", "Pessoal", "👤 ", "azul"], ["empresa", "Empresa", "💼 ", "azul"]])),
          grupo(h("span", {}, d.tipo === "receita" ? "Fonte da Receita *" : "Categoria da Despesa *"),
            h("div", { class: "fin-cats" },
              cats.map((c) => h("div", { class: "fin-cat-caixa" },
                h("button", {
                  type: "button", class: `jm-cat${d.categoria === c.nome ? " ativa" : ""}`, "aria-pressed": String(d.categoria === c.nome),
                  onclick: () => { d.categoria = c.nome; desenharManual(); },
                }, h("span", { class: "jm-cat-emoji", "aria-hidden": "true" }, c.emoji || "📦"), h("span", {}, c.nome)),
                c.nome === "Outros" ? null : h("button", {
                  type: "button", class: "fin-cat-excluir", title: "Excluir", "aria-label": `Excluir ${c.nome}`,
                  onclick: async () => { if (await excluirCategoria(d.tipo, c.nome)) { if (d.categoria === c.nome) d.categoria = ""; desenharManual(); } },
                }, icone("x")))),
              h("button", { type: "button", class: "jm-cat jm-cat-criar fin-cat-criar", onclick: () => { criar.hidden = false; criar.querySelectorAll("input")[1].focus(); } }, icone("mais"), h("span", {}, "Criar categoria")),
              criar)),
          grupo("Cliente (opcional)", entrada("cliente", "fin-cliente", d.tipo === "receita" ? "Nome do cliente" : "Ex: cliente desse gasto ou para quem foi"), "fin-cliente"),
          grupo(h("span", {}, "Descrição *"), entrada("descricao", "fin-descricao", d.tipo === "receita" ? "Ex: Projeto para marca X" : "Ex: Mercado do mês"), "fin-descricao"),
          h("div", { class: "jm-duas" },
            grupo(h("span", {}, "Valor bruto (R$) *"), entrada("valor", "fin-valor", "0,00", { inputmode: "decimal" }), "fin-valor"),
            grupo(h("span", {}, "Valor líquido (opcional)"), entrada("valor_liquido", "fin-liquido", "Igual ao bruto", { inputmode: "decimal", title: "O que entrou ou saiu de verdade, depois de impostos e taxas" }), "fin-liquido")),
          h("div", { class: "jm-duas" },
            grupo(h("span", {}, "Data *"), h("input", { class: "campo jm-campo", type: "date", id: "fin-data", value: d.data, oninput: (e) => { d.data = e.target.value; conferir(); } }), "fin-data"),
            grupo("Status", h("label", { class: "metas-select jm-select" },
              h("select", { id: "fin-status", onchange: (e) => { d.status = e.target.value; } },
                [["concluido", "Concluído"], ["pendente", d.tipo === "receita" ? "A receber" : "A pagar"]].map(([v, t]) => h("option", { value: v, selected: d.status === v }, t))),
              icone("baixo")), "fin-status")),
          existente ? null : h("button", {
            type: "button", class: "fin-recorrente", "aria-pressed": String(!!d.recorrente),
            onclick: (e) => { d.recorrente = !d.recorrente; e.currentTarget.setAttribute("aria-pressed", String(d.recorrente)); e.currentTarget.firstChild.classList.toggle("marcado", d.recorrente); },
          }, h("span", { class: `metas-circulo${d.recorrente ? " marcado" : ""}` }, icone("check")), icone("atualizar"), "Recorrente mensal (gera 6 meses)"),
          grupo("Notas (opcional)", h("textarea", { class: "campo jm-campo jm-area", id: "fin-notas", value: d.notas ?? "", placeholder: "Observações adicionais...", oninput: (e) => { d.notas = e.target.value; } }), "fin-notas")));
        conferir();
      }

      salvar.onclick = async () => {
        salvar.disabled = true;
        const base = {
          tipo: d.tipo, escopo: d.escopo, categoria: d.categoria, cliente: String(d.cliente || "").trim() || null,
          descricao: String(d.descricao).trim(), valor: numeroBR(d.valor), data: d.data, status: d.status, notas: String(d.notas || "").trim() || null,
          valor_liquido: String(d.valor_liquido ?? "").trim() ? Math.abs(numeroBR(d.valor_liquido) ?? 0) : null,
        };
        let ok;
        if (existente) ok = await salvarOuAvisar("fin_transacoes", { ...base, id: existente.id });
        else if (d.recorrente) {
          if (Dados.semBanco) { avisoSemBanco(); ok = false; }
          else {
            // 6 meses: o primeiro com o status escolhido, os próximos ficam pendentes (a receber / a pagar).
            const recorrencia = crypto.randomUUID();
            const r = await Dados.inserirVarias("fin_transacoes", Array.from({ length: 6 }, (_, i) => ({ ...base, data: somarMes(d.data, i), status: i === 0 ? d.status : "pendente", recorrencia })));
            if (!r.ok) toast(`Não consegui salvar: ${r.erro}`, "erro");
            ok = r.ok;
          }
        } else ok = await salvarOuAvisar("fin_transacoes", base);
        if (ok) { fechar(); toast(existente ? "Transação salva!" : d.recorrente ? "6 transações criadas (uma por mês)!" : "Transação adicionada!", "sucesso"); carregar(); }
        else conferir();
      };
      rodape.replaceChildren(h("button", { class: "btn jm-secundario", type: "button", onclick: fechar }, "Cancelar"), salvar);
      desenharManual();
    }

    // --- Revisão dos itens lidos da lista colada ---
    function revisar(itens, voltar) {
      if (!itens.length) { toast("Não encontrei nenhuma transação. Confira se cada linha tem um valor (ex: R$ 45,90)."); return; }
      itens.forEach((i) => { i.marcado = true; });
      const salvar = h("button", { class: "btn btn-primario jm-principal", type: "button" });
      const atualizarBotao = () => { const n = itens.filter((i) => i.marcado).length; salvar.textContent = `Adicionar ${n} ${n === 1 ? "transação" : "transações"}`; salvar.disabled = !n; };
      corpo.replaceChildren(h("div", { class: "fin-form" },
        h("p", { class: "fin-revisar-dica" }, `Encontrei ${itens.length} ${itens.length === 1 ? "transação" : "transações"}. Confira, troque a categoria se precisar e desmarque o que não quiser.`),
        h("div", { class: "fin-revisar" }, itens.map((i) => {
          const linha = h("div", { class: "fin-rev-linha" },
            h("button", {
              type: "button", class: "metas-circulo marcado", "aria-pressed": "true", "aria-label": `Incluir ${i.descricao}`,
              onclick: (e) => { i.marcado = !i.marcado; e.currentTarget.classList.toggle("marcado", i.marcado); e.currentTarget.setAttribute("aria-pressed", String(i.marcado)); linha.classList.toggle("desligada", !i.marcado); atualizarBotao(); },
            }, icone("check")),
            h("span", { class: "fin-data" }, dataCurta(i.data)),
            h("div", { class: "fin-desc" }, h("strong", {}, i.descricao), i.parcela ? h("span", {}, `parcela ${i.parcela}`) : null),
            h("label", { class: "metas-select fin-rev-cat" },
              h("select", { "aria-label": `Categoria de ${i.descricao}`, onchange: (e) => { i.categoria = e.target.value; } },
                categoriasDe(i.tipo).map((c) => h("option", { value: c.nome, selected: i.categoria === c.nome }, `${c.emoji} ${c.nome}`))),
              icone("baixo")),
            h("strong", { class: `fin-linha-valor fin-txt-${i.tipo === "receita" ? "verde" : "vermelho"}` }, `${i.tipo === "receita" ? "+" : "-"} ${reais(i.valor)}`));
          return linha;
        }))));
      salvar.onclick = async () => {
        if (Dados.semBanco) { avisoSemBanco(); return; }
        salvar.disabled = true;
        const linhas = itens.filter((i) => i.marcado).map((i) => ({
          tipo: i.tipo, escopo: "pessoal", categoria: i.categoria, descricao: i.descricao.slice(0, 200), valor: i.valor, data: i.data,
          status: "concluido", cartao: !!i.cartao, parcela: i.parcela,
        }));
        const r = await Dados.inserirVarias("fin_transacoes", linhas);
        if (!r.ok) { toast(`Não consegui salvar: ${r.erro}`, "erro"); atualizarBotao(); return; }
        fechar(); toast(`${linhas.length} ${linhas.length === 1 ? "transação adicionada" : "transações adicionadas"}!`, "sucesso"); carregar();
      };
      rodape.replaceChildren(h("button", { class: "btn jm-secundario", type: "button", onclick: voltar }, icone("voltar"), "Voltar"), salvar);
      atualizarBotao();
    }

    let cartaoExtrato = false;
    const tipoExtrato = (redesenhar) => h("div", { class: "jm-grupo" }, h("span", { class: "fin-rotulo-mini" }, "Tipo do extrato"),
      h("div", { class: "fin-par" }, [[false, "💳 Conta / Débito"], [true, "Cartão de Crédito"]].map(([v, t]) => h("button", {
        type: "button", class: `fin-par-op${cartaoExtrato === v ? " ativo fin-par-azul" : ""}`, "aria-pressed": String(cartaoExtrato === v),
        onclick: () => { cartaoExtrato = v; redesenhar(); },
      }, v ? icone("cartao") : null, t))));

    // --- Texto ---
    let textoColado = "";
    function texto() {
      const analisar = h("button", { class: "btn btn-primario fin-analisar", type: "button", disabled: !textoColado.trim(), onclick: () => revisar(lerTexto(textoColado, cartaoExtrato), () => trocar("texto")) }, icone("brilho"), "Ler a lista");
      corpo.replaceChildren(h("div", { class: "fin-form" },
        tipoExtrato(texto),
        h("label", { class: "jm-rotulo", for: "fin-texto" }, "Cole sua lista de despesas"),
        h("textarea", {
          class: "campo fin-texto", id: "fin-texto", value: textoColado,
          placeholder: "Cole aqui sua lista de despesas. Exemplos:\n\n15/01 Almoço restaurante R$ 45,90\n16/01 Uber R$ 23,50\n17/01 Netflix (parcela 2/4) R$ 55,90\n18/01 Supermercado R$ 234,00\n\nO painel identifica sozinho: data, descrição, valor, categoria e parcelas.\nPra marcar uma entrada, coloque + no valor (ex: + R$ 1.500,00).",
          oninput: (e) => { textoColado = e.target.value; analisar.disabled = !textoColado.trim(); },
        }),
        analisar));
      rodape.replaceChildren(h("span"), h("button", { class: "btn jm-secundario", type: "button", onclick: fechar }, "Cancelar"));
    }

    if (!existente) desenharAbas();
    manual();
    caixaJanela.querySelector(".fin-par-op, .jm-cat")?.focus();
  }
}


// ---------------------------------------------------------------------
// PEÇAS DAS ABAS NOVAS (Bloco de Notas, Conteúdo, Clientes, Contratos)
// ---------------------------------------------------------------------
// Compara nomes sem acento e sem maiúscula ("Ana Júlia" = "ana julia")
const chaveNome = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

function botaoApagar(rotulo, pergunta, tabela, id, depois) {
  return h("button", {
    class: "btn btn-fantasma btn-icone btn-perigo", type: "button", title: "Apagar", "aria-label": rotulo,
    onclick: async (e) => {
      e.stopPropagation();
      if (!confirm(pergunta)) return;
      if (Dados.semBanco) { avisoSemBanco(); return; }
      if (await Dados.apagarLinha(tabela, id)) { toast("Apagado."); depois(); } else toast("Não consegui apagar.", "erro");
    },
  }, icone("lixo"));
}

function caixaBusca(placeholder, aoDigitar) {
  return h("span", { class: "busca-caixa" }, icone("lupa"),
    h("input", { class: "campo campo-busca", type: "search", placeholder, "aria-label": placeholder, oninput: (e) => aoDigitar(e.target.value) }));
}

function pilulasFiltro(opcoes, atual, aoEscolher) {
  return h("div", { class: "pilulas pilulas-pequenas", role: "group", "aria-label": "Filtrar" },
    opcoes.map(([v, t]) => h("button", {
      type: "button", class: `pilula${atual === v ? " ativa" : ""}`, "aria-pressed": String(atual === v), onclick: () => aoEscolher(v),
    }, t)));
}

// ---------------------------------------------------------------------
// BLOCO DE NOTAS
// ---------------------------------------------------------------------
const CORES_NOTA = { amarelo: "Amarelo", rosa: "Rosa", azul: "Azul", verde: "Verde", cinza: "Cinza" };
// Modelos do "Comece por aqui"
const MODELOS_NOTA = [
  { icone: "megafone", nome: "Ideia de conteúdo", cor: "rosa", titulo: "Ideia de conteúdo", texto: "Gancho:\nFormato:\nPlataforma:\nChamada pra ação:" },
  { icone: "contrato", nome: "Rascunho de roteiro", cor: "azul", titulo: "Rascunho de roteiro", texto: "Gancho (3 primeiros segundos):\n\nDesenvolvimento:\n\nFechamento e chamada pra ação:" },
  { icone: "alvo", nome: "Registrar meta", cor: "verde", titulo: "Meta", texto: "O que eu quero:\nAté quando:\nPrimeiro passo:" },
  { icone: "brilho", nome: "Brainstorm livre", cor: "amarelo", titulo: "Brainstorm", texto: "" },
];
// Notas antigas "branco" e "lilás" entram no filtro do cinza
const corDaNota = (n) => (CORES_NOTA[n.cor] ? n.cor : "cinza");
function quandoFoi(dataHora) {
  if (!dataHora) return "";
  const dias = Math.round((new Date(`${iso(new Date())}T12:00:00`) - new Date(`${iso(new Date(dataHora))}T12:00:00`)) / 864e5);
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  if (dias < 7) return `há ${dias} dias`;
  return dataBR(dataHora);
}

async function telaNotas(p) {
  let notas = [], termo = "", cor = "";
  const conta = h("span", { class: "notas-conta" });
  const bolinhas = h("div", { class: "notas-cores", role: "group", "aria-label": "Filtrar por cor" });
  const grade = h("div", { class: "notas-grade" }, h("p", { class: "carregando" }, "Carregando..."));
  const compositor = h("div", { class: "notas-compositor", hidden: true });
  p.append(
    h("div", { class: "boas-vindas" },
      h("div", {},
        h("h1", {}, `Anote suas ideias, ${nomeDona()} 📝`),
        h("p", { class: "sub" }, "Capture insights, ideias de conteúdo e brainstorms antes que a inspiração vá embora."))),
    h("div", { class: "notas-barra" },
      h("span", { class: "notas-icone" }, icone("arquivo")),
      h("h2", {}, "Bloco de Notas"), conta,
      h("button", { class: "btn btn-primario notas-nova", type: "button", onclick: () => editar(null) }, icone("mais"), "Nova Nota")),
    h("div", { class: "notas-filtros" },
      h("span", { class: "busca-caixa notas-busca" }, icone("lupa"),
        h("input", { class: "campo campo-busca", type: "search", placeholder: "Buscar notas...", "aria-label": "Buscar notas", oninput: (e) => { termo = e.target.value; desenhar(); } })),
      bolinhas),
    compositor,
    grade,
    h("div", { class: "notas-comece" },
      h("p", {}, "Comece por aqui:"),
      h("div", { class: "notas-modelos" },
        MODELOS_NOTA.map((m) => h("button", { type: "button", class: "notas-modelo", onclick: () => editar(null, m) }, icone(m.icone), m.nome)))));
  await carregar();

  async function carregar() {
    notas = await Dados.lista("notas", (c) => c.order("fixada", { ascending: false }).order("updated_at", { ascending: false }));
    desenhar();
  }

  // Nova nota (ou edição) abre aqui mesmo, num cartão em cima das notas.
  // O título só aparece quando a nota já tem um (ou veio de um modelo).
  function editar(nota, modelo) {
    let cor = nota ? corDaNota(nota) : modelo?.cor || "amarelo";
    const tituloInicial = nota ? nota.titulo || "" : modelo?.titulo || "";
    const titulo = tituloInicial
      ? h("input", { class: "notas-compositor-titulo", value: tituloInicial, placeholder: "Título", "aria-label": "Título da nota" })
      : null;
    const texto = h("textarea", {
      class: "notas-compositor-texto", rows: "3", placeholder: "Anote uma ideia, rascunho, lembrete...", "aria-label": "Texto da nota",
      value: nota ? nota.texto || "" : modelo?.texto || "",
      oninput: () => crescer(),
      onkeydown: (e) => {
        if (e.key === "Escape") fechar();
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) salvar();
      },
    });
    const crescer = () => { texto.style.height = "auto"; texto.style.height = `${Math.max(90, texto.scrollHeight)}px`; };
    const cores = h("div", { class: "notas-compositor-cores", role: "radiogroup", "aria-label": "Cor da nota" });
    const pintar = () => {
      compositor.className = `notas-compositor nota-${cor}`;
      cores.replaceChildren(...Object.entries(CORES_NOTA).map(([c, nome]) => h("button", {
        type: "button", class: `notas-bolinha nota-${c}${cor === c ? " ativa" : ""}`, role: "radio", "aria-checked": String(cor === c),
        title: nome, "aria-label": nome, onclick: () => { cor = c; pintar(); },
      })));
    };
    const fechar = () => { compositor.hidden = true; compositor.replaceChildren(); };
    async function salvar() {
      const t = texto.value.trim();
      const tt = titulo ? titulo.value.trim() : "";
      if (!t && !tt) { toast("Escreva alguma coisa antes de salvar."); texto.focus(); return; }
      if (!(await salvarOuAvisar("notas", { titulo: tt || null, texto: t || null, cor, id: nota?.id }))) return;
      toast("Nota salva!", "sucesso");
      fechar();
      await carregar();
    }
    compositor.replaceChildren(
      titulo || "", texto,
      h("div", { class: "notas-compositor-rodape" },
        cores,
        h("div", { class: "notas-compositor-acoes" },
          h("button", { type: "button", class: "notas-cancelar", onclick: fechar }, "Cancelar"),
          h("button", { type: "button", class: "notas-salvar", onclick: salvar }, "Salvar"))));
    compositor.hidden = false;
    pintar();
    crescer();
    compositor.scrollIntoView({ block: "nearest", behavior: "smooth" });
    texto.focus();
  }

  async function fixar(nota) {
    if (await salvarOuAvisar("notas", { id: nota.id, fixada: !nota.fixada })) carregar();
  }

  function desenhar() {
    conta.textContent = `${notas.length} ${notas.length === 1 ? "nota" : "notas"}`;
    bolinhas.replaceChildren(...Object.entries(CORES_NOTA).map(([c, nome]) => h("button", {
      type: "button", class: `notas-bolinha nota-${c}${cor === c ? " ativa" : ""}`, title: cor === c ? "Mostrar todas" : `Só as notas ${nome.toLowerCase()}`,
      "aria-label": `Filtrar ${nome}`, "aria-pressed": String(cor === c), onclick: () => { cor = cor === c ? "" : c; desenhar(); },
    })));
    if (!notas.length) {
      grade.replaceChildren(h("p", { class: "notas-vazio" }, "Nenhuma nota ainda. Comece por um dos modelos abaixo ou clique em Nova Nota."));
      return;
    }
    const t = chaveNome(termo);
    const visiveis = notas.filter((n) => (!cor || corDaNota(n) === cor) && (!t || chaveNome(`${n.titulo} ${n.texto}`).includes(t)));
    if (!visiveis.length) { grade.replaceChildren(h("p", { class: "notas-vazio" }, "Nenhuma nota com esse filtro.")); return; }
    grade.replaceChildren(...visiveis.map((n) => h("article", {
      class: `nota-cartao nota-${corDaNota(n)}`, tabindex: "0", role: "button", "aria-label": `Abrir nota ${n.titulo || ""}`,
      onclick: () => editar(n), onkeydown: (e) => { if (e.key === "Enter") editar(n); },
    },
    n.titulo ? h("h3", {}, n.titulo) : null,
    n.texto ? h("p", { class: "nota-texto" }, n.texto) : null,
    h("div", { class: "nota-rodape" },
      h("span", { title: `Editada em ${dataBR(n.updated_at)}` }, quandoFoi(n.updated_at)),
      h("span", { class: "nota-acoes" },
        h("button", {
          class: `btn btn-fantasma btn-icone nota-pino${n.fixada ? " fixada" : ""}`, type: "button",
          title: n.fixada ? "Desafixar" : "Fixar no topo", "aria-label": n.fixada ? "Desafixar" : "Fixar no topo", "aria-pressed": String(!!n.fixada),
          onclick: (e) => { e.stopPropagation(); fixar(n); },
        }, icone("pino")),
        botaoApagar(`Apagar nota ${n.titulo || ""}`, "Apagar essa nota? Isso não tem volta.", "notas", n.id, carregar))))));
  }
}

// ---------------------------------------------------------------------
// CONTEÚDO: Profissional (campanhas de publi e UGC) e Pessoal (crescimento)
// ---------------------------------------------------------------------
const ETAPAS_CONTEUDO = { ideia: "Ideia", roteiro: "Roteiro", gravacao: "Gravado", edicao: "Edição", agendado: "Agendado", publicado: "Postado" };
const EMOJI_ETAPA = { ideia: "💡", roteiro: "✍️", gravacao: "🎥", edicao: "✂️", agendado: "🗓️", publicado: "✅" };
const PLATAFORMAS = { instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube", ugc: "UGC para marca", outro: "Outro" };
const ICONE_PLATAFORMA = { instagram: "instagram", tiktok: "video", youtube: "youtube", ugc: "video", outro: "pontos" };
const FORMATOS = ["Reels", "Stories", "Post Estático", "Carrossel", "Legenda", "Live", "Outro"];
const OBJETIVOS = { atracao: ["Atração", "alvo"], conexao: ["Conexão", "usuarios"], conversao: ["Conversão", "brilho"] };
const ETAPAS_CAMPANHA = {
  briefing: ["Briefing", "📝"], roteiro: ["Roteiro", "✍️"], gravacao: ["Gravação", "🎬"], aprovacao: ["Aprovação", "👀"],
  postagem: ["Postagem", "📲"], faturamento: ["Faturamento", "🧾"], finalizada: ["Finalizada", "✅"],
};
const DATAS_CAMPANHA = ["briefing", "roteiro", "gravacao", "aprovacao", "postagem", "faturamento"];
// [nome na lista, nome curto, dica, ícone]
const TIPOS_CAMPANHA = {
  publi: ["Publicidade (Publi)", "Publicidade", "Contratação para postagem no seu perfil.", "megafone"],
  ugc: ["Conteúdo UGC", "UGC", "Vídeo para a marca usar nos canais dela, sem postar no seu perfil.", "video"],
  embaixadora: ["Embaixadora", "Embaixadora", "Parceria contínua com a marca, com entregas todo mês.", "coroa"],
  permuta: ["Permuta / Recebidos", "Permuta", "Você recebe produtos ou serviços em troca do conteúdo.", "aperto"],
  afiliado: ["Afiliado", "Afiliado", "Você ganha comissão pelas vendas com seu link ou cupom.", "cupom"],
  vip: ["Presença VIP", "Presença VIP", "Convite pra evento, com presença e stories.", "festa"],
  outro: ["Outro", "Outro", "Outro tipo de parceria.", "etiqueta"],
};
const PRAZOS_PGTO = [[0, "À vista"], [15, "15 dias"], [30, "30 dias"], [45, "45 dias"], [60, "60 dias"], [90, "90 dias"]];

// Pagamento atrasado: marcado como atrasado ou passou da data prevista sem receber
const atrasadoPgto = (c) => !c.pago && (c.status_pgto === "atrasado" || (pagamentoPrevisto(c) || "9999") < iso(new Date()));
// Pagamento previsto: faturamento (ou postagem) + prazo
function pagamentoPrevisto(c) {
  const base = c.datas?.faturamento || c.datas?.postagem;
  if (!base) return null;
  const d = new Date(`${base}T12:00:00`);
  d.setDate(d.getDate() + Number(c.prazo_pgto || 0));
  return iso(d);
}
// Ordena uma lista por coluna; texto sem acento, número e data em ordem natural
function ordenarPor(lista, valorDe, crescente) {
  return [...lista].sort((a, b) => {
    const x = valorDe(a), y = valorDe(b);
    if (x === y) return 0;
    if (x === null || x === undefined || x === "") return 1;
    if (y === null || y === undefined || y === "") return -1;
    const r = typeof x === "number" ? x - y : chaveNome(x).localeCompare(chaveNome(y), "pt-BR");
    return crescente ? r : -r;
  });
}
function cabecaOrdenavel(colunas, ordem, aoOrdenar, classe) {
  return h("div", { class: `${classe} tab-cabeca`, role: "row" }, colunas.map(([chave, nome]) => (chave
    ? h("button", {
      type: "button", class: `tab-ordenar${ordem.chave === chave ? " ativa" : ""}`, title: `Ordenar por ${nome.toLowerCase()}`,
      onclick: () => aoOrdenar(chave),
    }, nome, h("span", { class: "tab-setas", "aria-hidden": "true" }, ordem.chave === chave ? (ordem.crescente ? "↑" : "↓") : "↑↓"))
    : h("span", {}, nome))));
}
// Menuzinho dos "..." (fecha ao clicar fora)
// Encosta o menu na direita do botão, sem passar da borda da tela
function posicionarMenu(menu, botao) {
  const r = botao.getBoundingClientRect();
  const largura = menu.offsetWidth;
  let esquerda = r.right - largura;
  if (esquerda < 8) esquerda = r.left;
  esquerda = Math.max(8, Math.min(esquerda, window.innerWidth - largura - 8));
  menu.style.left = `${esquerda + window.scrollX}px`;
}
function menuSuspenso(botao, itens) {
  document.querySelector(".menu-suspenso")?.remove();
  const r = botao.getBoundingClientRect();
  const menu = h("div", { class: "menu-suspenso", role: "menu", style: `top:${r.bottom + window.scrollY + 4}px;left:${Math.max(8, r.right + window.scrollX - 200)}px` },
    itens.filter(Boolean).map(([ic, texto, acao, perigo]) => h("button", {
      type: "button", role: "menuitem", class: perigo ? "perigo" : "", onclick: () => { menu.remove(); acao(); },
    }, icone(ic), texto)));
  document.body.append(menu);
  posicionarMenu(menu, botao);
  setTimeout(() => document.addEventListener("click", function fora(e) {
    if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener("click", fora); }
  }), 0);
}

// ---------------------------------------------------------------------
// NOTIFICAÇÕES: avisos do Financeiro, Conteúdo, Clientes e Contratos.
// O sino do menu mostra tudo; o sino de cada aba mostra só os dela.
// "Lidas" ficam salvas no banco (config_painel); com a permissão do
// navegador, os avisos novos também aparecem como notificação do sistema.
// ---------------------------------------------------------------------
const AREAS_AVISO = {
  financeiro: ["Financeiro", "carteira", "#financeiro"],
  conteudo: ["Conteúdo", "megafone", "#conteudo"],
  clientes: ["Clientes", "predio", "#clientes"],
  contratos: ["Contratos", "contrato", "#contratos"],
};
const Avisos = { lista: [], lidas: null, carregadoEm: 0, botoes: new Set(), primeira: true };

// "hoje", "amanhã", "em 3 dias", "há 2 dias"
function quandoAviso(d) {
  const n = diasAte(d);
  return n === 0 ? "hoje" : n === 1 ? "amanhã" : n > 1 ? `em ${n} dias` : n === -1 ? "ontem" : `há ${-n} dias`;
}

async function gerarAvisos() {
  const hoje = iso(new Date());
  const em = (n) => iso(new Date(Date.now() + n * 864e5));
  const [pendentes, recebidas, campanhas, conteudos, clientes, contratos] = await Promise.all([
    Dados.lista("fin_transacoes", (c) => c.eq("status", "pendente").lte("data", em(3))),
    Dados.lista("fin_transacoes", (c) => c.eq("tipo", "receita").eq("status", "concluido").gte("data", em(-7)).lte("data", hoje)),
    Dados.lista("campanhas", (c) => c.neq("status", "finalizada")),
    Dados.lista("conteudos", (c) => c.neq("status", "publicado").lte("data", em(1))),
    Dados.lista("clientes", (c) => c.lte("followup", hoje)),
    Dados.lista("contratos", (c) => c.eq("status", "assinado").lte("fim", em(7)).gte("fim", em(-3))),
  ]);
  const avisos = [];
  const add = (a) => avisos.push({ ...a, atrasado: !!a.atrasadoFixo || a.data < hoje });

  // Financeiro: contas vencendo, pagamentos chegando e o que entrou
  for (const t of pendentes) {
    if (t.status !== "pendente" || !t.data || t.data > em(3)) continue;
    const quem = t.tipo === "receita" ? (t.cliente || t.descricao || t.categoria) : (t.descricao || t.categoria);
    const atras = t.data < hoje;
    add(t.tipo === "despesa"
      ? { id: `fin-venc-${t.id}-${t.data}`, area: "financeiro", data: t.data, titulo: atras ? "Conta atrasada" : "Conta perto de vencer",
        texto: `${quem}: ${reais(t.valor)}, ${atras ? `venceu ${quandoAviso(t.data)}` : `vence ${quandoAviso(t.data)}`}` }
      : { id: `fin-receber-${t.id}-${t.data}`, area: "financeiro", data: t.data, titulo: atras ? "Pagamento atrasado" : "Pagamento chegando",
        texto: `${quem}: ${reais(t.valor)} ${atras ? `era pra ter caído ${quandoAviso(t.data)}` : `previsto pra ${quandoAviso(t.data)}`}` });
  }
  for (const t of recebidas) {
    if (t.tipo !== "receita" || t.status !== "concluido" || !t.data || t.data > hoje || t.data < em(-7)) continue;
    add({ id: `fin-recebido-${t.id}`, area: "financeiro", data: t.data, recebido: true, titulo: "Você recebeu um pagamento 🎉",
      texto: `${reais(t.valor)} de ${t.cliente || t.descricao || t.categoria} (${quandoAviso(t.data)})` });
  }
  // Conteúdo: etapas das campanhas, pagamento das campanhas e conteúdos pessoais
  for (const c of campanhas) {
    if (c.status === "finalizada") continue;
    const feitas = DATAS_CAMPANHA.indexOf(c.status);
    DATAS_CAMPANHA.forEach((etapa, i) => {
      const d = c.datas?.[etapa];
      if (!d || i < feitas || d > em(2)) return;
      add({ id: `cp-${c.id}-${etapa}-${d}`, area: "conteudo", data: d, titulo: `${ETAPAS_CAMPANHA[etapa][0]} ${d < hoje ? "atrasada" : quandoAviso(d)}`,
        texto: `${c.titulo}${c.cliente ? ` (${c.cliente})` : ""}` });
    });
    const pg = pagamentoPrevisto(c);
    if (!c.pago && c.status_pgto === "atrasado" && !(pg && pg <= em(3))) {
      add({ id: `cp-pg-${c.id}-atrasado`, area: "conteudo", data: hoje, atrasadoFixo: true, titulo: "Pagamento de campanha atrasado", texto: `${c.titulo}${c.cliente ? ` (${c.cliente})` : ""}: ${reais(c.valor)}` });
    }
    if (pg && !c.pago && pg <= em(3)) {
      add({ id: `cp-pg-${c.id}-${pg}`, area: "conteudo", data: pg, titulo: pg < hoje ? "Pagamento de campanha atrasado" : "Pagamento de campanha chegando",
        texto: `${c.titulo}${c.cliente ? ` (${c.cliente})` : ""}: ${reais(c.valor)}, ${pg < hoje ? `era pra ${quandoAviso(pg)}` : `previsto pra ${quandoAviso(pg)}`}` });
    }
  }
  for (const t of conteudos) {
    if (t.status === "publicado" || !t.data || t.data > em(1)) continue;
    add({ id: `ct-${t.id}-${t.data}`, area: "conteudo", data: t.data, titulo: t.data < hoje ? "Conteúdo atrasado" : `Conteúdo pra ${quandoAviso(t.data)}`,
      texto: `${t.titulo} (${ETAPAS_CONTEUDO[t.status] || t.status})` });
  }
  // Clientes: follow-ups do dia e atrasados
  for (const c of clientes) {
    if (!c.followup || c.followup > hoje) continue;
    add({ id: `cl-${c.id}-${c.followup}`, area: "clientes", data: c.followup, titulo: c.followup < hoje ? "Follow-up atrasado" : "Follow-up hoje",
      texto: `Falar com ${c.nome}${c.responsavel ? ` (${c.responsavel})` : ""}` });
  }
  // Contratos: vencendo em até 7 dias
  for (const k of contratos) {
    if (k.status !== "assinado" || !k.fim || k.fim > em(7) || k.fim < em(-3)) continue;
    add({ id: `ctr-${k.id}-${k.fim}`, area: "contratos", data: k.fim, titulo: k.fim < hoje ? "Contrato venceu" : `Contrato vence ${quandoAviso(k.fim)}`, texto: k.titulo });
  }
  // Atrasados primeiro, depois pela data (os recebidos, do mais novo pro mais antigo)
  return avisos.sort((a, b) => (b.atrasado - a.atrasado) || (a.recebido && b.recebido ? b.data.localeCompare(a.data) : a.data.localeCompare(b.data)));
}

async function lerAvisosLidos() {
  if (Avisos.lidas) return;
  let lista = [];
  try { lista = JSON.parse(await Dados.lerConfig("avisos_lidos")) || []; } catch { lista = []; }
  Avisos.lidas = new Set(Array.isArray(lista) ? lista : []);
}
function marcarAvisosLidos(ids) {
  ids.forEach((id) => Avisos.lidas.add(id));
  // guarda só os mais recentes pra não crescer pra sempre
  if (!Dados.semBanco) Dados.gravarConfig("avisos_lidos", JSON.stringify([...Avisos.lidas].slice(-400)));
  pintarSinos();
}
const avisosNaoLidos = (area) => Avisos.lista.filter((a) => (!area || a.area === area) && !Avisos.lidas?.has(a.id));

// Recalcula (no máximo 1x por minuto, a não ser forçando) e pinta os sinos
async function atualizarAvisos(forcar) {
  if (!forcar && Date.now() - Avisos.carregadoEm < 60000) return;
  Avisos.carregadoEm = Date.now();
  try {
    await lerAvisosLidos();
    Avisos.lista = await gerarAvisos();
  } catch (e) { console.warn("avisos:", e); return; }
  pintarSinos();
  avisarNoNavegador();
}

function pintarSinos() {
  for (const b of [...Avisos.botoes]) {
    // sino que saiu da tela (trocou de aba) sai da lista; o recém-criado ainda não entrou na tela
    if (!b.isConnected && !b.dataset.fixo) { if (Date.now() - b.criadoEm > 3000) Avisos.botoes.delete(b); continue; }
    const n = avisosNaoLidos(b.dataset.area || null).length;
    b.querySelector(".sino-conta")?.remove();
    if (n) b.append(h("span", { class: "sino-conta" }, n > 9 ? "9+" : String(n)));
    b.setAttribute("aria-label", n ? `Notificações: ${n} novas` : "Notificações");
  }
}

// Notificação do sistema (só com permissão e com o painel aberto numa aba)
function avisarNoNavegador() {
  const novos = avisosNaoLidos();
  let avisados = [];
  try { avisados = JSON.parse(localStorage.getItem("avisos_avisados") || "[]"); } catch { avisados = []; }
  const ineditos = novos.filter((a) => !avisados.includes(a.id));
  if (!ineditos.length) return;
  if (Avisos.primeira) toast(`🔔 Você tem ${novos.length} ${novos.length === 1 ? "notificação nova" : "notificações novas"}. Toque no sino pra ver.`);
  Avisos.primeira = false;
  if ("Notification" in window && Notification.permission === "granted") {
    const mostrar = ineditos.length > 3
      ? [{ id: "resumo", titulo: `Você tem ${ineditos.length} avisos novos`, texto: ineditos.slice(0, 3).map((a) => a.titulo).join(", ") + "...", area: null }]
      : ineditos;
    for (const a of mostrar) {
      try {
        const n = new Notification(a.titulo, { body: a.texto, tag: a.id });
        n.onclick = () => { window.focus(); if (a.area) location.hash = AREAS_AVISO[a.area][2]; n.close(); };
      } catch { /* alguns celulares só aceitam pelo app instalado */ }
    }
  }
  try { localStorage.setItem("avisos_avisados", JSON.stringify([...avisados, ...ineditos.map((a) => a.id)].slice(-400))); } catch { /* ok */ }
}

// Botão de sino. area = null mostra todas; fixo = fica sempre (menu lateral)
function botaoAvisos(area, classe = "", fixo = false) {
  const b = h("button", {
    type: "button", class: `btn btn-fantasma btn-icone conteudo-sino ${classe}`, title: "Notificações", "aria-label": "Notificações",
    "data-area": area || null, "data-fixo": fixo ? "1" : null, onclick: () => abrirAvisos(b, area),
  }, icone("sino"));
  b.criadoEm = Date.now();
  Avisos.botoes.add(b);
  setTimeout(pintarSinos, 0);
  return b;
}

async function abrirAvisos(botao, area) {
  menuSuspenso(botao, []);
  const menu = document.querySelector(".menu-suspenso");
  menu.classList.add("lembretes", "avisos");
  posicionarMenu(menu, botao);
  menu.append(h("p", { class: "lembretes-vazio" }, "Carregando..."));
  await atualizarAvisos(true);
  if (!menu.isConnected) return;
  const lista = Avisos.lista.filter((a) => !area || a.area === area);
  const naoLidos = lista.filter((a) => !Avisos.lidas.has(a.id));
  const pedirPermissao = "Notification" in window && Notification.permission === "default";
  menu.replaceChildren(
    h("div", { class: "avisos-topo" },
      h("strong", { class: "lembretes-titulo" }, area ? `Notificações de ${AREAS_AVISO[area][0]}` : "Notificações"),
      naoLidos.length ? h("button", { type: "button", class: "avisos-ler", onclick: (e) => { e.stopPropagation(); marcarAvisosLidos(naoLidos.map((a) => a.id)); abrirAvisos(botao, area); } }, "Marcar todas como lidas") : ""),
    pedirPermissao ? h("button", {
      type: "button", class: "avisos-permitir",
      onclick: async (e) => {
        e.stopPropagation();
        const r = await Notification.requestPermission();
        toast(r === "granted" ? "Pronto! Os avisos vão aparecer no seu navegador." : "Tudo bem, os avisos continuam aqui no sino.");
        if (r === "granted") { try { localStorage.removeItem("avisos_avisados"); } catch { /* ok */ } avisarNoNavegador(); }
        abrirAvisos(botao, area);
      },
    }, icone("sino"), "Receber avisos também no navegador") : "",
    ...(lista.length ? lista.map((a) => {
      const nova = !Avisos.lidas.has(a.id);
      return h("button", {
        type: "button", class: `aviso-item${nova ? " nova" : ""}${a.atrasado && !a.recebido ? " atrasado" : ""}${a.recebido ? " recebido" : ""}`,
        onclick: () => { marcarAvisosLidos([a.id]); menu.remove(); location.hash = AREAS_AVISO[a.area][2]; },
      },
      h("span", { class: "aviso-icone" }, icone(AREAS_AVISO[a.area][1])),
      h("span", { class: "aviso-textos" }, h("strong", {}, a.titulo), h("span", {}, a.texto)),
      nova ? h("span", { class: "aviso-ponto", "aria-label": "nova" }) : "");
    }) : [h("p", { class: "lembretes-vazio" }, "Nenhuma notificação agora. Tudo em dia! 🎉")]));
  posicionarMenu(menu, botao);
}

// Campo de escolha com lista própria (no lugar do select do navegador).
// opcoes: [{ valor, texto, icone? }]. vazio: texto da opção "nenhum" (valor null).
// comBusca: mostra a busca; criar: deixa usar o que foi digitado como valor novo.
function seletorSuspenso({ id, opcoes, atual, aoMudar, placeholder = "Escolha...", vazio, comBusca, buscaTexto = "Buscar...", grupo, criar }) {
  const rotulo = h("span", { class: "cs-valor" });
  const gatilho = h("button", { type: "button", class: "cs-gatilho", id, "aria-haspopup": "listbox", "aria-expanded": "false", onclick: () => (aberto ? fechar() : abrir()) });
  const caixa = h("div", { class: "cs-caixa" }, gatilho);
  let aberto = null;
  const igual = (a, b) => (a ?? "") === (b ?? "");
  const iconeDe = (o) => { if (!o?.icone) return ""; const s = icone(o.icone); if (o.cor) s.style.color = o.cor; return s; };
  function mostrar() {
    const op = opcoes.find((o) => igual(o.valor, atual));
    const texto = op?.texto || atual || "";
    rotulo.replaceChildren(iconeDe(op), texto || placeholder);
    rotulo.classList.toggle("cs-sem-valor", !texto);
    gatilho.replaceChildren(rotulo, icone(comBusca ? "setas" : "baixo"));
  }
  function fechar() {
    aberto?.remove(); aberto = null;
    gatilho.setAttribute("aria-expanded", "false");
    document.removeEventListener("mousedown", fora, true);
  }
  function fora(e) { if (!caixa.contains(e.target)) fechar(); }
  function escolher(v) { atual = v; aoMudar(v); mostrar(); fechar(); gatilho.focus(); }
  function abrir() {
    const lista = h("div", { class: "cs-lista", role: "listbox" });
    const item = (valor, texto, ic) => h("button", {
      type: "button", role: "option", class: `cs-item${igual(valor, atual) ? " ativo" : ""}`, "aria-selected": String(igual(valor, atual)), onclick: () => escolher(valor),
    }, h("span", { class: "cs-check" }, igual(valor, atual) ? icone("check") : ""), iconeDe(ic), h("span", {}, texto));
    const busca = comBusca ? h("input", {
      class: "cs-busca", placeholder: buscaTexto, "aria-label": buscaTexto, autocomplete: "off", oninput: () => desenhar(),
      onkeydown: (e) => {
        if (e.key === "Enter") { e.preventDefault(); lista.querySelector(".cs-item")?.click(); }
      },
    }) : null;
    function desenhar() {
      const digitado = busca ? busca.value.trim() : "";
      const t = chaveNome(digitado);
      const achados = opcoes.filter((o) => !t || chaveNome(o.texto).includes(t));
      const existe = opcoes.some((o) => chaveNome(o.texto) === t);
      lista.replaceChildren(
        ...(criar && digitado && !existe ? [h("button", { type: "button", class: "cs-item cs-criar", onclick: () => escolher(digitado) }, icone("mais"), h("span", {}, `Criar "${digitado}"`))] : []),
        ...(vazio && !t ? [item(null, vazio)] : []),
        ...(achados.length ? [grupo ? h("p", { class: "cs-grupo" }, grupo) : "", ...achados.map((o) => item(o.valor, o.texto, o))]
          : [h("p", { class: "cs-nada" }, opcoes.length ? "Nada encontrado." : "Nenhum cadastrado ainda. Digite pra criar.")]));
    }
    aberto = h("div", {
      class: "cs-pop", onkeydown: (e) => { if (e.key === "Escape") { e.stopPropagation(); fechar(); gatilho.focus(); } },
    }, busca ? h("div", { class: "cs-busca-linha" }, icone("lupa"), busca) : "", lista);
    caixa.append(aberto);
    desenhar();
    gatilho.setAttribute("aria-expanded", "true");
    (busca || lista.querySelector(".cs-item.ativo") || lista.querySelector(".cs-item"))?.focus();
    document.addEventListener("mousedown", fora, true);
  }
  mostrar();
  return caixa;
}

async function telaConteudo(p, sub) {
  const aba = sub === "pessoal" ? "pessoal" : "profissional";
  let campanhas = [], conteudos = [], clientes = [];
  const sino = botaoAvisos("conteudo");
  const area = h("div", {}, h("p", { class: "carregando" }, "Carregando..."));
  p.append(
    h("div", { class: "fin-topo" },
      h("span", { class: "fin-topo-icone" }, icone("megafone")),
      h("div", { class: "fin-topo-textos" },
        h("h1", {}, "Conteúdo"),
        h("p", { class: "sub" }, "Gerencie suas campanhas profissionais e conteúdo de crescimento pessoal")),
      h("div", { class: "fin-topo-acoes" }, sino,
        h("button", { class: "btn btn-primario fin-nova", type: "button", onclick: () => (aba === "pessoal" ? editarPessoal(null) : editarCampanha(null)) },
          icone("mais"), aba === "pessoal" ? "Novo Conteúdo" : "Nova Campanha"))),
    h("nav", { class: "conteudo-abas", "aria-label": "Tipo de conteúdo" },
      h("a", { href: "#conteudo/profissional", class: aba === "profissional" ? "ativo" : "", "aria-current": aba === "profissional" ? "page" : null }, icone("megafone"), "Profissional (Publis & UGC)"),
      h("a", { href: "#conteudo/pessoal", class: aba === "pessoal" ? "ativo" : "", "aria-current": aba === "pessoal" ? "page" : null }, icone("brilho"), "Pessoal (Crescimento)")),
    area);

  // Estado das telas (fica enquanto a aba está aberta)
  const prof = { filtro: "ativas", termo: "", ordem: { chave: "", crescente: true }, abertas: new Set(), modo: (() => { try { return localStorage.getItem("campanhas_modo") || "lista"; } catch { return "lista"; } })() };
  const pess = { semana: (() => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; })(), ordem: { chave: "data", crescente: true } };


  async function carregar() {
    [campanhas, conteudos, clientes] = await Promise.all([
      Dados.lista("campanhas", (c) => c.order("favorita", { ascending: false }).order("created_at", { ascending: false })),
      Dados.lista("conteudos", (c) => c.order("data", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false })),
      Dados.lista("clientes", (c) => c.order("nome")),
    ]);
    atualizarAvisos(true);
    if (aba === "pessoal") desenharPessoal(); else desenharProfissional();
  }

  // =================== PROFISSIONAL ===================
  function desenharProfissional() {
    const ativas = campanhas.filter((c) => c.status !== "finalizada");
    const total = campanhas.reduce((s, c) => s + Number(c.valor || 0), 0);
    const videos = campanhas.reduce((s, c) => s + Number(c.qtd || 0), 0);
    const receber = campanhas.filter((c) => !c.pago).reduce((s, c) => s + Number(c.valor || 0), 0);
    const cartao = (rotulo, valor, ic, cor, detalhe) => h("div", { class: "cartao fin-cartao" },
      h("div", { class: "fin-cartao-topo" }, h("span", {}, rotulo), h("span", { class: `fin-icone fin-${cor}` }, icone(ic))),
      h("strong", { class: `fin-valor fin-txt-${cor}` }, valor), detalhe ? h("span", { class: "cp-detalhe" }, detalhe) : null);

    let visiveis = campanhas
      .filter((c) => prof.filtro === "todas" || (prof.filtro === "ativas" ? c.status !== "finalizada" : c.status === "finalizada"));
    const VALORES = {
      titulo: (c) => c.titulo, cliente: (c) => c.cliente, tipo: (c) => c.tipo,
      status: (c) => Object.keys(ETAPAS_CAMPANHA).indexOf(c.status), valor: (c) => Number(c.valor || 0),
    };
    if (prof.ordem.chave) visiveis = ordenarPor(visiveis, VALORES[prof.ordem.chave], prof.ordem.crescente);

    const segmento = h("div", { class: "cp-segmento", role: "group", "aria-label": "Filtrar campanhas" },
      [["todas", "Todas"], ["ativas", "Ativas"], ["finalizadas", "Finalizadas"]].map(([v, txt]) => h("button", {
        type: "button", class: prof.filtro === v ? "ativo" : "", "aria-pressed": String(prof.filtro === v), onclick: () => { prof.filtro = v; desenharProfissional(); },
      }, txt)));
    const modos = h("div", { class: "cp-modos", role: "group", "aria-label": "Jeito de ver" },
      [["lista", "lista", "Lista"], ["grade", "grade", "Cartões"]].map(([v, ic, txt]) => h("button", {
        type: "button", class: prof.modo === v ? "ativo" : "", title: txt, "aria-label": txt, "aria-pressed": String(prof.modo === v),
        onclick: () => { prof.modo = v; try { localStorage.setItem("campanhas_modo", v); } catch { /* ok */ } desenharProfissional(); },
      }, icone(ic))));
    const busca = h("input", { class: "campo campo-busca", type: "search", placeholder: "Buscar campanhas...", "aria-label": "Buscar campanhas", value: prof.termo,
      oninput: (e) => { prof.termo = e.target.value; desenharLista(); } });
    const lista = h("div");

    area.replaceChildren(
      h("div", { class: "fin-cartoes" },
        cartao("Total", fmt(campanhas.length), "megafone", "lilas"),
        cartao("Ativas", fmt(ativas.length), "relogio", "amarelo"),
        cartao("Total R$", reais(total), "dinheiro", "verde", `Ticket médio: ${reais(videos ? total / videos : 0)}/vídeo`),
        cartao("Receber R$", reais(receber), "contrato", "vinho")),
      h("div", { class: "cp-ferramentas" }, segmento, h("span", { class: "busca-caixa cp-busca" }, icone("lupa"), busca), modos),
      lista);
    desenharLista();

    function desenharLista() {
      const tt = chaveNome(prof.termo);
      const mostrar = visiveis.filter((c) => !tt || chaveNome(`${c.titulo} ${c.cliente}`).includes(tt));
      if (!campanhas.length) {
        lista.replaceChildren(estadoVazio("megafone", "Nenhuma campanha ainda", "Cadastre suas publis e UGCs com cliente, valor, roteiro e as datas de cada etapa.",
          h("button", { class: "btn btn-primario", type: "button", onclick: () => editarCampanha(null) }, icone("mais"), "Nova Campanha")));
        return;
      }
      if (!mostrar.length) { lista.replaceChildren(h("p", { class: "carregando" }, "Nenhuma campanha com esse filtro.")); return; }
      if (prof.modo === "grade") { lista.replaceChildren(h("div", { class: "cp-grade" }, mostrar.map(cartaoCampanha))); return; }
      lista.replaceChildren(h("div", { class: "cp-tabela", role: "table" },
        cabecaOrdenavel([["", ""], ["", ""], ["titulo", "Campanha"], ["cliente", "Cliente"], ["tipo", "Tipo"], ["status", "Status"], ["", "Qtd"], ["valor", "Valor"], ["", "Pagamento"], ["", "Conteúdo"], ["", ""]],
          prof.ordem, (chave) => { prof.ordem = { chave, crescente: prof.ordem.chave === chave ? !prof.ordem.crescente : true }; desenharProfissional(); }, "cp-linha"),
        mostrar.map(linhaCampanha)));
    }
  }

  const estrela = (c) => h("button", {
    type: "button", class: `cp-estrela${c.favorita ? " ativa" : ""}`, title: c.favorita ? "Tirar dos favoritos" : "Favoritar",
    "aria-label": c.favorita ? "Tirar dos favoritos" : "Favoritar", "aria-pressed": String(!!c.favorita),
    onclick: async (e) => { e.stopPropagation(); if (await salvarOuAvisar("campanhas", { id: c.id, favorita: !c.favorita })) carregar(); },
  }, icone("estrela"));
  const seloTipo = (c) => h("span", { class: `cp-tipo cp-tipo-${c.tipo}` }, icone(TIPOS_CAMPANHA[c.tipo]?.[3] || "etiqueta"), TIPOS_CAMPANHA[c.tipo]?.[1] || c.tipo);
  const seletorEtapa = (c) => h("select", {
    class: `cp-etapa cp-etapa-${c.status}`, "aria-label": `Etapa de ${c.titulo}`, onclick: (e) => e.stopPropagation(),
    onchange: async (e) => { if (await salvarOuAvisar("campanhas", { id: c.id, status: e.target.value })) carregar(); },
  }, Object.entries(ETAPAS_CAMPANHA).map(([v, [nome, emoji]]) => h("option", { value: v, selected: c.status === v }, `${emoji} ${nome}`)));
  const pagamento = (c) => {
    const pg = pagamentoPrevisto(c);
    return h("span", { class: "cp-pagamento" },
      h("small", {}, pg ? dataBR(pg) : "Sem data"),
      h("button", {
        type: "button", class: `cp-pago${c.pago ? " pago" : atrasadoPgto(c) ? " atrasado" : ""}`, title: c.pago ? "Marcar como pendente" : "Marcar como pago",
        onclick: (e) => { e.stopPropagation(); marcarPago(c); },
      }, c.pago ? "✅ Pago" : atrasadoPgto(c) ? "⚠️ Atrasado" : "⏳ Pendente"));
  };
  const conteudoEntregue = (c) => (c.link
    ? h("a", { class: "cp-link", href: c.link, target: "_blank", rel: "noopener", onclick: (e) => e.stopPropagation() }, icone("link"), "Abrir")
    : h("button", { type: "button", class: "cp-adicionar", onclick: (e) => { e.stopPropagation(); adicionarLink(c); } }, icone("mais"), "Adicionar"));
  const botaoMais = (c) => h("button", {
    type: "button", class: "btn btn-fantasma btn-icone cp-mais", title: "Mais opções", "aria-label": `Mais opções de ${c.titulo}`,
    onclick: (e) => {
      e.stopPropagation();
      menuSuspenso(e.currentTarget, [
        ["lapis", "Editar", () => editarCampanha(c)],
        ["check", c.pago ? "Marcar como pendente" : "Marcar como pago", () => marcarPago(c)],
        c.status !== "finalizada" ? ["alvo", "Finalizar campanha", async () => { if (await salvarOuAvisar("campanhas", { id: c.id, status: "finalizada" })) carregar(); }] : null,
        ["lixo", "Apagar", () => apagarCampanha(c), true],
      ]);
    },
  }, "•••");

  function linhaCampanha(c) {
    const aberta = prof.abertas.has(c.id);
    const linha = h("div", {
      class: `cp-linha${aberta ? " aberta" : ""}`, role: "row", tabindex: "0", onclick: () => editarCampanha(c),
      onkeydown: (e) => { if (e.key === "Enter" && e.target === linha) editarCampanha(c); },
    },
    h("button", {
      type: "button", class: "btn btn-fantasma btn-icone cp-abrir", "aria-expanded": String(aberta), "aria-label": aberta ? "Fechar detalhes" : "Ver detalhes",
      onclick: (e) => { e.stopPropagation(); if (aberta) prof.abertas.delete(c.id); else prof.abertas.add(c.id); desenharProfissional(); },
    }, icone(aberta ? "baixo" : "direita")),
    estrela(c),
    h("span", { class: "cp-titulo", "data-rotulo": "Campanha", title: c.titulo }, c.titulo),
    h("span", { "data-rotulo": "Cliente", title: c.cliente || "" }, c.cliente || "-"),
    h("span", { "data-rotulo": "Tipo" }, seloTipo(c)),
    h("span", { "data-rotulo": "Status" }, seletorEtapa(c)),
    h("span", { class: "cp-qtd", "data-rotulo": "Qtd" }, String(c.qtd ?? 0)),
    h("span", { class: "cp-valor", "data-rotulo": "Valor" }, reais(c.valor)),
    h("span", { "data-rotulo": "Pagamento" }, pagamento(c)),
    h("span", { "data-rotulo": "Conteúdo" }, conteudoEntregue(c)),
    botaoMais(c));
    return aberta ? [linha, detalhesCampanha(c)] : linha;
  }

  function detalhesCampanha(c) {
    const atual = Object.keys(ETAPAS_CAMPANHA).indexOf(c.status);
    return h("div", { class: "cp-detalhes" },
      h("ol", { class: "cp-fluxo" }, DATAS_CAMPANHA.map((etapa, i) => h("li", { class: i < atual ? "feita" : i === atual ? "atual" : "" },
        h("span", { class: "cp-fluxo-bola" }, i < atual ? icone("check") : ETAPAS_CAMPANHA[etapa][1]),
        h("strong", {}, ETAPAS_CAMPANHA[etapa][0]),
        h("small", {}, c.datas?.[etapa] ? dataBR(c.datas[etapa]) : "Sem data")))),
      c.roteiro ? h("div", { class: "cp-texto" }, h("strong", {}, "🎬 Roteiro"), h("p", {}, c.roteiro)) : null,
      c.notas ? h("div", { class: "cp-texto" }, h("strong", {}, "Observações"), h("p", {}, c.notas)) : null);
  }

  function cartaoCampanha(c) {
    return h("article", { class: "cartao cp-cartao", tabindex: "0", role: "button", onclick: () => editarCampanha(c), onkeydown: (e) => { if (e.key === "Enter") editarCampanha(c); } },
      h("div", { class: "cp-cartao-topo" }, estrela(c), h("h3", { title: c.titulo }, c.titulo), botaoMais(c)),
      h("p", { class: "cp-cartao-cliente" }, c.cliente || "Sem cliente"),
      h("div", { class: "cp-cartao-selos" }, seloTipo(c), seletorEtapa(c)),
      h("div", { class: "cp-cartao-linha" }, h("span", {}, `${c.qtd ?? 0} ${Number(c.qtd) === 1 ? "vídeo" : "vídeos"}`), h("strong", {}, reais(c.valor))),
      h("div", { class: "cp-cartao-linha" }, pagamento(c), conteudoEntregue(c)));
  }

  async function marcarPago(c) {
    const pago = !c.pago;
    if (!(await salvarOuAvisar("campanhas", { id: c.id, pago, status_pgto: pago ? "pago" : "pendente" }))) return;
    if (pago && Number(c.valor) > 0) await lancarNoFinanceiro(c);
    carregar();
  }
  async function lancarNoFinanceiro(c) {
    if (!confirm(`Lançar ${reais(c.valor)} de "${c.titulo}" como entrada no Financeiro?`)) return;
    const r = await Dados.salvarLinha("fin_transacoes", {
      tipo: "receita", escopo: "empresa", categoria: c.tipo === "ugc" ? "UGC Creator" : "Publicidade", cliente: c.cliente || null,
      descricao: c.titulo, valor: Number(c.valor), data: iso(new Date()), status: "concluido",
    });
    toast(r.ok ? "Entrada lançada no Financeiro!" : `Não consegui lançar no Financeiro: ${r.erro}`, r.ok ? "sucesso" : "erro");
  }

  function adicionarLink(c) {
    abrirFormulario({
      titulo: "Link do conteúdo entregue",
      campos: [{ chave: "link", rotulo: "Link (post, Drive, pasta...)", tipo: "url", largo: true, obrigatorio: true, placeholder: "https://..." }],
      aoSalvar: async (d) => {
        if (!(await salvarOuAvisar("campanhas", { id: c.id, link: linkSeguro(d.link) }))) return false;
        await carregar();
        return true;
      },
    });
  }

  async function apagarCampanha(c) {
    if (!confirm(`Apagar a campanha "${c.titulo}"? As tarefas dela no Calendário também saem. Isso não tem volta.`)) return;
    if (Dados.semBanco) { avisoSemBanco(); return; }
    if (await Dados.apagarLinha("campanhas", c.id)) { toast("Campanha apagada."); carregar(); } else toast("Não consegui apagar.", "erro");
  }

  // ----- Janela Novo Conteúdo / Editar Campanha -----
  function editarCampanha(c) {
    const d = c
      ? { ...c, datas: { ...(c.datas || {}) }, status_pgto: c.status_pgto || (c.pago ? "pago" : "pendente") }
      : { tipo: "publi", qtd: 1, prazo_pgto: 30, status: "briefing", status_pgto: "pendente", datas: {} };
    let tarefas = true; // ao salvar, refaz as tarefas da campanha no Calendário
    const j = janelaMeta({ titulo: c ? "Editar Campanha" : "Novo Conteúdo", iconeTopo: c ? null : h("span", { class: "jm-icone" }, icone("megafone")) });
    j.caixa.classList.add("jm-campanha");
    const entrada = (atrs) => h("input", { class: "campo jm-campo", ...atrs });
    const titulo = entrada({ id: "cp-titulo", value: d.titulo || "", placeholder: c ? "Nome da campanha" : "Ex: O gancho principal do conteúdo", oninput: () => { d.titulo = titulo.value; criar.disabled = !titulo.value.trim(); } });
    const dicaTipo = h("p", { class: "cp-dica" }, `💡 ${TIPOS_CAMPANHA[d.tipo]?.[2] || ""}`);
    const grupo = (rotulo, campo, id, extra) => h("div", { class: "jm-grupo" }, h("label", { class: "jm-rotulo", for: id }, rotulo), campo, extra || null);
    const numero = (chave, id, ph) => entrada({ id, value: d[chave] ?? "", inputmode: "decimal", placeholder: ph, oninput: (e) => { d[chave] = e.target.value; } });

    const seletorCliente = seletorSuspenso({
      id: "cp-cliente", opcoes: clientes.map((k) => ({ valor: k.nome, texto: k.nome })), atual: d.cliente || null,
      placeholder: "Buscar ou criar...", vazio: "Sem cliente", comBusca: true, buscaTexto: "Buscar cliente...", grupo: "Clientes", criar: true,
      aoMudar: (v) => { d.cliente = v; },
    });
    const seletorTipo = seletorSuspenso({
      id: "cp-tipo", opcoes: Object.entries(TIPOS_CAMPANHA).map(([v, [nome, , , ic]]) => ({ valor: v, texto: nome, icone: ic })), atual: d.tipo,
      aoMudar: (v) => { d.tipo = v; dicaTipo.textContent = `💡 ${TIPOS_CAMPANHA[v][2]}`; },
    });
    const seletorPrazo = seletorSuspenso({
      id: "cp-prazo", opcoes: PRAZOS_PGTO.map(([v, nome]) => ({ valor: String(v), texto: nome })), atual: String(d.prazo_pgto ?? 30),
      aoMudar: (v) => { d.prazo_pgto = Number(v); },
    });
    const datasFluxo = h("div", { class: "jm-caixa" },
      h("div", { class: "cp-datas-topo" },
        h("h4", {}, "🗓️ Datas do Fluxo de Trabalho"),
        h("label", { class: "cp-auto" }, h("input", { type: "checkbox", id: "cp-tarefas", checked: tarefas, onchange: (e) => { tarefas = e.target.checked; } }), "Criar tarefas automaticamente")),
      h("div", { class: "cp-tres" }, DATAS_CAMPANHA.map((etapa) => grupo(ETAPAS_CAMPANHA[etapa][0],
        entrada({ id: `cp-data-${etapa}`, type: "date", value: d.datas[etapa] || "", onchange: (e) => { d.datas[etapa] = e.target.value || null; } }), `cp-data-${etapa}`))));
    const roteiro = h("details", { class: "cp-roteiro", open: d.roteiro ? true : null },
      h("summary", {}, "🎬 Roteiro para Aprovação", icone("baixo")),
      h("textarea", { class: "campo jm-campo", id: "cp-roteiro", rows: "6", placeholder: "Gancho, falas, cenas e chamada pra ação...", value: d.roteiro || "", oninput: (e) => { d.roteiro = e.target.value; } }));
    const observacoes = grupo("Observações", h("textarea", { class: "campo jm-campo", id: "cp-notas", rows: "3", placeholder: "Detalhes sobre a campanha, entregas, etc.", value: d.notas || "", oninput: (e) => { d.notas = e.target.value; } }), "cp-notas");

    if (c) {
      // Status do pagamento e "Pagamento Recebido?" andam juntos
      const lugarPgto = h("div");
      const chave = h("input", { type: "checkbox", class: "cp-chave-input", id: "cp-recebido", role: "switch", checked: d.status_pgto === "pago",
        onchange: (e) => { d.status_pgto = e.target.checked ? "pago" : "pendente"; desenharPgto(); } });
      function desenharPgto() {
        chave.checked = d.status_pgto === "pago";
        lugarPgto.replaceChildren(seletorSuspenso({
          id: "cp-status-pgto", opcoes: [["pendente", "Pendente"], ["pago", "Pago"], ["atrasado", "Atrasado"]].map(([valor, texto]) => ({ valor, texto })),
          atual: d.status_pgto, aoMudar: (v) => { d.status_pgto = v; chave.checked = v === "pago"; },
        }));
      }
      desenharPgto();
      j.corpo.append(
        grupo("Nome da Campanha", titulo, "cp-titulo"),
        grupo("Cliente", seletorCliente, "cp-cliente"),
        h("div", { class: "jm-duas" },
          grupo("Tipo de Campanha", seletorTipo, "cp-tipo", dicaTipo),
          grupo("Status", seletorSuspenso({
            id: "cp-status", opcoes: Object.entries(ETAPAS_CAMPANHA).map(([v, [nome, emoji]]) => ({ valor: v, texto: `${emoji} ${nome}` })), atual: d.status,
            aoMudar: (v) => { d.status = v; },
          }), "cp-status")),
        h("div", { class: "cp-quatro" },
          grupo("Qtd Vídeos", numero("qtd", "cp-qtd", "1"), "cp-qtd"),
          grupo("Valor (R$)", numero("valor", "cp-valor", "0"), "cp-valor"),
          grupo("Prazo Pgto", seletorPrazo, "cp-prazo"),
          grupo("Status Pgto", lugarPgto, "cp-status-pgto")),
        h("label", { class: "cp-recebido", for: "cp-recebido" },
          h("span", { class: "cp-recebido-icone" }, icone("dinheiro")),
          h("span", { class: "cp-recebido-textos" }, h("strong", {}, "Pagamento Recebido?"), h("span", {}, "Marque quando o pagamento for confirmado")),
          chave, h("span", { class: "cp-chave", "aria-hidden": "true" })),
        datasFluxo, roteiro,
        grupo("Link do conteúdo entregue", entrada({ id: "cp-link", type: "url", value: d.link || "", placeholder: "https://...", oninput: (e) => { d.link = e.target.value; } }), "cp-link"),
        observacoes);
    } else {
      j.corpo.append(
        grupo("📝 Título do Conteúdo *", titulo, "cp-titulo", h("p", { class: "cp-dica" }, "Identifique claramente o conteúdo ou campanha")),
        h("div", { class: "jm-duas" }, grupo("Cliente", seletorCliente, "cp-cliente"), grupo("Tipo", seletorTipo, "cp-tipo", dicaTipo)),
        h("div", { class: "jm-caixa" },
          h("h4", {}, "💰 Financeiro"),
          h("div", { class: "cp-tres" },
            grupo("Qtd Vídeos", numero("qtd", "cp-qtd", "1"), "cp-qtd"),
            grupo("Valor (R$)", numero("valor", "cp-valor", "0"), "cp-valor"),
            grupo("Prazo Pgto", seletorPrazo, "cp-prazo"))),
        roteiro, datasFluxo, observacoes);
    }

    const criar = h("button", { class: "btn btn-primario jm-principal", type: "button", disabled: !d.titulo, onclick: salvar }, c ? "Salvar" : "Criar Conteúdo");
    j.rodape.append(h("button", { class: "btn jm-secundario", type: "button", onclick: j.fechar }, "Cancelar"), criar);
    titulo.focus();

    async function salvar() {
      if (Dados.semBanco) { avisoSemBanco(); return; }
      const valor = numeroBR(d.valor);
      const qtd = Math.round(numeroBR(d.qtd) ?? 1);
      if (d.valor !== "" && d.valor !== undefined && d.valor !== null && valor === null) { toast("O valor precisa ser um número. Ex: 1.500,00", "erro"); return; }
      const datas = Object.fromEntries(DATAS_CAMPANHA.filter((e) => d.datas[e]).map((e) => [e, d.datas[e]]));
      const cliente = String(d.cliente || "").trim() || null;
      const id = c?.id || (crypto.randomUUID ? crypto.randomUUID() : null);
      const linha = {
        titulo: d.titulo.trim(), cliente, tipo: d.tipo, status: d.status, qtd: Math.max(0, qtd || 0), valor: Math.max(0, valor || 0),
        prazo_pgto: Number(d.prazo_pgto) || 0, roteiro: d.roteiro?.trim() || null, notas: d.notas?.trim() || null, datas,
        link: d.link?.trim() ? linkSeguro(d.link.trim()) : null, status_pgto: d.status_pgto, pago: d.status_pgto === "pago",
      };
      criar.disabled = true;
      const r = c ? await Dados.salvarLinha("campanhas", { ...linha, id }) : await Dados.inserirVarias("campanhas", [{ ...linha, id }]);
      criar.disabled = false;
      if (!r.ok) { toast(`Não consegui salvar: ${r.erro}`, "erro"); return; }
      // Cliente novo vai pra aba Clientes
      if (cliente && !clientes.some((k) => chaveNome(k.nome) === chaveNome(cliente))) await Dados.inserirVarias("clientes", [{ nome: cliente, status: "ativo" }]);
      if (tarefas && id) {
        const pg = linha.pago ? null : pagamentoPrevisto({ ...linha });
        const eventos = [
          ...DATAS_CAMPANHA.filter((e) => datas[e]).map((e) => ({ data: datas[e], tipo: "campanha", titulo: `${ETAPAS_CAMPANHA[e][0]}: ${linha.titulo}${cliente ? ` (${cliente})` : ""}`, campanha_id: id })),
          ...(pg ? [{ data: pg, tipo: "vencimento", titulo: `Pagamento: ${linha.titulo} (${reais(linha.valor)})`, campanha_id: id }] : []),
        ];
        const t = await Dados.tarefasCampanha(id, eventos);
        if (!t.ok) toast(`A campanha foi salva, mas não consegui criar as tarefas: ${t.erro}`, "erro");
      }
      // Acabou de marcar como recebido: oferece lançar a entrada no Financeiro
      if (c && linha.pago && !c.pago && linha.valor > 0) await lancarNoFinanceiro({ ...c, ...linha });
      toast(c ? "Campanha salva!" : "Conteúdo criado!", "sucesso");
      j.fechar();
      carregar();
    }
  }

  // =================== PESSOAL ===================
  // ----- Janela Nova Ideia (conteúdo pessoal) -----
  function editarPessoal(item, data) {
    const d = item ? { ...item } : { status: "ideia", plataforma: "instagram", formato: "Reels", objetivo: "atracao", data: data || "" };
    const j = janelaMeta({ titulo: item ? "Editar Ideia" : "Nova Ideia" });
    j.caixa.classList.add("jm-nova-ideia");
    const grupo = (rotulo, campo, id) => h("div", { class: "jm-grupo" }, h("label", { class: "jm-rotulo mi-rotulo", for: id }, rotulo), campo);
    const titulo = h("input", {
      class: "campo jm-campo mi-titulo", id: "mi-titulo", value: d.titulo || "", placeholder: "Qual é a ideia do post?", "aria-label": "Qual é a ideia do post?",
      oninput: () => { d.titulo = titulo.value; salvarBtn.disabled = !titulo.value.trim(); },
    });
    // Etapas da lista; "Edição" só aparece se a ideia já estiver nela (antigas)
    const etapas = Object.keys(ETAPAS_CONTEUDO).filter((e) => e !== "edicao" || d.status === "edicao");
    const plataformas = Object.keys(PLATAFORMAS).filter((p) => p !== "ugc" || d.plataforma === "ugc");
    const formatos = d.formato && !FORMATOS.includes(d.formato) ? [...FORMATOS, d.formato] : FORMATOS;
    const objetivos = h("div", { class: "mi-objetivos", role: "radiogroup", "aria-label": "Objetivo do Conteúdo" });
    const pintarObjetivos = () => objetivos.replaceChildren(...Object.entries(OBJETIVOS).map(([v, [nome, ic]]) => h("button", {
      type: "button", role: "radio", class: `mi-objetivo${d.objetivo === v ? " ativo" : ""}`, "aria-checked": String(d.objetivo === v),
      onclick: () => { d.objetivo = d.objetivo === v ? null : v; pintarObjetivos(); },
    }, icone(ic), nome)));
    pintarObjetivos();

    j.corpo.append(
      h("div", { class: "mi-linha" },
        titulo,
        seletorSuspenso({
          id: "mi-status", opcoes: etapas.map((e) => ({ valor: e, texto: `${EMOJI_ETAPA[e]} ${ETAPAS_CONTEUDO[e]}` })), atual: d.status,
          aoMudar: (v) => { d.status = v; },
        })),
      h("div", { class: "cp-tres" },
        grupo("Plataforma", seletorSuspenso({
          id: "mi-plataforma", opcoes: plataformas.map((p) => ({ valor: p, texto: PLATAFORMAS[p], icone: ICONE_PLATAFORMA[p] })), atual: d.plataforma,
          aoMudar: (v) => { d.plataforma = v; },
        }), "mi-plataforma"),
        grupo("Formato", seletorSuspenso({
          id: "mi-formato", opcoes: formatos.map((f) => ({ valor: f, texto: f })), atual: d.formato || null, placeholder: "Escolha o formato",
          aoMudar: (v) => { d.formato = v; },
        }), "mi-formato"),
        grupo("Data Prevista", h("input", { class: "campo jm-campo", id: "mi-data", type: "date", value: d.data || "", onchange: (e) => { d.data = e.target.value || null; } }), "mi-data")),
      h("div", { class: "jm-grupo" }, h("span", { class: "jm-rotulo mi-rotulo" }, icone("alvo"), "Objetivo do Conteúdo"), objetivos),
      grupo("Roteiro & Legenda", h("textarea", {
        class: "campo jm-campo", id: "mi-roteiro", rows: "6", value: d.notas || "",
        placeholder: "Escreva aqui o roteiro do vídeo, descreva as cenas ou rascunhe a legenda do post...", oninput: (e) => { d.notas = e.target.value; },
      }), "mi-roteiro"));

    const salvarBtn = h("button", { class: "btn btn-primario jm-principal", type: "button", disabled: !d.titulo, onclick: salvar }, item ? "Salvar" : "Criar Conteúdo");
    j.rodape.append(h("button", { class: "btn jm-secundario", type: "button", onclick: j.fechar }, "Cancelar"), salvarBtn);
    titulo.focus();

    async function salvar() {
      const linha = {
        id: item?.id, titulo: d.titulo.trim(), status: d.status || "ideia", plataforma: d.plataforma || "instagram",
        formato: d.formato || null, data: d.data || null, objetivo: d.objetivo || null, notas: d.notas?.trim() || null,
      };
      salvarBtn.disabled = true;
      const ok = await salvarOuAvisar("conteudos", linha);
      salvarBtn.disabled = false;
      if (!ok) return;
      toast(item ? "Ideia salva!" : "Conteúdo criado!", "sucesso");
      j.fechar();
      carregar();
    }
  }

  function desenharPessoal() {
    const n = conteudos.length;
    const conta = (filtro) => conteudos.filter(filtro).length;
    const progresso = (rotulo, valor, cor) => h("div", { class: "cartao mc-cartao" },
      h("span", { class: "mc-rotulo" }, rotulo),
      h("p", { class: "mc-numero" }, h("strong", { class: `mc-${cor}` }, String(valor)), ` de ${n}`),
      h("div", { class: `plan-barra mc-barra-${cor}` }, h("span", { style: `width:${n ? (valor / n) * 100 : 0}%` })));

    // Semana (segunda a domingo)
    const dias = Array.from({ length: 7 }, (_, i) => new Date(pess.semana.getFullYear(), pess.semana.getMonth(), pess.semana.getDate() + i));
    const hoje = iso(new Date());
    const curto = (d) => MESES_CURTOS[d.getMonth()].toLowerCase();
    const NOMES = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
    const mudarSemana = (n7) => { pess.semana = new Date(pess.semana.getFullYear(), pess.semana.getMonth(), pess.semana.getDate() + n7); desenharPessoal(); };
    const rotuloSemana = dias[0].getMonth() === dias[6].getMonth()
      ? `${dias[0].getDate()} a ${dias[6].getDate()} ${curto(dias[6])}`
      : `${dias[0].getDate()} ${curto(dias[0])} a ${dias[6].getDate()} ${curto(dias[6])}`;

    const VALORES = {
      titulo: (t) => t.titulo, plataforma: (t) => PLATAFORMAS[t.plataforma] || t.plataforma, formato: (t) => t.formato,
      status: (t) => Object.keys(ETAPAS_CONTEUDO).indexOf(t.status), data: (t) => t.data,
    };
    const ordenados = pess.ordem.chave ? ordenarPor(conteudos, VALORES[pess.ordem.chave], pess.ordem.crescente) : conteudos;

    area.replaceChildren(
      h("div", { class: "mc-cartoes" },
        progresso("Finalizados", conta((t) => t.status === "publicado"), "verde"),
        progresso("Agendados", conta((t) => t.status === "agendado"), "lilas"),
        progresso("Em produção", conta((t) => ["roteiro", "gravacao", "edicao"].includes(t.status)), "vinho")),
      h("div", { class: "cartao mc-semana" },
        h("div", { class: "mc-semana-topo" },
          h("button", { class: "btn btn-fantasma btn-icone mc-seta", type: "button", "aria-label": "Semana anterior", onclick: () => mudarSemana(-7) }, icone("esquerda")),
          h("strong", {}, rotuloSemana),
          h("button", { class: "btn btn-fantasma btn-icone mc-seta", type: "button", "aria-label": "Próxima semana", onclick: () => mudarSemana(7) }, icone("direita"))),
        h("div", { class: "mc-dias" }, dias.map((d, i) => {
          const chave = iso(d);
          const doDia = conteudos.filter((t) => t.data === chave);
          return h("div", { class: `mc-dia${chave === hoje ? " hoje" : ""}` },
            h("button", { type: "button", class: "mc-dia-cabeca", title: "Adicionar conteúdo neste dia", onclick: () => editarPessoal(null, chave) },
              h("span", { class: "mc-dia-longo" }, NOMES[i]), h("span", { class: "mc-dia-curto" }, NOMES[i].slice(0, 3)), h("strong", {}, String(d.getDate()).padStart(2, "0"))),
            doDia.length
              ? doDia.map((t) => h("button", { type: "button", class: `mc-item mc-item-${t.status}`, title: `${t.titulo} (${ETAPAS_CONTEUDO[t.status]})`, onclick: () => editarPessoal(t) }, t.titulo))
              : h("span", { class: "mc-traco", "aria-hidden": "true" }));
        }))),
      h("div", { class: "mc-titulo" }, h("h2", {}, "Meu Conteúdo"), h("p", { class: "sub" }, "Gerencie suas ideias e produções de conteúdo pessoal")),
      h("div", { class: "cartao mc-tabela", role: "table" },
        cabecaOrdenavel([["titulo", "Ideia / Título"], ["plataforma", "Plataforma"], ["formato", "Formato"], ["status", "Status"], ["data", "Data prevista"], ["", ""]],
          pess.ordem, (chave) => { pess.ordem = { chave, crescente: pess.ordem.chave === chave ? !pess.ordem.crescente : true }; desenharPessoal(); }, "mc-linha"),
        ordenados.length
          ? ordenados.map((t) => h("div", { class: "mc-linha", role: "row", tabindex: "0", onclick: () => editarPessoal(t), onkeydown: (e) => { if (e.key === "Enter") editarPessoal(t); } },
            h("span", { class: "mc-nome", "data-rotulo": "Ideia / Título", title: t.titulo }, t.titulo),
            h("span", { "data-rotulo": "Plataforma" }, PLATAFORMAS[t.plataforma] || t.plataforma),
            h("span", { "data-rotulo": "Formato" }, t.formato || "-"),
            h("span", { "data-rotulo": "Status" }, h("span", { class: `mc-status mc-item-${t.status}` }, ETAPAS_CONTEUDO[t.status])),
            h("span", { class: t.data && t.data < hoje && t.status !== "publicado" ? "mc-atrasado" : "", "data-rotulo": "Data prevista" }, t.data ? dataBR(t.data) : "-"),
            h("span", { class: "mc-acoes" }, botaoApagar(`Apagar ${t.titulo}`, `Apagar "${t.titulo}"? Isso não tem volta.`, "conteudos", t.id, carregar))))
          : h("div", { class: "mc-vazio" }, icone("calendario"), h("p", {}, "Nenhum conteúdo ainda"),
            h("button", { class: "btn btn-primario", type: "button", onclick: () => editarPessoal(null) }, icone("mais"), "Novo Conteúdo"))));
  }
  await carregar();
}

// ---------------------------------------------------------------------
// CLIENTES
// ---------------------------------------------------------------------
const STATUS_CLIENTE = { ativo: "Ativo", prospect: "Prospect", permuta: "Permuta", inativo: "Inativo" };
// Ficha do cliente: status com cor, nichos, tags e tipos de interação
const STATUS_FICHA = { prospect: ["Prospecção", "#6b7280"], ativo: ["Cliente Ativo", "#22c55e"], permuta: ["Permuta", "#a855f7"], inativo: ["Inativo", "#cbd5e1"] };
const NICHOS = ["Beleza", "Moda", "Tech", "Saúde", "Gastronomia", "Bem Estar", "Fitness", "Outro"];
const TAGS_CLIENTE = [
  ["Bom Pagador", "verde"], ["Atrasa Pagamento", "vermelho"], ["Recorrente", "azul"], ["Exigente", "laranja"],
  ["Briefing Detalhado", "verde"], ["Não Lê Briefing", "vermelho"], ["Aprova Rápido", "verde"], ["Pede Muitos Ajustes", "vermelho"],
];
const TIPOS_INTERACAO = {
  email: ["Email", "email"], whatsapp: ["WhatsApp", "balao"], ligacao: ["Ligação", "telefone"],
  reuniao: ["Reunião", "usuarios"], proposta: ["Proposta", "contrato"], nota: ["Nota", "arquivo"],
};
const tiktokLimpo = (v) => (v ? String(v).trim().replace(/^https?:\/\/(www\.)?tiktok\.com\//i, "").replace(/^@/, "").replace(/[/?].*$/, "") || null : null);
const ABAS_CLIENTES = {
  base: ["Base de Contatos", null],
  abordagem: ["Em Abordagem", "🔄"],
  historico: ["Histórico de Clientes", "⭐"],
};

async function telaClientes(p) {
  let clientes = [], contratos = [], receitas = [], campanhas = [];
  const est = { aba: "base", termo: "", ordem: "recentes", marcados: new Set() };
  const sino = botaoAvisos("clientes");
  const resumo = h("div", { class: "fin-cartoes cl-cartoes" });
  const abas = h("div", { class: "cl-abas", role: "tablist", "aria-label": "Listas de clientes" });
  const tabela = h("div", { class: "cl-tabela" }, h("p", { class: "carregando" }, "Carregando..."));
  const busca = h("input", {
    class: "campo campo-busca", type: "search", placeholder: "Buscar por nome, responsável, email ou nicho...", "aria-label": "Buscar clientes",
    oninput: (e) => { est.termo = e.target.value; desenharTabela(); },
  });
  const ordem = h("button", { type: "button", class: "cl-ordem", onclick: () => { est.ordem = est.ordem === "recentes" ? "az" : "recentes"; desenharTabela(); } });
  p.append(
    h("div", { class: "fin-topo" },
      h("span", { class: "fin-topo-icone" }, icone("predio")),
      h("div", { class: "fin-topo-textos" }, h("h1", {}, "Clientes"), h("p", { class: "sub" }, "Gerencie sua rede de clientes e parceiros")),
      h("div", { class: "fin-topo-acoes" }, sino,
        h("button", { class: "btn btn-primario fin-nova", type: "button", onclick: () => editar(null) }, icone("usuarioMais"), "Novo Cliente"))),
    resumo, abas,
    h("div", { class: "cartao cl-caixa" },
      h("div", { class: "cl-ferramentas" }, h("span", { class: "busca-caixa cl-busca" }, icone("lupa"), busca), ordem),
      tabela));

  // Já trabalhou: tem campanha, contrato ou entrada no Financeiro com o nome dele (ou da empresa)
  function jaTrabalhou(c) {
    const nomes = [c.nome, c.empresa].filter(Boolean).map(chaveNome);
    return contratos.some((k) => k.cliente_id === c.id)
      || campanhas.some((k) => nomes.includes(chaveNome(k.cliente)))
      || receitas.some((t) => t.status !== "pendente" && nomes.includes(chaveNome(t.cliente)));
  }
  const precisaFollowup = (c) => c.followup && c.followup <= iso(new Date());

  async function carregar() {
    [clientes, contratos, receitas, campanhas] = await Promise.all([
      Dados.lista("clientes", (c) => c.order("created_at", { ascending: false })),
      Dados.lista("contratos"),
      Dados.lista("fin_transacoes", (c) => c.eq("tipo", "receita").not("cliente", "is", null)),
      Dados.lista("campanhas"),
    ]);
    est.marcados.clear();
    atualizarAvisos(true);
    desenhar();
  }

  // ----- Ficha do cliente (dados à esquerda, histórico de interações à direita) -----
  function editar(cli) {
    const hoje = iso(new Date());
    const d = cli
      ? { ...cli, tags: Array.isArray(cli.tags) ? [...cli.tags] : [], instagram: cli.instagram ? `@${cli.instagram}` : "", tiktok: cli.tiktok ? `@${cli.tiktok}` : "" }
      : { status: "prospect", tags: [], recorrente: false };
    const id = cli?.id || (crypto.randomUUID ? crypto.randomUUID() : null);
    let interacoes = [];
    const pendentes = []; // interações registradas antes de criar o cliente
    const selo = h("span", { class: "cf-selo" });
    const pintarSelo = () => { selo.className = `cf-selo cf-selo-${d.status}`; selo.textContent = STATUS_FICHA[d.status][0]; };
    pintarSelo();
    const j = janelaMeta({ titulo: d.nome || "Novo Cliente", iconeTopo: h("span", { class: "jm-icone-solto" }, icone("predio")), extraTopo: selo });
    j.caixa.classList.add("jm-cliente");
    if (!cli) { j.caixa.classList.add("jm-cliente-novo"); selo.hidden = true; } // criar: uma coluna, sem histórico
    const tituloJanela = j.caixa.querySelector(".jm-topo h2");

    const entrada = (chave, { aoDigitar, ...atrs } = {}) => h("input", {
      class: "campo jm-campo", id: `cf-${chave}`, value: d[chave] ?? "", ...atrs,
      oninput: (e) => { d[chave] = e.target.value; aoDigitar?.(); },
    });
    const grupo = (rotulo, campo, chave, extra) => h("div", { class: "jm-grupo" }, h("label", { class: "jm-rotulo", for: `cf-${chave}` }, rotulo, extra || ""), campo);
    const secao = (texto) => h("h3", { class: "cf-secao" }, texto);
    const nome = entrada("nome", { placeholder: "Ex: Nike, Avon, Salão da Juju", aoDigitar: () => { if (cli) tituloJanela.textContent = d.nome.trim() || cli.nome; salvar.disabled = !d.nome.trim(); } });
    const datas = { ultimo_contato: null, followup: null };
    const campoData = (chave) => (datas[chave] = h("input", { class: "campo jm-campo", id: `cf-${chave}`, type: "date", value: d[chave] || "", onchange: (e) => { d[chave] = e.target.value || null; } }));
    const nichos = d.nicho && !NICHOS.includes(d.nicho) ? [...NICHOS, d.nicho] : NICHOS;

    // Tags: chips coloridos + "+ Tag" com a lista pra marcar/desmarcar
    const tagsCaixa = h("div", { class: "cf-tags" });
    const corTag = (t) => (TAGS_CLIENTE.find(([n]) => n === t)?.[1]) || "cinza";
    function pintarTags() {
      tagsCaixa.replaceChildren(
        ...d.tags.map((t) => h("span", { class: `cf-tag cf-tag-${corTag(t)}` }, t,
          h("button", { type: "button", "aria-label": `Tirar a tag ${t}`, onclick: () => { d.tags = d.tags.filter((x) => x !== t); pintarTags(); } }, icone("x")))),
        h("div", { class: "cs-caixa cf-tag-caixa" }, botaoTag));
    }
    const botaoTag = h("button", { type: "button", class: "cf-mais-tag", "aria-haspopup": "listbox", onclick: () => abrirTags() }, icone("mais"), "Tag");
    function abrirTags() {
      const caixa = botaoTag.parentElement;
      if (caixa.querySelector(".cs-pop")) { caixa.querySelector(".cs-pop").remove(); return; }
      const pop = h("div", { class: "cs-pop cf-tags-pop", onkeydown: (e) => { if (e.key === "Escape") { e.stopPropagation(); pop.remove(); botaoTag.focus(); } } },
        h("p", { class: "cf-tags-titulo" }, icone("etiqueta"), "Selecionar tags"),
        ...TAGS_CLIENTE.map(([t, cor]) => h("button", {
          type: "button", role: "option", class: `cs-item${d.tags.includes(t) ? " ativo" : ""}`, "aria-selected": String(d.tags.includes(t)),
          onclick: () => { d.tags = d.tags.includes(t) ? d.tags.filter((x) => x !== t) : [...d.tags, t]; pintarTags(); abrirTags(); },
        }, h("span", { class: `cf-ponto cf-ponto-${cor}` }), h("span", {}, t), d.tags.includes(t) ? icone("check") : "")));
      caixa.append(pop);
      pop.querySelector(".cs-item")?.focus();
      const fora = (e) => { if (!caixa.contains(e.target)) { pop.remove(); document.removeEventListener("mousedown", fora, true); } };
      document.addEventListener("mousedown", fora, true);
    }
    pintarTags();

    const meusContratos = cli ? contratos.filter((k) => k.cliente_id === cli.id) : [];
    const esquerda = h("div", { class: "cf-coluna cf-dados" },
      secao("Dados corporativos"),
      grupo("Nome da Marca / Empresa *", nome, "nome"),
      grupo("CNPJ", entrada("cnpj", { placeholder: "00.000.000/0000-00", inputmode: "numeric" }), "cnpj"),
      grupo("Nicho", seletorSuspenso({
        id: "cf-nicho", opcoes: nichos.map((n) => ({ valor: n, texto: n })), atual: d.nicho || null, placeholder: "Selecione o nicho",
        aoMudar: (v) => { d.nicho = v; },
      }), "nicho"),
      h("div", { class: "jm-duas cf-duas" },
        grupo("Instagram", entrada("instagram", { placeholder: "@marca ou link" }), "instagram"),
        grupo("TikTok", entrada("tiktok", { placeholder: "@marca ou link" }), "tiktok")),
      secao("Contato principal"),
      grupo("Nome do Responsável", entrada("responsavel", { placeholder: "Ex: Juliana, Mkt" }), "responsavel"),
      h("div", { class: "jm-duas cf-duas" },
        grupo("Email", entrada("email", { type: "email", placeholder: "contato@empresa.com" }), "email"),
        grupo("Telefone / WhatsApp", entrada("telefone", { type: "tel", placeholder: "(11) 99999-9999" }), "telefone")),
      secao("Status & gestão"),
      grupo("Status Atual", seletorSuspenso({
        id: "cf-status", atual: d.status,
        // Inativo só aparece pra quem já está cadastrado
        opcoes: Object.entries(STATUS_FICHA).filter(([v]) => cli || v !== "inativo").map(([v, [texto, cor]]) => ({ valor: v, texto, icone: "bolinha", cor })),
        aoMudar: (v) => { d.status = v; pintarSelo(); },
      }), "status"),
      h("div", { class: "jm-duas cf-duas" },
        grupo("Último Contato", campoData("ultimo_contato"), "ultimo_contato"),
        grupo("Próximo Follow-Up", campoData("followup"), "followup")),
      h("label", { class: "cf-recorrente" },
        h("input", { type: "checkbox", id: "cf-recorrente", checked: !!d.recorrente, onchange: (e) => { d.recorrente = e.target.checked; } }), "Cliente recorrente"),
      grupo("Valor Potencial (R$)", entrada("valor_potencial", { placeholder: "0,00", inputmode: "decimal", value: d.valor_potencial ? String(d.valor_potencial).replace(".", ",") : "" }), "valor_potencial"),
      secao("Tags do cliente"),
      tagsCaixa,
      secao("Detalhes extras"),
      grupo("Notas / Observações", h("textarea", { class: "campo jm-campo", id: "cf-notas", rows: "3", value: d.notas || "", placeholder: "Anotações sobre pagamentos, briefing, preferências...", oninput: (e) => { d.notas = e.target.value; } }), "notas"),
      cli ? secao("Contratos") : "",
      !cli ? "" : meusContratos.length
        ? h("ul", { class: "cf-contratos" }, meusContratos.map((k) => h("li", {}, h("span", {}, k.titulo), h("strong", {}, reais(k.valor)), h("span", { class: `selo selo-${k.status}` }, STATUS_CONTRATO[k.status]))))
        : h("p", { class: "cf-vazio" }, "Nenhum contrato vinculado."),
      !cli ? "" : h("button", { type: "button", class: "cf-ver-contratos", onclick: () => { j.fechar(); location.hash = "#contratos"; } }, icone("direita"), "Ver Todos os Contratos"));

    // ----- Histórico de interações -----
    let tipo = "nota";
    const tipos = h("div", { class: "cf-tipos", role: "radiogroup", "aria-label": "Tipo de interação" });
    const pintarTipos = () => tipos.replaceChildren(...Object.entries(TIPOS_INTERACAO).map(([v, [nomeTipo, ic]]) => h("button", {
      type: "button", role: "radio", class: `cf-tipo${tipo === v ? " ativo" : ""}`, "aria-checked": String(tipo === v), onclick: () => { tipo = v; pintarTipos(); },
    }, icone(ic), nomeTipo)));
    pintarTipos();
    const texto = h("textarea", { class: "campo jm-campo", id: "cf-interacao", rows: "3", placeholder: "Descreva a interação...", "aria-label": "Descreva a interação", oninput: () => { registrar.disabled = !texto.value.trim(); } });
    const proxAcao = h("input", { class: "campo jm-campo", id: "cf-prox-acao", placeholder: "Ex: Enviar proposta atualizada" });
    const proxData = h("input", { class: "campo jm-campo", id: "cf-prox-data", type: "date" });
    const registrar = h("button", { type: "button", class: "btn btn-primario cf-registrar", disabled: true, onclick: registrarInteracao }, icone("mais"), "Registrar Interação");
    const lista = h("div", { class: "cf-historico" });
    const direita = h("div", { class: "cf-coluna cf-interacoes" },
      secao("Histórico de interações"),
      h("div", { class: "cf-nova" }, tipos, texto,
        h("div", { class: "jm-duas cf-duas" },
          h("div", { class: "jm-grupo" }, h("label", { class: "jm-rotulo", for: "cf-prox-acao" }, "Próxima ação (opcional)"), proxAcao),
          h("div", { class: "jm-grupo" }, h("label", { class: "jm-rotulo", for: "cf-prox-data" }, "Data da próxima ação"), proxData)),
        registrar),
      lista);

    function pintarHistorico() {
      const todas = [...pendentes, ...interacoes];
      lista.replaceChildren(...(todas.length ? todas.map((it) => h("div", { class: "cf-item" },
        h("span", { class: `cf-item-icone cf-tipo-${it.tipo}` }, icone(TIPOS_INTERACAO[it.tipo]?.[1] || "arquivo")),
        h("div", { class: "cf-item-textos" },
          h("div", { class: "cf-item-topo" }, h("strong", {}, TIPOS_INTERACAO[it.tipo]?.[0] || it.tipo), h("span", {}, dataBR(it.created_at || hoje))),
          h("p", {}, it.texto),
          it.proxima_acao || it.proxima_data ? h("p", { class: "cf-item-prox" }, icone("relogio"), [it.proxima_acao, it.proxima_data ? `até ${dataBR(it.proxima_data)}` : ""].filter(Boolean).join(" ")) : ""),
        h("button", {
          type: "button", class: "btn btn-fantasma btn-icone btn-perigo", "aria-label": "Apagar interação", title: "Apagar",
          onclick: async () => {
            if (!confirm("Apagar essa interação?")) return;
            if (pendentes.includes(it)) pendentes.splice(pendentes.indexOf(it), 1);
            else if (await Dados.apagarLinha("cliente_interacoes", it.id)) interacoes = interacoes.filter((x) => x !== it);
            else { toast("Não consegui apagar.", "erro"); return; }
            pintarHistorico();
          },
        }, icone("lixo"))))
        : [h("p", { class: "cf-vazio cf-vazio-centro" }, "Nenhuma interação registrada ainda.")]));
    }

    async function registrarInteracao() {
      const nova = { cliente_id: id, tipo, texto: texto.value.trim(), proxima_acao: proxAcao.value.trim() || null, proxima_data: proxData.value || null };
      if (!nova.texto) return;
      // Registrar conta como contato de hoje; a próxima ação vira o próximo follow-up
      d.ultimo_contato = hoje; datas.ultimo_contato.value = hoje;
      if (nova.proxima_data) { d.followup = nova.proxima_data; datas.followup.value = nova.proxima_data; }
      if (cli) {
        if (Dados.semBanco) { avisoSemBanco(); return; }
        registrar.disabled = true;
        const r = await Dados.inserirVarias("cliente_interacoes", [nova]);
        if (!r.ok) { toast(`Não consegui registrar: ${r.erro}`, "erro"); registrar.disabled = false; return; }
        await Dados.salvarLinha("clientes", { id, ultimo_contato: d.ultimo_contato, followup: d.followup || null });
        interacoes.unshift({ ...nova, created_at: new Date().toISOString() });
        toast("Interação registrada!", "sucesso");
      } else {
        pendentes.unshift({ ...nova, created_at: new Date().toISOString() });
      }
      texto.value = ""; proxAcao.value = ""; proxData.value = ""; registrar.disabled = true;
      pintarHistorico();
    }

    j.corpo.append(esquerda, cli ? direita : "");
    const salvar = h("button", { class: "btn btn-primario jm-principal", type: "button", disabled: !d.nome, onclick: salvarCliente }, cli ? "Salvar Alterações" : "Criar Cliente");
    j.rodape.append(h("span"), h("div", { class: "jm-rodape-dir" }, h("button", { class: "btn jm-secundario", type: "button", onclick: j.fechar }, "Cancelar"), salvar));
    pintarHistorico();
    if (cli) Dados.lista("cliente_interacoes", (c) => c.eq("cliente_id", cli.id).order("created_at", { ascending: false }))
      .then((l) => { interacoes = l.filter((x) => x.cliente_id === cli.id); pintarHistorico(); });
    if (!cli) nome.focus();

    async function salvarCliente() {
      if (Dados.semBanco) { avisoSemBanco(); return; }
      const valor = numeroBR(d.valor_potencial);
      if (String(d.valor_potencial ?? "").trim() && valor === null) { toast("O valor potencial precisa ser um número. Ex: 5.000,00", "erro"); return; }
      const limpa = (v) => String(v || "").trim() || null;
      const linha = {
        id, nome: d.nome.trim(), cnpj: limpa(d.cnpj), nicho: d.nicho || null, instagram: arrobaLimpa(d.instagram), tiktok: tiktokLimpo(d.tiktok),
        responsavel: limpa(d.responsavel), email: limpa(d.email), telefone: limpa(d.telefone), status: d.status,
        ultimo_contato: d.ultimo_contato || null, followup: d.followup || null, recorrente: !!d.recorrente, valor_potencial: valor,
        tags: d.tags, notas: limpa(d.notas),
      };
      salvar.disabled = true;
      const r = cli ? await Dados.salvarLinha("clientes", linha) : await Dados.inserirVarias("clientes", [linha]);
      salvar.disabled = false;
      if (!r.ok) { toast(`Não consegui salvar: ${r.erro}`, "erro"); return; }
      if (!cli && pendentes.length) await Dados.inserirVarias("cliente_interacoes", pendentes.map(({ created_at, ...it }) => it));
      toast(cli ? "Alterações salvas!" : "Cliente criado!", "sucesso");
      j.fechar();
      carregar();
    }
  }

  async function mudar(ids, dados, msg) {
    if (Dados.semBanco) { avisoSemBanco(); return; }
    const r = await Promise.all(ids.map((id) => Dados.salvarLinha("clientes", { id, ...dados })));
    if (r.every((x) => x.ok)) toast(msg, "sucesso"); else toast("Não consegui salvar tudo.", "erro");
    carregar();
  }
  async function apagar(ids) {
    const nomes = clientes.filter((c) => ids.includes(c.id)).map((c) => c.nome);
    if (!confirm(`Apagar ${ids.length === 1 ? `o cliente "${nomes[0]}"` : `${ids.length} clientes`}? Os contratos continuam, só ficam sem cliente.`)) return;
    if (Dados.semBanco) { avisoSemBanco(); return; }
    const r = await Promise.all(ids.map((id) => Dados.apagarLinha("clientes", id)));
    toast(r.every(Boolean) ? "Apagado." : "Não consegui apagar tudo.", r.every(Boolean) ? "" : "erro");
    carregar();
  }

  function desenhar() {
    const mes = chaveMes(new Date());
    const doMes = (x) => String(x.updated_at || "").slice(0, 7) === mes;
    const fechados = contratos.filter((k) => k.status === "assinado" && doMes(k)).length
      + campanhas.filter((k) => k.status === "finalizada" && doMes(k)).length;
    const cartao = (rotulo, valor, ic, cor, detalhe, extra) => h("div", { class: `cartao fin-cartao${extra ? ` ${extra}` : ""}` },
      h("div", { class: "fin-cartao-topo" }, h("span", {}, rotulo), h("span", { class: `fin-icone fin-${cor}` }, icone(ic))),
      h("strong", { class: `fin-valor fin-txt-${cor}` }, fmt(valor)), h("span", { class: "cp-detalhe" }, detalhe));
    resumo.replaceChildren(
      cartao("Carteira ativa", clientes.filter((c) => c.status === "ativo").length, "carteira", "verde", "Clientes rendendo agora", "cl-destaque"),
      cartao("No pipeline", clientes.filter((c) => c.status === "prospect").length, "alvo", "lilas", "Em prospecção ativa"),
      cartao("Follow-up hoje", clientes.filter(precisaFollowup).length, "relogio", "neutro", "Precisam de atenção"),
      cartao("Fechados este mês", fechados, "check", "verde", "Negócios concluídos"));
    desenharTabela();
  }

  const daAba = (aba) => (aba === "abordagem" ? clientes.filter((c) => c.status === "prospect")
    : aba === "historico" ? clientes.filter(jaTrabalhou) : clientes);

  function desenharTabela() {
    abas.replaceChildren(...Object.entries(ABAS_CLIENTES).map(([chave, [nome, emoji]]) => h("button", {
      type: "button", role: "tab", class: `cl-aba${est.aba === chave ? " ativa" : ""}`, "aria-selected": String(est.aba === chave),
      onclick: () => { est.aba = chave; est.marcados.clear(); desenharTabela(); },
    }, emoji ? h("span", { "aria-hidden": "true" }, emoji) : null, nome, h("span", { class: "cl-aba-conta" }, String(daAba(chave).length)))));
    ordem.replaceChildren(icone("ordenar"), est.ordem === "recentes" ? "Recentes" : "A a Z");

    if (!clientes.length) {
      tabela.replaceChildren(estadoVazio("predio", "Nenhum cliente ainda", "Cadastre seus clientes e parceiros pra acompanhar quem está ativo, em abordagem e o histórico com cada um.",
        h("button", { class: "btn btn-primario", type: "button", onclick: () => editar(null) }, icone("usuarioMais"), "Novo Cliente")));
      return;
    }
    const t = chaveNome(est.termo);
    let lista = daAba(est.aba).filter((c) => !t || chaveNome([c.nome, c.empresa, c.responsavel, c.email, c.nicho, c.instagram].join(" ")).includes(t));
    if (est.ordem === "az") lista = ordenarPor(lista, (c) => c.nome, true);
    const todosMarcados = lista.length > 0 && lista.every((c) => est.marcados.has(c.id));
    const marcar = (id, sim) => { if (sim) est.marcados.add(id); else est.marcados.delete(id); desenharTabela(); };
    const escolhidos = [...est.marcados];

    tabela.replaceChildren(
      escolhidos.length ? h("div", { class: "cl-massa" },
        h("strong", {}, `${escolhidos.length} ${escolhidos.length === 1 ? "selecionado" : "selecionados"}`),
        h("button", { class: "btn btn-pequeno", type: "button", onclick: () => mudar(escolhidos, { status: "ativo" }, "Marcados como Ativo.") }, "Marcar como Ativo"),
        h("button", { class: "btn btn-pequeno", type: "button", onclick: () => mudar(escolhidos, { status: "inativo" }, "Marcados como Inativo.") }, "Marcar como Inativo"),
        h("button", { class: "btn btn-pequeno btn-perigo", type: "button", onclick: () => apagar(escolhidos) }, icone("lixo"), "Apagar")) : "",
      h("div", { class: "cl-linha tab-cabeca", role: "row" },
        h("span", {}, h("input", { type: "checkbox", class: "cl-check", "aria-label": "Marcar todos", checked: todosMarcados, onchange: (e) => { lista.forEach((c) => (e.target.checked ? est.marcados.add(c.id) : est.marcados.delete(c.id))); desenharTabela(); } })),
        h("span", {}, "Empresa"), h("span", {}, "Nicho"), h("span", {}, "Contato"), h("span", {}, "Tag"), h("span", {}, ""), h("span", {}, "")),
      ...(lista.length ? lista.map((c) => {
        const trabalhou = jaTrabalhou(c);
        const tag = trabalhou ? ["ja", "Já trabalhou"] : c.status === "prospect" ? ["abordagem", "Em abordagem"] : ["novo", "Novo contato"];
        const contato = [c.responsavel, c.email || c.telefone].filter(Boolean);
        return h("div", {
          class: `cl-linha${est.marcados.has(c.id) ? " marcada" : ""}`, role: "row", tabindex: "0",
          onclick: () => editar(c), onkeydown: (e) => { if (e.key === "Enter" && e.target.classList.contains("cl-linha")) editar(c); },
        },
        h("span", { onclick: (e) => e.stopPropagation() }, h("input", { type: "checkbox", class: "cl-check", "aria-label": `Marcar ${c.nome}`, checked: est.marcados.has(c.id), onchange: (e) => marcar(c.id, e.target.checked) })),
        h("span", { class: "cl-nome", "data-rotulo": "Empresa", title: c.nome }, c.nome,
          precisaFollowup(c) ? h("small", { class: "cl-followup" }, icone("relogio"), c.followup < iso(new Date()) ? "Follow-up atrasado" : "Follow-up hoje") : null),
        h("span", { "data-rotulo": "Nicho" }, c.nicho || "-"),
        h("span", { "data-rotulo": "Contato", class: "cl-contato" }, contato.length ? contato.map((x) => h("span", {}, x)) : "-"),
        h("span", { "data-rotulo": "Tag" }, h("span", { class: `cl-tag cl-tag-${tag[0]}` }, tag[1])),
        h("span", { class: "cl-status-cel" }, h("span", { class: `cl-status cl-status-${c.status}` }, STATUS_CLIENTE[c.status])),
        h("button", {
          type: "button", class: "btn btn-fantasma btn-icone cp-mais", title: "Mais opções", "aria-label": `Mais opções de ${c.nome}`,
          onclick: (e) => {
            e.stopPropagation();
            const zap = String(c.telefone || "").replace(/\D/g, "");
            menuSuspenso(e.currentTarget, [
              ["lapis", "Editar", () => editar(c)],
              ["relogio", "Follow-up amanhã", () => mudar([c.id], { followup: iso(new Date(Date.now() + 864e5)) }, "Follow-up marcado pra amanhã.")],
              c.followup ? ["check", "Follow-up feito", () => mudar([c.id], { followup: null }, "Follow-up concluído.")] : null,
              zap ? ["telefone", "Chamar no WhatsApp", () => window.open(`https://wa.me/${zap.length <= 11 ? `55${zap}` : zap}`, "_blank", "noopener")] : null,
              ["contrato", "Ver contratos", () => { location.hash = "#contratos"; }],
              ["lixo", "Apagar", () => apagar([c.id]), true],
            ]);
          },
        }, "•••"));
      }) : [h("p", { class: "carregando cl-sem" }, "Nenhum cliente nessa lista.")]));
  }

  await carregar();
}

// ---------------------------------------------------------------------
// PRECIFICAÇÃO: quanto cobrar e quando aceitar um trabalho
// ---------------------------------------------------------------------
const PRECO_PADRAO = { fixos: "", equipamento: "", vida: "24", direto: "", renda: "", capacidade: "20", margem: "15", imposto: "0", agenda: 70 };

// Preço de tabela = (custos fixos + equipamento por mês + renda) ÷ trabalhos por mês
// + gasto direto, com a margem por cima e o imposto "por dentro".
// Mínimo de hoje: vai do gasto direto (agenda vazia) ao preço de tabela (agenda cheia),
// subindo devagar no começo (agenda² ), porque espaço livre vale menos que espaço disputado.
function calcularPreco(v) {
  const n = (k) => Math.max(0, numeroBR(v[k]) ?? 0);
  const vida = n("vida");
  const fixos = n("fixos") + (vida > 0 ? n("equipamento") / vida : 0);
  const capacidade = n("capacidade");
  const direto = n("direto");
  const margem = n("margem") / 100;
  const imposto = Math.min(n("imposto"), 95) / 100;
  if (!capacidade) return { fixos, direto, preco: null };
  const preco = ((fixos + n("renda")) / capacidade + direto) * (1 + margem) / (1 - imposto);
  const sobraPorTrabalho = preco * (1 - imposto) - direto;
  const minimoCom = (agenda) => direto + (preco - direto) * (agenda / 100) ** 2;
  return {
    fixos, direto, preco, imposto,
    equilibrio: sobraPorTrabalho > 0 ? fixos / sobraPorTrabalho : null,
    minimo: minimoCom(Number(v.agenda) || 0),
    minimoCom,
  };
}

async function telaPrecificacao(p) {
  let v = { ...PRECO_PADRAO };
  let oferta = "";
  const saidas = {
    preco: h("strong", { class: "pc-preco-valor" }),
    equilibrio: h("p", { class: "pc-equilibrio-texto" }),
    agendaPct: h("strong", { class: "pc-agenda-pct" }),
    agendaDica: h("p", { class: "pc-dica" }),
    direto: h("strong"),
    minimo: h("strong"),
    marca: h("span", { class: "pc-marca", "aria-hidden": "true" }),
    escalaFim: h("span"),
    escalaInicio: h("span"),
    veredito: h("div", { class: "pc-veredito", role: "status", "aria-live": "polite" }),
  };
  const agenda = h("input", { type: "range", min: "0", max: "100", step: "5", class: "pc-agenda", id: "pc-agenda", "aria-label": "Quão cheia está sua agenda?",
    oninput: (e) => { v.agenda = Number(e.target.value); calcular(); } });

  // Campo com "R$" ou "%" dentro
  const campo = (chave, rotulo, { prefixo = "R$", sufixo = null, dica = null } = {}) => {
    const entrada = h("input", { class: "pc-entrada", id: `pc-${chave}`, inputmode: "decimal", value: v[chave] ?? "", placeholder: "0",
      oninput: (e) => { v[chave] = e.target.value; calcular(); } });
    return h("div", { class: "jm-grupo pc-grupo" },
      h("label", { class: "jm-rotulo", for: `pc-${chave}` }, rotulo),
      h("div", { class: "pc-campo" }, prefixo ? h("span", { class: "pc-prefixo" }, prefixo) : "", entrada, sufixo ? h("span", { class: "pc-sufixo" }, sufixo) : ""),
      dica ? h("p", { class: "pc-dica" }, dica) : "");
  };

  // Carrega o que foi salvo (antes de desenhar os campos)
  try { const salvo = JSON.parse(await Dados.lerConfig("precificacao")); if (salvo && typeof salvo === "object") v = { ...v, ...salvo }; } catch { /* ok */ }
  agenda.value = String(v.agenda);

  const ofertaEntrada = h("input", { class: "pc-entrada", id: "pc-oferta", inputmode: "decimal", placeholder: "Digite o valor da oferta",
    oninput: (e) => { oferta = e.target.value; calcular(); } });

  p.append(
    cabecalho("Precificação", "Quanto cobrar e quando aceitar um trabalho"),
    h("div", { class: "pc-grade" },
      h("section", { class: "cartao pc-cartao" },
        h("h2", { class: "pc-titulo" }, "Seus números"),
        campo("fixos", "Custos fixos mensais (R$)", { dica: "Internet, assinaturas, MEI, parte do aluguel. É o que você paga todo mês, com ou sem trabalho." }),
        h("div", { class: "pc-duas" },
          campo("equipamento", "Equipamento (R$)"),
          campo("vida", "Vida útil (meses)", { prefixo: null })),
        campo("direto", "Gasto direto por trabalho (R$)", { dica: "Só o que sai do bolso a cada trabalho: deslocamento, objetos de cena, música ou imagem paga, taxa de pagamento. Não inclui custo fixo." }),
        campo("renda", "Renda mensal desejada (R$)", { dica: "Quanto você quer levar pra casa por mês." }),
        campo("capacidade", "Trabalhos por mês (capacidade)", { prefixo: null, dica: "Quantos vídeos você consegue entregar por mês no seu limite realista." }),
        h("details", { class: "pc-avancado" },
          h("summary", {}, icone("baixo"), "Avançado"),
          h("div", { class: "pc-duas" },
            campo("margem", "Margem (%)", { prefixo: null, sufixo: "%", dica: "Seu lucro além dos custos. Padrão: 15%" }),
            campo("imposto", "Imposto (%)", { prefixo: null, sufixo: "%", dica: "No MEI fica quase em zero. Padrão: 0%" })))),
      h("div", { class: "pc-direita" },
        h("section", { class: "cartao pc-cartao" },
          h("h2", { class: "pc-titulo" }, icone("etiqueta"), "Seu preço de tabela"),
          h("div", { class: "pc-preco" },
            h("span", { class: "pc-preco-rotulo" }, "Cobre seus custos, sua renda e seu lucro"),
            saidas.preco,
            h("span", { class: "pc-preco-sub" }, "por trabalho")),
          h("div", { class: "pc-equilibrio" }, icone("balanca"), saidas.equilibrio)),
        h("section", { class: "cartao pc-cartao" },
          h("h2", { class: "pc-titulo" }, icone("mao"), "Vale a pena aceitar este trabalho?"),
          h("div", { class: "pc-agenda-topo" }, h("label", { for: "pc-agenda" }, "Quão cheia está sua agenda?"), saidas.agendaPct),
          agenda,
          saidas.agendaDica,
          h("div", { class: "pc-limites" },
            h("div", { class: "pc-limite" }, h("span", { class: "pc-limite-icone pc-vermelho" }, icone("escudo")),
              h("div", {}, h("span", {}, "Custo direto (nunca abaixo)"), saidas.direto)),
            h("div", { class: "pc-limite" }, h("span", { class: "pc-limite-icone pc-amarelo" }, icone("mao")),
              h("div", {}, h("span", {}, "Mínimo para aceitar hoje"), saidas.minimo))),
          h("div", { class: "pc-escala" }, h("div", { class: "pc-barra" }, saidas.marca),
            h("div", { class: "pc-escala-rotulos" }, saidas.escalaInicio, h("strong", {}, "mínimo hoje"), saidas.escalaFim)),
          h("div", { class: "jm-grupo pc-grupo" },
            h("label", { class: "jm-rotulo", for: "pc-oferta" }, "Me ofereceram (R$)"),
            h("div", { class: "pc-campo" }, h("span", { class: "pc-prefixo" }, "R$"), ofertaEntrada)),
          saidas.veredito),
        h("button", { class: "btn btn-primario pc-salvar", type: "button", onclick: salvar }, icone("marcador"), "Salvar cálculo"))));
  calcular();

  function calcular() {
    const r = calcularPreco(v);
    const pct = Number(v.agenda) || 0;
    saidas.agendaPct.textContent = `${pct}%`;
    agenda.style.setProperty("--pc-pct", `${pct}%`);
    saidas.agendaDica.textContent = pct <= 30 ? "Agenda vazia. Priorize fechar trabalhos."
      : pct < 85 ? "Agenda equilibrada. Cobre seu preço de tabela." : "Agenda cheia. Cobre mais e escolha os melhores.";
    saidas.direto.textContent = dinheiro(r.direto);
    if (r.preco === null) {
      saidas.preco.textContent = "R$ 0,00";
      saidas.equilibrio.textContent = "Diga quantos trabalhos você consegue fazer por mês pra calcular o preço.";
      saidas.minimo.textContent = "-";
      saidas.escalaInicio.textContent = dinheiro(r.direto); saidas.escalaFim.textContent = "-";
      saidas.marca.style.left = "0%";
      saidas.veredito.hidden = true;
      return;
    }
    saidas.preco.textContent = dinheiro(r.preco);
    saidas.equilibrio.replaceChildren(...(r.equilibrio === null
      ? ["Com esse preço a conta não fecha: aumente a margem ou reveja os gastos."]
      : [h("strong", {}, `${r.equilibrio.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${r.equilibrio === 1 ? "trabalho" : "trabalhos"}/mês`),
        " a esse preço já cobrem seus custos fixos. A partir daí, cada trabalho é lucro."]));
    saidas.minimo.textContent = dinheiro(r.minimo);
    saidas.escalaInicio.textContent = dinheiro(r.direto);
    saidas.escalaFim.textContent = dinheiro(r.preco);
    saidas.marca.style.left = `${r.preco > r.direto ? ((r.minimo - r.direto) / (r.preco - r.direto)) * 100 : 100}%`;

    // Veredito da oferta
    const valor = numeroBR(oferta);
    if (valor === null || !String(oferta).trim()) { saidas.veredito.hidden = true; return; }
    saidas.veredito.hidden = false;
    let tipo, texto, nota = null;
    if (valor >= r.preco) {
      tipo = "bom"; texto = "Acima do seu preço de tabela. Pode fechar tranquila, é um ótimo negócio.";
    } else if (valor >= r.minimo) {
      tipo = "bom"; texto = `Dá pra aceitar com a sua agenda em ${pct}%. Se conseguir, puxe a oferta para o seu preço de tabela de ${dinheiro(r.preco)}.`;
      if (pct < 90 && valor < r.minimoCom(90)) nota = "Repare: com a agenda quase cheia, essa mesma oferta ficaria abaixo do seu mínimo. Você só topa porque ainda tem espaço agora.";
    } else if (valor >= r.direto && valor > 0) {
      tipo = "atencao";
      texto = `Está abaixo do mínimo para hoje (${dinheiro(r.minimo)}). Com a agenda cheia, é melhor recusar e guardar espaço para trabalhos melhores. Com a agenda vazia, ainda sobram ${dinheiro(valor * (1 - r.imposto) - r.direto)} para ajudar a pagar seus custos fixos, então pode valer a pena.`;
    } else {
      tipo = "ruim"; texto = `Abaixo do seu custo direto (${dinheiro(r.direto)}). Aceitando, você paga pra trabalhar: recuse ou renegocie.`;
    }
    saidas.veredito.className = `pc-veredito pc-veredito-${tipo}`;
    saidas.veredito.replaceChildren(icone(tipo === "bom" ? "check" : "alerta"), h("div", {}, h("p", {}, texto), nota ? h("p", { class: "pc-nota" }, nota) : ""));
  }

  async function salvar() {
    if (Dados.semBanco) { avisoSemBanco(); return; }
    const r = await Dados.gravarConfig("precificacao", JSON.stringify(v));
    toast(r.ok ? "Cálculo salvo! Da próxima vez ele já abre com esses números." : `Não consegui salvar: ${r.erro}`, r.ok ? "sucesso" : "erro");
  }
}

// ---------------------------------------------------------------------
// CONTRATOS
// ---------------------------------------------------------------------
const STATUS_CONTRATO = { rascunho: "Rascunho", enviado: "Enviado", assinado: "Assinado", encerrado: "Encerrado", cancelado: "Cancelado" };
const diasAte = (d) => Math.round((new Date(`${d}T12:00:00`) - new Date(`${iso(new Date())}T12:00:00`)) / 864e5);

async function telaContratos(p) {
  let contratos = [], clientes = [], status = "", termo = "";
  const resumo = h("div", { class: "grade-cartoes" });
  const filtros = h("div");
  const tabela = h("div", { class: "ct-tabela" }, h("p", { class: "carregando" }, "Carregando..."));
  p.append(
    cabecalho("Contratos", "Acompanhe valores, prazos e o que já foi assinado.",
      h("div", { class: "acoes-planilha" }, caixaBusca("Buscar contrato ou cliente", (v) => { termo = v; desenhar(); }),
        h("button", { class: "btn btn-primario", type: "button", onclick: () => editar(null) }, icone("mais"), "Novo contrato"))),
    resumo, filtros, tabela);
  await carregar();

  async function carregar() {
    [contratos, clientes] = await Promise.all([
      Dados.lista("contratos", (c) => c.order("inicio", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false })),
      Dados.lista("clientes", (c) => c.order("nome")),
    ]);
    desenhar();
  }

  function editar(k) {
    abrirFormulario({
      titulo: k ? "Editar contrato" : "Novo contrato",
      campos: [
        { chave: "titulo", rotulo: "Título", obrigatorio: true, largo: true, placeholder: "Ex: Pacote 4 vídeos UGC" },
        { chave: "cliente_id", rotulo: "Cliente", tipo: "select", opcoes: [["", "Sem cliente"], ...clientes.map((c) => [c.id, c.nome])] },
        { chave: "status", rotulo: "Status", tipo: "select", opcoes: Object.entries(STATUS_CONTRATO) },
        { chave: "valor", rotulo: "Valor (R$)", tipo: "numero", placeholder: "Ex: 1.500,00" },
        { chave: "link", rotulo: "Link do arquivo", tipo: "url", placeholder: "Drive, PDF, assinatura..." },
        { chave: "inicio", rotulo: "Início", tipo: "data" },
        { chave: "fim", rotulo: "Fim", tipo: "data" },
        { chave: "notas", rotulo: "Notas", tipo: "textarea", largo: true, placeholder: "Entregas, cláusulas importantes, combinados..." },
      ],
      valores: k || { status: "rascunho", inicio: iso(new Date()) },
      aoSalvar: async (d) => {
        if (d.inicio && d.fim && d.fim < d.inicio) { toast("O fim precisa ser depois do início."); return false; }
        if (!(await salvarOuAvisar("contratos", { ...d, status: d.status || "rascunho", link: d.link ? linkSeguro(d.link) : null, id: k?.id }))) return false;
        toast("Contrato salvo!", "sucesso");
        await carregar();
        return true;
      },
    });
  }

  function desenhar() {
    const nomeCliente = (id) => clientes.find((c) => c.id === id)?.nome || "";
    const vigentes = contratos.filter((k) => k.status === "assinado" && (!k.fim || diasAte(k.fim) >= 0));
    const vencendo = vigentes.filter((k) => k.fim && diasAte(k.fim) <= 30);
    const aguardando = contratos.filter((k) => k.status === "enviado");
    resumo.replaceChildren(
      cartaoNumero("contrato", "Contratos ativos", fmt(vigentes.length), `${reais(vigentes.reduce((s, k) => s + Number(k.valor || 0), 0))} em vigor`).el,
      cartaoNumero("enviar", "Aguardando assinatura", fmt(aguardando.length), `${reais(aguardando.reduce((s, k) => s + Number(k.valor || 0), 0))} a fechar`).el,
      cartaoNumero("relogio", "Vencem em 30 dias", fmt(vencendo.length), vencendo.length ? "hora de renovar" : "nenhum vencendo").el);

    const conta = (s) => contratos.filter((k) => k.status === s).length;
    filtros.replaceChildren(pilulasFiltro([["", `Todos (${contratos.length})`], ...Object.entries(STATUS_CONTRATO).map(([s, t]) => [s, `${t} (${conta(s)})`])],
      status, (v) => { status = v; desenhar(); }));

    if (!contratos.length) {
      tabela.replaceChildren(estadoVazio("contrato", "Nenhum contrato ainda", "Cadastre seus contratos pra acompanhar valores, prazos e assinaturas.",
        h("button", { class: "btn btn-primario", type: "button", onclick: () => editar(null) }, icone("mais"), "Novo contrato")));
      return;
    }
    const t = chaveNome(termo);
    const visiveis = contratos.filter((k) => !status || k.status === status)
      .filter((k) => !t || chaveNome(`${k.titulo} ${nomeCliente(k.cliente_id)}`).includes(t));
    tabela.replaceChildren(
      h("div", { class: "ct-linha ct-cabeca" }, ["Contrato", "Cliente", "Valor", "Início", "Fim", "Status", ""].map((c) => h("span", {}, c))),
      ...(visiveis.length ? [] : [h("p", { class: "carregando" }, "Nenhum contrato com esse filtro.")]),
      ...visiveis.map((k) => {
        const falta = k.fim && k.status === "assinado" ? diasAte(k.fim) : null;
        return h("div", {
          class: "ct-linha", tabindex: "0", role: "button", "aria-label": `Editar ${k.titulo}`,
          onclick: () => editar(k), onkeydown: (e) => { if (e.key === "Enter") editar(k); },
        },
        h("span", { class: "ct-titulo", "data-rotulo": "Contrato", title: k.titulo }, k.titulo),
        h("span", { "data-rotulo": "Cliente", title: nomeCliente(k.cliente_id) }, nomeCliente(k.cliente_id) || "-"),
        h("span", { class: "ct-valor", "data-rotulo": "Valor" }, reais(k.valor)),
        h("span", { "data-rotulo": "Início" }, dataBR(k.inicio)),
        h("span", { "data-rotulo": "Fim" }, dataBR(k.fim),
          falta !== null && falta >= 0 && falta <= 30 ? h("small", { class: "ct-aviso" }, falta === 0 ? "vence hoje" : `vence em ${falta} ${falta === 1 ? "dia" : "dias"}`) : null,
          falta !== null && falta < 0 ? h("small", { class: "ct-aviso" }, "venceu") : null),
        h("span", { "data-rotulo": "Status" }, h("span", { class: `selo selo-${k.status}` }, STATUS_CONTRATO[k.status])),
        h("span", { class: "ct-acoes" },
          k.link ? h("a", { class: "btn btn-fantasma btn-icone", href: k.link, target: "_blank", rel: "noopener", title: "Abrir arquivo", "aria-label": "Abrir arquivo", onclick: (e) => e.stopPropagation() }, icone("link")) : null,
          botaoApagar(`Apagar ${k.titulo}`, `Apagar o contrato "${k.titulo}"? Isso não tem volta.`, "contratos", k.id, carregar)));
      }));
  }
}

// Começa quando todos os scripts (inclusive o editor.js) já carregaram.
window.addEventListener("DOMContentLoaded", iniciar);
