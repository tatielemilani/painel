// =====================================================================
// editor.js: o editor de automação (o "ManyChat").
//   Nome da automação
//   Bloco 1: o gatilho (palavras, posts, resposta no comentário)
//   Bloco 2: a resposta (mensagem, botão, link ou conversa, arquivo)
//   Construtor da conversa (Mensagem 2, 3...) e a prévia ao vivo.
//
// Tudo vira o campo "flow" da automação. A Mensagem 1 é sempre o
// PRIMEIRO passo, montada com "Sua mensagem" + "Texto do botão".
// =====================================================================

const EMOJIS = ["🫶", "👀", "😍", "🥰", "😂", "😮", "🔥", "✨", "💌", "👉", "🙌", "💕"];
const MAX_TITULO = 20; // o Instagram corta o título do botão em 20
const MAX_BOTOES = 3;  // máximo de botões ANEXADOS por mensagem

// "Isso parece um link?" (pra pegar link colado no nome do botão)
const pareceLink = (t) => {
  const v = String(t || "").trim();
  return /^(https?:\/\/|www\.)\S+$/i.test(v) || /^[\w-]+(\.[\w-]+)*\.(com|br|net|org|io|app|me|link|co|site|store|shop)(\/\S*)?$/i.test(v);
};
const linkValido = (u) => /^(https?:\/\/)?[^\s./]+(\.[^\s./]+)+(\/\S*)?$/i.test(String(u || "").trim());
const arrumarLink = (u) => {
  const v = String(u || "").trim();
  return !v || /^https?:\/\//i.test(v) ? v : `https://${v}`;
};

// ---------------------------------------------------------------------
// Estado do editor
// ---------------------------------------------------------------------
function estadoNovo() {
  return {
    id: null, nome: "", active: true,
    // Bloco 1
    keywords: [], matchAny: false, mediaIds: [], publicReply: "", variants: [],
    // Bloco 2
    message: "", botaoOn: true, botaoTitulo: "", modo: "link", link: "", assetIds: [],
    // Mensagem 2 em diante
    passos: [], proxId: 2,
  };
}
const novoPasso = (st) => ({ id: st.proxId++, message: "", botoes: [] });
// "tipo" guarda a escolha do destino num estado próprio: escolher "abrir um link"
// mostra o campo do link na hora, mesmo com a URL ainda vazia.
const novoBotao = () => ({ titulo: "", tipo: "proxima", next: null, url: "" });

// Linha do banco -> estado do editor
function doBanco(a) {
  const st = estadoNovo();
  const steps = a.flow?.steps || [];
  const p1 = steps[0] || {};
  const meta = a.flow?.editor || {};
  const b0 = (p1.buttons || [])[0];
  const temNext = (v) => v !== null && v !== undefined && v !== "";
  Object.assign(st, {
    id: a.id, nome: a.nome || "", active: a.active !== false,
    keywords: (a.keyword || "").split(",").map((s) => s.trim()).filter(Boolean),
    matchAny: !!a.match_any,
    mediaIds: [...(a.media_ids || [])],
    publicReply: a.public_reply || "",
    variants: [...(a.public_reply_variants || [])],
    message: p1.message || "",
    botaoOn: meta.botaoOn ?? (!!b0 || steps.length > 1),
    botaoTitulo: b0?.title || "",
    modo: meta.modo || (b0?.url ? "link" : steps.length > 1 ? "conversa" : "link"),
    link: b0?.url || "",
    assetIds: [...(a.asset_ids || [])],
  });
  st.passos = steps.slice(1).map((s) => ({
    id: Number(s.id),
    message: s.message || "",
    botoes: (s.buttons || []).map((b) => ({
      titulo: b.title || "",
      tipo: b.url ? "link" : temNext(b.next) ? "proxima" : "fim",
      next: temNext(b.next) ? Number(b.next) : null,
      url: b.url || "",
    })),
  }));
  st.proxId = Math.max(1, ...st.passos.map((p) => p.id || 0)) + 1;
  return st;
}

// Estado do editor -> linha do banco (com o "flow")
function paraBanco(st) {
  const conversa = st.botaoOn && st.modo === "conversa";
  const titulo = st.botaoTitulo.trim();
  const p1 = { id: 1, message: st.message.trim(), buttons: [] };
  if (st.botaoOn) {
    p1.buttons = [conversa
      ? { title: titulo, next: st.passos[0]?.id ?? null }   // avança pra Mensagem 2
      : { title: titulo, url: arrumarLink(st.link) }];       // abre o link
  }
  const steps = [p1];

  if (conversa) {
    for (const p of st.passos) {
      steps.push({
        id: p.id,
        message: p.message.trim(),
        buttons: p.botoes.map((b) =>
          b.tipo === "link" ? { title: b.titulo.trim(), url: arrumarLink(b.url) }
          : b.tipo === "proxima" ? { title: b.titulo.trim(), next: b.next }
          : { title: b.titulo.trim() }),                       // "encerrar": não é enviado
      });
    }
  }

  // Arquivo: no modo "Continua a conversa" vai junto com a Mensagem 2,
  // porque antes do toque o Instagram só deixa mandar UMA mensagem.
  if (st.assetIds.length) (conversa && steps[1] ? steps[1] : p1).assets = [...st.assetIds];

  const linha = {
    nome: st.nome.trim(),
    keyword: st.keywords.join(", "),
    match_any: st.matchAny,
    active: st.active,
    media_ids: st.mediaIds,
    public_reply: st.publicReply.trim(),
    public_reply_variants: st.variants.map((v) => v.trim()).filter(Boolean),
    flow: { steps, editor: { modo: st.modo, botaoOn: st.botaoOn } },
    asset_ids: st.assetIds,
  };
  if (st.id) linha.id = st.id;
  return linha;
}

// Validação amigável antes de salvar. Devolve a lista do que falta.
function validar(st) {
  const erros = [];
  const nomeBotao = (t, onde) => {
    if (!t.trim()) erros.push(`${onde}: dê um nome pro botão.`);
    else if (t.trim().length > MAX_TITULO) erros.push(`${onde}: o nome do botão passou de ${MAX_TITULO} letras.`);
    else if (pareceLink(t)) erros.push(`${onde}: o nome do botão parece um link. O link vai no campo do link.`);
  };
  if (!st.nome.trim()) erros.push("Dê um nome pra automação (lá em cima).");
  if (!st.matchAny && !st.keywords.length) erros.push('Adicione pelo menos uma palavra que ativa, ou ligue "Qualquer palavra ativa".');
  if (!st.message.trim()) erros.push('Escreva "Sua mensagem" (a Mensagem 1).');
  if (st.botaoOn) {
    nomeBotao(st.botaoTitulo, "Mensagem 1");
    if (st.modo === "link" && !linkValido(st.link)) erros.push("Mensagem 1: cole o link completo do botão.");
    if (st.modo === "conversa") {
      if (!st.passos.length) erros.push("Adicione a Mensagem 2 (é ela que chega quando a pessoa toca no botão).");
      st.passos.forEach((p, i) => {
        const n = `Mensagem ${i + 2}`;
        if (!p.message.trim()) erros.push(`${n}: escreva o texto.`);
        p.botoes.forEach((b, j) => {
          if (b.tipo === "fim") return;
          nomeBotao(b.titulo, `${n}, botão ${j + 1}`);
          if (b.tipo === "link" && !linkValido(b.url)) erros.push(`${n}, botão ${j + 1}: cole o link completo.`);
          if (b.tipo === "proxima" && !st.passos.some((q) => q.id === b.next)) erros.push(`${n}, botão ${j + 1}: escolha pra qual mensagem ele vai.`);
        });
      });
    }
  }
  return erros;
}

// ---------------------------------------------------------------------
// O editor (painel que abre por cima da lista de automações)
// ---------------------------------------------------------------------
const Editor = (() => {
  const raiz = document.getElementById("editor");
  let st = null;          // estado atual
  let foto = "";          // estado ao abrir (pra saber se tem coisa não salva)
  let aoSalvar = null;
  let erros = [];
  let posts = null;       // null = carregando
  let arquivos = null;
  let formEl = null, previaEl = null;
  let mostrarPosts = false;      // grade de posts aberta?
  let mostrarBiblioteca = false; // escolha de arquivo aberta?
  let caminhoPrevia = [];        // mensagens já "abertas" na prévia, tocando nos botões (ids)

  const sujo = () => !!st && JSON.stringify(st) !== foto;

  function abrir(auto, opcoes = {}) {
    st = auto ? doBanco(auto) : estadoNovo();
    foto = JSON.stringify(st);
    aoSalvar = opcoes.aoSalvar || null;
    erros = [];
    posts = null;
    arquivos = null;
    mostrarPosts = st.mediaIds.length > 0;
    mostrarBiblioteca = st.assetIds.length > 0;
    caminhoPrevia = [];
    raiz.hidden = false;
    document.body.style.overflow = "hidden";
    montar();
    carregarExtras();
  }

  function fechar() {
    if (sujo() && !confirm("Você tem alterações não salvas. Sair mesmo assim e perder o que mudou?")) return;
    fecharDeVez();
  }
  function fecharDeVez() {
    st = null;
    raiz.hidden = true;
    raiz.replaceChildren();
    document.body.style.overflow = "";
  }

  // Não perder o que foi digitado: avisa ao fechar a aba, apertar Esc ou clicar fora do painel.
  window.addEventListener("beforeunload", (e) => { if (sujo()) { e.preventDefault(); e.returnValue = ""; } });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && st && !document.querySelector(".modal-fundo")) fechar(); });
  raiz.addEventListener("mousedown", (e) => { if (e.target === raiz && st) fechar(); });

  // Posts e arquivos chegam depois; troca só aquele pedaço (sem perder o foco de quem digita).
  async function carregarExtras() {
    // O @ da conta (topo do celular da prévia), se ainda não veio de outra aba
    if (!Dados.contaIG && !Dados.semBanco) Dados.insights(7).then(() => { if (st) renderPrevia(); });
    const [m, a] = await Promise.all([Dados.midias(), Dados.arquivos()]);
    if (!st) return;
    posts = m?.posts || [];
    arquivos = a || [];
    raiz.querySelector("#lugar-posts")?.replaceChildren(seletorPosts());
    trocarArquivos();
    renderPrevia();
  }
  const trocarArquivos = () => raiz.querySelector("#lugar-arquivos")?.replaceChildren(seletorArquivo());

  // -------------------------------------------------------------------
  // Montagem do painel
  // -------------------------------------------------------------------
  function montar() {
    formEl = h("div", { class: "editor-form-interno" });
    previaEl = h("div");
    raiz.replaceChildren(h("div", { class: "editor-painel", role: "dialog", "aria-modal": "true", "aria-label": "Editor de automação" },
      h("div", { class: "editor-topo" },
        h("button", { class: "link-voltar", type: "button", onclick: fechar }, icone("voltar"), "Automações"),
        h("div", { class: "espaco" }),
        h("label", { class: "chave chave-ativa chave-verde" },
          h("span", { class: `bolinha ${st.active ? "verde" : "cinza"}`, id: "bolinha-ativa" }),
          h("span", { class: "chave-texto" }, "Ativa"),
          h("input", {
            type: "checkbox", checked: st.active, "aria-label": "Automação ativa",
            onchange: (e) => { st.active = e.target.checked; raiz.querySelector("#bolinha-ativa").className = `bolinha ${st.active ? "verde" : "cinza"}`; },
          }),
          h("span", { class: "trilho" })),
        h("button", { class: "btn btn-primario", id: "botao-salvar", type: "button", onclick: salvar }, "Salvar")),
      h("div", { class: "editor-corpo" },
        h("div", { class: "editor-form" }, formEl),
        h("div", { class: "editor-previa" }, previaEl))));
    renderForm();
    renderPrevia();
  }

  // Redesenha o formulário (em mudanças de estrutura: botões, modos, mensagens).
  function renderForm() {
    if (erros.length) erros = validar(st); // a lista de pendências vai sumindo conforme corrige
    const rolagem = formEl.parentElement;
    const topo = rolagem.scrollTop;
    formEl.replaceChildren(...[erros.length ? caixaErros() : null, cabecalhoEditor(), blocoGatilho(), blocoResposta()].filter(Boolean));
    rolagem.scrollTop = topo;
    formEl.querySelectorAll("textarea.campo-link").forEach(ajustarAltura);
  }
  const reestruturou = () => { renderForm(); renderPrevia(); };

  function caixaErros() {
    return h("div", { class: "aviso aviso-erro erros", role: "alert" }, icone("info"),
      h("div", {}, h("strong", {}, "Antes de salvar, falta:"), h("ul", {}, erros.map((e) => h("li", {}, e)))));
  }

  // -------------------------------------------------------------------
  // Peças de formulário
  // -------------------------------------------------------------------
  function chave(ligado, aoMudar, texto, classe = "") {
    return h("label", { class: `chave ${classe}` },
      h("span", { class: "chave-texto" }, texto),
      h("input", { type: "checkbox", checked: ligado, onchange: (e) => aoMudar(e.target.checked) }),
      h("span", { class: "trilho" }));
  }

  function tituloBloco(n, titulo, sub) {
    return h("div", { class: "bloco-titulo" },
      h("span", { class: "bloco-num" }, String(n)), h("div", {}, h("h2", {}, titulo), h("p", {}, sub)));
  }

  // Rótulo à esquerda e um complemento (texto ou interruptor) à direita
  function rotuloLinha(texto, extra, para) {
    return h("div", { class: "rotulo-linha" },
      h("label", { class: "rotulo-forte", for: para || null }, texto),
      typeof extra === "string" ? h("span", { class: "rotulo-extra" }, extra) : extra);
  }

  // Campo de texto + barrinha de emojis (insere no cursor)
  function areaTexto(id, valor, aoMudar, placeholder) {
    const ta = h("textarea", { class: "campo", id, value: valor, placeholder, oninput: (e) => aoMudar(e.target.value) });
    const barra = h("div", { class: "emojis", "aria-label": "Inserir emoji" },
      EMOJIS.map((em) => h("button", {
        type: "button", title: `Inserir ${em}`,
        onmousedown: (e) => e.preventDefault(), // não tira o foco do texto
        onclick: () => {
          const ini = ta.selectionStart ?? ta.value.length;
          const fim = ta.selectionEnd ?? ini;
          ta.value = ta.value.slice(0, ini) + em + ta.value.slice(fim);
          const pos = ini + em.length;
          ta.focus();
          ta.setSelectionRange(pos, pos);
          aoMudar(ta.value);
        },
      }, em)));
    return h("div", {}, ta, barra);
  }

  // Campo GRANDE do link: mostra a URL inteira, por maior que seja.
  function ajustarAltura(ta) { ta.style.height = "auto"; ta.style.height = `${Math.max(64, ta.scrollHeight + 2)}px`; }
  function campoLink(id, get, set, ajuda, placeholder = "https://exemplo.com/a-sua-pagina") {
    const ta = h("textarea", {
      class: "campo campo-link", id, value: get(), rows: "2", placeholder,
      spellcheck: "false",
      oninput: (e) => { set(e.target.value); ajustarAltura(e.target); renderPrevia(); },
    });
    return h("div", {}, ta, h("p", { class: "ajuda" }, ajuda));
  }

  // Nome do botão: limite de 20, contador e detector de link colado no lugar errado.
  function campoTitulo(id, get, set, ehLink, moverLink, opcoes = {}) {
    const contador = h("p", { class: "ajuda contador-letras" });
    const dica = h("div", { class: "dica-link", hidden: true });
    const inp = h("input", {
      class: "campo", id, value: get(), placeholder: opcoes.placeholder || "Ex: Quero! 👉",
      "aria-label": opcoes.rotulo || null,
      oninput: (e) => { set(e.target.value); atualizar(false); renderPrevia(); },
    });
    function atualizar(inicial) {
      const v = get();
      const n = v.trim().length;
      contador.textContent = `${n}/${MAX_TITULO} letras. O Instagram corta o título do botão em ${MAX_TITULO} letras.`;
      contador.classList.toggle("estourou", n > MAX_TITULO);
      inp.classList.toggle("invalido", n > MAX_TITULO);
      if (pareceLink(v)) {
        // Se o botão já é de link, move na hora pro campo certo.
        if (ehLink() && !inicial) { moverLink(v.trim()); return; }
        dica.hidden = false;
        dica.textContent = ehLink()
          ? "Isso parece um link: ele vai no campo do link, não no nome do botão."
          : 'Isso parece um link. O link não vai no nome do botão: escolha "abrir um link" e eu coloco ele no lugar certo.';
      } else {
        dica.hidden = true;
      }
    }
    atualizar(true);
    if (opcoes.semContador) return h("div", {}, inp, dica);
    return h("div", {}, inp, contador, dica);
  }

  // -------------------------------------------------------------------
  // Cabeçalho: "NOVA AUTOMAÇÃO" + nome grande
  // -------------------------------------------------------------------
  function cabecalhoEditor() {
    return h("div", { class: "editor-cabecalho" },
      h("span", { class: "sobretitulo" }, st.id ? "Editar automação" : "Nova automação"),
      h("input", {
        class: "titulo-editavel", id: "nome-automacao", value: st.nome, placeholder: "Nome da automação",
        "aria-label": "Nome da automação (só você vê)", title: "Só você vê esse nome, serve pra você se organizar",
        oninput: (e) => { st.nome = e.target.value; },
      }),
      h("p", { class: "sub" }, "Comentou a palavra certa, recebe sua DM na hora."));
  }

  // -------------------------------------------------------------------
  // BLOCO 1: o gatilho
  // -------------------------------------------------------------------
  function blocoGatilho() {
    return h("section", { class: "cartao bloco" },
      tituloBloco(1, "O gatilho", "O que faz a DM disparar"),
      h("div", { class: "callout" }, h("span", { class: "callout-emoji", "aria-hidden": "true" }, "🗨️"),
        h("div", {}, h("strong", {}, "Quando alguém comenta num post seu"), h("span", {}, "post ou reel"))),
      h("div", { class: "grupo" },
        rotuloLinha("Palavras que ativam",
          chave(st.matchAny, (v) => { st.matchAny = v; renderPrevia(); }, "qualquer palavra vale", "chave-pequena"), "tags-entrada"),
        campoTags(),
        h("p", { class: "ajuda" }, "Se o comentário tiver uma dessas palavras, a DM vai sozinha.")),
      h("div", { class: "grupo" },
        rotuloLinha("Em quais posts", "(vazio = todos)"),
        h("div", { id: "lugar-posts" }, seletorPosts())),
      h("div", { class: "grupo", style: "margin-bottom:0" },
        rotuloLinha("💬 Resposta no comentário", "(recadinho público pra quem comentou)", "resp-publica"),
        h("input", {
          class: "campo", id: "resp-publica", value: st.publicReply, placeholder: "te chamei no direct 💌",
          oninput: (e) => { st.publicReply = e.target.value; renderPrevia(); },
        }),
        st.variants.map((v, i) => h("div", { class: "linha", style: "margin-top:8px" },
          h("input", {
            class: "campo cresce", value: v, placeholder: "Outra forma de dizer",
            "aria-label": `Variação ${i + 2} da resposta`,
            oninput: (e) => { st.variants[i] = e.target.value; },
          }),
          h("button", {
            class: "btn btn-icone btn-remover", type: "button", title: "Remover variação", "aria-label": "Remover variação",
            onclick: () => { st.variants.splice(i, 1); reestruturou(); },
          }, icone("x")))),
        h("button", {
          class: "btn btn-pequeno", style: "margin-top:10px", type: "button",
          onclick: () => { st.variants.push(""); reestruturou(); },
        }, icone("mais"), "variação (A/B) da resposta"),
        st.variants.length ? h("p", { class: "ajuda" }, "Com variações, o sistema alterna entre elas pra parecer mais natural.") : null));
  }

  // Campo de tags: Enter (ou vírgula) adiciona; Backspace no vazio apaga a última.
  function campoTags() {
    const entrada = h("input", { id: "tags-entrada", autocomplete: "off" });
    const caixa = h("div", { class: "tags", onclick: (e) => { if (e.target === caixa) entrada.focus(); } });
    function adicionar(focar) {
      const v = entrada.value.replace(/,/g, "").trim();
      entrada.value = "";
      if (v && !st.keywords.some((k) => k.toLowerCase() === v.toLowerCase())) st.keywords.push(v);
      desenhar();
      renderPrevia();
      if (focar) entrada.focus();
    }
    function desenhar() {
      caixa.replaceChildren(
        ...st.keywords.map((k, i) => h("span", { class: "tag" }, k,
          h("button", {
            type: "button", "aria-label": `Remover ${k}`,
            onclick: () => { st.keywords.splice(i, 1); desenhar(); renderPrevia(); },
          }, icone("x")))),
        entrada);
      entrada.placeholder = st.keywords.length ? "" : "digita e aperta Enter";
    }
    entrada.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === ",") { e.preventDefault(); adicionar(true); }
      else if (e.key === "Backspace" && !entrada.value && st.keywords.length) { st.keywords.pop(); desenhar(); renderPrevia(); entrada.focus(); }
    });
    entrada.addEventListener("blur", () => { if (entrada.value.trim()) adicionar(false); });
    desenhar();
    return caixa;
  }

  // "Todos os posts" (botão) abre a grade pra escolher posts específicos.
  function seletorPosts() {
    const qtd = st.mediaIds.length;
    const botao = h("button", {
      class: `botao-pilula${qtd ? " marcado" : ""}`, type: "button", "aria-expanded": String(mostrarPosts),
      onclick: () => { mostrarPosts = !mostrarPosts; raiz.querySelector("#lugar-posts").replaceChildren(seletorPosts()); },
    }, qtd ? `${qtd} ${qtd === 1 ? "post escolhido" : "posts escolhidos"}` : "Todos os posts", " ", h("span", { "aria-hidden": "true" }, mostrarPosts ? "▴" : "▾"));
    if (!mostrarPosts) return h("div", {}, botao);

    let grade;
    if (posts === null) grade = h("p", { class: "ajuda" }, "Carregando seus posts...");
    else if (!posts.length) {
      grade = h("div", { class: "aviso aviso-info", style: "margin-top:10px" }, icone("info"), h("span", {}, Dados.semBanco
        ? "Conecte seu Instagram pra escolher posts. Enquanto isso, a automação vale pra todos os seus posts."
        : "Nenhum post encontrado (ou o Instagram ainda não está conectado). Nenhum escolhido = vale pra todos os seus posts."));
    } else {
      grade = h("div", { class: "posts" }, posts.map((p) => {
        const marcado = st.mediaIds.includes(p.id);
        return h("button", {
          type: "button", class: `post${marcado ? " marcado" : ""}`, title: p.legenda || "Post",
          "aria-pressed": String(marcado),
          onclick: () => {
            st.mediaIds = marcado ? st.mediaIds.filter((x) => x !== p.id) : [...st.mediaIds, p.id];
            raiz.querySelector("#lugar-posts").replaceChildren(seletorPosts());
          },
        },
        p.miniatura ? h("img", { src: p.miniatura, alt: p.legenda || "Post", loading: "lazy" }) : h("div", { class: "sem-img" }, p.legenda || "Post"),
        h("span", { class: "marca-check" }, icone("check")));
      }));
    }
    return h("div", {}, h("div", { class: "linha" }, botao,
      qtd ? h("button", {
        class: "link-acao", type: "button",
        onclick: () => { st.mediaIds = []; raiz.querySelector("#lugar-posts").replaceChildren(seletorPosts()); },
      }, "voltar pra todos os posts") : null),
    grade);
  }

  // -------------------------------------------------------------------
  // BLOCO 2: a resposta
  // -------------------------------------------------------------------
  function blocoResposta() {
    const conversa = st.botaoOn && st.modo === "conversa";
    const sec = h("section", { class: "cartao bloco" }, tituloBloco(2, "A resposta", "O que a pessoa recebe na DM"));

    sec.append(h("div", { class: "grupo" },
      rotuloLinha("Sua mensagem", "(a primeira que a pessoa recebe)", "msg1"),
      areaTexto("msg1", st.message, (v) => { st.message = v; renderPrevia(); atualizarReferencia(); },
        "Oieee! 🥰 Vi que você quer saber mais! Toca no botão aqui embaixo que eu te mando tudo 👇"),
      h("p", { class: "ajuda" }, "É a primeira mensagem na DM. O link (ou a resposta) você configura no botão, aqui embaixo.")));

    sec.append(
      h("div", { class: "divisor-extras" }, "Extras (liga só o que quiser)"),
      h("div", { class: "linha-extra" },
        h("span", { class: "icone-extra", "aria-hidden": "true" }, icone("botao")),
        h("div", { class: "texto-extra" },
          h("strong", {}, "Botão na mensagem"),
          h("span", {}, "A pessoa toca num botão e aí recebe o que você configurar. Menos cara de spam.")),
        h("label", { class: "chave" },
          h("input", { type: "checkbox", checked: st.botaoOn, "aria-label": "Botão na mensagem", onchange: (e) => { st.botaoOn = e.target.checked; caminhoPrevia = []; reestruturou(); } }),
          h("span", { class: "trilho" }))));

    if (st.botaoOn) {
      sec.append(
        h("p", { class: "explica" }, "A pessoa recebe a ", h("strong", {}, "sua mensagem"),
          " lá de cima já com esse botão embaixo. Ao tocar, o botão faz o que você escolher aqui."),
        h("div", { class: "grupo" },
          rotuloLinha("Texto do botão", null, "titulo1"),
          campoTitulo("titulo1", () => st.botaoTitulo, (v) => { st.botaoTitulo = v; atualizarReferencia(); },
            () => st.modo === "link",
            (url) => {
              if (!st.link.trim()) st.link = url;
              st.botaoTitulo = "Acessar";
              toast('Movi o link pro campo certo e dei o nome "Acessar" pro botão.');
              reestruturou();
              raiz.querySelector("#link1")?.focus();
            })),
        h("div", { class: "grupo" },
          rotuloLinha("O que o botão faz quando ela toca"),
          h("div", { class: "segmentos", role: "group", "aria-label": "O que o botão faz" },
            segmento("link", "🔗 Um link", "leva ela pra um site"),
            segmento("conversa", "💬 Continua a conversa", "ela te responde e você segue"))));

      if (st.modo === "link") {
        sec.append(h("div", { class: "grupo" },
          rotuloLinha("🔗 Link completo (cole aqui):", null, "link1"),
          campoLink("link1", () => st.link, (v) => { st.link = v; },
            "A pessoa vê só o nome do botão ali em cima. O link, por maior que seja, fica escondido.")));
      } else {
        sec.append(
          h("p", { class: "explica" }, "Ao tocar, a pessoa te ", h("strong", {}, "envia"),
            " o texto do botão e a conversa segue. Monte as próximas mensagens aqui embaixo. Cada botão pode ",
            h("strong", {}, "ir pra outra mensagem"), ", ", h("strong", {}, "abrir um link"), " ou ", h("strong", {}, "encerrar"), "."),
          h("div", { class: "grupo" }, construtorSequencia()));
      }
    }

    sec.append(h("div", { class: "grupo", style: "margin-bottom:0" },
      rotuloLinha("Anexar um arquivo", "(opcional · PDF, áudio, foto ou vídeo)", "arquivo"),
      h("div", { id: "lugar-arquivos" }, seletorArquivo())));
    return sec;
  }

  function segmento(valor, titulo, texto) {
    return h("button", {
      type: "button", class: `segmento${st.modo === valor ? " ativo" : ""}`, "aria-pressed": String(st.modo === valor),
      onclick: () => {
        st.modo = valor;
        caminhoPrevia = [];
        // Link colado no nome do botão? Move pro campo certo e põe um nome padrão.
        if (valor === "link" && pareceLink(st.botaoTitulo)) {
          if (!st.link.trim()) st.link = st.botaoTitulo.trim();
          st.botaoTitulo = "Acessar";
          toast('Movi o link pro campo certo e dei o nome "Acessar" pro botão.');
        }
        reestruturou();
      },
    }, h("strong", {}, titulo), h("span", {}, texto));
  }

  // Atualiza a "Mensagem 1" de referência sem redesenhar o formulário
  function atualizarReferencia() {
    const t = raiz.querySelector("#ref-msg1-texto");
    if (t) t.textContent = st.message.trim() || 'Escreva "Sua mensagem" lá em cima.';
    const b = raiz.querySelector("#ref-msg1-botao");
    if (b) b.textContent = `botão ${st.botaoTitulo.trim() || "sem nome"} → Mensagem 2`;
  }

  // -------------------------------------------------------------------
  // Construtor da conversa (o mini-chat)
  // -------------------------------------------------------------------
  function construtorSequencia() {
    const box = h("div", { class: "sequencia" },
      h("div", { class: "msg-ref" },
        h("div", { class: "rotulo-ref" }, 'Mensagem 1 (a "Sua mensagem" lá de cima)'),
        h("div", { class: "texto", id: "ref-msg1-texto" }),
        h("div", { class: "seta-ref", id: "ref-msg1-botao" })));

    st.passos.forEach((p, i) => box.append(cartaoPasso(p, i)));
    box.append(h("button", {
      class: "btn btn-largo", type: "button",
      onclick: () => {
        st.passos.push(novoPasso(st));
        reestruturou();
        raiz.querySelector(`#msg-${st.passos[st.passos.length - 1].id}`)?.focus();
      },
    }, icone("mais"), "Adicionar mensagem"));

    queueMicrotask(atualizarReferencia);
    return box;
  }

  function cartaoPasso(p, i) {
    const n = i + 2;
    return h("div", { class: "msg-card" },
      h("div", { class: "msg-card-topo" },
        h("h3", {}, `Mensagem ${n}`),
        h("button", { class: "link-remover", type: "button", "aria-label": `Remover mensagem ${n}`, onclick: () => apagarPasso(p) }, "remover")),
      h("textarea", {
        class: "campo", id: `msg-${p.id}`, value: p.message, placeholder: "O que essa mensagem diz",
        "aria-label": `Texto da mensagem ${n}`, style: "min-height:70px",
        oninput: (e) => { p.message = e.target.value; renderPrevia(); },
      }),
      p.botoes.map((b, j) => cartaoBotao(p, b, j)),
      p.botoes.length < MAX_BOTOES
        ? h("button", {
          class: "btn btn-pequeno", style: "margin-top:10px", type: "button",
          onclick: () => {
            const b = novoBotao();
            b.next = st.passos[i + 1]?.id ?? null; // sugere a mensagem seguinte
            p.botoes.push(b);
            reestruturou();
          },
        }, icone("mais"), "Adicionar botão")
        : h("p", { class: "ajuda" }, "Máximo de 3 botões por mensagem (limite do Instagram)."));
  }

  function apagarPasso(p) {
    if ((p.message.trim() || p.botoes.length) && !confirm("Remover esta mensagem e os botões dela?")) return;
    st.passos = st.passos.filter((q) => q !== p);
    // Quem apontava pra ela fica sem destino.
    for (const q of st.passos) for (const b of q.botoes) if (b.next === p.id) b.next = null;
    reestruturou();
  }

  function cartaoBotao(p, b, j) {
    const idTitulo = `bt-${p.id}-${j}`;
    const idLink = `bl-${p.id}-${j}`;
    const focarLink = () => raiz.querySelector(`#${idLink}`)?.focus();

    function mudarTipo(tipo) {
      b.tipo = tipo; // fica guardado mesmo com a URL vazia
      if (tipo === "link" && pareceLink(b.titulo)) {
        if (!b.url.trim()) b.url = b.titulo.trim();
        b.titulo = "Acessar";
        toast('Movi o link pro campo certo e dei o nome "Acessar" pro botão.');
      }
      reestruturou();
      if (tipo === "link") focarLink();
    }

    const card = h("div", { class: "botao-card" },
      h("div", { class: "linha-botao" },
        b.tipo === "fim"
          ? h("div", { class: "nota-fim", style: "margin:0" }, icone("fim"), "Fim da conversa")
          : campoTitulo(idTitulo, () => b.titulo, (v) => { b.titulo = v; }, () => b.tipo === "link", (url) => {
            if (!b.url.trim()) b.url = url;
            b.titulo = "Acessar";
            toast('Movi o link pro campo certo e dei o nome "Acessar" pro botão.');
            reestruturou();
            focarLink();
          }, { placeholder: "Nome do botão", rotulo: `Nome do botão ${j + 1}`, semContador: true }),
        h("span", { class: "seta-botao", "aria-hidden": "true" }, "→"),
        h("select", { class: "campo", "aria-label": "O que o botão faz", onchange: (e) => mudarTipo(e.target.value) },
          h("option", { value: "proxima", selected: b.tipo === "proxima" }, "💬 ir pra outra mensagem"),
          h("option", { value: "link", selected: b.tipo === "link" }, "🔗 abrir um link"),
          h("option", { value: "fim", selected: b.tipo === "fim" }, "⏹ encerrar")),
        h("button", {
          class: "btn btn-icone btn-remover-x", type: "button", title: "Remover botão", "aria-label": `Remover botão ${j + 1}`,
          onclick: () => { p.botoes.splice(j, 1); reestruturou(); },
        }, icone("x"))));

    if (b.tipo === "proxima") {
      const destinos = st.passos.filter((q) => q.id !== p.id);
      card.append(h("select", {
        class: "campo", "aria-label": "Pra qual mensagem o botão leva",
        onchange: (e) => { b.next = e.target.value ? Number(e.target.value) : null; renderPrevia(); },
      },
      h("option", { value: "" }, destinos.length ? "Escolha a mensagem..." : "Adicione outra mensagem pra ligar aqui"),
      destinos.map((q) => h("option", { value: String(q.id), selected: q.id === b.next }, `Mensagem ${st.passos.indexOf(q) + 2}`))));
    } else if (b.tipo === "link") {
      card.append(
        h("label", { class: "rotulo-link", for: idLink }, "🔗 Link completo (cole aqui):"),
        campoLink(idLink, () => b.url, (v) => { b.url = v; }, "A pessoa vê só o nome do botão ali em cima. O link, por maior que seja, fica escondido.", "https://..."));
    } else {
      card.append(h("p", { class: "ajuda" }, "Encerrar: a conversa acaba aqui. Isso não vira um botão, a pessoa não vê nada."));
    }
    return card;
  }

  // -------------------------------------------------------------------
  // Arquivo (da biblioteca)
  // -------------------------------------------------------------------
  const ICONE_TIPO = { image: "imagem", audio: "audio", video: "video", file: "arquivo" };
  const NOME_TIPO = { image: "foto", audio: "áudio", video: "vídeo", file: "arquivo" };

  function seletorArquivo() {
    if (!mostrarBiblioteca) {
      return h("button", {
        class: "btn btn-largo", type: "button",
        onclick: () => { mostrarBiblioteca = true; trocarArquivos(); raiz.querySelector("#arquivo")?.focus(); },
      }, icone("mais"), "Escolher da biblioteca");
    }
    if (arquivos === null) return h("p", { class: "ajuda", style: "margin:0" }, "Carregando a biblioteca...");
    const atual = st.assetIds[0] || "";
    const input = h("input", {
      type: "file", hidden: true, accept: "image/*,audio/*,video/*,application/pdf",
      onchange: async (e) => {
        const f = e.target.files[0];
        if (!f) return;
        enviar.disabled = true;
        enviar.textContent = "Enviando...";
        const r = await Dados.enviarArquivo(f);
        if (r.ok) {
          arquivos.unshift(r.arquivo);
          st.assetIds = [r.arquivo.id];
          toast("Arquivo adicionado.", "sucesso");
        } else {
          toast(r.erro, "erro");
        }
        trocarArquivos();
        renderPrevia();
      },
    });
    const enviar = h("button", {
      class: "btn btn-pequeno", type: "button",
      onclick: () => Dados.semBanco
        ? toast("A biblioteca de arquivos funciona depois de configurar o Supabase (veja o LEIA-ME).")
        : input.click(),
    }, icone("upload"), "Enviar arquivo novo");

    return h("div", {},
      h("select", {
        class: "campo", id: "arquivo",
        onchange: (e) => { st.assetIds = e.target.value ? [e.target.value] : []; renderPrevia(); },
      },
      h("option", { value: "" }, "Nenhum arquivo"),
      arquivos.map((a) => h("option", { value: a.id, selected: a.id === atual }, `${a.nome} (${NOME_TIPO[a.tipo] || "arquivo"})`))),
      h("div", { class: "linha", style: "margin-top:8px" }, enviar, input,
        h("span", { class: "ajuda", style: "margin:0" }, st.botaoOn && st.modo === "conversa"
          ? "Vai junto com a Mensagem 2."
          : "Vai logo depois da mensagem.")));
  }

  // -------------------------------------------------------------------
  // PRÉVIA AO VIVO (iPhone). Tocando no botão azul, aparece a próxima mensagem.
  // -------------------------------------------------------------------
  // Botão sem destino (nem link nem próxima mensagem) não aparece, igual não é enviado.
  const botaoVisivel = (b) =>
    (b.tipo === "link" && b.url.trim()) || (b.tipo === "proxima" && st.passos.some((q) => q.id === b.next));

  // Mensagem 1 + as que a pessoa já "abriu" tocando nos botões
  function mensagensNaPrevia() {
    const conversa = st.botaoOn && st.modo === "conversa";
    const b1 = !st.botaoOn ? []
      : conversa ? [{ titulo: st.botaoTitulo, tipo: "proxima", next: st.passos[0]?.id ?? null, url: "" }]
      : [{ titulo: st.botaoTitulo, tipo: "link", next: null, url: st.link }];
    const lista = [{ id: 1, texto: st.message.trim(), botoes: b1, numero: 1 }];
    if (!conversa) return lista;
    // Segue o caminho tocado, enquanto as mensagens ainda existirem
    const valido = [];
    for (const id of caminhoPrevia) {
      const p = st.passos.find((q) => q.id === id);
      if (!p) break;
      valido.push(id);
      lista.push({ id: p.id, texto: p.message.trim(), botoes: p.botoes, numero: st.passos.indexOf(p) + 2 });
    }
    caminhoPrevia = valido;
    return lista;
  }

  function renderPrevia() {
    if (!st || !previaEl) return;
    const conversa = st.botaoOn && st.modo === "conversa";
    const conta = Dados.contaIG || "sua_conta";
    const inicial = conta.replace(/[^a-z0-9]/gi, "").charAt(0).toUpperCase() || "S";
    const corpo = h("div", { class: "cel-corpo" });

    // O comentário que dispara + a resposta pública
    const respostas = [st.publicReply, ...st.variants].map((s) => s.trim()).filter(Boolean);
    corpo.append(
      h("div", { class: "comentario-prev" },
        h("div", { class: "comentario-topo" }, h("span", { class: "comentario-icone" }, "📸"), "Comentou no seu post"),
        h("div", {}, h("strong", {}, "seguidor "), st.matchAny ? "adorei!" : (st.keywords[0] || "quero")),
        respostas.length ? h("div", { class: "resp" }, h("strong", {}, `${conta} `), respostas[0]) : null),
      h("div", { class: "cel-sistema" }, "agora"));

    const lista = mensagensNaPrevia();
    lista.forEach((m, i) => {
      const visiveis = m.botoes.filter(botaoVisivel);
      const proximaAberta = lista[i + 1]?.id;
      corpo.append(h("div", { class: "linha-bot" },
        h("span", { class: "avatar-ig mini", "aria-hidden": "true" }, inicial),
        h("div", { class: "bolha bolha-grupo", style: m.texto ? null : "color:#9ca3af" },
          m.texto || (m.numero === 1 ? "Sua mensagem aparece aqui." : `Mensagem ${m.numero}`),
          visiveis.map((b) => h("button", {
            type: "button",
            class: `botao-ig botao-anexado${b.tipo === "proxima" && b.next === proximaAberta ? " ja-tocado" : ""}`,
            title: b.tipo === "link" ? `Abre: ${arrumarLink(b.url)}` : "Toca pra ver a próxima mensagem",
            onclick: () => {
              if (b.tipo === "link") { toast(`Na DM, esse botão abre: ${arrumarLink(b.url)}`); return; }
              caminhoPrevia = [...caminhoPrevia.slice(0, i), b.next];
              renderPrevia();
            },
          }, b.tipo === "link" ? icone("link") : null, (b.titulo.trim() || (b.tipo === "link" ? "Acessar" : "Continuar")).slice(0, MAX_TITULO))))));
      // Arquivo: depois da Mensagem 2 (conversa) ou da Mensagem 1 (link)
      if (st.assetIds.length && ((conversa && m.numero === 2) || (!conversa && i === 0))) {
        corpo.append(...st.assetIds.map((id) => {
          const a = (arquivos || []).find((x) => x.id === id);
          return h("div", { class: "anexo-prev" }, icone(ICONE_TIPO[a?.tipo] || "arquivo"), a?.nome || "Arquivo");
        }));
      }
      if (m.numero > 1 && !visiveis.length) corpo.append(h("div", { class: "nota-prev" }, "fim da conversa"));
    });

    const sinal = '<svg viewBox="0 0 18 11" fill="currentColor"><rect x="0" y="7" width="3" height="4" rx="1"/><rect x="5" y="5" width="3" height="6" rx="1"/><rect x="10" y="2.5" width="3" height="8.5" rx="1"/><rect x="15" y="0" width="3" height="11" rx="1"/></svg>';
    const bateria = '<svg viewBox="0 0 26 12" fill="none" stroke="currentColor"><rect x=".5" y=".5" width="22" height="11" rx="3"/><rect x="2.5" y="2.5" width="18" height="7" rx="1.5" fill="currentColor"/><path d="M24.5 4v4" stroke-linecap="round"/></svg>';
    const icones = h("span", { class: "cel-icones" });
    icones.innerHTML = sinal + bateria;

    const temMais = conversa && lista.some((m) => m.botoes.some((b) => b.tipo === "proxima" && botaoVisivel(b)));
    previaEl.replaceChildren(
      h("div", { class: "previa-titulo" },
        h("span", { class: "sobretitulo" }, "Prévia ao vivo"),
        h("p", {}, "é exatamente assim que chega pra pessoa")),
      h("div", { class: "celular" }, h("div", { class: "tela-cel" },
        h("div", { class: "cel-status" }, h("span", {}, "9:41"), h("span", { class: "cel-ilha", "aria-hidden": "true" }), icones),
        h("div", { class: "cel-topo" },
          h("span", { class: "voltar-cel", "aria-hidden": "true" }, "‹"),
          h("span", { class: "avatar-ig", "aria-hidden": "true" }, inicial),
          h("div", { class: "quem" }, h("strong", {}, conta), h("small", {}, "Instagram")),
          h("span", { class: "cel-acoes", "aria-hidden": "true" }, icone("telefone"), icone("video"))),
        corpo,
        h("div", { class: "cel-rodape", "aria-hidden": "true" }, h("span", { class: "cel-camera" }, "📷"), h("span", { class: "cel-input" }, "Mensagem...")))),
      h("p", { class: "dica-previa" },
        temMais ? "Toca no botão azul pra ver a próxima mensagem." : "Assim a DM chega pra pessoa.",
        caminhoPrevia.length ? [" ", h("button", { class: "link-acao", type: "button", onclick: () => { caminhoPrevia = []; renderPrevia(); } }, "↺ recomeçar")] : null));
  }

  // -------------------------------------------------------------------
  // Salvar
  // -------------------------------------------------------------------
  async function salvar() {
    erros = validar(st);
    if (erros.length) {
      renderForm();
      formEl.parentElement.scrollTop = 0;
      toast("Falta pouco: confira a lista em vermelho.", "erro");
      return;
    }
    if (Dados.semBanco) {
      toast(MODO_LOCAL
        ? "Modo de teste local: pra salvar de verdade, configure o Supabase e coloque o site no ar (veja o LEIA-ME)."
        : "O banco ainda não está configurado (veja o LEIA-ME). Nada foi salvo.");
      return;
    }
    const botao = raiz.querySelector("#botao-salvar");
    botao.disabled = true;
    const r = await Dados.salvarAutomacao(paraBanco(st));
    botao.disabled = false;
    if (!r.ok) { toast(`Não consegui salvar: ${r.erro}`, "erro"); return; }
    toast("Automação salva!", "sucesso");
    fecharDeVez();
    aoSalvar?.();
  }

  return { abrir };
})();
