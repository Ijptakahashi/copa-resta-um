import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, RefreshCw } from 'lucide-react'
import { getPlayerPicks, getMatches, getAllPicks, getPlayers } from '../lib/supabase'
import {
  computeLives,
  todayBrasilia,
  toLocalDateISO,
  isPickOpen,
  pickDeadline,
  r32Deadline,
  isR32Open,
  r16Deadline,
  isR16Open,
  qfDeadline,
  isQfOpen,
  canonTeam,
} from '../lib/gameLogic'
import { sideOfTeam as sideOfTeamR32 } from '../lib/r32bracket'
import { sideOfTeamR16 } from '../lib/r16bracket'
import { ShieldIcon } from '../components/ShieldLives'
import { countryCode } from '../components/FlagImage'
import Avatar from '../components/Avatar'
import { DashboardSkeleton } from '../components/Skeletons'

const PHASE_INFO = {
  groups: { label: 'Fase de grupos', route: '/pick', reveal: 'PICKS DO DIA' },
  r32: { label: 'R32', route: '/r32', reveal: 'PICKS DO R32', description: '2 picks no lado esquerdo + 2 picks no lado direito' },
  r16: { label: 'Oitavas', route: '/r16', reveal: 'PICKS DAS OITAVAS', description: '1 pick no lado esquerdo + 1 pick no lado direito' },
  qf: { label: 'Quartas', route: '/qf', reveal: 'PICKS DAS QUARTAS', description: '1 pick única na fase inteira — sem divisão por lados' },
}

function withTimeout(promise, ms, fallback) {
  return Promise.race([
    promise,
    new Promise(resolve => setTimeout(() => resolve(fallback), ms)),
  ])
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

function flagUrl(team, width = 80) {
  const code = countryCode(team)
  return code ? `https://flagcdn.com/w${width}/${code}.png` : null
}

function FlagBubble({ team, size = 34, faded = false }) {
  const src = flagUrl(team, size <= 40 ? 40 : 80)
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      overflow: 'hidden',
      background: '#F8F4EE',
      border: '1.5px solid rgba(0,0,0,.08)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: faded ? .45 : 1,
      flexShrink: 0,
    }}>
      {src ? (
        <img src={src} alt={team} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span style={{ fontFamily: 'Sora', fontSize: 9, fontWeight: 800, color: '#9CA3AF' }}>
          {(team || '?').slice(0, 3).toUpperCase()}
        </span>
      )}
    </div>
  )
}

function Countdown({ target }) {
  const [left, setLeft] = useState({ h: '--', m: '--', s: '--' })

  useEffect(() => {
    function tick() {
      const diff = new Date(target).getTime() - Date.now()
      if (diff <= 0) {
        setLeft({ h: '00', m: '00', s: '00' })
        return
      }
      setLeft({
        h: String(Math.floor(diff / 3600000)).padStart(2, '0'),
        m: String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0'),
        s: String(Math.floor((diff % 60000) / 1000)).padStart(2, '0'),
      })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [target])

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4 }}>
      {[left.h, left.m, left.s].map((value, index) => (
        <span key={index} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{
            fontFamily: 'Sora',
            fontWeight: 800,
            fontSize: 24,
            color: '#1A3D28',
            background: '#fff',
            borderRadius: 8,
            padding: '4px 10px',
            border: '1px solid rgba(0,0,0,.07)',
            lineHeight: 1,
            boxShadow: '0 1px 4px rgba(0,0,0,.06)',
          }}>
            {value}
          </span>
          {index < 2 && <span style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 20, color: '#C9A44A' }}>:</span>}
        </span>
      ))}
    </div>
  )
}

function Card({ children, onClick, style = {} }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        border: '1px solid rgba(0,0,0,.07)',
        boxShadow: '0 2px 12px rgba(0,0,0,.05)',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function SectionTitle({ children, right }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
      <div style={{
        fontFamily: 'Sora',
        fontWeight: 700,
        fontSize: 10,
        letterSpacing: '.1em',
        textTransform: 'uppercase',
        color: '#6B6B6B',
      }}>
        {children}
      </div>
      {right}
    </div>
  )
}

function phaseFromMatchesAndPicks(matches, playerPicks) {
  const hasQf = matches.some(m => m.stage === 'QUARTER_FINALS')
  const hasR16 = matches.some(m => m.stage === 'ROUND_OF_16')
  const hasR32 = matches.some(m => m.stage === 'ROUND_OF_32')
  const pickedQf = playerPicks.some(p => p.phase === 'qf')
  const pickedR16 = playerPicks.some(p => p.phase === 'r16')
  const pickedR32 = playerPicks.some(p => p.phase === 'r32')

  if (hasQf || pickedQf) return 'qf'
  if (hasR16 && (!isR16Open(matches) || pickedR16)) return 'r16'
  if (hasR32 && (!isR32Open(matches) || pickedR32)) return 'r32'
  return 'groups'
}

function deadlineForPhase(phase, matches, todayMatches) {
  if (phase === 'qf') return qfDeadline(matches)
  if (phase === 'r16') return r16Deadline(matches)
  if (phase === 'r32') return r32Deadline(matches)
  return pickDeadline(todayMatches)
}

function isPhaseOpen(phase, matches, todayMatches) {
  if (phase === 'qf') return isQfOpen(matches)
  if (phase === 'r16') return isR16Open(matches)
  if (phase === 'r32') return isR32Open(matches)
  return isPickOpen(todayMatches)
}

function sideForPick(phase, teamName) {
  if (phase === 'r32') return sideOfTeamR32(teamName, canonTeam)
  if (phase === 'r16') return sideOfTeamR16(teamName, canonTeam)
  return null
}

function playerSlots(playerId, allPicks, phase) {
  const picks = allPicks.filter(p => p.player_id === playerId && p.phase === phase && p.team_name !== 'no_pick')

  if (phase === 'qf') return [picks[0] || null]

  const left = picks.filter(p => sideForPick(phase, p.team_name) === 'left')
  const right = picks.filter(p => sideForPick(phase, p.team_name) === 'right')

  if (phase === 'r16') return [left[0] || null, right[0] || null]
  return [left[0] || null, left[1] || null, right[0] || null, right[1] || null]
}

function MyKnockoutCard({ phase, picks, open, onClick }) {
  const info = PHASE_INFO[phase]
  const phasePicks = picks.filter(p => p.phase === phase && p.team_name !== 'no_pick')

  let content
  if (phase === 'qf') {
    content = [{ label: 'SUA SELEÇÃO', count: phasePicks.length ? 1 : 0, max: 1 }]
  } else {
    const left = phasePicks.filter(p => sideForPick(phase, p.team_name) === 'left').length
    const right = phasePicks.filter(p => sideForPick(phase, p.team_name) === 'right').length
    const max = phase === 'r16' ? 1 : 2
    content = [
      { label: 'ESQUERDO', count: left, max },
      { label: 'DIREITO', count: right, max },
    ]
  }

  return (
    <Card onClick={onClick}>
      <SectionTitle
        right={!open && (
          <span style={{ fontFamily: 'Sora', fontSize: 9, fontWeight: 700, color: '#1A3D28', background: '#EBF5EE', padding: '3px 8px', borderRadius: 12 }}>
            FECHADO
          </span>
        )}
      >
        {`SUAS PICKS — ${info.label}`}
      </SectionTitle>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        {content.map(item => {
          const done = item.count >= item.max
          return (
            <div key={item.label} style={{
              flex: phase === 'qf' ? '0 1 220px' : 1,
              background: done ? 'rgba(201,164,74,.08)' : '#F8F4EE',
              borderRadius: 12,
              padding: 14,
              textAlign: 'center',
              border: `1.5px solid ${done ? 'rgba(201,164,74,.35)' : 'rgba(0,0,0,.06)'}`,
            }}>
              <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 9, letterSpacing: '.08em', color: '#9A9384', marginBottom: 4 }}>
                {item.label}
              </div>
              <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 22, color: done ? '#A07830' : '#1A3D28' }}>
                {item.count}/{item.max}
              </div>
              {done && <div style={{ fontFamily: 'Sora', fontSize: 8, fontWeight: 700, color: '#A07830', marginTop: 2 }}>✓ CONFIRMADO</div>}
            </div>
          )
        })}
      </div>

      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#C9A44A', fontFamily: 'Sora', fontWeight: 700, fontSize: 11 }}>
        <span>{open ? 'TOCAR PARA ESCOLHER' : 'VER PICKS'}</span>
        <ChevronRight size={14} />
      </div>
    </Card>
  )
}

function TodayPickCard({ todayMatches, todayPick, pickOpen, today, navigate }) {
  return (
    <Card>
      <SectionTitle
        right={<div style={{ fontFamily: 'Sora', fontSize: 10, fontWeight: 700, color: '#C9A44A' }}>{today}</div>}
      >
        TODAY'S PICK
      </SectionTitle>

      {todayMatches.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '12px 0', color: '#9CA3AF', fontSize: 14, fontFamily: 'Inter' }}>
          Sem jogos hoje
        </div>
      ) : todayPick ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <FlagBubble team={todayPick.team_name} size={44} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 15 }}>{todayPick.team_name}</div>
            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>Pick confirmada ✓</div>
          </div>
          {todayPick.result && (
            <span style={{
              fontFamily: 'Sora',
              fontSize: 10,
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: 12,
              background: todayPick.result === 'win' ? '#EBF5EE' : todayPick.result === 'loss' ? '#FEF0EF' : '#EFF6FF',
              color: todayPick.result === 'win' ? '#1A3D28' : todayPick.result === 'loss' ? '#C4302B' : '#2563EB',
            }}>
              {todayPick.result === 'win' ? '✓ ACERTOU' : todayPick.result === 'loss' ? '✗ ERROU' : '= EMPATE'}
            </span>
          )}
        </div>
      ) : pickOpen ? (
        <button onClick={() => navigate('/pick')} style={{
          width: '100%',
          padding: 13,
          borderRadius: 12,
          border: 'none',
          background: 'linear-gradient(135deg,#1A3D28,#1E5235)',
          color: '#fff',
          fontFamily: 'Sora',
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: '.06em',
          textTransform: 'uppercase',
          cursor: 'pointer',
        }}>
          MAKE YOUR PICK
        </button>
      ) : (
        <div style={{ textAlign: 'center', padding: '12px 0', color: '#9CA3AF', fontSize: 13, fontFamily: 'Inter' }}>
          Prazo encerrado para hoje
        </div>
      )}
    </Card>
  )
}

function PicksReveal({ phase, allPlayers, allPicks, open, deadline, today }) {
  const isGroups = phase === 'groups'
  const info = PHASE_INFO[phase]
  const revealed = !open

  return (
    <Card>
      <SectionTitle
        right={revealed ? (
          <span style={{ fontFamily: 'Sora', fontSize: 9, fontWeight: 700, color: '#1A3D28', background: '#EBF5EE', padding: '3px 8px', borderRadius: 12 }}>
            REVELADO
          </span>
        ) : deadline ? (
          <div style={{ fontFamily: 'Sora', fontSize: 10, fontWeight: 600, color: '#9CA3AF' }}>
            revela às {formatTime(deadline)}
          </div>
        ) : null}
      >
        {isGroups ? 'PICKS DO DIA' : info.reveal}
      </SectionTitle>

      {!isGroups && (
        <div style={{ fontFamily: 'Inter', fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginBottom: 14 }}>
          {info.description}
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center' }}>
        {allPlayers.map(player => {
          const playerPicks = allPicks.filter(p => p.player_id === player.id)
          const eliminated = computeLives(playerPicks).lives <= 0
          const slots = isGroups
            ? [allPicks.find(p => p.player_id === player.id && p.pick_date === today) || null]
            : playerSlots(player.id, allPicks, phase)

          return (
            <div key={player.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: phase === 'qf' ? 72 : 88, opacity: eliminated ? .6 : 1 }}>
              <Avatar name={player.name} photoUrl={player.avatar_url} size={34} ring={eliminated ? '#C4302B' : null} dim={eliminated} />
              <div style={{ fontFamily: 'Sora', fontWeight: 600, fontSize: 9, textAlign: 'center', color: '#6B6B6B', lineHeight: 1.2, width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {player.name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, width: '100%' }}>
                {slots.map((pick, index) => {
                  const separator = !isGroups && phase !== 'qf' && ((phase === 'r16' && index === 1) || (phase === 'r32' && index === 2))
                  return (
                    <span key={index} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {separator && <span style={{ width: 1, height: 18, background: 'rgba(0,0,0,.12)' }} />}
                      {revealed && pick && pick.team_name !== 'no_pick' ? (
                        <FlagBubble team={pick.team_name} size={phase === 'qf' ? 28 : 22} />
                      ) : (
                        <span style={{
                          width: phase === 'qf' ? 28 : 22,
                          height: phase === 'qf' ? 28 : 22,
                          borderRadius: '50%',
                          background: pick ? 'rgba(0,0,0,.15)' : 'rgba(0,0,0,.06)',
                          border: '1px solid rgba(0,0,0,.08)',
                        }} />
                      )}
                    </span>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function Casualties({ allPlayers, allPicks, phase }) {
  if (phase === 'groups') return null

  const fallen = allPlayers.map(player => {
    const losses = allPicks.filter(p => p.player_id === player.id && p.phase === phase && p.team_name !== 'no_pick' && p.result === 'loss')
    return losses.length ? { player, losses } : null
  }).filter(Boolean)

  if (!fallen.length) return null

  return (
    <Card style={{ background: '#FEF0EF', border: '1px solid rgba(196,48,43,.25)', boxShadow: '0 2px 12px rgba(196,48,43,.08)' }}>
      <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: '#C4302B', marginBottom: 10 }}>
        💀 Baixas — {PHASE_INFO[phase]?.label || phase}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {fallen.map(({ player, losses }) => (
          <div key={player.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar name={player.name} photoUrl={player.avatar_url} size={28} ring="#C4302B" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 13, color: '#1A1A1A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {player.name}
              </div>
              <div style={{ fontFamily: 'Inter', fontSize: 11, color: '#9B3A35' }}>
                caiu com {losses.map(p => p.team_name).join(', ')} · −{losses.length} vida{losses.length > 1 ? 's' : ''}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {losses.map(p => <FlagBubble key={p.id} team={p.team_name} size={22} faded />)}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

export default function Dashboard({ player }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [picks, setPicks] = useState([])
  const [allPicks, setAllPicks] = useState([])
  const [allPlayers, setAllPlayers] = useState([])
  const [matches, setMatches] = useState([])
  const [todayMatches, setTodayMatches] = useState([])
  const [todayPick, setTodayPick] = useState(null)
  const [leaders, setLeaders] = useState([])
  const [nextMatch, setNextMatch] = useState(null)

  const today = todayBrasilia()

  useEffect(() => {
    load()
    const onVisible = () => {
      if (document.visibilityState === 'visible') load()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [player.id])

  async function load() {
    setLoading(true)
    try {
      const [playerPicks, allMatches, everyPick, players] = await Promise.all([
        withTimeout(getPlayerPicks(player.id), 8000, []),
        withTimeout(getMatches(), 8000, []),
        withTimeout(getAllPicks(), 8000, []),
        withTimeout(getPlayers(), 8000, []),
      ])

      const todays = allMatches.filter(m => toLocalDateISO(m.utc_date) === today)
      const upcoming = [...allMatches]
        .filter(m => m.status === 'SCHEDULED' && new Date(m.utc_date) > new Date())
        .sort((a, b) => new Date(a.utc_date) - new Date(b.utc_date))[0] || null

      const ranking = players.map(p => {
        const pp = everyPick.filter(pk => pk.player_id === p.id)
        const { lives } = computeLives(pp)
        return {
          ...p,
          lives,
          correct: pp.filter(pk => pk.result === 'win').length,
          eliminated: lives <= 0,
        }
      }).sort((a, b) => b.lives - a.lives || b.correct - a.correct || a.name.localeCompare(b.name))

      setPicks(playerPicks)
      setMatches(allMatches)
      setAllPicks(everyPick)
      setAllPlayers(players)
      setTodayMatches(todays)
      setTodayPick(playerPicks.find(p => p.pick_date === today && p.phase === 'groups') || playerPicks.find(p => p.pick_date === today) || null)
      setNextMatch(upcoming)
      setLeaders(ranking.slice(0, 5))
    } catch (error) {
      console.error('Dashboard load() falhou:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleRefresh() {
    setSyncing(true)
    try {
      await load()
    } finally {
      setSyncing(false)
    }
  }

  if (loading) return <DashboardSkeleton />

  const phase = phaseFromMatchesAndPicks(matches, picks)
  const phaseInfo = PHASE_INFO[phase]
  const deadline = deadlineForPhase(phase, matches, todayMatches)
  const phaseOpen = isPhaseOpen(phase, matches, todayMatches)
  const { lives } = computeLives(picks)
  const myRank = leaders.findIndex(p => p.id === player.id) + 1
  const maxLives = 6

  return (
    <div className="page">
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: '#9CA3AF', fontFamily: 'Sora', fontWeight: 500 }}>Welcome back,</div>
        <div style={{ fontFamily: 'Sora', fontSize: 26, fontWeight: 800, color: '#1A1A1A', letterSpacing: '-.5px', lineHeight: 1.1 }}>
          {player.name}
        </div>
        {myRank > 0 && (
          <div style={{ fontSize: 12, color: '#C9A44A', fontFamily: 'Sora', fontWeight: 700, marginTop: 2 }}>
            #{myRank} no ranking
          </div>
        )}
      </div>

      <div className="fade-up fade-up-1" style={{
        background: 'linear-gradient(135deg,#162E1E,#1A3D28)',
        borderRadius: 16,
        padding: 20,
        marginBottom: 12,
        boxShadow: '0 4px 24px rgba(22,46,30,.3)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 130, height: 130, borderRadius: '50%', background: 'rgba(201,164,74,.06)' }} />
        <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(201,164,74,.7)', marginBottom: 12 }}>
          YOUR LIVES
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
          {Array.from({ length: maxLives }).map((_, i) => (
            <ShieldIcon key={i} active={i < lives} size={26} />
          ))}
        </div>
        <div style={{ marginTop: 10, fontFamily: 'Sora', fontWeight: 700, fontSize: 12, color: '#C9A44A', letterSpacing: '.06em' }}>
          {lives} / {maxLives} LIVES REMAINING
        </div>
      </div>

      {phase === 'groups' ? (
        <TodayPickCard
          todayMatches={todayMatches}
          todayPick={todayPick}
          pickOpen={phaseOpen}
          today={today}
          navigate={navigate}
        />
      ) : (
        <MyKnockoutCard
          phase={phase}
          picks={picks}
          open={phaseOpen}
          onClick={() => navigate(phaseInfo.route)}
        />
      )}

      <Casualties allPlayers={allPlayers} allPicks={allPicks} phase={phase} />

      <PicksReveal
        phase={phase}
        allPlayers={allPlayers}
        allPicks={allPicks}
        open={phaseOpen}
        deadline={deadline}
        today={today}
      />

      {nextMatch && (
        <Card style={{ textAlign: 'center', padding: '20px 16px' }}>
          <div style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: '#6B6B6B', marginBottom: 14 }}>
            NEXT MATCH STARTS IN
          </div>
          <Countdown target={nextMatch.utc_date} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <FlagBubble team={nextMatch.home_team} size={24} />
            <span style={{ fontFamily: 'Sora', fontWeight: 600, fontSize: 12 }}>{nextMatch.home_team}</span>
            <span style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'Sora', fontWeight: 600 }}>vs</span>
            <span style={{ fontFamily: 'Sora', fontWeight: 600, fontSize: 12 }}>{nextMatch.away_team}</span>
            <FlagBubble team={nextMatch.away_team} size={24} />
          </div>
        </Card>
      )}

      {leaders.length > 0 && (
        <Card>
          <SectionTitle
            right={(
              <button onClick={() => navigate('/rankings')} style={{ display: 'flex', alignItems: 'center', gap: 2, fontFamily: 'Sora', fontWeight: 700, fontSize: 10, color: '#C9A44A', letterSpacing: '.06em', background: 'none', border: 'none', cursor: 'pointer' }}>
                VIEW ALL <ChevronRight size={12} />
              </button>
            )}
          >
            LEADERBOARD
          </SectionTitle>

          {leaders.map((leader, index) => {
            const isMe = leader.id === player.id
            return (
              <div key={leader.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 0',
                borderBottom: index < leaders.length - 1 ? '1px solid rgba(0,0,0,.05)' : 'none',
                background: isMe ? 'rgba(201,164,74,.06)' : 'transparent',
                borderRadius: isMe ? 8 : 0,
                paddingLeft: isMe ? 8 : 0,
                paddingRight: isMe ? 8 : 0,
                opacity: leader.eliminated ? .5 : 1,
              }}>
                <div style={{ fontFamily: 'Sora', fontWeight: 800, fontSize: 14, width: 18, textAlign: 'center', color: index < 3 ? '#C9A44A' : '#9CA3AF', flexShrink: 0 }}>
                  {index + 1}
                </div>
                <Avatar name={leader.name} photoUrl={leader.avatar_url} size={32} ring={isMe ? 'rgba(201,164,74,.5)' : null} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'Sora', fontWeight: 600, fontSize: 13, color: '#1A1A1A' }}>
                    {leader.name}{isMe ? ' (você)' : ''}
                  </div>
                </div>
                {leader.eliminated ? (
                  <span style={{ fontFamily: 'Sora', fontSize: 10, fontWeight: 700, color: '#C4302B' }}>💀</span>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    {Array.from({ length: maxLives }).map((_, i) => (
                      <ShieldIcon key={i} active={i < leader.lives} size={15} />
                    ))}
                    <span style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 13, color: '#1A1A1A', marginLeft: 4 }}>
                      {leader.lives}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </Card>
      )}

      <button onClick={handleRefresh} disabled={syncing} style={{
        width: '100%',
        padding: 12,
        borderRadius: 12,
        border: '1px solid rgba(0,0,0,.07)',
        background: '#fff',
        color: '#6B6B6B',
        fontFamily: 'Sora',
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: '.06em',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        boxShadow: '0 1px 4px rgba(0,0,0,.04)',
      }}>
        <RefreshCw size={13} style={syncing ? { animation: 'spin 1s linear infinite' } : {}} />
        {syncing ? 'RECARREGANDO...' : 'RECARREGAR DADOS'}
      </button>
    </div>
  )
}