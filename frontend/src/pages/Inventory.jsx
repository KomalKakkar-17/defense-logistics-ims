import { useState, useEffect } from 'react';
import { useNavigate }         from 'react-router-dom';
import { getInventory, getExpiring } from '../api';

export default function Inventory() {
  const navigate = useNavigate();
  const user     = JSON.parse(localStorage.getItem('dlims_user') || '{}');

  const [inventory, setInventory] = useState([]);
  const [expiring,  setExpiring]  = useState([]);
  const [search,    setSearch]    = useState('');
  const [unitFilter,setUnitFilter]= useState('');
  const [catFilter, setCatFilter] = useState('');
  const [viewMode,  setViewMode]  = useState('table');
  const [loading,   setLoading]   = useState(true);

  // Derived unique lists for filter dropdowns
  const units      = [...new Set(inventory.map(i => i.unit_name))].sort();
  const categories = [...new Set(inventory.map(i => i.category_name))].sort();

  useEffect(() => {
    if (!user.user_id) { navigate('/'); return; }
    Promise.all([getInventory(), getExpiring()])
      .then(([inv, exp]) => {
        setInventory(inv.data);
        setExpiring(exp.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Filter logic
  const visible = inventory.filter(row => {
    const matchSearch = !search ||
      row.item_name?.toLowerCase().includes(search.toLowerCase()) ||
      row.unit_name?.toLowerCase().includes(search.toLowerCase());
    const matchUnit = !unitFilter || row.unit_name === unitFilter;
    const matchCat  = !catFilter  || row.category_name === catFilter;
    return matchSearch && matchUnit && matchCat;
  });

  // Stats
  const lowStock  = inventory.filter(i => i.Quantity < 20).length;
  const healthy   = inventory.filter(i => i.Quantity >= 20).length;

  const expiryInfo = (dateStr) => {
    if (!dateStr) return { label: 'No Expiry', cls: 'none' };
    const days = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
    if (days < 0)   return { label: 'Expired',       cls: 'danger' };
    if (days <= 15) return { label: `${days}d left`,  cls: 'danger' };
    if (days <= 30) return { label: `${days}d left`,  cls: 'warn'   };
    return { label: new Date(dateStr).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }), cls: 'ok' };
  };

  const stockStatus = (qty) => {
    if (qty < 20)  return { color: '#dc2626', label: 'Low'    };
    if (qty < 100) return { color: '#f59e0b', label: 'Medium' };
    return               { color: '#22c55e', label: 'Good'   };
  };

  const expiryStyle = {
    none:   { bg: '#f1f5f9', color: '#8896b3' },
    ok:     { bg: '#f0fdf4', color: '#15803d' },
    warn:   { bg: '#fffbeb', color: '#b45309' },
    danger: { bg: '#fef2f2', color: '#dc2626' },
  };

  if (loading) return <div style={S.loading}>Loading inventory...</div>;

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
        <NavItem label="📦  Inventory"     active />
        <NavItem label="✅  Approve"       onClick={() => navigate('/approve')} />
        <NavItem label="📊  Carbon Report" onClick={() => navigate('/carbon')} />
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
            <h1 style={S.h1}>Inventory</h1>
            <p style={S.topSub}>Live stock levels across all units</p>
          </div>
          <div style={{display:'flex', gap:8}}>
            <span style={{...S.badge, background:'#fef2f2', color:'#dc2626'}}>{expiring.length} Expiring Soon</span>
            <span style={{...S.badge, background:'#eff6ff', color:'#1d4ed8'}}>{inventory.length} Total Items</span>
          </div>
        </div>

        <div style={S.content}>
          {/* Stat Cards */}
          <div style={S.statRow}>
            <StatCard label="Total SKUs"  value={inventory.length} sub="Across all units"    color="#1d4ed8" />
            <StatCard label="Low Stock"   value={lowStock}         sub="Below threshold"     color="#dc2626" />
            <StatCard label="Expiring"    value={expiring.length}  sub="Within 30 days"      color="#b45309" />
            <StatCard label="Healthy"     value={healthy}          sub="In good condition"   color="#15803d" />
          </div>

          {/* Toolbar */}
          <div style={S.toolbar}>
            <input
              style={S.searchInput}
              type="text"
              placeholder="Search item or unit..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select style={S.filterSel} value={unitFilter} onChange={e => setUnitFilter(e.target.value)}>
              <option value="">All Units</option>
              {units.map(u => <option key={u}>{u}</option>)}
            </select>
            <select style={S.filterSel} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
              <option value="">All Categories</option>
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
            {/* View toggle */}
            <div style={S.toggleGroup}>
              <button
                style={{...S.tglBtn, ...(viewMode==='table' ? S.tglActive : {})}}
                onClick={() => setViewMode('table')}
              >≡ Table</button>
              <button
                style={{...S.tglBtn, ...(viewMode==='card' ? S.tglActive : {})}}
                onClick={() => setViewMode('card')}
              >⊞ Cards</button>
            </div>
          </div>

          {/* TABLE VIEW */}
          {viewMode === 'table' && (
            <div style={S.tableCard}>
              <table style={S.tbl}>
                <thead>
                  <tr>
                    {['Item','Unit','Quantity','Batch','Expiry','Status'].map(h => (
                      <th key={h} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.length === 0 && (
                    <tr><td colSpan={6} style={{textAlign:'center', padding:40, color:'#8896b3', fontSize:13}}>No inventory found</td></tr>
                  )}
                  {visible.map(row => {
                    const exp = expiryInfo(row.ExpiryDate);
                    const st  = stockStatus(row.Quantity);
                    const es  = expiryStyle[exp.cls];
                    return (
                      <tr key={row.inv_id} style={{cursor:'default'}}>
                        <td style={S.td}>
                          <div style={{display:'flex', alignItems:'center', gap:10}}>
                            <div style={{width:30, height:30, borderRadius:7, background:'#eff6ff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14}}>📦</div>
                            <div>
                              <div style={{fontSize:12, fontWeight:600, color:'#0f1f3d'}}>{row.item_name}</div>
                              <div style={{fontSize:10, color:'#8896b3'}}>{row.category_name}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{...S.td, color:'#4b5e82', fontSize:12}}>{row.unit_name}</td>
                        <td style={S.td}>
                          <div style={{display:'flex', alignItems:'center', gap:8}}>
                            <div style={{width:60, height:6, background:'#f1f5f9', borderRadius:10, overflow:'hidden'}}>
                              <div style={{height:'100%', borderRadius:10, background:st.color, width:`${Math.min(100, row.Quantity / 2)}%`}} />
                            </div>
                            <span style={{fontSize:12, fontWeight:600, color:st.color}}>{row.Quantity}</span>
                          </div>
                        </td>
                        <td style={S.td}>
                          <span style={{fontSize:10, fontWeight:600, padding:'3px 8px', borderRadius:12, background:'#f1f5f9', color:'#8896b3'}}>
                            {row.BatchNumber || '—'}
                          </span>
                        </td>
                        <td style={S.td}>
                          <span style={{fontSize:10, fontWeight:600, padding:'3px 8px', borderRadius:12, background:es.bg, color:es.color}}>
                            {exp.label}
                          </span>
                        </td>
                        <td style={S.td}>
                          <span style={{fontSize:10, fontWeight:600, padding:'3px 8px', borderRadius:12, background:st.color+'18', color:st.color}}>
                            {st.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* CARD VIEW */}
          {viewMode === 'card' && (
            <div style={S.cardGrid}>
              {visible.length === 0 && (
                <div style={{gridColumn:'1/-1', textAlign:'center', padding:40, color:'#8896b3', fontSize:13}}>No inventory found</div>
              )}
              {visible.map(row => {
                const exp = expiryInfo(row.ExpiryDate);
                const st  = stockStatus(row.Quantity);
                const es  = expiryStyle[exp.cls];
                return (
                  <div key={row.inv_id} style={S.invCard}>
                    <div style={{display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12}}>
                      <div style={{width:36, height:36, borderRadius:9, background:'#eff6ff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18}}>📦</div>
                      <span style={{fontSize:10, fontWeight:600, padding:'3px 8px', borderRadius:12, background:es.bg, color:es.color}}>{exp.label}</span>
                    </div>
                    <div style={{fontSize:13, fontWeight:600, color:'#0f1f3d'}}>{row.item_name}</div>
                    <div style={{fontSize:11, color:'#8896b3', marginBottom:8}}>{row.unit_name} · {row.category_name}</div>
                    <div style={{fontSize:24, fontWeight:700, color:'#0f1f3d', marginBottom:6}}>{row.Quantity}</div>
                    <div style={{height:6, background:'#f1f5f9', borderRadius:10, overflow:'hidden', marginBottom:6}}>
                      <div style={{height:'100%', background:st.color, borderRadius:10, width:`${Math.min(100, row.Quantity/2)}%`}} />
                    </div>
                    <div style={{fontSize:11, color:'#8896b3'}}>Batch: {row.BatchNumber || '—'}</div>
                  </div>
                );
              })}
            </div>
          )}
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

// ── Styles ──
const S = {
  app:         { display:'flex', minHeight:'100vh', fontFamily:'sans-serif', background:'#f0f2f7' },
  loading:     { display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontSize:14, color:'#8896b3' },
  sidebar:     { width:210, background:'#0f1f3d', display:'flex', flexDirection:'column', padding:'24px 0', flexShrink:0 },
  logo:        { display:'flex', alignItems:'center', gap:9, padding:'0 20px 28px' },
  logoBox:     { width:30, height:30, background:'#1d4ed8', borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:14 },
  logoTxt:     { fontSize:13, fontWeight:700, color:'white' },
  logoSub:     { fontSize:9, color:'#60a5fa', letterSpacing:1 },
  sideFooter:  { marginTop:'auto', padding:'14px 18px', borderTop:'1px solid rgba(255,255,255,.06)', display:'flex', alignItems:'center', gap:8 },
  avatar:      { width:30, height:30, borderRadius:'50%', background:'#1d4ed8', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:600, color:'white', flexShrink:0 },
  sfName:      { fontSize:11, fontWeight:500, color:'white' },
  sfRole:      { fontSize:10, color:'#4b5e82' },
  main:        { flex:1, display:'flex', flexDirection:'column', minWidth:0 },
  topbar:      { background:'white', padding:'14px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid #e8ecf4' },
  h1:          { fontSize:18, fontWeight:700, color:'#0f1f3d', margin:0 },
  topSub:      { fontSize:11, color:'#8896b3', marginTop:2 },
  badge:       { fontSize:11, fontWeight:600, padding:'4px 10px', borderRadius:20 },
  content:     { flex:1, padding:'20px 24px', overflowY:'auto' },
  statRow:     { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 },
  toolbar:     { display:'flex', gap:10, marginBottom:16, alignItems:'center' },
  searchInput: { flex:1, padding:'9px 14px', border:'1.5px solid #e0e6f0', borderRadius:8, fontSize:12, outline:'none', fontFamily:'sans-serif' },
  filterSel:   { padding:'9px 14px', border:'1.5px solid #e0e6f0', borderRadius:8, fontSize:12, outline:'none', fontFamily:'sans-serif', background:'white', color:'#0f1f3d', cursor:'pointer' },
  toggleGroup: { display:'flex', gap:4, background:'#f0f2f7', padding:4, borderRadius:8 },
  tglBtn:      { padding:'6px 14px', borderRadius:6, border:'none', fontSize:12, fontWeight:600, cursor:'pointer', color:'#8896b3', background:'transparent' },
  tglActive:   { background:'white', color:'#0f1f3d', boxShadow:'0 1px 4px rgba(0,0,0,.08)' },
  tableCard:   { background:'white', borderRadius:12, border:'1px solid #e8ecf4', overflow:'hidden' },
  tbl:         { width:'100%', borderCollapse:'collapse', fontSize:12 },
  th:          { textAlign:'left', fontSize:10, fontWeight:600, color:'#8896b3', letterSpacing:.5, textTransform:'uppercase', padding:'12px 16px', borderBottom:'1px solid #e8ecf4', background:'#fafbfd' },
  td:          { padding:'12px 16px', borderBottom:'1px solid #f8fafc', verticalAlign:'middle' },
  cardGrid:    { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 },
  invCard:     { background:'white', borderRadius:12, padding:16, border:'1px solid #e8ecf4' },
};