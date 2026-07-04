import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Pick from './pages/Pick'
import Calendar from './pages/Calendar'
import Rankings from './pages/Rankings'
import Profile from './pages/Profile'
import Chat from './pages/Chat'
import Admin from './pages/Admin'
import R32Pick from './pages/R32Pick'
import R16Pick from './pages/R16Pick'
import Navbar from './components/Navbar'
import InstallButton from './components/InstallButton'
import './index.css'

function ProfileById({ player }) {
  const { id } = useParams()
  return <Profile player={player} viewPlayerId={id}/>
}

// Aumente este número para deslogar TODOS os usuários no próximo carregamento.
const SESSION_VERSION = '3'

export default function App() {
  const [player, setPlayer] = useState(() => {
    try {
      // Se a versão da sessão mudou, força logout (limpa login antigo)
      if (localStorage.getItem('copa_session_v') !== SESSION_VERSION) {
        localStorage.removeItem('copa_player')
        localStorage.setItem('copa_session_v', SESSION_VERSION)
        return null
      }
      return JSON.parse(localStorage.getItem('copa_player'))
    } catch { return null }
  })
  if (!player) return <Login onLogin={setPlayer}/>
  return (
    <BrowserRouter>
      <Navbar player={player} onLogout={() => setPlayer(null)}/>
      <InstallButton/>
      <main>
        <Routes>
          <Route path="/"            element={<Navigate to="/dashboard" replace/>}/>
          <Route path="/dashboard"   element={<Dashboard player={player}/>}/>
          <Route path="/pick"        element={<Pick player={player}/>}/>
          <Route path="/calendar"    element={<Calendar/>}/>
          <Route path="/rankings"    element={<Rankings player={player}/>}/>
          <Route path="/profile"     element={<Profile player={player}/>}/>
          <Route path="/profile/:id" element={<ProfileById player={player}/>}/>
          <Route path="/chat"        element={<Chat player={player}/>}/>
          <Route path="/admin"       element={<Admin player={player}/>}/>
          <Route path="/r32"         element={<R32Pick player={player}/>}/>
          <Route path="/r16"         element={<R16Pick player={player}/>}/>
          <Route path="*"            element={<Navigate to="/dashboard" replace/>}/>
        </Routes>
      </main>
    </BrowserRouter>
  )
}
