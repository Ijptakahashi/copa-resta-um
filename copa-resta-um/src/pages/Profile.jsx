import { useState, useEffect } from 'react'
import { getPlayerPicks, getAllPicks, getPlayers } from '../lib/supabase'
import { computeLives } from '../lib/gameLogic'
import FlagImage, { countryCode } from '../components/FlagImage'
import ShieldLives from '../components/ShieldLives'

const ALL_TEAMS = [
  'Algeria','Argentina','Australia','Austria','Belgium','Bosnia and Herzegovina',
  'Brazil','Canada','Cape Verde','Colombia','Costa Rica','Croatia',
  'Curacao','Czech Republic','DR Congo','Ecuador','Egypt','England',
  'France','Germany','Ghana','Haiti','Honduras','Iran',
  'Iraq','Ivory Coast','Jamaica','Japan','Jordan','Mexico',
  'Morocco','Netherlands','New Zealand','Nigeria','Norway','Panama',
  'Paraguay','Portugal','Qatar','Saudi Arabia','Scotland','Senegal',
  'South Africa','South Korea','Spain','Sweden','Switzerland','Tunisia',
  'Turkey','United States','Uruguay','Uzbekistan',
].sort()

function ResultChip({ result }) {
  if (!result)             return <span className="result-chip chip-pending">⏳</span>
  if (result==='win')      return <span className="result-chip chip-win">✓</span>
  if (result==='draw')     return <span className="result-chip chip-draw">=</span>
  if (result==='loss')     return <span className="result-chip chip-loss">✗</span>
  if (result==='no_pick')  return <span className="result-chip chip-nopick">–</span>
  return null
}

export default function Profile({ player, viewPlayerId }) {
  const targetId = viewPlayerId || player.id
  const [targetPlayer, setTP] = useState(null)
  const [picks, setPicks]     = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState('inventory') // inventory | history

  useEffect(() => { load() }, [targetId])

  async function load() {
    setLoading(true)
    const [pp, players] = await Promise.all([getPlayerPicks(targetId), getPlayers()])
    setPicks(pp)
    setTP(players.find(p => p.id === targetId) || player)
    setLoading(false)
  }

  if (loading) return <div className="loading">👤 Carregando...</div>

  const { lives, inKnockout } = computeLives(picks)
  const maxLives = inKnockout ? 3 : 6
  const correct  = picks.filter(p => p.result === 'win').length
  const total    = picks.filter(p => p.result !== null && p.result !== 'no_pick').length
  const accuracy = total > 0 ? Math.round(correct/total*100) : 0

  // Inventory
  const usedMap = {}
  picks.filter(p => p.result !== 'no_pick' && p.team_name !== 'no_pick').forEach(p => {
    if (!usedMap[p.team_name]) usedMap[p.team_name] = []
    if (p.result) usedMap[p.team_name].push(p.result)
  })
  function getInvStatus(name) {
    const results = usedMap[name]
    if (!results) return 'available'
    if (results.includes('loss')) return 'burned'
    if (results.length > 0) return 'unlocked'
    return 'available'
  }

  const isMe = targetId === player.id

  return (
    <div className="page">
      {/* Header */}
      <div className="card-dark" style={{display:'flex',alignItems:'center',gap:14,padding:'20px 16px',marginBottom:12}}>
        <div style={{fontSize:48,lineHeight:1}}>{targetPlayer?.avatar||'⚽'}</div>
        <div style={{flex:1}}>
          <div style={{fontFamily:'Sora',fontSize:22,fontWeight:800,color:'white'}}>
            {targetPlayer?.name}
          </div>
          <div style={{fontSize:12,color:'var(--gold)',fontWeight:600,marginTop:2}}>
            {lives <= 0 ? '💀 Eliminado' : `● ${inKnockout ? 'Mata-Mata':'Fase de Grupos'}`}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="card" style={{padding:'12px 16px'}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:4,textAlign:'center'}}>
          <div>
            <div style={{fontFamily:'Sora',fontSize:26,fontWeight:800,color:'var(--gold-dark)'}}>{lives}</div>
            <div className="sora-sm" style={{color:'var(--n400)'}}>Vidas</div>
          </div>
          <div>
            <div style={{fontFamily:'Sora',fontSize:26,fontWeight:800,color:'var(--g700)'}}>{correct}</div>
            <div className="sora-sm" style={{color:'var(--n400)'}}>Acertos</div>
          </div>
          <div>
            <div style={{fontFamily:'Sora',fontSize:26,fontWeight:800,color:'var(--g700)'}}>{accuracy}%</div>
            <div className="sora-sm" style={{color:'var(--n400)'}}>Taxa</div>
          </div>
        </div>
        <div style={{marginTop:12}}>
          <ShieldLives lives={lives} max={maxLives} />
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:8,marginBottom:12}}>
        {[['inventory','🏳️ Inventário'],['history','📋 Histórico']].map(([key,label])=>(
          <button key={key} onClick={()=>setTab(key)}
            className={tab===key?'btn btn-primary':'btn btn-ghost'}
            style={{flex:1,padding:'10px',fontSize:12}}>
            {label}
          </button>
        ))}
      </div>

      {/* Inventory tab */}
      {tab === 'inventory' && (
        <div className="card">
          <div style={{display:'flex',gap:12,marginBottom:14,fontSize:11,color:'var(--n500)'}}>
            <span style={{display:'flex',alignItems:'center',gap:4}}>
              <span style={{width:8,height:8,borderRadius:2,background:'var(--g500)',display:'inline-block'}}/>
              Disponível
            </span>
            <span style={{display:'flex',alignItems:'center',gap:4}}>
              <span style={{width:8,height:8,borderRadius:'50%',background:'var(--gold)',display:'inline-block'}}/>
              Desbloqueado
            </span>
            <span style={{display:'flex',alignItems:'center',gap:4}}>
              <span style={{width:8,height:8,borderRadius:'50%',background:'var(--red)',display:'inline-block'}}/>
              Queimado
            </span>
          </div>
          <div className="flag-grid">
            {ALL_TEAMS.map(team => {
              const status = getInvStatus(team)
              const burned = status === 'burned'
              const unlocked = status === 'unlocked'
              const code = countryCode(team)
              if (!code) return null
              return (
                <div key={team} className="flag-cell">
                  <div style={{position:'relative',display:'inline-block'}}>
                    <img
                      src={`https://flagcdn.com/w40/${code}.png`}
                      alt={team}
                      width={36} height={25}
                      style={{
                        borderRadius:3, display:'block',
                        filter: burned||unlocked ? 'grayscale(100%) opacity(.5)' : 'none',
                        border: unlocked ? '2px solid var(--gold)' : burned ? '2px solid var(--red)' : '1px solid var(--n200)',
                      }}
                    />
                    {burned   && <div className="burned-x">✕</div>}
                    {unlocked && <div className="unlocked-dot"/>}
                  </div>
                  <div className="flag-cell-name">{team.replace(' and Herzegovina','').slice(0,10)}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* History tab */}
      {tab === 'history' && (
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          {picks.length === 0
            ? <div className="empty">Nenhuma pick ainda.</div>
            : [...picks].reverse().map((p,i) => (
              <div key={p.id} style={{
                display:'flex',alignItems:'center',gap:10,padding:'12px 16px',
                borderBottom: i < picks.length-1 ? '1px solid var(--n200)' : 'none',
              }}>
                {p.team_name !== 'no_pick'
                  ? <FlagImage team={p.team_name} size="sm" />
                  : <div style={{width:32,height:22,background:'var(--n100)',borderRadius:3,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11}}>–</div>
                }
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,fontSize:13}}>
                    {p.team_name === 'no_pick' ? 'Sem pick' : p.team_name}
                    {p.is_repeat && <span style={{fontSize:10,color:'var(--amber)',marginLeft:4}}>⚠️ Rep.</span>}
                  </div>
                  <div style={{fontSize:11,color:'var(--n400)'}}>{p.pick_date}</div>
                </div>
                <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:2}}>
                  <ResultChip result={p.result} />
                  {p.lives_lost > 0 && <span style={{fontSize:10,color:'var(--red)'}}>−{p.lives_lost} vida{p.lives_lost>1?'s':''}</span>}
                </div>
              </div>
            ))
          }
        </div>
      )}
    </div>
  )
}
