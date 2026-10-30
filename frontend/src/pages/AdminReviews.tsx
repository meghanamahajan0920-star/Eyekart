import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import type { Review } from '../types';
import { useToast } from '../context/ToastContext';

export const AdminReviews: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { showToast } = useToast();

  const loadReviews = async () => {
    setLoading(true);
    try {
      const data = await api.getAdminReviews();
      setReviews(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch reviews';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = 'EyeKart Admin — Reviews';
    loadReviews();
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm(`Are you sure you want to delete review #${id}? This cannot be undone.`)) {
      return;
    }

    setDeletingId(id);
    try {
      await api.deleteReview(id);
      showToast(`Review #${id} has been deleted`, 'success');
      setReviews(prev => prev.filter(r => r.id !== id));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete review';
      showToast(msg, 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredReviews = reviews.filter(rev => {
    const matchesSearch =
      (rev.product_name && rev.product_name.toLowerCase().includes(search.toLowerCase())) ||
      (rev.user_name && rev.user_name.toLowerCase().includes(search.toLowerCase())) ||
      (rev.user_email && rev.user_email.toLowerCase().includes(search.toLowerCase())) ||
      (rev.review && rev.review.toLowerCase().includes(search.toLowerCase())) ||
      rev.id.toString().includes(search);

    const matchesRating = ratingFilter === 'all' || rev.rating === parseInt(ratingFilter, 10);
    return matchesSearch && matchesRating;
  });

  const totalCount = reviews.length;
  const avgRating = totalCount > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalCount).toFixed(1) : '0.0';

  return (
    <div className="section" style={{ maxWidth: '1200px', margin: '0 auto', padding: '30px 20px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Link to="/admin" style={{ textDecoration: 'none', color: '#4f46e5', fontWeight: 600 }}>
              &larr; Admin Dashboard
            </Link>
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#1e293b', marginTop: '8px' }}>
            Customer Reviews Management
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px', margin: '4px 0 0 0' }}>
            Moderate verified customer reviews and ratings across all eyewear products
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={loadReviews}
            disabled={loading}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}
      >
        <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 600 }}>TOTAL REVIEWS</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#1e293b', marginTop: '4px' }}>{totalCount}</div>
        </div>
        <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 600 }}>AVERAGE RATING</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#eab308', marginTop: '4px' }}>
            ★ {avgRating} <span style={{ fontSize: '14px', color: '#64748b' }}>/ 5</span>
          </div>
        </div>
        <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 600 }}>5-STAR REVIEWS</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#16a34a', marginTop: '4px' }}>
            {reviews.filter(r => r.rating === 5).length}
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          marginBottom: '20px',
          background: '#fff',
          padding: '16px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          alignItems: 'center'
        }}
      >
        <input
          type="text"
          placeholder="Search by product, customer, or keywords..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: '1 1 250px',
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            fontSize: '14px'
          }}
        />

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Rating:</label>
          <select
            value={ratingFilter}
            onChange={e => setRatingFilter(e.target.value)}
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '14px'
            }}
          >
            <option value="all">All Stars</option>
            <option value="5">5 Stars only</option>
            <option value="4">4 Stars only</option>
            <option value="3">3 Stars only</option>
            <option value="2">2 Stars only</option>
            <option value="1">1 Star only</option>
          </select>
        </div>

        {(search || ratingFilter !== 'all') && (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => {
              setSearch('');
              setRatingFilter('all');
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Reviews Table / List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px 0', color: '#64748b' }}>
          Loading reviews...
        </div>
      ) : filteredReviews.length === 0 ? (
        <div
          style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '40px',
            textAlign: 'center',
            border: '1px solid #e2e8f0'
          }}
        >
          <div style={{ fontSize: '36px', marginBottom: '10px' }}>💬</div>
          <h3 style={{ margin: '0 0 8px 0', color: '#1e293b' }}>No reviews found</h3>
          <p style={{ color: '#64748b', margin: 0 }}>
            {reviews.length === 0
              ? 'No customer reviews have been submitted yet.'
              : 'Try clearing your search filters.'}
          </p>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>ID</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Product</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Customer</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Rating</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Review Text</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Date</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReviews.map(rev => (
                  <tr key={rev.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: '#64748b' }}>#{rev.id}</td>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: '#1e293b' }}>
                      <Link to={`/products/${rev.product_id}`} style={{ color: '#4f46e5', textDecoration: 'none' }}>
                        {rev.product_name || `Product #${rev.product_id}`}
                      </Link>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{rev.user_name || 'Customer'}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{rev.user_email || `User #${rev.user_id}`}</div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          background: rev.rating >= 4 ? '#dcfce7' : rev.rating === 3 ? '#fef3c7' : '#fee2e2',
                          color: rev.rating >= 4 ? '#166534' : rev.rating === 3 ? '#92400e' : '#991b1b',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontWeight: 700,
                          fontSize: '12px'
                        }}
                      >
                        ★ {rev.rating} / 5
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', maxWidth: '320px', color: '#334155' }}>
                      {rev.review ? rev.review : <em style={{ color: '#94a3b8' }}>No review text provided</em>}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#64748b', fontSize: '13px' }}>
                      {new Date(rev.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => handleDelete(rev.id)}
                        disabled={deletingId === rev.id}
                        style={{
                          background: '#fee2e2',
                          color: '#dc2626',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        {deletingId === rev.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReviews;
