// src/lib/football.js
// Fontes de dados (sem chave necessária):
// 1. openfootball — fixtures Copa 2026 (GitHub raw JSON, público)
// 2. ESPN unofficial API — scores ao vivo
// 3. football-data.org — fallback (usa VITE_FOOTBALL_API_KEY)
 
import { upsertMatches, getMatches, getPlayers, getPlayerPicks,
         updatePickResult, submitPick } from './supabase'
import { resolveResult, computeLivesLost, STAGE_TO_PHASE, toLocalDateISO } from './gameLogic'
 
const OPENFOOTBALL = 'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json'
const ESPN_BASE    = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard'
const FD_BASE      = 'https://api.football-data.org/v4'
const FD_KEY       = import.meta.env.VITE_FOOTBALL_API_KEY
 
// ─── Gera ID numérico simples a partir do nome do time ───────
function teamId(name) {
  let h = 5381
  for (let i = 0; i < name.length; i++) h = ((h << 5) + h) + name.charCodeAt(i)
  return Math.abs(h) % 9000 + 1000
}
 
// ─── Parser openfootball ──────────────────────────────────────
function parseOpenfootball(json) {
  const rows = []
  let id = 1001
 
  for (const match of (json.matches || [])) {
    const { date, time, team1, team2, group, round, score } = match
    if (!team1 || !team2 || !date) continue
 
    // Parse "13:00 UTC-6" → UTC timestamp
    let utc_date
    try {
      if (time) {
        const [hhmm, tz] = time.split(' ')
        const [hh, mm]   = hhmm.split(':').map(Number)
        const offset      = parseInt(tz.replace('UTC', '')) || 0
        const d           = new Date(`${date}T00:00:00Z`)
        d.setUTCHours(hh - offset, mm)
        utc_date = d.toISOString()
      } else {
        utc_date = new Date(`${date}T19:00:00Z`).toISOString()
      }
    } catch { utc_date = new Date(`${date}T19:00:00Z`).toISOString() }
 
    // Determina fase
    const r = (round || '').toLowerCase()
    let stage = 'GROUP_STAGE'
    if (r.includes('round of 32') || r.includes('16 avos'))       stage = 'ROUND_OF_32'
    else if (r.includes('round of 16') || r.includes('oitava'))    stage = 'ROUND_OF_16'
    else if (r.includes('quarter'))                                  stage = 'QUARTER_FINALS'
    else if (r.includes('semi'))                                     stage = 'SEMI_FINALS'
    else if (r.includes('final') && !r.includes('semi'))            stage = 'FINAL'
 
    // Score / winner
    let home_score = null, away_score = null, winner = null, status = 'SCHEDULED'
    if (score) {
      const parts = score.split ? score.split('-').map(s => parseInt(s.trim())) : []
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        home_score = parts[0]; away_score = parts[1]; status = 'FINISHED'
        if (home_score > away_score)      winner = 'HOME_TEAM'
        else if (away_score > home_score) winner = 'AWAY_TEAM'
        else                              winner = 'DRAW'
      }
    }
 
    rows.push({
      id: id++,
      home_team: team1, away_team: team2,
      home_team_id: teamId(team1), away_team_id: teamId(team2),
      utc_date, stage,
      group_name: group ? group.replace('Group ', 'GROUP_').toUpperCase() : null,
      status, home_score, away_score, winner,
    })
  }
  return rows
}
 
// ─── Parser ESPN ─────────────────────────────────────────────
function parseESPN(json) {
  const rows = []
  for (const event of (json.events || [])) {
    try {
      const comp  = event.competitions?.[0]
      const comps = comp?.competitors || []
      const home  = comps.find(c => c.homeAway === 'home')
      const away  = comps.find(c => c.homeAway === 'away')
      if (!home || !away) continue
 
      const statusName = comp.status?.type?.name || ''
      const finished   = statusName === 'STATUS_FINAL'
      const live       = statusName === 'STATUS_IN_PROGRESS' || statusName === 'STATUS_HALFTIME'
      const status     = finished ? 'FINISHED' : live ? 'IN_PLAY' : 'SCHEDULED'
 
      const hScore = parseInt(home.score) || null
      const aScore = parseInt(away.score) || null
      let winner = null
      if (finished && hScore !== null && aScore !== null) {
        if (hScore > aScore)      winner = 'HOME_TEAM'
        else if (aScore > hScore) winner = 'AWAY_TEAM'
        else                      winner = 'DRAW'
      }
 
      // Try to detect stage from notes or name
      const note = (event.notes?.[0]?.text || '').toLowerCase()
      let stage = 'GROUP_STAGE'
      if (note.includes('round of 32'))       stage = 'ROUND_OF_32'
      else if (note.includes('round of 16'))  stage = 'ROUND_OF_16'
      else if (note.includes('quarterfinal')) stage = 'QUARTER_FINALS'
      else if (note.includes('semifinal'))    stage = 'SEMI_FINALS'
      else if (note.includes('final'))        stage = 'FINAL'
 
      rows.push({
        id: parseInt(event.id) || teamId(event.name),
        home_team: home.team.displayName,
        away_team: away.team.displayName,
        home_team_id: parseInt(home.team.id) || teamId(home.team.displayName),
        away_team_id: parseInt(away.team.id) || teamId(away.team.displayName),
        utc_date: event.date,
        stage, group_name: null, status,
        home_score: hScore, away_score: aScore, winner,
      })
    } catch { continue }
  }
  return rows
}
 
// ─── Sync principal ───────────────────────────────────────────
export async function syncMatches() {
  // 1. Tenta openfootball (JSON público, sem chave)
  try {
    const res  = await fetch(OPENFOOTBALL, { cache: 'no-store' })
    const json = await res.json()
    const rows = parseOpenfootball(json)
    if (rows.length > 0) {
      await upsertMatches(rows)
      console.log(`✅ openfootball: ${rows.length} jogos carregados`)
      // Também atualiza scores via ESPN
      await syncScoresFromESPN()
      return rows
    }
  } catch (e) { console.warn('openfootball falhou:', e.message) }
 
  // 2. Tenta ESPN
  try {
    const rows = await syncScoresFromESPN()
    if (rows?.length > 0) return rows
  } catch (e) { console.warn('ESPN falhou:', e.message) }
 
  // 3. Tenta football-data.org
  try {
    const res  = await fetch(`${FD_BASE}/competitions/WC/matches?season=2026`,
      { headers: { 'X-Auth-Token': FD_KEY } })
    const json = await res.json()
    const rows = (json.matches || []).map(m => ({
      id: m.id,
      home_team: m.homeTeam.name, away_team: m.awayTeam.name,
      home_team_id: m.homeTeam.id, away_team_id: m.awayTeam.id,
      utc_date: m.utcDate, stage: m.stage, group_name: m.group || null,
      status: m.status,
      home_score: m.score?.fullTime?.home ?? null,
      away_score: m.score?.fullTime?.away ?? null,
      winner: m.score?.winner || null,
    }))
    if (rows.length > 0) { await upsertMatches(rows); return rows }
  } catch (e) { console.warn('football-data.org falhou:', e.message) }
 
  return null
}
 
// ─── Atualiza scores via ESPN ─────────────────────────────────
export async function syncScoresFromESPN() {
  try {
    // Busca todo o torneio de uma vez
    const url = `${ESPN_BASE}?limit=200&dates=20260611-20260719`
    const res  = await fetch(url, { cache: 'no-store' })
    const json = await res.json()
    const rows = parseESPN(json)
    if (rows.length > 0) {
      await upsertMatches(rows)
      console.log(`✅ ESPN: ${rows.length} jogos/scores`)
    }
    return rows
  } catch (e) { console.warn('ESPN scores falhou:', e.message); return [] }
}
 
// ─── Processa resultados das picks ───────────────────────────
export async function syncResults(players) {
  const matches = await getMatches()
  const finished = matches.filter(m => m.status === 'FINISHED' && m.winner)
  for (const match of finished) {
    const matchDate = toLocalDateISO(match.utc_date)
    for (const player of players) {
      const picks = await getPlayerPicks(player.id)
      const pick  = picks.find(p => p.pick_date === matchDate && p.match_id === match.id)
      if (pick && pick.result === null) {
        const result    = resolveResult(match, pick.team_id)
        const livesLost = computeLivesLost(result, pick.is_repeat, pick.phase)
        await updatePickResult(pick.id, result, livesLost)
      }
    }
  }
}
 
// ─── Penalidade por pick não enviada ────────────────────────
export async function processNoPicks(players, allMatches) {
  const finishedDays = new Set(
    allMatches.filter(m => m.status === 'FINISHED')
      .map(m => toLocalDateISO(m.utc_date))
  )
  for (const player of players) {
    const picks      = await getPlayerPicks(player.id)
    const pickedDays = new Set(picks.map(p => p.pick_date))
    for (const day of finishedDays) {
      if (pickedDays.has(day)) continue
      const dayMatches = allMatches.filter(m => toLocalDateISO(m.utc_date) === day)
      if (!dayMatches.length) continue
      const match = dayMatches[0]
      const phase = STAGE_TO_PHASE[match.stage] || 'groups'
      try {
        await submitPick({ playerId: player.id, matchId: match.id,
          teamName: 'no_pick', teamId: 0, phase, pickDate: day, isRepeat: false })
        const allP = await getPlayerPicks(player.id)
        const p    = allP.find(pk => pk.pick_date === day)
        if (p) await updatePickResult(p.id, 'no_pick', 1)
      } catch (_) { /* já existe */ }
    }
  }
}
