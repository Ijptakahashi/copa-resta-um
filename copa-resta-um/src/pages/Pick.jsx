import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Lock, AlertTriangle, Shield } from 'lucide-react'
import { getPlayerPicks, getMatches, submitPick } from '../lib/supabase'
import { computeLives, getTeamStatus, validatePick, todayBrasilia,
         toLocalDateISO, isPickOpen, STAGE_TO_PHASE, PHASE_LABEL } from '../lib/gameLogic'
import ShieldLives from '../components/ShieldLives'
import FlagImage from '../components/FlagImage'

function normName(n='') {
  return n.toLowerCase().replace(/&/g,'and').replace(/\s+/g,' ')
    .replace('united states','usa').replace('czechia','czech republic').trim()
}

export default function Pick({ player }) {
  const [picks, setPicks]       = useState([])
  const [allMatches, setAll]    = useState([])
  const [dates, setDates]       = useState([])
  const [dateIdx, setDateIdx]   = useState(0)
  const [selectedDate, setDate] = useState('')
  const [dayMatches, setDayM]   = useState([])
  const [todayPick, setTP]      = useState(null)
  const [selected, setSel]      = useState(null)
  const [loading, setLoading]   = useState(true)
  const [submitting, setSub]    = useState(false)
  const [error, setError]       = useState('')
  const [done, setDone]         = useState(false)
  const today = todayBrasilia()

  useEffect(() => { load() }, [player.id])

  async function load() {
    setLoading(true)
    const [pp, ms] = await Promise.all([getPlayerPicks(player.id), getMatches()])
    setPicks(pp)
    setAll(ms)
    // Deduplicate matches
    const seen = new Set()
    const clean = ms.filter(m => {
      const d = toLocalDateISO(m.utc_date)
      const key = `${d}|${normName(m.home_team)}|${normName(m.away_team)}`
      const rev  = `${d}|${normName(m.away_team)}|${normName(m.home_team)}`
      if (seen.has(key)||seen.has(rev)) return false
      seen.add(key); return true
    })
    const ds = [...new Set(clean.map(m => toLocalDateISO(m.utc_date)))].sort()
      .filter(d => d >= '2026-06-11') // only Copa days
    setDates(ds)
    // Default to today or first Copa day
    const idx = ds.findIndex(d => d === today)
    const start = idx >= 0 ? idx : ds.findIndex(d => d >= today) >= 0
      ? ds.findIndex(d => d >= today) : 0
    setDateIdx(start)
    const startDate = ds[start] || today
    setDate(startDate)
    setDayM(clean.filter(m => toLocalDateISO(m.utc_date) === startDate))
    setTP(pp.find(p => p.pick_date === today) || null)
    setLoading(false)
  }

  function changeDate(dir) {
    const next = dateIdx + dir
    if (next < 0 || next >= dates.length) return
    setDateIdx(next)
    const d = dates[next]
    setDate(d)
    const seen = new Set()
    const dm = allMatches.filter(m => {
      if (toLocalDateISO(m.utc_date) !== d) return false
      const key = `${normName(m.home_team)}|${normName(m.away_team)}`
      const rev  = `${normName(m.away_team)}|${normName(m.home_team)}`
      if (seen.has(key)||seen.has(rev)) return false
      seen.add(key); return true
    })
    setDayM(dm)
    setSel(null); setError(''); setDone(false)
  }

  function handleSelect(teamId, teamName, matchId) {
    if (selected?.teamId === teamId) { setSel(null); setError(''); return }
    const phase = STAGE_TO_PHASE[dayMatches[0]?.stage] || 'groups'
    const v = validatePick(picks, teamId, teamName, phase, dayMatches[0])
    if (!v.valid) { setError(v.reason); setSel(null); return }
    setError(v.warning || ''); setSel({ teamId, teamName, matchId })
  }

  async function handleSubmit() {
    if (!selected) return
    setSub(true); setError('')
    try {
      const phase = STAGE_TO_PHASE[dayMatches[0]?.stage] || 'groups'
      const alreadyUsed = picks.some(p =>
        p.team_id === selected.teamId && p.phase === phase && p.result !== 'no_pick')
      await submitPick({ playerId: player.id, matchId: selected.matchId,
        teamName: selected.teamName, teamId: selected.teamId,
        phase, pickDate: selectedDate, isRepeat: alreadyUsed })
      setDone(true); await load()
    } catch(e) {
      setError(e.message.includes('unique') ? 'Você já fez sua pick nesse dia!' : 'Erro ao enviar.')
    } finally { setSub(false) }
  }

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',
    height:'50vh',color:'#9CA3AF',fontFamily:'Sora',fontSize:13}}>Carregando...</div>

  const { lives, inKnockout } = computeLives(picks)
  const maxLives = inKnockout ? 3 : 6
  const eliminated = lives <= 0
  const isToday = selectedDate === today
  const isFuture = selectedDate > today
  const isPast = selectedDate < today
  const pickOpen = isPickOpen(dayMatches)
  const dayPick = picks.find(p => p.pick_date === selectedDate)

  function kickoff(utcDate) {
    return new Date(utcDate).toLocaleTimeString('pt-BR',
      {hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'})
  }
  function formatDay(d) {
    if (!d) return ''
    const [y,mo,day] = d.split('-')
    return new Date(y,mo-1,day).toLocaleDateString('pt-BR',
      {weekday:'long',day:'numeric',month:'long'})
  }
  function getStatusInfo(teamId) {
    const s = getTeamStatus(picks, teamId)
    if (s==='burned')   return { label:'🔥 Queimado',     cls:'burned',   blocked:true  }
    if (s==='unlocked') return { label:'🔓 Desbloqueado', cls:'unlocked', blocked:false }
    return                     { label:'🛡️ Disponível',   cls:'available',blocked:false }
  }

  return (
    <div style={{padding:'20px 16px 100px',maxWidth:480,margin:'0 auto'}}>

      {/* Header */}
      <div style={{fontFamily:'Sora',fontSize:22,fontWeight:800,color:'#1A4731',marginBottom:4}}>
        {isToday ? 'Fazer Pick' : isFuture ? 'Prévia do Dia' : 'Pick do Dia'}
      </div>
      <div style={{fontSize:13,color:'#6B7280',marginBottom:16,textTransform:'capitalize'}}>
        {formatDay(selectedDate)}
      </div>

      {/* Date navigation */}
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16,
        background:'#fff',borderRadius:14,padding:'10px 14px',
        boxShadow:'0 2px 8px rgba(0,0,0,.06)',border:'1px solid #F3F0EA'}}>
        <button onClick={()=>changeDate(-1)} disabled={dateIdx===0}
          style={{background:'none',border:'none',cursor:dateIdx===0?'not-allowed':'pointer',
            opacity:dateIdx===0?.3:1,display:'flex',alignItems:'center',padding:4}}>
          <ChevronLeft size={20} color="#374151"/>
        </button>
        <div style={{flex:1,textAlign:'center'}}>
          <div style={{fontFamily:'Sora',fontSize:12,fontWeight:700,color:'#1A4731'}}>
            {isToday ? '📅 Hoje' : isFuture ? `📅 Em ${Math.ceil((new Date(selectedDate)-new Date(today))/(1000*60*60*24))} dias` : '📅 Passado'}
          </div>
          <div style={{fontFamily:'Sora',fontSize:10,color:'#9CA3AF',marginTop:1}}>
            {dateIdx+1} / {dates.length} dias de jogo
          </div>
        </div>
        <button onClick={()=>changeDate(1)} disabled={dateIdx===dates.length-1}
          style={{background:'none',border:'none',cursor:dateIdx===dates.length-1?'not-allowed':'pointer',
            opacity:dateIdx===dates.length-1?.3:1,display:'flex',alignItems:'center',padding:4}}>
          <ChevronRight size={20} color="#374151"/>
        </button>
      </div>

      {/* Lives */}
      <div style={{background:'linear-gradient(135deg,#0D2B17,#1A4731)',borderRadius:16,
        padding:'14px 16px',marginBottom:12,display:'flex',alignItems:'center',
        justifyContent:'space-between'}}>
        <div>
          <div style={{fontFamily:'Sora',fontSize:9,fontWeight:700,letterSpacing:'.1em',
            textTransform:'uppercase',color:'rgba(255,255,255,.4)',marginBottom:6}}>
            Suas vidas
          </div>
          <ShieldLives lives={lives} max={maxLives}/>
        </div>
        {eliminated && <span style={{background:'#DC2626',color:'#fff',padding:'4px 10px',
          borderRadius:20,fontFamily:'Sora',fontSize:10,fontWeight:700}}>
          ELIMINADO
        </span>}
      </div>

      {/* No matches */}
      {dayMatches.length === 0 && (
        <div style={{background:'#fff',borderRadius:16,padding:'32px 20px',textAlign:'center',
          boxShadow:'0 2px 8px rgba(0,0,0,.06)'}}>
          <div style={{fontSize:36,marginBottom:8}}>😴</div>
          <div style={{fontFamily:'Sora',fontWeight:700,color:'#374151'}}>Sem jogos nesse dia</div>
          <div style={{fontSize:13,color:'#9CA3AF',marginTop:4}}>Use as setas para navegar</div>
        </div>
      )}

      {/* FUTURE DAY — Preview mode */}
      {dayMatches.length > 0 && isFuture && (
        <>
          <div style={{background:'#FBF5E6',border:'1px solid #D6B36A',borderRadius:12,
            padding:'10px 14px',marginBottom:12,display:'flex',alignItems:'center',gap:8}}>
            <AlertTriangle size={14} color="#B8952A"/>
            <span style={{fontFamily:'Sora',fontSize:11,fontWeight:700,color:'#B8952A'}}>
              PRÉVIA — picks abrem no dia do jogo
            </span>
          </div>
          {dayMatches.map(match => (
            <div key={match.id} style={{background:'#fff',borderRadius:16,padding:'20px 16px',
              marginBottom:10,boxShadow:'0 2px 8px rgba(0,0,0,.06)',border:'1px solid #F3F0EA'}}>
              <div style={{textAlign:'center',fontFamily:'Sora',fontSize:9,fontWeight:700,
                letterSpacing:'.1em',textTransform:'uppercase',color:'#9CA3AF',marginBottom:14}}>
                {match.group_name?`Grupo ${match.group_name.replace('GROUP_','')} · `:''}
                {kickoff(match.utc_date)} BRT
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 56px 1fr',gap:8,alignItems:'center'}}>
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
                  <FlagImage team={match.home_team} size="lg"/>
                  <div style={{fontFamily:'Sora',fontSize:10,fontWeight:700,textTransform:'uppercase',
                    letterSpacing:'.04em',textAlign:'center'}}>{match.home_team}</div>
                  <span style={{fontFamily:'Sora',fontSize:9,fontWeight:700,
                    color: getStatusInfo(match.home_team_id).cls==='burned'?'#DC2626':
                           getStatusInfo(match.home_team_id).cls==='unlocked'?'#B8952A':'#3FA66B'}}>
                    {getStatusInfo(match.home_team_id).label}
                  </span>
                </div>
                <div style={{textAlign:'center'}}>
                  <div style={{fontFamily:'Sora',fontSize:10,fontWeight:700,color:'#D1D5DB'}}>VS</div>
                  <div style={{fontFamily:'Sora',fontSize:12,fontWeight:800,color:'#D6B36A',marginTop:2}}>
                    {kickoff(match.utc_date)}
                  </div>
                </div>
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
                  <FlagImage team={match.away_team} size="lg"/>
                  <div style={{fontFamily:'Sora',fontSize:10,fontWeight:700,textTransform:'uppercase',
                    letterSpacing:'.04em',textAlign:'center'}}>{match.away_team}</div>
                  <span style={{fontFamily:'Sora',fontSize:9,fontWeight:700,
                    color: getStatusInfo(match.away_team_id).cls==='burned'?'#DC2626':
                           getStatusInfo(match.away_team_id).cls==='unlocked'?'#B8952A':'#3FA66B'}}>
                    {getStatusInfo(match.away_team_id).label}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      {/* PAST DAY */}
      {dayMatches.length > 0 && isPast && (
        <div style={{background:'#fff',borderRadius:16,padding:'20px',textAlign:'center',
          boxShadow:'0 2px 8px rgba(0,0,0,.06)'}}>
          {dayPick ? (
            <div>
              <div style={{fontSize:12,color:'#9CA3AF',marginBottom:8}}>Sua pick nesse dia</div>
              <FlagImage team={dayPick.team_name} size="xl" style={{margin:'0 auto 8px'}}/>
              <div style={{fontFamily:'Sora',fontWeight:800,fontSize:18}}>{dayPick.team_name}</div>
              <div style={{marginTop:8}}>
                {dayPick.result==='win'&&<span style={{color:'#1A4731',fontFamily:'Sora',fontWeight:700}}>✓ Acertou</span>}
                {dayPick.result==='draw'&&<span style={{color:'#2563EB',fontFamily:'Sora',fontWeight:700}}>= Empate</span>}
                {dayPick.result==='loss'&&<span style={{color:'#DC2626',fontFamily:'Sora',fontWeight:700}}>✕ Errou −{dayPick.lives_lost} vida{dayPick.lives_lost>1?'s':''}</span>}
                {!dayPick.result&&<span style={{color:'#D97706',fontFamily:'Sora',fontWeight:700}}>⏳ Aguardando resultado</span>}
              </div>
            </div>
          ) : (
            <div>
              <div style={{fontSize:40,marginBottom:8}}>😴</div>
              <div style={{fontFamily:'Sora',fontWeight:700,color:'#DC2626'}}>Não enviou pick nesse dia</div>
              <div style={{fontSize:13,color:'#9CA3AF',marginTop:4}}>−1 vida</div>
            </div>
          )}
        </div>
      )}

      {/* TODAY — Pick flow */}
      {dayMatches.length > 0 && isToday && !eliminated && (
        <>
          {dayPick || done ? (
            <div style={{background:'#fff',borderRadius:16,padding:'24px',textAlign:'center',
              boxShadow:'0 2px 12px rgba(0,0,0,.06)',border:'2px solid #D6B36A'}}>
              <div style={{fontSize:11,fontFamily:'Sora',fontWeight:700,color:'#D6B36A',
                letterSpacing:'.1em',textTransform:'uppercase',marginBottom:12}}>✓ Pick Confirmada</div>
              <FlagImage team={(dayPick||todayPick)?.team_name} size="xl" style={{margin:'0 auto 12px'}}/>
              <div style={{fontFamily:'Sora',fontWeight:800,fontSize:20,marginBottom:4}}>
                {(dayPick||todayPick)?.team_name}
              </div>
              {(dayPick||todayPick)?.is_repeat && (
                <div style={{background:'#FFFBEB',color:'#D97706',padding:'6px 12px',
                  borderRadius:8,fontSize:12,fontFamily:'Sora',fontWeight:700,marginTop:8}}>
                  ⚠️ Repetição — +1 vida de custo
                </div>
              )}
            </div>
          ) : !pickOpen ? (
            <div style={{background:'#FEF2F2',border:'1px solid #FCA5A5',borderRadius:12,
              padding:'16px',textAlign:'center'}}>
              <Lock size={24} color="#DC2626" style={{margin:'0 auto 8px'}}/>
              <div style={{fontFamily:'Sora',fontWeight:700,color:'#DC2626'}}>Prazo encerrado</div>
              <div style={{fontSize:13,color:'#9CA3AF',marginTop:4}}>O primeiro jogo de hoje já começou.</div>
            </div>
          ) : (
            <>
              <div style={{fontFamily:'Sora',fontSize:10,fontWeight:700,letterSpacing:'.1em',
                textTransform:'uppercase',color:'#9CA3AF',marginBottom:10}}>
                Escolha 1 time para vencer hoje
              </div>

              {dayMatches.map(match => {
                const homeInfo = getStatusInfo(match.home_team_id)
                const awayInfo = getStatusInfo(match.away_team_id)
                return (
                  <div key={match.id} style={{background:'#fff',borderRadius:16,padding:'20px 16px',
                    marginBottom:10,boxShadow:'0 2px 8px rgba(0,0,0,.06)',border:'1px solid #F3F0EA'}}>
                    <div style={{textAlign:'center',fontFamily:'Sora',fontSize:9,fontWeight:700,
                      letterSpacing:'.1em',textTransform:'uppercase',color:'#9CA3AF',marginBottom:14}}>
                      {match.group_name?`Grupo ${match.group_name.replace('GROUP_','')} · `:''}
                      {kickoff(match.utc_date)} BRT
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 56px 1fr',gap:8,alignItems:'center'}}>
                      {/* Home */}
                      <button onClick={()=>!homeInfo.blocked&&handleSelect(match.home_team_id,match.home_team,match.id)}
                        disabled={homeInfo.blocked}
                        style={{background:'none',border:'none',padding:0,cursor:homeInfo.blocked?'not-allowed':'pointer'}}>
                        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,
                          padding:'12px 6px',borderRadius:12,transition:'all .15s',
                          background:selected?.teamId===match.home_team_id?'#FBF5E6':'transparent',
                          border:`2px solid ${selected?.teamId===match.home_team_id?'#D6B36A':'transparent'}`,
                          opacity:homeInfo.blocked?.5:1}}>
                          <FlagImage team={match.home_team} size="lg" grayscale={homeInfo.blocked}/>
                          <div style={{fontFamily:'Sora',fontSize:10,fontWeight:700,textTransform:'uppercase',
                            letterSpacing:'.04em',textAlign:'center'}}>{match.home_team}</div>
                          <span style={{fontFamily:'Sora',fontSize:9,fontWeight:700,
                            color:homeInfo.cls==='burned'?'#DC2626':homeInfo.cls==='unlocked'?'#B8952A':'#3FA66B'}}>
                            {homeInfo.label}
                          </span>
                        </div>
                      </button>
                      <div style={{textAlign:'center'}}>
                        <div style={{fontFamily:'Sora',fontSize:10,fontWeight:700,color:'#D1D5DB'}}>VS</div>
                        <div style={{fontFamily:'Sora',fontSize:12,fontWeight:800,color:'#D6B36A',marginTop:2}}>
                          {kickoff(match.utc_date)}
                        </div>
                      </div>
                      {/* Away */}
                      <button onClick={()=>!awayInfo.blocked&&handleSelect(match.away_team_id,match.away_team,match.id)}
                        disabled={awayInfo.blocked}
                        style={{background:'none',border:'none',padding:0,cursor:awayInfo.blocked?'not-allowed':'pointer'}}>
                        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,
                          padding:'12px 6px',borderRadius:12,transition:'all .15s',
                          background:selected?.teamId===match.away_team_id?'#FBF5E6':'transparent',
                          border:`2px solid ${selected?.teamId===match.away_team_id?'#D6B36A':'transparent'}`,
                          opacity:awayInfo.blocked?.5:1}}>
                          <FlagImage team={match.away_team} size="lg" grayscale={awayInfo.blocked}/>
                          <div style={{fontFamily:'Sora',fontSize:10,fontWeight:700,textTransform:'uppercase',
                            letterSpacing:'.04em',textAlign:'center'}}>{match.away_team}</div>
                          <span style={{fontFamily:'Sora',fontSize:9,fontWeight:700,
                            color:awayInfo.cls==='burned'?'#DC2626':awayInfo.cls==='unlocked'?'#B8952A':'#3FA66B'}}>
                            {awayInfo.label}
                          </span>
                        </div>
                      </button>
                    </div>
                  </div>
                )
              })}

              {error && (
                <div style={{background:error.includes('⚠️')?'#FFFBEB':'#FEF2F2',
                  border:`1px solid ${error.includes('⚠️')?'#FCD34D':'#FCA5A5'}`,
                  borderRadius:10,padding:'10px 14px',fontSize:13,
                  color:error.includes('⚠️')?'#D97706':'#DC2626',marginBottom:8}}>
                  {error}
                </div>
              )}

              {selected && (
                <div style={{background:'#FBF5E6',border:'2px solid #D6B36A',borderRadius:14,
                  padding:'16px',textAlign:'center',marginBottom:8}}>
                  <div style={{fontSize:10,fontFamily:'Sora',fontWeight:700,color:'#B8952A',
                    letterSpacing:'.1em',textTransform:'uppercase',marginBottom:8}}>Sua pick</div>
                  <FlagImage team={selected.teamName} size="lg" style={{margin:'0 auto 8px'}}/>
                  <div style={{fontFamily:'Sora',fontWeight:800,fontSize:17}}>{selected.teamName}</div>
                </div>
              )}

              <button onClick={handleSubmit} disabled={!selected||submitting}
                style={{width:'100%',padding:15,borderRadius:14,border:'none',
                  background:selected?'linear-gradient(135deg,#1A4731,#2D7A54)':'#E5E7EB',
                  color:selected?'#fff':'#9CA3AF',fontFamily:'Sora',fontSize:14,fontWeight:700,
                  letterSpacing:'.05em',textTransform:'uppercase',cursor:selected?'pointer':'not-allowed',
                  transition:'all .15s',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                <Lock size={14}/>
                {submitting?'Enviando...' : selected?`Confirmar — ${selected.teamName}`:'Selecione um time acima'}
              </button>
              <div style={{fontSize:11,color:'#9CA3AF',textAlign:'center',marginTop:8}}>
                Picks são finais e não podem ser alteradas.
              </div>
            </>
          )}
        </>
      )}

      {isToday && eliminated && (
        <div style={{background:'#FEF2F2',borderRadius:16,padding:'24px',textAlign:'center'}}>
          <div style={{fontSize:40,marginBottom:8}}>💀</div>
          <div style={{fontFamily:'Sora',fontWeight:800,fontSize:18,color:'#DC2626'}}>Eliminado</div>
          <div style={{fontSize:13,color:'#9CA3AF',marginTop:4}}>Torça pelos sobreviventes!</div>
        </div>
      )}
    </div>
  )
}
