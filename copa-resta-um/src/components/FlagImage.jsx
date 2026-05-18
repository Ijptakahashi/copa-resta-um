// Bandeiras reais via flagcdn.com
const CODE = {
  // Português
  'Brasil':'br','México':'mx','África do Sul':'za','Coreia do Sul':'kr',
  'República Tcheca':'cz','Canadá':'ca','Bósnia-Herzegovina':'ba',
  'Qatar':'qa','Suíça':'ch','Marrocos':'ma','Escócia':'gb-sct','Haiti':'ht',
  'EUA':'us','Paraguai':'py','Austrália':'au','Turquia':'tr',
  'Alemanha':'de','Equador':'ec','Costa do Marfim':'ci','Curaçao':'cw',
  'Países Baixos':'nl','Japão':'jp','Suécia':'se','Tunísia':'tn',
  'Bélgica':'be','Egito':'eg','Irã':'ir','Nova Zelândia':'nz',
  'Espanha':'es','Cabo Verde':'cv','Arábia Saudita':'sa','Uruguai':'uy',
  'França':'fr','Senegal':'sn','Iraque':'iq','Noruega':'no',
  'Argentina':'ar','Argélia':'dz','Áustria':'at','Jordânia':'jo',
  'Portugal':'pt','RD Congo':'cd','Uzbequistão':'uz','Colômbia':'co',
  'Inglaterra':'gb-eng','Croácia':'hr','Panamá':'pa','Gana':'gh',
  'Honduras':'hn','Jamaica':'jm','Venezuela':'ve','Chile':'cl',
  'Mali':'ml','Camarões':'cm','Nigéria':'ng',
  // Inglês
  'Brazil':'br','Mexico':'mx','South Africa':'za','South Korea':'kr',
  'Czech Republic':'cz','Czechia':'cz','Canada':'ca',
  'Bosnia and Herzegovina':'ba','Bosnia':'ba',
  'Switzerland':'ch','Morocco':'ma','Scotland':'gb-sct',
  'United States':'us','Paraguay':'py','Australia':'au','Turkey':'tr',
  'Germany':'de','Ecuador':'ec',"Côte d'Ivoire":'ci','Ivory Coast':'ci',
  "Cote d'Ivoire":'ci','Curacao':'cw',
  'Netherlands':'nl','Japan':'jp','Sweden':'se','Tunisia':'tn',
  'Belgium':'be','Egypt':'eg','Iran':'ir','New Zealand':'nz',
  'Spain':'es','Cape Verde':'cv','Saudi Arabia':'sa','Uruguay':'uy',
  'France':'fr','Senegal':'sn','Iraq':'iq','Norway':'no',
  'Argentina':'ar','Algeria':'dz','Austria':'at','Jordan':'jo',
  'Portugal':'pt','DR Congo':'cd','Congo DR':'cd','Uzbekistan':'uz',
  'Colombia':'co','England':'gb-eng','Croatia':'hr','Panama':'pa','Ghana':'gh',
  'Honduras':'hn','Jamaica':'jm','Venezuela':'ve','Chile':'cl',
  'Mali':'ml','Cameroon':'cm','Nigeria':'ng',
}

export function countryCode(name) { return CODE[name] || null }

export default function FlagImage({ team, size = 'md', className = '', grayscale = false }) {
  const code = countryCode(team)
  const dims = { sm: [32,22], md: [52,36], lg: [80,56], xl: [110,76] }
  const [w, h] = dims[size] || dims.md

  const style = grayscale
    ? { filter: 'grayscale(100%) opacity(0.45)' }
    : {}

  if (!code) {
    return (
      <div style={{ width: w, height: h, background: '#E5E7EB',
        borderRadius: 4, display:'flex', alignItems:'center', justifyContent:'center',
        fontSize: Math.floor(h*0.5), ...style }} className={className}>
        🏳️
      </div>
    )
  }

  return (
    <img
      src={`https://flagcdn.com/w${w}/${code}.png`}
      srcSet={`https://flagcdn.com/w${w*2}/${code}.png 2x`}
      width={w} height={h}
      alt={team}
      style={{ borderRadius: 4, objectFit: 'cover', display:'block', ...style }}
      className={`flag-img ${size} ${className}`}
    />
  )
}
