// Recebe as visitas, cliques e tempo de leitura do site tatielemilani.com
// (enviados pelo rastreio.js) e grava na tabela site_eventos.
// Pública (sem login), mas só aceita pedidos vindos do próprio site e ignora robôs.
// Não guarda IP: só o que o script manda + tipo de aparelho e navegador.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const SITES = ["https://tatielemilani.com", "https://www.tatielemilani.com"];
const TIPOS = ["visita", "clique", "saida"];
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const texto = (v: unknown, max = 120) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

function aparelho(ua: string) {
  if (/iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua)) return "tablet";
  if (/Mobi|iPhone|iPod|Android/i.test(ua)) return "celular";
  return "computador";
}
function navegador(ua: string) {
  if (/Instagram/i.test(ua)) return "Instagram (app)";
  if (/FBAN|FBAV/i.test(ua)) return "Facebook (app)";
  if (/TikTok|musical_ly|BytedanceWebview/i.test(ua)) return "TikTok (app)";
  if (/Edg\//i.test(ua)) return "Edge";
  if (/SamsungBrowser/i.test(ua)) return "Samsung";
  if (/Chrome|CriOS/i.test(ua)) return "Chrome";
  if (/Firefox|FxiOS/i.test(ua)) return "Firefox";
  if (/Safari/i.test(ua)) return "Safari";
  return "outro";
}

Deno.serve(async (req) => {
  const origem = req.headers.get("origin") || "";
  const cors = {
    "Access-Control-Allow-Origin": SITES.includes(origem) ? origem : SITES[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
  };
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST" || !SITES.includes(origem)) return new Response("não", { status: 403, headers: cors });

  const ua = req.headers.get("user-agent") || "";
  if (!ua || /bot|crawl|spider|slurp|preview|lighthouse|headless/i.test(ua)) return new Response(null, { status: 204, headers: cors });

  let d: Record<string, unknown>;
  try {
    const corpo = await req.text();
    if (corpo.length > 4000) throw new Error("grande demais");
    d = JSON.parse(corpo);
  } catch {
    return new Response("dados inválidos", { status: 400, headers: cors });
  }
  const tipo = texto(d.tipo, 10);
  if (!tipo || !TIPOS.includes(tipo)) return new Response("tipo inválido", { status: 400, headers: cors });

  const segundos = Number(d.segundos);
  const { error } = await db.from("site_eventos").insert({
    tipo,
    pagina: texto(d.pagina, 40) || "Outra",
    visitante: texto(d.visitante, 40),
    sessao: texto(d.sessao, 40),
    origem: texto(d.origem, 60),
    utm_source: texto(d.utm_source, 80),
    utm_campaign: texto(d.utm_campaign, 80),
    dispositivo: aparelho(ua),
    navegador: navegador(ua),
    idioma: texto(d.idioma, 20),
    categoria: texto(d.categoria, 40),
    rotulo: texto(d.rotulo, 80),
    destino: texto(d.destino, 120),
    segundos: Number.isFinite(segundos) ? Math.max(0, Math.min(86400, Math.round(segundos))) : null,
  });
  if (error) { console.error("site-evento:", error.message); return new Response("erro", { status: 500, headers: cors }); }
  return new Response(null, { status: 204, headers: cors });
});
