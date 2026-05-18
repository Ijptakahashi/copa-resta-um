import { useState, useEffect } from 'react'
import { getMatches } from '../lib/supabase'
import { syncMatches } from '../lib/football'
import { STAGE_TO_PHASE, PHASE_LABEL, toLocalDateISO } from '../lib/gameLogic'
import FlagImage from '../components/FlagImage'

export default function Calendar() {
  const [matches, setMatches]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [syncing, setSyncing]   = useState(false)
  const [selectedDate, setDate] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const data = await getMatches()
    // Deduplicate: keep only unique home+away combos per day (fix ESPN duplicates)
    const seen = new Set()
    const deduped = data.filter(m => {
      const key = `${toLocalDateISO(m.utc_date)}-${m.home_team}-${m.away_team}`
      if (seen.has(key)) return false
      seen.add(key); return true
    })
    setMatches(deduped)
    if (deduped.length > 0 && !selectedDate) {
      const dates = [...new Set(deduped.map(m => toLocalDateISO(m.utc_date)))].sort()
      const today = new Date().toISOString().slice(0,10)
      setDate(dates.find(d => d >= today) || dates[0])
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
  const filtered = selectedDate ? matches.filter(m => toLocalDateISO(m.utc_date) === selectedDate) : []

  function formatDay(d) {
    const [y,mo,day] = d.split('-')
    return new Date(y,mo-1,day).toLocaleDateString('pt-BR',
      {weekday:'short',day:'numeric',month:'short'})
  }

  function kickoff(utcDate) {
    return new Date(utcDate).toLocaleTimeString('pt-BR',
      {hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'})
  }

  if (loading) return <div className="loading">📅 Carregando...</div>

  return (
    <div className="page">
      <div className="page-title">Fixtures</div>

      {matches.length === 0 ? (
        <div className="card" style={{textAlign:'center',padding:'32px 16px'}}>
          <div style={{fontSize:48,marginBottom:12}}>📡</div>
          <div style={{fontFamily:'Sora',fontWeight:700,marginBottom:8}}>Sem partidas carregadas</div>
          <div className="text-muted" style={{marginBottom:16}}>Sincronize para buscar todos os jogos da Copa 2026</div>
          <button className="btn btn-primary" onClick={handleSync} disabled={syncing}>
            {syncing ? '⏳ Sincronizando...' : '🔄 Carregar jogos'}
          </button>
        </div>
      ) : (
        <>
          {/* Date scroll */}
          <div style={{overflowX:'auto',marginBottom:16,paddingBottom:4,
            scrollbarWidth:'none',WebkitOverflowScrolling:'touch'}}>
            <div style={{display:'flex',gap:8,width:'max-content',padding:'2px 0'}}>
              {dates.map(d => (
                <button key={d} onClick={() => setDate(d)}
                  className={`day-chip ${selectedDate===d?'active':'inactive'}`}>
                  {formatDay(d)}
                </button>
              ))}
            </div>
          </div>

          {/* Matches */}
          {filtered.length === 0 && <div className="empty">Selecione um dia acima.</div>}
          {filtered.map(match => {
            const phase = STAGE_TO_PHASE[match.stage] || 'groups'
            const finished = match.status === 'FINISHED'
            const live = match.status === 'IN_PLAY'
            const homeWon = match.winner === 'HOME_TEAM'
            const awayWon = match.winner === 'AWAY_TEAM'

            return (
              <div key={match.id} className="card" style={{padding:'16px'}}>
                {/* Phase + status */}
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                  <div style={{fontFamily:'Sora',fontSize:10,fontWeight:700,letterSpacing:'.06em',
                    textTransform:'uppercase',color:'var(--n400)'}}>
                    {match.group_name ? `Grupo ${match.group_name.replace('GROUP_','')} · ` : ''}
                    {PHASE_LABEL[phase]||phase}
                  </div>
                  <div>
                    {live && <span className="badge badge-live">🔴 Ao Vivo</span>}
                    {finished && <span className="badge" style={{background:'var(--n100)',color:'var(--n500)'}}>Encerrado</span>}
                    {!finished && !live && <span style={{fontFamily:'Sora',fontSize:12,fontWeight:700,color:'var(--gold-dark)'}}>⏱ {kickoff(match.utc_date)}</span>}
                  </div>
                </div>

                {/* Teams */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 64px 1fr',gap:8,alignItems:'center'}}>
                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8}}>
                    <FlagImage team={match.home_team} size="lg" />
                    <div style={{fontFamily:'Sora',fontSize:11,fontWeight:700,textTransform:'uppercase',
                      letterSpacing:'.04em',textAlign:'center',
                      color: homeWon ? 'var(--g700)' : 'var(--n700)'}}>
                      {match.home_team}
                      {homeWon && ' 🏆'}
                    </div>
                  </div>

                  <div style={{textAlign:'center'}}>
                    {finished || live ? (
                      <div style={{fontFamily:'Sora',fontSize:26,fontWeight:800,color:'var(--g800)'}}>
                        {match.home_score ?? '–'}<span style={{color:'var(--n300)',margin:'0 2px'}}>:</span>{match.away_score ?? '–'}
                      </div>
                    ) : (
                      <div>
                        <div style={{fontFamily:'Sora',fontSize:11,fontWeight:700,color:'var(--n400)',letterSpacing:'.04em'}}>VS</div>
                        <div style={{fontFamily:'Sora',fontSize:14,fontWeight:700,color:'var(--gold-dark)',marginTop:2}}>{kickoff(match.utc_date)}</div>
                      </div>
                    )}
                  </div>

                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8}}>
                    <FlagImage team={match.away_team} size="lg" />
                    <div style={{fontFamily:'Sora',fontSize:11,fontWeight:700,textTransform:'uppercase',
                      letterSpacing:'.04em',textAlign:'center',
                      color: awayWon ? 'var(--g700)' : 'var(--n700)'}}>
                      {awayWon && '🏆 '}
                      {match.away_team}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          <button className="btn btn-ghost" onClick={handleSync} disabled={syncing} style={{fontSize:12,marginTop:8}}>
            {syncing ? '⏳...' : '🔄 Atualizar resultados'}
          </button>
        </>
      )}
    </div>
  )
}
