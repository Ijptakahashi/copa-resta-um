import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Lock, RefreshCw } from 'lucide-react'
import { getPlayerPicks, getMatches, submitQfPick, removeQfPickByMatch } from '../lib/supabase'
import { validateQfPick, canonTeam, qfDeadline, isQfOpen } from '../lib/gameLogic'
import { countryCode } from '../components/FlagImage'
import { R8_BRACKET, isInR8 } from '../lib/r8bracket'

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

export default function R8Pick({ player }) {
  const navigate = useNavigate()
  const [allPicks, setAllPicks]     = useState([])
  const [matches, setMatches]       = useState([])
  const [error, setError]           = useState('')
  const [loading, setLoading]       = useState(true)
  const [savingTeam, setSavingTeam] = useState(null)
  const [deadline, setDeadline]     = useState(null)
  const [marketOpen, setMarketOpen] = useState(true)

  useEffect(() => {
    load()
    const onVis = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [player.id])

  async function load() {
    setLoading(true)
    const [picks, ms] = await Promise.all([getPlayerPicks(player.id), getMatches()])
    setAllPicks(picks)
    setMatches(ms)
    setDeadline(qfDeadline(ms))
    setMarketOpen(isQfOpen(ms))
    setLoading(false)
  }

  // Pick única de QF já confirmada no banco (fonte da verdade).
  const qfPick = allPicks.find(p => p.phase === 'qf' && p.team_name !== 'no_pick') || null
  const knockoutPicks = allPicks.filter(p => p.phase && p.phase !== 'groups')

  // Time queimado nos grupos (perdeu) não pode ser escolhido.
  function isBurnedFromGroups(teamName) {
    const c = canonTeam(teamName)
    return allPicks.some(p =>
      p.phase === 'groups' && canonTeam(p.team_name) === c && p.result === 'loss')
  }
  // Time já usado em fase anterior do mata-mata não pode repetir.
  function isUsedInKnockout(teamName) {
    const c = canonTeam(teamName)
    return allPicks.some(p =>
      p.team_name !== 'no_pick' && p.phase && p.phase !== 'groups' && p.phase !== 'qf' &&
      canonTeam(p.team_name) === c)
  }

  // Acha o registro de match no banco para um confronto do bracket.
  function matchRecordFor(home, away) {
    const cH = canonTeam(home), cA = canonTeam(away)
    return matches.find(m => {
      const mH = canonTeam(m.home_team), mA = canonTeam(m.away_team)
      return (mH === cH && mA === cA) || (mH === cA && mA === cH)
    })
  }

  async function selectTeam(teamName, matchRecord) {
    if (savingTeam) return
    if (!marketOpen) { setError('O mercado das quartas está fechado.'); return }
    if (!matchRecord) { setError(`Jogo de ${teamName} ainda não está no sistema. Tente atualizar.`); return }
    setError('')

    const pickDate = matchRecord.utc_date?.slice(0,10)

    // Clicar na seleção já escolhida = desmarcar.
    if (qfPick && qfPick.team_name === teamName) {
      setSavingTeam(teamName)
      try {
        await removeQfPickByMatch(player.id, matchRecord.id)
        setAllPicks(prev => prev.filter(p => !(p.phase==='qf' && p.match_id===matchRecord.id)))
      } catch (e) { setError('Erro ao remover: ' + e.message) }
      finally { setSavingTeam(null) }
      return
    }

    if (isBurnedFromGroups(teamName)) { setError(`${teamName} está queimada — perdeu na fase de grupos.`); return }
    if (isUsedInKnockout(teamName)) { setError(`${teamName} já foi escolhida em outra fase do mata-mata. Não pode repetir.`); return }

    // Validação: 1 pick por fase. Conta as de qf que NÃO são deste mesmo jogo.
    const qfCountOther = allPicks.filter(p =>
      p.phase === 'qf' && p.team_name !== 'no_pick' && p.match_id !== matchRecord.id).length
    const v = validateQfPick(knockoutPicks, teamName, qfCountOther)
    if (!v.valid) { setError(v.reason); return }

    setSavingTeam(teamName)
    try {
      await submitQfPick({
        playerId: player.id, matchId: matchRecord.id,
        teamName, phase: 'qf', pickDate,
      })
      // Recarrega do banco pra refletir a troca (remove pick antiga de outro jogo).
      const picks = await getPlayerPicks(player.id)
      setAllPicks(picks)
    } catch (e) { setError('Erro ao salvar: ' + e.message) }
    finally { setSavingTeam(null) }
  }

  if (loading) {
    return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',
      fontFamily:'Sora',color:'#6B6B6B'}}>Carregando…</div>
  }

  const confirmed = !!qfPick

  return (
    <div style={{minHeight:'100vh',background:'#F4EFE7',paddingBottom:40}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:12,padding:'16px 18px'}}>
        <button onClick={() => navigate('/dashboard')}
          style={{background:'none',border:'none',cursor:'pointer',padding:4}}>
          <ArrowLeft size={22} color="#1A3D28"/>
        </button>
        <div style={{fontFamily:'Sora',fontWeight:800,fontSize:18,color:'#1A3D28'}}>
          Quartas de Final
        </div>
      </div>

      {/* Status card */}
      <div style={{margin:'0 16px 16px',background:'#1A3D28',borderRadius:16,padding:'16px 18px',color:'#fff'}}>
        <div style={{fontFamily:'Sora',fontWeight:700,fontSize:11,letterSpacing:'.1em',
          textTransform:'uppercase',color:'#C9A44A',marginBottom:6}}>Sua pick das quartas</div>
        <div style={{fontFamily:'Sora',fontWeight:800,fontSize:22,display:'flex',alignItems:'center',gap:10}}>
          {confirmed
            ? <>{(() => { const c=countryCode(qfPick.team_name); return c &&
                <img src={`https://flagcdn.com/w40/${c}.png`} width={28} height={20}
                  style={{borderRadius:3}} alt=""/> })()}{qfPick.team_name}
                <Check size={20} color="#7CC47F"/></>
            : <span style={{color:'#C9A44A'}}>Nenhuma ainda</span>}
        </div>
        <div style={{marginTop:10,fontFamily:'Inter',fontSize:12,color:'rgba(255,255,255,.7)'}}>
          {marketOpen
            ? <>Escolha 1 seleção entre as 8. Fecha em {deadline && <DeadlineCountdown deadline={deadline}/>}</>
            : <span style={{color:'#E8A0A0'}}>🔒 Mercado fechado</span>}
        </div>
      </div>

      {error && (
        <div style={{margin:'0 16px 12px',background:'#FEF0EF',border:'1px solid rgba(196,48,43,.25)',
          borderRadius:10,padding:'10px 14px',fontFamily:'Inter',fontSize:13,color:'#C4302B'}}>{error}</div>
      )}

      {/* Match cards */}
      <div style={{padding:'0 16px',display:'flex',flexDirection:'column',gap:12}}>
        {R8_BRACKET.map((m, idx) => {
          const rec = matchRecordFor(m.home, m.away)
          return (
            <div key={idx} style={{background:'#fff',borderRadius:14,padding:12,
              boxShadow:'0 2px 12px rgba(0,0,0,.04)'}}>
              <div style={{display:'flex',gap:8}}>
                {[m.home, m.away].map((teamName, i) => {
                  const isSel = qfPick && qfPick.team_name === teamName
                  const burned = isBurnedFromGroups(teamName)
                  const usedElsewhere = !isSel && isUsedInKnockout(teamName)
                  const unavailable = burned || usedElsewhere
                  const isSaving = savingTeam === teamName
                  const code = countryCode(teamName)
                  // Se já tem pick de QF em OUTRO jogo, bloqueia novas (mas permite desmarcar a atual).
                  const blockedByLimit = confirmed && !isSel
                  const isBlocked = unavailable || !marketOpen || blockedByLimit
                  return (
                    <div key={i}
                      onClick={() => !isBlocked && selectTeam(teamName, rec)}
                      style={{ flex:1, display:'flex', alignItems:'center', gap:8, padding:'10px 12px',
                        borderRadius:10, border:`1.5px solid ${isSel?'#1A3D28':unavailable?'rgba(196,48,43,.3)':'rgba(0,0,0,.07)'}`,
                        background: isSel ? 'rgba(26,61,40,.06)' : unavailable ? '#FEF5F5' : 'transparent',
                        cursor: isBlocked ? 'not-allowed' : 'pointer',
                        opacity: (unavailable || blockedByLimit) ? .5 : 1,
                        position:'relative' }}>
                      {isSaving && (
                        <div style={{ position:'absolute', inset:0, background:'rgba(255,255,255,.7)',
                          display:'flex', alignItems:'center', justifyContent:'center', borderRadius:10 }}>
                          <RefreshCw size={14} color="#1A3D28" style={{ animation:'spin 1s linear infinite' }}/>
                        </div>
                      )}
                      {code && <img src={`https://flagcdn.com/w40/${code}.png`} width={26} height={18}
                        style={{ borderRadius:3, flexShrink:0 }} alt=""/>}
                      <span style={{ fontFamily:'Sora', fontWeight:600, fontSize:13, color:'#1A1A1A',
                        textDecoration: unavailable ? 'line-through' : 'none' }}>{teamName}</span>
                      {usedElsewhere && (
                        <span style={{ fontFamily:'Sora', fontSize:8, fontWeight:700, color:'#C4302B',
                          marginLeft:'auto', flexShrink:0 }}>JÁ USADA</span>
                      )}
                      {burned && !usedElsewhere && (
                        <span style={{ fontFamily:'Sora', fontSize:8, fontWeight:700, color:'#C4302B',
                          marginLeft:'auto', flexShrink:0 }}>QUEIMADA</span>
                      )}
                      {isSel && <Check size={16} color="#1A3D28" style={{marginLeft:'auto',flexShrink:0}}/>}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {confirmed && marketOpen && (
        <div style={{margin:'16px',fontFamily:'Inter',fontSize:12,color:'#6B6B6B',textAlign:'center'}}>
          Toque na sua seleção de novo para trocar por outra.
        </div>
      )}
    </div>
  )
}
