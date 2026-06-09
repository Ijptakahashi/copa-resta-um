// Avatar profissional: foto de perfil OU iniciais em fundo colorido gerado pelo nome.
// Substitui emojis em todo o app por um visual limpo estilo Google/Slack/Notion.

const PALETTE = [
  ['#1A3D28','#2D6A4F'], // verde
  ['#A07830','#C9A44A'], // dourado
  ['#7C2D12','#B45309'], // âmbar queimado
  ['#1E3A5F','#2563EB'], // azul
  ['#4A1D52','#7E22CE'], // roxo
  ['#7F1D1D','#C4302B'], // vermelho
  ['#134E4A','#0D9488'], // teal
  ['#3F3F46','#71717A'], // grafite
]

function nameToIndex(name='') {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return h % PALETTE.length
}

function initials(name='') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function Avatar({ name, photoUrl, size = 40, ring = null, dim = false }) {
  const [c1, c2] = PALETTE[nameToIndex(name)]
  const border = ring ? `2px solid ${ring}` : '1.5px solid rgba(0,0,0,.08)'
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', overflow: 'hidden',
      flexShrink: 0, border,
      background: photoUrl ? '#F3F0EA' : `linear-gradient(135deg, ${c1}, ${c2})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      opacity: dim ? 0.5 : 1,
    }}>
      {photoUrl
        ? <img src={photoUrl} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt={name}/>
        : <span style={{
            fontFamily:'Sora', fontWeight:700, color:'#fff',
            fontSize: size * 0.38, letterSpacing:'.02em', lineHeight:1,
            textShadow:'0 1px 2px rgba(0,0,0,.15)',
          }}>{initials(name)}</span>
      }
    </div>
  )
}

export { initials, PALETTE, nameToIndex }
