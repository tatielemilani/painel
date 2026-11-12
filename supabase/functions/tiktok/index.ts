// =====================================================================
// tiktok: usada pelo painel (aba TikTok) e pelo robô diário.
//   POST {acao:"conectar"}   devolve o link pra autorizar a sua conta no TikTok
//   POST {acao:"atualizar"}  busca perfil e vídeos agora
//   Robô (x-sched-key): atualiza sozinho uma vez por dia
// Verify JWT DESLIGADO: a própria função confere o login ou a chave do robô.
// =====================================================================
import { chaveAgendadorOk, cors, db, env, json } from "../_shared/comum.ts";
import { sincronizarTikTok, TT_ESCOPOS, TT_REDIRECT } from "../_shared/tiktok.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ erro: "use POST" }, 405);

  // Robô agendado: só atualiza
  if (chaveAgendadorOk(req)) return json(await sincronizarTikTok());

  // Painel: precisa estar logada
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: quem } = await db.auth.getUser(token);
  if (!quem?.user) return json({ erro: "faça login" }, 401);

  const corpo = await req.json().catch(() => ({}));
  if (corpo.acao === "conectar") {
    if (!env("TIKTOK_CLIENT_KEY") || !env("TIKTOK_CLIENT_SECRET")) {
      return json({ ok: false, erro: "Faltam os segredos TIKTOK_CLIENT_KEY e TIKTOK_CLIENT_SECRET no Supabase." });
    }
    // "estado": código de uso único que prova que o pedido saiu do seu painel
    const estado = crypto.randomUUID().replaceAll("-", "");
    await db.from("tiktok_oauth_estado").delete().lt("criado_em", new Date(Date.now() - 3600_000).toISOString());
    const { error } = await db.from("tiktok_oauth_estado").insert({ estado });
    if (error) return json({ ok: false, erro: error.message });
    const url = new URL("https://www.tiktok.com/v2/auth/authorize/");
    url.searchParams.set("client_key", env("TIKTOK_CLIENT_KEY"));
    url.searchParams.set("scope", TT_ESCOPOS);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("redirect_uri", TT_REDIRECT);
    url.searchParams.set("state", estado);
    return json({ ok: true, url: url.toString() });
  }
  if (corpo.acao === "atualizar") return json(await sincronizarTikTok());
  return json({ erro: "ação desconhecida" }, 400);
});
