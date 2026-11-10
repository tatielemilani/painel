// =====================================================================
// drive-videos: vídeos do Google Drive pro portfólio.
//   GET ?site=1                -> (público) os vídeos marcados com "Sim", pro site mostrar
//   GET com login do painel    -> lista os vídeos da pasta do Drive (link salvo no painel)
// A pasta precisa estar compartilhada como "Qualquer pessoa com o link".
// Não usa chave do Google: lê a página pública da pasta.
// Deixe o "Verify JWT" DESLIGADO: o site chama sem login; a função confere
// sozinha o login quando é o painel pedindo a lista.
// =====================================================================
import { cors, db, json } from "../_shared/comum.ts";

// Aceita o link inteiro da pasta ou só o id
function idDaPasta(texto: string) {
  const t = (texto || "").trim();
  const m = t.match(/folders\/([\w-]{10,})/) || t.match(/[?&]id=([\w-]{10,})/) || t.match(/^([\w-]{10,})$/);
  return m ? m[1] : null;
}

const desfazer = (s: string) => s
  .replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));

async function videosDaPasta(pasta: string) {
  const r = await fetch(`https://drive.google.com/embeddedfolderview?id=${pasta}`, {
    headers: { "User-Agent": "Mozilla/5.0 (painel-tatiele)", "Accept-Language": "pt-BR" },
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) throw new Error(r.status === 404 ? "Não achei a pasta. Confira o link." : `O Drive respondeu ${r.status}`);
  const html = await r.text();
  const videos: { id: string; nome: string }[] = [];
  // Cada arquivo é um bloco "flip-entry" com o id, o tipo (ícone) e o nome
  for (const bloco of html.split('<div class="flip-entry"').slice(1)) {
    const id = bloco.match(/id="entry-([\w-]+)"/)?.[1];
    const nome = bloco.match(/flip-entry-title">([^<]*)</)?.[1];
    const ehVideo = /\/type\/video\//.test(bloco);
    if (id && nome && ehVideo) videos.push({ id, nome: desfazer(nome).trim() });
  }
  if (!videos.length && /ServiceLogin|accounts\.google\.com/.test(html)) {
    throw new Error("A pasta não está aberta pra quem tem o link. No Drive: Compartilhar > Qualquer pessoa com o link.");
  }
  return videos;
}

// O Google não entrega o vídeo quando o navegador pede de outro site (403).
// Pedindo daqui (servidor), ele entrega: então o painel toca por aqui, em pedaços (Range).
// Só passa vídeo que está na pasta escolhida no painel, pra não virar porta aberta.
let pastaCache: { em: number; ids: Set<string> } | null = null;
async function idsDaPasta() {
  if (pastaCache && Date.now() - pastaCache.em < 10 * 60 * 1000) return pastaCache.ids;
  const { data: cfg } = await db.from("config_painel").select("valor").eq("chave", "drive_pasta_portfolio").maybeSingle();
  const pasta = idDaPasta(cfg?.valor || "");
  const ids = new Set(pasta ? (await videosDaPasta(pasta)).map((v) => v.id) : []);
  pastaCache = { em: Date.now(), ids };
  return ids;
}
async function tocarVideo(req: Request, id: string) {
  if (!/^[\w-]{10,}$/.test(id) || !(await idsDaPasta()).has(id)) return new Response("Vídeo não encontrado", { status: 404, headers: cors });
  const cabecalhos: Record<string, string> = { "User-Agent": "Mozilla/5.0 (painel-tatiele)" };
  const faixa = req.headers.get("range");
  if (faixa) cabecalhos.Range = faixa;
  const r = await fetch(`https://drive.usercontent.google.com/download?id=${id}&export=download`, { headers: cabecalhos });
  const tipo = r.headers.get("content-type") || "";
  if (!r.ok || !tipo.startsWith("video/")) {
    await r.body?.cancel();
    return new Response("O Drive não entregou esse vídeo", { status: 502, headers: cors });
  }
  const saida = new Headers({ ...cors, "Content-Type": tipo, "Accept-Ranges": "bytes", "Cache-Control": "private, max-age=3600" });
  for (const h of ["content-length", "content-range"]) { const v = r.headers.get(h); if (v) saida.set(h, v); }
  return new Response(r.body, { status: r.status, headers: saida });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = new URL(req.url);

  // Painel: toca o vídeo (o navegador pede em pedaços)
  const video = url.searchParams.get("video");
  if (video) return await tocarVideo(req, video);

  // Site: só os escolhidos (marca, nicho e o id do Drive)
  if (url.searchParams.get("site")) {
    const { data, error } = await db.from("portfolio_drive").select("drive_id, marca, nicho").eq("decisao", "sim").order("created_at");
    if (error) return json({ videos: [] });
    return new Response(JSON.stringify({ videos: data || [] }), {
      headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "public, max-age=60" },
    });
  }

  // Painel: precisa estar logada
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: quem } = await db.auth.getUser(token);
  if (!quem?.user) return json({ erro: "Faça login no painel." }, 401);

  const { data: cfg } = await db.from("config_painel").select("valor").eq("chave", "drive_pasta_portfolio").maybeSingle();
  const pasta = idDaPasta(url.searchParams.get("pasta") || cfg?.valor || "");
  if (!pasta) return json({ semPasta: true, videos: [] });
  try {
    return json({ pasta, videos: await videosDaPasta(pasta) });
  } catch (e) {
    console.error("drive-videos:", (e as Error).message);
    return json({ pasta, erro: (e as Error).message, videos: [] });
  }
});
