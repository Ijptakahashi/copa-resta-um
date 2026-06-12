import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ─── Auth helpers ─────────────────────────────────────────────
async function hashPassword(password) {
  const data = new TextEncoder().encode(password)
  const buf  = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('')
}

export async function getPlayers() {
  const { data, error } = await supabase.from('players').select('*').order('name')
  if (error) throw error
  return data
}

export async function registerPlayer(name, password, avatar) {
  const password_hash = await hashPassword(password)
  const { data, error } = await supabase
    .from('players').insert({ name, password_hash, avatar }).select().single()
  if (error) throw error
  return data
}

export async function loginPlayer(name, password) {
  const { data, error } = await supabase
    .from('players').select('*').eq('name', name).single()
  if (error) throw new Error('Jogador não encontrado.')
  const hash = await hashPassword(password)
  if (data.password_hash && data.password_hash !== hash)
    throw new Error('Senha incorreta.')
  return data
}

export async function changePassword(playerId, currentPassword, newPassword) {
  // Busca o hash atual
  const { data, error } = await supabase
    .from('players').select('password_hash').eq('id', playerId).single()
  if (error) throw error
  // Se já tem senha, valida a atual
  if (data.password_hash) {
    const curHash = await hashPassword(currentPassword)
    if (data.password_hash !== curHash) {
      throw new Error('Senha atual incorreta')
    }
  }
  const newHash = await hashPassword(newPassword)
  const { error: upErr } = await supabase
    .from('players').update({ password_hash: newHash }).eq('id', playerId)
  if (upErr) throw upErr
}

export async function updatePlayerAvatar(playerId, avatar) {
  const { error } = await supabase.from('players').update({ avatar }).eq('id', playerId)
  if (error) throw error
}

export async function addPlayer(name) {
  const { data, error } = await supabase.from('players').insert({ name }).select().single()
  if (error) throw error
  return data
}

// ─── Matches ──────────────────────────────────────────────────
export async function getMatches() {
  const { data, error } = await supabase.from('matches').select('*').order('utc_date')
  if (error) throw error
  return data
}

export async function upsertMatches(matches) {
  // Busca jogos já finalizados para NÃO sobrescrever resultados existentes
  const { data: existing } = await supabase
    .from('matches').select('id, home_team, away_team, status, home_score, away_score, winner')

  const existingByKey = {}
  ;(existing || []).forEach(m => {
    const k = `${m.home_team}|${m.away_team}`.toLowerCase()
    existingByKey[k] = m
  })

  // Para cada jogo novo, se já existe um FINISHED com placar, preserva o resultado
  const safe = matches.map(m => {
    const k = `${m.home_team}|${m.away_team}`.toLowerCase()
    const prev = existingByKey[k]
    if (prev && prev.status === 'FINISHED' && prev.winner) {
      // mantém o resultado já gravado, só atualiza metadados do fixture
      return { ...m, id: prev.id, status: 'FINISHED',
               home_score: prev.home_score, away_score: prev.away_score, winner: prev.winner }
    }
    if (prev) return { ...m, id: prev.id }   // reaproveita o id estável do banco
    return m
  })

  const { error } = await supabase.from('matches').upsert(safe, { onConflict: 'id' })
  if (error) throw error
}

export async function getTodayMatches(today) {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .gte('utc_date', new Date(today + 'T03:00:00Z').toISOString())
    .lte('utc_date', new Date(today + 'T26:59:59Z').toISOString())
    .order('utc_date')
  if (error) throw error
  return data
}

// ─── Picks ────────────────────────────────────────────────────
export async function getPlayerPicks(playerId) {
  const { data, error } = await supabase
    .from('picks').select('*, match:matches(*)').eq('player_id', playerId).order('pick_date')
  if (error) throw error
  return data
}

export async function getAllPicks(date) {
  let q = supabase.from('picks').select('*, player:players(*), match:matches(*)').order('pick_date', { ascending: false })
  if (date) q = q.eq('pick_date', date)
  const { data, error } = await q
  if (error) throw error
  return data
}

export async function submitPick({ playerId, matchId, teamName, teamId, phase, pickDate, isRepeat }) {
  // Check if pick already exists for this day (allow modification until deadline)
  const { data: existing } = await supabase
    .from('picks').select('id').eq('player_id', playerId).eq('pick_date', pickDate).maybeSingle()
  if (existing) {
    const { error } = await supabase.from('picks')
      .update({ team_name: teamName, team_id: teamId, is_repeat: isRepeat, result: null, lives_lost: 0 })
      .eq('id', existing.id)
    if (error) throw error
    return
  }
  const { error } = await supabase.from('picks').insert({
    player_id: playerId, match_id: matchId, team_name: teamName,
    team_id: teamId, phase, pick_date: pickDate, is_repeat: isRepeat,
  })
  if (error) throw error
}

export async function updatePickResult(pickId, result, livesLost) {
  const { error } = await supabase.from('picks').update({ result, lives_lost: livesLost }).eq('id', pickId)
  if (error) throw error
}

// ─── Chat ─────────────────────────────────────────────────────
export async function getMessages(limit = 60) {
  const { data, error } = await supabase
    .from('messages').select('*').order('created_at', { ascending: false }).limit(limit)
  if (error) throw error
  return data.reverse()
}

export async function sendMessage(playerId, playerName, playerAvatar, content) {
  const { error } = await supabase.from('messages')
    .insert({ player_id: playerId, player_name: playerName, player_avatar: playerAvatar, content })
  if (error) throw error
}

export function subscribeToMessages(callback) {
  return supabase.channel('messages')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, callback)
    .subscribe()
}

// ─── Profile photo ────────────────────────────────────────────
export async function uploadAvatar(playerId, file) {
  const ext  = file.name.split('.').pop()
  const path = `${playerId}.${ext}`
  const { error: upErr } = await supabase.storage
    .from('avatars').upload(path, file, { upsert: true, contentType: file.type })
  if (upErr) throw upErr
  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  const url = data.publicUrl
  const { error: dbErr } = await supabase.from('players')
    .update({ avatar_url: url }).eq('id', playerId)
  if (dbErr) throw dbErr
  return url
}
