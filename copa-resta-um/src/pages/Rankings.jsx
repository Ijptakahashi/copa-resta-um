import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPlayers, getAllPicks } from '../lib/supabase'
import { computeLives } from '../lib/gameLogic'

export default function Rankings({ player }) {
  const navigate = useNavigate()
  const [data,setData]   = useState([])
  const [loading,setLoad]= useState(true)

  useEffect(()=>{
    async function load(){
      const [players,allPicks]=await Promise.all([getPlayers(),getAllPicks()])
      const ranked=players.map(p=>{
        const pp=allPicks.filter(pk=>pk.player_id===p.id)
        const {lives,inKnockout}=computeLives(pp)
        const correct=pp.filter(pk=>pk.result==='win').length
        return{...p,lives,inKnockout,correct,eliminated:lives<=0}
      }).sort((a,b)=>b.lives-a.lives||b.correct-a.correct)
      setData(ranked); setLoad(false)
    }
    load()
  },[])

  if(loading) return(
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'60vh'}}>
      <div style={{width:36,height:36,borderRadius:'50%',border:'3px solid #E8E3DB',
        borderTopColor:'#1A3D28',animation:'spin 1s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const pot = data.length * 50

  return (
    <div className="page">
      {/* Prize pool header */}
      <div style={{background:'linear-gradient(135deg,#0D2117,#1A3D28)',
        borderRadius:16,padding:'24px 20px',marginBottom:16,
        position:'relative',overflow:'hidden',
        boxShadow:'0 6px 28px rgba(13,33,23,.35)'}}>
        <div style={{position:'absolute',top:-20,right:-20,width:120,height:120,
          borderRadius:'50%',border:'2px solid rgba(201,164,74,.15)'}}/>
        <div style={{position:'absolute',bottom:-30,right:20,width:80,height:80,
          borderRadius:'50%',border:'1px solid rgba(201,164,74,.1)'}}/>
        <div style={{fontFamily:'Sora',fontWeight:700,fontSize:10,letterSpacing:'.15em',
          textTransform:'uppercase',color:'rgba(201,164,74,.6)',marginBottom:4}}>
          WORLD CUP 2026 POOL
        </div>
        <div style={{fontFamily:'Sora',fontWeight:600,fontSize:13,
          color:'rgba(255,255,255,.5)',marginBottom:6}}>PRIZE POOL</div>
        <div style={{fontFamily:'Sora',fontWeight:800,fontSize:52,color:'#C9A44A',
          lineHeight:1,letterSpacing:'-2px'}}>
          R$ {pot.toLocaleString('pt-BR')}
        </div>
        <div style={{fontSize:12,color:'rgba(255,255,255,.4)',marginTop:8,fontFamily:'Inter'}}>
          {data.length} participantes · R$50 cada
        </div>
      </div>

      {/* Table */}
      <div style={{background:'#fff',borderRadius:16,overflow:'hidden',
        border:'1px solid rgba(0,0,0,.07)',boxShadow:'0 2px 12px rgba(0,0,0,.06)'}}>
        {/* Header */}
        <div style={{display:'grid',gridTemplateColumns:'36px 1fr auto 80px',gap:0,
          padding:'10px 16px',borderBottom:'1px solid rgba(0,0,0,.06)'}}>
          {['POS','PLAYER','LIVES','STATUS'].map((h,i)=>(
            <div key={h} style={{fontFamily:'Sora',fontWeight:700,fontSize:9,
              letterSpacing:'.1em',textTransform:'uppercase',color:'#9CA3AF',
              textAlign:i>=2?'center':'left'}}>{h}</div>
          ))}
        </div>

        {data.map((p,i)=>{
          const isMe=p.id===player.id
          const maxL=p.inKnockout?3:6
          return(
            <div key={p.id}
              onClick={()=>navigate(`/profile/${p.id}`)}
              style={{display:'grid',gridTemplateColumns:'36px 1fr auto 80px',
                alignItems:'center',padding:'12px 16px',
                borderBottom:i<data.length-1?'1px solid rgba(0,0,0,.05)':'none',
                background:isMe?'rgba(201,164,74,.05)':'transparent',
                cursor:'pointer',transition:'background .1s',
                opacity:p.eliminated?.5:1}}
              onMouseEnter={e=>e.currentTarget.style.background=isMe?'rgba(201,164,74,.08)':'rgba(0,0,0,.02)'}
              onMouseLeave={e=>e.currentTarget.style.background=isMe?'rgba(201,164,74,.05)':'transparent'}>
              {/* Pos */}
              <div style={{fontFamily:'Sora',fontWeight:800,fontSize:15,
                color:i<3?'#C9A44A':'#B0A898',textAlign:'center'}}>
                {i+1}
              </div>
              {/* Player */}
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:36,height:36,borderRadius:'50%',overflow:'hidden',
                  border:`1.5px solid ${isMe?'#C9A44A':'rgba(0,0,0,.08)'}`,
                  background:'#F3F0EA',display:'flex',alignItems:'center',
                  justifyContent:'center',flexShrink:0}}>
                  {p.avatar_url
                    ? <img src={p.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>
                    : <span style={{fontSize:18}}>{p.avatar||'⚽'}</span>
                  }
                </div>
                <div>
                  <div style={{fontFamily:'Sora',fontWeight:600,fontSize:14,
                    color:isMe?'#1A3D28':'#1A1A1A'}}>
                    {p.name}{isMe?' (você)':''}
                  </div>
                  <div style={{fontSize:11,color:'#9CA3AF',fontFamily:'Inter'}}>
                    {p.correct} acertos
                  </div>
                </div>
              </div>
              {/* Lives shields */}
              <div style={{display:'flex',gap:2,alignItems:'center',justifyContent:'center'}}>
                {p.eliminated?(
                  <span style={{fontSize:20}}>💀</span>
                ):(
                  Array.from({length:maxL}).map((_,j)=>(
                    <svg key={j} width={13} height={16} viewBox="0 0 22 26" fill="none">
                      <path d="M11 1.5L2.5 5.5v7.8c0 6.8 4.2 12.6 8.5 13.9C15.3 25.9 19.5 20.1 19.5 13.3V5.5L11 1.5z"
                        fill={j<p.lives?'#C9A44A':'none'}
                        stroke={j<p.lives?'#C9A44A':'#D4CABC'}
                        strokeWidth="1.4" strokeLinejoin="round"/>
                    </svg>
                  ))
                )}
              </div>
              {/* Status */}
              <div style={{textAlign:'center'}}>
                {p.eliminated?(
                  <span style={{fontFamily:'Sora',fontSize:9,fontWeight:700,
                    color:'#C4302B',letterSpacing:'.04em'}}>ELIMINATED</span>
                ):(
                  <span style={{fontFamily:'Sora',fontSize:12,fontWeight:800,
                    color:i===0?'#C9A44A':'#1A1A1A'}}>{p.lives}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
