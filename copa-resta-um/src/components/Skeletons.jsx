// Skeleton loaders — imitam o layout real enquanto os dados carregam.
// A classe .skeleton (shimmer cinza pulsante) está definida no index.css.

function Box({ w='100%', h=16, r=8, mb=0, style={} }) {
  return <div className="skeleton" style={{ width:w, height:h, borderRadius:r, marginBottom:mb, ...style }}/>
}

function Circle({ size=40, style={} }) {
  return <div className="skeleton" style={{ width:size, height:size, borderRadius:'50%', flexShrink:0, ...style }}/>
}

function Card({ children, style={} }) {
  return (
    <div style={{ background:'#fff', borderRadius:16, padding:16, marginBottom:12,
      border:'1px solid rgba(0,0,0,.07)', boxShadow:'0 2px 12px rgba(0,0,0,.05)', ...style }}>
      {children}
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="page">
      <Box w="55%" h={14} mb={8}/>
      <Box w="70%" h={26} mb={24} r={6}/>
      {/* Lives card */}
      <div className="skeleton" style={{ height:118, borderRadius:16, marginBottom:12 }}/>
      {/* Today's pick */}
      <Card>
        <Box w="40%" h={12} mb={16}/>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <Circle size={44}/>
          <div style={{ flex:1 }}><Box w="60%" h={15} mb={6}/><Box w="40%" h={11}/></div>
        </div>
      </Card>
      {/* Next match */}
      <Card style={{ textAlign:'center' }}>
        <Box w="50%" h={12} mb={16} style={{ margin:'0 auto 16px' }}/>
        <div style={{ display:'flex', justifyContent:'center', gap:8 }}>
          {[0,1,2].map(i => <Box key={i} w={56} h={40} r={8}/>)}
        </div>
      </Card>
      {/* Leaderboard */}
      <Card>
        <Box w="35%" h={12} mb={16}/>
        {[0,1,2,3,4].map(i => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 0' }}>
            <Box w={16} h={16} r={4}/>
            <Circle size={32}/>
            <div style={{ flex:1 }}><Box w="50%" h={13}/></div>
            <Box w={70} h={16} r={6}/>
          </div>
        ))}
      </Card>
    </div>
  )
}

export function RankingsSkeleton() {
  return (
    <div className="page">
      <div className="skeleton" style={{ height:130, borderRadius:16, marginBottom:16 }}/>
      <Card style={{ padding:0 }}>
        {[0,1,2,3,4,5,6,7].map(i => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px',
            borderBottom: i<7 ? '1px solid rgba(0,0,0,.05)' : 'none' }}>
            <Box w={20} h={16} r={4}/>
            <Circle size={36}/>
            <div style={{ flex:1 }}><Box w="45%" h={13} mb={5}/><Box w="25%" h={10}/></div>
            <Box w={80} h={14} r={6}/>
          </div>
        ))}
      </Card>
    </div>
  )
}

export function PickSkeleton() {
  return (
    <div style={{ maxWidth:430, margin:'0 auto', padding:'14px 16px 96px' }}>
      <Card><Box w="60%" h={14} mb={6} style={{ margin:'0 auto 6px' }}/><Box w="40%" h={10} style={{ margin:'0 auto' }}/></Card>
      <Box w="65%" h={30} mb={6} r={6}/>
      <Box w="50%" h={12} mb={20}/>
      {[0,1].map(g => (
        <div key={g} style={{ marginBottom:12 }}>
          <Box w="40%" h={10} mb={10} style={{ margin:'0 auto 10px' }}/>
          <div style={{ display:'flex', gap:10 }}>
            {[0,1].map(t => (
              <div key={t} style={{ flex:1, background:'#fff', borderRadius:14, padding:16,
                border:'1px solid rgba(0,0,0,.07)', display:'flex', flexDirection:'column',
                alignItems:'center', gap:10 }}>
                <Box w={80} h={55} r={6}/><Box w="70%" h={11}/><Box w={70} h={20} r={20}/>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function ProfileSkeleton() {
  return (
    <div className="page">
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginBottom:20 }}>
        <Circle size={88} style={{ marginBottom:12 }}/>
        <Box w={140} h={22} mb={6} r={6}/>
        <Box w={90} h={12}/>
      </div>
      <Card>
        <div style={{ display:'flex', justifyContent:'space-around' }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ textAlign:'center' }}>
              <Box w={40} h={26} mb={6} r={6} style={{ margin:'0 auto 6px' }}/>
              <Box w={50} h={9}/>
            </div>
          ))}
        </div>
      </Card>
      <Box w="100%" h={42} r={12} mb={12}/>
      <Card style={{ padding:0 }}>
        {[0,1,2,3,4].map(i => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px',
            borderBottom: i<4 ? '1px solid rgba(0,0,0,.05)' : 'none' }}>
            <Circle size={40}/>
            <div style={{ flex:1 }}><Box w="45%" h={13} mb={4}/><Box w="30%" h={11}/></div>
            <Box w={60} h={18} r={12}/>
          </div>
        ))}
      </Card>
    </div>
  )
}

export function ChatSkeleton() {
  return (
    <div style={{ padding:16, display:'flex', flexDirection:'column', gap:16 }}>
      {[
        { me:false, w:'60%' }, { me:true, w:'45%' }, { me:false, w:'70%' },
        { me:true, w:'55%' }, { me:false, w:'50%' },
      ].map((m,i) => (
        <div key={i} style={{ display:'flex', flexDirection: m.me?'row-reverse':'row',
          gap:10, alignItems:'flex-end' }}>
          {!m.me && <Circle size={36}/>}
          <div style={{ maxWidth:'72%' }}>
            {!m.me && <Box w={70} h={10} mb={5}/>}
            <div className="skeleton" style={{ width:200, maxWidth:'60vw', height:44,
              borderRadius: m.me?'18px 18px 4px 18px':'18px 18px 18px 4px' }}/>
          </div>
        </div>
      ))}
    </div>
  )
}
