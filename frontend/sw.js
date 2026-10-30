// Service worker do painel: só o necessário pra ele poder ser instalado como app.
// Não guarda nada em cache: o painel sempre busca a versão mais nova e os dados
// vêm do banco ao vivo. Sem internet, mostra um aviso simples em vez de tela de erro.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (e) => {
  // Só a abertura das páginas do painel passa por aqui; o resto segue direto.
  if (e.request.mode !== "navigate") return;
  e.respondWith(fetch(e.request).catch(() => new Response(
    '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
    + '<body style="font-family:system-ui,sans-serif;background:#faf7f4;color:#1f1a17;display:grid;place-items:center;min-height:100vh;margin:0;text-align:center;padding:24px">'
    + '<div><p style="font-size:40px;margin:0">📡</p><h1 style="font-size:20px">Sem internet</h1>'
    + '<p style="color:#6b5e57">O painel precisa de conexão pra mostrar seus dados. Assim que voltar, é só abrir de novo.</p></div></body>',
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  )));
});
