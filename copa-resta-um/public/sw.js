const CACHE = 'copa-resta-um-v1'
self.addEventListener('install', e => {
  self.skipWaiting()
})
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    ))
  )
  self.clients.claim()
})
self.addEventListener('fetch', e => {
  // Network-first for navigation/API, fallback to cache
  if (e.request.method !== 'GET') return
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copy = res.clone()
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(()=>{})
        return res
      })
      .catch(() => caches.match(e.request))
  )
})
