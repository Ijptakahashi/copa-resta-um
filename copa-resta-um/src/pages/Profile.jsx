import { useState, useEffect, useRef } from 'react'
import { Camera, Shield, Target, TrendingUp, ChevronRight } from 'lucide-react'
import { getPlayerPicks, getAllPicks, getPlayers, uploadAvatar, supabase } from '../lib/supabase'
import { computeLives } from '../lib/gameLogic'
import FlagImage, { countryCode } from '../components/FlagImage'
import ShieldLives from '../components/ShieldLives'

const ALL_TEAMS = ['Algeria','Argentina','Australia','Austria','Belgium',
  'Bosnia and Herzegovina','Brazil','Canada','Cape Verde','Colombia',
  'Costa Rica','Croatia','Curacao','Czech Republic','DR Congo','Ecuador',
  'Egypt','England','France','Germany','Ghana','Haiti','Honduras','Iran',
  'Iraq','Ivory Coast','Jamaica','Japan','Jordan','Mexico','Morocco',
  'Netherlands','New Zealand','Nigeria','Norway','Panama','Paraguay',
  'Portugal','Qatar','Saudi Arabia','Scotland','Senegal','South Africa',
  'South Korea','Spain','Sweden','Switzerland','Tunisia','Turkey',
  'United States','Uruguay','Uzbekistan'].sort()

function ResultDot({ result }) {
  const map = {win:'#1A4731',draw:'#2563EB',loss:'#DC2626',no_pick:'#D1D5DB'}
  return <div style={{width:8,height:8,borderRadius:'50%',background:map[result]||'#E5E7EB',flexShrink:0}}/>
}

export default function Profile({ player, viewPlayerId }) {
  const targetId = viewPlayerId || player.id
  const isMe = targetId === player.id
  const [targetPlayer, setTP] = useState(null)
  const [picks, setPicks]     = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState('inventory')
  const [uploading, setUploading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(null)
  const fileRef = useRef()

  useEffect(() => { load() }, [targetId])

  async function load() {
    setLoading(true)
    const [pp, players] = await Promise.all([getPlayerPicks(targetId), getPlayers()])
    setPicks(pp)
    const tp = players.find(p=>p.id===targetId) || player
    setTP(tp)
    setAvatarUrl(tp.avatar_url || null)
    setLoading(false)
  }

  async function handlePhoto(e) {
    const file = e.target.files?.[0]
    if (!file || !isMe) return
    setUploading(true)
    try {
      const url = await uploadAvatar(player.id, file)
      setAvatarUrl(url)
      const updated = { ...player, avatar_url: url }
      localStorage.setItem('copa_player', JSON.stringify(updated))
    } catch(err) { alert('Erro ao enviar foto: ' + err.message) }
    finally { setUploading(false) }
  }

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'50vh',color:'#9CA3AF',fontFamily:'Sora',fontSize:13}}>Carregando perfil...</div>

  const { lives, inKnockout } = computeLives(picks)
  const maxLives = inKnockout ? 3 : 6
  const correct  = picks.filter(p=>p.result==='win').length
  const total    = picks.filter(p=>p.result!==null&&p.result!=='no_pick').length
  const accuracy = total > 0 ? Math.round(correct/total*100) : 0

  const usedMap = {}
  picks.filter(p=>p.result!=='no_pick'&&p.team_name!=='no_pick').forEach(p=>{
    if(!usedMap[p.team_name]) usedMap[p.team_name]=[]
    if(p.result) usedMap[p.team_name].push(p.result)
  })
  function getInvStatus(name) {
    const r = usedMap[name]
    if(!r) return 'available'
    if(r.includes('loss')) return 'burned'
    if(r.length>0) return 'unlocked'
    return 'available'
  }

  return (
    <div style={{padding:'20px 16px 100px',maxWidth:480,margin:'0 auto'}}>

      {/* Profile header */}
      <div style={{background:'linear-gradient(135deg, #0D2B17, #1A4731)',borderRadius:20,padding:'24px 20px',marginBottom:12,position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:-20,right:-20,width:100,height:100,borderRadius:'50%',background:'rgba(214,179,106,.07)'}}/>
        <div style={{display:'flex',alignItems:'center',gap:16}}>
          {/* Avatar with upload */}
          <div style={{position:'relative',flexShrink:0}}>
            <div style={{width:72,height:72,borderRadius:'50%',overflow:'hidden',
              border:'3px solid #D6B36A',background:'#0A1F0E',
              display:'flex',alignItems:'center',justifyContent:'center'}}>
              {avatarUrl
                ? <img src={avatarUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                : <span style={{fontSize:36}}>{targetPlayer?.avatar||'⚽'}</span>
              }
            </div>
            {isMe && (
              <>
                <button onClick={()=>fileRef.current?.click()}
                  disabled={uploading}
                  style={{
                    position:'absolute',bottom:0,right:0,
                    width:24,height:24,borderRadius:'50%',border:'2px solid #0D2B17',
                    background:'#D6B36A',display:'flex',alignItems:'center',justifyContent:'center',
                    cursor:'pointer',
                  }}>
                  <Camera size={12} color="#0D2B17"/>
                </button>
                <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handlePhoto}/>
              </>
            )}
          </div>
          <div style={{flex:1}}>
            <div style={{fontFamily:'Sora',fontSize:22,fontWeight:800,color:'#fff',marginBottom:2}}>
              {targetPlayer?.name}
            </div>
            <div style={{fontSize:12,color:'#D6B36A',fontWeight:600}}>
              {lives<=0 ? '💀 Eliminado' : `● ${inKnockout?'Mata-Mata':'Fase de Grupos'}`}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginTop:20}}>
          {[[lives,'Vidas','#D6B36A'],[correct,'Acertos','#4ADE80'],[`${accuracy}%`,'Taxa','#60A5FA']].map(([val,label,color])=>(
            <div key={label} style={{background:'rgba(255,255,255,.07)',borderRadius:12,padding:'10px 8px',textAlign:'center'}}>
              <div style={{fontFamily:'Sora',fontSize:22,fontWeight:800,color,lineHeight:1}}>{val}</div>
              <div style={{fontSize:9,fontFamily:'Sora',fontWeight:700,letterSpacing:'.06em',
                textTransform:'uppercase',color:'rgba(255,255,255,.4)',marginTop:3}}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{marginTop:14}}>
          <ShieldLives lives={lives} max={maxLives} />
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',background:'#F3F0EA',borderRadius:12,padding:3,marginBottom:12,gap:3}}>
        {[['inventory','Inventário'],['history','Histórico de Picks']].map(([key,label])=>(
          <button key={key} onClick={()=>setTab(key)}
            style={{
              flex:1, padding:'9px 8px', borderRadius:10, border:'none',
              fontFamily:'Sora', fontSize:11, fontWeight:700, cursor:'pointer',
              transition:'all .15s',
              background: tab===key ? '#fff' : 'transparent',
              color: tab===key ? '#1A4731' : '#9CA3AF',
              boxShadow: tab===key ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* Inventory */}
      {tab==='inventory' && (
        <div style={{background:'#fff',borderRadius:16,padding:'16px',boxShadow:'0 2px 12px rgba(0,0,0,.06)'}}>
          <div style={{display:'flex',gap:12,marginBottom:14,flexWrap:'wrap'}}>
            {[['#E5E7EB','Disponível'],['#D6B36A','Desbloqueado'],['#DC2626','Queimado']].map(([c,l])=>(
              <div key={l} style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:'#6B7280'}}>
                <div style={{width:10,height:10,borderRadius:'50%',background:c,flexShrink:0}}/>
                {l}
              </div>
            ))}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:10}}>
            {ALL_TEAMS.map(team => {
              const status = getInvStatus(team)
              const code   = countryCode(team)
              if (!code) return null
              const burned   = status==='burned'
              const unlocked = status==='unlocked'
              return (
                <div key={team} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3,position:'relative'}}>
                  <div style={{position:'relative'}}>
                    <img
                      src={`https://flagcdn.com/w72/${code}.png`}
                      alt={team} width={36} height={25}
                      style={{
                        borderRadius:3, display:'block',
                        filter: (burned||unlocked) ? 'grayscale(100%) opacity(.45)' : 'none',
                        border: unlocked ? '2px solid #D6B36A' : burned ? '2px solid #DC2626' : '1px solid #E5E7EB',
                      }}
                    />
                    {burned && (
                      <div style={{position:'absolute',top:-4,right:-4,width:14,height:14,
                        borderRadius:'50%',background:'#DC2626',display:'flex',
                        alignItems:'center',justifyContent:'center',border:'1.5px solid #fff'}}>
                        <span style={{fontSize:7,color:'#fff',fontWeight:900}}>✕</span>
                      </div>
                    )}
                    {unlocked && (
                      <div style={{position:'absolute',top:-4,right:-4,width:14,height:14,
                        borderRadius:'50%',background:'#D6B36A',border:'1.5px solid #fff'}}/>
                    )}
                  </div>
                  <div style={{fontFamily:'Sora',fontSize:6.5,fontWeight:600,textTransform:'uppercase',
                    letterSpacing:'.02em',textAlign:'center',color:'#9CA3AF',lineHeight:1.2,
                    maxWidth:36,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {team.replace(' and Herzegovina','').replace(' Republic','').slice(0,9)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* History */}
      {tab==='history' && (
        <div style={{background:'#fff',borderRadius:16,overflow:'hidden',boxShadow:'0 2px 12px rgba(0,0,0,.06)'}}>
          {picks.length===0
            ? <div style={{padding:'40px',textAlign:'center',color:'#9CA3AF',fontFamily:'Sora',fontSize:13}}>Nenhuma pick ainda.</div>
            : [...picks].reverse().map((p,i)=>(
              <div key={p.id} style={{
                display:'flex', alignItems:'center', gap:12, padding:'12px 16px',
                borderBottom: i<picks.length-1?'1px solid #F3F0EA':'none',
              }}>
                {p.team_name!=='no_pick'
                  ? <FlagImage team={p.team_name} size="sm"/>
                  : <div style={{width:36,height:25,background:'#F3F0EA',borderRadius:3,display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <span style={{fontSize:10,color:'#9CA3AF',fontFamily:'Sora',fontWeight:700}}>–</span>
                    </div>
                }
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,fontSize:13,color:'#111827'}}>
                    {p.team_name==='no_pick'?'Sem pick':p.team_name}
                    {p.is_repeat&&<span style={{fontSize:10,color:'#D97706',marginLeft:4}}>↻ rep.</span>}
                  </div>
                  <div style={{fontSize:11,color:'#9CA3AF'}}>{p.pick_date}</div>
                </div>
                <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:3}}>
                  {!p.result
                    ? <span style={{fontSize:10,color:'#D97706',fontFamily:'Sora',fontWeight:700}}>Aguardando</span>
                    : p.result==='win'
                      ? <span style={{fontSize:10,color:'#1A4731',fontFamily:'Sora',fontWeight:700}}>✓ Acertou</span>
                      : p.result==='draw'
                        ? <span style={{fontSize:10,color:'#2563EB',fontFamily:'Sora',fontWeight:700}}>= Empate</span>
                        : p.result==='loss'
                          ? <span style={{fontSize:10,color:'#DC2626',fontFamily:'Sora',fontWeight:700}}>✕ Errou</span>
                          : <span style={{fontSize:10,color:'#9CA3AF',fontFamily:'Sora',fontWeight:700}}>Não enviou</span>
                  }
                  {p.lives_lost>0&&<span style={{fontSize:10,color:'#DC2626'}}>−{p.lives_lost} vida{p.lives_lost>1?'s':''}</span>}
                </div>
              </div>
            ))
          }
        </div>
      )}

      {isMe && (
        <div style={{marginTop:12,padding:'12px 16px',background:'#F3F0EA',borderRadius:12,fontSize:12,color:'#6B7280',textAlign:'center'}}>
          Clique na foto para alterar sua imagem de perfil
        </div>
      )}
    </div>
  )
}
