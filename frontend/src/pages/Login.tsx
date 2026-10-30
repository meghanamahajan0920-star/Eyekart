import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from || '/';

  useEffect(() => {
    document.title = 'EyeKart — Sign In';
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please provide both your registered email and password.');
      return;
    }

    setLoading(true);
    try {
      const loggedInUser = await login({ email: email.trim(), password });
      showToast('Logged in successfully! Welcome back.', 'success');
      if (loggedInUser?.role === 'admin') {
        const destination = from && from !== '/' ? from : '/admin';
        navigate(destination, { replace: true });
      } else {
        if (from && from.startsWith('/admin')) {
          showToast('Signed in as customer. Administrator privileges are required for admin pages.', 'info');
          navigate('/', { replace: true });
        } else {
          navigate(from, { replace: true });
        }
      }
    } catch (err: any) {
      const msg = err.message || 'Invalid email or password credentials.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="section" style={{ maxWidth: '460px', margin: '48px auto', padding: '0 20px' }}>
      <div
        className="auth-card"
        style={{
          background: 'white',
          padding: '40px 36px',
          borderRadius: '20px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
          border: '1px solid #e2e8f0'
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              fontSize: '1.6rem'
            }}
          >
            👓
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
            {from.startsWith('/admin') ? 'Admin Sign In' : 'Welcome Back'}
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.92rem', margin: 0 }}>
            {from.startsWith('/admin')
              ? 'Sign in with administrator credentials to access the Admin Panel'
              : 'Sign in to track orders and manage your EyeKart account'}
          </p>
        </div>

        {from.startsWith('/admin') && (
          <div
            style={{
              padding: '12px 14px',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '10px',
              marginBottom: '20px',
              fontSize: '0.86rem',
              color: '#1e40af',
              lineHeight: 1.5
            }}
          >
            🛡️ <strong>Administrator Login Required</strong>
            <div style={{ fontSize: '0.8rem', marginTop: '4px', color: '#2563eb' }}>
              Please enter an authorized admin email (e.g. <code>admin@eyekart.com</code>) to access <strong>{from}</strong>.
            </div>
          </div>
        )}

        {error && (
          <div
            style={{
              padding: '14px',
              background: '#fee2e2',
              color: '#b91c1c',
              borderRadius: '10px',
              marginBottom: '20px',
              fontSize: '0.9rem',
              border: '1px solid #fecaca'
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Email Address
            </label>
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.98rem'
              }}
              autoComplete="email"
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155' }}>
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.98rem'
              }}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{
              marginTop: '10px',
              width: '100%',
              padding: '14px',
              fontSize: '1rem',
              fontWeight: 700
            }}
          >
            {loading ? 'Authenticating...' : 'Sign In →'}
          </button>
        </form>

        <div style={{ marginTop: '28px', textAlign: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
          <p style={{ fontSize: '0.92rem', color: '#64748b', margin: 0 }}>
            Don't have an account?{' '}
            <Link to="/register" state={{ from }} style={{ color: '#0f172a', fontWeight: 700, textDecoration: 'none' }}>
              Create an Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
