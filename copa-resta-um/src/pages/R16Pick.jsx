import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Lock, RefreshCw } from 'lucide-react'
import { getPlayerPicks, getMatches, submitR16Pick, removeR16PickByMatch } from '../lib/supabase'
import { validateR16Pick, canonTeam, r16Deadline, isR16Open } from '../lib/gameLogic'
import { countryCode } from '../components/FlagImage'
import { R16_BRACKET, sideOfTeamR16 as sideOfTeamShared } from '../lib/r16bracket'

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

export default function R16Pick({ player }) {
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
    setDeadline(r16Deadline(ms))
    setMarketOpen(isR16Open(ms))
    setLoading(false)
  }

  // Picks de R16 já confirmadas no banco — fonte única da verdade (sem state duplicado)
  const r16Picks = allPicks.filter(p => p.phase === 'r16' && p.team_name !== 'no_pick')
  const knockoutPicks = allPicks.filter(p => p.phase && p.phase !== 'groups')

  function pickForMatch(home, away) {
    const cH = canonTeam(home), cA = canonTeam(away)
    return r16Picks.find(p => {
      const c = canonTeam(p.team_name)
      return c === cH || c === cA
    })
  }

  const leftPicks  = r16Picks.filter(p => sideOfTeamShared(p.team_name, canonTeam) === 'left')
  const rightPicks = r16Picks.filter(p => sideOfTeamShared(p.team_name, canonTeam) === 'right')
  const leftCount  = leftPicks.length
  const rightCount = rightPicks.length
  const sideCount  = side === 'left' ? leftCount : rightCount
  const sideLocked = sideCount >= 1   // 1 pick confirmada = lado travado (mesmo com mercado aberto, decisão já feita)
  const matchesOfSide = R16_BRACKET[side]

  function findMatchRecord(home, away) {
    const cH = canonTeam(home), cA = canonTeam(away)
    return matches.find(m => {
      const mh = canonTeam(m.home_team), ma = canonTeam(m.away_team)
      return (mh === cH && ma === cA) || (mh === cA && ma === cH)
    })
  }

  // Time já queimado nos grupos (perdeu) não pode ser escolhido no R16
  function isBurnedFromGroups(teamName) {
    const c = canonTeam(teamName)
    return allPicks.some(p =>
      p.phase === 'groups' && canonTeam(p.team_name) === c && p.result === 'loss')
  }

  async function selectTeam(teamName, matchRecord, otherTeamName) {
    setError('')
    if (!marketOpen) { setError('O mercado do R16 já fechou. Suas picks estão travadas.'); return }
    if (savingTeam) return   // trava cliques simultâneos — evita a race condition da 3ª pick

    const pickDate = matchRecord.utc_date?.slice(0,10)
    const existing = pickForMatch(teamName, otherTeamName)

    // Clicar de novo na MESMA seleção já feita = desmarcar (remove a pick desse jogo)
    if (existing && existing.team_name === teamName) {
      setSavingTeam(teamName)
      try {
        // Remove pelo match_id (chave real do jogo no MM) — nunca por pick_date,
        // que pode ser compartilhada por dois jogos do mesmo dia.
        await removeR16PickByMatch(player.id, matchRecord.id)
        setAllPicks(prev => prev.filter(p => !(p.phase==='r16' && p.match_id===matchRecord.id)))
      } catch (e) {
        setError('Erro ao remover: ' + e.message)
      } finally { setSavingTeam(null) }
      return
    }

    if (isBurnedFromGroups(teamName)) { setError(`${teamName} está queimada — perdeu na fase de grupos.`); return }

    // Recalcula sideCount AGORA, na hora do clique — nunca usa valor "congelado" do render
    // anterior, o que evita a race condition de cliques rápidos permitirem uma 3ª pick.
    const freshSideCount = allPicks.filter(p =>
      p.phase === 'r16' && p.team_name !== 'no_pick' &&
      sideOfTeamShared(p.team_name, canonTeam) === side &&
      p.match_id !== matchRecord.id   // exclui a pick deste mesmo jogo (é troca, não nova)
    ).length

    const v = validateR16Pick(knockoutPicks, teamName, side, freshSideCount)
    if (!v.valid) { setError(v.reason); return }

    setSavingTeam(teamName)
    try {
      await submitR16Pick({
        playerId: player.id,
        matchId: matchRecord.id,
        teamName, phase: 'r16',
        pickDate: matchRecord.utc_date?.slice(0,10),
      })
      // Atualização OTIMISTA: atualiza a tela na hora, sem esperar reler do banco
      // (corrige o atraso de leitura que obrigava a dar refresh manual)
      setAllPicks(prev => {
        const withoutOld = existing ? prev.filter(p => p.id !== existing.id) : prev
        const newPickId = existing?.id || `temp-${matchRecord.id}`
        return [...withoutOld, {
          id: newPickId, phase: 'r16', team_name: teamName,
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

  // ─── TRAVA DE SEGURANÇA: 3+ picks num lado (resquício de bug antigo) ───
  // Bloqueia a tela inteira e obriga o jogador a remover o excedente antes
  // de fazer qualquer outra coisa. Mais simples e confiável do que corrigir
  // via SQL pra cada usuário afetado individualmente.
  const overflowSide = leftCount > 1 ? 'left' : rightCount > 1 ? 'right' : null
  if (overflowSide) {
    const overflowPicks = overflowSide === 'left' ? leftPicks : rightPicks
    const excess = overflowPicks.length - 1
    return (
      <div style={{ maxWidth:430, margin:'0 auto', background:'#F8F4EE', minHeight:'100svh' }}>
        <div style={{ padding:'24px 16px' }}>
          <div style={{ background:'#FEF0EF', borderRadius:16, padding:'20px',
            border:'1.5px solid rgba(196,48,43,.25)', textAlign:'center', marginBottom:16 }}>
            <Lock size={28} color="#C4302B" style={{ marginBottom:10 }}/>
            <div style={{ fontFamily:'Sora', fontWeight:800, fontSize:18, color:'#C4302B' }}>
              CORRIJA SUAS PICKS
            </div>
            <div style={{ fontSize:13, color:'#6B6B5E', marginTop:8, fontFamily:'Inter', lineHeight:1.5 }}>
              Você tem <b>{overflowPicks.length} seleções</b> no lado {overflowSide==='left'?'esquerdo':'direito'},
              mas o máximo permitido é <b>1</b>. Remova {excess === 1 ? 'uma seleção' : `${excess} seleções`} abaixo
              tocando nela para continuar.
            </div>
          </div>

          {error && (
            <div style={{ background:'#FEF0EF', borderRadius:10, padding:'10px 14px', fontSize:12,
              color:'#C4302B', marginBottom:12, border:'1px solid rgba(196,48,43,.2)' }}>{error}</div>
          )}

          {overflowPicks.map(pick => {
            const code = countryCode(pick.team_name)
            const isRemoving = savingTeam === pick.team_name
            return (
              <div key={pick.id}
                onClick={async () => {
                  if (savingTeam) return
                  setSavingTeam(pick.team_name); setError('')
                  try {
                    await removeR16PickByMatch(player.id, pick.match_id)
                    setAllPicks(prev => prev.filter(p => p.match_id !== pick.match_id))
                  } catch (e) { setError('Erro ao remover: ' + e.message) }
                  finally { setSavingTeam(null) }
                }}
                style={{ background:'#fff', borderRadius:14, padding:'14px', marginBottom:10,
                  border:'1.5px solid rgba(196,48,43,.2)', display:'flex', alignItems:'center', gap:12,
                  cursor: savingTeam ? 'wait' : 'pointer', position:'relative' }}>
                {isRemoving && (
                  <div style={{ position:'absolute', inset:0, background:'rgba(255,255,255,.8)',
                    display:'flex', alignItems:'center', justifyContent:'center', borderRadius:14 }}>
                    <RefreshCw size={16} color="#C4302B" style={{ animation:'spin 1s linear infinite' }}/>
                  </div>
                )}
                {code && <img src={`https://flagcdn.com/w40/${code}.png`} width={32} height={22}
                  style={{ borderRadius:4, flexShrink:0 }} alt=""/>}
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:'Sora', fontWeight:700, fontSize:14 }}>{pick.team_name}</div>
                  <div style={{ fontSize:11, color:'#9CA3AF', marginTop:1 }}>{pick.pick_date}</div>
                </div>
                <span style={{ fontFamily:'Sora', fontSize:10, fontWeight:700, color:'#C4302B',
                  background:'#FEF0EF', padding:'5px 10px', borderRadius:10 }}>TOCAR P/ REMOVER</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

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
          letterSpacing:'-1px', lineHeight:1.05 }}>SUAS PICKS<br/>R16</div>
        <div style={{ fontSize:12, color:'#9A9384', marginTop:4 }}>
          Escolha 1 seleção de cada lado da chave — válidas para toda a fase
        </div>

        {deadline && marketOpen && (
          <div style={{ background:'#FEF0EF', borderRadius:10, padding:'10px 14px', margin:'12px 0',
            display:'flex', alignItems:'center', gap:8, border:'1px solid rgba(196,48,43,.15)' }}>
            <Lock size={13} color="#C4302B"/>
            <span style={{ fontFamily:'Sora', fontWeight:600, fontSize:12, color:'#C4302B' }}>
              Picks do R16 fecham em <DeadlineCountdown deadline={deadline}/>
            </span>
          </div>
        )}
        {deadline && !marketOpen && (
          <div style={{ background:'#EBF5EE', borderRadius:10, padding:'14px', margin:'12px 0',
            textAlign:'center', border:'1px solid rgba(26,61,40,.15)' }}>
            <Check size={20} color="#1A3D28" style={{ marginBottom:6 }}/>
            <div style={{ fontFamily:'Sora', fontWeight:700, color:'#1A3D28', fontSize:14 }}>MERCADO FECHADO</div>
            <div style={{ fontSize:11, color:'#6B6B5E', marginTop:2 }}>Suas picks do R16 estão travadas.</div>
          </div>
        )}

        {/* Progress geral (2 barras = 2 lados) */}
        <div style={{ display:'flex', gap:6, margin:'14px 0' }}>
          {[0,1].map(i => <div key={i} style={{ flex:1, height:5, borderRadius:3,
            background: i===0 ? (leftCount===1?'#C9A44A':'#E5DFD2') : (rightCount===1?'#C9A44A':'#E5DFD2') }}/>)}
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
                {cnt===1 && <Check size={12} color="#1A3D28"/>}
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
              {sideCount} / 1
              {sideLocked && (
                <span style={{ fontFamily:'Sora', fontSize:9, fontWeight:700, color:'#1A3D28',
                  background:'#C9A44A', padding:'3px 8px', borderRadius:10, letterSpacing:'.04em' }}>
                  ✓ CONFIRMADO
                </span>
              )}
            </div>
          </div>
          <div style={{ display:'flex', gap:5 }}>
            {[0].map(i => <div key={i} style={{ width:9, height:9, borderRadius:'50%',
              background: i < sideCount ? '#C9A44A' : 'rgba(255,255,255,.2)' }}/>)}
          </div>
        </div>

        {sideLocked && marketOpen && (
          <div style={{ background:'#FBF7EC', borderRadius:10, padding:'10px 14px', marginBottom:12,
            fontSize:11, color:'#A07830', fontFamily:'Inter', border:'1px solid rgba(201,164,74,.25)' }}>
            Sua pick deste lado está confirmada. Toque em outra seleção de um mesmo jogo para substituir, até o mercado fechar.
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
                  // sideLocked (1/1 pick) bloqueia escolher um time NOVO num jogo sem pick ainda,
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
