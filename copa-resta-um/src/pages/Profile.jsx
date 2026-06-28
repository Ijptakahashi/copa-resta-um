import { useState, useEffect, useRef } from 'react'
import { Settings, Camera, Lock, X } from 'lucide-react'
import { getPlayerPicks, getPlayers, getMatches, changePassword } from '../lib/supabase'
import { computeLives, pickDeadline, toLocalDateISO, r32Deadline, isR32Open } from '../lib/gameLogic'
import { countryCode } from '../components/FlagImage'
import { ShieldIcon } from '../components/ShieldLives'
import Avatar from '../components/Avatar'
import { ProfileSkeleton } from '../components/Skeletons'

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
  const [matches,setMatches] = useState([])
  const [loading,setLoad]  = useState(true)
  const [tab,setTab]       = useState('inventory')
  const [uploading,setUpl] = useState(false)
  const [photoUrl,setPhoto]= useState(null)
  const [photoErr,setPhErr]= useState('')
  const fileRef            = useRef()
  const [showPwModal,setShowPw] = useState(false)
  const [curPw,setCurPw]   = useState('')
  const [newPw,setNewPw]   = useState('')
  const [newPw2,setNewPw2] = useState('')
  const [pwMsg,setPwMsg]   = useState('')
  const [pwSaving,setPwSaving] = useState(false)

  useEffect(()=>{ load() },[targetId])

  async function load(){
    setLoad(true)
    const [pp,players,ms]=await Promise.all([getPlayerPicks(targetId),getPlayers(),getMatches()])
    setMatches(ms)
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
        setPhErr(upErr.message.includes('ucket')
          ?'Crie o bucket: Supabase → Storage → New Bucket → "avatars" → Public → Create'
          :upErr.message)
        return
      }
      const {data}=supabase.storage.from('avatars').getPublicUrl(path)
      await supabase.from('players').update({avatar_url:data.publicUrl}).eq('id',player.id)
      setPhoto(data.publicUrl)
      localStorage.setItem('copa_player',JSON.stringify({...player,avatar_url:data.publicUrl}))
    } catch(e){setPhErr(e.message)} finally{setUpl(false)}
  }

  if(loading) return <ProfileSkeleton/>

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
  // Pick de outro jogador só é visível depois de travar.
  // Grupos: trava por dia (30min antes do 1º jogo daquele dia).
  // R32: trava pela fase INTEIRA (30min antes do 1º jogo de toda a fase),
  // independente da data específica daquela pick.
  function isPickLocked(pickDate, phase) {
    if (phase === 'r32') {
      return !isR32Open(matches)   // true = mercado fechado = pode revelar
    }
    const dayMatches = matches.filter(m => toLocalDateISO(m.utc_date) === pickDate)
    const dl = pickDeadline(dayMatches)
    if (!dl) return true            // sem jogos cadastrados nesse dia = trata como travado
    return new Date() >= dl
  }

  function getStatus(name){
    const r=usedMap[name]
    if(!r||!r.length) return 'available'
    if(r.includes('loss')) return 'burned'
    return 'unlocked'
  }

  async function handleChangePw() {
    setPwMsg('')
    if (newPw.length < 4) { setPwMsg('A nova senha precisa de ao menos 4 caracteres.'); return }
    if (newPw !== newPw2) { setPwMsg('As senhas novas não coincidem.'); return }
    setPwSaving(true)
    try {
      await changePassword(player.id, curPw, newPw)
      setPwMsg('ok')
      setCurPw(''); setNewPw(''); setNewPw2('')
      setTimeout(() => { setShowPw(false); setPwMsg('') }, 1200)
    } catch(e) {
      setPwMsg(e.message || 'Erro ao trocar senha.')
    } finally { setPwSaving(false) }
  }

  return(
    <div className="page">
      {/* Header */}
      <div style={{display:'flex',justifyContent:'flex-end',marginBottom:12}}>
        {isMe&&(
          <button onClick={()=>setShowPw(true)}
            style={{width:36,height:36,borderRadius:'50%',background:'#fff',
            border:'1px solid rgba(0,0,0,.07)',display:'flex',alignItems:'center',
            justifyContent:'center',boxShadow:'0 1px 4px rgba(0,0,0,.06)',cursor:'pointer'}}>
            <Settings size={16} color="#6B6B6B"/>
          </button>
        )}
      </div>

      {/* Avatar + name */}
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',marginBottom:20}}>
        <div style={{position:'relative',marginBottom:12}}>
          <div style={{boxShadow:'0 0 0 4px rgba(201,164,74,.15)',borderRadius:'50%'}}>
            <Avatar name={tp?.name} photoUrl={photoUrl} size={88} ring="#C9A44A"/>
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
              const locked = isPickLocked(p.pick_date, p.phase)
              const hidden = !isMe && !locked   // perfil de outro + pick não travada = ocultar
              const code = hidden ? null : countryCode(p.team_name)
              return(
                <div key={p.id} style={{display:'flex',alignItems:'center',gap:12,
                  padding:'12px 16px',
                  borderBottom:i<picks.length-1?'1px solid rgba(0,0,0,.05)':'none'}}>
                  {code?(
                    <img src={`https://flagcdn.com/w40/${code}.png`} alt={p.team_name}
                      width={36} height={25} style={{borderRadius:3,border:'1px solid rgba(0,0,0,.08)',flexShrink:0}}/>
                  ):(
                    <div style={{width:36,height:25,background:'#F3F0EA',borderRadius:3,
                      display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <span style={{fontSize:9,color:'#9CA3AF',fontFamily:'Sora',fontWeight:700}}>–</span>
                    </div>
                  )}
                  <div style={{flex:1}}>
                    <div style={{fontFamily:'Sora',fontWeight:600,fontSize:13,
                      color:hidden?'#9CA3AF':'#1A1A1A'}}>
                      {hidden?'🔒 Oculto até travar'
                        :p.team_name==='no_pick'?'Sem pick':p.team_name}
                      {!hidden&&p.is_repeat&&<span style={{fontSize:10,color:'#A07830',marginLeft:5,
                        fontWeight:600}}>↻ repeat</span>}
                    </div>
                    <div style={{fontSize:11,color:'#9CA3AF',fontFamily:'Inter',marginTop:1}}>
                      {p.pick_date}
                    </div>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:3}}>
                    {hidden&&<span style={{fontFamily:'Sora',fontSize:9,fontWeight:700,
                      color:'#9CA3AF',background:'#F3F0EA',padding:'3px 8px',borderRadius:12}}>🔒 LOCKED</span>}
                    {!hidden&&!p.result&&<span style={{fontFamily:'Sora',fontSize:9,fontWeight:700,
                      color:'#C9A44A',background:'#FBF5E6',padding:'3px 8px',borderRadius:12}}>PENDING</span>}
                    {!hidden&&p.result==='win'&&<span style={{fontFamily:'Sora',fontSize:9,fontWeight:700,
                      color:'#1A3D28',background:'#EBF5EE',padding:'3px 8px',borderRadius:12}}>✓ CORRECT</span>}
                    {!hidden&&p.result==='draw'&&<span style={{fontFamily:'Sora',fontSize:9,fontWeight:700,
                      color:'#2563EB',background:'#EFF6FF',padding:'3px 8px',borderRadius:12}}>=  DRAW</span>}
                    {!hidden&&p.result==='loss'&&<span style={{fontFamily:'Sora',fontSize:9,fontWeight:700,
                      color:'#C4302B',background:'#FEF0EF',padding:'3px 8px',borderRadius:12}}>✗ WRONG</span>}
                    {!hidden&&p.result==='no_pick'&&<span style={{fontFamily:'Sora',fontSize:9,fontWeight:700,
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
      {/* Modal trocar senha */}
      {showPwModal && (
        <div onClick={()=>!pwSaving&&setShowPw(false)}
          style={{position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,.5)',
            display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div onClick={e=>e.stopPropagation()}
            style={{background:'#fff',borderRadius:20,padding:'24px 20px',maxWidth:380,width:'100%',
              boxShadow:'0 8px 40px rgba(0,0,0,.25)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <Lock size={18} color="#1A3D28"/>
                <span style={{fontFamily:'Sora',fontWeight:800,fontSize:17,color:'#1A3D28'}}>Trocar senha</span>
              </div>
              <button onClick={()=>!pwSaving&&setShowPw(false)}
                style={{background:'none',border:'none',cursor:'pointer',color:'#9CA3AF'}}>
                <X size={20}/>
              </button>
            </div>

            {[['Senha atual',curPw,setCurPw],['Nova senha',newPw,setNewPw],['Confirmar nova senha',newPw2,setNewPw2]].map(([ph,val,setter],i)=>(
              <input key={i} type="password" placeholder={ph} value={val}
                onChange={e=>setter(e.target.value)}
                style={{width:'100%',padding:'13px 16px',borderRadius:12,marginBottom:10,
                  border:'1.5px solid rgba(0,0,0,.1)',fontSize:16,fontFamily:'Inter',
                  outline:'none',background:'#F8F4EE'}}/>
            ))}

            {pwMsg && pwMsg!=='ok' && (
              <div style={{background:'#FEF0EF',borderRadius:10,padding:'10px 14px',fontSize:12,
                color:'#C4302B',fontFamily:'Inter',marginBottom:10,
                border:'1px solid rgba(196,48,43,.2)'}}>{pwMsg}</div>
            )}
            {pwMsg==='ok' && (
              <div style={{background:'#EBF5EE',borderRadius:10,padding:'10px 14px',fontSize:12,
                color:'#1A3D28',fontFamily:'Inter',marginBottom:10,fontWeight:600,
                border:'1px solid rgba(26,61,40,.2)'}}>✓ Senha alterada com sucesso!</div>
            )}

            <button onClick={handleChangePw} disabled={pwSaving}
              style={{width:'100%',padding:'15px',borderRadius:12,border:'none',
                background:pwSaving?'#E8E3DB':'linear-gradient(135deg,#1A3D28,#1E5235)',
                color:pwSaving?'#B0A898':'#fff',fontFamily:'Sora',fontWeight:700,fontSize:14,
                letterSpacing:'.04em',cursor:pwSaving?'default':'pointer',marginTop:4}}>
              {pwSaving?'SALVANDO...':'SALVAR NOVA SENHA'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}