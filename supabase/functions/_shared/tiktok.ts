// =====================================================================
// tiktok.ts: conversa com a API do TikTok (Login Kit + Display API).
// Guarda o token no banco, renova sozinho e copia perfil e vídeos pro
// painel (tabelas tiktok_perfil, tiktok_perfil_dia e tiktok_videos).
// Segredos: TIKTOK_CLIENT_KEY e TIKTOK_CLIENT_SECRET.
// =====================================================================
import { db, env } from "./comum.ts";

export const TT_API = "https://open.tiktokapis.com/v2";
export const TT_ESCOPOS = "user.info.basic,user.info.profile,user.info.stats,video.list";
export const TT_REDIRECT = `${env("SUPABASE_URL")}/functions/v1/tiktok-callback`;
export const PAINEL_URL = env("PAINEL_URL", "https://tatielemilani.com/painel/");

const MAX_PAGINAS_VIDEOS = 50; // 20 vídeos por página = até 1000 vídeos
const CAMPOS_PERFIL = "open_id,avatar_url,display_name,username,bio_description,is_verified,profile_deep_link," +
  "follower_count,following_count,likes_count,video_count";
const CAMPOS_VIDEO = "id,title,video_description,cover_image_url,share_url,create_time,duration," +
  "view_count,like_count,comment_count,share_count";

// Troca um "code" (depois do login) ou um refresh_token por um token novo e guarda no banco.
export async function pedirToken(params: Record<string, string>) {
  const corpo = new URLSearchParams({
    client_key: env("TIKTOK_CLIENT_KEY"),
    client_secret: env("TIKTOK_CLIENT_SECRET"),
    ...params,
  });
  const resp = await fetch(`${TT_API}/oauth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: corpo,
  });
  const d = await resp.json().catch(() => ({}));
  if (!resp.ok || d.error || !d.access_token) {
    throw new Error(d.error_description || d.error || `TikTok respondeu HTTP ${resp.status}`);
  }
  const agora = Date.now();
  const linha = {
    id: "main",
    open_id: d.open_id,
    access_token: d.access_token,
    refresh_token: d.refresh_token,
    expira_em: new Date(agora + Number(d.expires_in || 86400) * 1000).toISOString(),
    refresh_expira_em: new Date(agora + Number(d.refresh_expires_in || 31536000) * 1000).toISOString(),
    escopos: d.scope || null,
    atualizado_em: new Date(agora).toISOString(),
  };
  const { error } = await db.from("tiktok_token").upsert(linha);
  if (error) throw new Error(`Não consegui guardar o token: ${error.message}`);
  return linha.access_token;
}

// Token válido: se vence em menos de 1 hora, renova antes.
async function tokenValido(): Promise<string> {
  const { data } = await db.from("tiktok_token").select("*").eq("id", "main").maybeSingle();
  if (!data?.access_token) throw new Error("TikTok ainda não conectado");
  if (new Date(data.expira_em).getTime() - Date.now() > 3600_000) return data.access_token;
  if (new Date(data.refresh_expira_em).getTime() < Date.now()) throw new Error("A conexão com o TikTok venceu. Conecte de novo.");
  return await pedirToken({ grant_type: "refresh_token", refresh_token: data.refresh_token });
}

async function chamar(token: string, caminho: string, corpo?: unknown) {
  const resp = await fetch(`${TT_API}${caminho}`, {
    method: corpo ? "POST" : "GET",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const d = await resp.json().catch(() => ({}));
  if (!resp.ok || (d.error && d.error.code && d.error.code !== "ok")) {
    throw new Error(d.error?.message || `TikTok respondeu HTTP ${resp.status}`);
  }
  return d.data ?? {};
}

// Data de hoje no horário de Brasília (AAAA-MM-DD)
const hojeBR = () => new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10);

// Copia perfil e vídeos do TikTok pro banco e tira a "foto do dia".
export async function sincronizarTikTok() {
  const agora = new Date().toISOString();
  try {
    const token = await tokenValido();
    const u = (await chamar(token, `/user/info/?fields=${CAMPOS_PERFIL}`)).user ?? {};

    // Vídeos (todas as páginas)
    const videos: any[] = [];
    let cursor: number | undefined;
    for (let pagina = 0; pagina < MAX_PAGINAS_VIDEOS; pagina++) {
      const d = await chamar(token, `/video/list/?fields=${CAMPOS_VIDEO}`, cursor ? { max_count: 20, cursor } : { max_count: 20 });
      videos.push(...(d.videos ?? []));
      if (!d.has_more || !d.cursor) break;
      cursor = d.cursor;
    }

    const linhasVideos = videos.map((v) => ({
      id: String(v.id),
      titulo: v.title || null,
      descricao: v.video_description || null,
      capa_url: v.cover_image_url || null,
      link: v.share_url || null,
      publicado_em: v.create_time ? new Date(Number(v.create_time) * 1000).toISOString() : null,
      duracao: v.duration ?? null,
      visualizacoes: v.view_count ?? null,
      curtidas: v.like_count ?? null,
      comentarios: v.comment_count ?? null,
      compartilhamentos: v.share_count ?? null,
      atualizado_em: agora,
    }));
    for (let i = 0; i < linhasVideos.length; i += 200) {
      const { error } = await db.from("tiktok_videos").upsert(linhasVideos.slice(i, i + 200));
      if (error) throw new Error(`Não consegui guardar os vídeos: ${error.message}`);
    }
    const somaViews = linhasVideos.reduce((t, v) => t + Number(v.visualizacoes || 0), 0);

    const perfil = {
      id: "main",
      open_id: u.open_id ?? null,
      username: u.username ?? null,
      nome: u.display_name ?? null,
      avatar_url: u.avatar_url ?? null,
      bio: u.bio_description ?? null,
      verificado: u.is_verified ?? null,
      link: u.profile_deep_link ?? (u.username ? `https://www.tiktok.com/@${u.username}` : null),
      seguidores: u.follower_count ?? null,
      seguindo: u.following_count ?? null,
      curtidas: u.likes_count ?? null,
      videos: u.video_count ?? null,
      status: "ok",
      erro: null,
      atualizado_em: agora,
    };
    await db.from("tiktok_perfil").upsert(perfil);
    await db.from("tiktok_perfil_dia").upsert({
      data: hojeBR(),
      seguidores: perfil.seguidores,
      seguindo: perfil.seguindo,
      curtidas: perfil.curtidas,
      videos: perfil.videos,
      visualizacoes: somaViews,
      atualizado_em: agora,
    });
    return { ok: true, videos: linhasVideos.length };
  } catch (e) {
    const erro = (e as Error).message;
    await db.from("tiktok_perfil").upsert({ id: "main", status: "erro", erro, atualizado_em: agora });
    return { ok: false, erro };
  }
}
