// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ─── Players ──────────────────────────────────────────────────
export async function getPlayers() {
  const { data, error } = await supabase.from('players').select('*').order('name')
  if (error) throw error
  return data
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
  const start = `${today}T00:00:00.000Z`
  const end   = `${today}T23:59:59.999Z`
  // Use Brasilia offset: today in Brasilia = UTC+0..UTC-5 range
  // Simpler: fetch by date substring after converting
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .gte('utc_date', new Date(today + 'T03:00:00Z').toISOString()) // midnight Brasilia = 03:00 UTC
    .lte('utc_date', new Date(today + 'T26:59:59Z').toISOString()) // 23:59 Brasilia = next day 02:59 UTC
    .order('utc_date')
  if (error) throw error
  return data
}

// ─── Picks ────────────────────────────────────────────────────
export async function getPlayerPicks(playerId) {
  const { data, error } = await supabase
    .from('picks')
    .select('*, match:matches(*)')
    .eq('player_id', playerId)
    .order('pick_date')
  if (error) throw error
  return data
}

export async function getAllPicks(date) {
  let query = supabase
    .from('picks')
    .select('*, player:players(*), match:matches(*)')
    .order('pick_date', { ascending: false })
  if (date) query = query.eq('pick_date', date)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function submitPick({ playerId, matchId, teamName, teamId, phase, pickDate, isRepeat }) {
  const { data, error } = await supabase
    .from('picks')
    .insert({ player_id: playerId, match_id: matchId, team_name: teamName,
              team_id: teamId, phase, pick_date: pickDate, is_repeat: isRepeat })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updatePickResult(pickId, result, livesLost) {
  const { error } = await supabase
    .from('picks')
    .update({ result, lives_lost: livesLost })
    .eq('id', pickId)
  if (error) throw error
}

export async function getPicksForDate(date) {
  const { data, error } = await supabase
    .from('picks')
    .select('*, player:players(*)')
    .eq('pick_date', date)
  if (error) throw error
  return data
}
