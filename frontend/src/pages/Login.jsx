import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api';

export default function Login() {
  const [email, setEmail]     = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const navigate              = useNavigate();

  const handleLogin = async () => {
    if (!email) { setError('Please enter your email'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await login(email);
      localStorage.setItem('dlims_user', JSON.stringify(res.data));
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.sidebar}>
        <div style={styles.logo}>DLIMS</div>
        <p style={styles.logoSub}>Defense Logistics IMS</p>
      </div>

      <div style={styles.main}>
        <div style={styles.card}>
          <h2 style={styles.heading}>Sign In</h2>
          <p style={styles.sub}>Enter your official email to access the system</p>

          {error && <div style={styles.error}>{error}</div>}

          <label style={styles.label}>Official Email</label>
          <input
            style={styles.input}
            type="email"
            placeholder="officer@defense.gov.in"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />

          <label style={styles.label}>Role</label>
          <select style={styles.input}>
            <option>Field Officer</option>
            <option>Supply Manager</option>
            <option>Base Commander</option>
            <option>Logistics Admin</option>
          </select>

          <div style={styles.alert}>
            🔒 Access is role-based. Your clearance level determines available features.
          </div>

          <button
            style={styles.btn}
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Access System →'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page:    { display:'flex', minHeight:'100vh', fontFamily:'sans-serif' },
  sidebar: { width:220, background:'#0f1f3d', display:'flex', flexDirection:'column',
             alignItems:'center', justifyContent:'center', padding:32 },
  logo:    { color:'white', fontSize:24, fontWeight:700, letterSpacing:1 },
  logoSub: { color:'#60a5fa', fontSize:11, marginTop:6, textAlign:'center' },
  main:    { flex:1, display:'flex', alignItems:'center', justifyContent:'center',
             background:'#f0f2f7' },
  card:    { background:'white', borderRadius:16, padding:40, width:400,
             boxShadow:'0 2px 20px rgba(0,0,0,0.08)' },
  heading: { fontSize:24, fontWeight:700, color:'#0f1f3d', marginBottom:6 },
  sub:     { fontSize:13, color:'#8896b3', marginBottom:24 },
  label:   { display:'block', fontSize:12, fontWeight:600, color:'#4b5e82',
             marginBottom:6, textTransform:'uppercase', letterSpacing:0.5 },
  input:   { width:'100%', padding:'11px 14px', border:'1.5px solid #e0e6f0',
             borderRadius:9, fontSize:14, outline:'none', marginBottom:18,
             boxSizing:'border-box', fontFamily:'sans-serif' },
  alert:   { background:'#eff6ff', border:'1px solid #bfdbfe', color:'#1d4ed8',
             padding:'10px 14px', borderRadius:8, fontSize:12, marginBottom:18 },
  btn:     { width:'100%', padding:13, background:'#1d4ed8', color:'white',
             border:'none', borderRadius:9, fontSize:14, fontWeight:600,
             cursor:'pointer' },
  error:   { background:'#fef2f2', border:'1px solid #fecaca', color:'#dc2626',
             padding:'10px 14px', borderRadius:8, fontSize:13, marginBottom:16 },
};
