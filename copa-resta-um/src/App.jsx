import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Pick from './pages/Pick'
import Calendar from './pages/Calendar'
import Chat from './pages/Chat'
import { Rankings, AllPicks, Inventory } from './pages/OtherPages'
import Navbar from './components/Navbar'
import './index.css'

export default function App() {
  const [player, setPlayer] = useState(() => {
    try { return JSON.parse(localStorage.getItem('copa_player')) } catch { return null }
  })

  if (!player) return <Login onLogin={setPlayer} />

  return (
    <BrowserRouter>
      <Navbar player={player} onLogout={() => setPlayer(null)} />
      <main>
        <Routes>
          <Route path="/"           element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"  element={<Dashboard player={player} />} />
          <Route path="/pick"       element={<Pick player={player} />} />
          <Route path="/calendar"   element={<Calendar />} />
          <Route path="/rankings"   element={<Rankings player={player} />} />
          <Route path="/all-picks"  element={<AllPicks player={player} />} />
          <Route path="/inventory"  element={<Inventory player={player} />} />
          <Route path="/chat"       element={<Chat player={player} />} />
          <Route path="*"           element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
