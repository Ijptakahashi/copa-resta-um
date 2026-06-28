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
export function getTeamStatus(picks, teamId, currentPickDate, teamName) {
  // Compara por NOME canônico (o team_id pode colidir entre seleções diferentes!)
  const cTeam = canonTeam(teamName || '')
  const used = picks.filter(p =>
    p.team_name !== 'no_pick' && p.pick_date !== currentPickDate &&
    (canonTeam(p.team_name) === cTeam))
  if (used.length === 0) return 'available'
  // Perdeu = queimada de verdade, pra sempre
  if (used.some(p => p.result === 'loss')) return 'burned'
  // Já usada no mata-mata = queimada
  if (used.some(p => p.phase !== 'groups')) return 'burned'
  // Já usada nos grupos COM resultado (ganhou/empatou) = queimada pros grupos
  if (used.some(p => p.phase === 'groups' && p.result !== null && p.result !== undefined)) return 'burned'
  // Escolhida em outro dia mas SEM resultado ainda = apenas pré-selecionada (pode desmarcar)
  return 'preselected'
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


// Normaliza nome de time para comparação robusta (grafias diferentes = mesmo time)
function canonTeam(n='') {
  const map = {'czechia':'czech republic','korea republic':'south korea','korea rep.':'south korea',
    'bosnia & herzegovina':'bosnia and herzegovina','bosnia-herzegovina':'bosnia and herzegovina',
    'usa':'united states','türkiye':'turkey','curaçao':'curacao','congo dr':'dr congo',
    'ir iran':'iran'}
  const s=String(n).toLowerCase().trim(); return map[s]||s
}

export function validatePick(playerPicks, teamId, teamName, currentPhase, todayMatch, currentPickDate) {
  if (!todayMatch) return { valid: false, reason: 'Sem jogo hoje.' }

  // R32 tem fluxo próprio (validateR32Pick). As demais fases do MM ainda
  // não foram implementadas — ficam bloqueadas até a hora certa.
  if (currentPhase && currentPhase !== 'groups' && currentPhase !== 'r32') {
    return { valid: false, reason: `As picks de ${PHASE_LABEL[currentPhase] || 'mata-mata'} serão liberadas quando a fase começar.` }
  }

  // TODAS as picks anteriores desse time (mesmo SEM resultado ainda / pendentes),
  // exceto as que foram 'no_pick'. Comparação por NOME canônico + id (robusto).
  const cTeam = canonTeam(teamName)
  const usedAll = playerPicks.filter(p =>
    p.team_name !== 'no_pick' &&
    p.pick_date !== currentPickDate &&    // ignora a pick do próprio dia (permite trocar)
    canonTeam(p.team_name) === cTeam)

  // Perdeu quando escolhida = queimada pra sempre
  if (usedAll.some(p => p.result === 'loss')) {
    return { valid: false, reason: `${teamName} está QUEIMADA — perdeu quando você a escolheu.` }
  }

  if (currentPhase === 'groups') {
    // Não pode repetir nos grupos — conta QUALQUER pick anterior (pendente ou não)
    // que NÃO seja deste mesmo dia (poder trocar a pick de hoje é permitido)
    const groupUses = usedAll.filter(p => p.phase === 'groups')
    if (groupUses.length > 0) {
      const playedLost = groupUses.some(p => p.result === 'loss')
      const played = groupUses.some(p => p.result !== null && p.result !== undefined)
      if (playedLost) return { valid: false, reason: `${teamName} está queimada — já perdeu com você.` }
      if (played)     return { valid: false, reason: `${teamName} já foi usada na fase de grupos.` }
      // Sem resultado ainda = pré-selecionada em outro dia
      return { valid: false, reason: `${teamName} já está pré-selecionada para outro dia. Cada seleção só pode ser usada uma vez nos grupos.` }
    }
  } else {
    if (usedAll.some(p => p.phase !== 'groups')) {
      return { valid: false, reason: `${teamName} já foi usada no mata-mata. Não pode escolher de novo.` }
    }
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
  // Data no fuso de São Paulo, independente do fuso do dispositivo do usuário
  const d = new Date(utcDate)
  if (isNaN(d.getTime())) return ''
  // en-CA dá formato YYYY-MM-DD; timeZone fixa o fuso correto
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

export function todayBrasilia() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

// Check if picks are still open for a game day (before first kick-off)
export function pickDeadline(dayMatches) {
  if (!dayMatches || dayMatches.length === 0) return null
  const valid = dayMatches.map(m => new Date(m.utc_date)).filter(d => !isNaN(d.getTime()))
  if (valid.length === 0) return null
  const earliest = valid.reduce((min, d) => d < min ? d : min, valid[0])
  return new Date(earliest.getTime() - 30 * 60 * 1000)
}

export function isPickOpen(dayMatches) {
  const dl = pickDeadline(dayMatches)
  // FAIL-SAFE: sem deadline calculável = assume ABERTO (esconde picks alheias)
  if (!dl) return true
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

// ─── R32 — Round of 32 (2 picks por lado) ──────────────────────
// allR32Picks: picks já feitas pelo jogador nesta fase (phase === 'r32')
// allKnockoutPicks: TODAS as picks do jogador em qualquer fase de mata-mata (para regra de não-repetição entre fases)
export function validateR32Pick(allKnockoutPicks, teamName, side, sidePicksCount) {
  const cTeam = canonTeam(teamName)

  // Já usada em QUALQUER fase do mata-mata (R32, oitavas, quartas...) = bloqueada pra sempre no MM
  const usedInKnockout = allKnockoutPicks.some(p =>
    p.team_name !== 'no_pick' && canonTeam(p.team_name) === cTeam)
  if (usedInKnockout) {
    return { valid: false, reason: `${teamName} já foi escolhida no mata-mata. Não pode repetir.` }
  }

  // Máximo de 2 picks por lado no R32
  if (sidePicksCount >= 2) {
    return { valid: false, reason: `Você já escolheu 2 seleções do lado ${side === 'left' ? 'esquerdo' : 'direito'}.` }
  }

  return { valid: true }
}

// Quantas picks de R32 já feitas em cada lado
export function countR32PicksBySide(r32Picks, sideOfTeam) {
  let left = 0, right = 0
  r32Picks.forEach(p => {
    if (p.team_name === 'no_pick') return
    const side = sideOfTeam(p.team_name)
    if (side === 'left') left++
    else if (side === 'right') right++
  })
  return { left, right }
}
