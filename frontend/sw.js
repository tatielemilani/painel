// Service worker do painel: deixa ele ser instalado como app e recebe os avisos do dia (push).
// Não guarda nada em cache: o painel sempre busca a versão mais nova e os dados
// vêm do banco ao vivo. Sem internet, mostra um aviso simples em vez de tela de erro.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

// Aviso do dia que chega com o painel fechado (função push-lembretes)
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { texto: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.titulo || "Meu Painel", {
    body: d.texto || "", tag: d.tag || "painel", icon: "icones/icone-192.png", badge: "icones/aviso-barra.png", data: { url: d.url || "./" },
  }));
});

// Tocar no aviso abre o painel (ou traz pra frente se já estiver aberto)
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || "./", self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((abertas) => {
    const painel = abertas.find((c) => c.url.startsWith(self.registration.scope));
    if (painel) return painel.navigate(url).then((c) => (c || painel).focus());
    return self.clients.openWindow(url);
  }));
});

self.addEventListener("fetch", (e) => {
  // Só a abertura das páginas do painel passa por aqui; o resto segue direto.
  if (e.request.mode !== "navigate") return;
  // cache "no-cache": sempre confere com o servidor, pra versão nova aparecer na hora.
  e.respondWith(fetch(e.request, { cache: "no-cache" }).catch(() => new Response(
    '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
    + '<body style="font-family:system-ui,sans-serif;background:#faf7f4;color:#1f1a17;display:grid;place-items:center;min-height:100vh;margin:0;text-align:center;padding:24px">'
    + '<div><p style="font-size:40px;margin:0">📡</p><h1 style="font-size:20px">Sem internet</h1>'
    + '<p style="color:#6b5e57">O painel precisa de conexão pra mostrar seus dados. Assim que voltar, é só abrir de novo.</p></div></body>',
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  )));
});
