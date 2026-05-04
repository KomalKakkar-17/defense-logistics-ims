import { useState, useEffect } from 'react';
import { useNavigate }         from 'react-router-dom';
import { getRequests, getCarbon, getExpiring } from '../api';

export default function Dashboard() {
  const navigate = useNavigate();
  const user     = JSON.parse(localStorage.getItem('dlims_user') || '{}');

  const [requests, setRequests] = useState([]);
  const [carbon,   setCarbon]   = useState([]);
  const [expiring, setExpiring] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!user.user_id) { navigate('/'); return; }

    Promise.all([getRequests(), getCarbon(), getExpiring()])
      .then(([r, c, e]) => {
        setRequests(r.data);
        setCarbon(c.data);
        setExpiring(e.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const pending  = requests.length; // view only shows pending by definition
  const approved = 0;               // we'll get this separately later

  if (loading) return <div style={S.loading}>Loading...</div>;

  return (
    <div style={S.app}>
      {/* ── Sidebar ── */}
      <div style={S.sidebar}>
        <div style={S.logo}>
          <div style={S.logoBox}>⚙</div>
          <div>
            <div style={S.logoTxt}>DLIMS</div>
            <div style={S.logoSub}>Defense Logistics</div>
          </div>
        </div>

        <NavItem icon="⊞" label="Dashboard"     active onClick={() => navigate('/dashboard')} />
        <NavItem icon="📋" label="Requests"              onClick={() => navigate('/requests')} />
        <NavItem icon="📦" label="Inventory"             onClick={() => navigate('/inventory')} />
        <NavItem icon="✅" label="Approve"               onClick={() => navigate('/approve')} />
        <NavItem icon="📊" label="Carbon Report"         onClick={() => navigate('/carbon')} />

        <div style={S.sideFooter}>
          <div style={S.avatar}>{user.user_name?.slice(0,2).toUpperCase()}</div>
          <div>
            <div style={S.userName}>{user.user_name}</div>
            <div style={S.userRole}>{user.role_name}</div>
          </div>
        </div>
      </div>

      {/* ── Main ── */}
      <div style={S.main}>
        {/* Topbar */}
        <div style={S.topbar}>
          <div>
            <h1 style={S.h1}>Dashboard</h1>
            <p style={S.topSub}>
              Welcome back, {user.user_name} — {new Date().toDateString()}
            </p>
          </div>
          <span style={S.badgeGreen}>● System Live</span>
        </div>

        {/* Content */}
        <div style={S.content}>

          {/* Stat Cards */}
          <div style={S.statGrid}>
            <StatCard label="Pending Requests" value={pending}          sub="Awaiting approval"    color="#1d4ed8" />
            <StatCard label="Approved"         value={approved}         sub="Inventory deducted"   color="#15803d" />
            <StatCard label="Expiring Items"   value={expiring.length}  sub="Within 30 days"       color="#b45309" />
            <StatCard label="Carbon Budget"    value={`${avgCarbon(carbon)}%`} sub="Avg across units" color="#dc2626" />
          </div>

          {/* Row 2 */}
          <div style={S.row2}>
            {/* Pending Requests */}
            <div style={S.card}>
              <div style={S.cardHdr}>
                <span style={S.cardTitle}>Recent Requests</span>
                <span style={S.viewAll} onClick={() => navigate('/approve')}>View all →</span>
              </div>
              {requests.slice(0, 5).map(r => (
                <div key={r.request_id} style={S.reqRow}>
                  <span style={S.reqId}>#{r.request_id}</span>
                  <div style={S.reqInfo}>
                    <div style={S.reqName}>{r.from_unit} → {r.supplier}</div>
                    <div style={S.reqMeta}>{r.requested_by} · {r.RequestDate}</div>
                  </div>
                  <StatusBadge status="PENDING" />
                </div>
              ))}
              {requests.length === 0 && (
                <p style={{fontSize:12, color:'#8896b3', textAlign:'center', padding:'20px 0'}}>
                  No requests yet
                </p>
              )}
            </div>

            {/* Carbon Bars */}
            <div style={S.card}>
              <div style={S.cardHdr}>
                <span style={S.cardTitle}>Carbon Budget — per Unit</span>
                <span style={S.viewAll} onClick={() => navigate('/carbon')}>Full report →</span>
              </div>
              {carbon.map(c => {
                const pct = Math.min(100, Math.round(
                  (c.TotalCarbonUsed / c.totalCarbonBudget) * 100
                ));
                const color = pct > 80 ? '#dc2626' : pct > 50 ? '#f59e0b' : '#22c55e';
                return (
                  <div key={c.unit_name} style={S.carbonRow}>
                    <span style={S.carbonUnit}>{c.unit_name}</span>
                    <div style={{flex:1}}>
                      <div style={S.barBg}>
                        <div style={{...S.barFill, width:`${pct}%`, background:color}} />
                      </div>
                    </div>
                    <span style={S.carbonPct}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Row 3 */}
          <div style={S.row2}>
            {/* Expiring Items */}
            <div style={S.card}>
              <div style={S.cardHdr}>
                <span style={S.cardTitle}>Expiring Inventory</span>
                <span style={{...S.badgeAmber, fontSize:11}}>{expiring.length} alerts</span>
              </div>
              {expiring.length === 0 && (
                <p style={{fontSize:12, color:'#8896b3', textAlign:'center', padding:'20px 0'}}>
                  No items expiring soon
                </p>
              )}
              {expiring.map((e, i) => (
                <div key={i} style={S.expRow}>
                  <div style={S.expIcon}>⚠</div>
                  <div style={{flex:1}}>
                    <div style={S.expName}>{e.item_name}</div>
                    <div style={S.expUnit}>{e.unit_name} · Qty: {e.quantity}</div>
                  </div>
                  <span style={S.expDays}>{e.days_left}d</span>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div style={S.card}>
              <div style={S.cardHdr}>
                <span style={S.cardTitle}>Quick Actions</span>
              </div>
              <QuickAction
                color="#eff6ff" iconColor="#1d4ed8"
                title="New Logistics Request"
                sub="Submit a supply request"
                onClick={() => navigate('/requests/new')}
              />
              <QuickAction
                color="#f0fdf4" iconColor="#15803d"
                title="Approve Requests"
                sub={`${pending} pending approval`}
                onClick={() => navigate('/approve')}
              />
              <QuickAction
                color="#fffbeb" iconColor="#b45309"
                title="Carbon Audit Report"
                sub="View sustainability metrics"
                onClick={() => navigate('/carbon')}
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ── Helper: average carbon % across units ──
function avgCarbon(carbon) {
  if (!carbon.length) return 0;
  const avg = carbon.reduce((sum, c) =>
    sum + (c.TotalCarbonUsed / c.totalCarbonBudget) * 100, 0
  ) / carbon.length;
  return Math.round(avg);
}

// ── Sub-components ──
function NavItem({ icon, label, active, onClick }) {
  return (
    <div onClick={onClick} style={{
      display:'flex', alignItems:'center', gap:9,
      padding:'8px 16px', margin:'1px 10px', borderRadius:7,
      cursor:'pointer', fontSize:12, fontWeight: active ? 600 : 400,
      color: active ? '#60a5fa' : '#8ba3c7',
      background: active ? 'rgba(59,130,246,.18)' : 'transparent',
    }}>
      <span style={{fontSize:14}}>{icon}</span>
      {label}
    </div>
  );
}

function StatCard({ label, value, sub, color }) {
  return (
    <div style={S.statCard}>
      <div style={S.statLbl}>{label}</div>
      <div style={{...S.statVal, color}}>{value}</div>
      <div style={S.statSub}>{sub}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    PENDING:  { bg:'#fffbeb', color:'#b45309' },
    APPROVED: { bg:'#f0fdf4', color:'#15803d' },
    REJECTED: { bg:'#fef2f2', color:'#dc2626' },
  };
  const s = map[status] || map.PENDING;
  return (
    <span style={{fontSize:10, fontWeight:600, padding:'3px 8px',
      borderRadius:12, background:s.bg, color:s.color}}>
      {status}
    </span>
  );
}

function QuickAction({ color, iconColor, title, sub, onClick }) {
  return (
    <div onClick={onClick} style={{
      background:'#f7f9fd', borderRadius:9, padding:'13px 15px',
      display:'flex', alignItems:'center', gap:12,
      cursor:'pointer', border:'1px solid #e8ecf4', marginBottom:10,
    }}>
      <div style={{width:32, height:32, background:color, borderRadius:8,
        display:'flex', alignItems:'center', justifyContent:'center',
        color:iconColor, fontSize:16, flexShrink:0}}>▶</div>
      <div>
        <div style={{fontSize:13, fontWeight:600, color:'#0f1f3d'}}>{title}</div>
        <div style={{fontSize:11, color:'#8896b3'}}>{sub}</div>
      </div>
    </div>
  );
}

// ── Styles ──
const S = {
  app:        { display:'flex', minHeight:'100vh', fontFamily:'sans-serif', background:'#f0f2f7' },
  loading:    { display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontSize:14, color:'#8896b3' },
  sidebar:    { width:210, background:'#0f1f3d', display:'flex', flexDirection:'column', padding:'24px 0', flexShrink:0 },
  logo:       { display:'flex', alignItems:'center', gap:9, padding:'0 20px 28px' },
  logoBox:    { width:30, height:30, background:'#1d4ed8', borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:14 },
  logoTxt:    { fontSize:13, fontWeight:700, color:'white' },
  logoSub:    { fontSize:9, color:'#60a5fa', letterSpacing:1 },
  sideFooter: { marginTop:'auto', padding:'14px 18px', borderTop:'1px solid rgba(255,255,255,.06)', display:'flex', alignItems:'center', gap:8 },
  avatar:     { width:30, height:30, borderRadius:'50%', background:'#1d4ed8', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:600, color:'white', flexShrink:0 },
  userName:   { fontSize:11, fontWeight:500, color:'white' },
  userRole:   { fontSize:10, color:'#4b5e82' },
  main:       { flex:1, display:'flex', flexDirection:'column', minWidth:0 },
  topbar:     { background:'white', padding:'14px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid #e8ecf4' },
  h1:         { fontSize:18, fontWeight:700, color:'#0f1f3d', margin:0 },
  topSub:     { fontSize:11, color:'#8896b3', marginTop:2 },
  badgeGreen: { fontSize:11, fontWeight:600, padding:'4px 10px', borderRadius:20, background:'#f0fdf4', color:'#15803d' },
  badgeAmber: { padding:'4px 10px', borderRadius:20, background:'#fffbeb', color:'#b45309', fontWeight:600 },
  content:    { flex:1, padding:'20px 24px', overflowY:'auto' },
  statGrid:   { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 },
  statCard:   { background:'white', borderRadius:12, padding:16, border:'1px solid #e8ecf4' },
  statLbl:    { fontSize:10, fontWeight:600, color:'#8896b3', letterSpacing:.5, textTransform:'uppercase', marginBottom:6 },
  statVal:    { fontSize:24, fontWeight:700, lineHeight:1 },
  statSub:    { fontSize:11, color:'#8896b3', marginTop:4 },
  row2:       { display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:20 },
  card:       { background:'white', borderRadius:12, padding:18, border:'1px solid #e8ecf4' },
  cardHdr:    { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 },
  cardTitle:  { fontSize:13, fontWeight:700, color:'#0f1f3d' },
  viewAll:    { fontSize:11, color:'#1d4ed8', cursor:'pointer', fontWeight:500 },
  reqRow:     { display:'flex', alignItems:'center', gap:10, padding:'9px 0', borderBottom:'1px solid #f1f5f9' },
  reqId:      { fontSize:11, fontWeight:600, color:'#1d4ed8', width:36 },
  reqInfo:    { flex:1, minWidth:0 },
  reqName:    { fontSize:12, fontWeight:500, color:'#0f1f3d', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' },
  reqMeta:    { fontSize:10, color:'#8896b3', marginTop:1 },
  carbonRow:  { display:'flex', alignItems:'center', gap:8, marginBottom:10 },
  carbonUnit: { fontSize:12, fontWeight:500, color:'#0f1f3d', width:120, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' },
  carbonPct:  { fontSize:11, color:'#8896b3', minWidth:36, textAlign:'right' },
  barBg:      { height:10, background:'#f1f5f9', borderRadius:10, overflow:'hidden', margin:'8px 0 4px' },
  barFill:    { height:'100%', borderRadius:10 },
  expRow:     { display:'flex', alignItems:'center', gap:10, padding:'9px 0', borderBottom:'1px solid #f1f5f9' },
  expIcon:    { width:28, height:28, borderRadius:7, background:'#fffbeb', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 },
  expName:    { fontSize:12, fontWeight:500, color:'#0f1f3d' },
  expUnit:    { fontSize:10, color:'#8896b3' },
  expDays:    { fontSize:11, fontWeight:700, color:'#dc2626', whiteSpace:'nowrap' },
};