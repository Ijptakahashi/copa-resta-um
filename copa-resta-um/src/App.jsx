// src/App.jsx
import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Pick from './pages/Pick'
import { Rankings, AllPicks, Inventory } from './pages/OtherPages'
import Navbar from './components/Navbar'
import './index.css'

function ProtectedLayout({ player, onLogout, children }) {
  return (
    <>
      <Navbar player={player} onLogout={onLogout} />
      <main style={{ paddingTop: 0 }}>{children}</main>
    </>
  )
}

export default function App() {
  const [player, setPlayer] = useState(() => {
    try { return JSON.parse(localStorage.getItem('copa_player')) } catch { return null }
  })

  function handleLogin(p)  { setPlayer(p) }
  function handleLogout()  { setPlayer(null) }

  if (!player) return <Login onLogin={handleLogin} />

  return (
    <BrowserRouter>
      <ProtectedLayout player={player} onLogout={handleLogout}>
        <Routes>
          <Route path="/"           element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"  element={<Dashboard player={player} />} />
          <Route path="/pick"       element={<Pick player={player} />} />
          <Route path="/rankings"   element={<Rankings player={player} />} />
          <Route path="/all-picks"  element={<AllPicks player={player} />} />
          <Route path="/inventory"  element={<Inventory player={player} />} />
          <Route path="*"           element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </ProtectedLayout>
    </BrowserRouter>
  )
}
