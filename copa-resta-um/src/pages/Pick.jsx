// src/pages/Pick.jsx
import { useState, useEffect } from 'react'
import { getPlayerPicks, getMatches, submitPick } from '../lib/supabase'
import { computeLives, getTeamStatus, validatePick, getFlag, todayBrasilia,
         toLocalDateISO, isPickOpen, STAGE_TO_PHASE, isEliminated } from '../lib/gameLogic'

export default function Pick({ player }) {
  const [picks, setPicks]       = useState([])
  const [todayMatches, setTodayMatches] = useState([])
  const [todayPick, setTodayPick]   = useState(null)
  const [selected, setSelected]     = useState(null) // {teamId, teamName, matchId}
  const [loading, setLoading]       = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState('')
  const [done, setDone]             = useState(false)

  const today = todayBrasilia()

  useEffect(() => { load() }, [player.id])

  async function load() {
    setLoading(true)
    try {
      const [playerPicks, allMatches] = await Promise.all([
        getPlayerPicks(player.id),
        getMatches(),
      ])
      setPicks(playerPicks)
      const dayMatches = allMatches.filter(m => toLocalDateISO(m.utc_date) === today)
      setTodayMatches(dayMatches)
      setTodayPick(playerPicks.find(p => p.pick_date === today) || null)
    } finally { setLoading(false) }
  }

  function handleSelectTeam(teamId, teamName, matchId) {
    if (selected?.teamId === teamId) { setSelected(null); setError(''); return }
    const v = validatePick(picks, teamId, teamName, currentPhase, todayMatches[0])
    if (!v.valid) { setError(v.reason); setSelected(null); return }
    setError(v.warning || '')
    setSelected({ teamId, teamName, matchId })
  }

  async function handleSubmit() {
    if (!selected) return
    setSubmitting(true); setError('')
    try {
      const phase = STAGE_TO_PHASE[todayMatches[0]?.stage] || 'groups'
      const alreadyUsed = picks.some(p => p.team_id === selected.teamId && p.phase === phase && p.result !== 'no_pick')
      await submitPick({
        playerId: player.id,
        matchId: selected.matchId,
        teamName: selected.teamName,
        teamId: selected.teamId,
        phase,
        pickDate: today,
        isRepeat: alreadyUsed,
      })
      setDone(true)
      await load()
    } catch (e) {
      setError(e.message.includes('unique') ? 'Você já fez sua pick hoje!' : 'Erro ao enviar pick. Tente novamente.')
    } finally { setSubmitting(false) }
  }

  if (loading) return <div className="loading">⚽ Carregando...</div>

  const { lives, inKnockout } = computeLives(picks)
  const currentPhase = inKnockout ? 'knockout' : 'groups'
  const eliminated = lives <= 0

  if (eliminated) return (
    <div className="page">
      <div className="page-title">⚽ Fazer Pick</div>
      <div className="card"><div className="error-box">💀 Você foi eliminado. Fim de jogo!</div></div>
    </div>
  )

  if (todayMatches.length === 0) return (
    <div className="page">
      <div className="page-title">⚽ Fazer Pick</div>
      <div className="card">
        <div className="text-muted text-center" style={{padding:'20px'}}>
          😴 Sem jogos hoje.<br/>Volte num dia de jogo!
        </div>
      </div>
    </div>
  )

  const pickOpen = isPickOpen(todayMatches)

  if (todayPick || done) {
    const pick = todayPick
    return (
      <div className="page">
        <div className="page-title">⚽ Fazer Pick</div>
        <div className="card">
          <div className="success-box" style={{fontSize:'16px',textAlign:'center'}}>
            <div style={{fontSize:'36px',marginBottom:'8px'}}>{getFlag(pick?.team_name || selected?.teamName)}</div>
            <strong>{pick?.team_name || selected?.teamName}</strong>
            <div style={{fontSize:'13px',marginTop:'4px',color:'var(--green-dark)'}}>
              Pick do dia enviada! ✅
            </div>
            {pick?.is_repeat && (
              <div style={{color:'#856404',fontSize:'12px',marginTop:'4px'}}>⚠️ Repetição — custa +1 vida</div>
            )}
          </div>
          <div className="divider"/>
          <div className="text-muted text-center">Resultado sai após o fim do jogo.</div>
          <div style={{marginTop:'12px'}}>
            <div className="card-header">Seus {lives} de {inKnockout?3:6} vidas restantes</div>
            <div className="lives-display">
              {Array.from({length: inKnockout?3:6}).map((_,i)=>(
                <span key={i} className={`life ${i>=lives?'gone':''}`}>❤️</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!pickOpen) return (
    <div className="page">
      <div className="page-title">⚽ Fazer Pick</div>
      <div className="card">
        <div className="error-box">
          ⌛ O prazo para hoje fechou — o primeiro jogo já começou.<br/>
          Você perdeu 1 vida por não enviar a pick.
        </div>
      </div>
    </div>
  )

  // Format kick-off time
  function kickoff(utcDate) {
    return new Date(utcDate).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'})
  }

  // Get team status label
  function statusLabel(teamId, teamName) {
    const s = getTeamStatus(picks, teamId)
    if (s === 'burned')    return { cls:'status-burned',    text:'🔴 Queimada' }
    if (s === 'unlocked')  return { cls:'status-unlocked',  text:'🔵 Desbloqueada' }
    return { cls:'status-available', text:'🟢 Disponível' }
  }

  return (
    <div className="page">
      <div className="page-title">⚽ Pick do Dia</div>

      <div className="card">
        <div className="card-header">Vidas restantes</div>
        <div className="lives-display">
          {Array.from({length: inKnockout?3:6}).map((_,i)=>(
            <span key={i} className={`life ${i>=lives?'gone':''}`}>❤️</span>
          ))}
          <span className="lives-label">{lives} vida{lives!==1?'s':''}</span>
        </div>
      </div>

      <div className="card">
        <div className="card-header">Jogos de hoje — escolha 1 time para vencer</div>

        {todayMatches.map(match => {
          const homeStatus = statusLabel(match.home_team_id, match.home_team)
          const awayStatus = statusLabel(match.away_team_id, match.away_team)
          const homeBurned = getTeamStatus(picks, match.home_team_id) === 'burned'
          const awayBurned = getTeamStatus(picks, match.away_team_id) === 'burned'

          return (
            <div key={match.id} style={{marginBottom:'16px'}}>
              <div style={{fontSize:'12px',color:'var(--gray-dark)',marginBottom:'8px',textAlign:'center'}}>
                {match.group_name ? `Grupo ${match.group_name.replace('GROUP_','')} · ` : ''}
                ⏱ {kickoff(match.utc_date)}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',gap:'8px',alignItems:'center'}}>
                {/* Home team */}
                <button
                  className={`team-btn ${selected?.teamId===match.home_team_id?'selected':''} ${homeBurned?'burned':''}`}
                  disabled={homeBurned}
                  onClick={() => handleSelectTeam(match.home_team_id, match.home_team, match.id)}>
                  <span style={{fontSize:'36px'}}>{getFlag(match.home_team)}</span>
                  <span style={{fontSize:'13px',fontWeight:600}}>{match.home_team}</span>
                  <span style={{fontSize:'10px'}} className={homeStatus.cls}>{homeStatus.text}</span>
                </button>

                <span className="vs-badge">VS</span>

                {/* Away team */}
                <button
                  className={`team-btn ${selected?.teamId===match.away_team_id?'selected':''} ${awayBurned?'burned':''}`}
                  disabled={awayBurned}
                  onClick={() => handleSelectTeam(match.away_team_id, match.away_team, match.id)}>
                  <span style={{fontSize:'36px'}}>{getFlag(match.away_team)}</span>
                  <span style={{fontSize:'13px',fontWeight:600}}>{match.away_team}</span>
                  <span style={{fontSize:'10px'}} className={awayStatus.cls}>{awayStatus.text}</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {error && <div className={error.includes('⚠️') ? 'warning' : 'error-box'}>{error}</div>}

      {selected && (
        <div className="card" style={{textAlign:'center',background:'var(--gold-light)',border:'2px solid var(--gold)'}}>
          <div style={{fontSize:'40px'}}>{getFlag(selected.teamName)}</div>
          <div style={{fontWeight:700,fontSize:'18px',marginBottom:'4px'}}>{selected.teamName}</div>
          <div style={{fontSize:'12px',color:'var(--gray-dark)'}}>Pick selecionada</div>
        </div>
      )}

      <button className="btn-primary" onClick={handleSubmit} disabled={!selected || submitting}>
        {submitting ? '⏳ Enviando...' : selected ? `✅ Confirmar — ${selected.teamName}` : 'Selecione um time acima'}
      </button>

      <div className="text-muted text-center mt8" style={{fontSize:'12px'}}>
        Empate = pick desperdiçada (sem vida). Derrota = −1 vida. Sem pick = −1 vida.
      </div>
    </div>
  )
}
