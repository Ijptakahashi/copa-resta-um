import { NavLink, useNavigate } from 'react-router-dom'

const NAV = [
  { to: '/pick',      icon: '🎯', label: 'Picks'    },
  { to: '/calendar',  icon: '📅', label: 'Fixtures' },
  { to: '/rankings',  icon: '🏅', label: 'Ranking'  },
  { to: '/profile',   icon: '👤', label: 'Perfil'   },
]

export default function Navbar({ player, onLogout }) {
  const navigate = useNavigate()
  function handleLogout() { localStorage.removeItem('copa_player'); onLogout(); navigate('/') }

  return (
    <>
      <header className="topbar">
        <div className="topbar-brand">
          <span style={{fontSize:22}}>🏆</span>
          <div className="topbar-logo">World Cup 2026<span>Survivor Pool</span></div>
        </div>
        <div className="topbar-right">
          <div className="topbar-avatar-wrap">
            <span className="topbar-avatar">{player?.avatar || '⚽'}</span>
            <span className="topbar-name">{player?.name}</span>
          </div>
          <button className="topbar-logout" onClick={handleLogout}>Sair</button>
        </div>
      </header>

      <nav className="bottom-nav">
        {NAV.map(n => (
          <NavLink key={n.to} to={n.to} className={({isActive}) => isActive ? 'active' : ''}>
            <span className="nav-icon">{n.icon}</span>
            {n.label}
            <span className="nav-dot" />
          </NavLink>
        ))}
      </nav>
    </>
  )
}
