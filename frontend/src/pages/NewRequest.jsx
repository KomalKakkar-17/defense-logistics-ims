import { useState, useEffect } from 'react';
import { useNavigate }         from 'react-router-dom';
import { createRequest, getUnits, getItems } from '../api';

const PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'];

const priorityStyle = {
  LOW:      { border:'#8896b3', bg:'#f8fafc',  color:'#0f1f3d' },
  NORMAL:   { border:'#1d4ed8', bg:'#eff6ff',  color:'#1d4ed8' },
  HIGH:     { border:'#b45309', bg:'#fffbeb',  color:'#b45309' },
  CRITICAL: { border:'#dc2626', bg:'#fef2f2',  color:'#dc2626' },
};

export default function NewRequest() {
  const navigate = useNavigate();
  const user     = JSON.parse(localStorage.getItem('dlims_user') || '{}');

  const [units,     setUnits]     = useState([]);
  const [items,     setItems]     = useState([]);
  const [reqUnitId, setReqUnitId] = useState('');
  const [supUnitId, setSupUnitId] = useState('');
  const [priority,  setPriority]  = useState('NORMAL');
  const [rows,      setRows]      = useState([{ item_id: '', quantity: 1 }]);
  const [submitting,setSubmitting]= useState(false);
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    if (!user.user_id) { navigate('/'); return; }
    Promise.all([getUnits(), getItems()])
      .then(([u, i]) => {
        setUnits(u.data);
        setItems(i.data);
        if (u.data.length > 0) {
          setReqUnitId(String(user.unit_id || u.data[0].unit_id));
          setSupUnitId(String(u.data[0].unit_id));
        }
        if (i.data.length > 0) {
          setRows([{ item_id: String(i.data[0].item_id), quantity: 1 }]);
        }
      })
      .catch(() => setError('Failed to load form data'))
      .finally(() => setLoading(false));
  }, []);

  const addRow    = () => setRows([...rows, { item_id: String(items[0]?.item_id || ''), quantity: 1 }]);
  const removeRow = (i) => { if (rows.length === 1) return; setRows(rows.filter((_, idx) => idx !== i)); };
  const updateRow = (i, field, val) => {
    const updated = [...rows];
    updated[i][field] = val;
    setRows(updated);
  };

  const totalUnits = rows.reduce((s, r) => s + (parseInt(r.quantity) || 0), 0);

  const handleSubmit = async () => {
    if (!reqUnitId || !supUnitId) { setError('Please select both units'); return; }
    if (reqUnitId === supUnitId)  { setError('Requesting and supplier unit cannot be the same'); return; }
    if (rows.some(r => !r.item_id || r.quantity < 1)) { setError('Please fill all item rows correctly'); return; }

    setSubmitting(true);
    setError('');
    try {
      const payload = {
        requester_user_id:  user.user_id,
        requester_unit_id:  parseInt(reqUnitId),
        supplier_unit_id:   parseInt(supUnitId),
        priority,
        items: rows.map(r => ({
          item_id:  parseInt(r.item_id),
          quantity: parseInt(r.quantity),
        })),
      };
      await createRequest(payload);
      navigate('/approve'); // go to approve page to see it in queue
    } catch (err) {
      // This is where trg_check_sustainability error will show
      setError(err.response?.data?.error || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={S.loading}>Loading...</div>;

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
        <NavItem label="📋  Requests"      active />
        <NavItem label="📦  Inventory"     onClick={() => navigate('/inventory')} />
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
            <h1 style={S.h1}>New Logistics Request</h1>
            <p style={S.topSub}>Submit a supply request to another unit</p>
          </div>
          <span style={S.badgeBlue}>Draft</span>
        </div>

        {/* Content */}
        <div style={S.content}>
          <div style={S.alertInfo}>
            ℹ️ &nbsp;Sustainability limits apply — requests exceeding your role's category limit will be automatically blocked.
          </div>

          {error && <div style={S.errorBox}>{error}</div>}

          <div style={S.grid2}>
            {/* Left — Request Details */}
            <div>
              <div style={S.card}>
                <div style={S.cardTitle}>📝 &nbsp;Request Details</div>

                <FormGroup label="Requesting Unit">
                  <select style={S.select} value={reqUnitId} onChange={e => setReqUnitId(e.target.value)}>
                    {units.map(u => (
                      <option key={u.unit_id} value={u.unit_id}>{u.unit_name}</option>
                    ))}
                  </select>
                </FormGroup>

                <FormGroup label="Supplier Unit">
                  <select style={S.select} value={supUnitId} onChange={e => setSupUnitId(e.target.value)}>
                    {units.map(u => (
                      <option key={u.unit_id} value={u.unit_id}>{u.unit_name}</option>
                    ))}
                  </select>
                </FormGroup>

                <FormGroup label="Priority">
                  <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginTop:4}}>
                    {PRIORITIES.map(p => {
                      const ps = priorityStyle[p];
                      const active = priority === p;
                      return (
                        <button
                          key={p}
                          onClick={() => setPriority(p)}
                          style={{
                            padding:'8px 0', borderRadius:8, fontSize:11, fontWeight:600,
                            cursor:'pointer', textAlign:'center',
                            border: `1.5px solid ${active ? ps.border : '#e0e6f0'}`,
                            background: active ? ps.bg : 'white',
                            color: active ? ps.color : '#8896b3',
                          }}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </FormGroup>
              </div>
            </div>

            {/* Right — Items + Summary */}
            <div>
              <div style={S.card}>
                <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14}}>
                  <div style={S.cardTitle}>📦 &nbsp;Items Requested</div>
                  <button style={S.addBtn} onClick={addRow}>+ Add Item</button>
                </div>

                {/* Column headers */}
                <div style={{display:'grid', gridTemplateColumns:'1fr 80px 36px', gap:8, marginBottom:6}}>
                  <span style={S.colHdr}>Item</span>
                  <span style={S.colHdr}>Qty</span>
                  <span></span>
                </div>

                {rows.map((row, i) => (
                  <div key={i} style={{display:'grid', gridTemplateColumns:'1fr 80px 36px', gap:8, marginBottom:8, alignItems:'center'}}>
                    <select
                      style={S.select}
                      value={row.item_id}
                      onChange={e => updateRow(i, 'item_id', e.target.value)}
                    >
                      {items.map(it => (
                        <option key={it.item_id} value={it.item_id}>
                          {it.item_name} ({it.category_name})
                        </option>
                      ))}
                    </select>
                    <input
                      style={S.qtyInput}
                      type="number"
                      min="1"
                      value={row.quantity}
                      onChange={e => updateRow(i, 'quantity', e.target.value)}
                    />
                    <button style={S.removeBtn} onClick={() => removeRow(i)}>×</button>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div style={{...S.card, marginTop:14}}>
                <div style={S.cardTitle}>📊 &nbsp;Request Summary</div>
                <div style={S.summaryBox}>
                  <SumRow label="Total Line Items" value={`${rows.length} item${rows.length > 1 ? 's' : ''}`} />
                  <SumRow label="Total Units"      value={`${totalUnits} units`} />
                  <SumRow label="Priority"         value={priority} />
                  <SumRow label="Est. Carbon"      value="Calculated on approval" highlight />
                </div>

                <div style={S.carbonNote}>
                  ⚠️ &nbsp;Carbon score is calculated automatically when approved.
                </div>

                <button
                  style={{...S.submitBtn, ...(submitting ? S.submitDisabled : {})}}
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Submit Request →'}
                </button>
              </div>
            </div>
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

function FormGroup({ label, children }) {
  return (
    <div style={{marginBottom:14}}>
      <label style={{display:'block', fontSize:10, fontWeight:600, color:'#4b5e82',
        letterSpacing:.5, textTransform:'uppercase', marginBottom:6}}>
        {label}
      </label>
      {children}
    </div>
  );
}

function SumRow({ label, value, highlight }) {
  return (
    <div style={{display:'flex', justifyContent:'space-between', fontSize:12,
      padding:'5px 0', borderBottom:'1px solid #eef1f7'}}>
      <span style={{color:'#8896b3'}}>{label}</span>
      <span style={{fontWeight:500, color: highlight ? '#b45309' : '#0f1f3d'}}>{value}</span>
    </div>
  );
}

// ── Styles ──
const S = {
  app:          { display:'flex', minHeight:'100vh', fontFamily:'sans-serif', background:'#f0f2f7' },
  loading:      { display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontSize:14, color:'#8896b3' },
  sidebar:      { width:210, background:'#0f1f3d', display:'flex', flexDirection:'column', padding:'24px 0', flexShrink:0 },
  logo:         { display:'flex', alignItems:'center', gap:9, padding:'0 20px 28px' },
  logoBox:      { width:30, height:30, background:'#1d4ed8', borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:14 },
  logoTxt:      { fontSize:13, fontWeight:700, color:'white' },
  logoSub:      { fontSize:9, color:'#60a5fa', letterSpacing:1 },
  sideFooter:   { marginTop:'auto', padding:'14px 18px', borderTop:'1px solid rgba(255,255,255,.06)', display:'flex', alignItems:'center', gap:8 },
  avatar:       { width:30, height:30, borderRadius:'50%', background:'#1d4ed8', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:600, color:'white', flexShrink:0 },
  sfName:       { fontSize:11, fontWeight:500, color:'white' },
  sfRole:       { fontSize:10, color:'#4b5e82' },
  main:         { flex:1, display:'flex', flexDirection:'column', minWidth:0 },
  topbar:       { background:'white', padding:'14px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid #e8ecf4' },
  h1:           { fontSize:18, fontWeight:700, color:'#0f1f3d', margin:0 },
  topSub:       { fontSize:11, color:'#8896b3', marginTop:2 },
  badgeBlue:    { fontSize:11, fontWeight:600, padding:'4px 10px', borderRadius:20, background:'#eff6ff', color:'#1d4ed8' },
  content:      { flex:1, padding:'20px 24px', overflowY:'auto' },
  alertInfo:    { background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:8, padding:'10px 13px', fontSize:12, color:'#1d4ed8', marginBottom:16 },
  errorBox:     { background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, padding:'10px 13px', fontSize:12, color:'#dc2626', marginBottom:16 },
  grid2:        { display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 },
  card:         { background:'white', borderRadius:12, padding:20, border:'1px solid #e8ecf4' },
  cardTitle:    { fontSize:13, fontWeight:700, color:'#0f1f3d', marginBottom:16 },
  select:       { width:'100%', padding:'10px 13px', border:'1.5px solid #e0e6f0', borderRadius:8, fontSize:13, color:'#0f1f3d', outline:'none', fontFamily:'sans-serif', background:'#fafbfd', appearance:'none' },
  colHdr:       { fontSize:10, fontWeight:600, color:'#b0bcd4', letterSpacing:.5, textTransform:'uppercase' },
  qtyInput:     { width:'100%', padding:'10px 8px', border:'1.5px solid #e0e6f0', borderRadius:8, fontSize:13, textAlign:'center', outline:'none', fontFamily:'sans-serif' },
  removeBtn:    { width:36, height:38, borderRadius:7, border:'none', background:'#fef2f2', color:'#dc2626', cursor:'pointer', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center' },
  addBtn:       { fontSize:12, fontWeight:600, padding:'6px 14px', borderRadius:7, border:'none', background:'#eff6ff', color:'#1d4ed8', cursor:'pointer' },
  summaryBox:   { background:'#f7f9fd', borderRadius:10, padding:14, border:'1px solid #e8ecf4', marginBottom:12 },
  carbonNote:   { background:'#fffbeb', border:'1px solid #fde68a', borderRadius:8, padding:'10px 13px', fontSize:12, color:'#b45309', marginBottom:14 },
  submitBtn:    { width:'100%', padding:13, background:'linear-gradient(135deg,#1d4ed8,#3b82f6)', color:'white', border:'none', borderRadius:9, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'sans-serif' },
  submitDisabled:{ background:'#e0e6f0', color:'#8896b3', cursor:'default' },
};