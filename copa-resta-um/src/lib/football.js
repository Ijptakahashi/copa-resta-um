// src/lib/football.js
import { upsertMatches, getMatches, getPlayerPicks,
         updatePickResult, submitPick, supabase } from './supabase'
import { resolveResult, computeLivesLost, STAGE_TO_PHASE, toLocalDateISO, pickDeadline, r32Deadline, isR32Open, r16Deadline, isR16Open, canonTeam } from './gameLogic'
import { R32_BRACKET, sideOfTeam } from './r32bracket'
import { sideOfTeamR16 } from './r16bracket'

const OPENFOOTBALL = 'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json'
const ESPN_BASE    = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard'
const FD_BASE      = 'https://api.football-data.org/v4'
const FD_KEY       = import.meta.env.VITE_FOOTBALL_API_KEY


// Normaliza nomes para casar entre fontes diferentes (ESPN, openfootball, picks)
function canonName(n='') {
  const map = {
    'korea republic':'south korea','korea rep.':'south korea','south korea':'south korea',
    'czechia':'czech republic','czech republic':'czech republic',
    'bosnia & herzegovina':'bosnia and herzegovina','bosnia-herzegovina':'bosnia and herzegovina',
    'usa':'united states','united states':'united states','united states of america':'united states',
    'türkiye':'turkey','turkiye':'turkey','turkey':'turkey',
    "côte d'ivoire":'ivory coast',"cote d'ivoire":'ivory coast','ivory coast':'ivory coast',
    'curaçao':'curacao','curacao':'curacao','congo dr':'dr congo','dr congo':'dr congo',
    'ir iran':'iran','iran':'iran',
  }
  const s = String(n).toLowerCase().trim()
  return map[s] || s
}

function teamId(name) {
  let h = 5381
  for (let i = 0; i < name.length; i++) h = ((h << 5) + h) + name.charCodeAt(i)
  return Math.abs(h) % 9000 + 1000
}

function parseOpenfootball(json) {
  const rows = []; let id = 1001
  for (const match of (json.matches || [])) {
    const { date, time, team1, team2, group, round, score, score1, score2 } = match
    if (!team1 || !team2 || !date) continue

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

    const r = (round || '').toLowerCase()
    let stage = 'GROUP_STAGE'
    if (r.includes('round of 32'))        stage = 'ROUND_OF_32'
    else if (r.includes('round of 16'))   stage = 'ROUND_OF_16'
    else if (r.includes('quarter'))        stage = 'QUARTER_FINALS'
    else if (r.includes('semi'))           stage = 'SEMI_FINALS'
    else if (r.includes('final') && !r.includes('semi') && !r.includes('quarter') && !r.includes('round')) stage = 'FINAL'

    let home_score = null, away_score = null, winner = null, status = 'SCHEDULED'
    // openfootball 2026 usa score:{ ft:[h,a], ht:[h,a] }
    if (score && score.ft && Array.isArray(score.ft) && score.ft.length === 2) {
      const [h, a] = score.ft
      if (typeof h === 'number' && typeof a === 'number') {
        home_score = h; away_score = a; status = 'FINISHED'
        winner = h > a ? 'HOME_TEAM' : a > h ? 'AWAY_TEAM' : 'DRAW'
      }
    } else if (typeof score1 === 'number' && typeof score2 === 'number') {
      // formato alternativo score1/score2
      home_score = score1; away_score = score2; status = 'FINISHED'
      winner = score1 > score2 ? 'HOME_TEAM' : score2 > score1 ? 'AWAY_TEAM' : 'DRAW'
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

// ─── TheSportsDB: fonte gratuita SEM chave (fallback adicional) ───
// https://www.thesportsdb.com — endpoint público com key de teste "3"
async function updateScoresFromSportsDB(existingMatches) {
  let count = 0
  try {
    // Liga FIFA World Cup = 4429 no TheSportsDB
    const today = new Date()
    const dates = []
    for (let i = -2; i <= 0; i++) {
      const d = new Date(today); d.setDate(d.getDate() + i)
      dates.push(d.toISOString().slice(0,10))
    }
    for (const date of dates) {
      const url = `https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=${date}&l=FIFA_World_Cup`
      const json = await fetch(url, { cache:'no-store' }).then(r => r.json()).catch(()=>null)
      if (!json || !json.events) continue
      for (const ev of json.events) {
        if (ev.intHomeScore == null || ev.intAwayScore == null) continue
        const hScore = parseInt(ev.intHomeScore), aScore = parseInt(ev.intAwayScore)
        if (isNaN(hScore) || isNaN(aScore)) continue
        const cH = canonName(ev.strHomeTeam || ''), cA = canonName(ev.strAwayTeam || '')
        const existing = existingMatches.find(m => {
          const mH = canonName(m.home_team), mA = canonName(m.away_team)
          return (mH === cH && mA === cA) || (mH === cA && mA === cH)
        })
        if (!existing) continue
        // orienta placar conforme casa/fora do nosso registro
        let hs = hScore, as = aScore
        if (canonName(existing.home_team) === cA) { hs = aScore; as = hScore }
        const finished = ev.strStatus === 'Match Finished' || ev.strStatus === 'FT'
        const winner = hs > as ? 'HOME_TEAM' : as > hs ? 'AWAY_TEAM' : 'DRAW'
        await supabase.from('matches')
          .update({ home_score: hs, away_score: as, winner,
                    status: finished ? 'FINISHED' : 'IN_PLAY' })
          .eq('id', existing.id)
        count++
      }
    }
  } catch (e) { console.warn('TheSportsDB falhou:', e.message) }
  return count
}

// Busca scores do ESPN e ATUALIZA registros existentes (sem criar duplicatas)
async function updateScoresFromESPN(existingMatches) {
  try {
    const url  = `${ESPN_BASE}?limit=200&dates=20260611-20260719`
    const json = await fetch(url, { cache: 'no-store' }).then(r => r.json())

    for (const event of (json.events || [])) {
      try {
        const comp   = event.competitions?.[0]
        const comps  = comp?.competitors || []
        const home   = comps.find(c => c.homeAway === 'home')
        const away   = comps.find(c => c.homeAway === 'away')
        if (!home || !away) continue

        const statusName = comp.status?.type?.name || ''
        const finished   = statusName === 'STATUS_FINAL'
        const live       = statusName.includes('IN_PROGRESS') || statusName.includes('HALFTIME')
        if (!finished && !live) continue

        const hScore = parseInt(home.score)
        const aScore = parseInt(away.score)
        const winner = hScore > aScore ? 'HOME_TEAM' : aScore > hScore ? 'AWAY_TEAM' : 'DRAW'
        const status = finished ? 'FINISHED' : 'IN_PLAY'

        const homeName = home.team.displayName
        const awayName = away.team.displayName
        const eventDate = event.date?.slice(0, 10)

        // Casa pelo nome canônico dos dois times (robusto, ignora ordem casa/fora)
        const cH = canonName(homeName), cA = canonName(awayName)
        const existing = existingMatches.find(m => {
          const mH = canonName(m.home_team), mA = canonName(m.away_team)
          return (mH === cH && mA === cA) || (mH === cA && mA === cH)
        })

        if (existing) {
          await supabase.from('matches').update({ home_score: hScore, away_score: aScore, winner, status })
            .eq('id', existing.id)
        }
      } catch { continue }
    }
  } catch (e) { console.warn('ESPN update falhou:', e.message) }
}

// ─── Atualiza scores tentando TODAS as fontes em cascata ───────
async function updateAllScores(existingMatches) {
  // 1. ESPN (tem dados ao vivo, mais rápido)
  try { await updateScoresFromESPN(existingMatches) } catch (e) { console.warn('ESPN:', e.message) }
  // 2. TheSportsDB (gratuito, sem chave) — pega o que a ESPN não pegou
  try { await updateScoresFromSportsDB(existingMatches) } catch (e) { console.warn('SportsDB:', e.message) }
  // 3. openfootball já traz scores no parse (atualizado ~1x/dia pelo mantenedor),
  //    aplicado dentro de syncMatches via upsertMatches.
}

// ─── Sync principal ───────────────────────────────────────────
export async function syncMatches() {
  // 1. openfootball — todos os fixtures (sem duplicatas, sem chave)
  try {
    const res  = await fetch(OPENFOOTBALL, { cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    const rows = parseOpenfootball(json)
    if (rows.length > 0) {
      await upsertMatches(rows)
      console.log(`✅ openfootball: ${rows.length} jogos`)
      // Atualiza scores de TODAS as fontes (ESPN + TheSportsDB)
      await updateAllScores(rows)
      return rows
    }
  } catch (e) { console.warn('openfootball falhou:', e.message) }

  // 2. Fallback: football-data.org
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

// ─── Atualiza resultados das picks ───────────────────────────
// Processa picks com base nos jogos JÁ FINALIZADOS no banco
// (não busca scores — funciona com resultado de API OU inserido manualmente)
export async function processPicks(players) {
  const updated  = await getMatches()
  const finished = updated.filter(m => m.status === 'FINISHED' && m.winner)
  const byId = new Map(finished.map(m => [m.id, m]))
  let processed = 0

  for (const player of players) {
    const picks = await getPlayerPicks(player.id)
    for (const pick of picks) {
      if (pick.result !== null) continue
      if (pick.team_name === 'no_pick') continue

      const cPick = canonName(pick.team_name)

      // 1. Casa pelo match_id da própria pick (vínculo estável e correto).
      //    A data (pick_date) NÃO é usada como chave: no mata-mata o utc_date
      //    do jogo muda (re-sync, correção de fuso, adiamento) e diverge do
      //    pick_date congelado na pick, fazendo a pick nunca casar e ficar
      //    PENDING pra sempre, mesmo com o resultado já gravado no jogo.
      let match = pick.match_id != null ? byId.get(pick.match_id) : null

      // 2. Fallback legado: se a pick não tem match_id casável (ex.: picks
      //    antigas), tenta por nome do time + data — o comportamento antigo.
      if (!match) {
        match = finished.find(m => {
          if (toLocalDateISO(m.utc_date) !== pick.pick_date) return false
          const cH = canonName(m.home_team), cA = canonName(m.away_team)
          return cH === cPick || cA === cPick
        })
      }
      if (!match) continue

      // Confere que o time da pick realmente joga nessa partida (protege contra
      // match_id apontando pra jogo errado por resíduo de dado sujo).
      const cH = canonName(match.home_team), cA = canonName(match.away_team)
      if (cH !== cPick && cA !== cPick) continue

      let result
      if (match.winner === 'DRAW') result = 'draw'
      else if (match.winner === 'HOME_TEAM') result = (cH === cPick) ? 'win' : 'loss'
      else if (match.winner === 'AWAY_TEAM') result = (cA === cPick) ? 'win' : 'loss'
      else continue

      const livesLost = computeLivesLost(result, pick.is_repeat, pick.phase)
      await updatePickResult(pick.id, result, livesLost)
      processed++
    }
  }
  return processed
}

export async function syncResults(players) {
  // 1. Tenta atualizar scores das APIs (pode falhar — tudo bem)
  const allMatches = await getMatches()
  await updateAllScores(allMatches)
  // 2. Processa picks com base no que estiver FINISHED no banco
  //    (resultado de API OU inserido manualmente no /admin ou SQL)
  return await processPicks(players)
}


// ─── Inserção manual de resultado (organizador) ──────────────
// Define o placar de um jogo pelo nome dos times e reprocessa todas as picks.
export async function setMatchResultManual(homeTeam, awayTeam, homeScore, awayScore, players) {
  const allMatches = await getMatches()
  const cH = canonName(homeTeam), cA = canonName(awayTeam)
  // Pega TODAS as cópias desse jogo (caso haja duplicatas no banco)
  const copies = allMatches.filter(m => {
    const mH = canonName(m.home_team), mA = canonName(m.away_team)
    return (mH === cH && mA === cA) || (mH === cA && mA === cH)
  })
  if (copies.length === 0) throw new Error(`Jogo não encontrado: ${homeTeam} x ${awayTeam}`)

  // Atualiza cada cópia respeitando a orientação casa/fora dela
  for (const m of copies) {
    const mH = canonName(m.home_team)
    let hs = homeScore, as = awayScore
    if (mH === cA) { hs = awayScore; as = homeScore }
    const winner = hs > as ? 'HOME_TEAM' : as > hs ? 'AWAY_TEAM' : 'DRAW'
    await supabase.from('matches')
      .update({ home_score: hs, away_score: as, winner, status: 'FINISHED' })
      .eq('id', m.id)
  }
  // Determina o placar na orientação do jogo de referência (copies[0]),
  // FORA do loop, pra estar em escopo no return. Antes, hs/as eram declarados
  // com 'let' dentro do for e não existiam aqui — a função lançava
  // ReferenceError APÓS já ter gravado o placar no banco, fazendo a UI mostrar
  // "Erro" e não recarregar, dando a falsa impressão de que salvar/corrigir
  // não funcionou (na verdade o banco era atualizado a cada tentativa).
  const match = copies[0]
  const refH = canonName(match.home_team)
  const refHs = refH === cA ? awayScore : homeScore
  const refAs = refH === cA ? homeScore : awayScore

  // Reprocessa picks e no-picks
  await syncResults(players)
  const ms = await getMatches()
  await processNoPicks(players, ms)
  return { match: `${match.home_team} ${refHs}-${refAs} ${match.away_team}` }
}

// ─── Sem pick = perde vida ────────────────────────────────────

// ─── Penalidade por picks faltantes no R32 (2 por lado, 4 no total) ───
// Roda depois que o mercado do R32 fecha. Quem fez menos de 2 picks em
// algum lado perde 1 vida POR PICK QUE FALTOU (ex: fez 3 de 4 = -1 vida).
export async function processR32Penalties(players) {
  const allMatches = await getMatches()
  if (isR32Open(allMatches)) return 0   // mercado ainda aberto, não penaliza

  let penalized = 0
  for (const player of players) {
    const picks = await getPlayerPicks(player.id)
    const r32Picks = picks.filter(p => p.phase === 'r32' && p.team_name !== 'no_pick')

    const leftPicksList  = r32Picks.filter(p => sideOfTeam(p.team_name, canonTeam) === 'left')
    const rightPicksList = r32Picks.filter(p => sideOfTeam(p.team_name, canonTeam) === 'right')
    const leftCount  = leftPicksList.length
    const rightCount = rightPicksList.length

    // REGRA: lado com 3+ picks no fechamento é um estado de erro (bug antigo
    // que permitia 3ª pick). Conta como se NENHUMA pick daquele lado fosse
    // válida — todas as 2 esperadas faltam, gerando a penalidade completa.
    const leftInvalid  = leftCount > 2
    const rightInvalid = rightCount > 2

    const missingLeft  = leftInvalid  ? 2 : Math.max(0, 2 - leftCount)
    const missingRight = rightInvalid ? 2 : Math.max(0, 2 - rightCount)
    const missingTotal = missingLeft + missingRight
    if (missingTotal === 0) continue

    // Se o lado está inválido (overflow não corrigido a tempo), neutraliza
    // as picks reais que sobraram lá — elas NUNCA devem virar win/loss,
    // pois o jogador não deixou uma escolha válida e definitiva.
    if (leftInvalid) {
      for (const p of leftPicksList) {
        try { await supabase.from('picks').delete().eq('id', p.id) } catch (_) {}
      }
    }
    if (rightInvalid) {
      for (const p of rightPicksList) {
        try { await supabase.from('picks').delete().eq('id', p.id) } catch (_) {}
      }
    }

    // Evita penalizar 2x: confere se já existe registro de penalidade do R32
    const alreadyPenalized = picks.filter(p =>
      p.phase === 'r32' && p.team_name === 'no_pick').length
    const toCreate = missingTotal - alreadyPenalized
    if (toCreate <= 0) continue

    // Cada penalidade é uma linha 'no_pick'. A chave única parcial do MM é
    // (player_id, match_id), então cada linha precisa de um match_id de R32
    // que o jogador AINDA NÃO ocupou. (pick_date já NÃO precisa ser única.)
    const usedMatchIds = new Set(picks.filter(p => p.match_id != null).map(p => p.match_id))
    const freeR32Matches = allMatches
      .filter(m => m.stage === 'ROUND_OF_32' && !usedMatchIds.has(m.id))

    for (let i = 0; i < toCreate; i++) {
      const m = freeR32Matches[i]
      if (!m) {
        // Não deveria acontecer (16 jogos R32 >> 4 picks), mas avisa em vez
        // de engolir silenciosamente uma penalidade que deveria existir.
        console.warn(`processR32Penalties: sem match_id livre para player ${player.id} (penalidade ${i+1}/${toCreate} não gravada)`)
        break
      }
      try {
        const { error } = await supabase.from('picks').insert({
          player_id: player.id,
          match_id: m.id,
          team_name: 'no_pick',
          team_id: 0,
          phase: 'r32',
          pick_date: toLocalDateISO(m.utc_date),
          is_repeat: false,
          result: 'no_pick',
          lives_lost: 1,
        })
        if (!error) penalized++
        else console.warn('processR32Penalties insert error:', error.message)
      } catch (e) {
        console.warn(`processR32Penalties: falhou para player ${player.id}:`, e.message)
      }
    }
  }
  return penalized
}



// ─── Penalidade por picks faltantes no R16/Oitavas (1 por lado, 2 no total) ───
export async function processR16Penalties(players) {
  const allMatches = await getMatches()
  if (isR16Open(allMatches)) return 0

  let penalized = 0
  for (const player of players) {
    const picks = await getPlayerPicks(player.id)
    const r16Picks = picks.filter(p => p.phase === 'r16' && p.team_name !== 'no_pick')

    const leftPicksList  = r16Picks.filter(p => sideOfTeamR16(p.team_name, canonTeam) === 'left')
    const rightPicksList = r16Picks.filter(p => sideOfTeamR16(p.team_name, canonTeam) === 'right')
    const leftCount  = leftPicksList.length
    const rightCount = rightPicksList.length

    const leftInvalid  = leftCount > 1
    const rightInvalid = rightCount > 1

    const missingLeft  = leftInvalid  ? 1 : Math.max(0, 1 - leftCount)
    const missingRight = rightInvalid ? 1 : Math.max(0, 1 - rightCount)
    const missingTotal = missingLeft + missingRight
    if (missingTotal === 0) continue

    if (leftInvalid) {
      for (const p of leftPicksList) {
        try { await supabase.from('picks').delete().eq('id', p.id) } catch (_) {}
      }
    }
    if (rightInvalid) {
      for (const p of rightPicksList) {
        try { await supabase.from('picks').delete().eq('id', p.id) } catch (_) {}
      }
    }

    const alreadyPenalized = picks.filter(p =>
      p.phase === 'r16' && p.team_name === 'no_pick').length
    const toCreate = missingTotal - alreadyPenalized
    if (toCreate <= 0) continue

    const usedMatchIds = new Set(picks.filter(p => p.match_id != null).map(p => p.match_id))
    const freeR16Matches = allMatches
      .filter(m => m.stage === 'ROUND_OF_16' && !usedMatchIds.has(m.id))

    for (let i = 0; i < toCreate; i++) {
      const m = freeR16Matches[i]
      if (!m) {
        console.warn(`processR16Penalties: sem match_id livre para player ${player.id} (penalidade ${i+1}/${toCreate} não gravada)`)
        break
      }
      try {
        const { error } = await supabase.from('picks').insert({
          player_id: player.id,
          match_id: m.id,
          team_name: 'no_pick',
          team_id: 0,
          phase: 'r16',
          pick_date: toLocalDateISO(m.utc_date),
          is_repeat: false,
          result: 'no_pick',
          lives_lost: 1,
        })
        if (!error) penalized++
        else console.warn('processR16Penalties insert error:', error.message)
      } catch (e) {
        console.warn(`processR16Penalties: falhou para player ${player.id}:`, e.message)
      }
    }
  }
  return penalized
}

export async function processNoPicks(players, allMatches) {
  // Agrupa jogos por dia — APENAS dias de fase de grupos. No mata-mata não
  // existe "pick do dia": as picks são as do bracket (R32: 4 de uma vez), e a
  // penalidade por pick faltante é tratada em processR32Penalties. Se não
  // filtrarmos aqui, todo jogador sem uma linha pick_date=<dia do MM> leva
  // um -1 indevido — foi o bug que penalizou todo mundo no 1º dia do R32.
  const byDay = {}
  allMatches.forEach(m => {
    if (m.stage !== 'GROUP_STAGE') return
    const d = toLocalDateISO(m.utc_date)
    if (!d) return
    ;(byDay[d] = byDay[d] || []).push(m)
  })
  // Um dia "fecha" quando o deadline (30min antes do 1º jogo) já passou.
  // A partir daí, quem não pickou perde vida — mesmo antes do jogo acabar.
  const now = Date.now()
  const finishedDays = Object.keys(byDay).filter(d => {
    const dl = pickDeadline(byDay[d])
    return dl && now >= dl.getTime()
  })
  for (const player of players) {
    for (const day of finishedDays) {
      try {
        // Releitura fresca a cada dia/jogador (evita decisão com dado velho)
        const fresh = await getPlayerPicks(player.id)
        const existing = fresh.find(p => p.pick_date === day)

        if (existing) {
          // Já existe uma pick (real ou no_pick) nesse dia.
          // Se for no_pick mas ainda SEM a vida aplicada, corrige agora.
          if (existing.team_name === 'no_pick' &&
              (existing.result === null || existing.result === undefined)) {
            await updatePickResult(existing.id, 'no_pick', 1)
          }
          continue
        }

        // Não existe nenhuma pick nesse dia: cria a no_pick
        const dayMatches = allMatches.filter(m => toLocalDateISO(m.utc_date) === day)
        if (!dayMatches.length) continue
        const match = dayMatches[0]
        const phase = STAGE_TO_PHASE[match.stage] || 'groups'

        await submitPick({ playerId: player.id, matchId: match.id,
          teamName: 'no_pick', teamId: 0, phase, pickDate: day, isRepeat: false })

        // Aplica a vida — com 1 tentativa extra caso a leitura imediata não ache a linha
        let p = (await getPlayerPicks(player.id)).find(pk => pk.pick_date === day && pk.team_name === 'no_pick')
        if (!p) {
          await new Promise(r => setTimeout(r, 300))
          p = (await getPlayerPicks(player.id)).find(pk => pk.pick_date === day && pk.team_name === 'no_pick')
        }
        if (p && (p.result === null || p.result === undefined)) {
          await updatePickResult(p.id, 'no_pick', 1)
        }
      } catch (e) {
        // Nunca engole em silêncio — loga pra dar pra investigar
        console.warn(`processNoPicks falhou para player ${player.id} no dia ${day}:`, e.message)
      }
    }
  }
}
