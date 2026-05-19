import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { getPlayerPicks, getMatches, getAllPicks, getPlayers } from '../lib/supabase'
import { computeLives, todayBrasilia, toLocalDateISO, STAGE_TO_PHASE } from '../lib/gameLogic'
import { syncMatches, syncResults, processNoPicks } from '../lib/football'
import ShieldLives from '../components/ShieldLives'
import FlagImage, { countryCode } from '../components/FlagImage'

function Countdown({ target }) {
  const [t, setT] = useState({h:'--',m:'--',s:'--'})
  useEffect(()=>{
    function tick(){
      const d = new Date(target)-Date.now()
      if(d<=0){setT({h:'00',m:'00',s:'00'});return}
      setT({
        h:String(Math.floor(d/3600000)).padStart(2,'0'),
        m:String(Math.floor((d%3600000)/60000)).padStart(2,'0'),
        s:String(Math.floor((d%60000)/1000)).padStart(2,'0'),
      })
    }
    tick(); const id=setInterval(tick,1000); return()=>clearInterval(id)
  },[target])
  return (
    <div style={{display:'flex',alignItems:'center',gap:2}}>
      {[t.h,t.m,t.s].map((v,i)=>(
        <span key={i} style={{display:'flex',alignItems:'center',gap:2}}>
          <span style={{fontFamily:'Sora',fontWeight:800,fontSize:22,color:'#1A3D28',
            background:'#fff',borderRadius:8,padding:'4px 8px',
            border:'1px solid rgba(0,0,0,.07)',lineHeight:1}}>{v}</span>
          {i<2&&<span style={{fontFamily:'Sora',fontWeight:800,fontSize:20,color:'#C9A44A'}}>:</span>}
        </span>
      ))}
    </div>
  )
}

export default function Dashboard({ player }) {
  const navigate = useNavigate()
  const [picks,setPicks]     = useState([])
  const [todayMs,setTodayMs] = useState([])
  const [todayPick,setTP]    = useState(null)
  const [nextMatch,setNM]    = useState(null)
  const [leaders,setLeaders] = useState([])
  const [loading,setLoading] = useState(true)
  const [syncing,setSyncing] = useState(false)
  const today = todayBrasilia()

  useEffect(()=>{ load() },[player.id])

  async function load(){
    setLoading(true)
    const [pp,allMs,allPicks,players] = await Promise.all([
      getPlayerPicks(player.id),getMatches(),getAllPicks(),getPlayers()
    ])
    setPicks(pp)
    const dayMs = allMs.filter(m=>toLocalDateISO(m.utc_date)===today)
    setTodayMs(dayMs)
    setTP(pp.find(p=>p.pick_date===today)||null)
    const upcoming = allMs.filter(m=>m.status==='SCHEDULED'&&new Date(m.utc_date)>new Date())
      .sort((a,b)=>new Date(a.utc_date)-new Date(b.utc_date))[0]
    setNM(upcoming||null)
    const ranked = players.map(p=>{
      const pp2=allPicks.filter(pk=>pk.player_id===p.id)
      const {lives}=computeLives(pp2)
      const correct=pp2.filter(pk=>pk.result==='win').length
      return {...p,lives,correct,eliminated:lives<=0}
    }).sort((a,b)=>b.lives-a.lives||b.correct-a.correct)
    setLeaders(ranked.slice(0,5))
    setLoading(false)
  }

  async function handleSync(){
    setSyncing(true)
    try {
      const players=await getPlayers()
      await syncMatches(); await syncResults(players)
      const allMs=await getMatches(); await processNoPicks(players,allMs)
      await load()
    } catch(e){console.error(e)} finally{setSyncing(false)}
  }

  if(loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',
      height:'60vh',flexDirection:'column',gap:12}}>
      <div style={{width:40,height:40,borderRadius:'50%',
        border:'3px solid #E8E3DB',borderTopColor:'#1A3D28',
        animation:'spin 1s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <span style={{fontFamily:'Sora',fontSize:13,color:'#9CA3AF'}}>Carregando...</span>
    </div>
  )

  const {lives,inKnockout}=computeLives(picks)
  const maxL=inKnockout?3:6
  const myRank=leaders.findIndex(l=>l.id===player.id)+1

  function fmtDate(utcDate){
    return new Date(utcDate).toLocaleDateString('pt-BR',
      {weekday:'short',month:'short',day:'numeric',timeZone:'America/Sao_Paulo'})
      .toUpperCase()
  }
  function fmtTime(utcDate){
    return new Date(utcDate).toLocaleTimeString('pt-BR',
      {hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'})
  }

  return (
    <div className="page">
      {/* Greeting */}
      <div style={{marginBottom:16}}>
        <div style={{fontSize:13,color:'#9CA3AF',fontFamily:'Sora',fontWeight:500}}>
          Welcome back,
        </div>
        <div style={{fontFamily:'Sora',fontSize:26,fontWeight:800,color:'#1A1A1A',
          letterSpacing:'-.5px',lineHeight:1.1}}>
          {player.name}
        </div>
        {myRank>0&&<div style={{fontSize:12,color:'#C9A44A',fontFamily:'Sora',
          fontWeight:700,marginTop:2}}>#{myRank} no ranking</div>}
      </div>

      {/* Lives card */}
      <div style={{background:'linear-gradient(135deg,#162E1E,#1A3D28)',
        borderRadius:16,padding:'20px',marginBottom:12,
        boxShadow:'0 4px 24px rgba(22,46,30,.3)',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:-30,right:-30,width:130,height:130,
          borderRadius:'50%',background:'rgba(201,164,74,.06)'}}/>
        <div style={{fontFamily:'Sora',fontWeight:700,fontSize:10,letterSpacing:'.12em',
          textTransform:'uppercase',color:'rgba(201,164,74,.7)',marginBottom:12}}>
          YOUR LIVES
        </div>
        <ShieldLives lives={lives} max={maxL} size={26} showCount={false}/>
        <div style={{marginTop:10,fontFamily:'Sora',fontWeight:700,fontSize:12,
          color:'#C9A44A',letterSpacing:'.06em'}}>
          {lives} / {maxL} LIVES REMAINING
          {inKnockout&&<span style={{marginLeft:8,background:'rgba(201,164,74,.15)',
            padding:'2px 8px',borderRadius:10,fontSize:10}}>MATA-MATA</span>}
        </div>
      </div>

      {/* Today's pick */}
      <div style={{background:'#fff',borderRadius:16,padding:'16px',marginBottom:12,
        border:'1px solid rgba(0,0,0,.07)',boxShadow:'0 2px 12px rgba(0,0,0,.06)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
          <div style={{fontFamily:'Sora',fontWeight:700,fontSize:10,letterSpacing:'.1em',
            textTransform:'uppercase',color:'#6B6B6B'}}>TODAY'S PICK</div>
          <div style={{fontFamily:'Sora',fontWeight:600,fontSize:10,color:'#9CA3AF'}}>
            {new Date().toLocaleDateString('pt-BR',{month:'short',day:'numeric'}).toUpperCase()}
          </div>
        </div>
        {todayMs.length===0 ? (
          <div style={{textAlign:'center',padding:'16px 0',color:'#9CA3AF',fontSize:14}}>
            Sem jogos hoje
          </div>
        ) : todayPick ? (
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <FlagImage team={todayPick.team_name} size="md"/>
            <div>
              <div style={{fontFamily:'Sora',fontWeight:700,fontSize:15}}>{todayPick.team_name}</div>
              <div style={{fontSize:12,color:'#9CA3AF',marginTop:2}}>Pick confirmada ✓</div>
            </div>
            <div style={{marginLeft:'auto'}}>
              {!todayPick.result
                ? <span style={{fontFamily:'Sora',fontSize:10,fontWeight:700,
                    color:'#C9A44A',background:'#FBF5E6',padding:'4px 10px',borderRadius:20}}>
                    AGUARDANDO
                  </span>
                : todayPick.result==='win'
                  ? <span style={{fontFamily:'Sora',fontSize:10,fontWeight:700,
                      color:'#1A3D28',background:'#EBF5EE',padding:'4px 10px',borderRadius:20}}>
                      ✓ ACERTOU
                    </span>
                  : todayPick.result==='loss'
                    ? <span style={{fontFamily:'Sora',fontSize:10,fontWeight:700,
                        color:'#C4302B',background:'#FEF0EF',padding:'4px 10px',borderRadius:20}}>
                        ✗ ERROU
                      </span>
                    : <span style={{fontFamily:'Sora',fontSize:10,fontWeight:700,
                        color:'#2563EB',background:'#EFF6FF',padding:'4px 10px',borderRadius:20}}>
                        = EMPATE
                      </span>
              }
            </div>
          </div>
        ) : (
          <div>
            {todayMs.slice(0,1).map(m=>(
              <div key={m.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,flex:1}}>
                  <FlagImage team={m.home_team} size="md"/>
                  <span style={{fontFamily:'Sora',fontWeight:700,fontSize:11,textTransform:'uppercase'}}>
                    {m.home_team}
                  </span>
                </div>
                <div style={{textAlign:'center',padding:'0 12px'}}>
                  <div style={{fontFamily:'Sora',fontWeight:700,fontSize:11,color:'#9CA3AF'}}>VS</div>
                  <div style={{fontFamily:'Sora',fontWeight:800,fontSize:13,color:'#C9A44A',marginTop:2}}>
                    {fmtTime(m.utc_date)}
                  </div>
                </div>
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,flex:1}}>
                  <FlagImage team={m.away_team} size="md"/>
                  <span style={{fontFamily:'Sora',fontWeight:700,fontSize:11,textTransform:'uppercase'}}>
                    {m.away_team}
                  </span>
                </div>
              </div>
            ))}
            <button onClick={()=>navigate('/pick')}
              style={{width:'100%',padding:'13px',borderRadius:12,border:'none',
                background:'linear-gradient(135deg,#1A3D28,#1E5235)',
                color:'#fff',fontFamily:'Sora',fontSize:13,fontWeight:700,
                letterSpacing:'.06em',textTransform:'uppercase',cursor:'pointer'}}>
              MAKE YOUR PICK
            </button>
          </div>
        )}
      </div>

      {/* Countdown */}
      {nextMatch && (
        <div style={{background:'#fff',borderRadius:16,padding:'16px',marginBottom:12,
          border:'1px solid rgba(0,0,0,.07)',boxShadow:'0 2px 12px rgba(0,0,0,.06)'}}>
          <div style={{fontFamily:'Sora',fontWeight:700,fontSize:10,letterSpacing:'.1em',
            textTransform:'uppercase',color:'#6B6B6B',marginBottom:12}}>
            NEXT MATCH STARTS IN
          </div>
          <Countdown target={nextMatch.utc_date}/>
          <div style={{display:'flex',alignItems:'center',gap:8,marginTop:12}}>
            {countryCode(nextMatch.home_team)&&<img src={`https://flagcdn.com/w40/${countryCode(nextMatch.home_team)}.png`} width={28} height={20} style={{borderRadius:3,border:'1px solid rgba(0,0,0,.08)'}} alt=""/>}
            <span style={{fontFamily:'Sora',fontWeight:600,fontSize:12}}>{nextMatch.home_team}</span>
            <span style={{fontSize:11,color:'#9CA3AF',fontFamily:'Sora',fontWeight:600}}>vs</span>
            <span style={{fontFamily:'Sora',fontWeight:600,fontSize:12}}>{nextMatch.away_team}</span>
            {countryCode(nextMatch.away_team)&&<img src={`https://flagcdn.com/w40/${countryCode(nextMatch.away_team)}.png`} width={28} height={20} style={{borderRadius:3,border:'1px solid rgba(0,0,0,.08)'}} alt=""/>}
          </div>
        </div>
      )}

      {/* Leaderboard preview */}
      {leaders.length>0&&(
        <div style={{background:'#fff',borderRadius:16,padding:'16px',marginBottom:12,
          border:'1px solid rgba(0,0,0,.07)',boxShadow:'0 2px 12px rgba(0,0,0,.06)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <div style={{fontFamily:'Sora',fontWeight:700,fontSize:10,letterSpacing:'.1em',
              textTransform:'uppercase',color:'#6B6B6B'}}>LEADERBOARD</div>
            <button onClick={()=>navigate('/rankings')}
              style={{display:'flex',alignItems:'center',gap:2,fontFamily:'Sora',
                fontWeight:700,fontSize:10,color:'#C9A44A',letterSpacing:'.06em',background:'none',border:'none',cursor:'pointer'}}>
              VIEW ALL <ChevronRight size={12}/>
            </button>
          </div>
          {leaders.map((l,i)=>{
            const isMe=l.id===player.id
            const maxLl=l.inKnockout?3:6
            const medals=['1','2','3']
            return (
              <div key={l.id} style={{display:'flex',alignItems:'center',gap:10,
                padding:'9px 0',
                borderBottom:i<leaders.length-1?'1px solid rgba(0,0,0,.05)':'none',
                background:isMe?'rgba(201,164,74,.06)':'transparent',
                borderRadius:isMe?8:0,
                paddingLeft:isMe?8:0,paddingRight:isMe?8:0,
                opacity:l.eliminated?.5:1}}>
                <div style={{fontFamily:'Sora',fontWeight:800,fontSize:14,
                  width:18,textAlign:'center',color:i<3?'#C9A44A':'#9CA3AF',flexShrink:0}}>
                  {i+1}
                </div>
                <div style={{width:32,height:32,borderRadius:'50%',overflow:'hidden',
                  border:'1.5px solid rgba(201,164,74,.3)',background:'#F3F0EA',
                  display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  {l.avatar_url
                    ? <img src={l.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>
                    : <span style={{fontSize:16}}>{l.avatar||'⚽'}</span>
                  }
                </div>
                <div style={{flex:1}}>
                  <div style={{fontFamily:'Sora',fontWeight:600,fontSize:13,
                    color:isMe?'#1A3D28':'#1A1A1A'}}>
                    {l.name}{isMe?' (você)':''}
                  </div>
                </div>
                {l.eliminated
                  ? <span style={{fontFamily:'Sora',fontSize:10,fontWeight:700,
                      color:'#C4302B'}}>💀 ELIM.</span>
                  : <div style={{display:'flex',alignItems:'center',gap:3}}>
                      {Array.from({length:maxLl}).map((_,j)=>(
                        <svg key={j} width={14} height={17} viewBox="0 0 22 26" fill="none">
                          <path d="M11 1.5L2.5 5.5v7.8c0 6.8 4.2 12.6 8.5 13.9C15.3 25.9 19.5 20.1 19.5 13.3V5.5L11 1.5z"
                            fill={j<l.lives?'#C9A44A':'none'}
                            stroke={j<l.lives?'#C9A44A':'#D4CABC'}
                            strokeWidth="1.4" strokeLinejoin="round"/>
                        </svg>
                      ))}
                      <span style={{fontFamily:'Sora',fontWeight:700,fontSize:13,
                        color:'#1A1A1A',marginLeft:4}}>{l.lives}</span>
                    </div>
                }
              </div>
            )
          })}
        </div>
      )}

      {/* Sync */}
      <button onClick={handleSync} disabled={syncing}
        style={{width:'100%',padding:'12px',borderRadius:12,
          border:'1px solid rgba(0,0,0,.07)',background:'#fff',
          color:'#6B6B6B',fontFamily:'Sora',fontSize:12,fontWeight:700,
          letterSpacing:'.06em',cursor:'pointer',display:'flex',
          alignItems:'center',justifyContent:'center',gap:6,
          boxShadow:'0 1px 4px rgba(0,0,0,.04)'}}>
        <span style={syncing?{display:'inline-block',animation:'spin 1s linear infinite'}:{}}>↻</span>
        {syncing?'ATUALIZANDO...':'ATUALIZAR RESULTADOS'}
      </button>
    </div>
  )
}
