# EliteDrive – Payment Integration

Complete Next.js app with eSewa + Khalti payment gateways.

---

## 🚀 Quick Start

### 1. Install Node.js
Download from https://nodejs.org (choose LTS version)

### 2. Open this folder in terminal
```bash
cd elitedrive
```

### 3. Install dependencies
```bash
npm install
```

### 4. Add your API keys to `.env.local`
Open `.env.local` and fill in:
```
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_ESEWA_MERCHANT_CODE=EPAYTEST
ESEWA_SECRET_KEY=8gBm/:&EnhH.1/q
ESEWA_VERIFY_URL=https://rc-epay.esewa.com.np/api/epay/transaction/status/
KHALTI_SECRET_KEY=your_khalti_key_here
KHALTI_VERIFY_URL=https://a.khalti.com/api/v2/epayment/lookup/
```

### 5. Run the app
```bash
npm run dev
```

### 6. Open in browser
http://localhost:3000

---

## 🧪 Test Credentials

### eSewa (already in .env.local)
- Merchant Code: `EPAYTEST`
- Secret Key: `8gBm/:&EnhH.1/q`
- Test Login: `9806800001` / Password: `Nepal@123` / OTP: `123456`

### Khalti
- Get test key from: https://khalti.com/merchant
- Test wallet: `9800000001` / MPIN: `1111` / OTP: `987654`

---

## 📁 Project Structure

```
elitedrive/
├── app/
│   ├── api/checkout-session/route.ts  ← Payment API (POST=initiate, GET=verify)
│   ├── success/page.tsx               ← Payment result page
│   ├── page.tsx                       ← Main payment UI
│   ├── layout.tsx
│   └── globals.css
├── lib/
│   ├── generateEsewaSignature.ts      ← HMAC-SHA256 for eSewa
│   └── types.ts                       ← TypeScript types
├── .env.local                         ← YOUR SECRET KEYS (never commit this!)
└── package.json
```

---

## 🌐 For Production

1. Replace `.env.local` keys with live credentials
2. Change eSewa URL to: `https://epay.esewa.com.np/api/epay/main/v2/form`
3. Change verify URLs to production endpoints
4. Deploy to Vercel: `npx vercel`

---

## ⚠️ Security Notes
- Never expose secret keys in client-side code
- All signing happens server-side in `/api/checkout-session/route.ts`
- Always verify payments server-side before confirming bookings
