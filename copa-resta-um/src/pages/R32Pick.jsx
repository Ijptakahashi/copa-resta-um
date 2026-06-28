import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Lock, RefreshCw } from 'lucide-react'
import { getPlayerPicks, getMatches, submitPick, removePick } from '../lib/supabase'
import { validateR32Pick, canonTeam, r32Deadline, isR32Open } from '../lib/gameLogic'
import { countryCode } from '../components/FlagImage'
import { R32_BRACKET, sideOfTeam as sideOfTeamShared } from '../lib/r32bracket'

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
  const [allPicks, setAllPicks]     = useState([])
  const [matches, setMatches]       = useState([])
  const [side, setSide]             = useState('left')
  const [error, setError]           = useState('')
  const [loading, setLoading]       = useState(true)
  const [savingTeam, setSavingTeam] = useState(null)  // nome do time sendo salvo agora
  const [deadline, setDeadline]     = useState(null)
  const [marketOpen, setMarketOpen] = useState(true)

  useEffect(() => {
    load()
    // Atualiza sozinho ao voltar o foco no app — sem precisar dar refresh manual
    const onVis = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [player.id])

  async function load() {
    setLoading(true)
    const [picks, ms] = await Promise.all([getPlayerPicks(player.id), getMatches()])
    setAllPicks(picks)
    setMatches(ms)
    setDeadline(r32Deadline(ms))
    setMarketOpen(isR32Open(ms))
    setLoading(false)
  }

  // Picks de R32 já confirmadas no banco — fonte única da verdade (sem state duplicado)
  const r32Picks = allPicks.filter(p => p.phase === 'r32' && p.team_name !== 'no_pick')
  const knockoutPicks = allPicks.filter(p => p.phase && p.phase !== 'groups')

  function pickForMatch(home, away) {
    const cH = canonTeam(home), cA = canonTeam(away)
    return r32Picks.find(p => {
      const c = canonTeam(p.team_name)
      return c === cH || c === cA
    })
  }

  const leftPicks  = r32Picks.filter(p => sideOfTeamShared(p.team_name, canonTeam) === 'left')
  const rightPicks = r32Picks.filter(p => sideOfTeamShared(p.team_name, canonTeam) === 'right')
  const leftCount  = leftPicks.length
  const rightCount = rightPicks.length
  const sideCount  = side === 'left' ? leftCount : rightCount
  const sideLocked = sideCount >= 2   // 2 picks confirmadas = lado travado (mesmo com mercado aberto, decisão já feita)
  const matchesOfSide = R32_BRACKET[side]

  function findMatchRecord(home, away) {
    const cH = canonTeam(home), cA = canonTeam(away)
    return matches.find(m => {
      const mh = canonTeam(m.home_team), ma = canonTeam(m.away_team)
      return (mh === cH && ma === cA) || (mh === cA && ma === cH)
    })
  }

  // Time já queimado nos grupos (perdeu) não pode ser escolhido no R32
  function isBurnedFromGroups(teamName) {
    const c = canonTeam(teamName)
    return allPicks.some(p =>
      p.phase === 'groups' && canonTeam(p.team_name) === c && p.result === 'loss')
  }

  async function selectTeam(teamName, matchRecord, otherTeamName) {
    setError('')
    if (!marketOpen) { setError('O mercado do R32 já fechou. Suas picks estão travadas.'); return }

    const existing = pickForMatch(teamName, otherTeamName)

    // Clicar de novo na MESMA seleção já feita = desmarcar (remove a pick desse jogo)
    if (existing && existing.team_name === teamName) {
      setSavingTeam(teamName)
      try {
        await removePick(matchRecord.utc_date?.slice(0,10), existing.id)
        // Atualização otimista: tira do state local na hora, sem esperar releitura do banco
        setAllPicks(prev => prev.filter(p => p.id !== existing.id))
      } catch (e) {
        setError('Erro ao remover: ' + e.message)
      } finally { setSavingTeam(null) }
      return
    }

    if (isBurnedFromGroups(teamName)) { setError(`${teamName} está queimada — perdeu na fase de grupos.`); return }

    // Trocar a pick desse jogo específico não conta como pick nova pro limite de 2,
    // pois está substituindo a seleção já feita NESSE confronto.
    const isSwap = !!existing
    const effectiveSideCount = isSwap ? sideCount - 1 : sideCount

    const v = validateR32Pick(knockoutPicks, teamName, side, effectiveSideCount)
    if (!v.valid) { setError(v.reason); return }

    setSavingTeam(teamName)
    try {
      const saved = await submitPick({
        playerId: player.id,
        matchId: matchRecord.id,
        teamName, teamId: 0, phase: 'r32',
        pickDate: matchRecord.utc_date?.slice(0,10),
        isRepeat: false,
      })
      // Atualização OTIMISTA: atualiza a tela na hora, sem esperar reler do banco
      // (corrige o atraso de leitura que obrigava a dar refresh manual)
      setAllPicks(prev => {
        const withoutOld = existing ? prev.filter(p => p.id !== existing.id) : prev
        const newPickId = saved?.id || existing?.id || `temp-${matchRecord.id}`
        return [...withoutOld, {
          id: newPickId, phase: 'r32', team_name: teamName,
          pick_date: matchRecord.utc_date?.slice(0,10),
          match_id: matchRecord.id, result: null, is_repeat: false,
        }]
      })
      // Releitura em segundo plano pra garantir consistência com o banco (sem bloquear a UI)
      load()
    } catch (e) {
      setError('Erro ao salvar: ' + e.message)
    } finally { setSavingTeam(null) }
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

      {/* padding bottom generoso pra não esconder nada atrás da navbar fixa */}
      <div style={{ padding:'14px 16px 110px' }}>
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
          <div style={{ background:'#EBF5EE', borderRadius:10, padding:'14px', margin:'12px 0',
            textAlign:'center', border:'1px solid rgba(26,61,40,.15)' }}>
            <Check size={20} color="#1A3D28" style={{ marginBottom:6 }}/>
            <div style={{ fontFamily:'Sora', fontWeight:700, color:'#1A3D28', fontSize:14 }}>MERCADO FECHADO</div>
            <div style={{ fontSize:11, color:'#6B6B5E', marginTop:2 }}>Suas picks do R32 estão travadas.</div>
          </div>
        )}

        {/* Progress geral (2 barras = 2 lados) */}
        <div style={{ display:'flex', gap:6, margin:'14px 0' }}>
          {[0,1].map(i => <div key={i} style={{ flex:1, height:5, borderRadius:3,
            background: i===0 ? (leftCount===2?'#C9A44A':'#E5DFD2') : (rightCount===2?'#C9A44A':'#E5DFD2') }}/>)}
        </div>

        {/* Side toggle com selo de confirmado em cada lado */}
        <div style={{ display:'flex', background:'#EFE7D8', borderRadius:12, padding:3, marginBottom:14, gap:2 }}>
          {['left','right'].map(s => {
            const cnt = s==='left' ? leftCount : rightCount
            return (
              <button key={s} onClick={() => setSide(s)}
                style={{ flex:1, textAlign:'center', padding:9, borderRadius:9, border:'none', cursor:'pointer',
                  fontFamily:'Sora', fontWeight:700, fontSize:11, letterSpacing:'.04em',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:5,
                  background: side===s ? '#fff' : 'transparent',
                  color: side===s ? '#1A3D28' : '#B0A898',
                  boxShadow: side===s ? '0 1px 4px rgba(0,0,0,.08)' : 'none' }}>
                {s==='left' ? '◀ ESQUERDO' : 'DIREITO ▶'}
                {cnt===2 && <Check size={12} color="#1A3D28"/>}
              </button>
            )
          })}
        </div>

        {/* Counter com selo de "TRAVADO" claro quando completo */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
          background: sideLocked ? '#0E2417' : '#15291C', borderRadius:12, padding:'12px 16px', marginBottom:14,
          border: sideLocked ? '1px solid rgba(201,164,74,.4)' : 'none' }}>
          <div>
            <div style={{ fontFamily:'Sora', fontWeight:700, fontSize:10, letterSpacing:'.1em',
              color:'rgba(201,164,74,.8)', textTransform:'uppercase' }}>
              Picks no lado {side==='left'?'esquerdo':'direito'}
            </div>
            <div style={{ fontFamily:'Sora', fontWeight:800, fontSize:20, color:'#fff', marginTop:2,
              display:'flex', alignItems:'center', gap:8 }}>
              {sideCount} / 2
              {sideLocked && (
                <span style={{ fontFamily:'Sora', fontSize:9, fontWeight:700, color:'#1A3D28',
                  background:'#C9A44A', padding:'3px 8px', borderRadius:10, letterSpacing:'.04em' }}>
                  ✓ CONFIRMADO
                </span>
              )}
            </div>
          </div>
          <div style={{ display:'flex', gap:5 }}>
            {[0,1].map(i => <div key={i} style={{ width:9, height:9, borderRadius:'50%',
              background: i < sideCount ? '#C9A44A' : 'rgba(255,255,255,.2)' }}/>)}
          </div>
        </div>

        {sideLocked && marketOpen && (
          <div style={{ background:'#FBF7EC', borderRadius:10, padding:'10px 14px', marginBottom:12,
            fontSize:11, color:'#A07830', fontFamily:'Inter', border:'1px solid rgba(201,164,74,.25)' }}>
            Suas 2 picks deste lado estão confirmadas. Toque em outra seleção de um mesmo jogo para substituir, até o mercado fechar.
          </div>
        )}

        {error && (
          <div style={{ background:'#FEF0EF', borderRadius:10, padding:'10px 14px', fontSize:12,
            color:'#C4302B', marginBottom:12, border:'1px solid rgba(196,48,43,.2)' }}>{error}</div>
        )}

        {/* Match cards */}
        {matchesOfSide.map((m, idx) => {
          const rec = findMatchRecord(m.home, m.away)
          const pending = !rec
          const currentPick = !pending && pickForMatch(m.home, m.away)
          return (
            <div key={idx} style={{ background:'#fff', borderRadius:14, padding:'12px 14px',
              marginBottom:10, border: currentPick ? '1.5px solid rgba(26,61,40,.25)' : '1px solid rgba(0,0,0,.06)',
              boxShadow:'0 1px 6px rgba(0,0,0,.04)', opacity: pending ? .45 : 1 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8,
                fontFamily:'Sora', fontSize:9, fontWeight:700, letterSpacing:'.08em',
                color:'#B0A898', textTransform:'uppercase' }}>
                <span>{pending ? 'PENDENTE' : (rec.utc_date?.slice(0,10) || '')}</span>
                {currentPick && marketOpen && (
                  <span style={{ color:'#1A3D28', display:'flex', alignItems:'center', gap:3 }}
                    title="Toque na seleção escolhida para remover">
                    <Check size={10}/> ESCOLHIDO · TOQUE P/ REMOVER
                  </span>
                )}
                {currentPick && !marketOpen && (
                  <span style={{ color:'#1A3D28', display:'flex', alignItems:'center', gap:3 }}>
                    <Check size={10}/> ESCOLHIDO
                  </span>
                )}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                {[m.home, m.away].map((teamName, i) => {
                  const isSel = currentPick && currentPick.team_name === teamName
                  const burned = isBurnedFromGroups(teamName)
                  const isSaving = savingTeam === teamName
                  const code = countryCode(teamName)
                  // sideLocked (2/2 picks) bloqueia escolher um time NOVO num jogo sem pick ainda,
                  // mas sempre permite trocar dentro de um jogo que já tem pick (substituição).
                  const canSwapHere = !!currentPick   // este jogo já tem uma pick — pode trocar à vontade
                  const isBlocked = pending || burned || !marketOpen || (sideLocked && !isSel && !canSwapHere)
                  return (
                    <div key={i}
                      onClick={() => !isBlocked && selectTeam(teamName, rec, i===0?m.away:m.home)}
                      style={{ flex:1, display:'flex', alignItems:'center', gap:8, padding:'8px 10px',
                        borderRadius:10, border:`1.5px solid ${isSel?'#1A3D28':burned?'rgba(196,48,43,.3)':'rgba(0,0,0,.07)'}`,
                        background: isSel ? 'rgba(26,61,40,.06)' : burned ? '#FEF5F5' : 'transparent',
                        cursor: isBlocked ? 'not-allowed' : 'pointer',
                        opacity: burned ? .6 : 1,
                        position:'relative' }}>
                      {isSaving && (
                        <div style={{ position:'absolute', inset:0, background:'rgba(255,255,255,.7)',
                          display:'flex', alignItems:'center', justifyContent:'center', borderRadius:10 }}>
                          <RefreshCw size={14} color="#1A3D28" style={{ animation:'spin 1s linear infinite' }}/>
                        </div>
                      )}
                      {code && <img src={`https://flagcdn.com/w40/${code}.png`} width={24} height={17}
                        style={{ borderRadius:3, flexShrink:0 }} alt=""/>}
                      <span style={{ fontFamily:'Sora', fontWeight:600, fontSize:12, color:'#1A1A1A',
                        textDecoration: burned ? 'line-through' : 'none' }}>{teamName}</span>
                      {isSel && (
                        <div title="Toque para remover esta escolha"
                          style={{ width:16, height:16, borderRadius:'50%', background:'#1A3D28',
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

        <div style={{ textAlign:'center', fontSize:11, color:'#9CA3AF', marginTop:8, fontFamily:'Inter' }}>
          {marketOpen
            ? 'Suas escolhas salvam automaticamente. Pode trocar até o mercado fechar.'
            : 'O mercado fechou — suas picks estão definitivas.'}
        </div>
      </div>
    </div>
  )
}
