// =====================================================================
// ig-token-refresh: renova o token long-lived do Instagram (~60 dias).
// Roda ~1x por semana (pg_cron). Protegido pelo SCHED_SECRET.
// Publicar com --no-verify-jwt (quem protege é o SCHED_SECRET).
// =====================================================================
import { chaveAgendadorOk, db, getToken, json } from "../_shared/comum.ts";

Deno.serve(async (req) => {
  if (!chaveAgendadorOk(req)) return json({ erro: "não autorizado" }, 401);

  const token = await getToken();
  if (!token) return json({ erro: "IG_ACCESS_TOKEN não configurado" }, 400);

  // Atenção: este endpoint NÃO leva a versão (v21.0) no caminho.
  const url = new URL("https://graph.instagram.com/refresh_access_token");
  url.searchParams.set("grant_type", "ig_refresh_token");
  url.searchParams.set("access_token", token);

  const agora = new Date().toISOString();
  try {
    const resp = await fetch(url);
    const data = await resp.json();
    if (!resp.ok || !data.access_token) throw new Error(data?.error?.message ?? `HTTP ${resp.status}`);

    const expira = new Date(Date.now() + Number(data.expires_in ?? 0) * 1000).toISOString();
    // O token novo fica no cofre (ig_token_store); as funções passam a usar ele.
    await db.from("ig_token_store").upsert({ id: "main", access_token: data.access_token, updated_at: agora });
    await db.from("ig_token_status").upsert({
      id: "main", expires_at: expira, last_ok: true, last_error: null, last_refreshed_at: agora, updated_at: agora,
    });
    return json({ ok: true, expira_em: expira });
  } catch (err) {
    const msg = (err as Error).message;
    await db.from("ig_token_status").upsert({ id: "main", last_ok: false, last_error: msg, updated_at: agora });
    return json({ ok: false, erro: msg }, 500);
  }
});
