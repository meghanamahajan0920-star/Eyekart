import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import type { Order } from '../types';

export const OrderSuccess: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    document.title = 'EyeKart — Order Confirmed';
    if (id) {
      api
        .getOrder(id)
        .then((res) => setOrder(res.order))
        .catch(() => {
          // Non-blocking fallback if session differs
        });
    }
  }, [id]);

  return (
    <div className="section" style={{ maxWidth: '680px', margin: '40px auto', padding: '32px 20px' }}>
      <div
        style={{
          background: 'white',
          borderRadius: '20px',
          border: '1px solid #e2e8f0',
          padding: '48px 36px',
          textAlign: 'center',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.04)'
        }}
      >
        {/* Animated celebration icon */}
        <div
          style={{
            width: '84px',
            height: '84px',
            borderRadius: '50%',
            background: '#dcfce7',
            color: '#15803d',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.5rem',
            margin: '0 auto 24px auto',
            border: '2px solid #bbf7d0'
          }}
        >
          ✓
        </div>

        <span
          style={{
            display: 'inline-block',
            fontSize: '0.8rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#15803d',
            background: '#f0fdf4',
            padding: '4px 12px',
            borderRadius: '9999px',
            marginBottom: '12px'
          }}
        >
          Order Confirmed
        </span>

        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 12px 0' }}>
          Thank You for Your Order!
        </h1>

        <p style={{ color: '#475569', fontSize: '1.05rem', lineHeight: 1.6, maxWidth: '480px', margin: '0 auto 28px auto' }}>
          We have received your eyewear order and our optical lab is preparing it for secure packaging and expedited shipment.
        </p>

        {/* Order Details Card */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '32px',
            textAlign: 'left'
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <span style={{ display: 'block', fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase' }}>
                Order Reference
              </span>
              <strong style={{ fontSize: '1.15rem', color: '#0f172a' }}>#{id}</strong>
            </div>

            <div>
              <span style={{ display: 'block', fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase' }}>
                Order Status
              </span>
              <span className="badge status-pending" style={{ marginTop: '4px' }}>
                {order?.status || 'Pending / Confirmed'}
              </span>
            </div>

            <div>
              <span style={{ display: 'block', fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase' }}>
                Payment Method
              </span>
              <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>
                {order?.payment_method === 'COD' || order?.payment_method === 'Cash on Delivery'
                  ? 'Cash on Delivery (COD)'
                  : order?.payment_method || 'Cash on Delivery (COD)'}
              </strong>
            </div>

            <div>
              <span style={{ display: 'block', fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase' }}>
                Payment Status
              </span>
              <span
                style={{
                  display: 'inline-block',
                  marginTop: '4px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '4px',
                  background: order?.payment_status === 'Paid' ? '#dcfce7' : '#fef3c7',
                  color: order?.payment_status === 'Paid' ? '#15803d' : '#b45309'
                }}
              >
                {order?.payment_status || (order?.payment_method === 'COD' || order?.payment_method === 'Cash on Delivery' ? 'Pending' : 'Paid')}
              </span>
            </div>

            <div>
              <span style={{ display: 'block', fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase' }}>
                Order Total
              </span>
              <strong style={{ fontSize: '1.15rem', color: '#0f172a' }}>
                {order?.total ? `₹${Number(order.total).toLocaleString('en-IN')}` : 'Confirmed'}
              </strong>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/my-orders">
            <button className="btn-primary" style={{ padding: '14px 28px' }}>
              View My Orders →
            </button>
          </Link>
          <Link to="/">
            <button className="btn-secondary" style={{ padding: '14px 28px' }}>
              Continue Shopping
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccess;
