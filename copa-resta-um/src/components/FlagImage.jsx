const CODE = {
  // English (canonical)
  'Algeria':'dz','Argentina':'ar','Australia':'au','Austria':'at','Belgium':'be',
  'Bosnia and Herzegovina':'ba','Bosnia & Herzegovina':'ba','Bosnia-Herzegovina':'ba','Bosnia':'ba',
  'Brazil':'br','Canada':'ca','Cape Verde':'cv','Colombia':'co',
  'Costa Rica':'cr','Croatia':'hr','Curacao':'cw',
  'Czech Republic':'cz','Czechia':'cz',
  'DR Congo':'cd','Congo DR':'cd','Ecuador':'ec','Egypt':'eg','England':'gb-eng',
  'France':'fr','Germany':'de','Ghana':'gh','Haiti':'ht','Honduras':'hn',
  'Iran':'ir','Iraq':'iq','Ivory Coast':'ci',"Côte d'Ivoire":'ci',"Cote d'Ivoire":'ci',
  'Jamaica':'jm','Japan':'jp','Jordan':'jo','Mexico':'mx','Morocco':'ma',
  'Netherlands':'nl','New Zealand':'nz','Nigeria':'ng','Norway':'no',
  'Panama':'pa','Paraguay':'py','Portugal':'pt','Qatar':'qa',
  'Saudi Arabia':'sa','Scotland':'gb-sct','Senegal':'sn',
  'South Africa':'za','South Korea':'kr','Korea Republic':'kr','Korea Rep.':'kr',
  'Spain':'es','Sweden':'se','Switzerland':'ch','Tunisia':'tn',
  'Turkey':'tr','Türkiye':'tr','United States':'us','USA':'us',
  'Uruguay':'uy','Uzbekistan':'uz','Venezuela':'ve','Chile':'cl',
  'Mali':'ml','Cameroon':'cm','Serbia':'rs','Poland':'pl','Denmark':'dk',
  'Wales':'gb-wls','Albania':'al','Slovenia':'si','Slovakia':'sk',
  'Romania':'ro','Hungary':'hu','Greece':'gr','Ukraine':'ua',
  // Portuguese-only names (not duplicating English above)
  'Brasil':'br','México':'mx','África do Sul':'za','Coreia do Sul':'kr',
  'República Tcheca':'cz','Tchéquia':'cz','Canadá':'ca',
  'Bósnia-Herzegovina':'ba','Catar':'qa','Suíça':'ch',
  'Marrocos':'ma','Escócia':'gb-sct','EUA':'us','Estados Unidos':'us',
  'Paraguai':'py','Austrália':'au','Turquia':'tr','Alemanha':'de',
  'Equador':'ec','Costa do Marfim':'ci','Curaçao':'cw',
  'Países Baixos':'nl','Holanda':'nl','Japão':'jp','Suécia':'se',
  'Tunísia':'tn','Bélgica':'be','Egito':'eg','Irã':'ir',
  'Nova Zelândia':'nz','Espanha':'es','Cabo Verde':'cv',
  'Arábia Saudita':'sa','Uruguai':'uy','França':'fr',
  'Iraque':'iq','Noruega':'no','Argélia':'dz','Áustria':'at',
  'Jordânia':'jo','RD Congo':'cd','Uzbequistão':'uz',
  'Colômbia':'co','Inglaterra':'gb-eng','Croácia':'hr','Panamá':'pa',
  'Gana':'gh','Camarões':'cm','Nigéria':'ng','Sérvia':'rs','Polônia':'pl',
  'Dinamarca':'dk',
}

export function countryCode(name) {
  return CODE[(name||'').trim()] || null
}

const DIMS = { xs:[24,17], sm:[36,25], md:[56,38], lg:[80,55], xl:[110,76] }

export default function FlagImage({ team, size='md', grayscale=false, style:extraStyle={}, className='' }) {
  const code = countryCode(team)
  const [w, h] = DIMS[size] || DIMS.md
  if (!code) return (
    <div style={{width:w,height:h,background:'#F3F0EA',borderRadius:4,display:'flex',
      alignItems:'center',justifyContent:'center',border:'1px solid #E5E7EB',...extraStyle}}
      className={className}>
      <span style={{fontSize:9,color:'#9CA3AF',fontFamily:'Sora',fontWeight:700}}>
        {(team||'?').slice(0,3).toUpperCase()}
      </span>
    </div>
  )
  return (
    <img src={`https://flagcdn.com/w${w*2}/${code}.png`}
      width={w} height={h} alt={team} loading="lazy"
      style={{borderRadius:4,objectFit:'cover',display:'block',flexShrink:0,
        border:'1px solid rgba(0,0,0,.08)',
        filter:grayscale?'grayscale(100%) opacity(.4)':'none',...extraStyle}}
      className={className}/>
  )
}
