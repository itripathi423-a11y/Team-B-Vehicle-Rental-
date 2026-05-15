// auth-init.js — sets window._userId and handles role-based redirect
(async function () {
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

      // if on a user dashboard page, redirect to login
      const userPages = [
        "vehicle-details.html",
        "user.vehicle.listing.html",
        "userdashboard.html",
        "mybooking.html",
        "kyc.html",
        "user.wishlist.html",
        "user.booking.html",
        "profile.html",
      ];
      const currentPage = location.pathname.split("/").pop();
      if (userPages.includes(currentPage)) {
        window.location.href = "/index.html";
      }
      return;
    }

    const data = await res.json();
    const user = data.user ?? data;
    window._userId = user?.id ?? null;

    const role = user?.role ?? null;

    const currentPage = location.pathname.split("/").pop();

    // admin should not access user dashboard pages
    const userOnlyPages = [
      "vehicle-details.html",
      "user.vehicle.listing.html",
      "userdashboard.html",
      "mybooking.html",
      "kyc.html",
      "user.wishlist.html",
      "user.booking.html",
      "profile.html",
    ];

    if (role === "admin" && userOnlyPages.includes(currentPage)) {
      window.location.href = "/ADMIN%20DASHBOARD/dashboard.html";
      return;
    }

    // user should not access admin pages
    const adminOnlyPages = ["dashboard.html", "admin.vehicles.html"];
    if (role === "user" && adminOnlyPages.includes(currentPage)) {
      window.location.href = "/USER%20DASHBOARD/userdashboard.html";
      return;
    }
  } catch {
    window._userId = null;
  }
})();
