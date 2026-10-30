import React, { useEffect, useRef, useState } from 'react';
import type { Product } from '../types';
import { ProductImage } from './ProductImage';

interface VirtualTryOnModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
}

export const VirtualTryOnModal: React.FC<VirtualTryOnModalProps> = ({ product, isOpen, onClose }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraState, setCameraState] = useState<'requesting' | 'active' | 'denied' | 'unsupported'>('requesting');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Interactive frame controls
  const [scale, setScale] = useState<number>(1.0);
  const [offsetY, setOffsetY] = useState<number>(0);
  const [offsetX, setOffsetX] = useState<number>(0);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraState('unsupported');
      setErrorMessage('Camera access is not supported in this browser environment.');
      return;
    }

    setCameraState('requesting');
    setErrorMessage('');

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      });

      setStream(mediaStream);
      setCameraState('active');

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: unknown) {
      console.warn('Camera permission denied or failed:', err);
      setCameraState('denied');
      const msg = err instanceof Error ? err.message : 'Permission denied or camera in use';
      setErrorMessage(`Unable to access camera: ${msg}. You can still preview frame sizing below.`);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (e) {
          console.warn('Error stopping track:', e);
        }
      });
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  const handleReset = () => {
    setScale(1.0);
    setOffsetX(0);
    setOffsetY(0);
  };

  if (!isOpen) return null;

  return (
    <div className="vto-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="vto-modal-title">
      <div className="vto-modal-container">
        <div className="vto-modal-header">
          <div className="vto-header-info">
            <span className="vto-badge">FOUNDATION PREVIEW</span>
            <h2 id="vto-modal-title">Virtual Try-On: {product.name}</h2>
            <p className="vto-subtitle">Preview how this frame looks with your live camera.</p>
          </div>
          <button
            type="button"
            className="vto-close-btn"
            onClick={handleClose}
            aria-label="Close Virtual Try-On"
          >
            &times;
          </button>
        </div>

        <div className="vto-modal-body">
          <div className="vto-viewport">
            {cameraState === 'active' && (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="vto-video-feed"
                onLoadedMetadata={() => {
                  if (videoRef.current) {
                    videoRef.current.play().catch(e => console.warn('Play error:', e));
                  }
                }}
              />
            )}

            {cameraState === 'requesting' && (
              <div className="vto-placeholder">
                <div className="vto-spinner"></div>
                <p>Requesting camera permission...</p>
                <small>Please allow camera access when prompted by your browser.</small>
              </div>
            )}

            {(cameraState === 'denied' || cameraState === 'unsupported') && (
              <div className="vto-placeholder vto-fallback">
                <span className="vto-icon">📷</span>
                <h3>Camera Preview Unavailable</h3>
                <p>{errorMessage}</p>
                <p className="vto-instruction">
                  You can enable camera permissions in your browser address bar settings and retry.
                </p>
                <button type="button" className="btn btn-secondary vto-retry-btn" onClick={startCamera}>
                  Retry Camera Access
                </button>
              </div>
            )}

            {/* Frame Overlay Layer */}
            <div
              className="vto-frame-overlay"
              style={{
                transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
                pointerEvents: 'none'
              }}
            >
              <ProductImage
                product={product}
                className="vto-frame-img"
              />
            </div>

            {/* Align Guide Line */}
            {cameraState === 'active' && (
              <div className="vto-eye-guide">
                <span>Position eyes along this line</span>
              </div>
            )}
          </div>

          {/* Interactive controls */}
          <div className="vto-controls-panel">
            <div className="vto-control-group">
              <label>Frame Size: {Math.round(scale * 100)}%</label>
              <div className="vto-button-group">
                <button
                  type="button"
                  className="vto-btn-adjust"
                  onClick={() => setScale(s => Math.max(0.5, Number((s - 0.05).toFixed(2))))}
                  title="Make frame smaller"
                >
                  -
                </button>
                <input
                  type="range"
                  min="0.5"
                  max="1.6"
                  step="0.02"
                  value={scale}
                  onChange={e => setScale(parseFloat(e.target.value))}
                  className="vto-slider"
                />
                <button
                  type="button"
                  className="vto-btn-adjust"
                  onClick={() => setScale(s => Math.min(1.8, Number((s + 0.05).toFixed(2))))}
                  title="Make frame larger"
                >
                  +
                </button>
              </div>
            </div>

            <div className="vto-control-group">
              <label>Position Vertical: {offsetY}px</label>
              <div className="vto-button-group">
                <button
                  type="button"
                  className="vto-btn-adjust"
                  onClick={() => setOffsetY(y => y - 5)}
                  title="Move frame up"
                >
                  ▲
                </button>
                <input
                  type="range"
                  min="-120"
                  max="120"
                  step="2"
                  value={offsetY}
                  onChange={e => setOffsetY(parseInt(e.target.value, 10))}
                  className="vto-slider"
                />
                <button
                  type="button"
                  className="vto-btn-adjust"
                  onClick={() => setOffsetY(y => y + 5)}
                  title="Move frame down"
                >
                  ▼
                </button>
              </div>
            </div>

            <div className="vto-control-group">
              <label>Position Horizontal: {offsetX}px</label>
              <div className="vto-button-group">
                <button
                  type="button"
                  className="vto-btn-adjust"
                  onClick={() => setOffsetX(x => x - 5)}
                  title="Move frame left"
                >
                  ◀
                </button>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  step="2"
                  value={offsetX}
                  onChange={e => setOffsetX(parseInt(e.target.value, 10))}
                  className="vto-slider"
                />
                <button
                  type="button"
                  className="vto-btn-adjust"
                  onClick={() => setOffsetX(x => x + 5)}
                  title="Move frame right"
                >
                  ▶
                </button>
              </div>
            </div>

            <button type="button" className="btn btn-outline vto-reset-btn" onClick={handleReset}>
              Reset Frame Alignment
            </button>
          </div>

          {/* Privacy & Precision Notice */}
          <div className="vto-privacy-notice">
            <span className="vto-lock-icon">🔒</span>
            <p>
              <strong>Privacy First:</strong> Camera stream runs 100% locally on your device. No video or photos
              are captured, saved, or uploaded to any server. This preview provides an optical frame style foundation
              and does not replace clinical pupillary measurements.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VirtualTryOnModal;
