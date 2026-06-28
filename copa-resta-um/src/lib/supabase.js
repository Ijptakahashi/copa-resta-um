import { createClient } from '@supabase/supabase-js'
import { canonTeam } from './gameLogic'
import { sideOfTeam } from './r32bracket'

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
  // Pega TODAS as picks desse dia. Não apagamos duplicatas aqui para evitar perda de dados.
  const { data: existing, error: readError } = await supabase
    .from('picks')
    .select('id, result, lives_lost, team_name, team_id, match_id, phase, pick_date')
    .eq('player_id', playerId)
    .eq('pick_date', pickDate)
    .order('created_at', { ascending: true })

  if (readError) throw readError

  if (existing && existing.length > 0) {
    // Se alguma cópia já foi processada, preserva ela e não deixa alterar.
    const processed = existing.find(p => p.result !== null && p.result !== undefined)
    if (processed) {
      // Limpa duplicatas NÃO processadas do mesmo dia (lixo de bugs antigos), mantendo a processada
      const trash = existing.filter(p => p.id !== processed.id && (p.result === null || p.result === undefined))
      if (trash.length) await supabase.from('picks').delete().in('id', trash.map(t => t.id))
      throw new Error('Esta pick já foi processada e não pode mais ser alterada.')
    }

    // Nenhuma processada: mantém a primeira, atualiza, e remove as outras duplicatas
    const keep = existing[0]
    const { error } = await supabase.from('picks')
      .update({ match_id: matchId, team_name: teamName, team_id: teamId, phase, is_repeat: isRepeat })
      .eq('id', keep.id)
      .is('result', null)
    if (error) throw error
    if (existing.length > 1) {
      const dupeIds = existing.slice(1).map(e => e.id)
      await supabase.from('picks').delete().in('id', dupeIds)
    }
    return
  }

  const { error } = await supabase.from('picks').insert({
    player_id: playerId, match_id: matchId, team_name: teamName,
    team_id: teamId, phase, pick_date: pickDate, is_repeat: isRepeat,
  })
  if (error) throw error
}

// ─── R32: versão com TRAVA DURA no banco (máx 2 picks por lado) ───
// Esta é a ÚNICA forma segura de impedir 3+ picks: consulta o banco
// AGORA, na hora da escrita — nunca confia em state do React, que pode
// estar desatualizado por race condition (cliques rápidos em sequência).
export async function submitR32Pick({ playerId, matchId, teamName, phase, pickDate }) {
  const side = sideOfTeam(teamName, canonTeam)
  if (!side) throw new Error(`${teamName} não está no chaveamento do R32.`)

  // 1. Já usada em QUALQUER fase do mata-mata? (R32, oitavas...) — busca direto no banco.
  const { data: knockoutPicks, error: koErr } = await supabase
    .from('picks').select('id, team_name, phase, match_id')
    .eq('player_id', playerId).neq('phase', 'groups').neq('team_name', 'no_pick')
  if (koErr) throw koErr
  const cTeam = canonTeam(teamName)
  // Permite re-escolher o MESMO time deste mesmo jogo (troca/reafirmação);
  // bloqueia se o time já foi usado em OUTRO jogo/fase.
  if ((knockoutPicks || []).some(p =>
        canonTeam(p.team_name) === cTeam && p.match_id !== matchId)) {
    throw new Error(`${teamName} já foi escolhida no mata-mata. Não pode repetir.`)
  }

  // 2. Conta picks JÁ SALVAS no banco para esse lado, excluindo a pick deste
  // MESMO jogo (match_id) — trocar de time dentro do mesmo jogo não é pick nova.
  const sideCountNow = (knockoutPicks || []).filter(p =>
    p.phase === 'r32' &&
    p.match_id !== matchId &&
    sideOfTeam(p.team_name, canonTeam) === side
  ).length

  if (sideCountNow >= 2) {
    throw new Error(`Limite atingido: você já tem 2 seleções no lado ${side === 'left' ? 'esquerdo' : 'direito'}.`)
  }

  // 3. Update se já existe pick para este jogo, senão insert. NÃO usamos
  // .upsert()/ON CONFLICT aqui porque o índice único do MM é PARCIAL
  // (where phase <> 'groups'), e o Postgres não aceita índice parcial como
  // alvo de ON CONFLICT sem repetir a cláusula WHERE — coisa que o cliente
  // Supabase não permite. O índice parcial continua sendo a trava real
  // contra duplicata no banco; aqui só decidimos update vs insert.
  const { data: existing, error: readError } = await supabase
    .from('picks').select('id, result')
    .eq('player_id', playerId).eq('match_id', matchId).eq('phase', 'r32')
    .maybeSingle()
  if (readError && readError.code !== 'PGRST116') throw readError
  if (existing && existing.result !== null && existing.result !== undefined) {
    throw new Error('Esta pick já foi processada e não pode mais ser alterada.')
  }

  if (existing) {
    const { error } = await supabase.from('picks')
      .update({ team_name: teamName, team_id: 0, phase, pick_date: pickDate, is_repeat: false })
      .eq('id', existing.id)
      .is('result', null)   // nunca sobrescreve uma pick já processada
    if (error) throw error
    return
  }

  const { error } = await supabase.from('picks').insert({
    player_id: playerId, match_id: matchId, team_name: teamName,
    team_id: 0, phase, pick_date: pickDate, is_repeat: false,
  })
  if (error) throw error
}

// Remove a pick de R32 de um JOGO específico (match_id) — chave correta no MM,
// onde vários jogos podem cair no mesmo dia (pick_date não identifica a pick).
export async function removePickByMatch(playerId, matchId) {
  const { data, error: readError } = await supabase
    .from('picks').select('id, result')
    .eq('player_id', playerId).eq('match_id', matchId).eq('phase', 'r32')
  if (readError) throw readError
  if (!data || !data.length) return
  const processed = data.find(p => p.result !== null && p.result !== undefined)
  if (processed) {
    throw new Error('Esta pick já foi processada e não pode mais ser removida.')
  }
  const ids = data.map(p => p.id)
  const { error } = await supabase.from('picks').delete().in('id', ids)
  if (error) throw error

  // Verificação real: o delete sob RLS pode "ter sucesso" sem apagar nada.
  const { data: stillThere, error: verifyErr } = await supabase
    .from('picks').select('id')
    .eq('player_id', playerId).eq('match_id', matchId).eq('phase', 'r32')
  if (verifyErr) throw verifyErr
  if (stillThere && stillThere.length > 0) {
    throw new Error('A remoção não foi salva no banco (possível bloqueio de permissão). Tente novamente ou avise o organizador.')
  }
}

// Remove uma pick específica (usado pra "desmarcar" no R32 ao clicar de novo).
// Nunca remove pick já processada (com resultado), por segurança.
export async function removePick(pickDate, pickId) {
  const { data, error: readError } = await supabase
    .from('picks').select('id, result').eq('id', pickId).maybeSingle()
  if (readError) throw readError
  if (!data) return
  if (data.result !== null && data.result !== undefined) {
    throw new Error('Esta pick já foi processada e não pode mais ser removida.')
  }
  const { error } = await supabase.from('picks').delete().eq('id', pickId)
  if (error) throw error
}

// Remove pela combinação player_id + pick_date (chave real e confiável),
// em vez de um id local que pode estar desatualizado (ex: id temporário
// de uma atualização otimista que ainda não sincronizou com o banco).
export async function removePickByDate(playerId, pickDate) {
  const { data, error: readError } = await supabase
    .from('picks').select('id, result')
    .eq('player_id', playerId).eq('pick_date', pickDate)
  if (readError) throw readError
  if (!data || !data.length) return
  const processed = data.find(p => p.result !== null && p.result !== undefined)
  if (processed) {
    throw new Error('Esta pick já foi processada e não pode mais ser removida.')
  }

  // Apaga pelos IDs específicos (mais confiável que filtrar por player+data,
  // que pode falhar silenciosamente sob certas políticas de RLS).
  const ids = data.map(p => p.id)
  const { error, data: deleted } = await supabase
    .from('picks').delete().in('id', ids).select('id')
  if (error) throw error

  // VERIFICAÇÃO REAL: relê o banco para confirmar que a remoção realmente
  // aconteceu. Sem isso, um delete bloqueado por RLS pode retornar sucesso
  // sem apagar nada, fazendo a pick "voltar" ao recarregar a página.
  const { data: stillThere, error: verifyErr } = await supabase
    .from('picks').select('id')
    .eq('player_id', playerId).eq('pick_date', pickDate)
  if (verifyErr) throw verifyErr
  if (stillThere && stillThere.length > 0) {
    throw new Error('A remoção não foi salva no banco (possível bloqueio de permissão). Tente novamente ou avise o organizador.')
  }
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
