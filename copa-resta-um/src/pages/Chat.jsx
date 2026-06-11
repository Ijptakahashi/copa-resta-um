import { useState, useEffect, useRef } from 'react'
import { Send, Paperclip } from 'lucide-react'
import { getMessages, sendMessage, subscribeToMessages, getPlayers } from '../lib/supabase'
import { countryCode } from '../components/FlagImage'
import Avatar from '../components/Avatar'
import { ChatSkeleton } from '../components/Skeletons'

export default function Chat({ player }) {
  const [msgs, setMsgs]       = useState([])
  const [text, setText]       = useState('')
  const [loading, setLoad]    = useState(true)
  const [sending, setSend]    = useState(false)
  const [online, setOnline]   = useState(0)
  const [playerMap, setMap]   = useState({})
  const bottomRef             = useRef(null)

  useEffect(() => {
    Promise.all([getMessages(), getPlayers()]).then(([msgs, players]) => {
      setMsgs(msgs)
      const map = {}
      players.forEach(p => map[p.id] = p)
      setMap(map)
      setOnline(players.length)
      setLoad(false)
    })
    const ch = subscribeToMessages(p => setMsgs(prev => [...prev, p.new]))
    return () => ch.unsubscribe()
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [msgs])

  async function handleSend() {
    const content = text.trim()
    if (!content || sending) return
    setSend(true); setText('')
    try { await sendMessage(player.id, player.name, player.avatar||'', content) }
    catch { setText(content) } finally { setSend(false) }
  }

  function fmtTime(ts) {
    return new Date(ts).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })
  }

  function MsgAvatar({ msg, size=36 }) {
    const p = playerMap[msg.player_id]
    return <Avatar name={msg.player_name} photoUrl={p?.avatar_url} size={size}/>
  }

  let lastDate = ''

  return (
    <div style={{display:'flex',flexDirection:'column',
      height:'calc(100svh - 54px - 56px)',maxWidth:430,margin:'0 auto',background:'#F8F4EE'}}>

      {/* Header */}
      <div style={{background:'#fff',padding:'12px 16px',
        borderBottom:'1px solid rgba(0,0,0,.07)',textAlign:'center',
        boxShadow:'0 1px 6px rgba(0,0,0,.04)'}}>
        <div style={{fontFamily:'Sora',fontWeight:800,fontSize:18,color:'#1A3D28',letterSpacing:'-.3px'}}>
          GROUP CHAT
        </div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:5,
          fontSize:12,color:'#1A3D28',fontFamily:'Inter',fontWeight:500,marginTop:2}}>
          <div style={{width:8,height:8,borderRadius:'50%',background:'#22C55E'}}/>
          {online} online
        </div>
      </div>

      {/* Messages */}
      {loading ? (
        <ChatSkeleton/>
      ) : (
        <div style={{flex:1,overflowY:'auto',padding:'16px',display:'flex',
          flexDirection:'column',gap:14}}>
          {msgs.length === 0 && (
            <div style={{textAlign:'center',color:'#9CA3AF',fontSize:13,
              fontFamily:'Inter',paddingTop:40}}>
              Seja o primeiro a enviar uma mensagem!
            </div>
          )}
          {msgs.map((msg, idx) => {
            const isMe = msg.player_id === player.id
            const msgDate = new Date(msg.created_at).toLocaleDateString('pt-BR')
            const showDate = msgDate !== lastDate
            lastDate = msgDate
            const todayStr = new Date().toLocaleDateString('pt-BR')
            return (
              <div key={msg.id}>
                {showDate && (
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10,marginTop:4}}>
                    <div style={{flex:1,height:1,background:'rgba(0,0,0,.07)'}}/>
                    <span style={{fontFamily:'Sora',fontWeight:600,fontSize:10,
                      color:'#9CA3AF',letterSpacing:'.1em',textTransform:'uppercase'}}>
                      {msgDate === todayStr ? 'TODAY' : msgDate}
                    </span>
                    <div style={{flex:1,height:1,background:'rgba(0,0,0,.07)'}}/>
                  </div>
                )}
                <div style={{display:'flex',
                  flexDirection:isMe?'row-reverse':'row',
                  gap:10,alignItems:'flex-end'}}>
                  {!isMe && <MsgAvatar msg={msg} size={36}/>}
                  <div style={{maxWidth:'72%'}}>
                    {!isMe && (
                      <div style={{fontFamily:'Sora',fontWeight:700,fontSize:11,
                        color:'#1A1A1A',marginBottom:4,marginLeft:2}}>
                        {msg.player_name}
                      </div>
                    )}
                    <div style={{
                      padding:'11px 14px',
                      borderRadius:isMe?'18px 18px 4px 18px':'18px 18px 18px 4px',
                      background:isMe?'#1A3D28':'#fff',
                      color:isMe?'#fff':'#1A1A1A',
                      fontSize:14,lineHeight:1.45,fontFamily:'Inter',
                      boxShadow:isMe?'0 2px 8px rgba(26,61,40,.2)':'0 2px 8px rgba(0,0,0,.06)',
                      border:isMe?'none':'1px solid rgba(0,0,0,.06)',
                    }}>
                      {msg.content}
                    </div>
                    <div style={{fontSize:10,color:'#9CA3AF',marginTop:3,fontFamily:'Inter',
                      textAlign:isMe?'right':'left',paddingLeft:2,paddingRight:2,
                      display:'flex',alignItems:'center',
                      justifyContent:isMe?'flex-end':'flex-start',gap:3}}>
                      {fmtTime(msg.created_at)}
                      {isMe && <span style={{fontSize:10,color:'#9CA3AF'}}>✓✓</span>}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef}/>
        </div>
      )}

      {/* Input */}
      <div style={{background:'#fff',padding:'10px 12px',
        borderTop:'1px solid rgba(0,0,0,.07)',
        display:'flex',alignItems:'center',gap:10,
        boxShadow:'0 -2px 12px rgba(0,0,0,.04)'}}>
        <button style={{width:36,height:36,borderRadius:'50%',display:'flex',
          alignItems:'center',justifyContent:'center',flexShrink:0,color:'#9CA3AF'}}>
          <Paperclip size={18}/>
        </button>
        <div style={{flex:1,background:'#F8F4EE',borderRadius:24,
          border:'1px solid rgba(0,0,0,.07)',padding:'10px 16px'}}>
          <input
            style={{width:'100%',border:'none',background:'transparent',outline:'none',
              fontSize:16,fontFamily:'Inter',color:'#1A1A1A'}}
            placeholder="Mensagem..."
            value={text}
            onChange={e=>setText(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&handleSend()}
            maxLength={500}
          />
        </div>
        <button onClick={handleSend} disabled={!text.trim()||sending}
          style={{width:42,height:42,borderRadius:'50%',flexShrink:0,
            background:text.trim()?'linear-gradient(135deg,#1A3D28,#1E5235)':'#E8E3DB',
            display:'flex',alignItems:'center',justifyContent:'center',
            transition:'all .15s',cursor:text.trim()?'pointer':'not-allowed',
            boxShadow:text.trim()?'0 2px 8px rgba(26,61,40,.3)':'none',border:'none'}}>
          <Send size={16} color={text.trim()?'#fff':'#B0A898'}/>
        </button>
      </div>
    </div>
  )
}
