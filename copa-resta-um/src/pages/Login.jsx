import { useState } from 'react'
import { Shield, ChevronRight, User, Lock, Plus, ArrowLeft } from 'lucide-react'
import { getPlayers, loginPlayer, registerPlayer } from '../lib/supabase'
import Avatar from '../components/Avatar'


export default function Login({ onLogin }) {
  const [step, setStep]         = useState('name')
  const [name, setName]         = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
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
        setStep(found.password_hash ? 'login' : 'set-password')
      } else {
        setStep('register')
      }
    } catch { setError('Erro ao verificar. Tente novamente.') }
    finally { setLoading(false) }
  }

  async function handleLogin() {
    setLoading(true); setError('')
    try {
      const p = await loginPlayer(existing.name, password)
      localStorage.setItem('copa_player', JSON.stringify(p))
      onLogin(p)
    } catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }

  async function handleSetPassword() {
    if (password.length < 4) { setError('Mínimo 4 caracteres.'); return }
    if (password !== confirm) { setError('Senhas não conferem.'); return }
    setLoading(true); setError('')
    try {
      const data = new TextEncoder().encode(password)
      const buf  = await crypto.subtle.digest('SHA-256', data)
      const hash = Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('')
      const { supabase } = await import('../lib/supabase')
      await supabase.from('players').update({ password_hash: hash }).eq('id', existing.id)
      const updated = { ...existing }
      localStorage.setItem('copa_player', JSON.stringify(updated))
      onLogin(updated)
    } catch { setError('Erro ao salvar. Tente novamente.') }
    finally { setLoading(false) }
  }

  async function handleRegister() {
    if (password.length < 4) { setError('Mínimo 4 caracteres.'); return }
    if (password !== confirm) { setError('Senhas não conferem.'); return }
    setLoading(true); setError('')
    try {
      const p = await registerPlayer(name.trim(), password, '')
      localStorage.setItem('copa_player', JSON.stringify(p))
      onLogin(p)
    } catch(e) { setError(e.message.includes('unique') ? 'Nome já existe.' : 'Erro ao criar conta.') }
    finally { setLoading(false) }
  }

  const back = () => { setStep('name'); setPassword(''); setConfirm(''); setError('') }

  return (
    <div style={{
      minHeight:'100svh', display:'flex', flexDirection:'column',
      background:'linear-gradient(165deg, #071A0E 0%, #0D2B17 40%, #0A2010 100%)',
      position:'relative', overflow:'hidden',
    }}>
      {/* Animations */}
      <style>{`
        @keyframes floatBadge { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes glowPulse  { 0%,100%{opacity:.04} 50%{opacity:.10} }
        @keyframes riseCard   { from{opacity:0;transform:translateY(40px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeDown   { from{opacity:0;transform:translateY(-12px)} to{opacity:1;transform:translateY(0)} }
        .login-badge { animation: floatBadge 3.5s ease-in-out infinite; }
        .login-header { animation: fadeDown .7s cubic-bezier(.22,.61,.36,1) both; }
        .login-card { animation: riseCard .6s cubic-bezier(.22,.61,.36,1) both; }
        .login-glow { animation: glowPulse 4s ease-in-out infinite; }
      `}</style>
      {/* Field lines background */}
      <div style={{
        position:'absolute', inset:0, opacity:.07,
        backgroundImage:`
          repeating-linear-gradient(0deg, transparent, transparent 80px, #fff 80px, #fff 81px),
          repeating-linear-gradient(90deg, transparent, transparent 80px, #fff 80px, #fff 81px)
        `,
      }}/>
      {/* Spotlight glow */}
      <div className="login-glow" style={{
        position:'absolute', top:'-20%', left:'50%', transform:'translateX(-50%)',
        width:'120%', height:'70%', borderRadius:'50%',
        background:'radial-gradient(ellipse, rgba(255,255,255,.04) 0%, transparent 70%)',
      }}/>

      {/* Header */}
      <div className="login-header" style={{position:'relative', textAlign:'center', paddingTop:60, paddingBottom:20}}>
        <div className="login-badge" style={{
          width:64, height:64, borderRadius:'50%',
          background:'linear-gradient(135deg, #D6B36A, #A07C3A)',
          display:'flex', alignItems:'center', justifyContent:'center',
          margin:'0 auto 16px', boxShadow:'0 8px 32px rgba(214,179,106,.3)',
        }}>
          <Shield size={32} color="#fff" strokeWidth={1.5}/>
        </div>
        <div style={{
          fontFamily:'Sora', fontSize:10, fontWeight:700, letterSpacing:'.2em',
          textTransform:'uppercase', color:'rgba(214,179,106,.8)', marginBottom:6,
        }}>World Cup 2026</div>
        <div style={{
          fontFamily:'Sora', fontSize:36, fontWeight:800, color:'#fff',
          lineHeight:1.1, letterSpacing:'-1px',
        }}>SURVIVOR<br/>POOL</div>
      </div>

      {/* Card */}
      <div style={{
        flex:1, display:'flex', alignItems:'flex-end', justifyContent:'center',
        padding:'0 20px 32px', position:'relative',
      }}>
        <div className="login-card" style={{
          width:'100%', maxWidth:400,
          background:'rgba(255,255,255,.97)',
          borderRadius:24, padding:28,
          boxShadow:'0 24px 64px rgba(0,0,0,.4), 0 4px 16px rgba(0,0,0,.2)',
        }}>

          {/* STEP: name */}
          {step === 'name' && <>
            <div style={{fontFamily:'Sora',fontSize:20,fontWeight:800,color:'#0D2B17',marginBottom:4}}>
              Entrar
            </div>
            <div style={{fontSize:13,color:'#6B7280',marginBottom:20}}>
              Qual é o seu apelido no grupo?
            </div>
            <div style={{position:'relative',marginBottom:12}}>
              <User size={16} color="#9CA3AF" style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)'}}/>
              <input
                style={{
                  width:'100%', padding:'13px 14px 13px 40px',
                  border:'1.5px solid #E5E7EB', borderRadius:12, fontSize:15,
                  fontFamily:'Inter', outline:'none', background:'#F9FAFB',
                  transition:'border-color .15s',
                }}
                onFocus={e=>e.target.style.borderColor='#1A4731'}
                onBlur={e=>e.target.style.borderColor='#E5E7EB'}
                placeholder="Seu nome"
                value={name}
                onChange={e=>setName(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&handleName()}
                autoFocus maxLength={24}
              />
            </div>
            {error && <div style={{fontSize:13,color:'#DC2626',marginBottom:8,padding:'8px 12px',background:'#FEF2F2',borderRadius:8}}>{error}</div>}
            <button
              onClick={handleName}
              disabled={loading||!name.trim()}
              style={{
                width:'100%', padding:15, borderRadius:12, border:'none',
                background: name.trim() ? 'linear-gradient(135deg, #1A4731, #2D7A54)' : '#E5E7EB',
                color: name.trim() ? '#fff' : '#9CA3AF',
                fontFamily:'Sora', fontSize:14, fontWeight:700, letterSpacing:'.05em',
                cursor: name.trim() ? 'pointer' : 'not-allowed',
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                transition:'all .15s',
              }}>
              {loading ? 'Verificando...' : 'Continuar'}
              {!loading && <ChevronRight size={18}/>}
            </button>
          </>}

          {/* STEP: login */}
          {step === 'login' && <>
            <button onClick={back} style={{background:'none',border:'none',display:'flex',alignItems:'center',gap:6,color:'#6B7280',fontSize:13,marginBottom:16,cursor:'pointer'}}>
              <ArrowLeft size={14}/> Voltar
            </button>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
              <Avatar name={existing?.name} photoUrl={existing?.avatar_url} size={48}/>
              <div>
                <div style={{fontFamily:'Sora',fontSize:18,fontWeight:800,color:'#0D2B17'}}>{existing?.name}</div>
                <div style={{fontSize:12,color:'#6B7280'}}>Bem-vindo de volta!</div>
              </div>
            </div>
            <div style={{position:'relative',marginBottom:12}}>
              <Lock size={16} color="#9CA3AF" style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)'}}/>
              <input type="password"
                style={{width:'100%',padding:'13px 14px 13px 40px',border:'1.5px solid #E5E7EB',borderRadius:12,fontSize:15,fontFamily:'Inter',outline:'none',background:'#F9FAFB'}}
                onFocus={e=>e.target.style.borderColor='#1A4731'}
                onBlur={e=>e.target.style.borderColor='#E5E7EB'}
                placeholder="Senha" value={password} onChange={e=>setPassword(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&handleLogin()} autoFocus/>
            </div>
            {error && <div style={{fontSize:13,color:'#DC2626',marginBottom:8,padding:'8px 12px',background:'#FEF2F2',borderRadius:8}}>{error}</div>}
            <button onClick={handleLogin} disabled={loading||!password}
              style={{width:'100%',padding:15,borderRadius:12,border:'none',background:'linear-gradient(135deg, #1A4731, #2D7A54)',color:'#fff',fontFamily:'Sora',fontSize:14,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
              {loading ? 'Entrando...' : 'Entrar'}{!loading&&<ChevronRight size={18}/>}
            </button>
          </>}

          {/* STEP: set-password or register */}
          {(step==='set-password'||step==='register') && <>
            <button onClick={back} style={{background:'none',border:'none',display:'flex',alignItems:'center',gap:6,color:'#6B7280',fontSize:13,marginBottom:16,cursor:'pointer'}}>
              <ArrowLeft size={14}/> Voltar
            </button>
            <div style={{fontFamily:'Sora',fontSize:18,fontWeight:800,color:'#0D2B17',marginBottom:4}}>
              {step==='register' ? `Criar conta — ${name}` : `Olá, ${existing?.name}!`}
            </div>
            <div style={{fontSize:13,color:'#6B7280',marginBottom:16}}>Crie uma senha. Você pode adicionar uma foto depois no seu perfil.</div>
            {/* Avatar preview com iniciais do nome */}
            <div style={{display:'flex',justifyContent:'center',marginBottom:18}}>
              <Avatar name={step==='register'?name:existing?.name} size={72} ring="#C9A44A"/>
            </div>
            <div style={{position:'relative',marginBottom:8}}>
              <Lock size={16} color="#9CA3AF" style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)'}}/>
              <input type="password"
                style={{width:'100%',padding:'13px 14px 13px 40px',border:'1.5px solid #E5E7EB',borderRadius:12,fontSize:15,fontFamily:'Inter',outline:'none',background:'#F9FAFB'}}
                onFocus={e=>e.target.style.borderColor='#1A4731'}
                onBlur={e=>e.target.style.borderColor='#E5E7EB'}
                placeholder="Senha (mín. 4 caracteres)"
                value={password} onChange={e=>setPassword(e.target.value)} autoFocus/>
            </div>
            <div style={{position:'relative',marginBottom:12}}>
              <Lock size={16} color="#9CA3AF" style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)'}}/>
              <input type="password"
                style={{width:'100%',padding:'13px 14px 13px 40px',border:'1.5px solid #E5E7EB',borderRadius:12,fontSize:15,fontFamily:'Inter',outline:'none',background:'#F9FAFB'}}
                onFocus={e=>e.target.style.borderColor='#1A4731'}
                onBlur={e=>e.target.style.borderColor='#E5E7EB'}
                placeholder="Confirmar senha"
                value={confirm} onChange={e=>setConfirm(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&(step==='register'?handleRegister():handleSetPassword())}/>
            </div>
            {error && <div style={{fontSize:13,color:'#DC2626',marginBottom:8,padding:'8px 12px',background:'#FEF2F2',borderRadius:8}}>{error}</div>}
            <button
              onClick={step==='register'?handleRegister:handleSetPassword}
              disabled={loading||!password||!confirm}
              style={{width:'100%',padding:15,borderRadius:12,border:'none',background:'linear-gradient(135deg, #D6B36A, #B8952A)',color:'#fff',fontFamily:'Sora',fontSize:14,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
              {loading ? 'Criando...' : step==='register' ? 'Criar conta e entrar' : 'Salvar senha e entrar'}
              {!loading&&<ChevronRight size={18}/>}
            </button>
          </>}

        </div>
      </div>
    </div>
  )
}
