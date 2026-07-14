// ─── Bracket oficial das Semifinais (SF) ───
// Regra: 1 pick ÚNICO entre as 4 seleções (sem lados).
// Não pode repetir seleção já usada em qualquer fase do mata-mata.
export const SF_BRACKET = [
  {
    id: 1101,
    home: 'France',
    away: 'Spain',
    utc_date: '2026-07-14T19:00:00.000Z',
  },
  {
    id: 1102,
    home: 'England',
    away: 'Argentina',
    utc_date: '2026-07-15T19:00:00.000Z',
  },
]

export function teamsInSf() {
  const out = new Set()
  for (const m of SF_BRACKET) {
    out.add(m.home)
    out.add(m.away)
  }
  return [...out]
}

export function isInSf(teamName, canonFn) {
  const c = canonFn(teamName)
  return SF_BRACKET.some(
    m => canonFn(m.home) === c || canonFn(m.away) === c
  )
}
