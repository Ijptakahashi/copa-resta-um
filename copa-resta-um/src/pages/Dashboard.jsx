import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, RefreshCw } from 'lucide-react'
import { getPlayerPicks, getMatches, getAllPicks, getPlayers } from '../lib/supabase'
import { computeLives, todayBrasilia, toLocalDateISO, isPickOpen,
         pickDeadline, r32Deadline, isR32Open, r16Deadline, isR16Open, qfDeadline, isQfOpen, canonTeam } from '../lib/gameLogic'
import { sideOfTeam as sideOfTeamShared } from '../lib/r32bracket'
import { sideOfTeamR16 } from '../lib/r16bracket'
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
  // TRAVA DUPLA: só revela se existe deadline E ele já passou de verdade.
  // Qualquer ambiguidade → mantém OCULTO (open=true).
  const revealed = !!deadline && new Date() >= deadline
  const open = !revealed
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


// ─── Mata-mata: mostra perdas e picks em layout próprio por fase ───
function KnockoutCasualties({ allPlayers, allPicks, phase='r32', label='R32' }) {
  const fallen = allPlayers.map(pl => {
    const losses = allPicks.filter(p =>
      p.player_id === pl.id && p.phase === phase &&
      p.team_name !== 'no_pick' && p.result === 'loss')
    return losses.length ? { player: pl, teams: losses.map(l => l.team_name) } : null
  }).filter(Boolean)

  if (!fallen.length) return null

  return (
    <div style={{background:'#FEF0EF',borderRadius:16,padding:'14px 16px',marginBottom:12,
      border:'1px solid rgba(196,48,43,.25)',boxShadow:'0 2px 12px rgba(196,48,43,.08)'}}>
      <div style={{fontFamily:'Sora',fontWeight:700,fontSize:10,letterSpacing:'.1em',
        textTransform:'uppercase',color:'#C4302B',marginBottom:10,
        display:'flex',alignItems:'center',gap:6}}>
        <span style={{fontSize:13}}>💀</span> Baixas do {label}
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {fallen.map(({player, teams}) => (
          <div key={player.id} style={{display:'flex',alignItems:'center',gap:10}}>
            <Avatar name={player.name} photoUrl={player.avatar_url} size={28} ring="#C4302B"/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:'Sora',fontWeight:700,fontSize:13,color:'#1A1A1A',
                overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                {player.name}
              </div>
              <div style={{fontFamily:'Inter',fontSize:11,color:'#9B3A35'}}>
                caiu com {teams.join(', ')} · −{teams.length} vida{teams.length>1?'s':''}
              </div>
            </div>
            <div style={{display:'flex',gap:4}}>
              {teams.map((t,i) => {
                const code = countryCode(t)
                return code ? (
                  <img key={i} src={`https://flagcdn.com/w40/${code}.png`} alt={t}
                    style={{width:22,height:16,borderRadius:2,objectFit:'cover',
                      border:'1px solid rgba(0,0,0,.1)',opacity:.6}}/>
                ) : null
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function KnockoutPicksReveal({ allPlayers, allPicks, open, deadline, phase='r32', label='R32' }) {
  if (!allPlayers.length) return null
  const revealed = !open
  const sideFn = phase === 'r16' ? sideOfTeamR16 : sideOfTeamShared

  function slotsFor(playerId) {
    const picks = allPicks.filter(p => p.player_id === playerId && p.phase === phase && p.team_name !== 'no_pick')
    if (phase === 'qf') return [picks[0]]   // pick única, sem lados
    const left  = picks.filter(p => sideFn(p.team_name, canonTeam) === 'left')
    const right = picks.filter(p => sideFn(p.team_name, canonTeam) === 'right')
    if (phase === 'r16') return [left[0], right[0]]
    return [left[0], left[1], right[0], right[1]]
  }

  return (
    <div style={{background:'#fff',borderRadius:16,padding:'16px',marginBottom:12,
      border:'1px solid rgba(0,0,0,.07)',boxShadow:'0 2px 12px rgba(0,0,0,.05)'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
        <div style={{fontFamily:'Sora',fontWeight:700,fontSize:10,letterSpacing:'.1em',
          textTransform:'uppercase',color:'#6B6B6B'}}>PICKS DO {label}</div>
        {!revealed && deadline && (
          <div style={{fontFamily:'Sora',fontSize:10,fontWeight:600,color:'#9CA3AF'}}>
            revela às {new Date(deadline).toLocaleTimeString('pt-BR',
              {hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'})}
          </div>
        )}
        {revealed && (
          <span style={{fontFamily:'Sora',fontSize:9,fontWeight:700,color:'#1A3D28',
            background:'#EBF5EE',padding:'3px 8px',borderRadius:12,letterSpacing:'.05em'}}>
            REVELADO
          </span>
        )}
      </div>
      <div style={{fontFamily:'Inter',fontSize:11,color:'#9CA3AF',textAlign:'center',marginBottom:14}}>
        {maxPerSide} pick no lado esquerdo + {maxPerSide} pick no lado direito
      </div>

      <div style={{display:'flex',flexWrap:'wrap',gap:14,justifyContent:'center'}}>
        {allPlayers
          .filter(p => computeLives(allPicks.filter(pk=>pk.player_id===p.id)).lives > 0)
          .map(p => {
          const slots = slotsFor(p.id)
          const cardW = phase === 'r16' ? 76 : 84
          return (
            <div key={p.id} style={{display:'flex',flexDirection:'column',
              alignItems:'center',gap:6,width:cardW}}>
              <Avatar name={p.name} photoUrl={p.avatar_url} size={32}/>
              <div style={{fontFamily:'Sora',fontWeight:600,fontSize:9,textAlign:'center',
                color:'#6B6B6B',lineHeight:1.2,width:cardW,overflow:'hidden',
                textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:4,width:cardW}}>
                {slots.map((pick, i) => {
                  const code = pick && revealed ? countryCode(pick.team_name) : null
                  const isSeparator = phase === 'r16' ? i === 1 : i === 2
                  return (
                    <div key={i} style={{display:'flex',alignItems:'center'}}>
                      {isSeparator && <div style={{width:1,height:16,background:'rgba(0,0,0,.12)',margin:'0 3px'}}/>}
                      <div style={{width:phase === 'r16' ? 22 : 16,height:phase === 'r16' ? 22 : 16,borderRadius:'50%',overflow:'hidden',
                        border:`1.5px solid ${pick?(revealed?'#C9A44A':'rgba(0,0,0,.15)'):'rgba(0,0,0,.08)'}`,
                        background:'#F8F4EE',display:'flex',alignItems:'center',justifyContent:'center',
                        flexShrink:0}}>
                        {code ? <img src={`https://flagcdn.com/w40/${code}.png`}
                              style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>
                          : pick && !revealed ? <div style={{width:8,height:8,borderRadius:'50%',background:'rgba(0,0,0,.2)'}}/>
                          : <div style={{width:6,height:6,borderRadius:'50%',background:'rgba(0,0,0,.06)'}}/>
                        }
                      </div>
                    </div>
                  )
                })}
              </div>
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
  const [isR32Phase, setIsR32]  = useState(false)
  const [r32Counts, setR32Counts] = useState({ left:0, right:0 })
  const [r32Dl, setR32Dl]       = useState(null)
  const [r32Open, setR32OpenSt] = useState(true)
  const [knockoutPhase, setKnockoutPhase] = useState('r32')
  const [knockoutPhaseLabel, setKnockoutPhaseLabel] = useState('R32')
  const [knockoutMaxPerSide, setKnockoutMaxPerSide] = useState(2)
  const today = todayBrasilia()

  useEffect(() => { load() }, [player.id])

  // Segurança: o Dashboard não deve processar resultados nem criar no_picks.
  // Essas rotinas alteram o banco global e devem ficar restritas ao /admin.
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [player.id])

  async function load() {
    setLoading(true)
    try {
      // Timeout global: se QUALQUER query pendurar (não erra, não resolve), a
      // tela não pode ficar presa em "Carregando" pra sempre. 8s e segue com o
      // que veio (ou vazio), deixando o app abrir em vez de travar.
      const withTimeout = (p, ms, fallback) => Promise.race([
        p, new Promise(r => setTimeout(() => r(fallback), ms)),
      ])
      const [pp, allMs, aPickS, players] = await Promise.all([
        withTimeout(getPlayerPicks(player.id), 8000, []),
        withTimeout(getMatches(),             8000, []),
        withTimeout(getAllPicks(),            8000, []),
        withTimeout(getPlayers(),             8000, []),
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

      // Detecta fase ativa do mata-mata. ANCORA nos deadlines fixos.
      const hasR32Games = allMs.some(m => m.stage === 'ROUND_OF_32')
      const hasR16Games = allMs.some(m => m.stage === 'ROUND_OF_16')
      const hasQfGames  = allMs.some(m => m.stage === 'QUARTER_FINALS')

      // Fase mais avançada cujo mercado já fechou vence: QF > R16 > R32.
      const qfActive  = hasQfGames && !isQfOpen(allMs)
      const r16Active = !qfActive && hasR16Games && !isR16Open(allMs)
      const r32Active = !qfActive && !r16Active && hasR32Games && !isR32Open(allMs)
      setIsR32(qfActive || r16Active || r32Active)
      if (qfActive) {
        const qfPicks = pp.filter(p => p.phase === 'qf' && p.team_name !== 'no_pick')
        setR32Counts({ left: qfPicks.length >= 1 ? 1 : 0, right: 0 })
        setR32Dl(qfDeadline(allMs))
        setR32OpenSt(isQfOpen(allMs))
        setKnockoutPhase('qf')
        setKnockoutPhaseLabel('Quartas')
        setKnockoutMaxPerSide(1)
      } else if (r16Active) {
        const r16Picks = pp.filter(p => p.phase === 'r16' && p.team_name !== 'no_pick')
        const left  = r16Picks.filter(p => sideOfTeamR16(p.team_name, canonTeam) === 'left').length
        const right = r16Picks.filter(p => sideOfTeamR16(p.team_name, canonTeam) === 'right').length
        setR32Counts({ left, right })
        setR32Dl(r16Deadline(allMs))
        setR32OpenSt(isR16Open(allMs))
        setKnockoutPhase('r16')
        setKnockoutPhaseLabel('R16')
        setKnockoutMaxPerSide(1)
      } else if (r32Active) {
        const r32Picks = pp.filter(p => p.phase === 'r32' && p.team_name !== 'no_pick')
        const left  = r32Picks.filter(p => sideOfTeamShared(p.team_name, canonTeam) === 'left').length
        const right = r32Picks.filter(p => sideOfTeamShared(p.team_name, canonTeam) === 'right').length
      setR32Counts({ left, right })
      setR32Dl(r32Deadline(allMs))
      setR32OpenSt(isR32Open(allMs))
      setKnockoutPhase('r32')
        setKnockoutPhaseLabel('R32')
        setKnockoutMaxPerSide(2)
      }
    } catch (e) {
      console.error('Dashboard load() falhou:', e)
    } finally {
      setLoading(false)
    }
  }

  async function handleSync() {
    setSyncing(true)
    try {
      // Botão de segurança: apenas recarrega os dados já existentes.
      // Não sincroniza partidas, não processa resultados e não cria no_picks.
      await load()
    } catch(e) { console.error(e) } finally { setSyncing(false) }
  }

  if (loading) return <DashboardSkeleton/>

  const {lives, inKnockout} = computeLives(picks)
  const maxL = 6   // teto de vidas é 6 o torneio inteiro
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

      {/* Mata-mata: indicador de progresso por lado, OU Today's Pick (fase de grupos) */}
      {isR32Phase ? (
        <div className="fade-up fade-up-2"
          onClick={()=>navigate(knockoutPhase==='qf'?'/qf':knockoutPhase==='r16'?'/r16':'/r32')}
          style={{background:'#fff',borderRadius:16,padding:'16px',marginBottom:12,cursor:'pointer',
          border:'1px solid rgba(0,0,0,.07)',boxShadow:'0 2px 12px rgba(0,0,0,.05)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <div style={{fontFamily:'Sora',fontWeight:700,fontSize:10,letterSpacing:'.1em',
              textTransform:'uppercase',color:'#6B6B6B'}}>{`SUAS PICKS — ${knockoutPhaseLabel}`}</div>
            {!r32Open && <span style={{fontFamily:'Sora',fontSize:9,fontWeight:700,color:'#1A3D28',
              background:'#EBF5EE',padding:'3px 8px',borderRadius:12}}>FECHADO</span>}
          </div>
          {knockoutPhase==='qf' ? (
            <div style={{background: r32Counts.left>=1?'rgba(201,164,74,.08)':'#F8F4EE',
              borderRadius:12,padding:'14px',textAlign:'center',
              border:`1.5px solid ${r32Counts.left>=1?'rgba(201,164,74,.35)':'rgba(0,0,0,.06)'}`}}>
              <div style={{fontFamily:'Sora',fontWeight:700,fontSize:9,letterSpacing:'.08em',
                color:'#9A9384',marginBottom:4}}>SUA SELEÇÃO</div>
              <div style={{fontFamily:'Sora',fontWeight:800,fontSize:22,
                color:r32Counts.left>=1?'#A07830':'#1A3D28'}}>{r32Counts.left>=1?'1/1':'0/1'}</div>
              {r32Counts.left>=1 && <div style={{fontFamily:'Sora',fontSize:8,fontWeight:700,color:'#A07830',
                marginTop:2,letterSpacing:'.04em'}}>✓ CONFIRMADO</div>}
            </div>
          ) : (
          <div style={{display:'flex',gap:10}}>
            {[['ESQUERDO', r32Counts.left],['DIREITO', r32Counts.right]].map(([label,cnt])=>(
              <div key={label} style={{flex:1,background: cnt===knockoutMaxPerSide?'rgba(201,164,74,.08)':'#F8F4EE',
                borderRadius:12,padding:'12px',textAlign:'center',
                border:`1.5px solid ${cnt===knockoutMaxPerSide?'rgba(201,164,74,.35)':'rgba(0,0,0,.06)'}`}}>
                <div style={{fontFamily:'Sora',fontWeight:700,fontSize:9,letterSpacing:'.08em',
                  color:'#9A9384',marginBottom:4}}>{label}</div>
                <div style={{fontFamily:'Sora',fontWeight:800,fontSize:22,
                  color:cnt===knockoutMaxPerSide?'#A07830':'#1A3D28'}}>{cnt}/{knockoutMaxPerSide}</div>
                {cnt===knockoutMaxPerSide && <div style={{fontFamily:'Sora',fontSize:8,fontWeight:700,color:'#A07830',
                  marginTop:2,letterSpacing:'.04em'}}>✓ CONFIRMADO</div>}
              </div>
            ))}
          </div>
          )}
          {r32Open && r32Dl && (
            <div style={{textAlign:'center',fontSize:11,color:'#9CA3AF',marginTop:10,fontFamily:'Inter'}}>
              Toque para escolher sua seleção
            </div>
          )}
        </div>
      ) : (
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
      )}

      {/* Today's picks reveal — só faz sentido na fase de grupos */}
      {!isR32Phase && (
        <TodayPicksReveal
          todayMs={todayMs}
          allPlayers={allPlayers}
          allPicks={allPicks}
          today={today}
        />
      )}

      {/* Quem perdeu vida no R32 (ex.: pickou time que caiu) — destaque */}
      {isR32Phase && (
        <KnockoutCasualties allPlayers={allPlayers} allPicks={allPicks} phase={knockoutPhase} label={knockoutPhaseLabel} />
      )}

      {/* R32 picks reveal — todos os jogadores, 4 slots (2+2), revela no fechamento da fase */}
      {isR32Phase && (
        <KnockoutPicksReveal
          allPlayers={allPlayers}
          allPicks={allPicks}
          open={r32Open}
          deadline={r32Dl}
          phase={knockoutPhase}
          label={knockoutPhaseLabel}
        />
      )}

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
            const maxLl = 6
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

      {/* Refresh only: não altera banco */}
      <button onClick={handleSync} disabled={syncing}
        style={{width:'100%',padding:'12px',borderRadius:12,
          border:'1px solid rgba(0,0,0,.07)',background:'#fff',
          color:'#6B6B6B',fontFamily:'Sora',fontSize:12,fontWeight:700,
          letterSpacing:'.06em',cursor:'pointer',display:'flex',
          alignItems:'center',justifyContent:'center',gap:6,
          boxShadow:'0 1px 4px rgba(0,0,0,.04)'}}>
        <RefreshCw size={13} style={syncing?{animation:'spin 1s linear infinite'}:{}}/>
        {syncing ? 'RECARREGANDO...' : 'RECARREGAR DADOS'}
      </button>
    </div>
  )
}
