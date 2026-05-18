import { NavLink, useNavigate } from 'react-router-dom'

export default function Navbar({ player, onLogout }) {
  const navigate = useNavigate()
  function handleLogout() {
    localStorage.removeItem('copa_player')
    onLogout()
    navigate('/')
  }
  return (
    <>
      <nav className="navbar">
        <span className="navbar-brand">🏆 Copa Resta Um</span>
        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
          <span style={{fontSize:'20px'}}>{player?.avatar||'⚽'}</span>
          <span className="navbar-player">{player?.name}</span>
          <button className="navbar-logout" onClick={handleLogout}>Sair</button>
        </div>
      </nav>
      <nav className="bottom-nav">
        <NavLink to="/dashboard"  className={({isActive})=>isActive?'active':''}><span className="icon">🏠</span>Início</NavLink>
        <NavLink to="/pick"       className={({isActive})=>isActive?'active':''}><span className="icon">⚽</span>Pick</NavLink>
        <NavLink to="/calendar"   className={({isActive})=>isActive?'active':''}><span className="icon">📅</span>Jogos</NavLink>
        <NavLink to="/rankings"   className={({isActive})=>isActive?'active':''}><span className="icon">📊</span>Ranking</NavLink>
        <NavLink to="/all-picks"  className={({isActive})=>isActive?'active':''}><span className="icon">👀</span>Picks</NavLink>
        <NavLink to="/inventory"  className={({isActive})=>isActive?'active':''}><span className="icon">🗂️</span>Inventário</NavLink>
        <NavLink to="/chat"       className={({isActive})=>isActive?'active':''}><span className="icon">💬</span>Chat</NavLink>
      </nav>
    </>
  )
}
