// =====================================================================
// editor.js: o editor de automação (o "ManyChat").
//   Bloco 1: o gatilho (palavras, posts, resposta no comentário)
//   Bloco 2: a resposta, em ordem: Mensagem 1 + botão, mensagens extras
//            (opcionais), e no final o link de destino e o arquivo.
//   Ao lado, a prévia ao vivo num celular.
//
// Tudo vira o campo "flow" da automação. A Mensagem 1 é sempre o
// PRIMEIRO passo. O botão de cada mensagem leva pra seguinte; o botão
// da última abre o link de destino (se houver).
// =====================================================================

const EMOJIS = ["🫶", "👀", "😍", "🥰", "😂", "😮", "🔥", "✨", "💌", "👉", "🙌", "💕"];
const MAX_TITULO = 20; // o Instagram corta o título do botão em 20

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
    message: "", botaoTitulo: "",  // Mensagem 1
    passos: [],                    // Mensagem 2 em diante: { id, message, botaoTitulo }
    link: "", assetIds: [],
    proxId: 2,
  };
}
const novoPasso = (st) => ({ id: st.proxId++, message: "", botaoTitulo: "" });

// Todas as mensagens em ordem. A Mensagem 1 lê e grava direto no estado.
function mensagens(st) {
  const msg1 = {
    id: 1,
    get message() { return st.message; }, set message(v) { st.message = v; },
    get botaoTitulo() { return st.botaoTitulo; }, set botaoTitulo(v) { st.botaoTitulo = v; },
  };
  return [msg1, ...st.passos];
}

// Linha do banco -> estado do editor.
// Segue a conversa a partir da Mensagem 1 pelos botões que avançam
// (assim também abre automações salvas no formato antigo).
function doBanco(a) {
  const st = estadoNovo();
  const steps = a.flow?.steps || [];
  const temNext = (b) => b.next !== null && b.next !== undefined && b.next !== "";
  const avanca = (s) => (s.buttons || []).find(temNext);

  const linear = [];
  const vistos = new Set();
  let s = steps[0];
  while (s && !vistos.has(String(s.id))) {
    vistos.add(String(s.id));
    linear.push(s);
    const b = avanca(s);
    s = b ? steps.find((q) => String(q.id) === String(b.next)) : null;
  }
  const ultimo = linear[linear.length - 1] || {};
  const botaoLink = (ultimo.buttons || []).find((b) => b.url);
  const tituloDe = (passo, i) => (i < linear.length - 1 ? avanca(passo)?.title : botaoLink?.title) || "";

  Object.assign(st, {
    id: a.id, nome: a.nome || "", active: a.active !== false,
    keywords: (a.keyword || "").split(",").map((k) => k.trim()).filter(Boolean),
    matchAny: !!a.match_any,
    mediaIds: [...(a.media_ids || [])],
    publicReply: a.public_reply || "",
    variants: [...(a.public_reply_variants || [])],
    message: linear[0]?.message || "",
    botaoTitulo: linear[0] ? tituloDe(linear[0], 0) : "",
    link: botaoLink?.url || "",
    assetIds: [...(a.asset_ids || [])],
  });
  st.passos = linear.slice(1).map((p, i) => ({ id: Number(p.id), message: p.message || "", botaoTitulo: tituloDe(p, i + 1) }));
  st.proxId = Math.max(1, ...st.passos.map((p) => p.id || 0)) + 1;
  return st;
}

// Estado do editor -> linha do banco (com o "flow")
function paraBanco(st) {
  const lista = mensagens(st);
  const link = arrumarLink(st.link);
  const steps = lista.map((m, i) => {
    const ultimo = i === lista.length - 1;
    const titulo = m.botaoTitulo.trim();
    let buttons = [];
    if (!ultimo) buttons = [{ title: titulo, next: lista[i + 1].id }];   // leva pra próxima mensagem
    else if (link) buttons = [{ title: titulo || "Acessar", url: link }]; // a última abre o link
    return { id: m.id, message: m.message.trim(), buttons };
  });
  // O arquivo vai junto com a última mensagem.
  if (st.assetIds.length) steps[steps.length - 1].assets = [...st.assetIds];

  const linha = {
    nome: st.nome.trim(),
    keyword: st.keywords.join(", "),
    match_any: st.matchAny,
    active: st.active,
    media_ids: st.mediaIds,
    public_reply: st.publicReply.trim(),
    public_reply_variants: st.variants.map((v) => v.trim()).filter(Boolean),
    flow: { steps, editor: { versao: 2 } },
    asset_ids: st.assetIds,
  };
  if (st.id) linha.id = st.id;
  return linha;
}

// Validação amigável antes de salvar. Devolve a lista do que falta.
function validar(st) {
  const erros = [];
  if (!st.nome.trim()) erros.push("Dê um nome pra automação (lá em cima).");
  if (!st.matchAny && !st.keywords.length) erros.push('Adicione pelo menos uma palavra que ativa, ou ligue "Qualquer palavra ativa".');
  const lista = mensagens(st);
  lista.forEach((m, i) => {
    const n = `Mensagem ${i + 1}`;
    const ultimo = i === lista.length - 1;
    const t = m.botaoTitulo.trim();
    if (!m.message.trim()) erros.push(i === 0 ? 'Escreva "Sua mensagem" (a Mensagem 1).' : `${n}: escreva o texto.`);
    if (!ultimo && !t) erros.push(`${n}: dê um nome pro botão (é ele que leva pra Mensagem ${i + 2}).`);
    if (t.length > MAX_TITULO) erros.push(`${n}: o nome do botão passou de ${MAX_TITULO} letras.`);
    if (t && pareceLink(t)) erros.push(`${n}: o nome do botão parece um link. O link vai em "Link de destino", no final.`);
  });
  if (st.link.trim() && !linkValido(st.link)) erros.push("O link de destino parece incompleto. Cole o link inteiro, começando com https://");
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

  // Redesenha o formulário (em mudanças de estrutura: adicionar ou apagar mensagem).
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
    return h("textarea", {
      class: "campo campo-link", id, value: get(), rows: "2", placeholder: "https://...",
      spellcheck: "false",
      oninput: (e) => { set(e.target.value); ajustarAltura(e.target); renderPrevia(); },
    });
  }

  // Nome do botão: limite de 20, contador e detector de link colado no lugar errado.
  // Na última mensagem, um link colado aqui vai sozinho pro "Link de destino".
  function campoTitulo(id, get, set, ehUltimo, moverLink, placeholder) {
    const contador = h("div", { class: "contador" });
    const dica = h("div", { class: "dica-link", hidden: true });
    const inp = h("input", {
      class: "campo", id, value: get(), placeholder,
      oninput: (e) => { set(e.target.value); atualizar(false); renderPrevia(); },
    });
    function atualizar(inicial) {
      const v = get();
      const n = v.trim().length;
      contador.textContent = `${n}/${MAX_TITULO}`;
      contador.classList.toggle("estourou", n > MAX_TITULO);
      inp.classList.toggle("invalido", n > MAX_TITULO);
      if (pareceLink(v)) {
        if (ehUltimo() && !inicial) { moverLink(v.trim()); return; }
        dica.hidden = false;
        dica.textContent = 'Isso parece um link. O link não vai no nome do botão: ele vai em "Link de destino", no final.';
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
  // BLOCO 2: a resposta (em ordem, de cima pra baixo)
  // -------------------------------------------------------------------
  function blocoResposta() {
    const lista = mensagens(st);
    const sec = h("section", { class: "cartao" },
      tituloBloco(2, "A resposta", "O que a pessoa recebe no direct, na ordem."));

    lista.forEach((m, i) => sec.append(cartaoMensagem(m, i, lista.length)));

    sec.append(
      h("div", { class: "grupo" },
        h("button", {
          class: "btn", type: "button",
          onclick: () => {
            st.passos.push(novoPasso(st));
            reestruturou();
            raiz.querySelector(`#msg-${st.passos[st.passos.length - 1].id}`)?.focus();
          },
        }, icone("mais"), `Adicionar mensagem ${lista.length + 1}`),
        h("p", { class: "ajuda" }, "Opcional. Quando você adiciona, o botão da mensagem anterior passa a levar pra ela.")),
      h("div", { class: "separador" }),
      h("div", { class: "grupo" },
        h("label", { class: "rotulo", for: "link1" }, "Link de destino (opcional)"),
        campoLink("link1", () => st.link, (v) => { st.link = v; atualizarAjudaUltimo(); }),
        h("p", { class: "ajuda" }, "Cole o link inteiro aqui, por maior que seja. Ele abre no botão da última mensagem. A pessoa vê só o nome do botão: o link fica invisível.")),
      h("div", { class: "grupo", style: "margin-bottom:0" },
        h("span", { class: "rotulo" }, "Anexar um arquivo (opcional)"),
        h("div", { id: "lugar-arquivos" }, seletorArquivos()),
        h("p", { class: "ajuda" }, lista.length > 1
          ? "PDF, áudio, foto ou vídeo. Vai junto com a última mensagem."
          : "PDF, áudio, foto ou vídeo. Dica: antes da pessoa responder, o Instagram só deixa mandar uma mensagem. Pra garantir que o arquivo chegue, adicione uma Mensagem 2.")));
    return sec;
  }

  // Texto de ajuda do botão, conforme a posição da mensagem
  function ajudaBotao(i, total) {
    if (i < total - 1) return `Quando ela toca, recebe a Mensagem ${i + 2}.`;
    return st.link.trim()
      ? "Quando ela toca, abre o link de destino (lá no final)."
      : "Esta é a última mensagem: o botão só aparece se você colocar um link de destino lá no final.";
  }
  function atualizarAjudaUltimo() {
    const total = mensagens(st).length;
    const el = raiz.querySelector("#ajuda-botao-ultimo");
    if (el) el.textContent = ajudaBotao(total - 1, total);
  }

  function cartaoMensagem(m, i, total) {
    const n = i + 1;
    const ultimo = i === total - 1;
    const idTexto = i === 0 ? "msg1" : `msg-${m.id}`;
    const idBotao = i === 0 ? "titulo1" : `bt-${m.id}`;

    return h("div", { class: "msg-card", style: "margin-bottom:12px" },
      h("div", { class: "msg-card-topo" },
        h("h3", {},
          h("span", { class: "bloco-num", style: "width:22px;height:22px;font-size:12px" }, String(n)),
          i === 0 ? "Sua mensagem" : `Mensagem ${n}`),
        i === 0 ? null : h("button", {
          class: "btn btn-fantasma btn-icone btn-perigo", title: "Apagar mensagem", "aria-label": `Apagar mensagem ${n}`,
          onclick: () => apagarPasso(m),
        }, icone("lixo"))),
      h("label", { class: "rotulo", for: idTexto, style: "position:absolute;left:-9999px" }, `Texto da mensagem ${n}`),
      areaTexto(idTexto, m.message, (v) => { m.message = v; renderPrevia(); },
        i === 0 ? "Ex: Oi! Que bom que você quer o material 🥰" : "Escreva a mensagem..."),
      h("div", { style: "margin-top:12px" },
        h("label", { class: "rotulo", for: idBotao }, "Texto do botão"),
        campoTitulo(idBotao, () => m.botaoTitulo, (v) => { m.botaoTitulo = v; }, () => i === mensagens(st).length - 1,
          (url) => {
            if (!st.link.trim()) st.link = url;
            m.botaoTitulo = "Acessar";
            toast('Movi o link pro campo "Link de destino", no final, e dei o nome "Acessar" pro botão.');
            reestruturou();
            raiz.querySelector("#link1")?.focus();
          },
          ultimo ? "Ex: Acessar" : "Ex: Quero!"),
        h("p", { class: "ajuda", id: ultimo ? "ajuda-botao-ultimo" : null }, ajudaBotao(i, total))));
  }

  function apagarPasso(p) {
    if (p.message.trim() && !confirm("Apagar esta mensagem?")) return;
    st.passos = st.passos.filter((q) => q !== p);
    reestruturou();
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
  function bolha(texto, botoes, vazio) {
    const grupo = h("div", { class: `bolha-grupo${botoes.length ? " com-botoes" : ""}` },
      h("div", { class: "bolha", style: vazio ? "color:#9CA3AF" : null }, texto));
    if (botoes.length) {
      // Botão ANEXADO ao balão (não uma pílula solta embaixo)
      grupo.append(h("div", { class: "botoes-anexados" }, botoes.map((b) => h("div", { class: "botao-anexado" },
        b.link ? icone("link") : null, b.titulo.slice(0, MAX_TITULO)))));
    }
    return grupo;
  }

  function renderPrevia() {
    if (!st || !previaEl) return;
    const corpo = h("div", { class: "cel-corpo" });

    // O comentário que dispara + a resposta pública
    const respostas = [st.publicReply, ...st.variants].map((s) => s.trim()).filter(Boolean);
    corpo.append(
      h("div", { class: "cel-sistema" }, "No post"),
      h("div", { class: "comentario-prev" },
        h("strong", {}, "seguidor "), st.matchAny ? "adorei!" : (st.keywords[0] || "quero"),
        respostas.length ? h("div", { class: "resp" }, h("strong", {}, "sua_conta "), respostas[0]) : null),
      h("div", { class: "cel-sistema" }, "No direct"));

    const lista = mensagens(st);
    const link = st.link.trim();
    lista.forEach((m, i) => {
      const ultimo = i === lista.length - 1;
      // O toque da pessoa no botão da mensagem anterior
      if (i > 0) corpo.append(h("div", { class: "bolha-eu" }, lista[i - 1].botaoTitulo.trim() || "Continuar"));
      const titulo = m.botaoTitulo.trim();
      const botoes = !ultimo ? [{ titulo: titulo || "Continuar", link: false }]
        : link ? [{ titulo: titulo || "Acessar", link: true }] : [];
      const vazio = !m.message.trim();
      corpo.append(bolha(vazio ? (i === 0 ? "Sua mensagem aparece aqui." : `Mensagem ${i + 1}`) : m.message.trim(), botoes, vazio));
    });
    // Arquivos chegam depois da última mensagem
    corpo.append(...st.assetIds.map((id) => {
      const a = (arquivos || []).find((x) => x.id === id);
      return h("div", { class: "anexo-prev" }, icone(ICONE_TIPO[a?.tipo] || "arquivo"), a?.nome || "Arquivo");
    }));

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
