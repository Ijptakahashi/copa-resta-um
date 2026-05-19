import { useState, useEffect } from 'react'
import { ArrowLeft, Info, Lock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getPlayerPicks, getMatches, submitPick } from '../lib/supabase'
import { computeLives, getTeamStatus, validatePick, todayBrasilia,
         toLocalDateISO, isPickOpen, pickDeadline, STAGE_TO_PHASE } from '../lib/gameLogic'
import FlagImage from '../components/FlagImage'
import { ShieldIcon } from '../components/ShieldLives'

function normName(n=''){return n.toLowerCase().replace(/&/g,'and').replace(/\s+/g,' ').trim()}

function DeadlineCountdown({ deadline }) {
  const [t,setT]=useState({m:'--',s:'--'})
  useEffect(()=>{
    function tick(){
      const d=deadline-Date.now()
      if(d<=0){setT({m:'00',s:'00'});return}
      setT({m:String(Math.floor(d/60000)).padStart(2,'0'),s:String(Math.floor((d%60000)/1000)).padStart(2,'0')})
    }
    tick(); const id=setInterval(tick,1000); return()=>clearInterval(id)
  },[deadline])
  return (
    <span style={{fontFamily:'Sora',fontWeight:800,color:'#C4302B'}}>
      {t.m}:{t.s}
    </span>
  )
}

export default function Pick({ player }) {
  const navigate = useNavigate()
  const [picks,setPicks]     = useState([])
  const [allMs,setAllMs]     = useState([])
  const [dates,setDates]     = useState([])
  const [dateIdx,setDIdx]    = useState(0)
  const [selDate,setSelDate] = useState('')
  const [dayMs,setDayMs]     = useState([])
  const [selected,setSel]    = useState(null)
  const [loading,setLoading] = useState(true)
  const [submitting,setSub]  = useState(false)
  const [error,setError]     = useState('')
  const today = todayBrasilia()

  useEffect(()=>{ load() },[player.id])

  async function load(){
    setLoading(true)
    const [pp,ms]=await Promise.all([getPlayerPicks(player.id),getMatches()])
    setPicks(pp); setAllMs(ms)
    const seen=new Set()
    const clean=ms.filter(m=>{
      const d=toLocalDateISO(m.utc_date)
      const k=`${d}|${normName(m.home_team)}|${normName(m.away_team)}`
      const r=`${d}|${normName(m.away_team)}|${normName(m.home_team)}`
      if(seen.has(k)||seen.has(r)) return false
      seen.add(k); return true
    })
    const ds=[...new Set(clean.map(m=>toLocalDateISO(m.utc_date)))].sort().filter(d=>d>='2026-06-11')
    setDates(ds)
    const idx=ds.indexOf(today)
    const start=idx>=0?idx:Math.max(0,ds.findIndex(d=>d>=today))
    setDIdx(start)
    const d0=ds[start]||today
    setSelDate(d0)
    setDayMs(clean.filter(m=>toLocalDateISO(m.utc_date)===d0))
    setLoading(false)
  }

  function changeDate(dir){
    const next=dateIdx+dir
    if(next<0||next>=dates.length) return
    setDIdx(next)
    const d=dates[next]
    setSelDate(d)
    const seen=new Set()
    setDayMs(allMs.filter(m=>{
      if(toLocalDateISO(m.utc_date)!==d) return false
      const k=`${normName(m.home_team)}|${normName(m.away_team)}`
      const r=`${normName(m.away_team)}|${normName(m.home_team)}`
      if(seen.has(k)||seen.has(r)) return false
      seen.add(k); return true
    }))
    setSel(null); setError('')
  }

  async function handleSubmit(){
    if(!selected) return
    setSub(true); setError('')
    try{
      const phase=STAGE_TO_PHASE[dayMs[0]?.stage]||'groups'
      const alreadyUsed=picks.some(p=>p.team_id===selected.teamId&&p.phase===phase&&p.result!=='no_pick')
      await submitPick({playerId:player.id,matchId:selected.matchId,
        teamName:selected.teamName,teamId:selected.teamId,
        phase,pickDate:selDate,isRepeat:alreadyUsed})
      await load(); setSel(null)
    } catch(e){ setError(e.message.includes('unique')?'Você já fez sua pick nesse dia!':'Erro ao enviar.') }
    finally{setSub(false)}
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
  const eliminated=lives<=0
  const isToday=selDate===today
  const isFuture=selDate>today
  const isPast=selDate<today
  const pickOpen=isPickOpen(dayMs)
  const deadline=pickDeadline(dayMs)
  const dayPick=picks.find(p=>p.pick_date===selDate)

  function fmtDay(d){
    if(!d) return ''
    const [y,mo,day]=d.split('-')
    return new Date(y,mo-1,day).toLocaleDateString('pt-BR',{weekday:'short',day:'numeric',month:'short'}).toUpperCase()
  }
  function fmtTime(utcDate){
    return new Date(utcDate).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'})
  }

  function TeamCard({ teamId, teamName, matchId }) {
    const status=getTeamStatus(picks,teamId)
    const burned=status==='burned'
    const isSelected=selected?.teamId===teamId
    return (
      <button onClick={()=>{
        if(burned) return
        if(isSelected){setSel(null);setError('');return}
        const phase=STAGE_TO_PHASE[dayMs[0]?.stage]||'groups'
        const v=validatePick(picks,teamId,teamName,phase,dayMs[0])
        if(!v.valid){setError(v.reason);setSel(null);return}
        setError(v.warning||''); setSel({teamId,teamName,matchId})
      }} disabled={burned}
        style={{flex:1,padding:'16px 8px',borderRadius:14,cursor:burned?'not-allowed':'pointer',
          border:`2px solid ${isSelected?'#1A3D28':burned?'#F0B0AC':'rgba(0,0,0,.07)'}`,
          background:isSelected?'rgba(26,61,40,.04)':burned?'#FEF0EF':'#fff',
          display:'flex',flexDirection:'column',alignItems:'center',gap:10,
          transition:'all .15s',boxShadow:isSelected?'0 0 0 3px rgba(26,61,40,.1)':
            burned?'none':'0 2px 8px rgba(0,0,0,.06)'}}>
        <FlagImage team={teamName} size="lg" grayscale={burned}/>
        <div style={{fontFamily:'Sora',fontWeight:700,fontSize:12,textTransform:'uppercase',
          letterSpacing:'.05em',textAlign:'center',color:burned?'#C4302B':'#1A1A1A'}}>
          {teamName}
        </div>
        <div style={{
          padding:'4px 12px',borderRadius:20,
          background:burned?'#C4302B':status==='unlocked'?'#FBF5E6':'rgba(26,61,40,.08)',
          color:burned?'#fff':status==='unlocked'?'#A07830':'#1A3D28',
          fontFamily:'Sora',fontWeight:700,fontSize:9,letterSpacing:'.06em',
          textTransform:'uppercase',
          textDecoration:burned?'line-through':'none',
        }}>
          {burned?'BURNED':status==='unlocked'?'REUSE UNLOCKED':'AVAILABLE'}
        </div>
      </button>
    )
  }

  return (
    <div style={{maxWidth:430,margin:'0 auto',minHeight:'100svh',background:'#F8F4EE'}}>
      {/* Header */}
      <div style={{padding:'16px 16px 0',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <button onClick={()=>navigate('/dashboard')}
          style={{width:36,height:36,borderRadius:'50%',border:'1px solid rgba(0,0,0,.1)',
            background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
          <ArrowLeft size={18} color="#1A1A1A"/>
        </button>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
          <div style={{fontFamily:'Sora',fontWeight:800,fontSize:11,color:'#1A3D28',letterSpacing:'.08em'}}>SURVIVOR</div>
          <div style={{fontFamily:'Sora',fontWeight:700,fontSize:9,color:'#C9A44A',letterSpacing:'.1em'}}>POOL 2026</div>
        </div>
        <button style={{width:36,height:36,borderRadius:'50%',border:'1px solid rgba(0,0,0,.1)',
          background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
          <Info size={16} color="#6B6B6B"/>
        </button>
      </div>

      <div style={{padding:'16px 16px 96px'}}>
        {/* Date nav */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
          background:'#fff',borderRadius:12,padding:'10px 14px',marginBottom:16,
          border:'1px solid rgba(0,0,0,.07)',boxShadow:'0 1px 6px rgba(0,0,0,.05)'}}>
          <button onClick={()=>changeDate(-1)} disabled={dateIdx===0}
            style={{padding:'4px 10px',borderRadius:8,background:dateIdx===0?'transparent':'#F3F0EA',
              color:dateIdx===0?'#D4CABC':'#1A1A1A',fontFamily:'Sora',fontWeight:700,fontSize:18,
              opacity:dateIdx===0?.3:1}}>‹</button>
          <div style={{textAlign:'center'}}>
            <div style={{fontFamily:'Sora',fontWeight:700,fontSize:12,color:'#1A3D28'}}>
              {isToday?'TODAY':isFuture?'UPCOMING':'PAST'}
            </div>
            <div style={{fontFamily:'Sora',fontWeight:600,fontSize:10,color:'#9CA3AF',marginTop:1}}>
              {fmtDay(selDate)}
            </div>
          </div>
          <button onClick={()=>changeDate(1)} disabled={dateIdx===dates.length-1}
            style={{padding:'4px 10px',borderRadius:8,
              background:dateIdx===dates.length-1?'transparent':'#F3F0EA',
              color:dateIdx===dates.length-1?'#D4CABC':'#1A1A1A',
              fontFamily:'Sora',fontWeight:700,fontSize:18,
              opacity:dateIdx===dates.length-1?.3:1}}>›</button>
        </div>

        {/* Main title */}
        <div style={{marginBottom:6}}>
          <div style={{fontFamily:'Sora',fontWeight:800,fontSize:34,color:'#1A3D28',
            lineHeight:1.05,letterSpacing:'-1px'}}>
            {isFuture?'UPCOMING\nMATCHES':isToday?'MAKE YOUR\nPICK':'PAST DAY'}
          </div>
          <div style={{fontSize:13,color:'#9CA3AF',marginTop:6,fontFamily:'Inter'}}>
            {isFuture?'Preview — picks open on match day':
             isToday&&pickOpen?'Select one team to keep in your pool.':
             isToday&&!pickOpen?'Deadline passed for today.':
             'Your pick for this day.'}
          </div>
        </div>

        {/* Deadline countdown */}
        {isToday&&pickOpen&&deadline&&!dayPick&&(
          <div style={{background:'#FEF0EF',borderRadius:10,padding:'10px 14px',
            marginBottom:16,display:'flex',alignItems:'center',gap:8,
            border:'1px solid rgba(196,48,43,.15)'}}>
            <Lock size={14} color="#C4302B"/>
            <span style={{fontFamily:'Sora',fontWeight:600,fontSize:12,color:'#C4302B'}}>
              Picks fecham em <DeadlineCountdown deadline={deadline}/>
            </span>
          </div>
        )}

        {/* Lives row */}
        <div style={{display:'flex',alignItems:'center',gap:4,marginBottom:20}}>
          {Array.from({length:maxL}).map((_,i)=>(
            <ShieldIcon key={i} active={i<lives} size={20}/>
          ))}
          <span style={{fontFamily:'Sora',fontWeight:700,fontSize:11,color:'#C9A44A',marginLeft:4}}>
            {lives}/{maxL} LIVES
          </span>
        </div>

        {/* No matches */}
        {dayMs.length===0&&(
          <div style={{background:'#fff',borderRadius:16,padding:'32px',textAlign:'center',
            border:'1px solid rgba(0,0,0,.07)'}}>
            <div style={{fontSize:40,marginBottom:8}}>📅</div>
            <div style={{fontFamily:'Sora',fontWeight:700,fontSize:15}}>Sem jogos nesse dia</div>
          </div>
        )}

        {/* Past day result */}
        {dayMs.length>0&&isPast&&(
          <div style={{background:'#fff',borderRadius:16,padding:'24px',textAlign:'center',
            border:'1px solid rgba(0,0,0,.07)'}}>
            {dayPick&&dayPick.team_name!=='no_pick'?(
              <>
                <FlagImage team={dayPick.team_name} size="xl" style={{margin:'0 auto 12px'}}/>
                <div style={{fontFamily:'Sora',fontWeight:800,fontSize:20}}>{dayPick.team_name}</div>
                <div style={{marginTop:10}}>
                  {!dayPick.result&&<span style={{fontFamily:'Sora',fontWeight:700,fontSize:12,color:'#C9A44A'}}>Aguardando resultado</span>}
                  {dayPick.result==='win'&&<span style={{fontFamily:'Sora',fontWeight:700,fontSize:13,color:'#1A3D28',background:'#EBF5EE',padding:'5px 14px',borderRadius:20}}>✓ ACERTOU</span>}
                  {dayPick.result==='loss'&&<span style={{fontFamily:'Sora',fontWeight:700,fontSize:13,color:'#C4302B',background:'#FEF0EF',padding:'5px 14px',borderRadius:20}}>✗ ERROU −{dayPick.lives_lost} vida{dayPick.lives_lost>1?'s':''}</span>}
                  {dayPick.result==='draw'&&<span style={{fontFamily:'Sora',fontWeight:700,fontSize:13,color:'#2563EB',background:'#EFF6FF',padding:'5px 14px',borderRadius:20}}> = EMPATE</span>}
                </div>
              </>
            ):(
              <>
                <div style={{fontSize:36,marginBottom:8}}>😴</div>
                <div style={{fontFamily:'Sora',fontWeight:700,color:'#C4302B'}}>Não enviou pick</div>
                <div style={{fontSize:12,color:'#9CA3AF',marginTop:4}}>−1 vida aplicada</div>
              </>
            )}
          </div>
        )}

        {/* Future preview */}
        {dayMs.length>0&&isFuture&&(
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {dayMs.map(match=>(
              <div key={match.id} style={{background:'#fff',borderRadius:16,padding:'16px',
                border:'1px solid rgba(0,0,0,.07)',boxShadow:'0 2px 8px rgba(0,0,0,.05)'}}>
                <div style={{fontFamily:'Sora',fontSize:9,fontWeight:700,letterSpacing:'.1em',
                  textTransform:'uppercase',color:'#9CA3AF',marginBottom:12,textAlign:'center'}}>
                  {match.group_name?`GRP ${match.group_name.replace('GROUP_','')} · `:''}
                  {fmtTime(match.utc_date)} BRT
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 48px 1fr',gap:8,alignItems:'center'}}>
                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
                    <FlagImage team={match.home_team} size="lg"/>
                    <span style={{fontFamily:'Sora',fontWeight:700,fontSize:10,textTransform:'uppercase',textAlign:'center'}}>{match.home_team}</span>
                  </div>
                  <div style={{textAlign:'center'}}>
                    <div style={{fontFamily:'Sora',fontWeight:700,fontSize:10,color:'#D4CABC'}}>VS</div>
                    <div style={{fontFamily:'Sora',fontWeight:800,fontSize:11,color:'#C9A44A',marginTop:2}}>{fmtTime(match.utc_date)}</div>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
                    <FlagImage team={match.away_team} size="lg"/>
                    <span style={{fontFamily:'Sora',fontWeight:700,fontSize:10,textTransform:'uppercase',textAlign:'center'}}>{match.away_team}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Today pick flow */}
        {dayMs.length>0&&isToday&&!eliminated&&(
          dayPick?(
            <div style={{background:'#fff',borderRadius:16,padding:'24px',textAlign:'center',
              border:'2px solid #1A3D28',boxShadow:'0 0 0 4px rgba(26,61,40,.06)'}}>
              <div style={{fontFamily:'Sora',fontWeight:700,fontSize:10,letterSpacing:'.12em',
                textTransform:'uppercase',color:'#1A3D28',marginBottom:12}}>✓ PICK CONFIRMED</div>
              <FlagImage team={dayPick.team_name} size="xl" style={{margin:'0 auto 12px'}}/>
              <div style={{fontFamily:'Sora',fontWeight:800,fontSize:22}}>{dayPick.team_name}</div>
              {dayPick.is_repeat&&(
                <div style={{marginTop:10,fontFamily:'Sora',fontSize:11,fontWeight:700,
                  color:'#A07830',background:'#FBF5E6',padding:'5px 14px',borderRadius:20,display:'inline-block'}}>
                  REPEAT — +1 VIDA
                </div>
              )}
            </div>
          ):!pickOpen?(
            <div style={{background:'#FEF0EF',borderRadius:16,padding:'24px',textAlign:'center',
              border:'1px solid rgba(196,48,43,.2)'}}>
              <Lock size={28} color="#C4302B" style={{margin:'0 auto 10px'}}/>
              <div style={{fontFamily:'Sora',fontWeight:700,fontSize:16,color:'#C4302B'}}>DEADLINE PASSED</div>
              <div style={{fontSize:13,color:'#9CA3AF',marginTop:6}}>−1 vida registrada</div>
            </div>
          ):(
            <>
              {dayMs.map(match=>(
                <div key={match.id} style={{marginBottom:12}}>
                  <div style={{fontFamily:'Sora',fontSize:9,fontWeight:700,letterSpacing:'.1em',
                    textTransform:'uppercase',color:'#9CA3AF',marginBottom:10,textAlign:'center'}}>
                    {match.group_name?`GRP ${match.group_name.replace('GROUP_','')} · `:''}
                    {fmtTime(match.utc_date)} BRT
                  </div>
                  <div style={{display:'flex',gap:10}}>
                    <TeamCard teamId={match.home_team_id} teamName={match.home_team} matchId={match.id}/>
                    <TeamCard teamId={match.away_team_id} teamName={match.away_team} matchId={match.id}/>
                  </div>
                </div>
              ))}

              {/* Info box */}
              <div style={{display:'flex',gap:10,background:'#fff',borderRadius:12,
                padding:'12px 14px',marginBottom:12,
                border:'1px solid rgba(0,0,0,.07)'}}>
                <ShieldIcon active size={20}/>
                <div>
                  <div style={{fontFamily:'Sora',fontWeight:600,fontSize:12,color:'#1A1A1A'}}>
                    Pick one team for today's match.
                  </div>
                  <div style={{fontSize:11,color:'#9CA3AF',marginTop:2}}>
                    You cannot pick the same team again in this phase.
                  </div>
                </div>
              </div>

              {error&&(
                <div style={{background:error.includes('⚠️')?'#FFFBEB':'#FEF0EF',
                  borderRadius:10,padding:'10px 14px',fontSize:12,marginBottom:10,
                  color:error.includes('⚠️')?'#A07830':'#C4302B',fontFamily:'Inter',
                  border:`1px solid ${error.includes('⚠️')?'rgba(160,120,48,.2)':'rgba(196,48,43,.2)'}`}}>
                  {error}
                </div>
              )}

              <button onClick={handleSubmit} disabled={!selected||submitting}
                style={{width:'100%',padding:'16px',borderRadius:14,border:'none',cursor:'pointer',
                  background:selected?'linear-gradient(135deg,#C9A44A,#A07830)':'#E8E3DB',
                  color:selected?'#fff':'#B0A898',
                  fontFamily:'Sora',fontWeight:700,fontSize:14,letterSpacing:'.08em',
                  textTransform:'uppercase',transition:'all .15s',
                  boxShadow:selected?'0 4px 16px rgba(201,164,74,.35)':'none'}}>
                {submitting?'CONFIRMING...' : selected?`CONFIRM PICK — ${selected.teamName}`:'SELECT A TEAM ABOVE'}
              </button>
              <div style={{textAlign:'center',fontSize:11,color:'#9CA3AF',marginTop:8,fontFamily:'Inter'}}>
                Picks are final and cannot be changed.
              </div>
            </>
          )
        )}

        {isToday&&eliminated&&(
          <div style={{background:'#FEF0EF',borderRadius:16,padding:'32px',textAlign:'center',
            border:'1px solid rgba(196,48,43,.15)'}}>
            <div style={{fontSize:48,marginBottom:8}}>💀</div>
            <div style={{fontFamily:'Sora',fontWeight:800,fontSize:20,color:'#C4302B'}}>ELIMINATED</div>
            <div style={{fontSize:13,color:'#9CA3AF',marginTop:6}}>Your pool run has ended.</div>
          </div>
        )}
      </div>
    </div>
  )
}
