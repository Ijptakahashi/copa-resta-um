// src/pages/Dashboard.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPlayerPicks, getMatches, getAllPicks } from '../lib/supabase'
import { computeLives, todayBrasilia, toLocalDateISO, isPickOpen, getFlag, PHASE_LABEL } from '../lib/gameLogic'
import { syncMatches, syncResults, processNoPicks } from '../lib/football'
import { getPlayers } from '../lib/supabase'

export default function Dashboard({ player }) {
  const navigate = useNavigate()
  const [picks, setPicks]         = useState([])
  const [todayMatches, setTodayMatches] = useState([])
  const [todayPick, setTodayPick] = useState(null)
  const [loading, setLoading]     = useState(true)
  const [syncing, setSyncing]     = useState(false)
  const [lastPicks, setLastPicks] = useState([])

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

      const dayPick = playerPicks.find(p => p.pick_date === today)
      setTodayPick(dayPick || null)

      // Last 5 picks
      const recent = [...playerPicks].reverse().slice(0, 5)
      setLastPicks(recent)
    } finally { setLoading(false) }
  }

  async function handleSync() {
    setSyncing(true)
    try {
      const players = await getPlayers()
      await syncMatches()
      await syncResults(players)
      const allMatches = await getMatches()
      await processNoPicks(players, allMatches)
      await load()
    } catch(e) { console.error(e) } finally { setSyncing(false) }
  }

  if (loading) return <div className="loading">⚽ Carregando...</div>

  const { lives, inKnockout } = computeLives(picks)
  const maxLives = inKnockout ? 3 : 6
  const eliminated = lives <= 0
  const pickOpen = isPickOpen(todayMatches)
  const hasGameToday = todayMatches.length > 0

  function ResultChip({ result }) {
    if (!result) return <span className="result-chip result-pending">aguardando</span>
    if (result === 'win')     return <span className="result-chip result-win">✅ Acertou</span>
    if (result === 'draw')    return <span className="result-chip result-draw">🔵 Empate</span>
    if (result === 'loss')    return <span className="result-chip result-loss">❌ Errou</span>
    if (result === 'no_pick') return <span className="result-chip result-nopick">😴 Não enviou</span>
    return null
  }

  return (
    <div className="page">
      <div className="page-title">Olá, {player.name} 👋</div>

      {/* Lives card */}
      <div className="card">
        <div className="card-header">Suas vidas</div>
        <div className="lives-display" style={{marginBottom:'10px'}}>
          {Array.from({length: maxLives}).map((_, i) => (
            <span key={i} className={`life ${i >= lives ? 'gone' : ''}`}>❤️</span>
          ))}
          <span className="lives-label">{lives} de {maxLives}</span>
        </div>
        <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
          <span className={`badge ${eliminated ? 'badge-dead' : 'badge-alive'}`}>
            {eliminated ? '💀 Eliminado' : '🟢 Vivo'}
          </span>
          {inKnockout && <span className="badge badge-gold">🔥 Mata-Mata</span>}
        </div>
      </div>

      {/* Today's status */}
      <div className="card">
        <div className="card-header">Hoje — {new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})}</div>
        {!hasGameToday ? (
          <div className="text-muted">Sem jogos hoje. Descanse! 😴</div>
        ) : eliminated ? (
          <div className="error-box">Você foi eliminado. Torça pelos outros! ⚰️</div>
        ) : todayPick ? (
          <div>
            <div className="success-box">
              ✅ Pick enviada! <strong>{getFlag(todayPick.team_name)} {todayPick.team_name}</strong>
              {todayPick.is_repeat && <span style={{color:'#856404'}}> (repetição)</span>}
            </div>
            <ResultChip result={todayPick.result} />
          </div>
        ) : pickOpen ? (
          <div>
            <div className="warning">⏰ Tem {todayMatches.length} jogo(s) hoje! Faça sua pick antes da bola rolar.</div>
            <button className="btn-gold" onClick={() => navigate('/pick')}>
              ⚽ Fazer minha pick agora
            </button>
          </div>
        ) : (
          <div className="error-box">⌛ Prazo encerrado — você perdeu 1 vida hoje.</div>
        )}
      </div>

      {/* Recent picks */}
      {lastPicks.length > 0 && (
        <div className="card">
          <div className="card-header">Últimas picks</div>
          {lastPicks.map(p => (
            <div key={p.id} className="stat-row">
              <div>
                <div style={{fontWeight:600}}>{getFlag(p.team_name)} {p.team_name}</div>
                <div style={{fontSize:'12px',color:'var(--gray-dark)'}}>{p.pick_date} · {PHASE_LABEL[p.phase] || p.phase}</div>
              </div>
              <ResultChip result={p.result} />
            </div>
          ))}
        </div>
      )}

      {/* Sync button */}
      <div className="card" style={{textAlign:'center'}}>
        <div className="text-muted mb8">Atualiza resultados dos jogos finalizados</div>
        <button className="btn-secondary" onClick={handleSync} disabled={syncing}>
          {syncing ? '⏳ Sincronizando...' : '🔄 Sincronizar resultados'}
        </button>
      </div>
    </div>
  )
}
