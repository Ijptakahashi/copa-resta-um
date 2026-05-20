import { useState, useEffect, useRef } from 'react'
import { Settings, Camera } from 'lucide-react'
import { getPlayerPicks, getPlayers } from '../lib/supabase'
import { computeLives } from '../lib/gameLogic'
import { countryCode } from '../components/FlagImage'
import { ShieldIcon } from '../components/ShieldLives'

// Exactly 48 Copa 2026 teams (12 groups × 4)
const ALL_TEAMS = [
  'Algeria','Argentina','Australia','Austria',
  'Belgium','Bosnia and Herzegovina','Brazil',
  'Canada','Cape Verde','Colombia','Croatia','Curacao',
  'Czech Republic','DR Congo','Ecuador','Egypt','England',
  'France','Germany','Ghana','Haiti',
  'Iran','Iraq','Ivory Coast','Japan','Jordan',
  'Mexico','Morocco','Netherlands','New Zealand',
  'Norway','Panama','Paraguay','Portugal',
  'Qatar','Saudi Arabia','Scotland','Senegal',
  'South Africa','South Korea','Spain','Sweden','Switzerland',
  'Tunisia','Turkey','United States','Uruguay','Uzbekistan',
].sort()

export default function Profile({ player, viewPlayerId }) {
  const targetId = viewPlayerId || player.id
  const isMe     = targetId === player.id
  const [tp,setTP]         = useState(null)
  const [picks,setPicks]   = useState([])
  const [loading,setLoad]  = useState(true)
  const [tab,setTab]       = useState('inventory')
  const [uploading,setUpl] = useState(false)
  const [photoUrl,setPhoto]= useState(null)
  const [photoErr,setPhErr]= useState('')
  const fileRef            = useRef()

  useEffect(()=>{ load() },[targetId])

  async function load(){
    setLoad(true)
    const [pp,players]=await Promise.all([getPlayerPicks(targetId),getPlayers()])
    setPicks(pp)
    const t=players.find(p=>p.id===targetId)||player
    setTP(t); setPhoto(t.avatar_url||null); setLoad(false)
  }

  async function handlePhoto(e){
    const file=e.target.files?.[0]
    if(!file||!isMe) return
    setUpl(true); setPhErr('')
    try{
      const {supabase}=await import('../lib/supabase')
      const ext=file.name.split('.').pop()
      const path=`${player.id}.${ext}`
      const {error:upErr}=await supabase.storage.from('avatars')
        .upload(path,file,{upsert:true,contentType:file.type})
      if(upErr){
        if (upErr.message.includes('ucket') || upErr.message.includes('not found')) {
          setPhErr('Para fotos: Supabase → Storage → New bucket → nome: avatars → ative "Public bucket" → Save')
        } else {
          setPhErr(upErr.message)
        }
        return
      }
      const {data}=supabase.storage.from('avatars').getPublicUrl(path)
      await supabase.from('players').update({avatar_url:data.publicUrl}).eq('id',player.id)
      setPhoto(data.publicUrl)
      localStorage.setItem('copa_player',JSON.stringify({...player,avatar_url:data.publicUrl}))
    } catch(e){setPhErr(e.message)} finally{setUpl(false)}
  }

  if(loading) return(
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'60vh'}}>
      <div style={{width:36,height:36,borderRadius:'50%',border:'3px solid #E8E3DB',
        borderTopColor:'#1A3D28',animation:'spin 1s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const {lives,inKnockout}=computeLives(picks)
  const maxL=inKnockout?3:6
  const correct=picks.filter(p=>p.result==='win').length
  const total=picks.filter(p=>p.result!==null&&p.result!=='no_pick').length
  const accuracy=total>0?Math.round(correct/total*100):0

  const usedMap={}
  picks.filter(p=>p.result!=='no_pick'&&p.team_name!=='no_pick').forEach(p=>{
    if(!usedMap[p.team_name]) usedMap[p.team_name]=[]
    if(p.result) usedMap[p.team_name].push(p.result)
  })
  function getStatus(name){
    const r=usedMap[name]
    if(!r||!r.length) return 'available'
    if(r.includes('loss')) return 'burned'
    return 'unlocked'
  }

  return(
    <div className="page">
      {/* Header */}
      <div style={{display:'flex',justifyContent:'flex-end',marginBottom:12}}>
        {isMe&&(
          <button style={{width:36,height:36,borderRadius:'50%',background:'#fff',
            border:'1px solid rgba(0,0,0,.07)',display:'flex',alignItems:'center',
            justifyContent:'center',boxShadow:'0 1px 4px rgba(0,0,0,.06)',cursor:'pointer'}}>
            <Settings size={16} color="#6B6B6B"/>
          </button>
        )}
      </div>

      {/* Avatar + name */}
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',marginBottom:20}}>
        <div style={{position:'relative',marginBottom:12}}>
          <div style={{width:88,height:88,borderRadius:'50%',overflow:'hidden',
            border:'3px solid #C9A44A',background:'#F3F0EA',
            display:'flex',alignItems:'center',justifyContent:'center',
            boxShadow:'0 0 0 4px rgba(201,164,74,.15)'}}>
            {photoUrl
              ? <img src={photoUrl} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>
              : <span style={{fontSize:44,lineHeight:1}}>{tp?.avatar||'⚽'}</span>
            }
          </div>
          {isMe&&(
            <>
              <button onClick={()=>fileRef.current?.click()} disabled={uploading}
                style={{position:'absolute',bottom:2,right:2,width:28,height:28,
                  borderRadius:'50%',border:'2.5px solid #F8F4EE',
                  background:'linear-gradient(135deg,#C9A44A,#A07830)',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  cursor:'pointer',boxShadow:'0 2px 8px rgba(0,0,0,.2)'}}>
                <Camera size={12} color="#fff"/>
              </button>
              <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handlePhoto}/>
            </>
          )}
        </div>
        <div style={{fontFamily:'Sora',fontWeight:800,fontSize:22,color:'#1A1A1A',
          letterSpacing:'-.5px',textAlign:'center'}}>{tp?.name}</div>
        <div style={{fontFamily:'Inter',fontSize:13,color:'#9CA3AF',marginTop:2,textAlign:'center'}}>
          @{tp?.name?.toLowerCase().replace(/\s/g,'')}
        </div>
      </div>

      {photoErr&&(
        <div style={{background:'#FEF0EF',border:'1px solid rgba(196,48,43,.2)',borderRadius:10,
          padding:'10px 14px',fontSize:11,color:'#C4302B',marginBottom:12,fontFamily:'Inter',lineHeight:1.5}}>
          {photoErr}
        </div>
      )}

      {/* Stats */}
      <div style={{background:'#fff',borderRadius:16,padding:'16px',marginBottom:12,
        border:'1px solid rgba(0,0,0,.07)',boxShadow:'0 2px 8px rgba(0,0,0,.05)'}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:0,textAlign:'center'}}>
          {[[lives,'LIVES','#C9A44A'],[correct,'CORRECT','#1A3D28'],[`${accuracy}%`,'ACCURACY','#1A3D28']].map(([v,l,c],i)=>(
            <div key={l} style={{padding:'4px 0',borderRight:i<2?'1px solid rgba(0,0,0,.07)':'none'}}>
              <div style={{fontFamily:'Sora',fontWeight:800,fontSize:26,color:c,lineHeight:1}}>{v}</div>
              <div style={{fontFamily:'Sora',fontWeight:700,fontSize:9,letterSpacing:'.1em',
                textTransform:'uppercase',color:'#9CA3AF',marginTop:4}}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{marginTop:14,paddingTop:14,borderTop:'1px solid rgba(0,0,0,.06)'}}>
          <div style={{display:'flex',alignItems:'center',gap:4}}>
            {Array.from({length:maxL}).map((_,i)=>(
              <ShieldIcon key={i} active={i<lives} size={22}/>
            ))}
            <span style={{fontFamily:'Sora',fontWeight:700,fontSize:11,
              color:'#C9A44A',marginLeft:4}}>{lives}/{maxL}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',background:'#F3F0EA',borderRadius:12,padding:3,marginBottom:12,gap:2}}>
        {[['inventory','TEAM INVENTORY'],['history','PICK HISTORY']].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)}
            style={{flex:1,padding:'9px',borderRadius:10,border:'none',cursor:'pointer',
              fontFamily:'Sora',fontSize:10,fontWeight:700,letterSpacing:'.06em',
              transition:'all .15s',
              background:tab===k?'#fff':'transparent',
              color:tab===k?'#1A3D28':'#9CA3AF',
              boxShadow:tab===k?'0 1px 4px rgba(0,0,0,.08)':'none'}}>
            {l}
          </button>
        ))}
      </div>

      {/* INVENTORY */}
      {tab==='inventory'&&(
        <div style={{background:'#fff',borderRadius:16,padding:'16px',
          border:'1px solid rgba(0,0,0,.07)',boxShadow:'0 2px 8px rgba(0,0,0,.05)'}}>
          {/* Legend */}
          <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:14,flexWrap:'wrap'}}>
            <div style={{fontFamily:'Sora',fontWeight:700,fontSize:10,letterSpacing:'.06em',
              textTransform:'uppercase',color:'#1A1A1A',marginRight:4}}>
              TEAM INVENTORY ({ALL_TEAMS.filter(t=>countryCode(t)).length}/
              {ALL_TEAMS.filter(t=>countryCode(t)).length})
            </div>
          </div>
          <div style={{display:'flex',gap:12,marginBottom:14,flexWrap:'wrap'}}>
            {[['#22C55E','AVAILABLE'],['#C4302B','BURNED'],['#C9A44A','REUSE UNLOCKED']].map(([c,l])=>(
              <div key={l} style={{display:'flex',alignItems:'center',gap:5,
                fontSize:10,color:'#6B6B6B',fontFamily:'Sora',fontWeight:600}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:c,flexShrink:0}}/>
                {l}
              </div>
            ))}
          </div>

          {/* Grid — 4 columns */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
            {ALL_TEAMS.map(team=>{
              const code=countryCode(team)
              if(!code) return null
              const status=getStatus(team)
              const burned=status==='burned'
              const unlocked=status==='unlocked'
              return(
                <div key={team} style={{display:'flex',flexDirection:'column',
                  alignItems:'center',gap:4}}>
                  <div style={{position:'relative'}}>
                    <img
                      src={`https://flagcdn.com/w40/${code}.png`}
                      alt={team} width={44} height={30} loading="lazy"
                      style={{borderRadius:4,display:'block',
                        filter:(burned||unlocked)?'grayscale(100%) opacity(.5)':'none',
                        border:unlocked?'2px solid #C9A44A':burned?'2px solid #C4302B':'1px solid rgba(0,0,0,.1)',
                        boxShadow:'0 1px 4px rgba(0,0,0,.08)'}}
                    />
                    {burned&&(
                      <div style={{position:'absolute',top:-5,right:-5,
                        width:16,height:16,borderRadius:'50%',
                        background:'#C4302B',border:'2px solid #F8F4EE',
                        display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <span style={{fontSize:8,color:'#fff',fontWeight:900,lineHeight:1}}>✕</span>
                      </div>
                    )}
                    {unlocked&&(
                      <div style={{position:'absolute',top:-5,right:-5,
                        width:16,height:16,borderRadius:'50%',
                        background:'#C9A44A',border:'2px solid #F8F4EE'}}/>
                    )}
                  </div>
                  <div style={{fontFamily:'Sora',fontWeight:600,fontSize:7,
                    textTransform:'uppercase',letterSpacing:'.02em',
                    textAlign:'center',color:'#9CA3AF',lineHeight:1.2,
                    maxWidth:44,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {team.replace(' and Herzegovina','').replace('Republic','Rep.').slice(0,10)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* HISTORY */}
      {tab==='history'&&(
        <div style={{background:'#fff',borderRadius:16,overflow:'hidden',
          border:'1px solid rgba(0,0,0,.07)',boxShadow:'0 2px 8px rgba(0,0,0,.05)'}}>
          {picks.length===0?(
            <div style={{padding:'40px',textAlign:'center',color:'#9CA3AF',
              fontFamily:'Sora',fontSize:13}}>Nenhuma pick ainda.</div>
          ):(
            [...picks].reverse().map((p,i)=>{
              const code=countryCode(p.team_name)
              return(
                <div key={p.id} style={{display:'flex',alignItems:'center',gap:12,
                  padding:'12px 16px',
                  borderBottom:i<picks.length-1?'1px solid rgba(0,0,0,.05)':'none'}}>
                  <div style={{width:40,height:40,borderRadius:'50%',overflow:'hidden',
                    border:`2px solid ${p.result==='win'?'#1A3D28':p.result==='loss'?'#C4302B':p.result==='draw'?'#2563EB':'rgba(0,0,0,.1)'}`,
                    background:'#F3F0EA',flexShrink:0,
                    display:'flex',alignItems:'center',justifyContent:'center'}}>
                    {code
                      ? <img src={`https://flagcdn.com/w80/${code}.png`} style={{width:'100%',height:'100%',objectFit:'cover'}} alt={p.team_name}/>
                      : <span style={{fontSize:10,color:'#9CA3AF',fontFamily:'Sora',fontWeight:700}}>–</span>
                    }
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:'Sora',fontWeight:600,fontSize:13,color:'#1A1A1A'}}>
                      {p.team_name==='no_pick'?'No pick submitted':p.team_name}
                      {p.is_repeat&&<span style={{fontSize:10,color:'#A07830',marginLeft:5,
                        fontWeight:600}}>↻ repeat</span>}
                    </div>
                    <div style={{fontSize:11,color:'#9CA3AF',fontFamily:'Inter',marginTop:1}}>
                      {p.pick_date}
                    </div>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:3}}>
                    {!p.result&&<span style={{fontFamily:'Sora',fontSize:9,fontWeight:700,
                      color:'#C9A44A',background:'#FBF5E6',padding:'3px 8px',borderRadius:12}}>PENDING</span>}
                    {p.result==='win'&&<span style={{fontFamily:'Sora',fontSize:9,fontWeight:700,
                      color:'#1A3D28',background:'#EBF5EE',padding:'3px 8px',borderRadius:12}}>✓ CORRECT</span>}
                    {p.result==='draw'&&<span style={{fontFamily:'Sora',fontSize:9,fontWeight:700,
                      color:'#2563EB',background:'#EFF6FF',padding:'3px 8px',borderRadius:12}}>=  DRAW</span>}
                    {p.result==='loss'&&<span style={{fontFamily:'Sora',fontSize:9,fontWeight:700,
                      color:'#C4302B',background:'#FEF0EF',padding:'3px 8px',borderRadius:12}}>✗ WRONG</span>}
                    {p.result==='no_pick'&&<span style={{fontFamily:'Sora',fontSize:9,fontWeight:700,
                      color:'#9CA3AF',background:'#F3F0EA',padding:'3px 8px',borderRadius:12}}>MISSED</span>}
                    {p.lives_lost>0&&<span style={{fontSize:10,color:'#C4302B',fontFamily:'Inter'}}>
                      −{p.lives_lost} vida{p.lives_lost>1?'s':''}
                    </span>}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
