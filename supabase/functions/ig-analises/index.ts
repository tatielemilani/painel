// =====================================================================
// ig-analises: analisa os posts e os comentários da conta e guarda o
// resultado (aba Análises: "Melhores posts" e "Quem mais comenta").
// Só roda quando você clica em "Atualizar agora" (faz muitas consultas
// ao Instagram, então não roda sozinha).
// Chamada pelo painel com o login (deixe o "Verify JWT" LIGADO).
// =====================================================================
import { cors, db, graph, json } from "../_shared/comum.ts";

const MAX_POSTS = 300;           // posts mais recentes analisados
const MAX_PAGINAS_COMENTARIOS = 40; // por post (50 comentários por página)
const PARALELO = 6;              // consultas ao mesmo tempo
const TOP_COMENTARISTAS = 100;   // guardamos só os 100 que mais comentam (só o @ e o número)

// Roda uma função em lotes, pra não disparar centenas de consultas de uma vez.
async function emLotes<T, R>(itens: T[], fn: (item: T) => Promise<R>) {
  const res: R[] = [];
  for (let i = 0; i < itens.length; i += PARALELO) res.push(...await Promise.all(itens.slice(i, i + PARALELO).map(fn)));
  return res;
}

// Busca todas as páginas de uma lista do Instagram (até maxPaginas).
async function todasPaginas(caminho: string, params: Record<string, string>, maxPaginas: number) {
  const itens: any[] = [];
  let r = await graph(caminho, { params });
  for (let pagina = 1; r.ok; pagina++) {
    itens.push(...(r.data?.data ?? []));
    const proxima = r.data?.paging?.next;
    if (!proxima || pagina >= maxPaginas) break;
    r = await graph(proxima);
  }
  return { itens, erro: r.ok ? null : r.error?.message ?? null };
}

// Métricas de cada post. Os nomes mudam conforme o tipo de post e a versão
// da API, então tenta algumas combinações e lembra a que funcionou por tipo.
const TENTATIVAS = ["views,saved,reach", "plays,saved,reach", "impressions,saved,reach", "saved,reach", "saved"];
const funcionouPorTipo = new Map<string, string>();
async function metricasDoPost(p: any) {
  const tipo = p.media_product_type || p.media_type || "?";
  const ordem = funcionouPorTipo.has(tipo) ? [funcionouPorTipo.get(tipo)!, ...TENTATIVAS] : TENTATIVAS;
  for (const metric of ordem) {
    const r = await graph(`/${p.id}/insights`, { params: { metric } });
    if (r.ok) {
      funcionouPorTipo.set(tipo, metric);
      const v: Record<string, number> = {};
      for (const d of r.data?.data ?? []) v[d.name] = Number(d.values?.[0]?.value ?? d.total_value?.value ?? 0);
      return v;
    }
    if (r.hard) break; // limite do Instagram: não insiste
  }
  return {};
}

// Quem comentou (e respondeu) num post: só os @.
async function comentaristasDoPost(p: any) {
  const { itens } = await todasPaginas(`/${p.id}/comments`,
    { fields: "username,replies.limit(50){username}", limit: "50" }, MAX_PAGINAS_COMENTARIOS);
  const nomes: string[] = [];
  for (const c of itens) {
    if (c.username) nomes.push(c.username);
    for (const r of c.replies?.data ?? []) if (r.username) nomes.push(r.username);
  }
  return nomes;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ erro: "use POST" }, 405);

  const agora = new Date().toISOString();
  await db.from("ig_analise").update({ status: "rodando", erro: null }).eq("id", "main");

  try {
    const perfil = await graph("/me", { params: { fields: "username" } });
    if (!perfil.ok) throw new Error(perfil.error?.message ?? "Instagram não conectado");
    const minhaConta = String(perfil.data.username ?? "").toLowerCase();

    // 1) Posts e as métricas de cada um
    const midias = await todasPaginas("/me/media", {
      fields: "id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count",
      limit: "50",
    }, Math.ceil(MAX_POSTS / 50));
    if (midias.erro && !midias.itens.length) throw new Error(midias.erro);
    const posts = midias.itens.slice(0, MAX_POSTS);
    const metricas = await emLotes(posts, metricasDoPost);

    const linhas = posts.map((p, i) => ({
      media_id: String(p.id),
      legenda: String(p.caption ?? "").slice(0, 300),
      tipo: p.media_product_type || p.media_type || null,
      miniatura: p.thumbnail_url ?? p.media_url ?? null,
      link: p.permalink ?? null,
      publicado_em: p.timestamp ?? null,
      curtidas: Number(p.like_count ?? 0),
      comentarios: Number(p.comments_count ?? 0),
      salvos: metricas[i].saved ?? null,
      visualizacoes: metricas[i].views ?? metricas[i].plays ?? metricas[i].impressions ?? null,
      alcance: metricas[i].reach ?? null,
      atualizado_em: agora,
    }));
    for (let i = 0; i < linhas.length; i += 500) {
      const { error } = await db.from("ig_analise_posts").upsert(linhas.slice(i, i + 500));
      if (error) throw new Error(`posts: ${error.message}`);
    }
    // Posts apagados no Instagram saem da análise.
    await db.from("ig_analise_posts").delete().lt("atualizado_em", agora);

    // 2) Quem mais comenta (comentários + respostas, em todos os posts analisados)
    const nomesPorPost = await emLotes(posts.filter((p) => Number(p.comments_count ?? 0) > 0), comentaristasDoPost);
    const contagem = new Map<string, number>();
    let totalComentarios = 0;
    for (const nomes of nomesPorPost) {
      for (const n of nomes) {
        totalComentarios++;
        if (n.toLowerCase() === minhaConta) continue; // você mesma não entra no ranking
        contagem.set(n, (contagem.get(n) ?? 0) + 1);
      }
    }
    const top = [...contagem].sort((a, b) => b[1] - a[1]).slice(0, TOP_COMENTARISTAS)
      .map(([username, comentarios]) => ({ username, comentarios, atualizado_em: agora }));
    if (top.length) {
      const { error } = await db.from("ig_analise_comentaristas").upsert(top);
      if (error) throw new Error(`comentaristas: ${error.message}`);
    }
    // Quem saiu do top 100 é apagado (guardamos o mínimo necessário).
    await db.from("ig_analise_comentaristas").delete().lt("atualizado_em", agora);

    await db.from("ig_analise").update({
      status: "ok", erro: null, atualizado_em: agora,
      posts_analisados: posts.length, comentarios_analisados: totalComentarios,
    }).eq("id", "main");
    return json({ ok: true, posts: posts.length, comentarios: totalComentarios });
  } catch (err) {
    const msg = (err as Error).message;
    console.error("ig-analises:", msg);
    await db.from("ig_analise").update({ status: "erro", erro: msg }).eq("id", "main");
    return json({ ok: false, erro: msg }, 500);
  }
});
