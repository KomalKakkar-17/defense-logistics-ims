import { useState, useEffect } from 'react';
import { useNavigate }         from 'react-router-dom';
import { getCarbon }           from '../api';

const COLORS = ['#dc2626','#f59e0b','#3b82f6','#22c55e','#8b5cf6'];

export default function CarbonReport() {
  const navigate = useNavigate();
  const user     = JSON.parse(localStorage.getItem('dlims_user') || '{}');

  const [carbon,  setCarbon]  = useState([]);
  const [audit,   setAudit]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user.user_id) { navigate('/'); return; }
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // getCarbon() hits GET /api/carbon → vw_CarbonSummary
      const res = await getCarbon();
      setCarbon(res.data);

      // Fetch audit log separately
      const auditRes = await fetch('http://localhost:5000/api/carbon/audit');
      const auditData = await auditRes.json();
      setAudit(auditData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Derived stats
  const totalCO2    = carbon.reduce((s, c) => s + parseFloat(c.TotalCarbonUsed || 0), 0);
  const avgPct      = carbon.length
    ? Math.round(carbon.reduce((s, c) => s + (c.TotalCarbonUsed / c.totalCarbonBudget) * 100, 0) / carbon.length)
    : 0;
  const criticalUnits = carbon.filter(c => (c.TotalCarbonUsed / c.totalCarbonBudget) * 100 >= 75).length;

  const unitStatus = (pct) => {
    if (pct >= 75) return { color:'#dc2626', bg:'#fef2f2', label:'Critical' };
    if (pct >= 50) return { color:'#b45309', bg:'#fffbeb', label:'Warning'  };
    return               { color:'#15803d', bg:'#f0fdf4', label:'Healthy'  };
  };

  const carbonLevel = (val) => {
    if (val > 1500) return { bg:'#fef2f2', color:'#dc2626', label:'High'   };
    if (val > 500)  return { bg:'#fffbeb', color:'#b45309', label:'Medium' };
    return                 { bg:'#f0fdf4', color:'#15803d', label:'Low'    };
  };

  // Donut chart SVG
  const DonutChart = () => {
    const total = carbon.reduce((s, c) => s + parseFloat(c.TotalCarbonUsed || 0), 0);
    const r = 50, cx = 70, cy = 70, circ = 2 * Math.PI * r;
    let offset = 0;
    return (
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth="22"/>
        {carbon.map((c, i) => {
          const pct  = total > 0 ? parseFloat(c.TotalCarbonUsed) / total : 0;
          const dash = pct * circ;
          const rot  = offset * 360 - 90;
          offset += pct;
          return (
            <circle key={i} cx={cx} cy={cy} r={r}
              fill="none" stroke={COLORS[i % COLORS.length]}
              strokeWidth="22"
              strokeDasharray={`${dash} ${circ}`}
              transform={`rotate(${rot} ${cx} ${cy})`}
            />
          );
        })}
        <text x="70" y="67" textAnchor="middle" fontSize="12" fontWeight="700" fill="#0f1f3d">
          {Math.round(totalCO2).toLocaleString()}
        </text>
        <text x="70" y="82" textAnchor="middle" fontSize="9" fill="#8896b3">kg CO₂</text>
      </svg>
    );
  };

  if (loading) return <div style={S.loading}>Loading carbon data...</div>;

  return (
    <div style={S.app}>
      {/* Sidebar */}
      <div style={S.sidebar}>
        <div style={S.logo}>
          <div style={S.logoBox}>⚙</div>
          <div>
            <div style={S.logoTxt}>DLIMS</div>
            <div style={S.logoSub}>Defense Logistics</div>
          </div>
        </div>
        <NavItem label="⊞  Dashboard"     onClick={() => navigate('/dashboard')} />
        <NavItem label="📋  Requests"      onClick={() => navigate('/requests/new')} />
        <NavItem label="📦  Inventory"     onClick={() => navigate('/inventory')} />
        <NavItem label="✅  Approve"       onClick={() => navigate('/approve')} />
        <NavItem label="📊  Carbon Report" active />
        <div style={S.sideFooter}>
          <div style={S.avatar}>{user.user_name?.slice(0,2).toUpperCase()}</div>
          <div>
            <div style={S.sfName}>{user.user_name}</div>
            <div style={S.sfRole}>{user.role_name}</div>
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={S.main}>
        {/* Topbar */}
        <div style={S.topbar}>
          <div>
            <h1 style={S.h1}>Carbon Report</h1>
            <p style={S.topSub}>Sustainability metrics and carbon audit log</p>
          </div>
          <div style={{display:'flex', gap:8}}>
            <span style={{...S.badge, background:'#fef2f2', color:'#dc2626'}}>{criticalUnits} Units Over 75%</span>
            <span style={{...S.badge, background:'#f0fdf4', color:'#15803d'}}>Phase 5 — Active</span>
          </div>
        </div>

        <div style={S.content}>
          {/* Stat Cards */}
          <div style={S.statRow}>
            <StatCard label="Total CO₂ Emitted"  value={`${Math.round(totalCO2).toLocaleString()} kg`} sub="Across all units"    color="#dc2626" />
            <StatCard label="Avg Budget Used"     value={`${avgPct}%`}                                  sub="Across all units"    color="#b45309" />
            <StatCard label="Critical Units"      value={criticalUnits}                                  sub="Above 75% budget"    color="#dc2626" />
            <StatCard label="Approved Requests"   value={audit.length}                                   sub="With carbon logged"  color="#1d4ed8" />
          </div>

          {/* Row 2 */}
          <div style={S.row2}>
            {/* Unit Budget Bars */}
            <div style={S.card}>
              <div style={S.cardTitle}>Carbon Budget Usage — by Unit</div>
              {carbon.length === 0 && (
                <p style={{fontSize:12, color:'#8896b3', textAlign:'center', padding:'20px 0'}}>No carbon data yet</p>
              )}
              {carbon.map((c, i) => {
                const pct = Math.min(100, Math.round((c.TotalCarbonUsed / c.totalCarbonBudget) * 100));
                const st  = unitStatus(pct);
                return (
                  <div key={i} style={{marginBottom:16}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5}}>
                      <span style={{fontSize:12, fontWeight:600, color:'#0f1f3d'}}>{c.unit_name}</span>
                      <span style={{fontSize:11, color:'#8896b3'}}>
                        {parseFloat(c.TotalCarbonUsed).toLocaleString()} / {parseFloat(c.totalCarbonBudget).toLocaleString()} kg
                      </span>
                    </div>
                    <div style={{height:8, background:'#f1f5f9', borderRadius:10, overflow:'hidden'}}>
                      <div style={{height:'100%', borderRadius:10, background:st.color, width:`${pct}%`, transition:'width .5s ease'}} />
                    </div>
                    <div style={{display:'flex', justifyContent:'space-between', marginTop:4}}>
                      <span style={{fontSize:11, fontWeight:700, color:st.color}}>{pct}%</span>
                      <span style={{fontSize:10, fontWeight:600, padding:'2px 7px', borderRadius:10, background:st.bg, color:st.color}}>{st.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Donut Chart */}
            <div style={S.card}>
              <div style={S.cardTitle}>CO₂ Distribution by Unit</div>
              <div style={{display:'flex', alignItems:'center', justifyContent:'center', gap:24}}>
                <DonutChart />
                <div style={{display:'flex', flexDirection:'column', gap:8}}>
                  {carbon.map((c, i) => {
                    const pct = totalCO2 > 0
                      ? Math.round((parseFloat(c.TotalCarbonUsed) / totalCO2) * 100)
                      : 0;
                    return (
                      <div key={i} style={{display:'flex', alignItems:'center', gap:8, fontSize:12}}>
                        <div style={{width:10, height:10, borderRadius:'50%', background:COLORS[i % COLORS.length], flexShrink:0}} />
                        <span style={{color:'#0f1f3d', fontWeight:500}}>{c.unit_name}</span>
                        <span style={{color:'#8896b3', marginLeft:'auto', paddingLeft:8}}>{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Audit Log */}
          <div style={S.tableCard}>
            <div style={{padding:'14px 20px', borderBottom:'1px solid #e8ecf4', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
              <div style={{fontSize:13, fontWeight:700, color:'#0f1f3d'}}>Carbon Audit Log</div>
              <span style={{fontSize:11, color:'#8896b3'}}>Generated by ApproveRequest() procedure</span>
            </div>
            <table style={S.tbl}>
              <thead>
                <tr>
                  {['Log ID','Request ID','CO₂ Emitted','Date Calculated','Level'].map(h => (
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {audit.length === 0 && (
                  <tr><td colSpan={5} style={{textAlign:'center', padding:40, color:'#8896b3', fontSize:13}}>
                    No audit entries yet — approve a request to generate carbon logs
                  </td></tr>
                )}
                {audit.map(row => {
                  const lvl = carbonLevel(parseFloat(row.TotalCarbonEmitted));
                  return (
                    <tr key={row.log_id}>
                      <td style={S.td}><span style={{color:'#8896b3'}}>#{row.log_id}</span></td>
                      <td style={S.td}><span style={{fontWeight:600, color:'#1d4ed8'}}>#{row.request_id}</span></td>
                      <td style={S.td}><span style={{fontWeight:700, color:'#b45309'}}>{parseFloat(row.TotalCarbonEmitted).toFixed(2)} kg</span></td>
                      <td style={S.td}><span style={{color:'#8896b3'}}>{row.DateCalculated}</span></td>
                      <td style={S.td}>
                        <span style={{fontSize:10, fontWeight:600, padding:'3px 8px', borderRadius:12, background:lvl.bg, color:lvl.color}}>
                          {lvl.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──
function NavItem({ label, active, onClick }) {
  return (
    <div onClick={onClick} style={{
      display:'flex', alignItems:'center', gap:9,
      padding:'8px 16px', margin:'1px 10px', borderRadius:7,
      cursor: active ? 'default' : 'pointer', fontSize:12,
      color: active ? '#60a5fa' : '#8ba3c7',
      background: active ? 'rgba(59,130,246,.18)' : 'transparent',
      fontWeight: active ? 600 : 400,
    }}>
      {label}
    </div>
  );
}

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{background:'white', borderRadius:11, padding:'14px 16px', border:'1px solid #e8ecf4'}}>
      <div style={{fontSize:10, fontWeight:600, color:'#8896b3', letterSpacing:.5, textTransform:'uppercase', marginBottom:5}}>{label}</div>
      <div style={{fontSize:22, fontWeight:700, color, lineHeight:1}}>{value}</div>
      <div style={{fontSize:11, color:'#8896b3', marginTop:3}}>{sub}</div>
    </div>
  );
}

const S = {
  app:       { display:'flex', minHeight:'100vh', fontFamily:'sans-serif', background:'#f0f2f7' },
  loading:   { display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontSize:14, color:'#8896b3' },
  sidebar:   { width:210, background:'#0f1f3d', display:'flex', flexDirection:'column', padding:'24px 0', flexShrink:0 },
  logo:      { display:'flex', alignItems:'center', gap:9, padding:'0 20px 28px' },
  logoBox:   { width:30, height:30, background:'#1d4ed8', borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:14 },
  logoTxt:   { fontSize:13, fontWeight:700, color:'white' },
  logoSub:   { fontSize:9, color:'#60a5fa', letterSpacing:1 },
  sideFooter:{ marginTop:'auto', padding:'14px 18px', borderTop:'1px solid rgba(255,255,255,.06)', display:'flex', alignItems:'center', gap:8 },
  avatar:    { width:30, height:30, borderRadius:'50%', background:'#1d4ed8', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:600, color:'white', flexShrink:0 },
  sfName:    { fontSize:11, fontWeight:500, color:'white' },
  sfRole:    { fontSize:10, color:'#4b5e82' },
  main:      { flex:1, display:'flex', flexDirection:'column', minWidth:0 },
  topbar:    { background:'white', padding:'14px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid #e8ecf4' },
  h1:        { fontSize:18, fontWeight:700, color:'#0f1f3d', margin:0 },
  topSub:    { fontSize:11, color:'#8896b3', marginTop:2 },
  badge:     { fontSize:11, fontWeight:600, padding:'4px 10px', borderRadius:20 },
  content:   { flex:1, padding:'20px 24px', overflowY:'auto' },
  statRow:   { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 },
  row2:      { display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 },
  card:      { background:'white', borderRadius:12, padding:20, border:'1px solid #e8ecf4' },
  cardTitle: { fontSize:13, fontWeight:700, color:'#0f1f3d', marginBottom:16 },
  tableCard: { background:'white', borderRadius:12, border:'1px solid #e8ecf4', overflow:'hidden' },
  tbl:       { width:'100%', borderCollapse:'collapse', fontSize:12 },
  th:        { textAlign:'left', fontSize:10, fontWeight:600, color:'#8896b3', letterSpacing:.5, textTransform:'uppercase', padding:'12px 16px', borderBottom:'1px solid #e8ecf4', background:'#fafbfd' },
  td:        { padding:'11px 16px', borderBottom:'1px solid #f8fafc', verticalAlign:'middle' },
};