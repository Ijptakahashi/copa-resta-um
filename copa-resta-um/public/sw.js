// Versão do cache — MUDE este número a cada deploy importante pra forçar atualização
const CACHE = 'copa-resta-um-v39'

self.addEventListener('install', e => {
  // Ativa o SW novo imediatamente, sem esperar fechar as abas
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return

  const url = new URL(e.request.url)

  // HTML / navegação / JS / CSS → SEMPRE rede primeiro (pega versão nova)
  const isAppShell =
    e.request.mode === 'navigate' ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.jsx') ||
    url.pathname.endsWith('.css') ||
    url.pathname === '/' ||
    url.pathname.endsWith('.html')

  if (isAppShell) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const copy = res.clone()
          caches.open(CACHE).then(c => c.put(e.request, copy)).catch(()=>{})
          return res
        })
        .catch(() => caches.match(e.request)) // offline → usa cache
    )
    return
  }

  // Imagens / fontes / outros → cache primeiro (rápido), atualiza em background
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetchPromise = fetch(e.request).then(res => {
        const copy = res.clone()
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(()=>{})
        return res
      }).catch(() => cached)
      return cached || fetchPromise
    })
  )
})

// Permite que a página mande o SW pular a espera
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting()
})
