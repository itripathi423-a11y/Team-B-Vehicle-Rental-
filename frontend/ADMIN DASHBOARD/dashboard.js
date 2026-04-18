// ===== API BASE =====
const API = "http://localhost:5000/api/admin";

// ===== LOAD ADMIN PROFILE =====
async function loadAdmin() {
  try {
    const res = await fetch(`${API}/me`, {
      credentials: "include",
    });

    if (!res.ok) throw new Error();

    const d = await res.json();

    const name = d.name || "Admin";
    const role = d.role || "Admin";

    const initials = name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();

    document.getElementById("sidebarAdminName").textContent = name;
    document.getElementById("topbarAdminName").textContent = name;

    document.getElementById("sidebarAdminRole").textContent = role;
    document.getElementById("topbarAdminRole").textContent = role;

    document.getElementById("sidebarAvatarInitials").textContent = initials;
    document.getElementById("topbarAvatarInitials").textContent = initials;
  } catch (err) {
    console.log("Failed to load admin profile");
  }
}

// ===== LOAD DASHBOARD STATS =====
async function loadStats() {
  try {
    const res = await fetch(`${API}/dashboard/stats`, {
      credentials: "include",
    });

    if (!res.ok) throw new Error();

    const d = await res.json();

    document.getElementById("statVehicles").textContent = d.total_vehicles ?? 0;

    document.getElementById("statBookings").textContent =
      d.active_bookings ?? 0;

    document.getElementById("statRevenue").textContent =
      "Rs " + (d.revenue_this_month ?? 0).toLocaleString("en-NP");

    document.getElementById("statEnquiries").textContent =
      d.enquiries_today ?? 0;
  } catch (err) {
    console.log("Failed to load stats");
  }
}

// ===== LOAD BOOKINGS =====
async function loadBookings() {
  try {
    const res = await fetch(`${API}/bookings?limit=5`, {
      credentials: "include",
    });

    if (!res.ok) throw new Error();

    const data = await res.json();

    const list = Array.isArray(data) ? data : data.bookings || [];

    const tbody = document.getElementById("bookingsTableBody");

    if (!list.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-state">
            📋 No bookings found
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = list
      .map(
        (b) => `
      <tr>
        <td>#${b.booking_id}</td>
        <td>${b.user_name}</td>
        <td>${b.vehicle_name}</td>
        <td>${b.total_days} days</td>
        <td>Rs ${Number(b.total_price).toLocaleString("en-NP")}</td>
        <td>${b.status}</td>
      </tr>
    `,
      )
      .join("");
  } catch (err) {
    console.log("Failed to load bookings");
  }
}

// ===== SEARCH FUNCTION =====
document
  .getElementById("dashboardSearch")
  ?.addEventListener("input", function () {
    const q = this.value.toLowerCase();

    document.querySelectorAll("#bookingsTableBody tr").forEach((row) => {
      row.style.display = row.textContent.toLowerCase().includes(q)
        ? ""
        : "none";
    });
  });

// ===== INITIAL LOAD =====
loadAdmin();
loadStats();
loadBookings();
