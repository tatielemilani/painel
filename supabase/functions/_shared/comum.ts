// =====================================================================
// comum.ts: peças usadas por todas as Edge Functions
// (conexão com o banco, chamadas à API do Instagram, CORS, segredos).
// =====================================================================
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

// Lê uma variável de ambiente (segredo). Se não existir, usa o padrão.
export const env = (nome: string, padrao = "") => Deno.env.get(nome) ?? padrao;

export const GRAPH_VERSION = env("GRAPH_API_VERSION", "v21.0");
export const GRAPH = `https://graph.instagram.com/${GRAPH_VERSION}`;
export const IG_ACCOUNT_ID = env("IG_ACCOUNT_ID");

// Banco com a chave service_role (ignora o RLS). SUPABASE_URL e
// SUPABASE_SERVICE_ROLE_KEY são preenchidas automaticamente pelo Supabase.
export const db = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
});

// ---------------------------------------------------------------------
// Respostas HTTP
// ---------------------------------------------------------------------
export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export function json(dados: unknown, status = 200) {
  return new Response(JSON.stringify(dados), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

// Protege os robôs agendados: só passa quem manda o header x-sched-key certo.
export function chaveAgendadorOk(req: Request) {
  const segredo = env("SCHED_SECRET");
  return segredo !== "" && req.headers.get("x-sched-key") === segredo;
}

// ---------------------------------------------------------------------
// Token do Instagram: usa o token renovado (guardado no banco pelo robô
// ig-token-refresh). Se ainda não houver, usa o IG_ACCESS_TOKEN dos segredos.
// ---------------------------------------------------------------------
export async function getToken(): Promise<string> {
  try {
    const { data } = await db.from("ig_token_store").select("access_token").eq("id", "main").maybeSingle();
    if (data?.access_token) return data.access_token;
  } catch (_) { /* tabela ainda não existe: segue com o segredo */ }
  return env("IG_ACCESS_TOKEN");
}

// ---------------------------------------------------------------------
// Chamada à API do Instagram (Graph). Nunca lança erro: devolve ok/erro.
// ---------------------------------------------------------------------
export type GraphErro = { message: string; code?: number; subcode?: number };
export type GraphResultado = { ok: boolean; data?: any; error?: GraphErro; hard?: boolean };

// Códigos que indicam bloqueio ou limite do Instagram (falha "dura").
const CODIGOS_DUROS = [4, 17, 32, 368, 613];

export async function graph(
  caminho: string,
  opcoes: { method?: string; body?: unknown; params?: Record<string, string> } = {},
): Promise<GraphResultado> {
  const token = await getToken();
  if (!token) return { ok: false, error: { message: "IG_ACCESS_TOKEN não configurado" } };

  const url = new URL(caminho.startsWith("http") ? caminho : `${GRAPH}${caminho}`);
  for (const [k, v] of Object.entries(opcoes.params ?? {})) url.searchParams.set(k, v);

  try {
    const resp = await fetch(url, {
      method: opcoes.method ?? "GET",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: opcoes.body ? JSON.stringify(opcoes.body) : undefined,
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || data?.error) {
      const e = data?.error ?? {};
      return {
        ok: false,
        error: { message: e.message ?? `HTTP ${resp.status}`, code: e.code, subcode: e.error_subcode },
        hard: CODIGOS_DUROS.includes(Number(e.code)),
      };
    }
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: { message: `Falha de rede: ${(err as Error).message}` } };
  }
}

// "Já processei esse evento?" Grava o id; se já existia, devolve false.
export async function primeiraVez(idEvento: string): Promise<boolean> {
  const { error } = await db.from("ig_processed_events").insert({ id: idEvento });
  if (!error) return true;
  if (error.code === "23505") return false; // já existia: evento repetido
  console.error("ig_processed_events:", error.message);
  return true; // na dúvida, processa
}

// Texto sem acento e minúsculo, pra comparar palavras-chave.
export function normalizar(texto: string) {
  return (texto ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}
