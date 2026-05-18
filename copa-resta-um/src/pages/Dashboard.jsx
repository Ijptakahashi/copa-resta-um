import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPlayerPicks, getMatches, getAllPicks, getPlayers } from '../lib/supabase'
import { computeLives, todayBrasilia, toLocalDateISO, isPickOpen,
         PHASE_LABEL, STAGE_TO_PHASE } from '../lib/gameLogic'
import { syncMatches, syncResults, processNoPicks } from '../lib/football'
import ShieldLives from '../components/ShieldLives'
import FlagImage from '../components/FlagImage'

function Countdown({ targetDate }) {
  const [time, setTime] = useState({ h:'--', m:'--', s:'--' })
  useEffect(() => {
    function tick() {
      const diff = new Date(targetDate) - Date.now()
      if (diff <= 0) { setTime({h:'00',m:'00',s:'00'}); return }
      const h = String(Math.floor(diff/3600000)).padStart(2,'0')
      const m = String(Math.floor((diff%3600000)/60000)).padStart(2,'0')
      const s = String(Math.floor((diff%60000)/1000)).padStart(2,'0')
      setTime({h,m,s})
    }
    tick(); const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [targetDate])
  return (
    <div className="countdown">
      <div className="countdown-block"><div className="countdown-num">{time.h}</div><div className="countdown-label">hrs</div></div>
      <div className="countdown-sep">:</div>
      <div className="countdown-block"><div className="countdown-num">{time.m}</div><div className="countdown-label">min</div></div>
      <div className="countdown-sep">:</div>
      <div className="countdown-block"><div className="countdown-num">{time.s}</div><div className="countdown-label">seg</div></div>
    </div>
  )
}

function ResultChip({ result }) {
  if (!result)               return <span className="result-chip chip-pending">Aguardando</span>
  if (result === 'win')      return <span className="result-chip chip-win">✓ Acertou</span>
  if (result === 'draw')     return <span className="result-chip chip-draw">= Empate</span>
  if (result === 'loss')     return <span className="result-chip chip-loss">✗ Errou</span>
  if (result === 'no_pick')  return <span className="result-chip chip-nopick">Não enviou</span>
  return null
}

export default function Dashboard({ player }) {
  const navigate = useNavigate()
  const [picks, setPicks]       = useState([])
  const [todayMatches, setTM]   = useState([])
  const [todayPick, setTP]      = useState(null)
  const [nextMatch, setNM]      = useState(null)
  const [leaders, setLeaders]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [syncing, setSyncing]   = useState(false)
  const today = todayBrasilia()

  useEffect(() => { load() }, [player.id])

  async function load() {
    setLoading(true)
    const [playerPicks, allMatches, allPicks, players] = await Promise.all([
      getPlayerPicks(player.id), getMatches(), getAllPicks(), getPlayers()
    ])
    setPicks(playerPicks)

    const dayMs = allMatches.filter(m => toLocalDateISO(m.utc_date) === today)
    setTM(dayMs)
    setTP(playerPicks.find(p => p.pick_date === today) || null)

    // Próximo jogo
    const upcoming = allMatches
      .filter(m => m.status === 'SCHEDULED' && new Date(m.utc_date) > new Date())
      .sort((a,b) => new Date(a.utc_date) - new Date(b.utc_date))[0]
    setNM(upcoming || null)

    // Mini leaderboard
    const ranked = players.map(p => {
      const pp = allPicks.filter(pk => pk.player_id === p.id)
      const { lives } = computeLives(pp)
      const correct = pp.filter(pk => pk.result === 'win').length
      return { ...p, lives, correct, eliminated: lives <= 0 }
    }).sort((a,b) => b.lives - a.lives || b.correct - a.correct)
    setLeaders(ranked.slice(0, 5))
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

  if (loading) return <div className="loading">⏳ Carregando...</div>

  const { lives, inKnockout } = computeLives(picks)
  const maxLives = inKnockout ? 3 : 6
  const eliminated = lives <= 0
  const pickOpen = isPickOpen(todayMatches)
  const hasToday = todayMatches.length > 0
  const myRank = leaders.findIndex(l => l.id === player.id) + 1

  return (
    <div className="page">
      {/* Welcome */}
      <div style={{marginBottom:20}}>
        <div style={{fontSize:13,color:'var(--n500)',marginBottom:2}}>Bem-vindo de volta,</div>
        <div style={{fontFamily:'Sora',fontSize:26,fontWeight:800,color:'var(--g800)'}}>
          {player.name} {player.avatar}
        </div>
        {myRank > 0 && <div style={{fontSize:12,color:'var(--gold-dark)',fontWeight:600}}>#{myRank} no ranking</div>}
      </div>

      {/* Lives card */}
      <div className="card-dark" style={{marginBottom:12}}>
        <div className="sora-sm" style={{color:'rgba(255,255,255,.5)',marginBottom:10}}>Vidas restantes</div>
        <ShieldLives lives={lives} max={maxLives} />
        <div style={{marginTop:10,display:'flex',gap:8}}>
          <span className={`badge ${eliminated?'badge-dead':'badge-alive'}`}>
            {eliminated ? '💀 Eliminado' : '● Vivo'}
          </span>
          {inKnockout && <span className="badge badge-gold">🔥 Mata-Mata</span>}
        </div>
      </div>

      {/* Today's pick */}
      <div className="card">
        <div className="card-label">Pick de hoje</div>
        {!hasToday ? (
          <div className="text-muted">Sem jogos hoje 😴</div>
        ) : eliminated ? (
          <div className="alert alert-error">Você foi eliminado. Torça pelos outros! ⚰️</div>
        ) : todayPick ? (
          <div>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <FlagImage team={todayPick.team_name} size="md" />
              <div>
                <div style={{fontFamily:'Sora',fontWeight:700,fontSize:16}}>{todayPick.team_name}</div>
                <div style={{fontSize:12,color:'var(--n500)'}}>{PHASE_LABEL[todayPick.phase]||todayPick.phase}</div>
              </div>
              <div style={{marginLeft:'auto'}}>
                <span className="badge badge-locked">✓ Locked In</span>
              </div>
            </div>
            <div style={{marginTop:8}}>
              {!todayPick.result
                ? <span className="result-chip chip-pending">Aguardando resultado</span>
                : <ResultChip result={todayPick.result} />}
            </div>
          </div>
        ) : pickOpen ? (
          <div>
            <div className="alert alert-warn" style={{marginBottom:10}}>
              ⏰ {todayMatches.length} jogo(s) hoje — faça sua pick antes da bola rolar!
            </div>
            <button className="btn btn-gold" onClick={() => navigate('/pick')}>
              ⚽ Fazer pick agora
            </button>
          </div>
        ) : (
          <div className="alert alert-error">⌛ Prazo encerrado — −1 vida por não enviar pick.</div>
        )}
      </div>

      {/* Countdown to next match */}
      {nextMatch && (
        <div className="card">
          <div className="card-label">Próximo jogo começa em</div>
          <Countdown targetDate={nextMatch.utc_date} />
          <div style={{marginTop:8,display:'flex',alignItems:'center',gap:8}}>
            <FlagImage team={nextMatch.home_team} size="sm" />
            <span style={{fontSize:12,fontWeight:600}}>{nextMatch.home_team}</span>
            <span style={{fontSize:11,color:'var(--n400)'}}>vs</span>
            <span style={{fontSize:12,fontWeight:600}}>{nextMatch.away_team}</span>
            <FlagImage team={nextMatch.away_team} size="sm" />
          </div>
        </div>
      )}

      {/* Mini leaderboard */}
      {leaders.length > 0 && (
        <div className="card">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <div className="card-label" style={{margin:0}}>Leaderboard</div>
            <button onClick={()=>navigate('/rankings')} style={{fontSize:11,color:'var(--gold-dark)',fontWeight:700,background:'none',fontFamily:'Sora'}}>
              VER TUDO →
            </button>
          </div>
          {leaders.map((l, i) => {
            const medals = ['🥇','🥈','🥉']
            const isMe = l.id === player.id
            return (
              <div key={l.id} style={{
                display:'flex',alignItems:'center',gap:10,padding:'8px 0',
                borderBottom: i < leaders.length-1 ? '1px solid var(--n200)' : 'none',
                opacity: l.eliminated ? .45 : 1,
                background: isMe ? 'var(--gold-light)' : 'transparent',
                borderRadius: isMe ? 8 : 0, padding: isMe ? '8px 10px' : '8px 0',
              }}>
                <div style={{fontFamily:'Sora',fontWeight:800,fontSize:14,width:20,textAlign:'center'}}>
                  {medals[i] || `${i+1}`}
                </div>
                <span style={{fontSize:20}}>{l.avatar||'⚽'}</span>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,fontSize:13}}>{l.name}{isMe?' (você)':''}</div>
                </div>
                <div style={{display:'flex',gap:6,alignItems:'center'}}>
                  <span style={{fontFamily:'Sora',fontWeight:800,fontSize:16,color:'var(--gold-dark)'}}>{l.lives}</span>
                  <span style={{fontSize:11,color:'var(--n400)'}}>vidas</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Sync */}
      <button className="btn btn-ghost" onClick={handleSync} disabled={syncing} style={{fontSize:12}}>
        {syncing ? '⏳ Sincronizando...' : '🔄 Atualizar resultados'}
      </button>
    </div>
  )
}
