import { Navigate, useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { ReactNode } from 'react';

interface AdminRouteProps {
  children: ReactNode;
}

export const AdminRoute = ({ children }: AdminRouteProps) => {
  const { isAuthenticated, user, loading, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="section" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <p style={{ color: '#4b5563', fontSize: '1.1rem' }}>Verifying administrator credentials...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (user?.role !== 'admin') {
    const handleSwitchToAdmin = () => {
      logout();
      navigate('/login', { state: { from: location.pathname } });
    };

    return (
      <div className="section" style={{ maxWidth: '620px', margin: '40px auto', padding: '0 20px', textAlign: 'center' }}>
        <div
          style={{
            padding: '36px 30px',
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #fecaca',
            boxShadow: '0 4px 14px rgba(239, 68, 68, 0.08)'
          }}
        >
          <span style={{ fontSize: '3.2rem', display: 'block', marginBottom: '8px' }}>🔒</span>
          <h2 style={{ color: '#b91c1c', margin: '0 0 10px 0', fontSize: '1.6rem' }}>Access Denied</h2>
          <p style={{ color: '#7f1d1d', margin: '0 0 20px 0', fontSize: '0.96rem' }}>
            Administrator privileges are required to access this section of EyeKart.
          </p>

          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fee2e2',
              borderRadius: '10px',
              padding: '14px 18px',
              textAlign: 'left',
              fontSize: '0.9rem',
              marginBottom: '20px',
              color: '#374151'
            }}
          >
            <div style={{ marginBottom: '6px' }}>
              <strong>Current User:</strong> {user?.name || 'Customer'}
            </div>
            <div style={{ marginBottom: '6px' }}>
              <strong>Signed-in Email:</strong> {user?.email || 'N/A'}
            </div>
            <div>
              <strong>Account Role:</strong>{' '}
              <span style={{ background: '#fecaca', color: '#991b1b', padding: '2px 8px', borderRadius: '4px', fontWeight: 600, fontSize: '0.8rem' }}>
                {user?.role || 'user'} (Standard Customer Account)
              </span>
            </div>
          </div>

          <p style={{ fontSize: '0.88rem', color: '#6b7280', margin: '0 0 24px 0', lineHeight: 1.5 }}>
            You are currently signed in with a standard customer account. To manage orders and products, please sign in with an authorized administrator account (e.g., <code>admin@eyekart.com</code>).
          </p>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={handleSwitchToAdmin}
              style={{
                padding: '12px 22px',
                background: '#4f46e5',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.95rem'
              }}
            >
              🔑 Sign In as Administrator
            </button>
            <Link to="/">
              <button
                style={{
                  padding: '12px 22px',
                  background: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.95rem'
                }}
              >
                Return to Storefront
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminRoute;
