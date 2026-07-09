export const R8_BRACKET = [
  {
    id: 53452525,
    home: 'France',
    away: 'Morocco',
    utc_date: '2026-07-09T20:00:00.000Z',
  },
  {
    id: 53452527,
    home: 'Spain',
    away: 'Belgium',
    utc_date: '2026-07-10T19:00:00.000Z',
  },
  {
    id: 53452529,
    home: 'Norway',
    away: 'England',
    utc_date: '2026-07-11T21:00:00.000Z',
  },
  {
    id: 53452531,
    home: 'Argentina',
    away: 'Switzerland',
    utc_date: '2026-07-12T01:00:00.000Z',
  },
]

export function teamsInR8(canonFn) {
  const out = new Set()
  for (const m of R8_BRACKET) {
    out.add(m.home)
    out.add(m.away)
  }
  return [...out]
}

export function isInR8(teamName, canonFn) {
  const c = canonFn(teamName)
  return R8_BRACKET.some(
    m => canonFn(m.home) === c || canonFn(m.away) === c
  )
}