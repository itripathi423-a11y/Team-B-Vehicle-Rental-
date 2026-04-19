const API = "http://localhost:5000/api/vehicles";
const IMG_BASE = "http://localhost:5000/uploads/vehicles/";
let allVehicles = [];
let showingDeleted = false;
// ── Topbar user dropdown ──────────────────────────
const topbarUser = document.getElementById("topbarUser");
const userDropdown = document.getElementById("userDropdown");
const logoutBtn = document.getElementById("logoutBtn");

topbarUser.addEventListener("click", (e) => {
  e.stopPropagation();
  userDropdown.classList.toggle("open");
});

// Close when clicking outside
document.addEventListener("click", () => {
  userDropdown.classList.remove("open");
});

// Logout — ends session and redirects
logoutBtn.addEventListener("click", async () => {
  try {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  } finally {
    window.location.href = "../../index.html";
  }
});

// ── Toast ──────────────────────────────────────────────────────
function toast(msg, type = "success") {
  const icon = type === "success" ? "✅" : type === "error" ? "❌" : "⚠️";
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-icon">${icon}</span><span>${msg}</span>`;
  document.getElementById("toastWrap").appendChild(el);
  setTimeout(() => el.remove(), 3800);
}

// ── Stats ─────────────────────────────────────────────────────
async function loadStats() {
  try {
    const r = await fetch(`${API}/stats`);
    const d = await r.json();
    if (d.success) {
      document.getElementById("statTotal").textContent = d.data.total;
      document.getElementById("statAvail").textContent = d.data.available;
      document.getElementById("statBooked").textContent = d.data.booked;
      document.getElementById("statHidden").textContent = d.data.hidden;
    }
  } catch {}
}

// ── Load Vehicles ─────────────────────────────────────────────
async function loadVehicles() {
  try {
    const url = showingDeleted ? `${API}?deleted=only` : API;
    const r = await fetch(url);
    const d = await r.json();
    allVehicles = d.data || [];
    renderTable(allVehicles);
    loadStats();
  } catch (e) {
    toast("Failed to load vehicles.", "error");
  }
}

function renderTable(data) {
  const tbody = document.getElementById("vehicleTableBody");
  document.getElementById("tableCount").textContent =
    `${data.length} vehicle${data.length !== 1 ? "s" : ""}`;

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--muted)">No vehicles found.</td></tr>`;
    return;
  }

  tbody.innerHTML = data
    .map((v) => {
      const thumbSrc = v.thumbnail ? `${IMG_BASE}${v.thumbnail}` : null;
      const thumb = thumbSrc
        ? `<img src="${thumbSrc}" class="thumb-img" onerror="this.style.display='none'">`
        : `<div class="thumb-placeholder">🚗</div>`;

      const statusClass = v.is_deleted
        ? "status--hidden"
        : v.status === "Available"
          ? "status--available"
          : "status--booked";
      const statusLabel = v.is_deleted ? "Hidden" : v.status;

      const actionBtns = v.is_deleted
        ? `<button class="btn-ghost btn-sm btn-success" onclick="restoreVehicle(${v.id},'${esc(v.name)}')">↩ Restore</button>
         <button class="btn-ghost btn-sm btn-danger"  onclick="confirmHardDelete(${v.id},'${esc(v.name)}')">🗑 Delete</button>`
        : `<button class="btn-ghost btn-sm btn-info"    onclick="openEdit(${v.id})">✏️ Edit</button>
         <button class="btn-ghost btn-sm btn-warn"    onclick="confirmSoftDelete(${v.id},'${esc(v.name)}')">🙈 Hide</button>
         <button class="btn-ghost btn-sm btn-danger"  onclick="confirmHardDelete(${v.id},'${esc(v.name)}')">🗑 Delete</button>`;

      return `<tr>
      <td style="display:flex;align-items:center;gap:10px;min-width:190px">
        ${thumb}
        <div>
          <div class="vehicle-name">${esc(v.name)}</div>
          <div class="vehicle-meta">${esc(v.brand)} ${esc(v.model)} · ${v.year}</div>
        </div>
      </td>
      <td class="mono">${esc(v.license_plate)}</td>
      <td>${esc(v.body_type)}</td>
      <td>${esc(v.fuel_type)}</td>
      <td style="text-align:center">${v.seating_capacity}</td>
      <td class="mono" style="font-size:12px">${fmt(v.price_4h)} / ${fmt(v.price_8h)} / ${fmt(v.price_1d)}</td>
      <td><span class="status ${statusClass}">${statusLabel}</span></td>
      <td><div class="action-btns">${actionBtns}</div></td>
    </tr>`;
    })
    .join("");
}

const esc = (s) =>
  String(s || "")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
const fmt = (n) => `Rs ${Number(n).toLocaleString()}`;

// ── Filters ───────────────────────────────────────────────────
function applyFilters() {
  const q = document.getElementById("searchInput").value.toLowerCase();
  const st = document.getElementById("filterStatus").value;
  const tp = document.getElementById("filterType").value;
  const fl = document.getElementById("filterFuel").value;

  const filtered = allVehicles.filter((v) => {
    if (st && v.status !== st) return false;
    if (tp && v.body_type !== tp) return false;
    if (fl && v.fuel_type !== fl) return false;
    if (q) {
      const haystack =
        `${v.name} ${v.brand} ${v.model} ${v.license_plate}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
  renderTable(filtered);
}

document.getElementById("searchInput").addEventListener("input", applyFilters);
document
  .getElementById("filterStatus")
  .addEventListener("change", applyFilters);
document.getElementById("filterType").addEventListener("change", applyFilters);
document.getElementById("filterFuel").addEventListener("change", applyFilters);

// ── Toggle soft-deleted ───────────────────────────────────────
document.getElementById("toggleDeleted").addEventListener("click", function () {
  showingDeleted = !showingDeleted;
  this.textContent = showingDeleted ? "👁 Show Active" : "👁 Show Hidden";
  loadVehicles();
});

// ── Image Preview ─────────────────────────────────────────────
function previewImage(input, boxId) {
  const box = document.getElementById(boxId);
  if (!input.files[0]) return;
  const url = URL.createObjectURL(input.files[0]);
  // Remove existing preview if any
  const old = box.querySelector(".img-preview");
  if (old) old.remove();
  const img = document.createElement("img");
  img.className = "img-preview";
  img.src = url;
  box.appendChild(img);
}

// ── Modal Helpers ─────────────────────────────────────────────
function openModal() {
  document.getElementById("vehicleModal").classList.add("open");
}
function closeModal() {
  document.getElementById("vehicleModal").classList.remove("open");
  resetForm();
}
function openConfirm(icon, msg, name, okCb) {
  document.getElementById("confirmIcon").textContent = icon;
  document.getElementById("confirmMsg").textContent = msg;
  document.getElementById("confirmName").textContent = name;
  document.getElementById("confirmModal").classList.add("open");
  document.getElementById("confirmOk").onclick = () => {
    document.getElementById("confirmModal").classList.remove("open");
    okCb();
  };
}
document.getElementById("confirmCancel").onclick = () =>
  document.getElementById("confirmModal").classList.remove("open");

document.getElementById("closeModal").onclick = closeModal;
document.getElementById("cancelModal").onclick = closeModal;
document.getElementById("addVehicleBtn").onclick = () => {
  document.getElementById("vehicleId").value = "";
  document.getElementById("modalTitle").textContent = "Add New Vehicle";
  openModal();
};

function resetForm() {
  document.getElementById("vehicleForm").reset();
  document.getElementById("vehicleId").value = "";
  // Remove image previews
  document.querySelectorAll(".img-preview").forEach((el) => el.remove());
}

async function openEdit(id) {
  try {
    const r = await fetch(`${API}/${id}`);
    const d = await r.json();

    if (!d.success) return toast("Could not load vehicle.", "error");

    const v = d.data;

    document.getElementById("vehicleId").value = id;
    document.getElementById("modalTitle").textContent = "Edit Vehicle";

    // ── BASIC FIELDS ─────────────────────────────
    const fields = {
      f_name: v.name,
      f_brand: v.brand,
      f_model: v.model,
      f_year: v.year,
      f_plate: v.license_plate,
      f_seats: v.seating_capacity,
      f_body: v.body_type,
      f_fuel: v.fuel_type,
      f_trans: v.transmission,
      f_status: v.status,
      f_p4h: v.price_4h,
      f_p8h: v.price_8h,
      f_p1d: v.price_1d,
      f_desc: v.description || "",
      f_color: v.color || "", // ✅ FIX ADDED
    };

    Object.entries(fields).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    });

    // ── FEATURES FIX (IMPORTANT) ─────────────────
    let features = [];

    try {
      features =
        typeof v.features === "string"
          ? JSON.parse(v.features)
          : v.features || [];
    } catch {
      features = [];
    }

    document.querySelectorAll('input[name="features"]').forEach((cb) => {
      cb.checked = features.includes(cb.value);
    });

    // ── IMAGES PREVIEW ───────────────────────────
    const imgMap = {
      box_thumbnail: v.thumbnail,
      box_image_1: v.image_1,
      box_image_2: v.image_2,
      box_image_3: v.image_3,
      box_image_4: v.image_4,
      box_image_5: v.image_5,
    };

    Object.entries(imgMap).forEach(([boxId, fname]) => {
      if (!fname) return;

      const box = document.getElementById(boxId);
      const old = box.querySelector(".img-preview");
      if (old) old.remove();

      const img = document.createElement("img");
      img.className = "img-preview";
      img.src = `${IMG_BASE}${fname}`;
      box.appendChild(img);
    });

    // ── COLOR PICKER SYNC (IMPORTANT) ────────────
    const colorPicker = document.getElementById("f_color_picker");

    if (colorPicker && v.color) {
      const hexMap = {
        "Pearl White": "#ffffff",
        "Midnight Black": "#000000",
        Red: "#ff0000",
        Blue: "#0000ff",
        Gray: "#808080",
      };

      colorPicker.value = hexMap[v.color] || "#ffffff";
    }

    openModal();
  } catch (e) {
    console.log(e);
    toast("Failed to fetch vehicle.", "error");
  }
}
// ── Submit Form ───────────────────────────────────────────────
document
  .getElementById("vehicleForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();
    const id = document.getElementById("vehicleId").value;
    const btn = document.getElementById("submitBtn");
    btn.disabled = true;
    btn.textContent = "Saving…";

    const fd = new FormData(this);
    // append file inputs that might be missed if same name
    const fileInputs = {
      thumbnail: "f_thumbnail",
      image_1: "f_img1",
      image_2: "f_img2",
      image_3: "f_img3",
      image_4: "f_img4",
      image_5: "f_img5",
    };

    try {
      const method = id ? "PUT" : "POST";
      const url = id ? `${API}/${id}` : API;
      const r = await fetch(url, { method, body: fd });
      const d = await r.json();

      if (d.success) {
        toast(d.message, "success");
        closeModal();
        loadVehicles();
      } else {
        // Show validation errors
        const msgs = d.errors ? d.errors.join("\n") : d.message;
        toast(msgs, "error");
      }
    } catch (err) {
      toast("Network error. Is the server running?", "error");
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="15" height="15"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Save Vehicle`;
    }
  });

// ── Soft Delete / Restore ─────────────────────────────────────
function confirmSoftDelete(id, name) {
  openConfirm("🙈", "This will hide the vehicle from customers.", name, () =>
    softDelete(id, name),
  );
}
async function softDelete(id, name) {
  try {
    const r = await fetch(`${API}/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "soft_delete" }),
    });
    const d = await r.json();
    toast(d.message, d.success ? "success" : "error");
    if (d.success) loadVehicles();
  } catch {
    toast("Network error.", "error");
  }
}

function restoreVehicle(id, name) {
  openConfirm("↩️", "Restore this vehicle to active fleet?", name, async () => {
    const r = await fetch(`${API}/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "restore" }),
    });
    const d = await r.json();
    toast(d.message, d.success ? "success" : "error");
    if (d.success) loadVehicles();
  });
}

// ── Hard Delete ───────────────────────────────────────────────
function confirmHardDelete(id, name) {
  openConfirm(
    "🗑️",
    "This will PERMANENTLY delete the vehicle and all its images. This cannot be undone!",
    name,
    () => hardDelete(id),
  );
}
async function hardDelete(id) {
  try {
    const r = await fetch(`${API}/${id}`, { method: "DELETE" });
    const d = await r.json();
    toast(d.message, d.success ? "success" : "error");
    if (d.success) loadVehicles();
  } catch {
    toast("Network error.", "error");
  }
}

// ── Close backdrop click ──────────────────────────────────────
document.getElementById("vehicleModal").addEventListener("click", function (e) {
  if (e.target === this) closeModal();
});
document.getElementById("confirmModal").addEventListener("click", function (e) {
  if (e.target === this) this.classList.remove("open");
});

// ── Init ──────────────────────────────────────────────────────
loadVehicles();
