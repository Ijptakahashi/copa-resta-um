import { useState, useEffect, useRef } from 'react'
import { getMessages, sendMessage, subscribeToMessages } from '../lib/supabase'

export default function Chat({ player }) {
  const [messages, setMessages] = useState([])
  const [text, setText]         = useState('')
  const [loading, setLoading]   = useState(true)
  const [sending, setSending]   = useState(false)
  const bottomRef               = useRef(null)

  useEffect(() => {
    getMessages().then(msgs => { setMessages(msgs); setLoading(false) })
    const ch = subscribeToMessages(p => setMessages(prev => [...prev, p.new]))
    return () => ch.unsubscribe()
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function handleSend() {
    const content = text.trim()
    if (!content || sending) return
    setSending(true); setText('')
    try { await sendMessage(player.id, player.name, player.avatar||'⚽', content) }
    catch { setText(content) } finally { setSending(false) }
  }

  function formatTime(ts) {
    return new Date(ts).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})
  }

  if (loading) return <div className="loading">💬 Carregando...</div>

  return (
    <div style={{display:'flex',flexDirection:'column',height:'calc(100svh - 56px - 56px)',maxWidth:480,margin:'0 auto'}}>
      {/* Header */}
      <div style={{padding:'12px 16px',background:'var(--bg-card)',
        borderBottom:'1px solid var(--n200)',display:'flex',alignItems:'center',gap:10}}>
        <div style={{width:36,height:36,borderRadius:'50%',background:'var(--g100)',
          display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>💬</div>
        <div>
          <div style={{fontFamily:'Sora',fontWeight:700,fontSize:14}}>Chat do Grupo</div>
          <div style={{fontSize:11,color:'var(--n400)'}}>Copa Resta Um 2026</div>
        </div>
      </div>

      {/* Messages */}
      <div style={{flex:1,overflowY:'auto',padding:'16px',display:'flex',
        flexDirection:'column',gap:10,background:'var(--bg)'}}>
        {messages.length===0 && (
          <div className="empty" style={{marginTop:60}}>
            <div style={{fontSize:40,marginBottom:8}}>💬</div>
            Seja o primeiro a mandar uma mensagem!
          </div>
        )}
        {messages.map(msg => {
          const isMe = msg.player_id === player.id
          return (
            <div key={msg.id} style={{display:'flex',flexDirection:isMe?'row-reverse':'row',gap:8,alignItems:'flex-end'}}>
              <span style={{fontSize:22,flexShrink:0}}>{msg.player_avatar||'⚽'}</span>
              <div style={{maxWidth:'75%'}}>
                {!isMe && <div style={{fontFamily:'Sora',fontSize:10,fontWeight:700,color:'var(--n400)',
                  marginBottom:3,marginLeft:4,letterSpacing:'.04em',textTransform:'uppercase'}}>
                  {msg.player_name}
                </div>}
                <div style={{padding:'10px 14px',borderRadius:isMe?'18px 18px 4px 18px':'18px 18px 18px 4px',
                  background:isMe?'var(--g800)':'var(--bg-card)',
                  color:isMe?'white':'var(--n900)',
                  boxShadow:'var(--shadow-sm)',fontSize:14,lineHeight:1.45}}>
                  {msg.content}
                </div>
                <div style={{fontSize:10,color:'var(--n400)',marginTop:3,
                  textAlign:isMe?'right':'left',paddingLeft:4,paddingRight:4}}>
                  {formatTime(msg.created_at)}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef}/>
      </div>

      {/* Input */}
      <div style={{padding:'12px 16px',background:'var(--bg-card)',
        borderTop:'1px solid var(--n200)',display:'flex',gap:8,alignItems:'center'}}>
        <span style={{fontSize:24}}>{player.avatar||'⚽'}</span>
        <input
          className="input"
          style={{flex:1,padding:'10px 14px',borderRadius:24,fontSize:14}}
          placeholder="Mensagem..."
          value={text}
          onChange={e=>setText(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&handleSend()}
          maxLength={500}
        />
        <button onClick={handleSend} disabled={!text.trim()||sending}
          style={{width:40,height:40,borderRadius:'50%',display:'flex',alignItems:'center',
            justifyContent:'center',fontSize:16,background:text.trim()?'var(--g800)':'var(--n200)',
            color:'white',flexShrink:0,transition:'background .15s'}}>
          {sending ? '⏳' : '➤'}
        </button>
      </div>
    </div>
  )
}
