import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check } from 'lucide-react'
import { getPlayerPicks, getMatches, submitPick } from '../lib/supabase'
import { validateR32Pick, canonTeam, r32Deadline, isR32Open } from '../lib/gameLogic'
import { Lock } from 'lucide-react'
import { countryCode } from '../components/FlagImage'
import { R32_BRACKET, sideOfTeam as sideOfTeamShared } from '../lib/r32bracket'

// ─── Bracket do R32 — defina aqui o lado de cada confronto ──────
// Baseado no chaveamento oficial (bracket BBC). Ajuste conforme os
// confrontos finais da fase de grupos forem confirmados.

function DeadlineCountdown({ deadline }) {
  const [t, setT] = useState({ d:'--', h:'--', m:'--', s:'--' })
  useEffect(() => {
    function tick() {
      const diff = deadline - Date.now()
      if (diff <= 0) { setT({ d:'00', h:'00', m:'00', s:'00' }); return }
      setT({
        d: String(Math.floor(diff/86400000)).padStart(2,'0'),
        h: String(Math.floor((diff%86400000)/3600000)).padStart(2,'0'),
        m: String(Math.floor((diff%3600000)/60000)).padStart(2,'0'),
        s: String(Math.floor((diff%60000)/1000)).padStart(2,'0'),
      })
    }
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id)
  }, [deadline])
  return <span style={{fontFamily:'Sora',fontWeight:800,color:'#C4302B'}}>{t.d}d {t.h}:{t.m}:{t.s}</span>
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
  const [deadline, setDeadline] = useState(null)
  const [marketOpen, setMarketOpen] = useState(true)

  useEffect(() => { load() }, [player.id])

  async function load() {
    setLoading(true)
    const [picks, ms] = await Promise.all([getPlayerPicks(player.id), getMatches()])
    setAllPicks(picks)
    setMatches(ms)
    const r32 = picks.filter(p => p.phase === 'r32' && p.team_name !== 'no_pick')
    setSelected(r32.map(p => p.team_name))
    setDeadline(r32Deadline(ms))
    setMarketOpen(isR32Open(ms))
    setLoading(false)
  }

  const knockoutPicks = allPicks.filter(p => p.phase && p.phase !== 'groups')
  const leftCount  = selected.filter(t => sideOfTeamShared(t, canonTeam) === 'left').length
  const rightCount = selected.filter(t => sideOfTeamShared(t, canonTeam) === 'right').length
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
    if (!marketOpen) { setError('O mercado do R32 já fechou. Não é mais possível alterar suas picks.'); return }
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
    if (!marketOpen) { setError('O mercado do R32 já fechou.'); return }
    if (sideCount !== 2) { setError(`Escolha exatamente 2 seleções do lado ${side === 'left' ? 'esquerdo' : 'direito'}.`); return }
    setSaving(true); setError('')
    try {
      const teamsThisSide = selected.filter(t => sideOfTeamShared(t, canonTeam) === side)
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

        {deadline && marketOpen && (
          <div style={{ background:'#FEF0EF', borderRadius:10, padding:'10px 14px', margin:'12px 0',
            display:'flex', alignItems:'center', gap:8, border:'1px solid rgba(196,48,43,.15)' }}>
            <Lock size={13} color="#C4302B"/>
            <span style={{ fontFamily:'Sora', fontWeight:600, fontSize:12, color:'#C4302B' }}>
              Picks do R32 fecham em <DeadlineCountdown deadline={deadline}/>
            </span>
          </div>
        )}
        {deadline && !marketOpen && (
          <div style={{ background:'#FEF0EF', borderRadius:10, padding:'14px', margin:'12px 0',
            textAlign:'center', border:'1px solid rgba(196,48,43,.15)' }}>
            <Lock size={20} color="#C4302B" style={{ marginBottom:6 }}/>
            <div style={{ fontFamily:'Sora', fontWeight:700, color:'#C4302B', fontSize:14 }}>MERCADO FECHADO</div>
            <div style={{ fontSize:11, color:'#9A9384', marginTop:2 }}>Suas picks do R32 estão travadas.</div>
          </div>
        )}

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
