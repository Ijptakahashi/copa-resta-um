import { useState, useEffect } from 'react'
import { ArrowLeft, Info, Lock, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getPlayerPicks, getMatches, submitPick } from '../lib/supabase'
import { computeLives, getTeamStatus, validatePick, todayBrasilia,
         toLocalDateISO, isPickOpen, pickDeadline, STAGE_TO_PHASE } from '../lib/gameLogic'
import FlagImage from '../components/FlagImage'
import { ShieldIcon } from '../components/ShieldLives'
import { PickSkeleton } from '../components/Skeletons'

// Canonical name for robust deduplication
function canon(n='') {
  const map = {
    'korea republic':'south korea','korea rep.':'south korea',
    'czechia':'czech republic',
    'bosnia & herzegovina':'bosnia and herzegovina',
    'bosnia-herzegovina':'bosnia and herzegovina',
    'bosnia & herzeg.':'bosnia and herzegovina',
    'usa':'united states','united states of america':'united states',
    'türkiye':'turkey',"côte d'ivoire":'ivory coast',"cote d'ivoire":'ivory coast',
    'curaçao':'curacao','congo dr':'dr congo',
  }
  const s = n.toLowerCase().trim()
  return map[s] || s
}

function DeadlineCountdown({ deadline }) {
  const [t, setT] = useState({ h:'--', m:'--', s:'--' })
  useEffect(() => {
    function tick() {
      const d = deadline - Date.now()
      if (d <= 0) { setT({ h:'00', m:'00', s:'00' }); return }
      setT({
        h: String(Math.floor(d/3600000)).padStart(2,'0'),
        m: String(Math.floor((d%3600000)/60000)).padStart(2,'0'),
        s: String(Math.floor((d%60000)/1000)).padStart(2,'0'),
      })
    }
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id)
  }, [deadline])
  return <span style={{fontFamily:'Sora',fontWeight:800,color:'#C4302B'}}>{t.h}:{t.m}:{t.s}</span>
}

export default function Pick({ player }) {
  const navigate = useNavigate()
  const [picks, setPicks]     = useState([])
  const [allMs, setAllMs]     = useState([])
  const [dates, setDates]     = useState([])
  const [dateIdx, setDIdx]    = useState(0)
  const [selDate, setSelDate] = useState('')
  const [dayMs, setDayMs]     = useState([])
  const [selected, setSel]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSub]  = useState(false)
  const [error, setError]     = useState('')
  const today = todayBrasilia()

  useEffect(() => { load() }, [player.id])

  function dedup(ms, d) {
    const seen = new Set()
    return ms.filter(m => {
      if (toLocalDateISO(m.utc_date) !== d) return false
      const k = `${canon(m.home_team)}|${canon(m.away_team)}`
      const r = `${canon(m.away_team)}|${canon(m.home_team)}`
      if (seen.has(k) || seen.has(r)) return false
      seen.add(k); return true
    })
  }

  async function load() {
    setLoading(true)
    const [pp, ms] = await Promise.all([getPlayerPicks(player.id), getMatches()])
    setPicks(pp); setAllMs(ms)
    const seen = new Set()
    const clean = ms.filter(m => {
      const d = toLocalDateISO(m.utc_date)
      const k = `${d}|${canon(m.home_team)}|${canon(m.away_team)}`
      const r = `${d}|${canon(m.away_team)}|${canon(m.home_team)}`
      if (seen.has(k) || seen.has(r)) return false
      seen.add(k); return true
    })
    const ds = [...new Set(clean.map(m => toLocalDateISO(m.utc_date)))]
      .sort().filter(d => d >= '2026-06-11')
    setDates(ds)
    const todayIdx = ds.indexOf(today)
    const start = todayIdx >= 0 ? todayIdx : 0
    setDIdx(start)
    const d0 = ds[start] || ds[0] || ''
    setSelDate(d0)
    if (d0) setDayMs(dedup(clean, d0))
    setLoading(false)
  }

  function changeDate(dir) {
    const next = dateIdx + dir
    if (next < 0 || next >= dates.length) return
    setDIdx(next); const d = dates[next]
    setSelDate(d); setDayMs(dedup(allMs, d))
    setSel(null); setError('')
  }

  async function handleSubmit() {
    if (!selected) return
    setSub(true); setError('')
    try {
      const phase = STAGE_TO_PHASE[dayMs[0]?.stage] || 'groups'
      const alreadyUsed = picks.some(p =>
        p.team_id === selected.teamId && p.phase === phase &&
        p.pick_date !== selDate && p.result !== 'no_pick')
      await submitPick({
        playerId: player.id, matchId: selected.matchId,
        teamName: selected.teamName, teamId: selected.teamId,
        phase, pickDate: selDate, isRepeat: alreadyUsed,
      })
      setSel(null); await load()
    } catch(e) { setError('Erro ao enviar. Tente novamente.') }
    finally { setSub(false) }
  }

  if (loading) return <PickSkeleton/>

  const { lives, inKnockout } = computeLives(picks)
  const maxL = inKnockout ? 3 : 6
  const eliminated = lives <= 0
  const isPast = selDate < today
  const deadline = pickDeadline(dayMs)
  const pickOpen = isPickOpen(dayMs)
  const dayPick = picks.find(p => p.pick_date === selDate)
  const canPick = pickOpen && !eliminated && !isPast
  const canChange = canPick && !!dayPick

  function fmtDay(d) {
    if (!d) return ''
    const [y,mo,day] = d.split('-')
    return new Date(y,mo-1,day).toLocaleDateString('pt-BR',{weekday:'short',day:'numeric',month:'short'}).toUpperCase()
  }
  function fmtTime(u) {
    return new Date(u).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'})
  }
  function fmtDeadline(d) {
    return new Date(d).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'})
  }

  return (
    <div style={{maxWidth:430,margin:'0 auto',background:'#F8F4EE',minHeight:'100svh'}}>
      <div style={{padding:'14px 16px 0',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <button onClick={()=>navigate('/dashboard')}
          style={{width:36,height:36,borderRadius:'50%',border:'1px solid rgba(0,0,0,.1)',
            background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',
            boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
          <ArrowLeft size={18} color="#1A1A1A"/>
        </button>
        <div style={{textAlign:'center'}}>
          <div style={{fontFamily:'Sora',fontWeight:800,fontSize:11,color:'#1A3D28',letterSpacing:'.08em'}}>SURVIVOR</div>
          <div style={{fontFamily:'Sora',fontWeight:700,fontSize:9,color:'#C9A44A',letterSpacing:'.1em'}}>POOL 2026</div>
        </div>
        <div style={{width:36}}/>
      </div>

      <div style={{padding:'14px 16px 96px'}}>
        {/* Date navigator */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
          background:'#fff',borderRadius:14,padding:'12px 16px',marginBottom:14,
          border:'1px solid rgba(0,0,0,.07)',boxShadow:'0 1px 6px rgba(0,0,0,.05)'}}>
          <button onClick={()=>changeDate(-1)} disabled={dateIdx===0}
            style={{background:'none',border:'none',cursor:dateIdx===0?'not-allowed':'pointer',
              opacity:dateIdx===0?.25:1,fontSize:22,fontWeight:700,color:'#1A1A1A',padding:'0 6px'}}>‹</button>
          <div style={{textAlign:'center'}}>
            <div style={{fontFamily:'Sora',fontWeight:700,fontSize:13,color:'#1A3D28'}}>
              {selDate===today?'HOJE':selDate>today?`EM ${Math.ceil((new Date(selDate)-new Date(today))/(86400000))} DIAS`:'PASSADO'}
            </div>
            <div style={{fontFamily:'Sora',fontWeight:600,fontSize:10,color:'#9CA3AF',marginTop:1}}>{fmtDay(selDate)}</div>
            <div style={{fontFamily:'Sora',fontSize:9,color:'#B0A898',marginTop:1}}>{dateIdx+1} / {dates.length} dias</div>
          </div>
          <button onClick={()=>changeDate(1)} disabled={dateIdx===dates.length-1}
            style={{background:'none',border:'none',cursor:dateIdx===dates.length-1?'not-allowed':'pointer',
              opacity:dateIdx===dates.length-1?.25:1,fontSize:22,fontWeight:700,color:'#1A1A1A',padding:'0 6px'}}>›</button>
        </div>

        {/* Title */}
        <div style={{marginBottom:14}}>
          <div style={{fontFamily:'Sora',fontWeight:800,fontSize:30,color:'#1A3D28',
            lineHeight:1.05,letterSpacing:'-1px'}}>
            {isPast?'PICK DO DIA':canChange?'ALTERAR PICK':'MAKE YOUR\nPICK'}
          </div>
          <div style={{fontSize:12,color:'#9CA3AF',marginTop:5,fontFamily:'Inter'}}>
            {isPast?'Pick encerrado para este dia':
             canChange?'Sua pick atual — pode alterar até o deadline':
             canPick?'Selecione um time para vencer':
             deadline&&!isPast?`Deadline: ${fmtDeadline(deadline)} BRT`:''}
          </div>
        </div>

        {/* Deadline countdown */}
        {deadline && !isPast && (
          <div style={{background:'#FEF0EF',borderRadius:10,padding:'10px 14px',marginBottom:14,
            display:'flex',alignItems:'center',gap:8,border:'1px solid rgba(196,48,43,.15)'}}>
            <Lock size={13} color="#C4302B"/>
            <span style={{fontFamily:'Sora',fontWeight:600,fontSize:12,color:'#C4302B'}}>
              {pickOpen
                ? <>Sua escolha trava em <DeadlineCountdown deadline={deadline}/></>
                : 'Mercado fechado para este dia'}
            </span>
          </div>
        )}

        {/* Lives */}
        <div style={{background:'linear-gradient(135deg,#162E1E,#1A3D28)',borderRadius:14,
          padding:'14px 16px',marginBottom:14,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <div style={{fontFamily:'Sora',fontWeight:700,fontSize:9,letterSpacing:'.12em',
              textTransform:'uppercase',color:'rgba(201,164,74,.7)',marginBottom:6}}>SUAS VIDAS</div>
            <div style={{display:'flex',alignItems:'center',gap:4}}>
              {Array.from({length:maxL}).map((_,i)=>(<ShieldIcon key={i} active={i<lives} size={20}/>))}
              <span style={{fontFamily:'Sora',fontWeight:700,fontSize:11,color:'#C9A44A',marginLeft:4}}>{lives}/{maxL}</span>
            </div>
          </div>
          {eliminated&&<span style={{background:'#C4302B',color:'#fff',padding:'4px 10px',
            borderRadius:20,fontFamily:'Sora',fontSize:10,fontWeight:700}}>ELIMINADO</span>}
        </div>

        {/* Current pick banner */}
        {dayPick && dayPick.team_name !== 'no_pick' && (
          <div style={{background:canChange?'rgba(26,61,40,.04)':'#fff',borderRadius:14,
            padding:'14px 16px',marginBottom:14,
            border:`2px solid ${canChange?'#1A3D28':'rgba(0,0,0,.07)'}`,
            display:'flex',alignItems:'center',gap:12}}>
            <FlagImage team={dayPick.team_name} size="md"/>
            <div style={{flex:1}}>
              <div style={{fontFamily:'Sora',fontWeight:700,fontSize:15}}>{dayPick.team_name}</div>
              <div style={{fontSize:11,color:'#9CA3AF',marginTop:2,fontFamily:'Inter'}}>
                {canChange?'Sua pick atual — toque em outro time para trocar':'Pick confirmada ✓'}
              </div>
            </div>
            {!canChange && (isPast && dayPick.result ? (
              dayPick.result==='win'?<span style={{fontFamily:'Sora',fontSize:9,fontWeight:700,color:'#1A3D28',background:'#EBF5EE',padding:'4px 10px',borderRadius:12}}>✓ ACERTOU</span>:
              dayPick.result==='loss'?<span style={{fontFamily:'Sora',fontSize:9,fontWeight:700,color:'#C4302B',background:'#FEF0EF',padding:'4px 10px',borderRadius:12}}>✗ ERROU</span>:
              dayPick.result==='draw'?<span style={{fontFamily:'Sora',fontSize:9,fontWeight:700,color:'#2563EB',background:'#EFF6FF',padding:'4px 10px',borderRadius:12}}>= EMPATE</span>:null
            ) : (
              <span style={{fontFamily:'Sora',fontSize:9,fontWeight:700,color:'#1A3D28',
                background:'#EBF5EE',padding:'4px 10px',borderRadius:12,letterSpacing:'.06em'}}>LOCKED ✓</span>
            ))}
          </div>
        )}

        {/* No matches */}
        {dayMs.length===0&&(
          <div style={{background:'#fff',borderRadius:14,padding:'32px',textAlign:'center',
            border:'1px solid rgba(0,0,0,.07)'}}>
            <div style={{fontSize:36,marginBottom:8}}>📅</div>
            <div style={{fontFamily:'Sora',fontWeight:700,fontSize:14,color:'#6B6B6B'}}>Sem jogos nesse dia</div>
          </div>
        )}

        {/* Deadline passed, no pick */}
        {!canPick && !isPast && !dayPick && dayMs.length>0 && !eliminated && (
          <div style={{background:'#FEF0EF',borderRadius:14,padding:'20px',textAlign:'center',
            border:'1px solid rgba(196,48,43,.15)',marginBottom:14}}>
            <Lock size={24} color="#C4302B" style={{margin:'0 auto 8px'}}/>
            <div style={{fontFamily:'Sora',fontWeight:700,color:'#C4302B',fontSize:15}}>MERCADO FECHADO</div>
            <div style={{fontSize:12,color:'#9CA3AF',marginTop:4}}>−1 vida registrada</div>
          </div>
        )}

        {/* Pick form */}
        {dayMs.length>0 && canPick && !eliminated && dayMs.map(match => {
          function TeamCard({ teamId, teamName, matchId }) {
            const status = getTeamStatus(picks, teamId, selDate, teamName)
            const burned = status === 'burned'
            const preselected = status === 'preselected'
            const blocked = burned || preselected   // ambos impedem nova seleção
            const isSelected = selected?.teamId === teamId
            return (
              <button
                onClick={() => {
                  if (blocked) return
                  if (isSelected) { setSel(null); setError(''); return }
                  const phase = STAGE_TO_PHASE[dayMs[0]?.stage] || 'groups'
                  const v = validatePick(picks, teamId, teamName, phase, dayMs[0], selDate)
                  if (!v.valid) { setError(v.reason); setSel(null); return }
                  setError(v.warning || ''); setSel({ teamId, teamName, matchId })
                }}
                disabled={blocked}
                style={{flex:1,padding:'16px 8px',borderRadius:14,cursor:blocked?'not-allowed':'pointer',
                  border:`2px solid ${isSelected?'#1A3D28':burned?'rgba(196,48,43,.3)':preselected?'rgba(201,164,74,.4)':'rgba(0,0,0,.07)'}`,
                  background:isSelected?'rgba(26,61,40,.04)':burned?'#FEF5F5':preselected?'#FBF7EC':'#fff',
                  display:'flex',flexDirection:'column',alignItems:'center',gap:10,
                  transition:'all .15s',opacity:blocked?.7:1,
                  boxShadow:isSelected?'0 0 0 3px rgba(26,61,40,.1)':'0 2px 8px rgba(0,0,0,.05)'}}>
                <FlagImage team={teamName} size="lg" grayscale={blocked}/>
                <div style={{fontFamily:'Sora',fontWeight:700,fontSize:11,textTransform:'uppercase',
                  letterSpacing:'.05em',textAlign:'center'}}>{teamName}</div>
                <div style={{padding:'4px 12px',borderRadius:20,
                  background:burned?'#C4302B':preselected?'#C9A44A':'rgba(26,61,40,.08)',
                  color:burned?'#fff':preselected?'#fff':'#1A3D28',
                  fontFamily:'Sora',fontWeight:700,fontSize:9,letterSpacing:'.06em',textTransform:'uppercase',
                  textDecoration:burned?'line-through':'none'}}>
                  {burned?'QUEIMADO':preselected?'PRÉ-SELECIONADO':'DISPONÍVEL'}
                </div>
              </button>
            )
          }
          return (
            <div key={match.id} style={{marginBottom:12}}>
              <div style={{fontFamily:'Sora',fontSize:9,fontWeight:700,letterSpacing:'.1em',
                textTransform:'uppercase',color:'#9CA3AF',marginBottom:10,textAlign:'center'}}>
                {match.group_name?`GRUPO ${match.group_name.replace('GROUP_','')} · `:''}
                {fmtTime(match.utc_date)} BRT
              </div>
              <div style={{display:'flex',gap:10}}>
                <TeamCard teamId={match.home_team_id} teamName={match.home_team} matchId={match.id}/>
                <TeamCard teamId={match.away_team_id} teamName={match.away_team} matchId={match.id}/>
              </div>
            </div>
          )
        })}

        {/* Confirm */}
        {canPick && !eliminated && dayMs.length>0 && (
          <>
            {error && (
              <div style={{background:'#FEF0EF',borderRadius:10,padding:'10px 14px',fontSize:12,
                marginBottom:10,color:'#C4302B',fontFamily:'Inter',
                border:'1px solid rgba(196,48,43,.2)'}}>{error}</div>
            )}
            <button onClick={handleSubmit} disabled={!selected || submitting}
              style={{width:'100%',padding:'16px',borderRadius:14,border:'none',cursor:'pointer',
                background:selected?'linear-gradient(135deg,#C9A44A,#A07830)':'#E8E3DB',
                color:selected?'#fff':'#B0A898',fontFamily:'Sora',fontWeight:700,
                fontSize:14,letterSpacing:'.08em',textTransform:'uppercase',transition:'all .15s',
                boxShadow:selected?'0 4px 16px rgba(201,164,74,.35)':'none'}}>
              {submitting?'CONFIRMANDO...':selected?`${canChange?'TROCAR PARA':'CONFIRMAR'} — ${selected.teamName}`:'SELECIONE UM TIME'}
            </button>
            <div style={{textAlign:'center',fontSize:11,color:'#9CA3AF',marginTop:8,fontFamily:'Inter'}}>
              Você pode trocar livremente até o fim do contador. Depois trava.
            </div>
          </>
        )}
      </div>
    </div>
  )
}
