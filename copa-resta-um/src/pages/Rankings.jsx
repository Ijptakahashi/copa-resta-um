import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { getPlayers, getAllPicks } from '../lib/supabase'
import { computeLives } from '../lib/gameLogic'

export default function Rankings({ player }) {
  const navigate = useNavigate()
  const [data, setData]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [players, allPicks] = await Promise.all([getPlayers(), getAllPicks()])
      const ranked = players.map(p => {
        const pp = allPicks.filter(pk => pk.player_id === p.id)
        const { lives, inKnockout } = computeLives(pp)
        const correct = pp.filter(pk => pk.result === 'win').length
        return { ...p, lives, inKnockout, correct, eliminated: lives <= 0 }
      }).sort((a,b) => b.lives - a.lives || b.correct - a.correct)
      setData(ranked); setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'60vh'}}>
      <div style={{width:32,height:32,borderRadius:'50%',border:'3px solid #E8E3DB',
        borderTopColor:'#1A3D28',animation:'spin 1s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const pot = data.length * 50

  function ShieldRow({ lives, max }) {
    return (
      <div style={{display:'flex',gap:2,alignItems:'center'}}>
        {Array.from({length:max}).map((_,j) => (
          <svg key={j} width={12} height={14} viewBox="0 0 22 26" fill="none">
            <path d="M11 1.5L2.5 5.5v7.8c0 6.8 4.2 12.6 8.5 13.9C15.3 25.9 19.5 20.1 19.5 13.3V5.5L11 1.5z"
              fill={j<lives?'#C9A44A':'none'}
              stroke={j<lives?'#C9A44A':'#D4CABC'}
              strokeWidth="1.5" strokeLinejoin="round"/>
          </svg>
        ))}
      </div>
    )
  }

  return (
    <div className="page">
      {/* Prize pool card */}
      <div style={{background:'linear-gradient(135deg,#0D2117,#1A3D28)',
        borderRadius:16,padding:'22px 20px',marginBottom:16,
        boxShadow:'0 6px 28px rgba(13,33,23,.3)',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:-15,right:-15,width:100,height:100,
          borderRadius:'50%',border:'1.5px solid rgba(201,164,74,.12)'}}/>
        <div style={{fontFamily:'Sora',fontWeight:700,fontSize:9,letterSpacing:'.15em',
          color:'rgba(201,164,74,.6)',textTransform:'uppercase',marginBottom:3}}>WORLD CUP 2026 POOL</div>
        <div style={{fontFamily:'Sora',fontWeight:500,fontSize:12,color:'rgba(255,255,255,.45)',marginBottom:4}}>PRIZE POOL</div>
        <div style={{fontFamily:'Sora',fontWeight:800,fontSize:48,color:'#C9A44A',
          lineHeight:1,letterSpacing:'-2px'}}>R$ {pot.toLocaleString('pt-BR')}</div>
        <div style={{fontSize:11,color:'rgba(255,255,255,.35)',marginTop:6,fontFamily:'Inter'}}>
          {data.length} participantes · R$50 cada
        </div>
      </div>

      {/* Players list */}
      <div style={{background:'#fff',borderRadius:16,overflow:'hidden',
        border:'1px solid rgba(0,0,0,.07)',boxShadow:'0 2px 12px rgba(0,0,0,.05)'}}>
        {/* Table header */}
        <div style={{display:'flex',alignItems:'center',padding:'10px 16px',
          borderBottom:'1px solid rgba(0,0,0,.06)',gap:10}}>
          <div style={{width:24,fontFamily:'Sora',fontWeight:700,fontSize:9,
            color:'#9CA3AF',letterSpacing:'.1em',textTransform:'uppercase'}}>POS</div>
          <div style={{flex:1,fontFamily:'Sora',fontWeight:700,fontSize:9,
            color:'#9CA3AF',letterSpacing:'.1em',textTransform:'uppercase'}}>JOGADOR</div>
          <div style={{width:90,fontFamily:'Sora',fontWeight:700,fontSize:9,
            color:'#9CA3AF',letterSpacing:'.1em',textTransform:'uppercase',textAlign:'center'}}>VIDAS</div>
          <div style={{width:36,fontFamily:'Sora',fontWeight:700,fontSize:9,
            color:'#9CA3AF',letterSpacing:'.1em',textTransform:'uppercase',textAlign:'center'}}>Nº</div>
        </div>

        {data.map((p, i) => {
          const isMe = p.id === player.id
          const maxL = p.inKnockout ? 3 : 6
          const medals = ['🥇','🥈','🥉']
          return (
            <div key={p.id}
              onClick={() => navigate(`/profile/${p.id}`)}
              style={{display:'flex',alignItems:'center',padding:'12px 16px',gap:10,
                borderBottom: i < data.length-1 ? '1px solid rgba(0,0,0,.05)' : 'none',
                background: isMe ? 'rgba(201,164,74,.05)' : 'transparent',
                cursor:'pointer',transition:'background .1s',
                opacity: p.eliminated ? .5 : 1}}
              onMouseEnter={e => e.currentTarget.style.background = isMe ? 'rgba(201,164,74,.08)' : 'rgba(0,0,0,.02)'}
              onMouseLeave={e => e.currentTarget.style.background = isMe ? 'rgba(201,164,74,.05)' : 'transparent'}>

              {/* Position */}
              <div style={{width:24,textAlign:'center',fontFamily:'Sora',
                fontWeight:800,fontSize:i<3?16:13,
                color:i<3?'#C9A44A':'#B0A898',flexShrink:0}}>
                {medals[i] || i+1}
              </div>

              {/* Avatar + name */}
              <div style={{flex:1,display:'flex',alignItems:'center',gap:10,minWidth:0}}>
                <div style={{width:36,height:36,borderRadius:'50%',overflow:'hidden',flexShrink:0,
                  border:`1.5px solid ${isMe?'#C9A44A':'rgba(0,0,0,.08)'}`,
                  background:'#F3F0EA',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  {p.avatar_url
                    ? <img src={p.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>
                    : <span style={{fontSize:18,lineHeight:1}}>{p.avatar||'⚽'}</span>
                  }
                </div>
                <div style={{minWidth:0}}>
                  <div style={{fontFamily:'Sora',fontWeight:600,fontSize:13,color:'#1A1A1A',
                    overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {p.name}{isMe?' (você)':''}
                  </div>
                  <div style={{fontSize:10,color:'#9CA3AF',fontFamily:'Inter'}}>{p.correct} acertos</div>
                </div>
              </div>

              {/* Shields */}
              <div style={{width:90,display:'flex',justifyContent:'center',flexShrink:0}}>
                {p.eliminated
                  ? <span style={{fontSize:16}}>💀</span>
                  : <ShieldRow lives={p.lives} max={maxL}/>
                }
              </div>

              {/* Number */}
              <div style={{width:36,textAlign:'center',flexShrink:0}}>
                {p.eliminated
                  ? <span style={{fontFamily:'Sora',fontSize:9,fontWeight:700,color:'#C4302B'}}>ELIM.</span>
                  : <span style={{fontFamily:'Sora',fontWeight:800,fontSize:16,
                      color:i===0?'#C9A44A':'#1A1A1A'}}>{p.lives}</span>
                }
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
