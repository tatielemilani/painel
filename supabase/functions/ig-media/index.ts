// =====================================================================
// ig-media: lista os posts da conta (com miniatura), pra alimentar o
// seletor "Em quais posts" do editor de automação.
// Chamada pelo painel com o login (deixe o "Verify JWT" LIGADO).
// =====================================================================
import { cors, graph, json } from "../_shared/comum.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const r = await graph("/me/media", {
    params: { fields: "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp", limit: "50" },
  });
  if (!r.ok) return json({ conectado: false, motivo: r.error?.message, posts: [] });

  const posts = (r.data?.data ?? []).map((m: any) => ({
    id: String(m.id),
    legenda: (m.caption ?? "").slice(0, 140),
    tipo: m.media_type,
    // Vídeo/Reels: usa a capa (thumbnail). Foto: a própria imagem.
    miniatura: m.thumbnail_url ?? m.media_url ?? null,
    link: m.permalink,
    data: m.timestamp,
  }));
  return json({ conectado: true, posts });
});
