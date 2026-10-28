// =====================================================================
// agenda-google: lê o "Endereço secreto no formato iCal" do Google Agenda
// (guardado em config_painel, chave "gcal_ical") e devolve os eventos de
// um período pro Calendário do painel: ?de=2026-10-01&ate=2026-10-31
// Chamada pelo painel com o login (deixe o "Verify JWT" LIGADO).
// O navegador não consegue buscar esse link direto (o Google bloqueia),
// por isso a busca é feita aqui.
// =====================================================================
import { cors, db, json } from "../_shared/comum.ts";
import { eventosDoIcs, linkValido } from "./ical.js";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  // Só quem está logado no painel. (O "Verify JWT" sozinho aceita a chave pública
  // do site, então confere se o token é de uma pessoa logada de verdade.)
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: quem } = await db.auth.getUser(token);
  if (!quem?.user) return json({ erro: "Faça login no painel." }, 401);

  const p = new URL(req.url).searchParams;
  const de = p.get("de") || "", ate = p.get("ate") || "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(de) || !/^\d{4}-\d{2}-\d{2}$/.test(ate)) return json({ erro: "Período inválido" }, 400);

  const { data } = await db.from("config_painel").select("valor").eq("chave", "gcal_ical").maybeSingle();
  const url = data?.valor || "";
  if (!url) return json({ conectado: false, eventos: [] });
  if (!linkValido(url)) return json({ conectado: false, eventos: [], erro: "O link salvo não é do Google Agenda." });

  try {
    const resp = await fetch(url, { headers: { "User-Agent": "painel-tatiele" } });
    if (!resp.ok) return json({ conectado: true, eventos: [], erro: `O Google respondeu ${resp.status}. Se você trocou o endereço secreto, cole o novo no painel.` });
    const ics = await resp.text();
    if (!ics.includes("BEGIN:VCALENDAR")) return json({ conectado: true, eventos: [], erro: "Esse link não devolveu uma agenda." });
    return json({ conectado: true, eventos: eventosDoIcs(ics, de, ate) });
  } catch (e) {
    return json({ conectado: true, eventos: [], erro: `Não consegui buscar a agenda: ${(e as Error).message}` });
  }
});
