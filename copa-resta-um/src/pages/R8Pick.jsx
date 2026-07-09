import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Lock, RefreshCw } from 'lucide-react'
import {
  getPlayerPicks,
  getMatches,
  submitQfPick,
  removeQfPickByMatch,
} from '../lib/supabase'
import {
  canonTeam,
  qfDeadline,
  isQfOpen,
  validateQfPick,
} from '../lib/gameLogic'
import { countryCode } from '../components/FlagImage'
import { R8_BRACKET } from '../lib/r8bracket'

function DeadlineCountdown({ deadline }) {
  const [t, setT] = useState({ d: '--', h: '--', m: '--', s: '--' })

  useEffect(() => {
    function tick() {
      const diff = deadline - Date.now()

      if (diff <= 0) {
        setT({ d: '00', h: '00', m: '00', s: '00' })
        return
      }

      setT({
        d: String(Math.floor(diff / 86400000)).padStart(2, '0'),
        h: String(Math.floor((diff % 86400000) / 3600000)).padStart(2, '0'),
        m: String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0'),
        s: String(Math.floor((diff % 60000) / 1000)).padStart(2, '0'),
      })
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [deadline])

  return (
    <span style={{ fontFamily: 'Sora', fontWeight: 800, color: '#C4302B' }}>
      {t.d}d {t.h}:{t.m}:{t.s}
    </span>
  )
}

function formatDateTimeBR(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function Flag({ teamName }) {
  const code = countryCode(teamName)

  if (!code) return null

  return (
    <img
      src={`https://flagcdn.com/w40/${code}.png`}
      width={26}
      height={18}
      style={{ borderRadius: 3, flexShrink: 0 }}
      alt=""
    />
  )
}

export default function R8Pick({ player }) {
  const navigate = useNavigate()

  const [allPicks, setAllPicks] = useState([])
  const [matches, setMatches] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingTeam, setSavingTeam] = useState(null)
  const [deadline, setDeadline] = useState(null)
  const [marketOpen, setMarketOpen] = useState(true)

  useEffect(() => {
    load()

    const onVis = () => {
      if (document.visibilityState === 'visible') load()
    }

    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [player.id])

  async function load() {
    setLoading(true)
    setError('')

    try {
      const [picks, ms] = await Promise.all([
        getPlayerPicks(player.id),
        getMatches(),
      ])

      setAllPicks(picks)
      setMatches(ms)
      setDeadline(qfDeadline(ms))
      setMarketOpen(isQfOpen(ms))
    } catch (e) {
      setError('Erro ao carregar quartas: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  const qfPicks = allPicks.filter(
    p => p.phase === 'qf' && p.team_name !== 'no_pick'
  )

  const qfPick = qfPicks[0] || null

  const knockoutPicks = allPicks.filter(
    p => p.phase && p.phase !== 'groups' && p.team_name !== 'no_pick'
  )

  function findMatchRecord(home, away, bracketId) {
    // 1. Casa pelo id do bracket (estável, imune a grafia). É o caminho certo:
    //    o R8_BRACKET já traz o id de cada jogo.
    if (bracketId != null) {
      const byId = matches.find(m => m.id === bracketId)
      if (byId) return byId
    }
    // 2. Fallback por nome canônico (caso o id do banco divirja do bracket).
    const cH = canonTeam(home)
    const cA = canonTeam(away)
    return matches.find(m => {
      const mh = canonTeam(m.home_team)
      const ma = canonTeam(m.away_team)
      return (mh === cH && ma === cA) || (mh === cA && ma === cH)
    })
  }

  function pickForMatch(home, away) {
    const cH = canonTeam(home)
    const cA = canonTeam(away)

    return qfPicks.find(p => {
      const c = canonTeam(p.team_name)
      return c === cH || c === cA
    })
  }

  function isBurnedFromGroups(teamName) {
    const c = canonTeam(teamName)

    return allPicks.some(
      p =>
        p.phase === 'groups' &&
        p.result === 'loss' &&
        canonTeam(p.team_name) === c
    )
  }

  function isUsedInPreviousKnockout(teamName) {
    const c = canonTeam(teamName)

    return allPicks.some(
      p =>
        p.team_name !== 'no_pick' &&
        p.phase &&
        p.phase !== 'groups' &&
        p.phase !== 'qf' &&
        canonTeam(p.team_name) === c
    )
  }

  async function selectTeam(teamName, matchRecord, otherTeamName) {
    setError('')

    if (!marketOpen) {
      setError('O mercado das quartas já fechou. Sua pick está travada.')
      return
    }

    if (savingTeam) return

    if (!matchRecord) {
      setError('Jogo ainda não encontrado no banco. Aguarde a sincronização.')
      return
    }

    const currentPick = pickForMatch(teamName, otherTeamName)
    const isSelected = currentPick && canonTeam(currentPick.team_name) === canonTeam(teamName)

    if (isSelected) {
      setSavingTeam(teamName)

      try {
        await removeQfPickByMatch(player.id, matchRecord.id)

        setAllPicks(prev =>
          prev.filter(p => !(p.phase === 'qf' && p.match_id === matchRecord.id))
        )
      } catch (e) {
        setError('Erro ao remover: ' + e.message)
      } finally {
        setSavingTeam(null)
      }

      return
    }

    if (isBurnedFromGroups(teamName)) {
      setError(`${teamName} está queimada — perdeu na fase de grupos.`)
      return
    }

    if (isUsedInPreviousKnockout(teamName)) {
      setError(`${teamName} já foi escolhida em fase anterior do mata-mata. Não pode repetir.`)
      return
    }

    const qfCountExcludingThisMatch = qfPicks.filter(
      p => p.match_id !== matchRecord.id
    ).length

    const validation = validateQfPick(
      knockoutPicks,
      teamName,
      qfCountExcludingThisMatch
    )

    if (!validation.valid) {
      setError(validation.reason)
      return
    }

    setSavingTeam(teamName)

    try {
      await submitQfPick({
        playerId: player.id,
        matchId: matchRecord.id,
        teamName,
        phase: 'qf',
        pickDate: matchRecord.utc_date?.slice(0, 10),
      })

      setAllPicks(prev => {
        const withoutOldQf = prev.filter(p => p.phase !== 'qf')

        return [
          ...withoutOldQf,
          {
            id: `temp-qf-${matchRecord.id}`,
            phase: 'qf',
            team_name: teamName,
            pick_date: matchRecord.utc_date?.slice(0, 10),
            match_id: matchRecord.id,
            result: null,
            is_repeat: false,
          },
        ]
      })

      load()
    } catch (e) {
      setError('Erro ao salvar: ' + e.message)
    } finally {
      setSavingTeam(null)
    }
  }

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '60vh',
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: '3px solid #E8E3DB',
            borderTopColor: '#1A3D28',
            animation: 'spin 1s linear infinite',
          }}
        />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 430, margin: '0 auto', background: '#F8F4EE', minHeight: '100svh' }}>
      <div style={{ padding: '14px 16px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: '1px solid rgba(0,0,0,.1)',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={18} />
        </button>
      </div>

      <div style={{ padding: '14px 16px 110px' }}>
        <div
          style={{
            fontFamily: 'Sora',
            fontWeight: 800,
            fontSize: 26,
            color: '#1A3D28',
            letterSpacing: '-1px',
            lineHeight: 1.05,
          }}
        >
          SUA PICK<br />QUARTAS
        </div>

        <div style={{ fontSize: 12, color: '#9A9384', marginTop: 4 }}>
          Escolha 1 seleção entre as 8 classificadas. Não existe lado nas quartas.
        </div>

        {deadline && marketOpen && (
          <div
            style={{
              background: '#FEF0EF',
              borderRadius: 10,
              padding: '10px 14px',
              margin: '12px 0',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              border: '1px solid rgba(196,48,43,.15)',
            }}
          >
            <Lock size={13} color="#C4302B" />
            <span style={{ fontFamily: 'Sora', fontWeight: 600, fontSize: 12, color: '#C4302B' }}>
              Mercado das quartas fecha em <DeadlineCountdown deadline={deadline} />
            </span>
          </div>
        )}

        {deadline && !marketOpen && (
          <div
            style={{
              background: '#EBF5EE',
              borderRadius: 10,
              padding: 14,
              margin: '12px 0',
              textAlign: 'center',
              border: '1px solid rgba(26,61,40,.15)',
            }}
          >
            <Check size={20} color="#1A3D28" style={{ marginBottom: 6 }} />
            <div style={{ fontFamily: 'Sora', fontWeight: 700, color: '#1A3D28', fontSize: 14 }}>
              MERCADO FECHADO
            </div>
            <div style={{ fontSize: 11, color: '#6B6B5E', marginTop: 2 }}>
              Sua pick das quartas está travada.
            </div>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: qfPick ? '#0E2417' : '#15291C',
            borderRadius: 12,
            padding: '12px 16px',
            margin: '14px 0',
            border: qfPick ? '1px solid rgba(201,164,74,.4)' : 'none',
          }}
        >
          <div>
            <div
              style={{
                fontFamily: 'Sora',
                fontWeight: 700,
                fontSize: 10,
                letterSpacing: '.1em',
                color: 'rgba(201,164,74,.8)',
                textTransform: 'uppercase',
              }}
            >
              Pick das quartas
            </div>

            <div
              style={{
                fontFamily: 'Sora',
                fontWeight: 800,
                fontSize: 20,
                color: '#fff',
                marginTop: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {qfPick ? 1 : 0} / 1

              {qfPick && (
                <span
                  style={{
                    fontFamily: 'Sora',
                    fontSize: 9,
                    fontWeight: 700,
                    color: '#1A3D28',
                    background: '#C9A44A',
                    padding: '3px 8px',
                    borderRadius: 10,
                    letterSpacing: '.04em',
                  }}
                >
                  ✓ CONFIRMADO
                </span>
              )}
            </div>
          </div>

          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: qfPick ? '#C9A44A' : 'rgba(255,255,255,.2)',
            }}
          />
        </div>

        {qfPick && marketOpen && (
          <div
            style={{
              background: '#FBF7EC',
              borderRadius: 10,
              padding: '10px 14px',
              marginBottom: 12,
              fontSize: 11,
              color: '#A07830',
              fontFamily: 'Inter',
              border: '1px solid rgba(201,164,74,.25)',
            }}
          >
            Você já escolheu sua seleção das quartas. Para trocar, toque na seleção marcada e remova primeiro.
          </div>
        )}

        {error && (
          <div
            style={{
              background: '#FEF0EF',
              borderRadius: 10,
              padding: '10px 14px',
              fontSize: 12,
              color: '#C4302B',
              marginBottom: 12,
              border: '1px solid rgba(196,48,43,.2)',
            }}
          >
            {error}
          </div>
        )}

        {R8_BRACKET.map((m, idx) => {
          const rec = findMatchRecord(m.home, m.away, m.id)
          const pending = !rec
          const currentPick = !pending && pickForMatch(m.home, m.away)

          return (
            <div
              key={idx}
              style={{
                background: '#fff',
                borderRadius: 14,
                padding: '12px 14px',
                marginBottom: 10,
                border: currentPick
                  ? '1.5px solid rgba(26,61,40,.25)'
                  : '1px solid rgba(0,0,0,.06)',
                boxShadow: '0 1px 6px rgba(0,0,0,.04)',
                opacity: pending ? 0.45 : 1,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                  fontFamily: 'Sora',
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '.08em',
                  color: '#B0A898',
                  textTransform: 'uppercase',
                }}
              >
                <span>{pending ? 'PENDENTE' : formatDateTimeBR(rec.utc_date)}</span>

                {currentPick && marketOpen && (
                  <span style={{ color: '#1A3D28', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Check size={10} /> ESCOLHIDO · TOQUE P/ REMOVER
                  </span>
                )}

                {currentPick && !marketOpen && (
                  <span style={{ color: '#1A3D28', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Check size={10} /> ESCOLHIDO
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {[m.home, m.away].map((teamName, i) => {
                  const isSelected =
                    currentPick &&
                    canonTeam(currentPick.team_name) === canonTeam(teamName)

                  const burned = isBurnedFromGroups(teamName)
                  const usedBefore = isUsedInPreviousKnockout(teamName)
                  const unavailable = burned || usedBefore
                  const isSaving = savingTeam === teamName

                  const hasAnotherQfPick =
                    qfPick &&
                    !isSelected

                  const isBlocked =
                    pending ||
                    unavailable ||
                    !marketOpen ||
                    hasAnotherQfPick

                  return (
                    <div
                      key={teamName}
                      onClick={() =>
                        !isBlocked &&
                        selectTeam(teamName, rec, i === 0 ? m.away : m.home)
                      }
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 10px',
                        borderRadius: 10,
                        border: `1.5px solid ${
                          isSelected
                            ? '#1A3D28'
                            : unavailable
                              ? 'rgba(196,48,43,.3)'
                              : 'rgba(0,0,0,.07)'
                        }`,
                        background: isSelected
                          ? 'rgba(26,61,40,.06)'
                          : unavailable
                            ? '#FEF5F5'
                            : 'transparent',
                        cursor: isBlocked ? 'not-allowed' : 'pointer',
                        opacity: unavailable || (hasAnotherQfPick && !isSelected) ? 0.55 : 1,
                        position: 'relative',
                      }}
                    >
                      {isSaving && (
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(255,255,255,.7)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 10,
                          }}
                        >
                          <RefreshCw
                            size={14}
                            color="#1A3D28"
                            style={{ animation: 'spin 1s linear infinite' }}
                          />
                        </div>
                      )}

                      <Flag teamName={teamName} />

                      <span
                        style={{
                          fontFamily: 'Sora',
                          fontWeight: 600,
                          fontSize: 12,
                          color: '#1A1A1A',
                          textDecoration: unavailable ? 'line-through' : 'none',
                        }}
                      >
                        {teamName}
                      </span>

                      {usedBefore && (
                        <span
                          style={{
                            fontFamily: 'Sora',
                            fontSize: 8,
                            fontWeight: 700,
                            color: '#C4302B',
                            marginLeft: 'auto',
                            flexShrink: 0,
                          }}
                        >
                          JÁ USADA
                        </span>
                      )}

                      {burned && !usedBefore && (
                        <span
                          style={{
                            fontFamily: 'Sora',
                            fontSize: 8,
                            fontWeight: 700,
                            color: '#C4302B',
                            marginLeft: 'auto',
                            flexShrink: 0,
                          }}
                        >
                          QUEIMADA
                        </span>
                      )}

                      {hasAnotherQfPick && !unavailable && !isSelected && (
                        <span
                          style={{
                            fontFamily: 'Sora',
                            fontSize: 8,
                            fontWeight: 700,
                            color: '#A07830',
                            marginLeft: 'auto',
                            flexShrink: 0,
                          }}
                        >
                          1/1
                        </span>
                      )}

                      {isSelected && (
                        <div
                          title="Toque para remover esta escolha"
                          style={{
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            background: '#1A3D28',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginLeft: 'auto',
                            flexShrink: 0,
                          }}
                        >
                          <Check size={10} color="#fff" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        <div style={{ textAlign: 'center', fontSize: 11, color: '#9CA3AF', marginTop: 8, fontFamily: 'Inter' }}>
          {marketOpen
            ? 'Sua escolha salva automaticamente. Para trocar, remova a atual primeiro.'
            : 'O mercado fechou — sua pick está definitiva.'}
        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
