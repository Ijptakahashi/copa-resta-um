import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// ─── PWA: registra service worker e força atualização automática ───
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      // Verifica atualização a cada vez que o app é aberto/focado
      reg.update()

      // Quando um SW novo é encontrado e instalado, recarrega a página
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing
        if (!newWorker) return
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // Há uma versão nova esperando — ativa e recarrega
            newWorker.postMessage('skipWaiting')
          }
        })
      })
    }).catch(() => {})

    // Recarrega quando o SW assume o controle (versão nova ativada)
    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return
      refreshing = true
      // Limpa todos os caches antes de recarregar (mata versões presas)
      if ('caches' in window) {
        caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
          .finally(() => window.location.reload())
      } else {
        window.location.reload()
      }
    })
  })

  // Toda vez que o app volta ao foco (reabrir no celular), checa atualização
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      navigator.serviceWorker.getRegistration().then(reg => reg && reg.update())
    }
  })
}
