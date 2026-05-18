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

    const channel = subscribeToMessages(payload => {
      setMessages(prev => [...prev, payload.new])
    })

    return () => { channel.unsubscribe() }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    const content = text.trim()
    if (!content || sending) return
    setSending(true)
    setText('')
    try {
      await sendMessage(player.id, player.name, player.avatar || '⚽', content)
    } catch { setText(content) }
    finally { setSending(false) }
  }

  function formatTime(ts) {
    return new Date(ts).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})
  }

  function formatDate(ts) {
    return new Date(ts).toLocaleDateString('pt-BR',{day:'numeric',month:'short'})
  }

  // Group messages by date
  let lastDate = ''

  if (loading) return <div className="loading">💬 Carregando...</div>

  return (
    <div style={{display:'flex',flexDirection:'column',height:'calc(100vh - 56px - 56px)',maxWidth:'480px',margin:'0 auto'}}>
      {/* Header */}
      <div style={{padding:'12px 16px',background:'var(--white)',borderBottom:'1px solid var(--gray-mid)',
        display:'flex',alignItems:'center',gap:'8px'}}>
        <span style={{fontSize:'20px'}}>💬</span>
        <div>
          <div style={{fontWeight:700,fontSize:'15px'}}>Chat do Grupo</div>
          <div style={{fontSize:'11px',color:'var(--gray-dark)'}}>Copa Resta Um dos Idiotas 2026</div>
        </div>
      </div>

      {/* Messages */}
      <div style={{flex:1,overflowY:'auto',padding:'12px 16px',display:'flex',flexDirection:'column',gap:'8px'}}>
        {messages.length === 0 && (
          <div style={{textAlign:'center',padding:'40px',color:'var(--gray-dark)'}}>
            <div style={{fontSize:'40px',marginBottom:'8px'}}>💬</div>
            <div>Sem mensagens ainda. Seja o primeiro!</div>
          </div>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.player_id === player.id
          const msgDate = new Date(msg.created_at).toLocaleDateString('pt-BR')
          const showDate = msgDate !== lastDate
          lastDate = msgDate

          return (
            <div key={msg.id}>
              {showDate && (
                <div style={{textAlign:'center',margin:'8px 0'}}>
                  <span style={{fontSize:'11px',color:'var(--gray-dark)',background:'var(--gray)',
                    padding:'2px 10px',borderRadius:'12px'}}>{formatDate(msg.created_at)}</span>
                </div>
              )}
              <div style={{display:'flex',flexDirection:isMe?'row-reverse':'row',
                gap:'8px',alignItems:'flex-end'}}>
                {/* Avatar */}
                <div style={{fontSize:'22px',flexShrink:0}}>{msg.player_avatar||'⚽'}</div>
                <div style={{maxWidth:'75%'}}>
                  {!isMe && <div style={{fontSize:'11px',color:'var(--gray-dark)',marginBottom:'2px',marginLeft:'4px'}}>{msg.player_name}</div>}
                  <div style={{padding:'10px 14px',borderRadius:isMe?'18px 18px 4px 18px':'18px 18px 18px 4px',
                    background:isMe?'var(--green-dark)':'var(--white)',
                    color:isMe?'var(--white)':'var(--text)',
                    boxShadow:'var(--shadow)',fontSize:'14px',lineHeight:1.4}}>
                    {msg.content}
                  </div>
                  <div style={{fontSize:'10px',color:'var(--gray-dark)',marginTop:'2px',
                    textAlign:isMe?'right':'left',paddingLeft:'4px',paddingRight:'4px'}}>
                    {formatTime(msg.created_at)}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef}/>
      </div>

      {/* Input */}
      <div style={{padding:'12px 16px',background:'var(--white)',borderTop:'1px solid var(--gray-mid)',
        display:'flex',gap:'8px',alignItems:'center'}}>
        <span style={{fontSize:'22px'}}>{player.avatar||'⚽'}</span>
        <input
          style={{flex:1,padding:'10px 14px',border:'2px solid var(--gray-mid)',borderRadius:'24px',
            fontSize:'14px',outline:'none',transition:'border-color 0.15s'}}
          placeholder="Mensagem..."
          value={text}
          onChange={e=>setText(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&handleSend()}
          onFocus={e=>e.target.style.borderColor='var(--green-mid)'}
          onBlur={e=>e.target.style.borderColor='var(--gray-mid)'}
          maxLength={500}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim()||sending}
          style={{width:'40px',height:'40px',borderRadius:'50%',border:'none',
            background:text.trim()?'var(--green-dark)':'var(--gray-mid)',
            color:'white',fontSize:'18px',cursor:text.trim()?'pointer':'default',
            display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,
            transition:'background 0.15s'}}>
          {sending ? '⏳' : '➤'}
        </button>
      </div>
    </div>
  )
}
