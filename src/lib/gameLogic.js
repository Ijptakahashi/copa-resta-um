// ============================================================
// Copa Resta Um — Game Logic
// ============================================================

export const STAGE_TO_PHASE = {
  GROUP_STAGE:    'groups',
  ROUND_OF_32:   'r32',
  ROUND_OF_16:   'r16',
  QUARTER_FINALS: 'qf',
  SEMI_FINALS:   'sf',
  FINAL:         'final',
}

export const PHASE_LABEL = {
  groups: 'Fase de Grupos',
  r32:    'Round of 32',
  r16:    'Oitavas de Final',
  qf:     'Quartas de Final',
  sf:     'Semifinais',
  final:  'Final',
}

export const KNOCKOUT_PHASES = ['r32', 'r16', 'qf', 'sf', 'final']

// Starting lives per phase block
export const STARTING_LIVES = { groups: 6, knockout: 3 }

// Flag emoji lookup
export const FLAG = {
  // English names (from openfootball/ESPN)
  'Mexico': '🇲🇽', 'South Africa': '🇿🇦', 'South Korea': '🇰🇷',
  'Czech Republic': '🇨🇿', 'Czechia': '🇨🇿',
  'Canada': '🇨🇦', 'Bosnia and Herzegovina': '🇧🇦', 'Bosnia': '🇧🇦',
  'Qatar': '🇶🇦', 'Switzerland': '🇨🇭',
  'Brazil': '🇧🇷', 'Morocco': '🇲🇦', 'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'Haiti': '🇭🇹',
  'United States': '🇺🇸', 'Paraguay': '🇵🇾',
  'Australia': '🇦🇺', 'Turkey': '🇹🇷',
  'Germany': '🇩🇪', 'Ecuador': '🇪🇨',
  "Côte d'Ivoire": '🇨🇮', 'Ivory Coast': '🇨🇮', 'Cote d\'Ivoire': '🇨🇮', 'Curacao': '🇨🇼',
  'Netherlands': '🇳🇱', 'Japan': '🇯🇵', 'Sweden': '🇸🇪', 'Tunisia': '🇹🇳',
  'Belgium': '🇧🇪', 'Egypt': '🇪🇬', 'Iran': '🇮🇷', 'New Zealand': '🇳🇿',
  'Spain': '🇪🇸', 'Cape Verde': '🇨🇻', 'Saudi Arabia': '🇸🇦', 'Uruguay': '🇺🇾',
  'France': '🇫🇷', 'Senegal': '🇸🇳', 'Iraq': '🇮🇶', 'Norway': '🇳🇴',
  'Argentina': '🇦🇷', 'Algeria': '🇩🇿', 'Austria': '🇦🇹', 'Jordan': '🇯🇴',
  'Portugal': '🇵🇹', 'DR Congo': '🇨🇩', 'Congo DR': '🇨🇩', 'Uzbekistan': '🇺🇿',
  'Colombia': '🇨🇴', 'England': '🏴󠁧󠁢󠁥󠁮󠁧󁿢', 'Croatia': '🇭🇷',
  'Panama': '🇵🇦', 'Ghana': '🇬🇭', 'Norway': '🇳🇴', 'Sweden': '🇸🇪',
  'Senegal': '🇸🇳', 'Honduras': '🇭🇳', 'Costa Rica': '🇨🇷', 'Jamaica': '🇯🇲',
  'New Zealand': '🇳🇿', 'Mali': '🇲🇱',
  'Brazil': '🇧🇷', 'Brasil': '🇧🇷',
  'Argentina': '🇦🇷', 'France': '🇫🇷', 'França': '🇫🇷',
  'Germany': '🇩🇪', 'Alemanha': '🇩🇪',
  'England': '🏴󠁧󠁢󠁥󠁮󠁧󁿢', 'Inglaterra': '🏴󠁧󠁢󠁥󠁮󠁧󁿢',
  'Spain': '🇪🇸', 'Espanha': '🇪🇸',
  'Portugal': '🇵🇹', 'Netherlands': '🇳🇱', 'Países Baixos': '🇳🇱',
  'Italy': '🇮🇹', 'Itália': '🇮🇹',
  'Belgium': '🇧🇪', 'Bélgica': '🇧🇪',
  'Croatia': '🇭🇷', 'Croácia': '🇭🇷',
  'Denmark': '🇩🇰', 'Dinamarca': '🇩🇰',
  'Switzerland': '🇨🇭', 'Suíça': '🇨🇭',
  'Serbia': '🇷🇸', 'Sérvia': '🇷🇸',
  'Austria': '🇦🇹', 'Áustria': '🇦🇹',
  'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'Escócia': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'Hungary': '🇭🇺', 'Hungria': '🇭🇺',
  'Slovenia': '🇸🇮', 'Eslovênia': '🇸🇮',
  'Uruguay': '🇺🇾', 'Uruguai': '🇺🇾',
  'Colombia': '🇨🇴', 'Colômbia': '🇨🇴',
  'Ecuador': '🇪🇨', 'Equador': '🇪🇨',
  'Venezuela': '🇻🇪', 'Chile': '🇨🇱', 'Peru': '🇵🇪',
  'Mexico': '🇲🇽', 'México': '🇲🇽',
  'United States': '🇺🇸', 'USA': '🇺🇸', 'EUA': '🇺🇸',
  'Canada': '🇨🇦', 'Canadá': '🇨🇦',
  'Costa Rica': '🇨🇷', 'Honduras': '🇭🇳',
  'Panama': '🇵🇦', 'Panamá': '🇵🇦',
  'Jamaica': '🇯🇲', 'El Salvador': '🇸🇻',
  'Japan': '🇯🇵', 'Japão': '🇯🇵',
  'South Korea': '🇰🇷', 'Coreia do Sul': '🇰🇷',
  'Australia': '🇦🇺', 'Austrália': '🇦🇺',
  'Iran': '🇮🇷', 'Irã': '🇮🇷',
  'Saudi Arabia': '🇸🇦', 'Arábia Saudita': '🇸🇦',
  'Iraq': '🇮🇶', 'Iraque': '🇮🇶',
  'Jordan': '🇯🇴', 'Jordânia': '🇯🇴',
  'Qatar': '🇶🇦',
  'Morocco': '🇲🇦', 'Marrocos': '🇲🇦',
  'Senegal': '🇸🇳', 'Nigeria': '🇳🇬', 'Nigéria': '🇳🇬',
  'Egypt': '🇪🇬', 'Egito': '🇪🇬',
  "Côte d'Ivoire": '🇨🇮', 'Costa do Marfim': '🇨🇮',
  'Mali': '🇲🇱', 'Cameroon': '🇨🇲', 'Camarões': '🇨🇲',
  'Ghana': '🇬🇭', 'Gana': '🇬🇭',
  'Algeria': '🇩🇿', 'Argélia': '🇩🇿',
  'South Africa': '🇿🇦', 'África do Sul': '🇿🇦',
  'DR Congo': '🇨🇩', 'R.D. Congo': '🇨🇩',
  'New Zealand': '🇳🇿', 'Nova Zelândia': '🇳🇿',
}

export function getFlag(teamName) {
  return FLAG[teamName] || '🏳️'
}

// ─── Lives calculation ────────────────────────────────────────

export function computeLives(picks) {
  const settled = picks.filter(p => p.result !== null)
  const groupLosses   = settled.filter(p => p.phase === 'groups').reduce((s, p) => s + (p.lives_lost || 0), 0)
  const knockoutLosses = settled.filter(p => KNOCKOUT_PHASES.includes(p.phase)).reduce((s, p) => s + (p.lives_lost || 0), 0)
  const inKnockout = settled.some(p => KNOCKOUT_PHASES.includes(p.phase))

  return {
    lives: Math.max(0, 6 - groupLosses - knockoutLosses),
    groupLosses,
    knockoutLosses,
    inKnockout,
  }
}

export function isEliminated(picks) {
  return computeLives(picks).lives <= 0
}

// ─── Team inventory ──────────────────────────────────────────

// available | unlocked | burned
export function getTeamStatus(picks, teamId) {
  const used = picks.filter(p => p.team_id === teamId && p.result !== null && p.result !== 'no_pick')
  if (used.length === 0) return 'available'
  // Perdeu quando escolhida = queimada pra sempre
  if (used.some(p => p.result === 'loss')) return 'burned'
  // Já usada no mata-mata (venceu/empatou) = não pode mais reutilizar
  const usedInKnockout = used.some(p => p.phase !== 'groups')
  if (usedInKnockout) return 'burned'
  // Venceu/empatou nos grupos = liberada para UMA reutilização no mata-mata
  return 'unlocked'
}

// Returns all teams with their status for a player
export function buildInventory(picks) {
  const map = {}
  picks.forEach(p => {
    if (p.result === 'no_pick') return
    if (!map[p.team_id]) map[p.team_id] = { team_id: p.team_id, team_name: p.team_name, picks: [] }
    map[p.team_id].picks.push(p)
  })
  return Object.values(map).map(entry => ({
    ...entry,
    status: entry.picks.some(p => p.result === 'loss') ? 'burned'
          : entry.picks.some(p => p.result !== null) ? 'unlocked'
          : 'used',
  }))
}

// ─── Pick validation ─────────────────────────────────────────

export function validatePick(playerPicks, teamId, teamName, currentPhase, todayMatch) {
  if (!todayMatch) return { valid: false, reason: 'Sem jogo hoje.' }

  const used = playerPicks.filter(p =>
    p.team_id === teamId && p.result !== null && p.result !== 'no_pick')

  // Perdeu quando escolhida = queimada pra sempre, em qualquer fase
  if (used.some(p => p.result === 'loss')) {
    return { valid: false, reason: `${teamName} está QUEIMADA — perdeu quando você a escolheu.` }
  }

  if (currentPhase === 'groups') {
    // Não pode repetir nos grupos
    if (used.some(p => p.phase === 'groups')) {
      return { valid: false, reason: `${teamName} já foi usada na fase de grupos. Não é permitido repetir.` }
    }
  } else {
    // Mata-mata: não pode repetir time já usado no mata-mata (qualquer fase do MM)
    if (used.some(p => p.phase !== 'groups')) {
      return { valid: false, reason: `${teamName} já foi usada no mata-mata. Não pode escolher de novo.` }
    }
    // Pode usar: time liberado dos grupos (venceu/empatou) OU nunca usado.
    // Esta é a única reutilização permitida — uma vez no MM.
  }
  return { valid: true }
}

// ─── Result processing ───────────────────────────────────────

// Given a finished match and which team was picked, return result
export function resolveResult(match, teamId) {
  if (!match.winner) return null // match not finished
  if (match.winner === 'DRAW') return 'draw'
  const pickedHome = match.home_team_id === teamId
  const pickedAway = match.away_team_id === teamId
  if (!pickedHome && !pickedAway) return null // team wasn't in this match
  if (match.winner === 'HOME_TEAM' && pickedHome) return 'win'
  if (match.winner === 'AWAY_TEAM' && pickedAway) return 'win'
  return 'loss'
}

// Compute lives_lost for a pick result
export function computeLivesLost(result, isRepeat, phase) {
  let lost = 0
  // Derrota ou sem pick = -1 vida. Empate = pick desperdiçada, sem perda.
  if (result === 'loss' || result === 'no_pick') lost += 1
  return lost
}

// ─── Date helpers ────────────────────────────────────────────

export function toLocalDate(utcDate) {
  return new Date(utcDate).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
}

export function toLocalDateISO(utcDate) {
  const d = new Date(utcDate)
  // Convert to Brasilia timezone (UTC-3)
  const brasilia = new Date(d.getTime() - 3 * 60 * 60 * 1000)
  return brasilia.toISOString().slice(0, 10)
}

export function todayBrasilia() {
  const now = new Date()
  const brasilia = new Date(now.getTime() - 3 * 60 * 60 * 1000)
  return brasilia.toISOString().slice(0, 10)
}

// Check if picks are still open for a game day (before first kick-off)
export function pickDeadline(dayMatches) {
  if (!dayMatches || dayMatches.length === 0) return null
  const earliest = dayMatches.reduce((min, m) => new Date(m.utc_date) < new Date(min.utc_date) ? m : min)
  return new Date(new Date(earliest.utc_date).getTime() - 30 * 60 * 1000)
}

export function isPickOpen(dayMatches) {
  const dl = pickDeadline(dayMatches)
  if (!dl) return false
  return new Date() < dl
}

// ─── Sorting/ranking ─────────────────────────────────────────

export function rankPlayers(playersWithPicks) {
  // Desempate oficial:
  // 1. Mais vidas  2. Mais picks certas  3. Menos repetições
  // 4. Saldo de gols dos picks  5. Sorteio (nome)
  return [...playersWithPicks].sort((a, b) => {
    if (b.lives !== a.lives)       return b.lives - a.lives
    if (b.correct !== a.correct)   return b.correct - a.correct
    const aRep = a.repeats || 0, bRep = b.repeats || 0
    if (aRep !== bRep)             return aRep - bRep          // menos repetições primeiro
    const aGd = a.goalDiff || 0, bGd = b.goalDiff || 0
    if (bGd !== aGd)               return bGd - aGd            // maior saldo primeiro
    return a.name.localeCompare(b.name)                        // sorteio determinístico
  })
}

// Calcula métricas de desempate para um jogador
export function tiebreakStats(picks, matches) {
  const settled = picks.filter(p => p.result !== null && p.result !== 'no_pick')
  // Repetições: time usado mais de uma vez (reutilização no mata-mata)
  const teamCounts = {}
  settled.forEach(p => { teamCounts[p.team_id] = (teamCounts[p.team_id]||0) + 1 })
  const repeats = Object.values(teamCounts).reduce((s,c) => s + Math.max(0, c-1), 0)
  // Saldo de gols dos picks (gols do time escolhido - gols do adversário)
  let goalDiff = 0
  settled.forEach(p => {
    const m = matches.find(mm => mm.id === p.match_id)
    if (!m || m.home_score == null || m.away_score == null) return
    const pickedHome = m.home_team_id === p.team_id
    goalDiff += pickedHome ? (m.home_score - m.away_score) : (m.away_score - m.home_score)
  })
  return { repeats, goalDiff }
}
