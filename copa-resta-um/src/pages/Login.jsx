import { useState } from 'react'
import { getPlayers, loginPlayer, registerPlayer } from '../lib/supabase'

const AVATARS = ['⚽','🏆','🥅','👑','🦁','🐺','🦅','🐯','🦊','🐻',
                 '🦈','🔥','⚡','🌟','💪','😎','🥶','🤡','💀','🎯',
                 '🚀','🧠','🎭','🤙','🐲','🦄','🧨','🎪']

export default function Login({ onLogin }) {
  const [step, setStep]         = useState('name')   // name | password | register
  const [name, setName]         = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [avatar, setAvatar]     = useState('⚽')
  const [existing, setExisting] = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleName() {
    if (!name.trim()) return
    setLoading(true); setError('')
    try {
      const players = await getPlayers()
      const found = players.find(p => p.name.toLowerCase() === name.trim().toLowerCase())
      if (found) {
        setExisting(found)
        setStep(found.password_hash ? 'password' : 'set-password')
      } else {
        setStep('register')
      }
    } catch { setError('Erro ao verificar nome.') }
    finally { setLoading(false) }
  }

  async function handleLogin() {
    setLoading(true); setError('')
    try {
      const player = await loginPlayer(existing.name, password)
      localStorage.setItem('copa_player', JSON.stringify(player))
      onLogin(player)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  async function handleSetPassword() {
    if (password !== confirm) { setError('Senhas não conferem.'); return }
    if (password.length < 4)  { setError('Senha muito curta (mínimo 4 caracteres).'); return }
    setLoading(true); setError('')
    try {
      // First login ever — save password
      const { supabase } = await import('../lib/supabase')
      const { hashPassword } = await import('../lib/supabase')
      // Use registerPlayer logic manually
      const { updatePlayerAvatar } = await import('../lib/supabase')
      const { loginPlayer: lp } = await import('../lib/supabase')

      // Hash and save
      const data = new TextEncoder().encode(password)
      const buf = await crypto.subtle.digest('SHA-256', data)
      const hash = Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('')
      const { supabase: sb } = await import('../lib/supabase')
      await sb.from('players').update({ password_hash: hash, avatar }).eq('id', existing.id)
      const updated = { ...existing, avatar }
      localStorage.setItem('copa_player', JSON.stringify(updated))
      onLogin(updated)
    } catch { setError('Erro ao salvar senha.') }
    finally { setLoading(false) }
  }

  async function handleRegister() {
    if (password !== confirm) { setError('Senhas não conferem.'); return }
    if (password.length < 4)  { setError('Senha muito curta (mínimo 4 caracteres).'); return }
    setLoading(true); setError('')
    try {
      const player = await registerPlayer(name.trim(), password, avatar)
      localStorage.setItem('copa_player', JSON.stringify(player))
      onLogin(player)
    } catch (e) { setError(e.message.includes('unique') ? 'Esse nome já existe!' : 'Erro ao criar conta.') }
    finally { setLoading(false) }
  }

  return (
    <div className="login-page">
      <div className="login-logo">🏆</div>
      <div className="login-title">Copa Resta Um</div>
      <div className="login-sub">dos Idiotas 2026</div>

      <div className="login-card">

        {/* STEP: name */}
        {step === 'name' && (
          <>
            <h2>Qual é o seu nome?</h2>
            <input className="new-player-input" placeholder="Seu apelido" value={name}
              onChange={e => setName(e.target.value)} onKeyDown={e => e.key==='Enter'&&handleName()}
              autoFocus maxLength={24} style={{marginTop:'8px'}}/>
            {error && <div className="error-box" style={{marginTop:'8px'}}>{error}</div>}
            <button className="btn-gold" style={{marginTop:'12px'}} onClick={handleName} disabled={loading||!name.trim()}>
              {loading ? '⏳' : 'Continuar →'}
            </button>
          </>
        )}

        {/* STEP: existing player — enter password */}
        {step === 'password' && (
          <>
            <div style={{textAlign:'center',marginBottom:'16px'}}>
              <div style={{fontSize:'36px'}}>{existing?.avatar||'⚽'}</div>
              <div style={{fontWeight:700,fontSize:'18px'}}>{existing?.name}</div>
              <div style={{fontSize:'12px',color:'var(--gray-dark)'}}>Bem-vindo de volta!</div>
            </div>
            <input className="new-player-input" type="password" placeholder="Sua senha"
              value={password} onChange={e=>setPassword(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&handleLogin()} autoFocus/>
            {error && <div className="error-box" style={{marginTop:'8px'}}>{error}</div>}
            <button className="btn-gold" style={{marginTop:'12px'}} onClick={handleLogin} disabled={loading||!password}>
              {loading ? '⏳' : '🔓 Entrar'}
            </button>
            <button className="btn-secondary" onClick={()=>{setStep('name');setPassword('');setError('')}}>← Voltar</button>
          </>
        )}

        {/* STEP: set password for first time (existing player without password) */}
        {step === 'set-password' && (
          <>
            <h2>Crie sua senha</h2>
            <div style={{fontSize:'13px',color:'var(--gray-dark)',marginBottom:'12px'}}>
              Primeira vez entrando como <strong>{existing?.name}</strong>. Escolha um avatar e crie sua senha.
            </div>
            <div className="card-header" style={{marginBottom:'8px'}}>Escolha seu avatar</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'4px',marginBottom:'12px'}}>
              {AVATARS.map(a=>(
                <button key={a} onClick={()=>setAvatar(a)}
                  style={{fontSize:'22px',padding:'6px',border:`2px solid ${avatar===a?'var(--gold)':'transparent'}`,
                  borderRadius:'8px',background:avatar===a?'var(--gold-light)':'transparent',cursor:'pointer'}}>
                  {a}
                </button>
              ))}
            </div>
            <input className="new-player-input" type="password" placeholder="Senha (mín. 4 caracteres)"
              value={password} onChange={e=>setPassword(e.target.value)} autoFocus/>
            <input className="new-player-input" type="password" placeholder="Confirmar senha"
              value={confirm} onChange={e=>setConfirm(e.target.value)} style={{marginTop:'8px'}}
              onKeyDown={e=>e.key==='Enter'&&handleSetPassword()}/>
            {error && <div className="error-box" style={{marginTop:'8px'}}>{error}</div>}
            <button className="btn-gold" style={{marginTop:'12px'}} onClick={handleSetPassword} disabled={loading||!password}>
              {loading ? '⏳' : '✅ Criar senha e entrar'}
            </button>
            <button className="btn-secondary" onClick={()=>{setStep('name');setPassword('');setConfirm('');setError('')}}>← Voltar</button>
          </>
        )}

        {/* STEP: new player — register */}
        {step === 'register' && (
          <>
            <h2>Criar conta — {name}</h2>
            <div className="card-header" style={{marginBottom:'8px'}}>Escolha seu avatar</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'4px',marginBottom:'12px'}}>
              {AVATARS.map(a=>(
                <button key={a} onClick={()=>setAvatar(a)}
                  style={{fontSize:'22px',padding:'6px',border:`2px solid ${avatar===a?'var(--gold)':'transparent'}`,
                  borderRadius:'8px',background:avatar===a?'var(--gold-light)':'transparent',cursor:'pointer'}}>
                  {a}
                </button>
              ))}
            </div>
            <input className="new-player-input" type="password" placeholder="Crie uma senha (mín. 4 caracteres)"
              value={password} onChange={e=>setPassword(e.target.value)} autoFocus/>
            <input className="new-player-input" type="password" placeholder="Confirmar senha"
              value={confirm} onChange={e=>setConfirm(e.target.value)} style={{marginTop:'8px'}}
              onKeyDown={e=>e.key==='Enter'&&handleRegister()}/>
            {error && <div className="error-box" style={{marginTop:'8px'}}>{error}</div>}
            <button className="btn-gold" style={{marginTop:'12px'}} onClick={handleRegister} disabled={loading||!password}>
              {loading ? '⏳' : '🎮 Criar conta e entrar'}
            </button>
            <button className="btn-secondary" onClick={()=>{setStep('name');setPassword('');setConfirm('');setError('')}}>← Voltar</button>
          </>
        )}
      </div>
    </div>
  )
}
