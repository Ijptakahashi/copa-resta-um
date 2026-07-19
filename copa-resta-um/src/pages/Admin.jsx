import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, RefreshCw, Check } from 'lucide-react'
import { getMatches, getPlayers } from '../lib/supabase'
import { setMatchResultManual, syncMatches, syncResults, processNoPicks, processPicks, processR32Penalties, processR16Penalties, processQfPenalties, processSfPenalties, processFinalPenalties } from '../lib/football'
import { toLocalDateISO } from '../lib/gameLogic'

// Normaliza nomes p/ deduplicar jogos iguais com grafias diferentes
function canonName(n='') {
  const map = {'czechia':'czech republic','korea republic':'south korea','korea rep.':'south korea',
    'bosnia & herzegovina':'bosnia and herzegovina','bosnia-herzegovina':'bosnia and herzegovina',
    'usa':'united states','türkiye':'turkey','curaçao':'curacao','congo dr':'dr congo'}
  const s=String(n).toLowerCase().trim(); return map[s]||s
}

// Tela de organizador — acessível em /admin. Permite inserir placares manualmente
// caso a API não atualize, e forçar re-sincronização completa.
export default function Admin({ player }) {
  const navigate = useNavigate()
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy]       = useState(false)
  const [msg, setMsg]         = useState('')
  const [scores, setScores]   = useState({})

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const ms = await getMatches()
    ms.sort((a,b) => new Date(a.utc_date) - new Date(b.utc_date))
    setMatches(ms)
    setLoading(false)
  }

  async function saveResult(m) {
    const s = scores[m.id] || {}
    // Usa o valor digitado OU o que já está no banco (input mostra o do banco)
    const hRaw = s.h !== undefined && s.h !== '' ? s.h : m.home_score
    const aRaw = s.a !== undefined && s.a !== '' ? s.a : m.away_score
    if (hRaw === undefined || hRaw === null || hRaw === '' ||
        aRaw === undefined || aRaw === null || aRaw === '') {
      setMsg('Preencha os dois placares.'); return
    }
    const hNum = Number(hRaw), aNum = Number(aRaw)
    if (isNaN(hNum) || isNaN(aNum)) { setMsg('Placar inválido.'); return }
    setBusy(true); setMsg('')
    try {
      const players = await getPlayers()
      const r = await setMatchResultManual(m.home_team, m.away_team, hNum, aNum, players)
      // setMatchResultManual já roda syncResults(→processPicks) e processNoPicks,
      // mas NÃO as penalidades de mata-mata. Se este resultado fechou o mercado
      // de uma fase ou eliminou alguém, aplica as penalidades de R32/R16 aqui
      // pra o desconto de vida ser imediato, sem exigir clicar REPROCESSAR.
      await processR32Penalties(players)
      await processR16Penalties(players)
      await processQfPenalties(players)
      await processSfPenalties(players)
      await processFinalPenalties(players)
      setMsg(`✓ Salvo: ${r.match}`)
      // Limpa o state local desse jogo pra próxima edição ler do banco atualizado
      setScores(prev => { const n = {...prev}; delete n[m.id]; return n })
      await load()
    } catch(e) { setMsg('Erro: ' + e.message) }
    finally { setBusy(false) }
  }

  async function reprocessPicks() {
    setBusy(true); setMsg('Reprocessando picks...')
    try {
      const players = await getPlayers()
      const n = await processPicks(players)
      await processNoPicks(players, await getMatches())
      const r32n = await processR32Penalties(players)
      const r16n = await processR16Penalties(players)
      const qfn  = await processQfPenalties(players)
      const sfn  = await processSfPenalties(players)
      await processFinalPenalties(players)
      setMsg(`✓ ${n} pick(s) processada(s)!` + (r32n ? ` ${r32n} pen. R32.` : '') + (r16n ? ` ${r16n} pen. R16.` : '') + (qfn ? ` ${qfn} pen. quartas.` : '') + (sfn ? ` ${sfn} pen. semis.` : ''))
      await load()
    } catch(e) { setMsg('Erro: ' + e.message) }
    finally { setBusy(false) }
  }

  async function forceFullSync() {
    // Trava de segurança: sync da API pode sobrescrever resultados inseridos à mão
    const ok = window.confirm(
      '⚠️ ATENÇÃO\n\nIsto busca os jogos das APIs externas e pode SOBRESCREVER ' +
      'placares que você inseriu manualmente.\n\n' +
      'Para apenas recalcular as picks (seguro), use "REPROCESSAR PICKS".\n\n' +
      'Tem certeza que quer forçar a sincronização completa?'
    )
    if (!ok) return
    setBusy(true); setMsg('Sincronizando tudo...')
    try {
      const players = await getPlayers()
      await syncMatches()
      await syncResults(players)
      const ms = await getMatches()
      await processNoPicks(players, ms)
      await processR32Penalties(players)
      await processR16Penalties(players)
      await processQfPenalties(players)
      await processSfPenalties(players)
      await processFinalPenalties(players)
      await load()
      setMsg('✓ Sincronização completa!')
    } catch(e) { setMsg('Erro: ' + e.message) }
    finally { setBusy(false) }
  }

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'60vh'}}>
      <RefreshCw size={28} style={{animation:'spin 1s linear infinite'}} color="#9CA3AF"/>
    </div>
  )

  const today = toLocalDateISO(new Date().toISOString())
  // Mostra jogos de ontem/hoje e próximos, priorizando não-finalizados recentes
  // Deduplica jogos: mesma data + mesmos times (canônico), preferindo o FINISHED
  const seen = {}
  matches.forEach(m => {
    const d = toLocalDateISO(m.utc_date)
    const teams = [canonName(m.home_team), canonName(m.away_team)].sort().join('|')
    const key = `${d}|${teams}`
    const prev = seen[key]
    if (!prev) { seen[key] = m; return }
    // Prefere o que já está FINISHED (tem placar), senão mantém o primeiro
    const score = x => (x.status==='FINISHED' && x.winner ? 2 : 0) +
                       (x.home_score!=null ? 1 : 0)
    if (score(m) > score(prev)) seen[key] = m
  })
  // Mostra: jogos pendentes/sem resultado (qualquer data) + últimos 15 finalizados
  // (evita que o corte de quantidade esconda os jogos de HOJE/futuros)
  const allSorted = Object.values(seen).sort((a,b)=>new Date(a.utc_date)-new Date(b.utc_date))
  const pendentes  = allSorted.filter(m => m.status !== 'FINISHED' || !m.winner)
  const finalizados = allSorted.filter(m => m.status === 'FINISHED' && m.winner)
  const relevant = [...finalizados.slice(-15), ...pendentes]

  return (
    <div style={{maxWidth:480,margin:'0 auto',padding:'16px 16px 90px'}}>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
        <button onClick={()=>navigate('/dashboard')}
          style={{width:36,height:36,borderRadius:'50%',border:'1px solid rgba(0,0,0,.1)',
            background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
          <ArrowLeft size={18}/>
        </button>
        <div>
          <div style={{fontFamily:'Sora',fontWeight:800,fontSize:20,color:'#1A3D28'}}>Painel do Organizador</div>
          <div style={{fontFamily:'Inter',fontSize:12,color:'#9CA3AF'}}>Inserir resultados e sincronizar</div>
        </div>
      </div>

      <button onClick={forceFullSync} disabled={busy}
        style={{width:'100%',padding:'14px',borderRadius:12,border:'none',marginBottom:8,
          background:'linear-gradient(135deg,#1A3D28,#1E5235)',color:'#fff',
          fontFamily:'Sora',fontWeight:700,fontSize:13,letterSpacing:'.04em',cursor:'pointer',
          display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
        <RefreshCw size={15} style={busy?{animation:'spin 1s linear infinite'}:{}}/>
        FORÇAR SINCRONIZAÇÃO (API + PICKS)
      </button>
      <button onClick={reprocessPicks} disabled={busy}
        style={{width:'100%',padding:'12px',borderRadius:12,border:'1.5px solid #1A3D28',marginBottom:16,
          background:'#fff',color:'#1A3D28',
          fontFamily:'Sora',fontWeight:700,fontSize:12,letterSpacing:'.04em',cursor:'pointer',
          display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
        <Check size={14}/>
        REPROCESSAR PICKS (usa resultados já no banco)
      </button>

      {msg && (
        <div style={{background:msg.startsWith('✓')?'#EBF5EE':msg.startsWith('Erro')?'#FEF0EF':'#FFF8E6',
          borderRadius:10,padding:'10px 14px',fontSize:13,marginBottom:16,fontFamily:'Inter',
          color:msg.startsWith('✓')?'#1A3D28':msg.startsWith('Erro')?'#C4302B':'#A07830'}}>
          {msg}
        </div>
      )}

      <div style={{fontFamily:'Sora',fontWeight:700,fontSize:11,letterSpacing:'.08em',
        textTransform:'uppercase',color:'#9CA3AF',marginBottom:10}}>Jogos</div>

      {relevant.map(m => {
        const s = scores[m.id] || {}
        const done = m.status === 'FINISHED' && m.winner
        return (
          <div key={m.id} style={{background:'#fff',borderRadius:12,padding:'12px 14px',marginBottom:8,
            border:`1px solid ${done?'rgba(26,61,40,.2)':'rgba(0,0,0,.08)'}`,
            boxShadow:'0 1px 4px rgba(0,0,0,.04)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <span style={{fontFamily:'Sora',fontSize:9,fontWeight:700,color:'#9CA3AF',letterSpacing:'.05em'}}>
                {toLocalDateISO(m.utc_date)} {done?'· FINALIZADO':''}
              </span>
              {done && <Check size={14} color="#1A3D28"/>}
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{flex:1,fontFamily:'Sora',fontWeight:600,fontSize:13,textAlign:'right'}}>{m.home_team}</span>
              <input type="number" min="0" inputMode="numeric"
                value={s.h !== undefined ? s.h : (m.home_score ?? '')}
                onChange={e=>setScores({...scores,[m.id]:{...s,h:e.target.value}})}
                style={{width:42,padding:'8px',borderRadius:8,border:'1.5px solid rgba(0,0,0,.12)',
                  textAlign:'center',fontFamily:'Sora',fontWeight:700,fontSize:16}}/>
              <span style={{color:'#9CA3AF',fontWeight:700}}>×</span>
              <input type="number" min="0" inputMode="numeric"
                value={s.a !== undefined ? s.a : (m.away_score ?? '')}
                onChange={e=>setScores({...scores,[m.id]:{...s,a:e.target.value}})}
                style={{width:42,padding:'8px',borderRadius:8,border:'1.5px solid rgba(0,0,0,.12)',
                  textAlign:'center',fontFamily:'Sora',fontWeight:700,fontSize:16}}/>
              <span style={{flex:1,fontFamily:'Sora',fontWeight:600,fontSize:13}}>{m.away_team}</span>
            </div>
            <button onClick={()=>saveResult(m)} disabled={busy}
              style={{width:'100%',marginTop:8,padding:'8px',borderRadius:8,border:'none',
                background:done?'#EBF5EE':'#C9A44A',color:done?'#1A3D28':'#fff',
                fontFamily:'Sora',fontWeight:700,fontSize:11,letterSpacing:'.04em',cursor:'pointer'}}>
              {done?'ATUALIZAR PLACAR':'SALVAR RESULTADO'}
            </button>
          </div>
        )
      })}
    </div>
  )
}
