// ─── Bracket oficial das Oitavas de Final (R16) ───
// Fonte única para a tela de pick e para as penalidades do backend.
// Regra desta fase: 1 pick por lado da chave.
export const R16_BRACKET = {
  left: [
    { home: 'Paraguay', away: 'France' },
    { home: 'Canada', away: 'Morocco' },
    { home: 'Portugal', away: 'Spain' },
    { home: 'United States', away: 'Belgium' },
  ],
  right: [
    { home: 'Brazil', away: 'Norway' },
    { home: 'Mexico', away: 'England' },
    { home: 'Argentina', away: 'Egypt' },
    { home: 'Colombia', away: 'Switzerland' },
  ],
}

export function sideOfTeamR16(teamName, canonFn) {
  const c = canonFn(teamName)
  for (const side of ['left', 'right']) {
    for (const m of R16_BRACKET[side]) {
      if (canonFn(m.home) === c || canonFn(m.away) === c) return side
    }
  }
  return null
}
