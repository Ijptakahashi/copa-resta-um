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
import Navbar from './components/Navbar'
import InstallButton from './components/InstallButton'
import './index.css'

function ProfileById({ player }) {
  const { id } = useParams()
  return <Profile player={player} viewPlayerId={id}/>
}

export default function App() {
  const [player, setPlayer] = useState(() => {
    try { return JSON.parse(localStorage.getItem('copa_player')) } catch { return null }
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
          <Route path="*"            element={<Navigate to="/dashboard" replace/>}/>
        </Routes>
      </main>
    </BrowserRouter>
  )
}
