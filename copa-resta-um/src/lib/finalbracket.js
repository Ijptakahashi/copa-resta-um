// ─── Bracket oficial da FINAL ───
// Regra: 1 pick ÚNICA entre as 2 seleções.
export const FINAL_BRACKET = [
  {
    id: 1104,
    home: 'Argentina',
    away: 'Spain',
    utc_date: '2026-07-19T19:00:00.000Z',
  },
]

export function teamsInFinal() {
  const out = new Set()
  for (const m of FINAL_BRACKET) {
    out.add(m.home)
    out.add(m.away)
  }
  return [...out]
}

export function isInFinal(teamName, canonFn) {
  const c = canonFn(teamName)
  return FINAL_BRACKET.some(
    m => canonFn(m.home) === c || canonFn(m.away) === c
  )
}
