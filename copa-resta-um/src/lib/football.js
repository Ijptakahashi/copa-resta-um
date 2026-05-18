// src/lib/football.js
// football-data.org v4 API — Copa do Mundo 2026
import { upsertMatches, getMatches, getPlayerPicks, getAllPicks, updatePickResult, submitPick } from './supabase'
import { resolveResult, computeLivesLost, STAGE_TO_PHASE, toLocalDateISO } from './gameLogic'

const BASE = 'https://api.football-data.org/v4'
const KEY  = import.meta.env.VITE_FOOTBALL_API_KEY
const COMP = 'WC' // FIFA World Cup

async function apiGet(path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'X-Auth-Token': KEY },
  })
  if (!res.ok) throw new Error(`Football API error: ${res.status}`)
  return res.json()
}

// Fetch and cache all Copa 2026 matches in Supabase
export async function syncMatches() {
  try {
    const json = await apiGet(`/competitions/${COMP}/matches`)
    const rows = json.matches.map(m => ({
      id:           m.id,
      home_team:    m.homeTeam.name,
      away_team:    m.awayTeam.name,
      home_team_id: m.homeTeam.id,
      away_team_id: m.awayTeam.id,
      utc_date:     m.utcDate,
      stage:        m.stage,
      group_name:   m.group || null,
      status:       m.status,
      home_score:   m.score?.fullTime?.home ?? null,
      away_score:   m.score?.fullTime?.away ?? null,
      winner:       m.score?.winner || null,
    }))
    await upsertMatches(rows)
    return rows
  } catch (e) {
    console.error('syncMatches failed:', e)
    return null
  }
}

// Process results for finished matches and update picks
export async function syncResults(players) {
  const matches = await getMatches()
  const finished = matches.filter(m => m.status === 'FINISHED' && m.winner)

  for (const match of finished) {
    const matchDate = toLocalDateISO(match.utc_date)

    for (const player of players) {
      const picks = await getPlayerPicks(player.id)
      const pick = picks.find(p => p.pick_date === matchDate && p.match_id === match.id)

      if (pick && pick.result === null) {
        const result    = resolveResult(match, pick.team_id)
        const livesLost = computeLivesLost(result, pick.is_repeat, pick.phase)
        await updatePickResult(pick.id, result, livesLost)
      }
    }
  }
}

// Mark players who missed a pick day as "no_pick"
export async function processNoPicks(players, allMatches) {
  // Find all past game days (days where at least one match is FINISHED)
  const finishedDays = new Set()
  allMatches
    .filter(m => m.status === 'FINISHED')
    .forEach(m => finishedDays.add(toLocalDateISO(m.utc_date)))

  for (const player of players) {
    const picks = await getPlayerPicks(player.id)
    const pickedDays = new Set(picks.map(p => p.pick_date))

    for (const day of finishedDays) {
      if (!pickedDays.has(day)) {
        // Player missed this day — find the first match of the day to reference
        const dayMatches = allMatches.filter(m => toLocalDateISO(m.utc_date) === day)
        if (dayMatches.length === 0) continue
        const match = dayMatches[0]
        const phase = STAGE_TO_PHASE[match.stage] || 'groups'

        try {
          await submitPick({
            playerId: player.id,
            matchId:  match.id,
            teamName: 'no_pick',
            teamId:   0,
            phase,
            pickDate: day,
            isRepeat: false,
          })
          // Update immediately with result = no_pick
          const allP = await getPlayerPicks(player.id)
          const p = allP.find(pk => pk.pick_date === day)
          if (p) await updatePickResult(p.id, 'no_pick', 1)
        } catch (_) {
          // Already exists (unique constraint) — skip
        }
      }
    }
  }
}
