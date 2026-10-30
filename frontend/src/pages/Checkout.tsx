import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { ProductImage } from '../components/ProductImage';
import type { PrescriptionData } from '../types';

declare global {
  interface Window {
    Razorpay?: any;
  }
}

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export const Checkout: React.FC = () => {
  const { cart, cartTotal, increaseQuantity, decreaseQuantity, removeFromCart, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [form, setForm] = useState({
    customer_name: '',
    mobile: '',
    address: '',
    payment_method: 'Cash on Delivery'
  });
  const [loading, setLoading] = useState(false);
  const [paymentNotice, setPaymentNotice] = useState<string | null>(null);
  const [gatewayConfigured, setGatewayConfigured] = useState<boolean | null>(null);
  const [gatewayMessage, setGatewayMessage] = useState<string | null>(null);

  // Phase 6 Prescription State
  const [hasPrescription, setHasPrescription] = useState<boolean>(false);
  const [rightEye, setRightEye] = useState({ sph: '', cyl: '', axis: '' });
  const [leftEye, setLeftEye] = useState({ sph: '', cyl: '', axis: '' });
  const [pd, setPd] = useState<string>('');
  const [prescriptionNotes, setPrescriptionNotes] = useState<string>('');
  const [uploadingFile, setUploadingFile] = useState<boolean>(false);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      showToast('Invalid file format. Please upload a PDF, JPG, or PNG document.', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('File size exceeds the 5MB limit. Please upload a smaller file.', 'error');
      return;
    }

    setUploadingFile(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          const uploadRes = await api.uploadPrescription({
            filename: file.name,
            mimeType: file.type,
            data: base64Data
          });
          setUploadedFileUrl(uploadRes.filePath);
          setUploadedFileName(file.name);
          showToast('Prescription document uploaded successfully!', 'success');
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Failed to upload prescription file';
          showToast(msg, 'error');
        } finally {
          setUploadingFile(false);
        }
      };
      reader.onerror = () => {
        showToast('Error reading file. Please try again.', 'error');
        setUploadingFile(false);
      };
      reader.readAsDataURL(file);
    } catch {
      showToast('Upload failed', 'error');
      setUploadingFile(false);
    }
  };

  // Pre-fill user profile info, set document title, and check Razorpay gateway config
  useEffect(() => {
    document.title = 'EyeKart — Secure Checkout';
    if (user) {
      setForm((prev) => ({
        ...prev,
        customer_name: prev.customer_name || user.name || '',
        mobile: prev.mobile || user.mobile || ''
      }));
    }

    api.getPaymentConfig().then((cfg) => {
      setGatewayConfigured(cfg.configured);
      if (cfg.message) {
        setGatewayMessage(cfg.message);
      }
    }).catch(() => {
      setGatewayConfigured(false);
      setGatewayMessage('Unable to connect to payment gateway service.');
    });
  }, [user]);

  const handlePaymentMethodChange = (method: string) => {
    setForm({ ...form, payment_method: method });

    if (method !== 'Cash on Delivery' && method !== 'COD') {
      if (gatewayConfigured === false) {
        setPaymentNotice(
          gatewayMessage ||
          'Notice: Razorpay credentials (RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET) are not configured in backend/.env. Please configure test credentials to test online checkout, or select Cash on Delivery.'
        );
      } else {
        setPaymentNotice(
          method === 'UPI'
            ? 'Razorpay Test Mode (UPI): Opens direct UPI payment with Google Pay, PhonePe, Paytm, UPI ID & QR Code.'
            : 'Razorpay Test Mode (Cards / Netbanking): Opens secure payment modal for Credit/Debit Cards and Netbanking.'
        );
      }
    } else {
      setPaymentNotice(null);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="section" style={{ textAlign: 'center', padding: '80px 20px', maxWidth: '600px', margin: '0 auto' }}>
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: '#f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px auto',
            fontSize: '2.5rem'
          }}
        >
          🛒
        </div>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
          Your Shopping Cart is Empty
        </h2>
        <p style={{ color: '#64748b', fontSize: '1rem', lineHeight: 1.6, marginBottom: '28px' }}>
          Explore our stylish collection of eyeglasses, sunglasses, and screen protection lenses.
        </p>
        <Link to="/">
          <button className="btn-primary" style={{ padding: '14px 32px' }}>
            Browse Eyewear Catalog →
          </button>
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!form.customer_name.trim() || form.customer_name.trim().length < 2) {
      showToast('Please provide a valid full name', 'error');
      return;
    }
    if (!form.mobile.trim() || !/^\d{10,15}$/.test(form.mobile.trim())) {
      showToast('Please provide a valid 10-digit mobile number', 'error');
      return;
    }
    if (!form.address.trim() || form.address.trim().length < 5) {
      showToast('Please provide a complete delivery address', 'error');
      return;
    }

    const items = cart.map((i) => ({
      product_id: i.id,
      quantity: i.quantity,
      selected_color: i.selected_color || i.color || 'Standard',
      selected_image: i.selected_image || i.image,
      variant_id: i.variant_id
    }));
    setLoading(true);

    const prescriptionPayload: PrescriptionData | null = hasPrescription ? {
      has_prescription: true,
      right_sph: rightEye.sph.trim() || null,
      right_cyl: rightEye.cyl.trim() || null,
      right_axis: rightEye.axis.trim() || null,
      left_sph: leftEye.sph.trim() || null,
      left_cyl: leftEye.cyl.trim() || null,
      left_axis: leftEye.axis.trim() || null,
      pupillary_distance: pd.trim() || null,
      prescription_file_url: uploadedFileUrl || null,
      notes: prescriptionNotes.trim() || null
    } : null;

    // Flow A: Online Payment via Razorpay Test Mode
    if (form.payment_method !== 'Cash on Delivery' && form.payment_method !== 'COD') {
      if (gatewayConfigured === false) {
        showToast(
          gatewayMessage || 'Razorpay test credentials are not configured in backend/.env. Please configure RAZORPAY_KEY_ID or use Cash on Delivery.',
          'error'
        );
        setLoading(false);
        return;
      }
      try {
        const paymentInit = await api.createPaymentOrder(items);

        if (!paymentInit.success || !paymentInit.razorpayOrderId || !paymentInit.keyId) {
          showToast(
            paymentInit.message || 'Online payment is currently unavailable. Please choose Cash on Delivery.',
            'error'
          );
          setLoading(false);
          return;
        }

        if (!window.Razorpay) {
          const loaded = await loadRazorpayScript();
          if (!loaded || !window.Razorpay) {
            showToast('Payment gateway script failed to load. Please check your network or choose Cash on Delivery.', 'error');
            setLoading(false);
            return;
          }
        }

        const isUpi = form.payment_method === 'UPI';
        const options = {
          key: paymentInit.keyId,
          amount: paymentInit.amount,
          currency: paymentInit.currency || 'INR',
          name: 'EyeKart Eyewear',
          description: isUpi ? 'EyeKart UPI Payment (Test Mode)' : 'EyeKart Online Checkout (Test Mode)',
          order_id: paymentInit.razorpayOrderId,
          handler: async (response: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) => {
            if (!response || !response.razorpay_payment_id || !response.razorpay_signature) {
              showToast('Payment confirmation was not received from the gateway.', 'error');
              setLoading(false);
              return;
            }
            try {
              setLoading(true);
              const chosenMethod = isUpi ? 'UPI' : 'Cards / Netbanking';
              const verifyRes = await api.verifyPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                order_data: {
                  customer_name: form.customer_name.trim(),
                  mobile: form.mobile.trim(),
                  address: form.address.trim(),
                  payment_method: chosenMethod,
                  items: items,
                  prescription: prescriptionPayload
                }
              });

              clearCart();
              showToast('Payment verified successfully! Your order has been placed.', 'success');
              navigate(`/order-success/${verifyRes.order_id}`);
            } catch (verifyErr: any) {
              showToast(verifyErr.message || 'Payment verification failed. Please contact support.', 'error');
            } finally {
              setLoading(false);
            }
          },
          prefill: {
            name: form.customer_name.trim(),
            contact: form.mobile.trim(),
            email: user?.email || '',
            method: isUpi ? 'upi' : 'card'
          },
          theme: {
            color: '#0f172a'
          },
          modal: {
            ondismiss: () => {
              setLoading(false);
              showToast('Payment window closed. Your cart is preserved — you can retry or choose Cash on Delivery.', 'info');
            }
          }
        };

        const razorpayInstance = new window.Razorpay(options);
        razorpayInstance.on('payment.failed', (failData: any) => {
          const reason = failData?.error?.description || failData?.error?.reason || 'Transaction declined';
          showToast(`Payment declined: ${reason}. Please try again or choose Cash on Delivery.`, 'error');
          setLoading(false);
        });
        razorpayInstance.open();
      } catch (err: any) {
        showToast(
          err.message || 'Online payment is currently unavailable. Please choose Cash on Delivery.',
          'error'
        );
        setLoading(false);
      }
      return;
    }

    // Flow B: Cash on Delivery (COD)
    try {
      const res = await api.createOrder({
        customer_name: form.customer_name.trim(),
        mobile: form.mobile.trim(),
        address: form.address.trim(),
        payment_method: 'COD',
        items,
        prescription: prescriptionPayload
      });
      clearCart();
      showToast('Order placed successfully! Cash on Delivery confirmed.', 'success');
      navigate(`/order-success/${res.order_id}`);
    } catch (err: any) {
      showToast(err.message || 'Unable to place the order. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="section" style={{ maxWidth: '1160px', margin: '0 auto', padding: '40px 24px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2.1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
          Cart &amp; Checkout
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.98rem', margin: 0 }}>
          Review your items, enter delivery information, and select your preferred payment mode.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
          gap: '40px',
          alignItems: 'start'
        }}
      >
        {/* Left Column: Delivery & Payment Details Form */}
        <div>
          <div
            style={{
              background: 'white',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              padding: '32px',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)'
            }}
          >
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', marginBottom: '20px' }}>
              1. Delivery Information
            </h2>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Full Name *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. John Doe"
                    value={form.customer_name}
                    onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.95rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Mobile Number (for delivery updates) *
                  </label>
                  <input
                    required
                    type="tel"
                    pattern="\d{10,15}"
                    placeholder="10-digit mobile number"
                    value={form.mobile}
                    onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.95rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Complete Shipping Address *
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="House/flat no, street, locality, city, state, pincode"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.95rem'
                    }}
                  />
                </div>

                {/* 2. Optional Prescription Details */}
                <div style={{ marginTop: '16px', background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                      2. Prescription Lenses (Optional)
                    </h2>
                    <span style={{ fontSize: '0.8rem', background: '#e2e8f0', color: '#475569', padding: '3px 8px', borderRadius: '4px', fontWeight: 600 }}>
                      Custom Opticals
                    </span>
                  </div>

                  <p style={{ fontSize: '0.88rem', color: '#64748b', margin: '0 0 16px 0' }}>
                    Choose whether you require powered prescription lenses or standard non-powered frames.
                  </p>

                  <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                    <label
                      onClick={() => setHasPrescription(false)}
                      style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '8px',
                        border: !hasPrescription ? '2px solid #0f172a' : '1px solid #cbd5e1',
                        background: !hasPrescription ? '#ffffff' : '#f1f5f9',
                        cursor: 'pointer',
                        fontSize: '0.88rem',
                        fontWeight: 600,
                        textAlign: 'center'
                      }}
                    >
                      <input
                        type="radio"
                        name="rx_toggle"
                        checked={!hasPrescription}
                        onChange={() => setHasPrescription(false)}
                        style={{ marginRight: '6px' }}
                      />
                      Standard / Non-Prescription
                    </label>

                    <label
                      onClick={() => setHasPrescription(true)}
                      style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '8px',
                        border: hasPrescription ? '2px solid #0f172a' : '1px solid #cbd5e1',
                        background: hasPrescription ? '#ffffff' : '#f1f5f9',
                        cursor: 'pointer',
                        fontSize: '0.88rem',
                        fontWeight: 600,
                        textAlign: 'center'
                      }}
                    >
                      <input
                        type="radio"
                        name="rx_toggle"
                        checked={hasPrescription}
                        onChange={() => setHasPrescription(true)}
                        style={{ marginRight: '6px' }}
                      />
                      I have a Prescription 👓
                    </label>
                  </div>

                  {hasPrescription && (
                    <div style={{ background: '#ffffff', padding: '16px', borderRadius: '10px', border: '1px solid #cbd5e1', marginTop: '14px', overflowX: 'auto' }}>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', marginBottom: '12px' }}>
                        Enter Eye Power Details
                      </h3>

                      {/* Power grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr 1fr', gap: '8px', alignItems: 'center', marginBottom: '16px' }}>
                        <div></div>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textAlign: 'center' }}>SPH</span>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textAlign: 'center' }}>CYL</span>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textAlign: 'center' }}>AXIS</span>

                        <strong style={{ fontSize: '0.82rem', color: '#334155' }}>Right (OD)</strong>
                        <input
                          type="text"
                          placeholder="-2.00"
                          value={rightEye.sph}
                          onChange={e => setRightEye({ ...rightEye, sph: e.target.value })}
                          style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', textAlign: 'center' }}
                        />
                        <input
                          type="text"
                          placeholder="-0.50"
                          value={rightEye.cyl}
                          onChange={e => setRightEye({ ...rightEye, cyl: e.target.value })}
                          style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', textAlign: 'center' }}
                        />
                        <input
                          type="text"
                          placeholder="90°"
                          value={rightEye.axis}
                          onChange={e => setRightEye({ ...rightEye, axis: e.target.value })}
                          style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', textAlign: 'center' }}
                        />

                        <strong style={{ fontSize: '0.82rem', color: '#334155' }}>Left (OS)</strong>
                        <input
                          type="text"
                          placeholder="-2.25"
                          value={leftEye.sph}
                          onChange={e => setLeftEye({ ...leftEye, sph: e.target.value })}
                          style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', textAlign: 'center' }}
                        />
                        <input
                          type="text"
                          placeholder="-0.50"
                          value={leftEye.cyl}
                          onChange={e => setLeftEye({ ...leftEye, cyl: e.target.value })}
                          style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', textAlign: 'center' }}
                        />
                        <input
                          type="text"
                          placeholder="95°"
                          value={leftEye.axis}
                          onChange={e => setLeftEye({ ...leftEye, axis: e.target.value })}
                          style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', textAlign: 'center' }}
                        />
                      </div>

                      {/* Pupillary Distance (PD) */}
                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                          Pupillary Distance (PD in mm) — Optional
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 62"
                          value={pd}
                          onChange={e => setPd(e.target.value)}
                          style={{ width: '140px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                        />
                      </div>

                      {/* Doctor / Prescription Notes */}
                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                          Special Optical Instructions (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Include anti-scratch coating, progressive add +1.50"
                          value={prescriptionNotes}
                          onChange={e => setPrescriptionNotes(e.target.value)}
                          style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                        />
                      </div>

                      {/* Prescription Upload */}
                      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '14px', marginTop: '14px' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                          Or Upload Prescription Slip / Photo (PDF, JPG, PNG &le; 5MB)
                        </label>
                        <input
                          type="file"
                          accept="application/pdf,image/jpeg,image/png"
                          onChange={handleFileUpload}
                          disabled={uploadingFile}
                          style={{ fontSize: '0.85rem' }}
                        />
                        {uploadingFile && <span style={{ fontSize: '0.82rem', color: '#2563eb', marginLeft: '10px' }}>Uploading file...</span>}
                        {uploadedFileName && (
                          <div style={{ marginTop: '8px', fontSize: '0.85rem', color: '#166534', background: '#dcfce7', padding: '6px 12px', borderRadius: '6px', display: 'inline-block' }}>
                            ✓ Attached: {uploadedFileName}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ marginTop: '12px' }}>
                  <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>
                    3. Select Payment Mode
                  </h2>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label
                      onClick={() => handlePaymentMethodChange('Cash on Delivery')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '16px',
                        borderRadius: '10px',
                        border: form.payment_method === 'Cash on Delivery' ? '2px solid #0f172a' : '1px solid #e2e8f0',
                        background: form.payment_method === 'Cash on Delivery' ? '#f8fafc' : 'white',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input
                          type="radio"
                          name="payment_method"
                          checked={form.payment_method === 'Cash on Delivery'}
                          onChange={() => handlePaymentMethodChange('Cash on Delivery')}
                        />
                        <div>
                          <strong style={{ display: 'block', color: '#0f172a', fontSize: '0.95rem' }}>
                            Cash on Delivery (COD)
                          </strong>
                          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            Pay with cash or UPI directly when your spectacles arrive
                          </span>
                        </div>
                      </div>
                      <span style={{ fontSize: '1.3rem' }}>💵</span>
                    </label>

                    <label
                      onClick={() => handlePaymentMethodChange('Credit Card')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '16px',
                        borderRadius: '10px',
                        border: form.payment_method === 'Credit Card' ? '2px solid #0f172a' : '1px solid #e2e8f0',
                        background: form.payment_method === 'Credit Card' ? '#f8fafc' : 'white',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input
                          type="radio"
                          name="payment_method"
                          checked={form.payment_method === 'Credit Card'}
                          onChange={() => handlePaymentMethodChange('Credit Card')}
                        />
                        <div>
                          <strong style={{ color: '#0f172a', fontSize: '0.95rem', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                            Online Payment (Cards / Netbanking)
                            {gatewayConfigured === false && (
                              <span style={{ fontSize: '0.72rem', background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                                Test Keys Required in .env
                              </span>
                            )}
                          </strong>
                          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            Encrypted 256-bit checkout via Razorpay Test Gateway
                          </span>
                        </div>
                      </div>
                      <span style={{ fontSize: '1.3rem' }}>💳</span>
                    </label>

                    <label
                      onClick={() => handlePaymentMethodChange('UPI')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '16px',
                        borderRadius: '10px',
                        border: form.payment_method === 'UPI' ? '2px solid #0f172a' : '1px solid #e2e8f0',
                        background: form.payment_method === 'UPI' ? '#f8fafc' : 'white',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input
                          type="radio"
                          name="payment_method"
                          checked={form.payment_method === 'UPI'}
                          onChange={() => handlePaymentMethodChange('UPI')}
                        />
                        <div>
                          <strong style={{ color: '#0f172a', fontSize: '0.95rem', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                            Instant UPI Payment
                            {gatewayConfigured === false && (
                              <span style={{ fontSize: '0.72rem', background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                                Test Keys Required in .env
                              </span>
                            )}
                          </strong>
                          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            Google Pay, PhonePe, Paytm &amp; QR via Razorpay
                          </span>
                        </div>
                      </div>
                      <span style={{ fontSize: '1.3rem' }}>📱</span>
                    </label>
                  </div>
                </div>

                {paymentNotice && (
                  <div
                    style={{
                      padding: '14px',
                      background: gatewayConfigured === false && form.payment_method !== 'Cash on Delivery' ? '#fffbeb' : '#eff6ff',
                      border: gatewayConfigured === false && form.payment_method !== 'Cash on Delivery' ? '1px solid #fde68a' : '1px solid #bfdbfe',
                      color: gatewayConfigured === false && form.payment_method !== 'Cash on Delivery' ? '#92400e' : '#1e40af',
                      borderRadius: '8px',
                      fontSize: '0.88rem',
                      lineHeight: 1.5
                    }}
                  >
                    {gatewayConfigured === false && form.payment_method !== 'Cash on Delivery' ? '⚠️' : 'ℹ️'} {paymentNotice}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary"
                  style={{
                    marginTop: '16px',
                    width: '100%',
                    padding: '16px',
                    fontSize: '1.05rem',
                    fontWeight: 700
                  }}
                >
                  {loading
                    ? 'Processing Order...'
                    : form.payment_method === 'Cash on Delivery' || form.payment_method === 'COD'
                    ? `Place Cash on Delivery Order (₹${cartTotal.toLocaleString('en-IN')})`
                    : form.payment_method === 'UPI'
                    ? `Proceed to UPI Payment (₹${cartTotal.toLocaleString('en-IN')})`
                    : `Proceed to Razorpay Payment (₹${cartTotal.toLocaleString('en-IN')})`}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Order Summary & Item List */}
        <div>
          <div
            style={{
              background: 'white',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              padding: '28px',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Order Summary ({cart.length} {cart.length === 1 ? 'item' : 'items'})
              </h2>
              <button
                type="button"
                onClick={clearCart}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Clear Cart
              </button>
            </div>

            {/* Cart Items List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              {cart.map((item) => {
                const itemKey = `${item.id}_${item.variant_id ?? ''}_${item.selected_color ?? ''}`;
                const itemColor = item.selected_color || item.color;
                const itemImage = item.selected_image || item.image;

                return (
                  <div
                    key={itemKey}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '70px 1fr auto',
                      gap: '14px',
                      alignItems: 'center',
                      paddingBottom: '16px',
                      borderBottom: '1px solid #f1f5f9'
                    }}
                  >
                    {/* Thumbnail */}
                    <div
                      style={{
                        width: '70px',
                        height: '70px',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        border: '1px solid #e2e8f0',
                        background: '#f8fafc'
                      }}
                    >
                      <ProductImage product={item} overrideImage={itemImage} />
                    </div>

                    {/* Title, Color Badge & Quantity Controls */}
                    <div>
                      <h4
                        style={{
                          margin: '0 0 4px 0',
                          fontSize: '0.96rem',
                          fontWeight: 700,
                          color: '#0f172a',
                          lineHeight: 1.3
                        }}
                      >
                        {item.name}
                      </h4>

                      {itemColor && (
                        <div style={{ marginBottom: '6px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              background: '#f1f5f9',
                              color: '#334155',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              border: '1px solid #e2e8f0'
                            }}
                          >
                            Color: <strong style={{ color: '#0284c7' }}>{itemColor}</strong>
                          </span>
                        </div>
                      )}

                      <p style={{ margin: '0 0 8px 0', color: '#64748b', fontSize: '0.85rem' }}>
                        ₹{Number(item.price).toLocaleString('en-IN')} each
                      </p>

                      <div style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                        <button
                          type="button"
                          onClick={() => decreaseQuantity(item.id, item.selected_color, item.variant_id)}
                          style={{ width: '28px', height: '28px', border: 'none', background: '#f8fafc', cursor: 'pointer', fontWeight: 700 }}
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <span style={{ width: '28px', textAlign: 'center', fontSize: '0.88rem', fontWeight: 700 }}>
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => increaseQuantity(item.id, item.selected_color, item.variant_id)}
                          style={{ width: '28px', height: '28px', border: 'none', background: '#f8fafc', cursor: 'pointer', fontWeight: 700 }}
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Item Subtotal & Remove */}
                    <div style={{ textAlign: 'right' }}>
                      <strong style={{ display: 'block', fontSize: '1rem', color: '#0f172a' }}>
                        ₹{(Number(item.price) * item.quantity).toLocaleString('en-IN')}
                      </strong>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id, item.selected_color, item.variant_id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          padding: '4px 0',
                          marginTop: '6px'
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Calculations Breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.92rem', color: '#475569' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>₹{cartTotal.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803d' }}>
                <span>Standard Delivery</span>
                <span style={{ fontWeight: 700 }}>FREE</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Protective Hard Case &amp; Cloth</span>
                <span style={{ fontWeight: 700, color: '#15803d' }}>Complimentary</span>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginTop: '12px',
                  paddingTop: '16px',
                  borderTop: '2px solid #e2e8f0',
                  fontSize: '1.35rem',
                  fontWeight: 800,
                  color: '#0f172a'
                }}
              >
                <span>Grand Total</span>
                <span>₹{cartTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Trust Assurances */}
            <div
              style={{
                marginTop: '24px',
                padding: '16px',
                background: '#f8fafc',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontSize: '0.82rem',
                color: '#64748b'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>✓</span>
                <span>Includes 1-Year Comprehensive Lens &amp; Frame Warranty</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>✓</span>
                <span>14-Day Free Replacement Policy</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
