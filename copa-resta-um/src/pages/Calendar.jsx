import { useState, useEffect } from 'react'
import { getMatches } from '../lib/supabase'
import { syncMatches } from '../lib/football'
import { getFlag, toLocalDateISO, STAGE_TO_PHASE, PHASE_LABEL } from '../lib/gameLogic'

export default function Calendar() {
  const [matches, setMatches]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [syncing, setSyncing]   = useState(false)
  const [selectedDate, setDate] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const data = await getMatches()
    setMatches(data)
    if (data.length > 0 && !selectedDate) {
      const dates = [...new Set(data.map(m => toLocalDateISO(m.utc_date)))].sort()
      // Default to today or first upcoming date
      const today = new Date().toISOString().slice(0,10)
      const upcoming = dates.find(d => d >= today) || dates[0]
      setDate(upcoming)
    }
    setLoading(false)
  }

  async function handleSync() {
    setSyncing(true)
    await syncMatches()
    await load()
    setSyncing(false)
  }

  const dates = [...new Set(matches.map(m => toLocalDateISO(m.utc_date)))].sort()
  const filtered = selectedDate
    ? matches.filter(m => toLocalDateISO(m.utc_date) === selectedDate)
    : []

  function formatTime(utcDate) {
    return new Date(utcDate).toLocaleTimeString('pt-BR', {
      hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo'
    })
  }

  function formatDateLabel(d) {
    const [y,m,day] = d.split('-')
    return new Date(y,m-1,day).toLocaleDateString('pt-BR',{weekday:'short',day:'numeric',month:'short'})
  }

  function StatusBadge({ match }) {
    if (match.status === 'FINISHED') {
      const winner = match.winner
      return <span className="badge badge-closed">Encerrado</span>
    }
    if (match.status === 'IN_PLAY' || match.status === 'PAUSED') {
      return <span className="badge" style={{background:'#DCFCE7',color:'#16A34A'}}>🔴 Ao vivo</span>
    }
    return <span className="badge badge-open">⏳ {formatTime(match.utc_date)}</span>
  }

  function ScoreOrTime({ match }) {
    if (match.status === 'FINISHED' || match.home_score !== null) {
      return (
        <div style={{textAlign:'center',minWidth:'48px'}}>
          <div style={{fontSize:'20px',fontWeight:800,color:'var(--green-dark)'}}>
            {match.home_score ?? '-'} : {match.away_score ?? '-'}
          </div>
          <div style={{fontSize:'10px',color:'var(--gray-dark)'}}>FIM</div>
        </div>
      )
    }
    return (
      <div style={{textAlign:'center',minWidth:'48px'}}>
        <div style={{fontSize:'13px',fontWeight:700,color:'var(--gray-dark)'}}>VS</div>
        <div style={{fontSize:'11px',color:'var(--gray-dark)'}}>{formatTime(match.utc_date)}</div>
      </div>
    )
  }

  if (loading) return <div className="loading">📅 Carregando...</div>

  return (
    <div className="page">
      <div className="page-title">📅 Calendário</div>

      {matches.length === 0 ? (
        <div className="card" style={{textAlign:'center'}}>
          <div style={{fontSize:'48px',marginBottom:'12px'}}>📡</div>
          <div style={{fontWeight:700,marginBottom:'8px'}}>Sem partidas carregadas</div>
          <div className="text-muted" style={{marginBottom:'16px'}}>Sincronize para buscar todos os jogos da Copa 2026</div>
          <button className="btn-primary" onClick={handleSync} disabled={syncing}>
            {syncing ? '⏳ Sincronizando...' : '🔄 Carregar jogos da Copa'}
          </button>
        </div>
      ) : (
        <>
          {/* Date picker — horizontal scroll */}
          <div style={{overflowX:'auto',marginBottom:'16px',paddingBottom:'4px'}}>
            <div style={{display:'flex',gap:'8px',width:'max-content'}}>
              {dates.map(d => (
                <button key={d} onClick={()=>setDate(d)}
                  style={{padding:'8px 12px',borderRadius:'20px',border:'none',cursor:'pointer',
                  whiteSpace:'nowrap',fontSize:'12px',fontWeight:600,
                  background: selectedDate===d ? 'var(--green-dark)' : 'var(--white)',
                  color: selectedDate===d ? 'var(--gold)' : 'var(--text)',
                  boxShadow:'var(--shadow)'}}>
                  {formatDateLabel(d)}
                </button>
              ))}
            </div>
          </div>

          {/* Match cards */}
          {filtered.length === 0 && <div className="card text-muted text-center">Selecione um dia acima.</div>}
          {filtered.map(match => {
            const phase = STAGE_TO_PHASE[match.stage] || 'groups'
            const isWinner = (team) =>
              match.winner === 'HOME_TEAM' && team === 'home' ||
              match.winner === 'AWAY_TEAM' && team === 'away'
            return (
              <div key={match.id} className="card" style={{padding:'14px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
                  <span style={{fontSize:'11px',color:'var(--gray-dark)',fontWeight:600}}>
                    {match.group_name ? `Grupo ${match.group_name.replace('GROUP_','')} · ` : ''}
                    {PHASE_LABEL[phase]||phase}
                  </span>
                  <StatusBadge match={match}/>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',gap:'8px',alignItems:'center'}}>
                  {/* Home */}
                  <div style={{textAlign:'center'}}>
                    <div style={{fontSize:'38px'}}>{getFlag(match.home_team)}</div>
                    <div style={{fontSize:'12px',fontWeight: isWinner('home') ? 800 : 600,
                      color: isWinner('home') ? 'var(--green-dark)' : 'var(--text)'}}>
                      {match.home_team}
                      {isWinner('home') && ' 🏆'}
                    </div>
                  </div>
                  <ScoreOrTime match={match}/>
                  {/* Away */}
                  <div style={{textAlign:'center'}}>
                    <div style={{fontSize:'38px'}}>{getFlag(match.away_team)}</div>
                    <div style={{fontSize:'12px',fontWeight: isWinner('away') ? 800 : 600,
                      color: isWinner('away') ? 'var(--green-dark)' : 'var(--text)'}}>
                      {isWinner('away') && '🏆 '}
                      {match.away_team}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          <button className="btn-secondary" onClick={handleSync} disabled={syncing} style={{marginTop:'8px'}}>
            {syncing ? '⏳ Sincronizando...' : '🔄 Atualizar resultados'}
          </button>
        </>
      )}
    </div>
  )
}
