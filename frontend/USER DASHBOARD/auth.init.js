// auth-init.js — sets window._userId before chatbot.js runs on any page
(async function () {
  // If already set by a page-specific script (e.g. userdashboard.js), skip the fetch
  if (window._userId != null) return;

  const BASE_URL = "http://localhost:5000/api";

  function authHeaders() {
    const token = localStorage.getItem("ad_token");
    const h = { "Content-Type": "application/json" };
    if (token) h["Authorization"] = `Bearer ${token}`;
    return h;
  }

  try {
    const res = await fetch(`${BASE_URL}/user/profile`, {
      credentials: "include",
      headers: authHeaders(),
    });

    if (res.status === 401) {
      window._userId = null;
      return;
    }

    const user = await res.json();
    window._userId = user?.id ?? null;
  } catch {
    window._userId = null;
  }
})();
