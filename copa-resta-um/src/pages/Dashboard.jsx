import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, RefreshCw } from 'lucide-react'
import { getPlayerPicks, getMatches, getAllPicks, getPlayers } from '../lib/supabase'
import { computeLives, todayBrasilia, toLocalDateISO, isPickOpen,
         pickDeadline } from '../lib/gameLogic'
import { syncMatches, syncResults, processNoPicks } from '../lib/football'
import { ShieldIcon } from '../components/ShieldLives'
import { countryCode } from '../components/FlagImage'
import Avatar from '../components/Avatar'
import { DashboardSkeleton } from '../components/Skeletons'

function Countdown({ target, style: extraStyle={} }) {
  const [t, setT] = useState({ h:'--', m:'--', s:'--' })
  useEffect(() => {
    function tick() {
      const d = new Date(target) - Date.now()
      if (d <= 0) { setT({ h:'00', m:'00', s:'00' }); return }
      setT({
        h: String(Math.floor(d/3600000)).padStart(2,'0'),
        m: String(Math.floor((d%3600000)/60000)).padStart(2,'0'),
        s: String(Math.floor((d%60000)/1000)).padStart(2,'0'),
      })
    }
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id)
  }, [target])
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:4, ...extraStyle }}>
      {[t.h, t.m, t.s].map((v,i) => (
        <span key={i} style={{display:'flex',alignItems:'center',gap:4}}>
          <span style={{fontFamily:'Sora',fontWeight:800,fontSize:24,color:'#1A3D28',
            background:'#fff',borderRadius:8,padding:'4px 10px',
            border:'1px solid rgba(0,0,0,.07)',lineHeight:1,
            boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>{v}</span>
          {i<2&&<span style={{fontFamily:'Sora',fontWeight:800,fontSize:20,color:'#C9A44A'}}>:</span>}
        </span>
      ))}
    </div>
  )
}

// Today's picks reveal panel
function TodayPicksReveal({ todayMs, allPlayers, allPicks, today }) {
  const deadline = pickDeadline(todayMs)
  const open = isPickOpen(todayMs)
  if (!todayMs.length || !allPlayers.length) return null

  return (
    <div style={{background:'#fff',borderRadius:16,padding:'16px',marginBottom:12,
      border:'1px solid rgba(0,0,0,.07)',boxShadow:'0 2px 12px rgba(0,0,0,.05)'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
        <div style={{fontFamily:'Sora',fontWeight:700,fontSize:10,letterSpacing:'.1em',
          textTransform:'uppercase',color:'#6B6B6B'}}>PICKS DO DIA</div>
        {open && deadline && (
          <div style={{fontFamily:'Sora',fontSize:10,fontWeight:600,color:'#9CA3AF'}}>
            revela às {new Date(deadline).toLocaleTimeString('pt-BR',
              {hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'})}
          </div>
        )}
        {!open && (
          <span style={{fontFamily:'Sora',fontSize:9,fontWeight:700,color:'#1A3D28',
            background:'#EBF5EE',padding:'3px 8px',borderRadius:12,letterSpacing:'.05em'}}>
            REVELADO
          </span>
        )}
      </div>

      <div style={{display:'flex',flexWrap:'wrap',gap:12}}>
        {allPlayers.map(p => {
          const pick = allPicks.find(pk => pk.player_id === p.id && pk.pick_date === today)
          const code = pick && !open ? countryCode(pick.team_name) : null
          const eliminated = computeLives(allPicks.filter(pk=>pk.player_id===p.id)).lives <= 0

          return (
            <div key={p.id} style={{display:'flex',flexDirection:'column',
              alignItems:'center',gap:5,width:52}}>
              {/* Player avatar */}
              <Avatar name={p.name} photoUrl={p.avatar_url} size={36}
                ring={eliminated?'#C4302B':null} dim={eliminated}/>
              <div style={{fontFamily:'Sora',fontWeight:600,fontSize:8,textAlign:'center',
                color:'#6B6B6B',lineHeight:1.2,maxWidth:52,overflow:'hidden',
                textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</div>
              {/* Pick slot */}
              <div style={{width:32,height:32,borderRadius:'50%',overflow:'hidden',
                border:`2px solid ${!open&&pick?'#C9A44A':eliminated?'#C4302B':'rgba(0,0,0,.1)'}`,
                background:'#F8F4EE',display:'flex',alignItems:'center',justifyContent:'center',
                flexShrink:0}}>
                {eliminated ? (
                  <span style={{fontSize:14}}>💀</span>
                ) : !open && pick && code ? (
                  <img src={`https://flagcdn.com/w80/${code}.png`}
                    style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>
                ) : !open && pick && !code ? (
                  <span style={{fontFamily:'Sora',fontSize:8,fontWeight:700,color:'#9CA3AF'}}>?</span>
                ) : (
                  <div style={{width:12,height:12,borderRadius:'50%',
                    background:'rgba(0,0,0,.08)'}}/>
                )}
              </div>
              {/* Result chip */}
              {!open && pick && pick.result && (
                <div style={{fontFamily:'Sora',fontSize:7,fontWeight:700,
                  padding:'2px 5px',borderRadius:8,
                  background:pick.result==='win'?'#EBF5EE':pick.result==='loss'?'#FEF0EF':
                    pick.result==='draw'?'#EFF6FF':'#F3F0EA',
                  color:pick.result==='win'?'#1A3D28':pick.result==='loss'?'#C4302B':
                    pick.result==='draw'?'#2563EB':'#9CA3AF'}}>
                  {pick.result==='win'?'✓':pick.result==='loss'?'✗':
                   pick.result==='draw'?'=':'–'}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Dashboard({ player }) {
  const navigate   = useNavigate()
  const [picks, setPicks]       = useState([])
  const [todayMs, setTodayMs]   = useState([])
  const [todayPick, setTP]      = useState(null)
  const [nextMatch, setNM]      = useState(null)
  const [leaders, setLeaders]   = useState([])
  const [allPlayers, setAllP]   = useState([])
  const [allPicks, setAllPicks] = useState([])
  const [loading, setLoading]   = useState(true)
  const [syncing, setSyncing]   = useState(false)
  const today = todayBrasilia()

  useEffect(() => { load() }, [player.id])

  // Auto-sync: ao montar e a cada 60s — busca scores, processa picks e no-picks
  useEffect(() => {
    let alive = true
    async function autoSync() {
      try {
        const players = await getPlayers()
        await syncResults(players)              // scores ESPN + resolve picks
        const ms = await getMatches()
        await processNoPicks(players, ms)        // quem não pickou perde vida
        if (alive) await load()
      } catch(e) { console.warn('auto-sync:', e.message) }
    }
    autoSync()                                   // roda imediatamente ao abrir
    const id = setInterval(autoSync, 60 * 1000)  // e a cada 60 segundos
    // Re-sincroniza quando o app volta ao foco
    const onVis = () => { if (document.visibilityState === 'visible') autoSync() }
    document.addEventListener('visibilitychange', onVis)
    return () => { alive = false; clearInterval(id); document.removeEventListener('visibilitychange', onVis) }
  }, [])

  async function load() {
    setLoading(true)
    const [pp, allMs, aPickS, players] = await Promise.all([
      getPlayerPicks(player.id), getMatches(), getAllPicks(), getPlayers()
    ])
    setPicks(pp); setAllP(players); setAllPicks(aPickS)
    const dayMs = allMs.filter(m => toLocalDateISO(m.utc_date) === today)
    setTodayMs(dayMs)
    setTP(pp.find(p => p.pick_date === today) || null)
    const upcoming = allMs
      .filter(m => m.status==='SCHEDULED' && new Date(m.utc_date) > new Date())
      .sort((a,b) => new Date(a.utc_date)-new Date(b.utc_date))[0]
    setNM(upcoming || null)
    const ranked = players.map(p => {
      const pp2 = aPickS.filter(pk => pk.player_id===p.id)
      const {lives} = computeLives(pp2)
      const correct = pp2.filter(pk => pk.result==='win').length
      return {...p, lives, correct, eliminated:lives<=0}
    }).sort((a,b) => b.lives-a.lives||b.correct-a.correct)
    setLeaders(ranked.slice(0,5))
    setLoading(false)
  }

  async function handleSync() {
    setSyncing(true)
    try {
      const players = await getPlayers()
      await syncMatches()
      await syncResults(players)
      const allMs = await getMatches()
      await processNoPicks(players, allMs)
      await load()
    } catch(e) { console.error(e) } finally { setSyncing(false) }
  }

  if (loading) return <DashboardSkeleton/>

  const {lives, inKnockout} = computeLives(picks)
  const maxL = inKnockout ? 3 : 6
  const myRank = leaders.findIndex(l => l.id===player.id)+1
  const pickOpen = isPickOpen(todayMs)

  function fmtTime(u) {
    return new Date(u).toLocaleTimeString('pt-BR',
      {hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'})
  }
  function getFlagImg(team, size=28) {
    const code = countryCode(team)
    if (!code) return null
    return <img src={`https://flagcdn.com/w40/${code}.png`} width={size} height={Math.round(size*.7)}
      style={{borderRadius:3,border:'1px solid rgba(0,0,0,.08)',flexShrink:0}} alt={team}/>
  }

  return (
    <div className="page">
      {/* Greeting */}
      <div style={{marginBottom:16}}>
        <div style={{fontSize:13,color:'#9CA3AF',fontFamily:'Sora',fontWeight:500}}>Welcome back,</div>
        <div style={{fontFamily:'Sora',fontSize:26,fontWeight:800,color:'#1A1A1A',
          letterSpacing:'-.5px',lineHeight:1.1}}>{player.name}</div>
        {myRank>0&&<div style={{fontSize:12,color:'#C9A44A',fontFamily:'Sora',fontWeight:700,marginTop:2}}>
          #{myRank} no ranking
        </div>}
      </div>

      {/* Lives */}
      <div className="fade-up fade-up-1" style={{background:'linear-gradient(135deg,#162E1E,#1A3D28)',borderRadius:16,
        padding:'20px',marginBottom:12,boxShadow:'0 4px 24px rgba(22,46,30,.3)',
        position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:-30,right:-30,width:130,height:130,
          borderRadius:'50%',background:'rgba(201,164,74,.06)'}}/>
        <div style={{fontFamily:'Sora',fontWeight:700,fontSize:10,letterSpacing:'.12em',
          textTransform:'uppercase',color:'rgba(201,164,74,.7)',marginBottom:12}}>YOUR LIVES</div>
        <div style={{display:'flex',alignItems:'center',gap:5,flexWrap:'wrap'}}>
          {Array.from({length:maxL}).map((_,i)=>(
            <ShieldIcon key={i} active={i<lives} size={26}/>
          ))}
        </div>
        <div style={{marginTop:10,fontFamily:'Sora',fontWeight:700,fontSize:12,
          color:'#C9A44A',letterSpacing:'.06em'}}>
          {lives} / {maxL} LIVES REMAINING
        </div>
      </div>

      {/* Today's Pick */}
      <div className="fade-up fade-up-2" style={{background:'#fff',borderRadius:16,padding:'16px',marginBottom:12,
        border:'1px solid rgba(0,0,0,.07)',boxShadow:'0 2px 12px rgba(0,0,0,.05)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
          <div style={{fontFamily:'Sora',fontWeight:700,fontSize:10,letterSpacing:'.1em',
            textTransform:'uppercase',color:'#6B6B6B'}}>TODAY'S PICK</div>
          <div style={{fontFamily:'Sora',fontWeight:600,fontSize:10,color:'#9CA3AF'}}>
            {new Date().toLocaleDateString('pt-BR',{day:'numeric',month:'short'}).toUpperCase()}
          </div>
        </div>
        {todayMs.length===0 ? (
          <div style={{textAlign:'center',padding:'12px 0',color:'#9CA3AF',fontSize:14,fontFamily:'Inter'}}>
            Sem jogos hoje
          </div>
        ) : todayPick ? (
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:44,height:44,borderRadius:'50%',overflow:'hidden',
              border:'2px solid #C9A44A',flexShrink:0}}>
              {countryCode(todayPick.team_name)
                ? <img src={`https://flagcdn.com/w80/${countryCode(todayPick.team_name)}.png`}
                    style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>
                : <span style={{fontSize:22}}>{todayPick.team_name.slice(0,2)}</span>
              }
            </div>
            <div style={{flex:1}}>
              <div style={{fontFamily:'Sora',fontWeight:700,fontSize:15}}>{todayPick.team_name}</div>
              <div style={{fontSize:11,color:'#9CA3AF',marginTop:1}}>Pick confirmada ✓</div>
            </div>
            {todayPick.result && (
              <span style={{fontFamily:'Sora',fontSize:10,fontWeight:700,padding:'4px 10px',borderRadius:12,
                background:todayPick.result==='win'?'#EBF5EE':todayPick.result==='loss'?'#FEF0EF':'#EFF6FF',
                color:todayPick.result==='win'?'#1A3D28':todayPick.result==='loss'?'#C4302B':'#2563EB'}}>
                {todayPick.result==='win'?'✓ ACERTOU':todayPick.result==='loss'?'✗ ERROU':'= EMPATE'}
              </span>
            )}
          </div>
        ) : pickOpen ? (
          <>
            {todayMs.slice(0,1).map(m => (
              <div key={m.id} style={{display:'flex',alignItems:'center',
                justifyContent:'space-between',marginBottom:14}}>
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,flex:1}}>
                  <div style={{width:52,height:52,borderRadius:'50%',overflow:'hidden',
                    border:'1.5px solid rgba(0,0,0,.1)'}}>
                    {countryCode(m.home_team)
                      ? <img src={`https://flagcdn.com/w80/${countryCode(m.home_team)}.png`}
                          style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>
                      : null}
                  </div>
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
                  <div style={{width:52,height:52,borderRadius:'50%',overflow:'hidden',
                    border:'1.5px solid rgba(0,0,0,.1)'}}>
                    {countryCode(m.away_team)
                      ? <img src={`https://flagcdn.com/w80/${countryCode(m.away_team)}.png`}
                          style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>
                      : null}
                  </div>
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
          </>
        ) : (
          <div style={{textAlign:'center',padding:'12px 0',color:'#9CA3AF',fontSize:13,fontFamily:'Inter'}}>
            Prazo encerrado para hoje
          </div>
        )}
      </div>

      {/* Today's picks reveal */}
      <TodayPicksReveal
        todayMs={todayMs}
        allPlayers={allPlayers}
        allPicks={allPicks}
        today={today}
      />

      {/* Next match countdown — CENTERED */}
      {nextMatch && (
        <div className="fade-up fade-up-3" style={{background:'#fff',borderRadius:16,padding:'20px 16px',marginBottom:12,
          border:'1px solid rgba(0,0,0,.07)',boxShadow:'0 2px 12px rgba(0,0,0,.05)',
          textAlign:'center'}}>
          <div style={{fontFamily:'Sora',fontWeight:700,fontSize:10,letterSpacing:'.1em',
            textTransform:'uppercase',color:'#6B6B6B',marginBottom:14}}>NEXT MATCH STARTS IN</div>
          <Countdown target={nextMatch.utc_date}/>
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',
            gap:8,marginTop:14}}>
            {getFlagImg(nextMatch.home_team, 24)}
            <span style={{fontFamily:'Sora',fontWeight:600,fontSize:12}}>{nextMatch.home_team}</span>
            <span style={{fontSize:11,color:'#9CA3AF',fontFamily:'Sora',fontWeight:600}}>vs</span>
            <span style={{fontFamily:'Sora',fontWeight:600,fontSize:12}}>{nextMatch.away_team}</span>
            {getFlagImg(nextMatch.away_team, 24)}
          </div>
        </div>
      )}

      {/* Leaderboard preview */}
      {leaders.length>0&&(
        <div className="fade-up fade-up-4" style={{background:'#fff',borderRadius:16,padding:'16px',marginBottom:12,
          border:'1px solid rgba(0,0,0,.07)',boxShadow:'0 2px 12px rgba(0,0,0,.05)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <div style={{fontFamily:'Sora',fontWeight:700,fontSize:10,letterSpacing:'.1em',
              textTransform:'uppercase',color:'#6B6B6B'}}>LEADERBOARD</div>
            <button onClick={()=>navigate('/rankings')}
              style={{display:'flex',alignItems:'center',gap:2,fontFamily:'Sora',
                fontWeight:700,fontSize:10,color:'#C9A44A',letterSpacing:'.06em',
                background:'none',border:'none',cursor:'pointer'}}>
              VIEW ALL <ChevronRight size={12}/>
            </button>
          </div>
          {leaders.map((l,i)=>{
            const isMe = l.id===player.id
            const maxLl = l.inKnockout?3:6
            return(
              <div key={l.id} style={{display:'flex',alignItems:'center',gap:10,
                padding:'9px 0',
                borderBottom:i<leaders.length-1?'1px solid rgba(0,0,0,.05)':'none',
                background:isMe?'rgba(201,164,74,.06)':'transparent',
                borderRadius:isMe?8:0,paddingLeft:isMe?8:0,paddingRight:isMe?8:0,
                opacity:l.eliminated?.5:1}}>
                <div style={{fontFamily:'Sora',fontWeight:800,fontSize:14,
                  width:18,textAlign:'center',color:i<3?'#C9A44A':'#9CA3AF',flexShrink:0}}>
                  {i+1}
                </div>
                <Avatar name={l.name} photoUrl={l.avatar_url} size={32}
                  ring={isMe?'rgba(201,164,74,.5)':null}/>
                <div style={{flex:1}}>
                  <div style={{fontFamily:'Sora',fontWeight:600,fontSize:13,color:'#1A1A1A'}}>
                    {l.name}{isMe?' (você)':''}
                  </div>
                </div>
                {l.eliminated ? (
                  <span style={{fontFamily:'Sora',fontSize:10,fontWeight:700,color:'#C4302B'}}>💀</span>
                ) : (
                  <div style={{display:'flex',alignItems:'center',gap:3}}>
                    {Array.from({length:maxLl}).map((_,j)=>(
                      <svg key={j} width={13} height={16} viewBox="0 0 22 26" fill="none">
                        <path d="M11 1.5L2.5 5.5v7.8c0 6.8 4.2 12.6 8.5 13.9C15.3 25.9 19.5 20.1 19.5 13.3V5.5L11 1.5z"
                          fill={j<l.lives?'#C9A44A':'none'}
                          stroke={j<l.lives?'#C9A44A':'#D4CABC'}
                          strokeWidth="1.4" strokeLinejoin="round"/>
                      </svg>
                    ))}
                    <span style={{fontFamily:'Sora',fontWeight:700,fontSize:13,
                      color:'#1A1A1A',marginLeft:4}}>{l.lives}</span>
                  </div>
                )}
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
        <RefreshCw size={13} style={syncing?{animation:'spin 1s linear infinite'}:{}}/>
        {syncing ? 'ATUALIZANDO...' : 'ATUALIZAR RESULTADOS'}
      </button>
    </div>
  )
}
