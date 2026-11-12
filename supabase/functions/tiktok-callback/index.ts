// =====================================================================
// tiktok-callback: o TikTok devolve a sua autorização pra cá (Redirect URI
// cadastrada no app do TikTok). Troca o código pelo token, já busca os
// números e volta pro painel na aba TikTok.
// Verify JWT DESLIGADO (quem chama é o TikTok, não o painel).
// =====================================================================
import { db } from "../_shared/comum.ts";
import { PAINEL_URL, pedirToken, sincronizarTikTok, TT_REDIRECT } from "../_shared/tiktok.ts";

const voltar = (resultado: string, erro?: string) => {
  const destino = new URL(PAINEL_URL);
  destino.searchParams.set("tiktok", resultado);
  if (erro) destino.searchParams.set("erro", erro.slice(0, 200));
  destino.hash = "tiktok";
  return new Response(null, { status: 302, headers: { Location: destino.toString() } });
};

Deno.serve(async (req) => {
  const q = new URL(req.url).searchParams;
  if (q.get("error")) return voltar("erro", q.get("error_description") || q.get("error") || "Autorização negada");

  const code = q.get("code"), estado = q.get("state");
  if (!code || !estado) return voltar("erro", "O TikTok não mandou o código de autorização.");

  // O "estado" tem que ter saído do painel há menos de 1 hora (e só vale uma vez)
  const { data: achou } = await db.from("tiktok_oauth_estado").delete().eq("estado", estado)
    .gte("criado_em", new Date(Date.now() - 3600_000).toISOString()).select("estado");
  if (!achou?.length) return voltar("erro", "Link de conexão vencido. Clique em Conectar TikTok de novo.");

  try {
    await pedirToken({ grant_type: "authorization_code", code, redirect_uri: TT_REDIRECT });
  } catch (e) {
    return voltar("erro", (e as Error).message);
  }
  const r = await sincronizarTikTok();
  return r.ok ? voltar("ok") : voltar("erro", r.erro);
});
