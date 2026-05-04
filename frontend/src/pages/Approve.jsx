import { useState, useEffect } from 'react';
import { useNavigate }         from 'react-router-dom';
import { getRequests, approveReq, rejectReq } from '../api';

export default function Approve() {
  const navigate = useNavigate();
  const user     = JSON.parse(localStorage.getItem('dlims_user') || '{}');

  const [requests,  setRequests]  = useState([]);
  const [filter,    setFilter]    = useState('ALL');
  const [search,    setSearch]    = useState('');
  const [loading,   setLoading]   = useState(true);
  const [toast,     setToast]     = useState('');
  const [acting,    setActing]    = useState(null); // request_id being processed

  useEffect(() => {
    if (!user.user_id) { navigate('/'); return; }
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await getRequests();
      setRequests(res.data);
    } catch (err) {
      showToast('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    setActing(id);
    try {
      const res = await approveReq(id);
      showToast(res.data?.result || `Request #${id} approved`);
      // Refresh list to get updated status + carbon score
      await fetchRequests();
    } catch (err) {
      showToast(err.response?.data?.error || 'Approval failed');
    } finally {
      setActing(null);
    }
  };

  const handleReject = async (id) => {
    setActing(id);
    try {
      await rejectReq(id);
      showToast(`Request #${id} rejected`);
      await fetchRequests();
    } catch (err) {
      showToast(err.response?.data?.error || 'Rejection failed');
    } finally {
      setActing(null);
    }
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  // Filter + Search
  const visible = requests.filter(r => {
    const matchFilter = filter === 'ALL' || filter === 'PENDING'; // view is always pending
    const matchSearch = !search ||
      String(r.request_id).includes(search) ||
      r.requester_unit?.toLowerCase().includes(search.toLowerCase()) ||
      r.supplier_unit?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const pendingCount = requests.length;


  const priorityColor = (p) => ({
    CRITICAL: '#dc2626', HIGH: '#f59e0b', NORMAL: '#1d4ed8', LOW: '#8896b3'
  }[p] || '#8896b3');

  if (loading) return <div style={S.loading}>Loading requests...</div>;

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
        <NavItem label="⊞  Dashboard"    onClick={() => navigate('/dashboard')} />
        <NavItem label="📋  Requests"     onClick={() => navigate('/requests/new')} />
        <NavItem label="📦  Inventory"    onClick={() => navigate('/inventory')} />
        <NavItem label="✅  Approve"      active />
        <NavItem label="📊  Carbon Report" onClick={() => navigate('/carbon')} />
        <div style={S.sideFooter}>
          <div style={S.avatar}>{user.user_name?.slice(0,2).toUpperCase()}</div>
          <div>
            <div style={S.sfName}>{user.user_name}</div>
            <div style={S.sfRole}>{user.role_name}</div>
          </div>
        </div>
      </div>

      {/* ── Main ── */}
      <div style={{...S.main, position:'relative'}}>
        {/* Toast */}
        {toast && <div style={S.toast}>{toast}</div>}

        {/* Topbar */}
        <div style={S.topbar}>
          <div>
            <h1 style={S.h1}>Approve Requests</h1>
            <p style={S.topSub}>Review and action pending logistics requests</p>
          </div>
          <div style={{display:'flex', gap:8}}>
            <span style={S.badgeAmber}>{pendingCount} Pending</span>
            <span style={S.badgeBlue}>Clearance Lv. {user.clearance_level || '—'}</span>
          </div>
        </div>

        {/* Content */}
        <div style={S.content}>
          {/* Filter Bar */}
          <div style={S.filterBar}>
            {['ALL','PENDING','APPROVED','REJECTED'].map(f => (
              <button
                key={f}
                style={{...S.filterBtn, ...(filter===f ? S.filterBtnActive : {})}}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
            <input
              style={S.searchInput}
              type="text"
              placeholder="Search by unit or request ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Request Cards */}
          {visible.length === 0 && (
            <div style={S.empty}>No requests match your filter</div>
          )}

          {visible.map(r => (
            <div
              key={r.request_id}
              style={{
                ...S.reqCard,
                borderLeft: `3px solid ${
                  r.Status==='APPROVED' ? '#22c55e' :
                  r.Status==='REJECTED' ? '#ef4444' : '#f59e0b'
                }`
              }}
            >
              {/* Card Top */}
              <div style={S.rcTop}>
                <span style={S.rcId}>#{r.request_id}</span>

                <div style={S.rcMain}>
                  <div style={S.rcTitle}>
                    {r.from_unit} → {r.supplier}
                  </div>
                  <div style={S.rcMeta}>
                    {r.requested_by} · {r.item_count} items · {r.RequestDate}
                  </div>
                </div>

                {/* Priority tag */}
                <span style={{
                  ...S.priorityTag,
                  color: priorityColor(r.Priority),
                  background: priorityColor(r.Priority) + '18',
                }}>
                  {r.Priority || 'NORMAL'}
                </span>

                {/* Status pill */}
                <StatusPill status="PENDING" />

                {/* Action buttons */}
                <div style={{display:'flex', gap:8, flexShrink:0}}>
                  {r.Status === 'PENDING' ? (
                    <>
                      <button
                        style={S.btnApprove}
                        onClick={() => handleApprove(r.request_id)}
                        disabled={acting === r.request_id}
                      >
                        {acting === r.request_id ? '...' : '✓ Approve'}
                      </button>
                      <button
                        style={S.btnReject}
                        onClick={() => handleReject(r.request_id)}
                        disabled={acting === r.request_id}
                      >
                        ✕ Reject
                      </button>
                    </>
                  ) : (
                    <button style={S.btnDone}>
                      {r.Status === 'APPROVED' ? '✓ Approved' : '✕ Rejected'}
                    </button>
                  )}
                </div>
              </div>

              {/* Card Detail Row */}
              <div style={S.rcDetail}>
                <DetailBlock label="Requester Unit" value={r.from_unit} />
                <DetailBlock label="Supplier Unit"  value={r.supplier} />
                <DetailBlock label="Request Date"   value={r.RequestDate} />
                <DetailBlock
                  label="Carbon Score"
                  value="Calculated on approval"
                  highlight={r.TotalCarbonScore > 0}
                />
              </div>
            </div>
          ))}
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

function StatusPill({ status }) {
  const map = {
    PENDING:  { bg:'#fffbeb', color:'#b45309' },
    APPROVED: { bg:'#f0fdf4', color:'#15803d' },
    REJECTED: { bg:'#fef2f2', color:'#dc2626' },
  };
  const s = map[status] || map.PENDING;
  return (
    <span style={{
      fontSize:11, fontWeight:700, padding:'4px 12px',
      borderRadius:20, background:s.bg, color:s.color, flexShrink:0,
    }}>
      {status}
    </span>
  );
}

function DetailBlock({ label, value, highlight }) {
  return (
    <div style={{padding:'10px 0'}}>
      <div style={{fontSize:10, fontWeight:600, color:'#b0bcd4',
        letterSpacing:.5, textTransform:'uppercase', marginBottom:3}}>
        {label}
      </div>
      <div style={{
        fontSize:12, fontWeight:500,
        color: highlight ? '#b45309' : '#0f1f3d',
      }}>
        {value}
      </div>
    </div>
  );
}

// ── Styles ──
const S = {
  app:           { display:'flex', minHeight:'100vh', fontFamily:'sans-serif', background:'#f0f2f7' },
  loading:       { display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontSize:14, color:'#8896b3' },
  sidebar:       { width:210, background:'#0f1f3d', display:'flex', flexDirection:'column', padding:'24px 0', flexShrink:0 },
  logo:          { display:'flex', alignItems:'center', gap:9, padding:'0 20px 28px' },
  logoBox:       { width:30, height:30, background:'#1d4ed8', borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:14 },
  logoTxt:       { fontSize:13, fontWeight:700, color:'white' },
  logoSub:       { fontSize:9, color:'#60a5fa', letterSpacing:1 },
  sideFooter:    { marginTop:'auto', padding:'14px 18px', borderTop:'1px solid rgba(255,255,255,.06)', display:'flex', alignItems:'center', gap:8 },
  avatar:        { width:30, height:30, borderRadius:'50%', background:'#1d4ed8', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:600, color:'white', flexShrink:0 },
  sfName:        { fontSize:11, fontWeight:500, color:'white' },
  sfRole:        { fontSize:10, color:'#4b5e82' },
  main:          { flex:1, display:'flex', flexDirection:'column', minWidth:0 },
  topbar:        { background:'white', padding:'14px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid #e8ecf4' },
  h1:            { fontSize:18, fontWeight:700, color:'#0f1f3d', margin:0 },
  topSub:        { fontSize:11, color:'#8896b3', marginTop:2 },
  badgeAmber:    { fontSize:11, fontWeight:600, padding:'4px 10px', borderRadius:20, background:'#fffbeb', color:'#b45309' },
  badgeBlue:     { fontSize:11, fontWeight:600, padding:'4px 10px', borderRadius:20, background:'#eff6ff', color:'#1d4ed8' },
  content:       { flex:1, padding:'20px 24px', overflowY:'auto' },
  filterBar:     { display:'flex', gap:10, marginBottom:18, alignItems:'center' },
  filterBtn:     { fontSize:12, fontWeight:600, padding:'7px 16px', borderRadius:8, border:'1px solid #e0e6f0', background:'white', cursor:'pointer', color:'#8896b3' },
  filterBtnActive:{ background:'#0f1f3d', color:'white', borderColor:'#0f1f3d' },
  searchInput:   { flex:1, padding:'8px 14px', border:'1px solid #e0e6f0', borderRadius:8, fontSize:12, outline:'none', fontFamily:'sans-serif' },
  reqCard:       { background:'white', borderRadius:12, border:'1px solid #e8ecf4', marginBottom:12, overflow:'hidden' },
  rcTop:         { display:'flex', alignItems:'center', gap:14, padding:'16px 18px', flexWrap:'wrap' },
  rcId:          { fontSize:13, fontWeight:700, color:'#1d4ed8', minWidth:40 },
  rcMain:        { flex:1, minWidth:0 },
  rcTitle:       { fontSize:13, fontWeight:600, color:'#0f1f3d' },
  rcMeta:        { fontSize:11, color:'#8896b3', marginTop:3 },
  priorityTag:   { fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:12, flexShrink:0 },
  rcDetail:      { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, padding:'0 18px 14px', borderTop:'1px solid #f8fafc' },
  btnApprove:    { fontSize:12, fontWeight:600, padding:'7px 16px', borderRadius:8, border:'none', cursor:'pointer', background:'#f0fdf4', color:'#15803d' },
  btnReject:     { fontSize:12, fontWeight:600, padding:'7px 16px', borderRadius:8, border:'none', cursor:'pointer', background:'#fef2f2', color:'#dc2626' },
  btnDone:       { fontSize:12, fontWeight:600, padding:'7px 16px', borderRadius:8, border:'none', cursor:'default', background:'#f1f5f9', color:'#8896b3' },
  empty:         { textAlign:'center', padding:'60px 0', color:'#8896b3', fontSize:13 },
  toast:         { position:'absolute', top:16, right:16, background:'#0f1f3d', color:'white', fontSize:12, fontWeight:500, padding:'10px 18px', borderRadius:9, zIndex:100 },
};