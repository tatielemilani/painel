// =====================================================================
// ig-insights: métricas pro dashboard (seguidores, novos seguidores por
// dia e alcance por dia, últimos 15 dias).
// Chamada pelo painel com o login (deixe o "Verify JWT" LIGADO).
// =====================================================================
import { cors, db, getToken, graph, json } from "../_shared/comum.ts";

const DIAS = 15;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  if (!(await getToken())) return json({ conectado: false, motivo: "Token do Instagram não configurado" });

  const perfil = await graph("/me", { params: { fields: "user_id,username,followers_count,media_count" } });
  if (!perfil.ok) return json({ conectado: false, motivo: perfil.error?.message });

  const ate = Math.floor(Date.now() / 1000);
  const desde = ate - DIAS * 24 * 3600;

  // Uma série diária de uma métrica. Se a API recusar, devolve lista vazia.
  async function serie(metrica: string) {
    const r = await graph("/me/insights", {
      params: { metric: metrica, period: "day", since: String(desde), until: String(ate) },
    });
    if (!r.ok) {
      console.warn(`insights ${metrica}:`, r.error?.message);
      return [];
    }
    const valores = r.data?.data?.[0]?.values ?? [];
    return valores.map((v: any) => ({ data: String(v.end_time ?? "").slice(0, 10), valor: Number(v.value ?? 0) }));
  }

  const [novos, alcance] = await Promise.all([serie("follower_count"), serie("reach")]);
  const { data: token } = await db.from("ig_token_status").select("expires_at,last_ok").eq("id", "main").maybeSingle();

  return json({
    conectado: true,
    conta: {
      username: perfil.data.username,
      seguidores: perfil.data.followers_count ?? 0,
      posts: perfil.data.media_count ?? 0,
    },
    novos_seguidores: novos,
    alcance,
    token,
  });
});
