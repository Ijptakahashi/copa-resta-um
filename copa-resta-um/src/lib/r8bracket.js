// ─── Bracket oficial das Quartas de Final (QF / R8) ───
// Fonte única para a tela de pick e para as penalidades do backend.
// Regra desta fase: 1 pick ÚNICO entre as 8 seleções (sem divisão de lados).
export const R8_BRACKET = [
  { home: 'France',    away: 'Morocco' },
  { home: 'Spain',     away: 'Belgium' },
  { home: 'Norway',    away: 'England' },
  { home: 'Argentina', away: 'Switzerland' },
]

// Lista achatada das 8 seleções em jogo (para validação de disponibilidade).
export function teamsInR8(canonFn) {
  const out = new Set()
  for (const m of R8_BRACKET) { out.add(m.home); out.add(m.away) }
  return [...out]
}

// Confere se um time está no chaveamento das quartas.
export function isInR8(teamName, canonFn) {
  const c = canonFn(teamName)
  return R8_BRACKET.some(m => canonFn(m.home) === c || canonFn(m.away) === c)
}
