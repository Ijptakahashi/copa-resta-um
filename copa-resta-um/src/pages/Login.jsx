// src/pages/Login.jsx
import { useState, useEffect } from 'react'
import { getPlayers, addPlayer } from '../lib/supabase'

export default function Login({ onLogin }) {
  const [players, setPlayers]     = useState([])
  const [selected, setSelected]   = useState(null)
  const [newName, setNewName]     = useState('')
  const [loading, setLoading]     = useState(true)
  const [adding, setAdding]       = useState(false)
  const [error, setError]         = useState('')
  const [showNew, setShowNew]     = useState(false)

  useEffect(() => {
    getPlayers().then(data => { setPlayers(data); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  async function handleAdd() {
    const name = newName.trim()
    if (!name) return
    setAdding(true); setError('')
    try {
      const p = await addPlayer(name)
      setPlayers(prev => [...prev, p].sort((a, b) => a.name.localeCompare(b.name)))
      setSelected(p)
      setNewName(''); setShowNew(false)
    } catch (e) {
      setError(e.message.includes('unique') ? 'Esse nome já existe!' : 'Erro ao cadastrar.')
    } finally { setAdding(false) }
  }

  function handleLogin() {
    if (!selected) return
    localStorage.setItem('copa_player', JSON.stringify(selected))
    onLogin(selected)
  }

  return (
    <div className="login-page">
      <div className="login-logo">🏆</div>
      <div className="login-title">Copa Resta Um</div>
      <div className="login-sub">dos Idiotas 2026</div>

      <div className="login-card">
        <h2>Quem é você?</h2>

        {loading ? (
          <div className="text-muted text-center" style={{padding:'20px'}}>Carregando...</div>
        ) : (
          <div className="player-grid">
            {players.map(p => (
              <button key={p.id} className={`player-btn ${selected?.id === p.id ? 'selected' : ''}`}
                onClick={() => setSelected(p)}>
                {p.name}
              </button>
            ))}
          </div>
        )}

        {!showNew ? (
          <button className="btn-secondary" onClick={() => setShowNew(true)} style={{marginTop:'8px'}}>
            + Sou novo aqui
          </button>
        ) : (
          <div style={{marginTop:'8px'}}>
            <input className="new-player-input" placeholder="Seu nome"
              value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()} autoFocus maxLength={24} />
            <div style={{display:'flex',gap:'8px',marginTop:'8px'}}>
              <button className="btn-secondary" style={{flex:1}} onClick={() => setShowNew(false)}>Cancelar</button>
              <button className="btn-primary" style={{flex:1,marginTop:0}} onClick={handleAdd} disabled={adding || !newName.trim()}>
                {adding ? '...' : 'Cadastrar'}
              </button>
            </div>
          </div>
        )}

        {error && <div className="error-box" style={{marginTop:'8px'}}>{error}</div>}

        <div className="divider" />

        <button className="btn-gold" onClick={handleLogin} disabled={!selected}>
          {selected ? `Entrar como ${selected.name}` : 'Selecione seu nome'}
        </button>
      </div>
    </div>
  )
}
