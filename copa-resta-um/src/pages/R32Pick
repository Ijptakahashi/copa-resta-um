import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check } from 'lucide-react'
import { getPlayerPicks, getMatches, submitPick } from '../lib/supabase'
import { validateR32Pick, canonTeam } from '../lib/gameLogic'
import { countryCode } from '../components/FlagImage'

// ─── Bracket do R32 — defina aqui o lado de cada confronto ──────
// Baseado no chaveamento oficial (bracket BBC). Ajuste conforme os
// confrontos finais da fase de grupos forem confirmados.
const R32_BRACKET = {
  // Lado ESQUERDO do bracket oficial (The Athletic) — caminha para a
  // quarter-final de Boston (jul 9) e Los Angeles (jul 10)
  left: [
    { home: 'Germany', away: 'Paraguay' },           // Boston, 29 jun
    { home: 'France', away: 'Sweden' },               // New York, 30 jun
    { home: 'South Africa', away: 'Canada' },         // Los Angeles, 28 jun
    { home: 'Netherlands', away: 'Morocco' },         // Monterrey, 29 jun
    { home: 'Portugal', away: 'Croatia' },            // Toronto, 2 jul
    { home: 'Spain', away: 'Austria' },               // Los Angeles, 2 jul
    { home: 'United States', away: 'Bosnia and Herzegovina' }, // San Francisco, 1 jul
    { home: 'Belgium', away: 'Senegal' },             // Seattle, 1 jul
  ],
  // Lado DIREITO do bracket oficial — caminha para a quarter-final
  // de Miami (jul 11) e Kansas City (jul 11)
  right: [
    { home: 'Brazil', away: 'Japan' },                // Houston, 29 jun
    { home: 'Ivory Coast', away: 'Norway' },          // Dallas, 30 jun
    { home: 'Mexico', away: 'Ecuador' },              // Mexico City, 30 jun
    { home: 'England', away: 'DR Congo' },            // Atlanta, 1 jul
    { home: 'Argentina', away: 'Cape Verde' },        // Miami, 3 jul
    { home: 'Australia', away: 'Egypt' },             // Dallas, 3 jul
    { home: 'Switzerland', away: 'Algeria' },         // Vancouver, 2 jul
    { home: 'Colombia', away: 'Ghana' },              // Kansas City, 3 jul
  ],
}

function sideOfTeam(teamName) {
  const c = canonTeam(teamName)
  for (const side of ['left', 'right']) {
    for (const m of R32_BRACKET[side]) {
      if (canonTeam(m.home) === c || canonTeam(m.away) === c) return side
    }
  }
  return null
}

export default function R32Pick({ player }) {
  const navigate = useNavigate()
  const [allPicks, setAllPicks] = useState([])
  const [matches, setMatches]   = useState([])
  const [side, setSide]         = useState('left')
  const [selected, setSelected] = useState([])   // nomes já confirmados (banco)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)

  useEffect(() => { load() }, [player.id])

  async function load() {
    setLoading(true)
    const [picks, ms] = await Promise.all([getPlayerPicks(player.id), getMatches()])
    setAllPicks(picks)
    setMatches(ms)
    const r32 = picks.filter(p => p.phase === 'r32' && p.team_name !== 'no_pick')
    setSelected(r32.map(p => p.team_name))
    setLoading(false)
  }

  const knockoutPicks = allPicks.filter(p => p.phase && p.phase !== 'groups')
  const leftCount  = selected.filter(t => sideOfTeam(t) === 'left').length
  const rightCount = selected.filter(t => sideOfTeam(t) === 'right').length
  const sideCount  = side === 'left' ? leftCount : rightCount
  const matchesOfSide = R32_BRACKET[side]

  function findMatchRecord(home, away) {
    const cH = canonTeam(home), cA = canonTeam(away)
    return matches.find(m => {
      const mh = canonTeam(m.home_team), ma = canonTeam(m.away_team)
      return (mh === cH && ma === cA) || (mh === cA && ma === cH)
    })
  }

  async function togglePick(teamName, matchRecord) {
    setError('')
    const already = selected.includes(teamName)
    if (already) {
      // Desmarcar: remove a pick do banco (volta pra null/no_pick neste fluxo simplificado)
      setSelected(prev => prev.filter(t => t !== teamName))
      return
    }
    const v = validateR32Pick(knockoutPicks, teamName, side, sideCount)
    if (!v.valid) { setError(v.reason); return }
    setSelected(prev => [...prev, teamName])
  }

  async function confirmSide() {
    if (sideCount !== 2) { setError(`Escolha exatamente 2 seleções do lado ${side === 'left' ? 'esquerdo' : 'direito'}.`); return }
    setSaving(true); setError('')
    try {
      const teamsThisSide = selected.filter(t => sideOfTeam(t) === side)
      for (const teamName of teamsThisSide) {
        const m = matchesOfSide.find(mm => canonTeam(mm.home) === canonTeam(teamName) || canonTeam(mm.away) === canonTeam(teamName))
        const rec = m ? findMatchRecord(m.home, m.away) : null
        await submitPick({
          playerId: player.id,
          matchId: rec ? rec.id : null,
          teamName, teamId: 0, phase: 'r32',
          pickDate: rec ? rec.utc_date?.slice(0,10) : null,
          isRepeat: false,
        })
      }
      await load()
      if (side === 'left') setSide('right')
    } catch (e) {
      setError('Erro ao salvar: ' + e.message)
    } finally { setSaving(false) }
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}>
      <div style={{ width:32, height:32, borderRadius:'50%', border:'3px solid #E8E3DB',
        borderTopColor:'#1A3D28', animation:'spin 1s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ maxWidth:430, margin:'0 auto', background:'#F8F4EE', minHeight:'100svh' }}>
      <div style={{ padding:'14px 16px 0', display:'flex', alignItems:'center', gap:10 }}>
        <button onClick={() => navigate('/dashboard')}
          style={{ width:36, height:36, borderRadius:'50%', border:'1px solid rgba(0,0,0,.1)',
            background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
          <ArrowLeft size={18}/>
        </button>
      </div>

      <div style={{ padding:'14px 16px' }}>
        <div style={{ fontFamily:'Sora', fontWeight:800, fontSize:26, color:'#1A3D28',
          letterSpacing:'-1px', lineHeight:1.05 }}>SUAS PICKS<br/>R32</div>
        <div style={{ fontSize:12, color:'#9A9384', marginTop:4 }}>
          Escolha 2 seleções de cada lado da chave — válidas para toda a fase
        </div>

        {/* Progress */}
        <div style={{ display:'flex', gap:6, margin:'14px 0' }}>
          {[0,1].map(i => <div key={i} style={{ flex:1, height:5, borderRadius:3,
            background: i===0 ? (leftCount===2?'#C9A44A':'#E5DFD2') : (rightCount===2?'#C9A44A':'#E5DFD2') }}/>)}
        </div>

        {/* Side toggle */}
        <div style={{ display:'flex', background:'#EFE7D8', borderRadius:12, padding:3, marginBottom:14 }}>
          {['left','right'].map(s => (
            <button key={s} onClick={() => setSide(s)}
              style={{ flex:1, textAlign:'center', padding:9, borderRadius:9, border:'none', cursor:'pointer',
                fontFamily:'Sora', fontWeight:700, fontSize:11, letterSpacing:'.06em',
                background: side===s ? '#fff' : 'transparent',
                color: side===s ? '#1A3D28' : '#B0A898',
                boxShadow: side===s ? '0 1px 4px rgba(0,0,0,.08)' : 'none' }}>
              {s==='left' ? '◀ LADO ESQUERDO' : 'LADO DIREITO ▶'}
            </button>
          ))}
        </div>

        {/* Counter */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
          background:'#15291C', borderRadius:12, padding:'12px 16px', marginBottom:14 }}>
          <div>
            <div style={{ fontFamily:'Sora', fontWeight:700, fontSize:10, letterSpacing:'.1em',
              color:'rgba(201,164,74,.8)', textTransform:'uppercase' }}>
              Picks no lado {side==='left'?'esquerdo':'direito'}
            </div>
            <div style={{ fontFamily:'Sora', fontWeight:800, fontSize:20, color:'#fff', marginTop:2 }}>
              {sideCount} / 2
            </div>
          </div>
          <div style={{ display:'flex', gap:5 }}>
            {[0,1].map(i => <div key={i} style={{ width:9, height:9, borderRadius:'50%',
              background: i < sideCount ? '#C9A44A' : 'rgba(255,255,255,.2)' }}/>)}
          </div>
        </div>

        {error && (
          <div style={{ background:'#FEF0EF', borderRadius:10, padding:'10px 14px', fontSize:12,
            color:'#C4302B', marginBottom:12, border:'1px solid rgba(196,48,43,.2)' }}>{error}</div>
        )}

        {/* Match cards */}
        {matchesOfSide.map((m, idx) => {
          const rec = findMatchRecord(m.home, m.away)
          const pending = !rec
          return (
            <div key={idx} style={{ background:'#fff', borderRadius:14, padding:'12px 14px',
              marginBottom:10, border:'1px solid rgba(0,0,0,.06)', boxShadow:'0 1px 6px rgba(0,0,0,.04)',
              opacity: pending ? .45 : 1 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8,
                fontFamily:'Sora', fontSize:9, fontWeight:700, letterSpacing:'.08em',
                color:'#B0A898', textTransform:'uppercase' }}>
                <span>{pending ? 'PENDENTE' : (rec.utc_date?.slice(0,10) || '')}</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                {[m.home, m.away].map((teamName, i) => {
                  const isSel = selected.includes(teamName)
                  const code = countryCode(teamName)
                  return (
                    <div key={i}
                      onClick={() => !pending && togglePick(teamName, rec)}
                      style={{ flex:1, display:'flex', alignItems:'center', gap:8, padding:'8px 10px',
                        borderRadius:10, border:`1.5px solid ${isSel?'#1A3D28':'rgba(0,0,0,.07)'}`,
                        background: isSel ? 'rgba(26,61,40,.05)' : 'transparent',
                        cursor: pending ? 'not-allowed' : 'pointer' }}>
                      {code && <img src={`https://flagcdn.com/w40/${code}.png`} width={24} height={17}
                        style={{ borderRadius:3, flexShrink:0 }} alt=""/>}
                      <span style={{ fontFamily:'Sora', fontWeight:600, fontSize:12, color:'#1A1A1A' }}>{teamName}</span>
                      {isSel && (
                        <div style={{ width:16, height:16, borderRadius:'50%', background:'#1A3D28',
                          display:'flex', alignItems:'center', justifyContent:'center', marginLeft:'auto', flexShrink:0 }}>
                          <Check size={10} color="#fff"/>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        <button onClick={confirmSide} disabled={sideCount!==2 || saving}
          style={{ width:'100%', marginTop:8, padding:15, borderRadius:14, border:'none', cursor:'pointer',
            fontFamily:'Sora', fontWeight:700, fontSize:13, letterSpacing:'.06em',
            background: sideCount===2 ? 'linear-gradient(135deg,#C9A44A,#A07830)' : '#E8E3DB',
            color: sideCount===2 ? '#fff' : '#B0A898',
            boxShadow: sideCount===2 ? '0 4px 16px rgba(201,164,74,.35)' : 'none' }}>
          {saving ? 'SALVANDO...' : `CONFIRMAR PICKS DO LADO ${side==='left'?'ESQUERDO':'DIREITO'}`}
        </button>
      </div>
    </div>
  )
}
