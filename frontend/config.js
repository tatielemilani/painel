// =====================================================================
// config.js: as ÚNICAS configurações do painel.
// Estas duas chaves podem ficar públicas (quem protege o banco é o RLS).
// NUNCA coloque aqui a chave service_role.
// =====================================================================
window.APP_CONFIG = {
  // Supabase > Project Settings > API > Project URL
  SUPABASE_URL: "SEU_VALOR_AQUI",

  // Supabase > Project Settings > API > anon public
  SUPABASE_ANON_KEY: "SEU_VALOR_AQUI",
};
