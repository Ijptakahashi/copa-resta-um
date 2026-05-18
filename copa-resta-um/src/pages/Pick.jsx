import { useState, useEffect } from 'react'
import { getPlayerPicks, getMatches, submitPick } from '../lib/supabase'
import { computeLives, getTeamStatus, validatePick, todayBrasilia,
         toLocalDateISO, isPickOpen, STAGE_TO_PHASE } from '../lib/gameLogic'
import ShieldLives from '../components/ShieldLives'
import FlagImage from '../components/FlagImage'

function StatusGuide() {
  return (
    <div className="card" style={{marginTop:8}}>
      <div className="card-label">Guia de status</div>
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {[
          {cls:'status-available', icon:'🛡️', label:'Disponível',   desc:'Pode escolher este time'},
          {cls:'status-unlocked',  icon:'🔓', label:'Desbloqueado', desc:'Já usou e venceu — pode reutilizar'},
          {cls:'status-burned',    icon:'🔥', label:'Queimado',     desc:'Perdeu com este time — indisponível'},
        ].map(s => (
          <div key={s.label} style={{display:'flex',alignItems:'center',gap:10}}>
            <span style={{fontSize:18}}>{s.icon}</span>
            <div>
              <div className={`badge ${s.cls}`}>{s.label}</div>
              <div style={{fontSize:11,color:'var(--n500)',marginTop:2}}>{s.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Pick({ player }) {
  const [picks, setPicks]       = useState([])
  const [todayMatches, setTM]   = useState([])
  const [todayPick, setTP]      = useState(null)
  const [selected, setSel]      = useState(null)
  const [loading, setLoading]   = useState(true)
  const [submitting, setSub]    = useState(false)
  const [error, setError]       = useState('')
  const today = todayBrasilia()

  useEffect(() => { load() }, [player.id])

  async function load() {
    setLoading(true)
    const [pp, allMs] = await Promise.all([getPlayerPicks(player.id), getMatches()])
    setPicks(pp)
    const dayMs = allMs.filter(m => toLocalDateISO(m.utc_date) === today)
    setTM(dayMs)
    setTP(pp.find(p => p.pick_date === today) || null)
    setLoading(false)
  }

  function handleSelect(teamId, teamName, matchId) {
    if (selected?.teamId === teamId) { setSel(null); setError(''); return }
    const phase = STAGE_TO_PHASE[todayMatches[0]?.stage] || 'groups'
    const v = validatePick(picks, teamId, teamName, phase, todayMatches[0])
    if (!v.valid) { setError(v.reason); setSel(null); return }
    setError(v.warning || '')
    setSel({ teamId, teamName, matchId })
  }

  async function handleSubmit() {
    if (!selected) return
    setSub(true); setError('')
    try {
      const phase = STAGE_TO_PHASE[todayMatches[0]?.stage] || 'groups'
      const alreadyUsed = picks.some(p => p.team_id === selected.teamId && p.phase === phase && p.result !== 'no_pick')
      await submitPick({ playerId: player.id, matchId: selected.matchId,
        teamName: selected.teamName, teamId: selected.teamId,
        phase, pickDate: today, isRepeat: alreadyUsed })
      await load()
    } catch(e) {
      setError(e.message.includes('unique') ? 'Você já fez sua pick hoje!' : 'Erro ao enviar. Tente novamente.')
    } finally { setSub(false) }
  }

  if (loading) return <div className="loading">⏳ Carregando...</div>

  const { lives, inKnockout } = computeLives(picks)
  const maxLives = inKnockout ? 3 : 6
  const eliminated = lives <= 0
  const pickOpen = isPickOpen(todayMatches)

  function kickoff(utcDate) {
    return new Date(utcDate).toLocaleTimeString('pt-BR',
      { hour:'2-digit', minute:'2-digit', timeZone:'America/Sao_Paulo' })
  }

  function getStatusInfo(teamId) {
    const s = getTeamStatus(picks, teamId)
    if (s === 'burned')   return { cls:'status-burned',    label:'🔥 Queimado' }
    if (s === 'unlocked') return { cls:'status-unlocked',  label:'🔓 Desbloqueado' }
    return                       { cls:'status-available', label:'🛡️ Disponível' }
  }

  // Blocked screen states
  if (eliminated) return (
    <div className="page">
      <div className="page-title">Fazer Pick</div>
      <div className="card"><div className="alert alert-error">💀 Você foi eliminado. Fim de jogo!</div></div>
    </div>
  )
  if (!todayMatches.length) return (
    <div className="page">
      <div className="page-title">Fazer Pick</div>
      <div className="card empty">😴 Sem jogos hoje.<br/>Volte num dia de jogo!</div>
    </div>
  )

  // Already picked or submitted
  if (todayPick) return (
    <div className="page">
      <div className="page-title">Fazer Pick</div>
      <div className="card" style={{textAlign:'center',padding:'28px 16px'}}>
        <div style={{marginBottom:12}}>
          <FlagImage team={todayPick.team_name} size="xl" className="flag-img" style={{margin:'0 auto'}} />
        </div>
        <div style={{fontFamily:'Sora',fontSize:22,fontWeight:800,marginBottom:4}}>{todayPick.team_name}</div>
        <span className="badge badge-locked" style={{fontSize:12}}>✓ Pick Confirmada</span>
        {todayPick.is_repeat && <div className="alert alert-warn" style={{marginTop:10,textAlign:'left'}}>⚠️ Repetição — +1 vida de custo</div>}
        <div className="divider"/>
        <ShieldLives lives={lives} max={maxLives} />
      </div>
      <ShowGuide />
    </div>
  )

  if (!pickOpen) return (
    <div className="page">
      <div className="page-title">Fazer Pick</div>
      <div className="card"><div className="alert alert-error">⌛ Prazo encerrado — o primeiro jogo já começou.</div></div>
    </div>
  )

  return (
    <div className="page">
      <div className="page-title">Fazer Pick</div>

      {/* Lives */}
      <div className="card-dark" style={{marginBottom:12}}>
        <div className="sora-sm" style={{color:'rgba(255,255,255,.5)',marginBottom:8}}>Vidas restantes</div>
        <ShieldLives lives={lives} max={maxLives} />
      </div>

      {/* Instruction */}
      <div style={{fontFamily:'Sora',fontSize:11,fontWeight:700,letterSpacing:'.08em',
        textTransform:'uppercase',color:'var(--n500)',marginBottom:12}}>
        Escolha 1 time para vencer
      </div>

      {/* Match cards */}
      {todayMatches.map(match => {
        const homeInfo = getStatusInfo(match.home_team_id)
        const awayInfo = getStatusInfo(match.away_team_id)
        const homeBurned = getTeamStatus(picks, match.home_team_id) === 'burned'
        const awayBurned = getTeamStatus(picks, match.away_team_id) === 'burned'
        return (
          <div key={match.id} className="card" style={{padding:'20px 16px'}}>
            <div style={{fontSize:11,color:'var(--n400)',textAlign:'center',marginBottom:14,fontFamily:'Sora',fontWeight:600,letterSpacing:'.04em'}}>
              {match.group_name ? `Grupo ${match.group_name.replace('GROUP_','')} · ` : ''}
              {kickoff(match.utc_date)} BRT
            </div>
            <div className="match-row">
              {/* Home */}
              <button
                onClick={() => !homeBurned && handleSelect(match.home_team_id, match.home_team, match.id)}
                style={{background:'none',border:'none',padding:0,cursor:homeBurned?'not-allowed':'pointer'}}
                disabled={homeBurned}>
                <div style={{
                  display:'flex',flexDirection:'column',alignItems:'center',gap:8,
                  padding:'12px 8px',borderRadius:12,transition:'background .15s',
                  background: selected?.teamId === match.home_team_id ? 'var(--gold-light)' : 'transparent',
                  border: selected?.teamId === match.home_team_id ? '2px solid var(--gold)' : '2px solid transparent',
                }}>
                  <FlagImage team={match.home_team} size="lg" grayscale={homeBurned} />
                  <div style={{fontFamily:'Sora',fontSize:11,fontWeight:700,textTransform:'uppercase',
                    letterSpacing:'.04em',textAlign:'center'}}>{match.home_team}</div>
                  <span className={`match-status-badge ${homeInfo.cls}`}>{homeInfo.label}</span>
                </div>
              </button>

              {/* Center */}
              <div className="match-center">
                <div className="match-vs">VS</div>
                <div className="match-time">{kickoff(match.utc_date)}</div>
              </div>

              {/* Away */}
              <button
                onClick={() => !awayBurned && handleSelect(match.away_team_id, match.away_team, match.id)}
                style={{background:'none',border:'none',padding:0,cursor:awayBurned?'not-allowed':'pointer'}}
                disabled={awayBurned}>
                <div style={{
                  display:'flex',flexDirection:'column',alignItems:'center',gap:8,
                  padding:'12px 8px',borderRadius:12,transition:'background .15s',
                  background: selected?.teamId === match.away_team_id ? 'var(--gold-light)' : 'transparent',
                  border: selected?.teamId === match.away_team_id ? '2px solid var(--gold)' : '2px solid transparent',
                }}>
                  <FlagImage team={match.away_team} size="lg" grayscale={awayBurned} />
                  <div style={{fontFamily:'Sora',fontSize:11,fontWeight:700,textTransform:'uppercase',
                    letterSpacing:'.04em',textAlign:'center'}}>{match.away_team}</div>
                  <span className={`match-status-badge ${awayInfo.cls}`}>{awayInfo.label}</span>
                </div>
              </button>
            </div>
          </div>
        )
      })}

      {error && <div className={error.includes('⚠️') ? 'alert alert-warn' : 'alert alert-error'}>{error}</div>}

      {/* Selected preview */}
      {selected && (
        <div className="card" style={{background:'var(--gold-light)',border:'1.5px solid var(--gold)',textAlign:'center',padding:'16px'}}>
          <div style={{fontSize:12,color:'var(--gold-dark)',fontFamily:'Sora',fontWeight:700,marginBottom:8}}>SUA PICK</div>
          <FlagImage team={selected.teamName} size="lg" style={{margin:'0 auto 8px'}} />
          <div style={{fontFamily:'Sora',fontWeight:800,fontSize:18}}>{selected.teamName}</div>
        </div>
      )}

      <button className="btn btn-primary" onClick={handleSubmit} disabled={!selected || submitting} style={{marginTop:4}}>
        {submitting ? '⏳ Enviando...' : selected ? `Confirmar — ${selected.teamName}` : 'Selecione um time acima'}
      </button>

      <div style={{fontSize:11,color:'var(--n400)',textAlign:'center',marginTop:8,lineHeight:1.4}}>
        Picks são finais e não podem ser alteradas.
      </div>

      <ShowGuide />
    </div>
  )
}

function ShowGuide() {
  const [show, setShow] = useState(false)
  return (
    <div style={{marginTop:8}}>
      <button onClick={()=>setShow(!show)} className="btn btn-ghost" style={{fontSize:12}}>
        {show ? '▲ Ocultar guia' : '▼ Ver guia de status'}
      </button>
      {show && <StatusGuide />}
    </div>
  )
}
