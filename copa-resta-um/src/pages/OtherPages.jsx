// src/pages/OtherPages.jsx
import { useState, useEffect } from 'react'
import { getPlayers, getAllPicks, getPlayerPicks } from '../lib/supabase'
import { computeLives, getFlag } from '../lib/gameLogic'

export function Rankings({ player }) {
  const [data, setData] = useState([])
  const [stats, setStats] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('lives')

  useEffect(() => {
    async function load() {
      const [players, allPicks] = await Promise.all([getPlayers(), getAllPicks()])
      const ranked = players.map(p => {
        const picks = allPicks.filter(pk => pk.player_id === p.id)
        const { lives, inKnockout } = computeLives(picks)
        const correct = picks.filter(pk => pk.result === 'win').length
        return { ...p, lives, inKnockout, correct, eliminated: lives <= 0 }
      })
      ranked.sort((a, b) => b.lives !== a.lives ? b.lives - a.lives : b.correct - a.correct)
      setData(ranked)
      const teamMap = {}
      allPicks.filter(pk => pk.result !== null && pk.result !== 'no_pick').forEach(pk => {
        if (!teamMap[pk.team_name]) teamMap[pk.team_name] = { name: pk.team_name, wins: 0, total: 0 }
        teamMap[pk.team_name].total++
        if (pk.result === 'win') teamMap[pk.team_name].wins++
      })
      setStats(Object.values(teamMap).filter(t => t.total >= 1).sort((a, b) => (b.wins/b.total) - (a.wins/a.total)))
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="loading">📊 Carregando...</div>
  const medals = ['🥇','🥈','🥉']

  return (
    <div className="page">
      <div className="page-title">📊 Rankings</div>
      <div style={{display:'flex',gap:'8px',marginBottom:'16px'}}>
        <button onClick={()=>setTab('lives')} className={tab==='lives'?'btn-primary':'btn-secondary'} style={{flex:1,padding:'10px',marginTop:0,fontSize:'14px'}}>❤️ Vidas</button>
        <button onClick={()=>setTab('teams')} className={tab==='teams'?'btn-primary':'btn-secondary'} style={{flex:1,padding:'10px',marginTop:0,fontSize:'14px'}}>⚽ Seleções</button>
      </div>
      {tab === 'lives' && (
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          <table className="rank-table">
            <thead><tr><th style={{width:36}}>Pos</th><th style={{textAlign:'left'}}>Jogador</th><th>❤️</th><th>✅</th><th>Status</th></tr></thead>
            <tbody>
              {data.map((p,i) => (
                <tr key={p.id} className={p.eliminated?'eliminated':i===0?'top1':''} style={p.id===player.id?{background:'var(--gold-light)'}:{}}>
                  <td className="rank-pos">{medals[i]||`#${i+1}`}</td>
                  <td><span style={{fontWeight:p.id===player.id?700:400}}>{p.name}{p.id===player.id?' (você)':''}</span>{p.inKnockout&&<span style={{fontSize:'10px',marginLeft:4}}>🔥</span>}</td>
                  <td style={{textAlign:'center',fontWeight:700,color:p.eliminated?'var(--red)':'var(--green-dark)'}}>{p.lives}</td>
                  <td style={{textAlign:'center',color:'var(--green-mid)'}}>{p.correct}</td>
                  <td style={{textAlign:'center'}}><span className={`badge ${p.eliminated?'badge-dead':'badge-alive'}`}>{p.eliminated?'💀':'✅'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {tab === 'teams' && (
        <div className="card">
          <div className="card-header">Seleções mais bem-sucedidas quando escolhidas</div>
          {stats.length === 0 && <div className="text-muted">Ainda sem dados.</div>}
          {stats.map(t => (
            <div key={t.name} className="stat-row">
              <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                <span style={{fontSize:'20px'}}>{getFlag(t.name)}</span>
                <div><div style={{fontWeight:600,fontSize:'13px'}}>{t.name}</div><div style={{fontSize:'11px',color:'var(--gray-dark)'}}>{t.wins}/{t.total} picks</div></div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontWeight:700,color:'var(--green-dark)',fontSize:'16px'}}>{Math.round(t.wins/t.total*100)}%</div>
                <div style={{fontSize:'10px',color:'var(--gray-dark)'}}>taxa de acerto</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function AllPicks() {
  const [allPicks, setAllPicks] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setDate] = useState('')

  useEffect(() => { getAllPicks().then(p => { setAllPicks(p); setLoading(false) }) }, [])

  const dates = [...new Set(allPicks.map(p=>p.pick_date))].sort().reverse()
  const filtered = selectedDate ? allPicks.filter(p=>p.pick_date===selectedDate) : allPicks.slice(0,50)

  function ResultBadge({result}) {
    const map = {win:'✅ Acertou',draw:'🔵 Empate',loss:'❌ Errou',no_pick:'😴 Sem pick'}
    const cls = {win:'result-win',draw:'result-draw',loss:'result-loss',no_pick:'result-nopick'}
    if (!result) return <span className="result-chip result-pending">⏳</span>
    return <span className={`result-chip ${cls[result]||''}`}>{map[result]||result}</span>
  }

  if (loading) return <div className="loading">👀 Carregando...</div>
  return (
    <div className="page">
      <div className="page-title">👀 Todos os Picks</div>
      <div className="card">
        <div className="card-header">Filtrar por dia</div>
        <select style={{width:'100%',padding:'8px 10px',border:'2px solid var(--gray-mid)',borderRadius:'8px',fontSize:'14px'}} value={selectedDate} onChange={e=>setDate(e.target.value)}>
          <option value="">Todos os dias</option>
          {dates.map(d=><option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      {filtered.map(p=>(
        <div key={p.id} className="card" style={{padding:'12px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
            <div>
              <div style={{fontWeight:700,fontSize:'15px'}}>{p.player?.name}</div>
              <div style={{fontSize:'13px',marginTop:'2px'}}>
                {p.result!=='no_pick'?<><span style={{fontSize:'20px'}}>{getFlag(p.team_name)}</span> {p.team_name}</>:'😴 Não enviou pick'}
              </div>
              {p.is_repeat&&<div style={{fontSize:'11px',color:'#856404'}}>⚠️ Repetição</div>}
            </div>
            <div style={{textAlign:'right'}}>
              <ResultBadge result={p.result}/>
              <div style={{fontSize:'11px',color:'var(--gray-dark)',marginTop:'4px'}}>{p.pick_date}</div>
              {p.lives_lost>0&&<div style={{fontSize:'11px',color:'var(--red)'}}>−{p.lives_lost} vida{p.lives_lost>1?'s':''}</div>}
            </div>
          </div>
        </div>
      ))}
      {filtered.length===0&&<div className="card text-muted text-center">Sem picks para este dia.</div>}
    </div>
  )
}

export function Inventory({ player }) {
  const [picks, setPicks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { getPlayerPicks(player.id).then(p=>{setPicks(p);setLoading(false)}) }, [player.id])

  if (loading) return <div className="loading">🗂️ Carregando...</div>

  const usedTeams = {}
  picks.filter(p=>p.result!=='no_pick').forEach(p=>{
    if(!usedTeams[p.team_id]) usedTeams[p.team_id]={id:p.team_id,name:p.team_name,results:[]}
    if(p.result) usedTeams[p.team_id].results.push(p.result)
  })
  const inventory = Object.values(usedTeams).map(t=>({
    ...t, status: t.results.includes('loss')?'burned': t.results.length>0?'unlocked':'used'
  }))
  const burned   = inventory.filter(t=>t.status==='burned')
  const unlocked = inventory.filter(t=>t.status==='unlocked')
  const used     = inventory.filter(t=>t.status==='used')
  const {lives}  = computeLives(picks)
  const correct  = picks.filter(p=>p.result==='win').length
  const losses   = picks.filter(p=>p.result==='loss'||p.result==='no_pick').length

  function TeamChip({team,cls,icon}) {
    return (
      <div className={`inv-item ${cls}`}>
        <span style={{fontSize:'22px'}}>{getFlag(team.name)}</span>
        <div style={{fontSize:'13px',fontWeight:600}}>{icon} {team.name}</div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-title">🗂️ Meu Inventário</div>
      <div className="card">
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'8px',textAlign:'center'}}>
          <div><div style={{fontSize:'24px',fontWeight:700,color:'var(--green-dark)'}}>{lives}</div><div className="text-muted">vidas</div></div>
          <div><div style={{fontSize:'24px',fontWeight:700,color:'var(--green-mid)'}}>{correct}</div><div className="text-muted">acertos</div></div>
          <div><div style={{fontSize:'24px',fontWeight:700,color:'var(--red)'}}>{losses}</div><div className="text-muted">erros</div></div>
        </div>
      </div>
      {burned.length>0&&<div className="card"><div className="card-header">🔴 Queimadas</div><div className="inventory-grid">{burned.map(t=><TeamChip key={t.id} team={t} cls="inv-burned" icon="💀"/>)}</div></div>}
      {unlocked.length>0&&<div className="card"><div className="card-header">🔵 Desbloqueadas</div><div className="inventory-grid">{unlocked.map(t=><TeamChip key={t.id} team={t} cls="inv-unlocked" icon="🔓"/>)}</div></div>}
      {used.length>0&&<div className="card"><div className="card-header">⏳ Resultado pendente</div><div className="inventory-grid">{used.map(t=><TeamChip key={t.id} team={t} cls="inv-available" icon="⏳"/>)}</div></div>}
      <div className="card"><div className="card-header">⚪ Disponíveis</div><div className="text-muted" style={{fontSize:'13px'}}>Todas as seleções não usadas estão disponíveis. {48-inventory.length} intactas restantes.</div></div>
    </div>
  )
}
