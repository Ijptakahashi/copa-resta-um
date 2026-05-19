export function ShieldIcon({ active, size=22 }) {
  return (
    <svg width={size} height={Math.round(size*1.18)} viewBox="0 0 22 26" fill="none">
      <path d="M11 1.5L2.5 5.5v7.8c0 6.8 4.2 12.6 8.5 13.9C15.3 25.9 19.5 20.1 19.5 13.3V5.5L11 1.5z"
        fill={active?'#C9A44A':'none'}
        stroke={active?'#C9A44A':'#D4CABC'}
        strokeWidth="1.4" strokeLinejoin="round"/>
    </svg>
  )
}

export default function ShieldLives({ lives, max, size=22, showCount=true, showLabel=false }) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:5,flexWrap:'wrap'}}>
      {Array.from({length:max}).map((_,i)=>(
        <ShieldIcon key={i} active={i<lives} size={size}/>
      ))}
      {showCount && (
        <span style={{fontFamily:'Sora',fontWeight:700,fontSize:13,
          color:'#C9A44A',marginLeft:4}}>
          {lives} / {max}
          {showLabel && <span style={{fontSize:11,fontWeight:600,marginLeft:4,color:'rgba(201,164,74,.7)'}}>LIVES REMAINING</span>}
        </span>
      )}
    </div>
  )
}
