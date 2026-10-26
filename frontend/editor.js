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
  const trocarArquivos = () => raiz.querySelector("#lugar-arquivos")?.replaceChildren(seletorArquivo());

  // -------------------------------------------------------------------
  // Montagem da tela
  // -------------------------------------------------------------------
  function montar() {
    formEl = h("div", { class: "editor-form-interno" });
    previaEl = h("div");
    raiz.replaceChildren(
      h("div", { class: "editor-topo" },
        h("button", { class: "btn btn-fantasma btn-icone", title: "Voltar", "aria-label": "Voltar", onclick: fechar }, icone("voltar")),
        h("strong", { class: "editor-titulo" }, st.id ? "Editar automação" : "Nova automação"),
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
    formEl.replaceChildren(...[erros.length ? caixaErros() : null, blocoNome(), blocoGatilho(), blocoResposta()].filter(Boolean));
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
      class: "campo", id, value: get(), placeholder: opcoes.placeholder || "Ex: Quero o material",
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
  // Nome da automação
  // -------------------------------------------------------------------
  function blocoNome() {
    return h("div", {},
      h("label", { class: "rotulo", for: "nome-automacao" }, "Nome da automação"),
      h("input", {
        class: "campo campo-nome", id: "nome-automacao", value: st.nome, placeholder: "Ex: Material grátis",
        oninput: (e) => { st.nome = e.target.value; },
      }),
      h("p", { class: "ajuda" }, "Só você vê esse nome, serve pra você se organizar."));
  }

  // -------------------------------------------------------------------
  // BLOCO 1: o gatilho
  // -------------------------------------------------------------------
  function blocoGatilho() {
    return h("section", { class: "cartao" },
      tituloBloco(1, "O gatilho", "O que faz a DM disparar"),
      h("div", { class: "grupo" },
        h("label", { class: "rotulo", for: "tags-entrada" }, "Palavras que ativam"),
        campoTags(),
        h("p", { class: "ajuda" }, "Cada palavra vira uma etiqueta. Aperte Enter pra adicionar.")),
      h("div", { class: "grupo" },
        chave(st.matchAny, (v) => { st.matchAny = v; renderPrevia(); }, "Qualquer palavra ativa"),
        h("p", { class: "ajuda" }, "Ligado, qualquer comentário no post dispara (ignora as palavras acima).")),
      h("div", { class: "grupo" },
        h("span", { class: "rotulo" }, "Em quais posts"),
        h("div", { id: "lugar-posts" }, seletorPosts())),
      h("div", { class: "grupo", style: "margin-bottom:0" },
        h("label", { class: "rotulo", for: "resp-publica" }, "Resposta no comentário"),
        h("textarea", {
          class: "campo", id: "resp-publica", value: st.publicReply, placeholder: "Ex: oie, te mandei na dm 💌",
          style: "min-height:70px",
          oninput: (e) => { st.publicReply = e.target.value; renderPrevia(); },
        }),
        st.variants.map((v, i) => h("div", { class: "linha", style: "margin-top:8px" },
          h("input", {
            class: "campo cresce", value: v, placeholder: "Outra forma de dizer",
            "aria-label": `Variação ${i + 2} da resposta`,
            oninput: (e) => { st.variants[i] = e.target.value; },
          }),
          h("button", {
            class: "btn btn-icone btn-remover", title: "Remover variação", "aria-label": "Remover variação",
            onclick: () => { st.variants.splice(i, 1); reestruturou(); },
          }, icone("x")))),
        h("button", {
          class: "btn btn-pequeno", style: "margin-top:10px", type: "button",
          onclick: () => { st.variants.push(""); reestruturou(); },
        }, icone("mais"), "variação (A/B)"),
        h("p", { class: "ajuda" }, "Com variações, o sistema alterna entre elas pra parecer mais natural.")));
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
      entrada.placeholder = st.keywords.length ? "" : "Digite e aperte Enter";
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
        ? "Conecte seu Instagram pra escolher posts. Enquanto isso, a automação vale pra todos os seus posts."
        : "Nenhum post encontrado (ou o Instagram ainda não está conectado). Nenhum escolhido = vale pra todos os seus posts."));
    }
    return h("div", {},
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
      })),
      h("p", { class: "ajuda" }, st.mediaIds.length
        ? `${st.mediaIds.length} post(s) escolhido(s). Toque de novo pra desmarcar.`
        : "Nenhum escolhido = vale pra todos os seus posts"));
  }

  // -------------------------------------------------------------------
  // BLOCO 2: a resposta
  // -------------------------------------------------------------------
  function blocoResposta() {
    const sec = h("section", { class: "cartao" }, tituloBloco(2, "A resposta", "O que a pessoa recebe na DM"));

    sec.append(h("div", { class: "grupo" },
      h("label", { class: "rotulo", for: "msg1" }, "Sua mensagem"),
      areaTexto("msg1", st.message, (v) => { st.message = v; renderPrevia(); atualizarReferencia(); },
        "Ex: oii! que bom que você quer 🫶 toca no botão aqui embaixo")));

    sec.append(h("div", { class: "grupo" }, chave(st.botaoOn, (v) => { st.botaoOn = v; reestruturou(); }, "Botão na mensagem")));

    if (st.botaoOn) {
      sec.append(
        h("div", { class: "grupo" },
          h("label", { class: "rotulo", for: "titulo1" }, "Texto do botão"),
          campoTitulo("titulo1", () => st.botaoTitulo, (v) => { st.botaoTitulo = v; },
            () => st.modo === "link",
            (url) => {
              if (!st.link.trim()) st.link = url;
              st.botaoTitulo = "Acessar";
              toast('Movi o link pro campo certo e dei o nome "Acessar" pro botão.');
              reestruturou();
              raiz.querySelector("#link1")?.focus();
            })),
        h("div", { class: "grupo" },
          h("label", { class: "rotulo", for: "modo-botao" }, "O que o botão faz quando ela toca"),
          h("select", {
            class: "campo", id: "modo-botao",
            onchange: (e) => escolherModo(e.target.value),
          },
          h("option", { value: "link", selected: st.modo === "link" }, "Um link (leva a pessoa pra um site)"),
          h("option", { value: "conversa", selected: st.modo === "conversa" }, "Continua a conversa"))),
      );
      if (st.modo === "link") {
        sec.append(h("div", { class: "grupo" },
          h("label", { class: "rotulo", for: "link1" }, "O link completo"),
          campoLink("link1", () => st.link, (v) => { st.link = v; },
            "Cole o link inteiro aqui, por maior que seja. A pessoa vê só o nome bonito do botão, o link fica invisível pra ela.")));
      } else {
        sec.append(h("div", { class: "grupo" }, construtorSequencia()));
      }
    }

    sec.append(h("div", { class: "grupo", style: "margin-bottom:0" },
      h("label", { class: "rotulo", for: "arquivo" }, "Anexar um arquivo (opcional)"),
      h("div", { id: "lugar-arquivos" }, seletorArquivo())));
    return sec;
  }

  function escolherModo(valor) {
    st.modo = valor;
    // Link colado no nome do botão? Move pro campo certo e põe um nome padrão.
    if (valor === "link" && pareceLink(st.botaoTitulo)) {
      if (!st.link.trim()) st.link = st.botaoTitulo.trim();
      st.botaoTitulo = "Acessar";
      toast('Movi o link pro campo certo e dei o nome "Acessar" pro botão.');
    }
    reestruturou();
  }

  // Atualiza a "Mensagem 1 (já escrita lá em cima)" sem redesenhar o formulário
  function atualizarReferencia() {
    const t = raiz.querySelector("#ref-msg1-texto");
    if (t) t.textContent = st.message.trim() || 'Escreva "Sua mensagem" lá em cima.';
  }

  // -------------------------------------------------------------------
  // Construtor da conversa (o mini-chat)
  // -------------------------------------------------------------------
  function construtorSequencia() {
    const box = h("div", { class: "sequencia" },
      h("div", { class: "msg-ref" },
        h("span", { class: "rotulo", style: "margin:0" }, "Mensagem 1 (já escrita lá em cima)"),
        h("div", { class: "texto", id: "ref-msg1-texto" })));

    st.passos.forEach((p, i) => box.append(cartaoPasso(p, i)));
    box.append(h("div", {}, h("button", {
      class: "btn", type: "button",
      onclick: () => {
        st.passos.push(novoPasso(st));
        reestruturou();
        raiz.querySelector(`#msg-${st.passos[st.passos.length - 1].id}`)?.focus();
      },
    }, icone("mais"), "Adicionar mensagem")));

    queueMicrotask(atualizarReferencia);
    return box;
  }

  function cartaoPasso(p, i) {
    const n = i + 2;
    return h("div", { class: "msg-card" },
      h("div", { class: "msg-card-topo" },
        h("h3", {}, `Mensagem ${n}`),
        h("button", {
          class: "btn btn-icone btn-remover", title: "Apagar mensagem", "aria-label": `Apagar mensagem ${n}`,
          onclick: () => apagarPasso(p),
        }, icone("lixo"))),
      h("textarea", {
        class: "campo", id: `msg-${p.id}`, value: p.message, placeholder: "O que essa mensagem diz",
        "aria-label": `Texto da mensagem ${n}`, style: "min-height:70px",
        oninput: (e) => { p.message = e.target.value; renderPrevia(); },
      }),
      p.botoes.map((b, j) => cartaoBotao(p, b, j, i)),
      p.botoes.length < MAX_BOTOES
        ? h("button", {
          class: "btn btn-pequeno", style: "margin-top:10px", type: "button",
          onclick: () => {
            const b = novoBotao();
            b.next = st.passos[i + 1]?.id ?? null; // sugere a mensagem seguinte
            p.botoes.push(b);
            reestruturou();
          },
        }, icone("mais"), "botão")
        : h("p", { class: "ajuda" }, "Máximo de 3 botões por mensagem (limite do Instagram)."));
  }

  function apagarPasso(p) {
    if ((p.message.trim() || p.botoes.length) && !confirm("Apagar esta mensagem e os botões dela?")) return;
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
        h("select", { class: "campo", "aria-label": "O que o botão faz", onchange: (e) => mudarTipo(e.target.value) },
          h("option", { value: "proxima", selected: b.tipo === "proxima" }, "ir pra outra mensagem"),
          h("option", { value: "link", selected: b.tipo === "link" }, "abrir um link"),
          h("option", { value: "fim", selected: b.tipo === "fim" }, "encerrar")),
        h("button", {
          class: "btn btn-icone btn-remover", title: "Remover botão", "aria-label": `Remover botão ${j + 1}`,
          onclick: () => { p.botoes.splice(j, 1); reestruturou(); },
        }, icone("x"))));

    if (b.tipo === "proxima") {
      const destinos = st.passos.filter((q) => q.id !== p.id);
      card.append(h("select", {
        class: "campo", style: "margin-top:8px", "aria-label": "Pra qual mensagem o botão leva",
        onchange: (e) => { b.next = e.target.value ? Number(e.target.value) : null; renderPrevia(); },
      },
      h("option", { value: "" }, destinos.length ? "Escolha a mensagem..." : "Adicione outra mensagem pra ligar aqui"),
      destinos.map((q) => h("option", { value: String(q.id), selected: q.id === b.next }, `Mensagem ${st.passos.indexOf(q) + 2}`))));
    } else if (b.tipo === "link") {
      card.append(h("div", { style: "margin-top:8px" },
        campoLink(idLink, () => b.url, (v) => { b.url = v; }, "O link vai aqui, nunca no nome do botão", "https://...")));
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
      class: "btn btn-pequeno", type: "button", style: "margin-top:8px",
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
      h("p", { class: "ajuda" }, st.botaoOn && st.modo === "conversa"
        ? "PDF, áudio, foto ou vídeo da sua biblioteca. Vai junto com a Mensagem 2."
        : "PDF, áudio, foto ou vídeo da sua biblioteca"),
      enviar, input);
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

  function anexosPrevia() {
    return st.assetIds.map((id) => {
      const a = (arquivos || []).find((x) => x.id === id);
      return h("div", { class: "anexo-prev" }, icone(ICONE_TIPO[a?.tipo] || "arquivo"), a?.nome || "Arquivo");
    });
  }

  // O que faz a pessoa chegar nesta mensagem? (pra mostrar o toque dela)
  function chegada(p, i) {
    if (i === 0) return st.botaoTitulo.trim() || "Botão";
    for (const q of st.passos) {
      const b = q.botoes.find((x) => x.tipo === "proxima" && x.next === p.id && x.titulo.trim());
      if (b) return b.titulo.trim().slice(0, MAX_TITULO);
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
    if (!conversa) corpo.append(...anexosPrevia());

    // Mensagem 2 em diante
    if (conversa) {
      st.passos.forEach((p, i) => {
        const eu = chegada(p, i);
        if (eu) corpo.append(h("div", { class: "bolha-eu" }, eu));
        corpo.append(bolha(p.message.trim() || `Mensagem ${i + 2}`, p.botoes, !p.message.trim()));
        if (i === 0) corpo.append(...anexosPrevia());
        if (!p.botoes.some(botaoVisivel)) corpo.append(h("div", { class: "nota-prev" }, "fim da conversa"));
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
