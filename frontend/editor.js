// =====================================================================
// editor.js: o editor de automação (o "ManyChat").
//   Bloco 1: o gatilho (palavras, posts, resposta no comentário)
//   Bloco 2: a resposta (mensagem, botão, link ou conversa, arquivo)
//   Construtor da sequência (Mensagem 2, 3...) e a prévia ao vivo.
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
const novoPasso = (st) => ({ id: st.proxId++, message: "", botoes: [], extra: { tipo: "nenhum", segundos: 30, next: null } });
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
  Object.assign(st, {
    id: a.id, nome: a.nome || "", active: a.active !== false,
    keywords: (a.keyword || "").split(",").map((s) => s.trim()).filter(Boolean),
    matchAny: !!a.match_any,
    mediaIds: [...(a.media_ids || [])],
    publicReply: a.public_reply || "",
    variants: [...(a.public_reply_variants || [])],
    message: p1.message || "",
    botaoOn: meta.botaoOn ?? !!b0,
    botaoTitulo: b0?.title || "",
    modo: meta.modo || (b0?.url ? "link" : steps.length > 1 ? "conversa" : "link"),
    link: b0?.url || "",
    assetIds: [...(a.asset_ids || [])],
  });
  const temNext = (v) => v !== null && v !== undefined && v !== "";
  st.passos = steps.slice(1).map((s) => ({
    id: Number(s.id),
    message: s.message || "",
    botoes: (s.buttons || []).map((b) => ({
      titulo: b.title || "",
      tipo: b.url ? "link" : temNext(b.next) ? "proxima" : "fim",
      next: temNext(b.next) ? Number(b.next) : null,
      url: b.url || "",
    })),
    extra: s.collect
      ? { tipo: s.collect.field === "telefone" ? "telefone" : "email", segundos: 30, next: temNext(s.collect.next) ? Number(s.collect.next) : null }
      : s.delay
      ? { tipo: "atraso", segundos: s.delay.seconds || 30, next: Number(s.delay.next) }
      : { tipo: "nenhum", segundos: 30, next: null },
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
      const passo = {
        id: p.id,
        message: p.message.trim(),
        buttons: p.botoes.map((b) =>
          b.tipo === "link" ? { title: b.titulo.trim(), url: arrumarLink(b.url) }
          : b.tipo === "proxima" ? { title: b.titulo.trim(), next: b.next }
          : { title: b.titulo.trim() }),                       // "encerrar": não é enviado
      };
      if (p.extra.tipo === "email" || p.extra.tipo === "telefone") passo.collect = { field: p.extra.tipo, next: p.extra.next };
      if (p.extra.tipo === "atraso") passo.delay = { seconds: Number(p.extra.segundos) || 30, next: p.extra.next };
      steps.push(passo);
    }
  }

  // Arquivos: no modo "Continua a conversa" vão junto com a Mensagem 2,
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
    else if (t.trim().length > MAX_TITULO) erros.push(`${onde}: o nome do botão passou de ${MAX_TITULO} caracteres.`);
    else if (pareceLink(t)) erros.push(`${onde}: o nome do botão parece um link. O link vai no campo "Link completo".`);
  };
  if (!st.nome.trim()) erros.push("Dê um nome pra automação (lá em cima).");
  if (!st.matchAny && !st.keywords.length) erros.push('Adicione pelo menos uma palavra que ativa, ou ligue "Qualquer palavra ativa".');
  if (!st.message.trim()) erros.push('Escreva "Sua mensagem" (a Mensagem 1).');
  if (st.botaoOn) {
    nomeBotao(st.botaoTitulo, "Mensagem 1");
    if (st.modo === "link" && !linkValido(st.link)) erros.push("Mensagem 1: cole o link completo do botão.");
    if (st.modo === "conversa") {
      if (!st.passos.length) erros.push('Adicione a Mensagem 2 (é ela que chega quando a pessoa toca no botão).');
      st.passos.forEach((p, i) => {
        const n = `Mensagem ${i + 2}`;
        const existe = (id) => st.passos.some((q) => q.id === id);
        if (!p.message.trim()) erros.push(`${n}: escreva o texto.`);
        p.botoes.forEach((b, j) => {
          if (b.tipo === "fim") return;
          nomeBotao(b.titulo, `${n}, botão ${j + 1}`);
          if (b.tipo === "link" && !linkValido(b.url)) erros.push(`${n}, botão ${j + 1}: cole o link completo.`);
          if (b.tipo === "proxima" && !existe(b.next)) erros.push(`${n}, botão ${j + 1}: escolha pra qual mensagem ele vai.`);
        });
        if (p.extra.tipo === "atraso" && !existe(p.extra.next)) erros.push(`${n}: escolha qual mensagem mandar depois do tempo.`);
      });
    }
  }
  return erros;
}

// ---------------------------------------------------------------------
// O editor
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

  const sujo = () => !!st && JSON.stringify(st) !== foto;

  function abrir(auto, opcoes = {}) {
    st = auto ? doBanco(auto) : estadoNovo();
    foto = JSON.stringify(st);
    aoSalvar = opcoes.aoSalvar || null;
    erros = [];
    posts = null;
    arquivos = null;
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

  // Não perder o que foi digitado: avisa ao fechar a aba ou apertar Esc.
  window.addEventListener("beforeunload", (e) => { if (sujo()) { e.preventDefault(); e.returnValue = ""; } });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && st) fechar(); });

  // Posts e arquivos chegam depois; troca só aquele pedaço (sem perder o foco de quem digita).
  async function carregarExtras() {
    const [m, a] = await Promise.all([Dados.midias(), Dados.arquivos()]);
    if (!st) return;
    posts = m?.posts || [];
    arquivos = a || [];
    raiz.querySelector("#lugar-posts")?.replaceChildren(seletorPosts());
    trocarArquivos();
    renderPrevia();
  }
  const trocarArquivos = () => raiz.querySelector("#lugar-arquivos")?.replaceChildren(seletorArquivos());

  // -------------------------------------------------------------------
  // Montagem da tela
  // -------------------------------------------------------------------
  function montar() {
    formEl = h("div", { class: "editor-form-interno" });
    previaEl = h("div");
    raiz.replaceChildren(
      h("div", { class: "editor-topo" },
        h("button", { class: "btn btn-fantasma btn-icone", title: "Voltar", "aria-label": "Voltar", onclick: fechar }, icone("voltar")),
        h("input", {
          class: "campo campo-nome", value: st.nome, "aria-label": "Nome da automação",
          placeholder: "Nome da automação (ex: Material grátis)",
          oninput: (e) => { st.nome = e.target.value; },
        }),
        h("div", { class: "espaco" }),
        chave(st.active, (v) => { st.active = v; }, "Ativa"),
        h("button", { class: "btn", onclick: fechar }, "Cancelar"),
        h("button", { class: "btn btn-primario", id: "botao-salvar", onclick: salvar }, icone("check"), "Salvar")),
      h("div", { class: "editor-corpo" },
        h("div", { class: "editor-form" }, formEl),
        h("div", { class: "editor-previa" }, previaEl)),
    );
    renderForm();
    renderPrevia();
  }

  // Redesenha o formulário (em mudanças de estrutura: botões, modos, mensagens).
  function renderForm() {
    if (erros.length) erros = validar(st); // a lista de pendências vai sumindo conforme corrige
    const rolagem = formEl.parentElement;
    const topo = rolagem.scrollTop;
    formEl.replaceChildren(...[erros.length ? caixaErros() : null, blocoGatilho(), blocoResposta()].filter(Boolean));
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
  function chave(ligado, aoMudar, texto) {
    return h("label", { class: "chave" },
      h("input", { type: "checkbox", checked: ligado, onchange: (e) => aoMudar(e.target.checked) }),
      h("span", { class: "trilho" }),
      h("span", { class: "chave-texto" }, texto));
  }

  function tituloBloco(n, titulo, sub) {
    return h("div", { class: "bloco-titulo" },
      h("span", { class: "bloco-num" }, String(n)), h("div", {}, h("h2", {}, titulo), h("p", {}, sub)));
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
  function ajustarAltura(ta) { ta.style.height = "auto"; ta.style.height = `${Math.max(70, ta.scrollHeight + 2)}px`; }
  function campoLink(id, get, set) {
    const ta = h("textarea", {
      class: "campo campo-link", id, value: get(), rows: "2", placeholder: "https://...",
      spellcheck: "false",
      oninput: (e) => { set(e.target.value); ajustarAltura(e.target); renderPrevia(); },
    });
    return h("div", {}, ta,
      h("p", { class: "ajuda" }, "Cole o link inteiro aqui, por maior que seja. A pessoa vê só o nome do botão: o link fica invisível."));
  }

  // Nome do botão: limite de 20, contador e detector de link colado no lugar errado.
  function campoTitulo(id, get, set, ehLink, moverLink) {
    const contador = h("div", { class: "contador" });
    const dica = h("div", { class: "dica-link", hidden: true });
    const inp = h("input", {
      class: "campo", id, value: get(), placeholder: "Ex: Quero o material",
      oninput: (e) => { set(e.target.value); atualizar(false); renderPrevia(); },
    });
    function atualizar(inicial) {
      const v = get();
      const n = v.trim().length;
      contador.textContent = `${n}/${MAX_TITULO}`;
      contador.classList.toggle("estourou", n > MAX_TITULO);
      inp.classList.toggle("invalido", n > MAX_TITULO);
      if (pareceLink(v)) {
        // Se o botão já é de link, move na hora pro campo certo.
        if (ehLink() && !inicial) { moverLink(v.trim()); return; }
        dica.hidden = false;
        dica.textContent = ehLink()
          ? 'Isso parece um link: ele vai no campo "Link completo", não no nome do botão.'
          : 'Isso parece um link. O link não vai no nome do botão: escolha "abrir um link" e eu coloco ele no lugar certo.';
      } else {
        dica.hidden = true;
      }
    }
    atualizar(true);
    return h("div", {}, inp, contador, dica);
  }

  // -------------------------------------------------------------------
  // BLOCO 1: o gatilho
  // -------------------------------------------------------------------
  function blocoGatilho() {
    return h("section", { class: "cartao" },
      tituloBloco(1, "O gatilho", "O que faz a DM disparar."),
      h("div", { class: "grupo" },
        h("label", { class: "rotulo", for: "tags-entrada" }, "Palavras que ativam"),
        campoTags(),
        h("p", { class: "ajuda" }, st.matchAny
          ? 'Com "Qualquer palavra ativa" ligado, as palavras são ignoradas.'
          : "Digite uma palavra e aperte Enter. Maiúsculas e acentos não importam.")),
      h("div", { class: "grupo" },
        chave(st.matchAny, (v) => { st.matchAny = v; reestruturou(); }, "Qualquer palavra ativa (qualquer comentário no post dispara)")),
      h("div", { class: "separador" }),
      h("div", { class: "grupo" },
        h("span", { class: "rotulo" }, "Em quais posts"),
        h("div", { id: "lugar-posts" }, seletorPosts())),
      h("div", { class: "separador" }),
      h("div", { class: "grupo", style: "margin-bottom:0" },
        h("label", { class: "rotulo", for: "resp-publica" }, "Resposta no comentário"),
        h("input", {
          class: "campo", id: "resp-publica", value: st.publicReply, placeholder: "Ex: te chamei no direct 💌",
          oninput: (e) => { st.publicReply = e.target.value; renderPrevia(); },
        }),
        h("p", { class: "ajuda" }, "Texto público que responde quem comentou. Opcional."),
        st.variants.map((v, i) => h("div", { class: "linha", style: "margin-top:8px" },
          h("input", {
            class: "campo cresce", value: v, placeholder: `Variação ${String.fromCharCode(66 + i)}`,
            "aria-label": `Variação ${String.fromCharCode(66 + i)}`,
            oninput: (e) => { st.variants[i] = e.target.value; },
          }),
          h("button", {
            class: "btn btn-fantasma btn-icone", title: "Remover variação", "aria-label": "Remover variação",
            onclick: () => { st.variants.splice(i, 1); reestruturou(); },
          }, icone("x")))),
        h("button", {
          class: "btn btn-pequeno", style: "margin-top:10px", type: "button",
          onclick: () => { st.variants.push(""); reestruturou(); },
        }, icone("mais"), "Adicionar variação A/B"),
        st.variants.length ? h("p", { class: "ajuda" }, "O sistema alterna entre o texto principal e as variações.") : null));
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
      entrada.placeholder = st.keywords.length ? "" : "Ex: quero";
    }
    entrada.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === ",") { e.preventDefault(); adicionar(true); }
      else if (e.key === "Backspace" && !entrada.value && st.keywords.length) { st.keywords.pop(); desenhar(); renderPrevia(); entrada.focus(); }
    });
    entrada.addEventListener("blur", () => { if (entrada.value.trim()) adicionar(false); });
    desenhar();
    return caixa;
  }

  function seletorPosts() {
    if (posts === null) return h("p", { class: "ajuda", style: "margin:0" }, "Carregando seus posts...");
    if (!posts.length) {
      return h("div", { class: "aviso aviso-info" }, icone("info"), h("span", {}, Dados.semBanco
        ? "Conecte seu Instagram pra escolher posts. Enquanto isso, a automação vale pra todos os posts."
        : "Nenhum post encontrado (ou o Instagram ainda não está conectado). Vazio = vale pra todos os posts."));
    }
    return h("div", {},
      h("p", { class: "ajuda", style: "margin:0 0 8px" }, st.mediaIds.length
        ? `${st.mediaIds.length} post(s) escolhido(s). Toque de novo pra desmarcar.`
        : "Nenhum escolhido = vale pra todos os posts."),
      h("div", { class: "posts" }, posts.map((p) => {
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
      })));
  }

  // -------------------------------------------------------------------
  // BLOCO 2: a resposta
  // -------------------------------------------------------------------
  function blocoResposta() {
    const conversa = st.botaoOn && st.modo === "conversa";
    const sec = h("section", { class: "cartao" }, tituloBloco(2, "A resposta", "O que a pessoa recebe no direct."));

    sec.append(h("div", { class: "grupo" },
      h("label", { class: "rotulo", for: "msg1" }, "Sua mensagem"),
      areaTexto("msg1", st.message, (v) => { st.message = v; renderPrevia(); atualizarReferencia(); },
        "Ex: Oi! Que bom que você quer o material 🥰")));

    sec.append(h("div", { class: "grupo" }, chave(st.botaoOn, (v) => { st.botaoOn = v; reestruturou(); }, "Botão na mensagem")));

    if (st.botaoOn) {
      sec.append(
        h("div", { class: "grupo" },
          h("label", { class: "rotulo", for: "titulo1" }, "Texto do botão"),
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
          h("span", { class: "rotulo" }, "O que o botão faz quando ela toca"),
          h("div", { class: "segmentos" },
            segmento("link", "link", "Um link", "Ao tocar, ela é levada pra um site."),
            segmento("conversa", "balao", "Continua a conversa", "Ao tocar, ela te envia o texto do botão e a conversa segue."))),
      );
      if (st.modo === "link") {
        sec.append(
          h("div", { class: "grupo" },
            h("label", { class: "rotulo", for: "link1" }, "Link completo"),
            campoLink("link1", () => st.link, (v) => { st.link = v; })),
          h("div", { class: "aviso aviso-info grupo" }, icone("balao"),
            h("span", {}, "Quer mandar mais de uma mensagem (Mensagem 2, 3...)? Escolha ",
              h("strong", {}, "Continua a conversa"), " acima.")));
      } else {
        sec.append(h("div", { class: "grupo" },
          h("span", { class: "rotulo" }, "A sequência da conversa"),
          construtorSequencia()));
      }
    }

    sec.append(
      h("div", { class: "separador" }),
      h("div", { class: "grupo", style: "margin-bottom:0" },
        h("span", { class: "rotulo" }, "Anexar um arquivo (opcional)"),
        h("div", { id: "lugar-arquivos" }, seletorArquivos()),
        h("p", { class: "ajuda" }, conversa
          ? "O arquivo vai junto com a Mensagem 2: antes do toque no botão, o Instagram só deixa mandar uma mensagem."
          : "PDF, áudio, foto ou vídeo, enviado logo depois da mensagem.")));
    return sec;
  }

  function segmento(valor, nomeIcone, titulo, texto) {
    return h("button", {
      type: "button", class: `segmento${st.modo === valor ? " ativo" : ""}`, "aria-pressed": String(st.modo === valor),
      onclick: () => {
        st.modo = valor;
        // Link colado no nome do botão? Move pro campo certo e põe um nome padrão.
        if (valor === "link" && pareceLink(st.botaoTitulo)) {
          if (!st.link.trim()) st.link = st.botaoTitulo.trim();
          st.botaoTitulo = "Acessar";
          toast('Movi o link pro campo certo e dei o nome "Acessar" pro botão.');
        }
        reestruturou();
      },
    }, h("strong", {}, icone(nomeIcone), titulo), h("span", {}, texto));
  }

  // Atualiza a "Mensagem 1 (referência)" sem redesenhar o formulário
  function atualizarReferencia() {
    const t = raiz.querySelector("#ref-msg1-texto");
    if (t) t.textContent = st.message.trim() || 'Escreva "Sua mensagem" lá em cima.';
    const b = raiz.querySelector("#ref-msg1-botao");
    if (b) b.textContent = `${st.botaoTitulo.trim() || "Botão sem nome"}  →  Mensagem 2`;
  }

  // -------------------------------------------------------------------
  // Construtor da sequência (o mini-chat)
  // -------------------------------------------------------------------
  function construtorSequencia() {
    const box = h("div", { class: "sequencia" },
      h("div", { class: "msg-ref" },
        h("span", { class: "rotulo", style: "margin:0" }, "Mensagem 1 (referência)"),
        h("div", { class: "texto", id: "ref-msg1-texto" }),
        h("div", { style: "margin-top:8px" }, h("span", { class: "chip", id: "ref-msg1-botao" })),
        h("p", { class: "ajuda" }, 'A Mensagem 1 se edita lá em cima, em "Sua mensagem" e "Texto do botão". O toque no botão leva pra Mensagem 2.')));

    st.passos.forEach((p, i) => box.append(cartaoPasso(p, i)));
    if (!st.passos.length) box.append(h("p", { class: "ajuda", style: "margin:0" }, "Adicione a Mensagem 2: é ela que a pessoa recebe quando toca no botão."));
    box.append(h("div", {}, h("button", {
      class: "btn", type: "button",
      onclick: () => { st.passos.push(novoPasso(st)); reestruturou(); },
    }, icone("mais"), "Adicionar mensagem")));

    // preenche a referência depois de montar
    queueMicrotask(atualizarReferencia);
    return box;
  }

  function cartaoPasso(p, i) {
    const n = i + 2;
    const temBotaoVisivel = p.botoes.some((b) => b.tipo !== "fim");
    return h("div", { class: "msg-card" },
      h("div", { class: "msg-card-topo" },
        h("h3", {}, h("span", { class: "bloco-num", style: "width:22px;height:22px;font-size:12px" }, String(n)), `Mensagem ${n}`),
        h("button", {
          class: "btn btn-fantasma btn-icone btn-perigo", title: "Apagar mensagem", "aria-label": `Apagar mensagem ${n}`,
          onclick: () => apagarPasso(p),
        }, icone("lixo"))),
      areaTexto(`msg-${p.id}`, p.message, (v) => { p.message = v; renderPrevia(); }, "Escreva a mensagem..."),
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
        : h("p", { class: "ajuda" }, "Máximo de 3 botões por mensagem (limite do Instagram pra botões anexados)."),
      !temBotaoVisivel && p.extra.tipo === "nenhum"
        ? h("p", { class: "nota-fim" }, icone("fim"), "Sem botões: a conversa termina nesta mensagem.")
        : null,
      blocoExtra(p, i));
  }

  function apagarPasso(p) {
    if ((p.message.trim() || p.botoes.length) && !confirm("Apagar esta mensagem e os botões dela?")) return;
    st.passos = st.passos.filter((q) => q !== p);
    // Quem apontava pra ela fica sem destino.
    for (const q of st.passos) {
      for (const b of q.botoes) if (b.next === p.id) b.next = null;
      if (q.extra.next === p.id) q.extra.next = null;
    }
    reestruturou();
  }

  function seletorMensagem(atual, excluirId, vazio, aoMudar) {
    const destinos = st.passos.filter((q) => q.id !== excluirId);
    if (!destinos.length) return h("span", { class: "ajuda", style: "margin:0" }, "Adicione outra mensagem pra ligar aqui.");
    return h("select", { class: "campo", style: "width:auto", onchange: (e) => aoMudar(e.target.value ? Number(e.target.value) : null) },
      h("option", { value: "" }, vazio),
      destinos.map((q) => h("option", { value: String(q.id), selected: q.id === atual }, `Mensagem ${st.passos.indexOf(q) + 2}`)));
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
      h("div", { class: "linha", style: "flex-wrap:nowrap" },
        h("span", { class: "rotulo", style: "margin:0" }, `Botão ${j + 1}`),
        h("div", { class: "cresce" }),
        h("button", {
          class: "btn btn-fantasma btn-icone btn-perigo", title: "Remover botão", "aria-label": `Remover botão ${j + 1}`,
          onclick: () => { p.botoes.splice(j, 1); reestruturou(); },
        }, icone("x"))),
      h("div", { class: "linha", style: "align-items:flex-start;margin-top:6px" },
        b.tipo === "fim" ? null : h("div", { class: "cresce" },
          campoTitulo(idTitulo, () => b.titulo, (v) => { b.titulo = v; }, () => b.tipo === "link", (url) => {
            if (!b.url.trim()) b.url = url;
            b.titulo = "Acessar";
            toast('Movi o link pro campo certo e dei o nome "Acessar" pro botão.');
            reestruturou();
            focarLink();
          })),
        h("select", { class: "campo", "aria-label": "Destino do botão", onchange: (e) => mudarTipo(e.target.value) },
          h("option", { value: "proxima", selected: b.tipo === "proxima" }, "Ir pra outra mensagem"),
          h("option", { value: "link", selected: b.tipo === "link" }, "Abrir um link"),
          h("option", { value: "fim", selected: b.tipo === "fim" }, "Encerrar"))));

    if (b.tipo === "proxima") {
      card.append(h("div", { class: "linha", style: "margin-top:8px" },
        h("span", { class: "ajuda", style: "margin:0" }, "Vai para:"),
        seletorMensagem(b.next, p.id, "Escolha a mensagem", (v) => { b.next = v; renderPrevia(); })));
    } else if (b.tipo === "link") {
      card.append(h("div", { style: "margin-top:8px" },
        h("label", { class: "rotulo", for: idLink }, "Link completo"),
        campoLink(idLink, () => b.url, (v) => { b.url = v; })));
    } else {
      card.append(h("p", { class: "nota-fim" }, icone("fim"),
        "Encerrar: a conversa acaba aqui. Isso não vira um botão, a pessoa não vê nada."));
    }
    return card;
  }

  // Ação extra depois da mensagem: pedir um dado ou mandar outra sozinho.
  function blocoExtra(p, i) {
    const ex = p.extra;
    const linha = h("div", { class: "linha" },
      h("span", { class: "ajuda", style: "margin:0" }, "Depois desta mensagem:"),
      h("select", {
        class: "campo", "aria-label": "Ação depois da mensagem",
        onchange: (e) => {
          ex.tipo = e.target.value;
          if (ex.tipo !== "nenhum" && ex.next === null && st.passos[i + 1]) ex.next = st.passos[i + 1].id;
          reestruturou();
        },
      },
      h("option", { value: "nenhum", selected: ex.tipo === "nenhum" }, "Nada"),
      h("option", { value: "email", selected: ex.tipo === "email" }, "Pedir o e-mail"),
      h("option", { value: "telefone", selected: ex.tipo === "telefone" }, "Pedir o telefone"),
      h("option", { value: "atraso", selected: ex.tipo === "atraso" }, "Mandar outra sozinho, depois de um tempo")));

    const box = h("div", { class: "extra" }, linha);
    if (ex.tipo === "atraso") {
      box.append(h("div", { class: "linha", style: "margin-top:8px" },
        h("span", { class: "ajuda", style: "margin:0" }, "Esperar"),
        h("input", {
          class: "campo", type: "number", min: "5", step: "5", value: String(ex.segundos), style: "width:90px",
          "aria-label": "Segundos de espera",
          oninput: (e) => { ex.segundos = Math.max(5, Number(e.target.value) || 30); renderPrevia(); },
        }),
        h("span", { class: "ajuda", style: "margin:0" }, "segundos e mandar"),
        seletorMensagem(ex.next, p.id, "Escolha a mensagem", (v) => { ex.next = v; renderPrevia(); })),
        h("p", { class: "ajuda" }, "O carteiro passa a cada minuto, então o envio pode atrasar até 1 minuto a mais."));
    }
    if (ex.tipo === "email" || ex.tipo === "telefone") {
      const dado = ex.tipo === "email" ? "e-mail" : "telefone";
      box.append(h("div", { class: "linha", style: "margin-top:8px" },
        h("span", { class: "ajuda", style: "margin:0" }, "Depois que ela responder, mandar"),
        seletorMensagem(ex.next, p.id, "Nada (só agradece)", (v) => { ex.next = v; renderPrevia(); })),
        h("p", { class: "ajuda" }, `A próxima mensagem de texto da pessoa vira o ${dado} dela (com validação: se vier estranho, o sistema pede de novo). Escreva o pedido no texto acima, ex: "Me manda seu ${dado}?"`));
    }
    return box;
  }

  // -------------------------------------------------------------------
  // Biblioteca de arquivos
  // -------------------------------------------------------------------
  const ICONE_TIPO = { image: "imagem", audio: "audio", video: "video", file: "arquivo" };
  const NOME_TIPO = { image: "Foto", audio: "Áudio", video: "Vídeo", file: "Arquivo" };

  function seletorArquivos() {
    if (arquivos === null) return h("p", { class: "ajuda", style: "margin:0" }, "Carregando a biblioteca...");
    const input = h("input", {
      type: "file", hidden: true, accept: "image/*,audio/*,video/*,application/pdf",
      onchange: async (e) => {
        const f = e.target.files[0];
        if (!f) return;
        botao.disabled = true;
        botao.textContent = "Enviando...";
        const r = await Dados.enviarArquivo(f);
        if (r.ok) {
          arquivos.unshift(r.arquivo);
          st.assetIds.push(r.arquivo.id);
          toast("Arquivo adicionado.", "sucesso");
        } else {
          toast(r.erro, "erro");
        }
        trocarArquivos();
        renderPrevia();
      },
    });
    const botao = h("button", {
      class: "btn btn-pequeno", type: "button",
      onclick: () => Dados.semBanco
        ? toast("A biblioteca de arquivos funciona depois de configurar o Supabase (veja o LEIA-ME).")
        : input.click(),
    }, icone("upload"), "Enviar arquivo");

    const lista = arquivos.length
      ? h("div", { class: "arquivos" }, arquivos.map((a) => h("label", { class: "arquivo" },
        h("input", {
          type: "checkbox", checked: st.assetIds.includes(a.id),
          onchange: (e) => {
            st.assetIds = e.target.checked ? [...st.assetIds, a.id] : st.assetIds.filter((x) => x !== a.id);
            renderPrevia();
          },
        }),
        icone(ICONE_TIPO[a.tipo] || "arquivo"),
        h("span", { class: "cresce" }, a.nome),
        h("span", { class: "mudo", style: "font-size:12px" }, NOME_TIPO[a.tipo] || ""))))
      : h("p", { class: "ajuda", style: "margin:0 0 8px" }, "Sua biblioteca ainda está vazia.");
    return h("div", {}, lista, h("div", { style: "margin-top:8px" }, botao, input));
  }

  // -------------------------------------------------------------------
  // PRÉVIA AO VIVO (mockup de celular)
  // -------------------------------------------------------------------
  // Botão sem destino (nem link nem próxima mensagem) não aparece, igual não é enviado.
  const botaoVisivel = (b) =>
    (b.tipo === "link" && b.url.trim()) || (b.tipo === "proxima" && st.passos.some((q) => q.id === b.next));

  function bolha(texto, botoes, vazio) {
    const visiveis = botoes.filter(botaoVisivel);
    const grupo = h("div", { class: `bolha-grupo${visiveis.length ? " com-botoes" : ""}` },
      h("div", { class: "bolha", style: vazio ? "color:#9CA3AF" : null }, texto));
    if (visiveis.length) {
      // Botões ANEXADOS ao balão (não uma pílula solta embaixo)
      grupo.append(h("div", { class: "botoes-anexados" }, visiveis.map((b) => h("div", { class: "botao-anexado" },
        b.tipo === "link" ? icone("link") : null,
        (b.titulo.trim() || (b.tipo === "link" ? "Acessar" : "Continuar")).slice(0, MAX_TITULO)))));
    }
    return grupo;
  }

  function anexosPrevia(ids) {
    return ids.map((id) => {
      const a = (arquivos || []).find((x) => x.id === id);
      return h("div", { class: "anexo-prev" }, icone(ICONE_TIPO[a?.tipo] || "arquivo"), a?.nome || "Arquivo");
    });
  }

  // O que faz a pessoa chegar nesta mensagem? (pra mostrar o "toque" dela)
  function chegada(p, i) {
    if (i === 0) return { eu: st.botaoTitulo.trim() || "Botão" };
    for (const q of st.passos) {
      const b = q.botoes.find((x) => x.tipo === "proxima" && x.next === p.id && x.titulo.trim());
      if (b) return { eu: b.titulo.trim().slice(0, MAX_TITULO) };
      if (q.extra.next === p.id && q.extra.tipo === "email") return { eu: "voce@exemplo.com" };
      if (q.extra.next === p.id && q.extra.tipo === "telefone") return { eu: "(11) 90000-0000" };
      if (q.extra.next === p.id && q.extra.tipo === "atraso") return { nota: `depois de ${q.extra.segundos} segundos` };
    }
    return null;
  }

  function renderPrevia() {
    if (!st || !previaEl) return;
    const conversa = st.botaoOn && st.modo === "conversa";
    const corpo = h("div", { class: "cel-corpo" });

    // O comentário que dispara + a resposta pública
    const respostas = [st.publicReply, ...st.variants].map((s) => s.trim()).filter(Boolean);
    corpo.append(
      h("div", { class: "cel-sistema" }, "No post"),
      h("div", { class: "comentario-prev" },
        h("strong", {}, "seguidor "), st.matchAny ? "adorei!" : (st.keywords[0] || "quero"),
        respostas.length ? h("div", { class: "resp" }, h("strong", {}, "sua_conta "), respostas[0]) : null),
      h("div", { class: "cel-sistema" }, "No direct"));

    // Mensagem 1
    const b1 = !st.botaoOn ? []
      : conversa ? [{ titulo: st.botaoTitulo, tipo: "proxima", next: st.passos[0]?.id ?? null, url: "" }]
      : [{ titulo: st.botaoTitulo, tipo: "link", next: null, url: st.link }];
    corpo.append(bolha(st.message.trim() || "Sua mensagem aparece aqui.", b1, !st.message.trim()));
    if (!conversa) corpo.append(...anexosPrevia(st.assetIds));

    // Mensagem 2 em diante
    if (conversa) {
      st.passos.forEach((p, i) => {
        const c = chegada(p, i);
        if (c?.eu) corpo.append(h("div", { class: "bolha-eu" }, c.eu));
        if (c?.nota) corpo.append(h("div", { class: "nota-prev" }, c.nota));
        corpo.append(bolha(p.message.trim() || `Mensagem ${i + 2}`, p.botoes, !p.message.trim()));
        if (i === 0) corpo.append(...anexosPrevia(st.assetIds));
        if (p.extra.tipo === "email") corpo.append(h("div", { class: "nota-prev" }, "esperando ela mandar o e-mail"));
        if (p.extra.tipo === "telefone") corpo.append(h("div", { class: "nota-prev" }, "esperando ela mandar o telefone"));
        if (!p.botoes.some(botaoVisivel) && p.extra.tipo === "nenhum") corpo.append(h("div", { class: "nota-prev" }, "fim da conversa"));
      });
    }

    previaEl.replaceChildren(
      h("div", { class: "previa-titulo" },
        h("span", { class: "rotulo" }, "Prévia ao vivo"),
        h("p", { class: "ajuda", style: "margin:0" }, "Assim a DM chega pra pessoa.")),
      h("div", { class: "celular" }, h("div", { class: "tela-cel" },
        h("div", { class: "cel-topo" }, h("div", { class: "avatar" }),
          h("div", {}, h("strong", {}, "sua_conta"), h("small", {}, "Instagram"))),
        corpo)));
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
