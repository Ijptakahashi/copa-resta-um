// ─── Bracket oficial do R32 (fonte única — usado pela tela de pick E pelo backend) ───
// Baseado no chaveamento oficial (The Athletic / BBC).
export const R32_BRACKET = {
  left: [
    { home: 'Germany', away: 'Paraguay' },
    { home: 'France', away: 'Sweden' },
    { home: 'South Africa', away: 'Canada' },
    { home: 'Netherlands', away: 'Morocco' },
    { home: 'Portugal', away: 'Croatia' },
    { home: 'Spain', away: 'Austria' },
    { home: 'United States', away: 'Bosnia and Herzegovina' },
    { home: 'Belgium', away: 'Senegal' },
  ],
  right: [
    { home: 'Brazil', away: 'Japan' },
    { home: 'Ivory Coast', away: 'Norway' },
    { home: 'Mexico', away: 'Ecuador' },
    { home: 'England', away: 'DR Congo' },
    { home: 'Argentina', away: 'Cape Verde' },
    { home: 'Australia', away: 'Egypt' },
    { home: 'Switzerland', away: 'Algeria' },
    { home: 'Colombia', away: 'Ghana' },
  ],
}

export function sideOfTeam(teamName, canonFn) {
  const c = canonFn(teamName)
  for (const side of ['left', 'right']) {
    for (const m of R32_BRACKET[side]) {
      if (canonFn(m.home) === c || canonFn(m.away) === c) return side
    }
  }
  return null
}
