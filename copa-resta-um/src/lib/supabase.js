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
  const { error } = await supabase.from('matches').upsert(matches, { onConflict: 'id' })
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
  const { data, error } = await supabase.from('picks')
    .insert({ player_id: playerId, match_id: matchId, team_name: teamName,
              team_id: teamId, phase, pick_date: pickDate, is_repeat: isRepeat })
    .select().single()
  if (error) throw error
  return data
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
