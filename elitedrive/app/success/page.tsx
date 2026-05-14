"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const gateway = searchParams.get("gateway");
    const data = searchParams.get("data");
    const payment = searchParams.get("payment");

    if (payment === "failed") {
      setStatus("failed");
      setMessage("Payment was not completed.");
      return;
    }

    if (gateway === "esewa" && data) {
      fetch(`/api/checkout-session?data=${data}`)
        .then(r => r.json())
        .then(d => {
          if (d.success) {
            setStatus("success");
            setMessage("Your eSewa payment was verified successfully.");
          } else {
            setStatus("failed");
            setMessage("Payment verification failed. Please contact support.");
          }
        })
        .catch(() => {
          setStatus("failed");
          setMessage("Error verifying payment.");
        });
    } else {
      setStatus("failed");
      setMessage("Unknown payment status.");
    }
  }, [searchParams]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f4f6fb",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@700&family=DM+Sans:wght@400;600&display=swap');`}</style>
      <div style={{
        background: "white",
        borderRadius: "16px",
        padding: "48px",
        boxShadow: "0 2px 24px rgba(0,0,0,0.09)",
        textAlign: "center",
        maxWidth: "420px",
        width: "90%",
      }}>
        {status === "loading" && (
          <>
            <div style={{ width: 48, height: 48, borderRadius: "50%", border: "3px solid #e5e7eb", borderTopColor: "#f97316", animation: "spin 0.7s linear infinite", margin: "0 auto 20px" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p style={{ color: "#6b7280" }}>Verifying payment…</p>
          </>
        )}
        {status === "success" && (
          <>
            <div style={{ width: 64, height: 64, background: "rgba(34,197,94,0.12)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" width="32" height="32"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <h1 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: "28px", fontWeight: 700, color: "#1a1a2e", marginBottom: "10px" }}>Payment Successful!</h1>
            <p style={{ color: "#6b7280", fontSize: "14px", marginBottom: "28px" }}>{message}</p>
            <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#f97316", color: "white", textDecoration: "none", borderRadius: "10px", padding: "12px 24px", fontWeight: 600, fontSize: "14px" }}>
              ← Back to Dashboard
            </a>
          </>
        )}
        {status === "failed" && (
          <>
            <div style={{ width: 64, height: 64, background: "rgba(239,68,68,0.1)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" width="32" height="32"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </div>
            <h1 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: "28px", fontWeight: 700, color: "#1a1a2e", marginBottom: "10px" }}>Payment Failed</h1>
            <p style={{ color: "#6b7280", fontSize: "14px", marginBottom: "28px" }}>{message}</p>
            <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#f97316", color: "white", textDecoration: "none", borderRadius: "10px", padding: "12px 24px", fontWeight: 600, fontSize: "14px" }}>
              ← Try Again
            </a>
          </>
        )}
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
