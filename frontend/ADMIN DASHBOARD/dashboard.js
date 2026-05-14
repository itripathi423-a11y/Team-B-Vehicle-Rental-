// dashboard.js

document.addEventListener("DOMContentLoaded", () => {
  const API = "http://localhost:5000/api/admin";

  function fmtMoney(n) {
    return "Rs " + Number(n).toLocaleString("en-NP");
  }
  function fmtDur(d) {
    return !d ? "—" : d === 1 ? "1 day" : d + " days";
  }
  function statusBadge(s) {
    const m = {
      active: ["badge-green", "Active"],
      confirmed: ["badge-green", "Confirmed"],
      pending: ["badge-amber", "Pending"],
      completed: ["badge-grey", "Completed"],
      cancelled: ["badge-red", "Cancelled"],
    };
    const [cls, label] = m[(s || "").toLowerCase()] || ["badge-grey", s || "—"];
    return `<span class="${cls}"><span class="dot"></span>${label}</span>`;
  }

  // ── Admin Profile ─────────────────────────────────────────────────────────
  async function loadAdmin() {
    try {
      const res = await fetch(`${API}/me`, { credentials: "include" });
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
      document.getElementById("dropdownAdminName").textContent = name;
      document.getElementById("dropdownAdminEmail").textContent =
        d.email || "—";
    } catch {
      console.log("Failed to load admin profile");
    }
  }

  // ── Stats ─────────────────────────────────────────────────────────────────
  async function loadStats() {
    try {
      const res = await fetch(`${API}/stats`, { credentials: "include" });
      if (!res.ok) throw new Error();
      const d = await res.json();

      document.getElementById("statVehicles").textContent =
        d.total_vehicles ?? 0;
      document.getElementById("statBookings").textContent =
        d.active_bookings ?? 0;
      document.getElementById("statRevenue").textContent = fmtMoney(
        d.revenue_this_month ?? 0,
      );
      document.getElementById("statEnquiries").textContent =
        d.total_enquiries ?? 0;
    } catch {
      console.log("Failed to load stats");
    }
  }

  // ── Recent Bookings ───────────────────────────────────────────────────────
  async function loadBookings() {
    try {
      const res = await fetch(`${API}/bookings`, { credentials: "include" });
      const data = await res.json();
      const list = (data.data || []).slice(0, 5);
      const tbody = document.getElementById("bookingsTableBody");

      if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-state">📋 No bookings found</td></tr>`;
        const sub = document.getElementById("bookingSubtitle");
        if (sub) sub.textContent = "No recent bookings";
        return;
      }

      tbody.innerHTML = list
        .map(
          (b) => `
        <tr>
          <td>#${b.id}</td>
          <td>${b.user_name || "—"}</td>
          <td>${b.vehicle_name || "—"}</td>
          <td>${fmtDur(b.total_days)}</td>
          <td>${fmtMoney(b.total_price)}</td>
          <td>${statusBadge(b.status)}</td>
        </tr>`,
        )
        .join("");

      const sub = document.getElementById("bookingSubtitle");
      if (sub)
        sub.textContent = `Showing ${list.length} most recent booking${list.length !== 1 ? "s" : ""}`;
    } catch (err) {
      console.error("Failed to load bookings:", err);
    }
  }

  // ── Monthly Bar Chart ──────────────────────────────────────────────────────
  let barChartInstance = null;

  async function loadBarChart() {
    const canvas = document.getElementById("barChart");
    if (!canvas) {
      console.warn("barChart canvas not found");
      return;
    }

    const wrap = canvas.parentElement;

    try {
      const res = await fetch(`${API}/chart-data`, { credentials: "include" });

      if (!res.ok) {
        console.error("chart-data API error:", res.status, res.statusText);
        wrap.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#dc2626;font-size:13px;">⚠ Chart API error ${res.status}</div>`;
        return;
      }

      const json = await res.json();
      if (!json.success) throw new Error(json.message);

      const { bookings, revenue } = json.data;
      const MONTHS = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];

      // Recreate canvas if it was replaced by error message
      let ctx;
      const existingCanvas = document.getElementById("barChart");
      if (existingCanvas) {
        ctx = existingCanvas.getContext("2d");
      } else {
        const newCanvas = document.createElement("canvas");
        newCanvas.id = "barChart";
        wrap.innerHTML = "";
        wrap.appendChild(newCanvas);
        ctx = newCanvas.getContext("2d");
      }

      if (barChartInstance) barChartInstance.destroy();

      barChartInstance = new Chart(ctx, {
        type: "bar",
        data: {
          labels: MONTHS,
          datasets: [
            {
              label: "Revenue (Rs)",
              data: revenue,
              backgroundColor: "rgba(255, 92, 26, 0.85)",
              borderRadius: 6,
              borderSkipped: false,
              yAxisID: "yRevenue",
              order: 1,
            },
            {
              label: "Bookings",
              data: bookings,
              type: "line",
              borderColor: "#6b7280",
              backgroundColor: "rgba(107,114,128,0.12)",
              borderWidth: 2,
              pointBackgroundColor: "#6b7280",
              pointRadius: 4,
              tension: 0.4,
              fill: true,
              yAxisID: "yBookings",
              order: 0,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: "index", intersect: false },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  if (ctx.dataset.label === "Revenue (Rs)")
                    return ` Revenue: Rs ${Number(ctx.raw).toLocaleString("en-NP")}`;
                  return ` Bookings: ${ctx.raw}`;
                },
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { font: { size: 11 }, color: "#9ca3af" },
            },
            yRevenue: {
              position: "left",
              grid: { color: "#f3f4f6" },
              ticks: {
                font: { size: 11 },
                color: "#9ca3af",
                callback: (v) => "Rs " + Number(v).toLocaleString("en-NP"),
              },
            },
            yBookings: {
              position: "right",
              grid: { display: false },
              min: 0,
              ticks: {
                font: { size: 11 },
                color: "#9ca3af",
                stepSize: 1,
                callback: (v) => (Number.isInteger(v) ? v : ""),
              },
            },
          },
        },
      });
    } catch (err) {
      console.error("Bar chart error:", err);
      wrap.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#dc2626;font-size:13px;">⚠ Could not load chart: ${err.message}</div>`;
    }
  }

  // ── Fleet Utilization ──────────────────────────────────────────────────────
  async function loadFleetUtilization() {
    const container = document.querySelector(".util-list");
    if (!container) return;

    try {
      const res = await fetch(`${API}/fleet-utilization`, {
        credentials: "include",
      });

      if (!res.ok) {
        console.error("fleet-utilization API error:", res.status);
        container.innerHTML = `<p style="color:#dc2626;font-size:13px;">⚠ Fleet API error ${res.status}</p>`;
        return;
      }

      const json = await res.json();
      if (!json.success) throw new Error(json.message);

      const rows = json.data;

      if (!rows.length) {
        container.innerHTML = `<p style="color:var(--muted);font-size:13px;">No fleet data available.</p>`;
        return;
      }

      const top = [...rows].sort((a, b) => b.pct - a.pct).slice(0, 4);

      container.innerHTML = top
        .map(
          ({ label, total, booked, pct }) => `
        <div>
          <div class="util-row">
            <span class="util-name">${label}s <span style="font-size:11px;color:#9ca3af;">(${booked}/${total})</span></span>
            <span class="util-pct">${pct}%</span>
          </div>
          <div class="util-bar">
            <div class="util-fill" style="--w:${pct}%"></div>
          </div>
        </div>`,
        )
        .join("");

      const top1 = top[0];
      const insEl = document.querySelector(".ins-txt");
      if (insEl && top1) {
        insEl.textContent =
          top1.pct >= 50
            ? `"${top1.label}s are your top-performing category at ${top1.pct}% utilization (${top1.booked}/${top1.total} vehicles). Consider expanding this fleet."`
            : `"Overall utilization is moderate. ${top1.label}s lead at ${top1.pct}%. Review pricing or marketing to increase bookings."`;
      }
    } catch (err) {
      console.error("Fleet utilization error:", err);
      if (container) {
        container.innerHTML = `<p style="color:#dc2626;font-size:13px;">⚠ Could not load utilization data.</p>`;
      }
    }
  }

  // ── User Dropdown ──────────────────────────────────────────────────────────
  document
    .getElementById("topbarUser")
    ?.addEventListener("click", function (e) {
      e.stopPropagation();
      const dd = document.getElementById("userDropdown");
      const open = dd.classList.contains("visible");
      dd.classList.toggle("visible", !open);
      this.classList.toggle("open", !open);
    });
  document.addEventListener("click", () => {
    document.getElementById("userDropdown")?.classList.remove("visible");
    document.getElementById("topbarUser")?.classList.remove("open");
  });

  // ── Logout ─────────────────────────────────────────────────────────────────
  document.getElementById("logoutBtn")?.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await fetch(`${API}/logout`, { method: "POST", credentials: "include" });
    } finally {
      window.location.href = "../index.html";
    }
  });

  // ── Search ─────────────────────────────────────────────────────────────────
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

  // ── Init ───────────────────────────────────────────────────────────────────
  loadAdmin();
  loadStats();
  loadBookings();
  loadBarChart();
  loadFleetUtilization();
}); // end DOMContentLoaded
