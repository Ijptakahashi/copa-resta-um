import { useState, useEffect } from 'react'
import { Download, X, Share } from 'lucide-react'

export default function InstallButton() {
  const [deferredPrompt, setPrompt] = useState(null)
  const [showIOS, setShowIOS]       = useState(false)
  const [installed, setInstalled]   = useState(false)
  const [visible, setVisible]       = useState(true)

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                       window.navigator.standalone === true

  useEffect(() => {
    function handler(e) {
      e.preventDefault()
      setPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setInstalled(true))
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // Já instalado ou rodando como app — não mostra nada
  if (isStandalone || installed || !visible) return null

  async function handleClick() {
    if (deferredPrompt) {
      // Android / Chrome — instala automático
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') setInstalled(true)
      setPrompt(null)
    } else if (isIOS) {
      // iOS — mostra instruções
      setShowIOS(true)
    }
  }

  // Não mostra o botão no iOS se já está em standalone, nem em desktop sem prompt
  const canShow = deferredPrompt || isIOS
  if (!canShow) return null

  return (
    <>
      <button
        onClick={handleClick}
        style={{
          position:'fixed', bottom:72, left:'50%', transform:'translateX(-50%)',
          zIndex:200, display:'flex', alignItems:'center', gap:8,
          background:'linear-gradient(135deg,#C9A44A,#A07830)', color:'#fff',
          border:'none', borderRadius:24, padding:'12px 22px', cursor:'pointer',
          fontFamily:'Sora', fontWeight:700, fontSize:13, letterSpacing:'.04em',
          boxShadow:'0 6px 24px rgba(201,164,74,.45)',
          maxWidth:'calc(100% - 32px)',
        }}>
        <Download size={16}/>
        Instalar o app
      </button>

      {/* iOS instructions modal */}
      {showIOS && (
        <div onClick={()=>setShowIOS(false)}
          style={{position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,.5)',
            display:'flex',alignItems:'flex-end',justifyContent:'center',padding:16}}>
          <div onClick={e=>e.stopPropagation()}
            style={{background:'#fff',borderRadius:20,padding:'24px 20px',maxWidth:380,width:'100%',
              boxShadow:'0 -4px 32px rgba(0,0,0,.2)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <div style={{fontFamily:'Sora',fontWeight:800,fontSize:18,color:'#1A3D28'}}>
                Instalar no iPhone
              </div>
              <button onClick={()=>setShowIOS(false)}
                style={{background:'none',border:'none',cursor:'pointer',color:'#9CA3AF'}}>
                <X size={22}/>
              </button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:16}}>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <div style={{width:32,height:32,borderRadius:'50%',background:'#EBF5EE',
                  display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,
                  fontFamily:'Sora',fontWeight:800,color:'#1A3D28'}}>1</div>
                <div style={{fontFamily:'Inter',fontSize:14,color:'#1A1A1A',display:'flex',
                  alignItems:'center',gap:6,flexWrap:'wrap'}}>
                  Toque no ícone <Share size={16} style={{display:'inline'}}/> <b>Compartilhar</b> na barra do Safari
                </div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <div style={{width:32,height:32,borderRadius:'50%',background:'#EBF5EE',
                  display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,
                  fontFamily:'Sora',fontWeight:800,color:'#1A3D28'}}>2</div>
                <div style={{fontFamily:'Inter',fontSize:14,color:'#1A1A1A'}}>
                  Role e toque em <b>"Adicionar à Tela de Início"</b>
                </div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <div style={{width:32,height:32,borderRadius:'50%',background:'#EBF5EE',
                  display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,
                  fontFamily:'Sora',fontWeight:800,color:'#1A3D28'}}>3</div>
                <div style={{fontFamily:'Inter',fontSize:14,color:'#1A1A1A'}}>
                  Toque em <b>"Adicionar"</b> no canto superior
                </div>
              </div>
            </div>
            <button onClick={()=>setShowIOS(false)}
              style={{width:'100%',marginTop:20,padding:'14px',borderRadius:12,border:'none',
                background:'#1A3D28',color:'#fff',fontFamily:'Sora',fontWeight:700,fontSize:14,
                cursor:'pointer'}}>
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  )
}
