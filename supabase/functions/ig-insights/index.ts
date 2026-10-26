// =====================================================================
// ig-insights: números da conta pra aba Análises, no período escolhido
// (?dias=7, 30, 90 ou tudo). Seguidores, novos seguidores, alcance por
// dia, contas engajadas e interações.
// Chamada pelo painel com o login (deixe o "Verify JWT" LIGADO).
// =====================================================================
import { cors, db, getToken, graph, json } from "../_shared/comum.ts";

const DIA = 86400;
const MAX_JANELA = 30; // o Instagram aceita no máximo 30 dias por consulta
const TUDO = 730;      // "Tudo" = últimos 2 anos (o máximo que o Instagram guarda)

// Quebra o período em janelas de até 30 dias: [início, fim] em segundos.
function janelas(dias: number) {
  const ate = Math.floor(Date.now() / 1000);
  const comeco = ate - dias * DIA;
  const lista: [number, number][] = [];
  for (let fim = ate; fim > comeco; fim -= MAX_JANELA * DIA) {
    lista.unshift([Math.max(comeco, fim - MAX_JANELA * DIA), fim]);
  }
  return lista;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  if (!(await getToken())) return json({ conectado: false, motivo: "Token do Instagram não configurado" });

  const perfil = await graph("/me", { params: { fields: "user_id,username,followers_count,media_count" } });
  if (!perfil.ok) return json({ conectado: false, motivo: perfil.error?.message });

  const pedido = Number(new URL(req.url).searchParams.get("dias") || 30);
  const dias = [7, 30, 90].includes(pedido) ? pedido : TUDO;
  const jan = janelas(dias);

  // Série diária de uma métrica, juntando as janelas. Se a API recusar, vem vazia.
  async function serie(metrica: string) {
    const partes = await Promise.all(jan.map(([s, u]) => graph("/me/insights", {
      params: { metric: metrica, period: "day", since: String(s), until: String(u) },
    })));
    const porDia = new Map<string, { data: string; valor: number }>();
    for (const r of partes) {
      if (!r.ok) { console.warn(`insights ${metrica}:`, r.error?.message); continue; }
      for (const v of r.data?.data?.[0]?.values ?? []) {
        const data = String(v.end_time ?? "").slice(0, 10);
        porDia.set(data, { data, valor: Number(v.value ?? 0) });
      }
    }
    return [...porDia.values()].sort((a, b) => a.data.localeCompare(b.data));
  }

  // Total do período (somando as janelas). null = a API não informou.
  async function total(metrica: string) {
    const partes = await Promise.all(jan.map(([s, u]) => graph("/me/insights", {
      params: { metric: metrica, metric_type: "total_value", period: "day", since: String(s), until: String(u) },
    })));
    if (partes.every((r) => !r.ok)) { console.warn(`total ${metrica}:`, partes[0]?.error?.message); return null; }
    return partes.reduce((t, r) => t + Number(r.data?.data?.[0]?.total_value?.value ?? 0), 0);
  }

  const soma = (s: { valor: number }[]) => s.reduce((t, p) => t + p.valor, 0);
  const [alcance, novos, engajadas, interacoes] = await Promise.all([
    serie("reach"),
    // O Instagram só informa novos seguidores dos últimos 30 dias.
    dias <= 30 ? serie("follower_count") : Promise.resolve(null),
    // Contas engajadas são pessoas únicas: não dá pra somar janelas de 30 dias.
    dias <= 30 ? total("accounts_engaged") : Promise.resolve(null),
    total("total_interactions"),
  ]);
  const { data: token } = await db.from("ig_token_status").select("expires_at,last_ok").eq("id", "main").maybeSingle();

  return json({
    conectado: true,
    dias,
    conta: {
      username: perfil.data.username,
      seguidores: perfil.data.followers_count ?? 0,
      posts: perfil.data.media_count ?? 0,
    },
    alcance,
    novos_seguidores: novos ?? [],
    totais: {
      alcance: alcance.length ? soma(alcance) : null,
      novos: novos ? soma(novos) : null,
      contas_engajadas: engajadas,
      interacoes,
    },
    token,
  });
});
