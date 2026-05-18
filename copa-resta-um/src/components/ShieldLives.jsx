// Ícone de escudo igual ao mockup
export function ShieldIcon({ active, size = 26 }) {
  return (
    <span className={`shield-icon ${active ? 'active' : 'empty'}`}>
      <svg viewBox="0 0 24 28" style={{width:size,height:size*28/24}} fill="none">
        <path d="M12 1L2 5.5v8c0 6.8 4.3 13.2 10 14.5C17.7 26.7 22 20.3 22 13.5v-8L12 1z"
          fill={active ? '#D6B36A' : 'none'}
          stroke={active ? '#D6B36A' : '#D1D5DB'}
          strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
    </span>
  )
}

export default function ShieldLives({ lives, max, showCount = true }) {
  return (
    <div className="shields">
      {Array.from({ length: max }).map((_, i) => (
        <ShieldIcon key={i} active={i < lives} />
      ))}
      {showCount && (
        <div style={{marginLeft:6}}>
          <span className="shields-count">{lives}</span>
          <span className="shields-label"> / {max}</span>
        </div>
      )}
    </div>
  )
}
