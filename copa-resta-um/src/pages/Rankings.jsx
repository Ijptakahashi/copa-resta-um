import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPlayers, getAllPicks } from '../lib/supabase'
import { computeLives } from '../lib/gameLogic'
import ShieldLives from '../components/ShieldLives'

export default function Rankings({ player }) {
  const navigate = useNavigate()
  const [data, setData]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [players, allPicks] = await Promise.all([getPlayers(), getAllPicks()])
      const ranked = players.map(p => {
        const pp = allPicks.filter(pk => pk.player_id === p.id)
        const { lives, inKnockout } = computeLives(pp)
        const correct = pp.filter(pk => pk.result === 'win').length
        const total   = pp.filter(pk => pk.result !== null && pk.result !== 'no_pick').length
        return { ...p, lives, inKnockout, correct, total, eliminated: lives <= 0 }
      }).sort((a,b) => b.lives - a.lives || b.correct - a.correct)
      setData(ranked); setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="loading">🏅 Carregando...</div>

  const medals = ['🥇','🥈','🥉']
  const pot = data.length * 50

  return (
    <div className="page">
      <div className="page-title">Ranking</div>

      {/* Pote */}
      <div className="card-dark" style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <div>
          <div className="sora-sm" style={{color:'rgba(255,255,255,.5)',marginBottom:4}}>Pote Total</div>
          <div style={{fontFamily:'Sora',fontSize:32,fontWeight:800,color:'var(--gold)'}}>
            R$ {pot.toLocaleString('pt-BR')}
          </div>
          <div style={{fontSize:12,color:'rgba(255,255,255,.5)'}}>{data.length} participantes</div>
        </div>
        <div style={{fontSize:48}}>🏆</div>
      </div>

      {/* Table */}
      <div className="card" style={{padding:0,overflow:'hidden'}}>
        {data.map((p, i) => {
          const isMe = p.id === player.id
          const maxL = p.inKnockout ? 3 : 6
          return (
            <div key={p.id}
              onClick={() => navigate(`/profile/${p.id}`)}
              style={{
                display:'flex', alignItems:'center', gap:12, padding:'14px 16px',
                borderBottom: i < data.length-1 ? '1px solid var(--n200)' : 'none',
                background: isMe ? 'var(--gold-light)' : i===0 ? '#FAFFF9' : 'transparent',
                cursor:'pointer', transition:'background .1s',
              }}>
              {/* Pos */}
              <div style={{fontFamily:'Sora',fontWeight:800,fontSize:16,width:28,textAlign:'center',
                opacity: p.eliminated ? .4 : 1}}>
                {medals[i] || <span style={{color:'var(--n400)'}}>{i+1}</span>}
              </div>
              {/* Avatar */}
              <span style={{fontSize:24,opacity:p.eliminated?.45:1}}>{p.avatar||'⚽'}</span>
              {/* Name */}
              <div style={{flex:1,opacity:p.eliminated?.45:1}}>
                <div style={{fontWeight:600,fontSize:14}}>
                  {p.name}{isMe?' (você)':''}
                  {p.inKnockout && <span style={{fontSize:10,color:'var(--gold-dark)',marginLeft:4}}>🔥</span>}
                </div>
                <div style={{fontSize:11,color:'var(--n400)'}}>{p.correct} acertos</div>
              </div>
              {/* Lives */}
              <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4}}>
                <div style={{fontFamily:'Sora',fontWeight:800,fontSize:22,
                  color: p.eliminated ? 'var(--red)' : 'var(--gold-dark)'}}>
                  {p.lives}
                  <span style={{fontSize:12,color:'var(--n400)',fontWeight:400}}> / {maxL}</span>
                </div>
                {p.eliminated && <span className="badge badge-dead">Eliminado</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
