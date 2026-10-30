import React, { useEffect, useState } from 'react';
import type { Review, ReviewStats, ReviewEligibility } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface ProductReviewsSectionProps {
  productId: number;
}

export const ProductReviewsSection: React.FC<ProductReviewsSectionProps> = ({ productId }) => {
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats>({ averageRating: 0, totalReviews: 0, ratingCounts: {} });
  const [eligibility, setEligibility] = useState<ReviewEligibility>({
    canReview: false,
    hasPurchased: false,
    alreadyReviewed: false,
    existingReview: null,
    orderId: null
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [reviewText, setReviewText] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingReviewId, setEditingReviewId] = useState<number | null>(null);

  useEffect(() => {
    loadReviewsData();
  }, [productId, isAuthenticated]);

  const loadReviewsData = async () => {
    try {
      setLoading(true);
      const data = await api.getProductReviews(productId);
      setReviews(data.reviews);
      setStats(data.stats);

      if (isAuthenticated) {
        const elig = await api.getReviewEligibility(productId);
        setEligibility(elig);
        if (elig.existingReview) {
          setRating(elig.existingReview.rating);
          setReviewText(elig.existingReview.review);
        }
      } else {
        setEligibility({
          canReview: false,
          hasPurchased: false,
          alreadyReviewed: false,
          existingReview: null,
          orderId: null
        });
      }
    } catch (err: unknown) {
      console.warn('Failed loading reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (rev: Review) => {
    setIsEditing(true);
    setEditingReviewId(rev.id);
    setRating(rev.rating);
    setReviewText(rev.review);
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setIsEditing(false);
    setEditingReviewId(null);
    if (!eligibility.existingReview) {
      setRating(5);
      setReviewText('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1 || rating > 5) {
      showToast('Please select a rating between 1 and 5 stars.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      if (isEditing && editingReviewId) {
        await api.updateReview(editingReviewId, { rating, review: reviewText });
        showToast('Review updated successfully!', 'success');
      } else {
        await api.submitReview(productId, { rating, review: reviewText });
        showToast('Thank you! Your verified review has been published.', 'success');
      }
      setShowForm(false);
      setIsEditing(false);
      setEditingReviewId(null);
      await loadReviewsData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save review';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (reviewId: number) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;
    try {
      await api.deleteReview(reviewId);
      showToast('Review deleted successfully', 'info');
      await loadReviewsData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete review';
      showToast(msg, 'error');
    }
  };

  const renderStars = (score: number, interactive = false) => {
    return (
      <div className={`star-rating-display ${interactive ? 'interactive' : ''}`}>
        {[1, 2, 3, 4, 5].map(star => {
          const filled = interactive ? (hoverRating || rating) >= star : score >= star;
          return (
            <span
              key={star}
              className={`star ${filled ? 'filled' : ''}`}
              onMouseEnter={() => interactive && setHoverRating(star)}
              onMouseLeave={() => interactive && setHoverRating(0)}
              onClick={() => interactive && setRating(star)}
              role={interactive ? 'button' : undefined}
              aria-label={interactive ? `${star} star` : undefined}
            >
              ★
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="product-reviews-container">
      <div className="reviews-header-block">
        <div>
          <h2 className="reviews-title">Customer Reviews & Ratings</h2>
          <p className="reviews-subtext">Authentic reviews from verified EyeKart buyers</p>
        </div>

        {eligibility.canReview && !showForm && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setIsEditing(false);
              setShowForm(true);
            }}
          >
            ★ Write a Review
          </button>
        )}

        {eligibility.alreadyReviewed && !showForm && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => eligibility.existingReview && handleStartEdit(eligibility.existingReview)}
          >
            ✏️ Edit My Review
          </button>
        )}
      </div>

      {/* Summary Scorecard */}
      <div className="reviews-scorecard">
        <div className="scorecard-main">
          <div className="scorecard-number">{Number(stats.averageRating).toFixed(1)}</div>
          <div className="scorecard-stars">{renderStars(Math.round(Number(stats.averageRating)))}</div>
          <div className="scorecard-count">Based on {stats.totalReviews} verified review{stats.totalReviews === 1 ? '' : 's'}</div>
        </div>

        <div className="scorecard-breakdown">
          {[5, 4, 3, 2, 1].map(stars => {
            const count = stats.ratingCounts[stars] || 0;
            const pct = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
            return (
              <div key={stars} className="breakdown-row">
                <span className="breakdown-label">{stars} ★</span>
                <div className="breakdown-track">
                  <div className="breakdown-fill" style={{ width: `${pct}%` }}></div>
                </div>
                <span className="breakdown-count">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Eligibility Notice for unauthenticated or non-purchasers */}
      {!isAuthenticated && (
        <div className="review-eligibility-note info">
          <span>ℹ️</span>
          <p>
            Have you purchased this frame? Sign in to share your verified review and rating!
          </p>
        </div>
      )}

      {isAuthenticated && !eligibility.hasPurchased && (
        <div className="review-eligibility-note neutral">
          <span>🛡️</span>
          <p>
            Reviews on EyeKart are restricted to verified purchasers who have ordered this eyewear. Once your order is placed, you can write a verified review.
          </p>
        </div>
      )}

      {/* Write / Edit Review Form */}
      {showForm && (
        <form className="review-form-card" onSubmit={handleSubmit}>
          <h3>{isEditing ? 'Update Your Review' : 'Write a Verified Review'}</h3>
          <p className="form-sub">Share your experience with fit, comfort, and build quality.</p>

          <div className="form-group">
            <label>Your Rating *</label>
            <div className="rating-selector">
              {renderStars(rating, true)}
              <span className="selected-rating-label">
                {rating === 5 && 'Outstanding (5/5)'}
                {rating === 4 && 'Very Good (4/5)'}
                {rating === 3 && 'Average (3/5)'}
                {rating === 2 && 'Below Average (2/5)'}
                {rating === 1 && 'Poor (1/5)'}
              </span>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="review-text-input">Your Feedback (Optional)</label>
            <textarea
              id="review-text-input"
              rows={4}
              className="form-control"
              placeholder="How do the frames feel? How is the lens clarity and weight?"
              value={reviewText}
              onChange={e => setReviewText(e.target.value)}
              maxLength={1000}
            />
            <small className="char-count">{reviewText.length}/1000 characters</small>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : isEditing ? 'Save Changes' : 'Submit Review'}
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleCancelForm}
              disabled={submitting}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Reviews List */}
      <div className="reviews-list">
        {loading ? (
          <div className="reviews-loading">Loading reviews...</div>
        ) : reviews.length === 0 ? (
          <div className="reviews-empty-state">
            <span className="empty-icon">💬</span>
            <h4>No reviews yet</h4>
            <p>No reviews yet. Be the first to share your experience.</p>
          </div>
        ) : (
          reviews.map(rev => {
            const isOwner = user?.id === rev.user_id;
            const isAdmin = user?.role === 'admin';
            return (
              <div key={rev.id} className="review-card">
                <div className="review-card-header">
                  <div className="reviewer-meta">
                    <div className="reviewer-avatar">
                      {rev.user_name ? rev.user_name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <div className="reviewer-name-line">
                        <span className="reviewer-name">{rev.user_name}</span>
                        <span className="badge-verified-buyer">✓ Verified Buyer</span>
                      </div>
                      <span className="review-date">
                        {new Date(rev.created_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="review-card-rating">
                    {renderStars(rev.rating)}
                  </div>
                </div>

                {rev.review && (
                  <p className="review-body-text">{rev.review}</p>
                )}

                {(isOwner || isAdmin) && (
                  <div className="review-card-actions">
                    {isOwner && (
                      <button
                        type="button"
                        className="btn-action-text"
                        onClick={() => handleStartEdit(rev)}
                      >
                        Edit
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn-action-text delete"
                      onClick={() => handleDelete(rev.id)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ProductReviewsSection;
