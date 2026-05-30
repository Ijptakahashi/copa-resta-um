import { NavLink, useNavigate } from 'react-router-dom'
import { Home, Shield, Trophy, MessageCircle, User, LogOut } from 'lucide-react'

const NAV = [
  {to:'/dashboard', Icon:Home,          label:'Dashboard'},
  {to:'/pick',      Icon:Shield,         label:'Picks'},
  {to:'/rankings',  Icon:Trophy,         label:'Leaderboard'},
  {to:'/chat',      Icon:MessageCircle,  label:'Chat'},
  {to:'/profile',   Icon:User,           label:'Profile'},
]

export default function Navbar({ player, onLogout }) {
  const navigate = useNavigate()
  function logout() { localStorage.removeItem('copa_player'); onLogout(); navigate('/') }

  return (
    <>
      {/* Topbar */}
      <header style={{position:'sticky',top:0,zIndex:100,background:'#fff',
        borderBottom:'1px solid rgba(0,0,0,.07)',height:54,
        display:'flex',alignItems:'center',justifyContent:'space-between',
        padding:'0 16px',boxShadow:'0 1px 8px rgba(0,0,0,.05)'}}>
        {/* Logo */}
        <div style={{display:'flex',alignItems:'center',gap:9}}>
          <div style={{width:32,height:32,borderRadius:8,
            background:'linear-gradient(145deg,#1A3D28,#0D2117)',
            display:'flex',alignItems:'center',justifyContent:'center',
            boxShadow:'0 2px 8px rgba(26,61,40,.3)'}}>
            <Trophy size={16} color="#C9A44A" strokeWidth={2}/>
          </div>
          <div>
            <div style={{fontFamily:'Sora',fontWeight:800,fontSize:11,
              color:'#1A3D28',letterSpacing:'.06em',lineHeight:1.1}}>SURVIVOR</div>
            <div style={{fontFamily:'Sora',fontWeight:700,fontSize:10,
              color:'#C9A44A',letterSpacing:'.1em',lineHeight:1.1}}>POOL 2026</div>
          </div>
        </div>
        {/* Player */}
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{width:30,height:30,borderRadius:'50%',overflow:'hidden',
              border:'2px solid #C9A44A',background:'#F3F0EA',
              display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              {player?.avatar_url
                ? <img src={player.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>
                : <span style={{fontSize:16,lineHeight:1}}>{player?.avatar||'⚽'}</span>
              }
            </div>
            <span style={{fontFamily:'Sora',fontWeight:600,fontSize:13,color:'#1A1A1A',
              maxWidth:90,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
              {player?.name}
            </span>
          </div>
          <button onClick={logout} style={{display:'flex',alignItems:'center',gap:4,
            padding:'5px 9px',borderRadius:8,background:'#F3F0EA',
            fontSize:11,fontFamily:'Sora',fontWeight:600,color:'#6B6B6B',
            transition:'background .15s'}}
            onMouseEnter={e=>e.currentTarget.style.background='#E8E3DB'}
            onMouseLeave={e=>e.currentTarget.style.background='#F3F0EA'}>
            <LogOut size={12}/> Sair
          </button>
        </div>
      </header>

      {/* Bottom nav */}
      <nav style={{position:'fixed',bottom:0,left:0,right:0,zIndex:100,
        background:'#fff',borderTop:'1px solid rgba(0,0,0,.07)',
        display:'flex',paddingBottom:'env(safe-area-inset-bottom,0px)',
        boxShadow:'0 -2px 16px rgba(0,0,0,.06)'}}>
        {NAV.map(({to,Icon,label})=>(
          <NavLink key={to} to={to}
            style={({isActive})=>({
              flex:1,display:'flex',flexDirection:'column',alignItems:'center',
              padding:'10px 2px 8px',color:isActive?'#1A3D28':'#B0A898',
              fontFamily:'Sora',fontSize:8,fontWeight:700,
              letterSpacing:'.06em',textTransform:'uppercase',gap:3,
              transition:'color .15s',
            })}>
            {({isActive})=>(
              <>
                <Icon size={20} strokeWidth={isActive?2.5:1.8}/>
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </>
  )
}
