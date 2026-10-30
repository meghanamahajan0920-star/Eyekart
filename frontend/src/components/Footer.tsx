import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer>
      <div className="footer-container">
        {/* Brand Column */}
        <div className="footer-brand">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'white' }}>EyeKart</span>
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="6" cy="12" r="4" />
              <circle cx="18" cy="12" r="4" />
              <line x1="10" y1="12" x2="14" y2="12" />
            </svg>
          </div>
          <p>
            See Better. Look Better. Discover our curated collection of precision optical frames,
            designer sunglasses, and specialized blue light spectacles engineered for all-day comfort.
          </p>
          <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
            <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
              ✓ 100% Authentic Eyewear &nbsp;•&nbsp; ✓ Free Nationwide Shipping
            </span>
          </div>
        </div>

        {/* Quick Links */}
        <div className="footer-col">
          <h4>Explore</h4>
          <ul>
            <li>
              <Link to="/">Home Collection</Link>
            </li>
            <li>
              <a href="/#products">Eyeglasses</a>
            </li>
            <li>
              <a href="/#products">Sunglasses</a>
            </li>
            <li>
              <a href="/#categories">Computer Glasses</a>
            </li>
            <li>
              <Link to="/my-orders">Track My Orders</Link>
            </li>
          </ul>
        </div>

        {/* Customer Care */}
        <div className="footer-col">
          <h4>Customer Care</h4>
          <ul>
            <li>
              <a href="#why-us">Why Choose EyeKart</a>
            </li>
            <li>
              <a href="#why-us">Safe &amp; Secure Payments</a>
            </li>
            <li>
              <a href="#why-us">Shipping &amp; Delivery</a>
            </li>
            <li>
              <a href="#why-us">Hassle-Free Returns</a>
            </li>
            <li>
              <Link to="/checkout">Cart &amp; Checkout</Link>
            </li>
          </ul>
        </div>

        {/* Contact & Support */}
        <div className="footer-col">
          <h4>Contact &amp; Support</h4>
          <ul>
            <li style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
              support@eyekart.store
            </li>
            <li style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
              Mon – Sat: 9:00 AM – 7:00 PM IST
            </li>
            <li style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
              Verified SSL 256-bit Secure Gateway
            </li>
            <li style={{ marginTop: '12px' }}>
              <span
                style={{
                  display: 'inline-block',
                  background: '#1e293b',
                  color: '#94a3b8',
                  padding: '4px 10px',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  border: '1px solid #334155'
                }}
              >
                COD &amp; Razorpay Supported
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* Footer Bottom */}
      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} EyeKart. All Rights Reserved.</p>
        <p>Premium Eyewear E-Commerce Architecture</p>
      </div>
    </footer>
  );
};

export default Footer;
