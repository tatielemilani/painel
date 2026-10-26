-- =====================================================================
-- 10_midia.sql
-- Janela "Mídia" (biblioteca de arquivos): pra apagar um arquivo da pasta
-- ig-assets, o Supabase exige que quem está logado também possa "ver"
-- os arquivos dessa pasta pela API. O público continua só baixando pela
-- URL pública (como o Instagram precisa).
-- =====================================================================

drop policy if exists ig_assets_select on storage.objects;
create policy ig_assets_select on storage.objects
  for select to authenticated using (bucket_id = 'ig-assets');
