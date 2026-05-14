"use client";
import { useState } from "react";
import "./globals.css";

export default function PaymentPage() {
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("1000");

  const handleEsewaPayment = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          gateway: "esewa",
          productId: `booking-${Date.now()}`,
        }),
      });
      const data = await res.json();
      if (data.formHtml) {
        document.open();
        document.write(data.formHtml);
        document.close();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">AD</div>
          <div>
            <div className="brand-name">AUTO DEALER</div>
            <div className="brand-sub">Fleet Management</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          <a className="nav-item" href="#">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            Dashboard
          </a>
          <a className="nav-item" href="#">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
            Vehicles
          </a>
          <a className="nav-item" href="#">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
            My Bookings
          </a>
          <a className="nav-item active" href="#">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/></svg>
            Payment
          </a>
          <a className="nav-item" href="#">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            KYC
          </a>
          <a className="nav-item" href="#">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/></svg>
            Wishlist
          </a>
        </nav>
        <div className="sidebar-user">
          <div className="user-avatar">RR</div>
          <div>
            <div className="user-name">Ram Rai</div>
            <div className="user-badge">✓ KYC Verified</div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="main-content">
        <header className="top-bar">
          <h1 className="page-title">Payment</h1>
          <div className="top-bar-right">
            <button className="icon-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            </button>
            <div className="user-chip">
              <div className="user-avatar sm">RR</div>
              <div>
                <div className="user-name">Ram Rai</div>
                <div className="user-badge">✓ Verified Member</div>
              </div>
            </div>
          </div>
        </header>

        {/* KYC Banner */}
        <div className="kyc-banner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <div>
            <strong>Complete your KYC verification</strong>
            <p>Your account is limited until identity verification is complete. It only takes 2 minutes.</p>
          </div>
          <button className="btn-verify">Verify Now →</button>
        </div>

        {/* Hero */}
        <div className="hero-card">
          <div>
            <h2 className="hero-title">COMPLETE YOUR <span className="accent">BOOKING</span> 👋</h2>
            <p className="hero-sub">Secure your vehicle rental with eSewa — Nepal's most trusted digital payment platform.</p>
          </div>
          <button className="btn-primary" onClick={() => document.getElementById("payment-form")?.scrollIntoView({ behavior: "smooth" })}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/></svg>
            Pay Now
          </button>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon orange"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg></div>
            <div className="stat-value">2</div>
            <div className="stat-label">Total Bookings</div>
            <div className="stat-sub">Lifetime rentals</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22"><polyline points="20 6 9 17 4 12"/></svg></div>
            <div className="stat-value">2</div>
            <div className="stat-label">Completed</div>
            <div className="stat-sub">Successful trips</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon yellow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
            <div className="stat-value">0</div>
            <div className="stat-label">Active Booking</div>
            <div className="stat-sub">Currently rented</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon purple"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
            <div className="stat-value" style={{fontSize:"1.5rem"}}>VERIFIED</div>
            <div className="stat-label">KYC Status</div>
            <div className="stat-sub">Status</div>
          </div>
        </div>

        {/* Payment Form */}
        <div className="section-title">Quick Payment</div>
        <div className="quick-actions" id="payment-form">
          <div className="payment-card">
            <div className="payment-card-header">
              <div className="esewa-logo">
                <svg viewBox="0 0 60 24" width="60" height="24" fill="none">
                  <text x="0" y="18" fontFamily="sans-serif" fontWeight="800" fontSize="18" fill="#60BB46">e</text>
                  <text x="14" y="18" fontFamily="sans-serif" fontWeight="700" fontSize="14" fill="#1a1a2e">Sewa</text>
                </svg>
              </div>
              <span className="badge-secure">🔒 Secure</span>
            </div>
            <p className="payment-desc">Pay via eSewa — Nepal's leading digital wallet. Test or live credentials supported.</p>
            <div className="form-group">
              <label className="form-label">Amount (NPR)</label>
              <div className="input-wrap">
                <span className="input-prefix">रू</span>
                <input
                  className="form-input"
                  type="number"
                  min="1"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                />
              </div>
            </div>
            <button
              className="btn-pay"
              onClick={handleEsewaPayment}
              disabled={loading}
            >
              {loading ? (
                <span className="spinner" />
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/></svg>
                  Pay रू {Number(amount).toLocaleString()} with eSewa
                </>
              )}
            </button>
            <div className="test-creds">
              <span className="test-badge">TEST</span>
              Login: <strong>9806800001</strong> · Pass: <strong>Nepal@123</strong> · OTP: <strong>123456</strong>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
