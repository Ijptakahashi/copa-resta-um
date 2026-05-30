import { useState, useEffect, useRef } from 'react'
import { RefreshCw, Clock, CheckCircle, Zap, ChevronLeft, ChevronRight } from 'lucide-react'
import { getMatches } from '../lib/supabase'
import { syncMatches } from '../lib/football'
import { STAGE_TO_PHASE, PHASE_LABEL, toLocalDateISO } from '../lib/gameLogic'
import FlagImage from '../components/FlagImage'

function normName(n='') {
  return n.toLowerCase()
    .replace(/&/g,'and').replace(/\s+/g,' ')
    .replace('united states','usa')
    .replace('bosnia-herzegovina','bosnia and herzegovina')
    .replace('bosnia & herzegovina','bosnia and herzegovina')
    .replace('czechia','czech republic')
    .replace('türkiye','turkey')
    .replace("côte d'ivoire",'ivory coast')
    .replace("cote d'ivoire",'ivory coast')
    .trim()
}

export default function Calendar() {
  const [matches, setMatches]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [syncing, setSyncing]   = useState(false)
  const [selectedDate, setDate] = useState('')
  const [dateIdx, setDateIdx]   = useState(0)
  const scrollRef               = useRef(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const raw = await getMatches()
    const seen = new Set()
    const clean = raw.filter(m => {
      const d = toLocalDateISO(m.utc_date)
      const key = `${d}|${normName(m.home_team)}|${normName(m.away_team)}`
      const rev  = `${d}|${normName(m.away_team)}|${normName(m.home_team)}`
      if (seen.has(key) || seen.has(rev)) return false
      seen.add(key); return true
    })
    setMatches(clean)
    if (clean.length > 0) {
      const dates = [...new Set(clean.map(m => toLocalDateISO(m.utc_date)))].sort()
      const today = new Date().toISOString().slice(0,10)
      const idx   = dates.findIndex(d => d >= today)
      const start = idx >= 0 ? idx : 0
      setDateIdx(start)
      setDate(dates[start])
    }
    setLoading(false)
  }

  async function handleSync() { setSyncing(true); await syncMatches(); await load(); setSyncing(false) }

  const dates = [...new Set(matches.map(m => toLocalDateISO(m.utc_date)))].sort()
  const filtered = selectedDate ? matches.filter(m => toLocalDateISO(m.utc_date) === selectedDate) : []

  function formatDay(d) {
    const [y,mo,day] = d.split('-')
    return new Date(y,mo-1,day).toLocaleDateString('pt-BR',{weekday:'short',day:'numeric',month:'short'})
  }
  function kickoff(utcDate) {
    return new Date(utcDate).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'})
  }

  function goDate(dir) {
    const next = dateIdx + dir
    if (next < 0 || next >= dates.length) return
    setDateIdx(next)
    setDate(dates[next])
    // Scroll chip into view
    setTimeout(() => {
      const el = scrollRef.current?.children[next]
      el?.scrollIntoView({ behavior:'smooth', inline:'center', block:'nearest' })
    }, 50)
  }

  if (loading) return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
      height:'50vh',gap:12,color:'#9CA3AF'}}>
      <RefreshCw size={32} style={{animation:'spin 1s linear infinite'}}/>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <span style={{fontFamily:'Sora',fontSize:13}}>Carregando fixtures...</span>
    </div>
  )

  return (
    <div style={{padding:'20px 16px 100px',maxWidth:480,margin:'0 auto'}}>
      <div style={{fontFamily:'Sora',fontSize:22,fontWeight:800,color:'#1A4731',marginBottom:16}}>
        Fixtures
      </div>

      {matches.length === 0 ? (
        <div style={{background:'#fff',borderRadius:16,padding:'32px 20px',textAlign:'center',
          boxShadow:'0 2px 12px rgba(0,0,0,.06)'}}>
          <RefreshCw size={40} color="#D6B36A" style={{margin:'0 auto 12px'}}/>
          <div style={{fontFamily:'Sora',fontWeight:700,fontSize:16,marginBottom:8}}>Sem partidas carregadas</div>
          <div style={{fontSize:13,color:'#6B7280',marginBottom:20}}>
            Sincronize para buscar os 72 jogos da Copa 2026
          </div>
          <button onClick={handleSync} disabled={syncing}
            style={{padding:'12px 24px',borderRadius:12,border:'none',
              background:'linear-gradient(135deg,#1A4731,#2D7A54)',color:'#fff',
              fontFamily:'Sora',fontSize:13,fontWeight:700,cursor:'pointer',
              display:'flex',alignItems:'center',gap:8,margin:'0 auto'}}>
            <RefreshCw size={14}/>{syncing?'Sincronizando...':'Carregar jogos'}
          </button>
        </div>
      ) : <>
        {/* Date nav with arrows */}
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16}}>
          <button onClick={()=>goDate(-1)} disabled={dateIdx===0}
            style={{width:36,height:36,borderRadius:'50%',border:'1px solid #E5E7EB',
              background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',
              cursor:dateIdx===0?'not-allowed':'pointer',opacity:dateIdx===0?.3:1,flexShrink:0,
              boxShadow:'0 1px 4px rgba(0,0,0,.08)'}}>
            <ChevronLeft size={18} color="#374151"/>
          </button>

          <div style={{flex:1,overflow:'hidden'}}>
            <div ref={scrollRef} style={{display:'flex',gap:8,overflowX:'auto',
              scrollbarWidth:'none',paddingBottom:2,scrollSnapType:'x mandatory'}}>
              {dates.map((d,i) => (
                <button key={d} onClick={()=>{setDate(d);setDateIdx(i)}}
                  style={{
                    padding:'8px 14px',borderRadius:20,border:'none',cursor:'pointer',
                    fontFamily:'Sora',fontSize:11,fontWeight:700,whiteSpace:'nowrap',
                    transition:'all .15s',flexShrink:0,scrollSnapAlign:'center',
                    background: selectedDate===d
                      ? 'linear-gradient(135deg,#1A4731,#2D7A54)' : '#fff',
                    color: selectedDate===d ? '#D6B36A' : '#6B7280',
                    boxShadow: selectedDate===d
                      ? '0 4px 12px rgba(26,71,49,.25)' : '0 1px 4px rgba(0,0,0,.08)',
                  }}>
                  {formatDay(d)}
                </button>
              ))}
            </div>
          </div>

          <button onClick={()=>goDate(1)} disabled={dateIdx===dates.length-1}
            style={{width:36,height:36,borderRadius:'50%',border:'1px solid #E5E7EB',
              background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',
              cursor:dateIdx===dates.length-1?'not-allowed':'pointer',
              opacity:dateIdx===dates.length-1?.3:1,flexShrink:0,
              boxShadow:'0 1px 4px rgba(0,0,0,.08)'}}>
            <ChevronRight size={18} color="#374151"/>
          </button>
        </div>

        {/* Day label */}
        <div style={{fontFamily:'Sora',fontSize:12,fontWeight:700,color:'#9CA3AF',
          letterSpacing:'.06em',textTransform:'uppercase',marginBottom:12}}>
          {selectedDate && formatDay(selectedDate)} · {filtered.length} jogo{filtered.length!==1?'s':''}
        </div>

        {/* Match cards */}
        {filtered.map(match => {
          const phase = STAGE_TO_PHASE[match.stage]||'groups'
          const fin  = match.status==='FINISHED'
          const live = match.status==='IN_PLAY'||match.status==='PAUSED'
          const homeWon = match.winner==='HOME_TEAM'
          const awayWon = match.winner==='AWAY_TEAM'
          return (
            <div key={`${match.id}-${match.home_team}`}
              style={{background:'#fff',borderRadius:16,padding:'16px',marginBottom:10,
                boxShadow:'0 2px 12px rgba(0,0,0,.06)',border:'1px solid #F3F0EA'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                <span style={{fontFamily:'Sora',fontSize:9,fontWeight:700,letterSpacing:'.1em',
                  textTransform:'uppercase',color:'#9CA3AF'}}>
                  {match.group_name?`Grupo ${match.group_name.replace('GROUP_','')} · `:''}
                  {PHASE_LABEL[phase]||phase}
                </span>
                {live && <span style={{display:'flex',alignItems:'center',gap:4,background:'#FEE2E2',
                  color:'#DC2626',padding:'3px 8px',borderRadius:20,fontFamily:'Sora',fontSize:9,fontWeight:700}}>
                  <Zap size={10}/> AO VIVO
                </span>}
                {fin && <span style={{display:'flex',alignItems:'center',gap:4,color:'#9CA3AF',
                  fontFamily:'Sora',fontSize:9,fontWeight:700}}>
                  <CheckCircle size={10}/> ENCERRADO
                </span>}
                {!fin&&!live && <span style={{display:'flex',alignItems:'center',gap:4,
                  color:'#D6B36A',fontFamily:'Sora',fontSize:11,fontWeight:700}}>
                  <Clock size={12}/> {kickoff(match.utc_date)}
                </span>}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 64px 1fr',gap:8,alignItems:'center'}}>
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8}}>
                  <FlagImage team={match.home_team} size="lg"/>
                  <div style={{fontFamily:'Sora',fontSize:10,fontWeight:700,textTransform:'uppercase',
                    letterSpacing:'.04em',textAlign:'center',color:homeWon?'#1A4731':'#374151'}}>
                    {match.home_team}{homeWon?' ✓':''}
                  </div>
                </div>
                <div style={{textAlign:'center'}}>
                  {(fin||live)
                    ? <div style={{fontFamily:'Sora',fontSize:26,fontWeight:800,color:'#111827',lineHeight:1}}>
                        {match.home_score??'–'}<span style={{color:'#E5E7EB',margin:'0 2px'}}>:</span>{match.away_score??'–'}
                      </div>
                    : <div>
                        <div style={{fontFamily:'Sora',fontSize:10,fontWeight:700,color:'#D1D5DB',letterSpacing:'.05em'}}>VS</div>
                        <div style={{fontFamily:'Sora',fontSize:13,fontWeight:800,color:'#D6B36A',marginTop:2}}>{kickoff(match.utc_date)}</div>
                      </div>
                  }
                </div>
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8}}>
                  <FlagImage team={match.away_team} size="lg"/>
                  <div style={{fontFamily:'Sora',fontSize:10,fontWeight:700,textTransform:'uppercase',
                    letterSpacing:'.04em',textAlign:'center',color:awayWon?'#1A4731':'#374151'}}>
                    {awayWon?'✓ ':''}{match.away_team}
                  </div>
                </div>
              </div>
            </div>
          )
        })}

        <button onClick={handleSync} disabled={syncing}
          style={{width:'100%',padding:13,borderRadius:12,border:'1.5px solid #E5E7EB',
            background:'#fff',color:'#6B7280',fontFamily:'Sora',fontSize:12,fontWeight:700,
            cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',
            gap:8,marginTop:8}}>
          <RefreshCw size={14} style={syncing?{animation:'spin 1s linear infinite'}:{}}/>
          {syncing?'Atualizando...':'Atualizar resultados'}
        </button>
      </>}
    </div>
  )
}
