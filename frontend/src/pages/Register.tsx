import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const Register: React.FC = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from || '/';

  useEffect(() => {
    document.title = 'EyeKart — Create Account';
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'mobile') {
      // Allow only numeric digits (0–9) and cap at 10 digits
      const digitsOnly = value.replace(/\D/g, '').slice(0, 10);
      setForm(prev => ({
        ...prev,
        mobile: digitsOnly
      }));
      return;
    }
    setForm({
      ...form,
      [name]: value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Field Validations
    if (form.name.trim().length < 2) {
      setError('Please provide your full name (at least 2 characters).');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email.trim())) {
      setError('Please provide a valid email address.');
      return;
    }
    const mobileRegex = /^\d{10}$/;
    if (!mobileRegex.test(form.mobile.trim())) {
      setError('Mobile number must be exactly 10 digits.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        mobile: form.mobile.trim(),
        password: form.password
      });
      showToast('Registration successful! Welcome to EyeKart.', 'success');
      navigate(from, { replace: true });
    } catch (err: any) {
      const msg = err.message || 'Registration failed. Please check your details and try again.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="section" style={{ maxWidth: '520px', margin: '48px auto', padding: '0 20px' }}>
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
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
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
            Create an Account
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.92rem', margin: 0 }}>
            Join EyeKart for tailored eyewear recommendations and rapid checkout
          </p>
        </div>

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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Full Name *
            </label>
            <input
              type="text"
              name="name"
              required
              placeholder="e.g. John Doe"
              value={form.name}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.96rem'
              }}
              autoComplete="name"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Email Address *
            </label>
            <input
              type="email"
              name="email"
              required
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.96rem'
              }}
              autoComplete="email"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Mobile Number (10 digits) *
            </label>
            <input
              type="tel"
              name="mobile"
              required
              maxLength={10}
              pattern="[0-9]{10}"
              inputMode="numeric"
              placeholder="Enter 10-digit mobile number"
              value={form.mobile}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.96rem'
              }}
              autoComplete="tel"
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155' }}>
                Password (min 8 characters) *
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
              name="password"
              required
              placeholder="Create a secure password"
              value={form.password}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.96rem'
              }}
              autoComplete="new-password"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Confirm Password *
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              name="confirmPassword"
              required
              placeholder="Confirm your password"
              value={form.confirmPassword}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.96rem'
              }}
              autoComplete="new-password"
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
            {loading ? 'Creating Account...' : 'Complete Registration →'}
          </button>
        </form>

        <div style={{ marginTop: '28px', textAlign: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
          <p style={{ fontSize: '0.92rem', color: '#64748b', margin: 0 }}>
            Already have an account?{' '}
            <Link to="/login" state={{ from }} style={{ color: '#0f172a', fontWeight: 700, textDecoration: 'none' }}>
              Sign In here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
