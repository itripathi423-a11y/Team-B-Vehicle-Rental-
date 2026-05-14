const API = "http://localhost:5000/api/vehicles";
const IMG_BASE = "http://localhost:5000/uploads/vehicles/";

let allVehicles = [];
let filteredVehicles = [];
let showingDeleted = false;
let currentPage = 1;
const ITEMS_PER_PAGE = 5; // ── FIX: was 10, now 5 per page

// ── Default SVG placeholder ────────────────────────────────────
const DEFAULT_THUMB_SVG = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='52' height='38' viewBox='0 0 52 38'><rect width='52' height='38' rx='8' fill='%23f3f4f6'/><g transform='translate(7,7)' stroke='%239ca3af' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'><path d='M2 15h34'/><path d='M4 15l3-6h24l3 6'/><rect x='4' y='15' width='30' height='7' rx='2'/><circle cx='11' cy='23' r='3'/><circle cx='27' cy='23' r='3'/></g></svg>`;

// ── Date constants ─────────────────────────────────────────────
const TODAY_ISO = new Date().toISOString().split("T")[0];
const CUR_YEAR = new Date().getFullYear();

// ── Topbar user dropdown ───────────────────────────────────────
document.getElementById("topbarUser").addEventListener("click", (e) => {
  e.stopPropagation();
  document.getElementById("userDropdown").classList.toggle("open");
});
document.addEventListener("click", () => {
  document.getElementById("userDropdown")?.classList.remove("open");
});
document.getElementById("logoutBtn").addEventListener("click", async () => {
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

// ── Stats ──────────────────────────────────────────────────────
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

// ── Load Vehicles ──────────────────────────────────────────────
async function loadVehicles() {
  try {
    const url = showingDeleted ? `${API}?deleted=only` : API;
    const r = await fetch(url);
    const d = await r.json();
    allVehicles = d.data || [];
    currentPage = 1;
    applyFilters();
    loadStats();
  } catch {
    toast("Failed to load vehicles.", "error");
  }
}

// ── Helpers ────────────────────────────────────────────────────
const esc = (s) =>
  String(s || "")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
const fmt = (n) => `Rs ${Number(n).toLocaleString()}`;

// ── Render Table ───────────────────────────────────────────────
function renderTable(data) {
  filteredVehicles = data;
  const total = data.length;
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageData = data.slice(start, start + ITEMS_PER_PAGE);
  const tbody = document.getElementById("vehicleTableBody");

  document.getElementById("tableCount").textContent =
    `${total} vehicle${total !== 1 ? "s" : ""}`;

  if (!total) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--muted)">No vehicles found.</td></tr>`;
    renderPagination(0);
    return;
  }

  tbody.innerHTML = pageData
    .map((v) => {
      const thumb = v.thumbnail
        ? `<img src="${IMG_BASE}${v.thumbnail}" class="thumb-img" onerror="this.src='${DEFAULT_THUMB_SVG}'">`
        : `<img src="${DEFAULT_THUMB_SVG}" class="thumb-img">`;

      const statusClass = v.is_deleted
        ? "status--hidden"
        : v.status === "Available"
          ? "status--available"
          : "status--booked";
      const statusLabel = v.is_deleted ? "Hidden" : v.status;

      const actionBtns = v.is_deleted
        ? `<button class="btn-ghost btn-sm btn-success" onclick="restoreVehicle(${v.id},'${esc(v.name)}')">↩ Restore</button>
           <button class="btn-ghost btn-sm btn-danger"  onclick="confirmHardDelete(${v.id},'${esc(v.name)}')">🗑 Delete</button>`
        : `<button class="btn-ghost btn-sm btn-info"   onclick="openEdit(${v.id})">✏️ Edit</button>
           <button class="btn-ghost btn-sm btn-warn"   onclick="confirmSoftDelete(${v.id},'${esc(v.name)}')">🙈 Hide</button>
           <button class="btn-ghost btn-sm btn-danger" onclick="confirmHardDelete(${v.id},'${esc(v.name)}')">🗑 Delete</button>`;

      // ── Row is clickable; buttons inside use stopPropagation via onclick wrapper
      return `<tr class="vehicle-row" onclick="openDetailModal(${v.id})" style="cursor:pointer;" title="Click to view details">
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
        <td><div class="action-btns" onclick="event.stopPropagation()">${actionBtns}</div></td>
      </tr>`;
    })
    .join("");

  renderPagination(total);
}

// ── Vehicle Detail Modal ───────────────────────────────────────
async function openDetailModal(id) {
  try {
    const r = await fetch(`${API}/${id}`);
    const d = await r.json();
    if (!d.success) return toast("Could not load vehicle details.", "error");
    const v = d.data;

    // Build features list
    let features = [];
    try {
      features =
        typeof v.features === "string"
          ? JSON.parse(v.features)
          : v.features || [];
    } catch {
      features = [];
    }

    // Build image gallery
    const images = [
      v.thumbnail,
      v.image_1,
      v.image_2,
      v.image_3,
      v.image_4,
      v.image_5,
    ].filter(Boolean);
    const galleryHTML = images.length
      ? `<div class="detail-gallery">
          ${images
            .map(
              (img, i) => `
            <img src="${IMG_BASE}${img}"
                 class="detail-gallery-img${i === 0 ? " active" : ""}"
                 onclick="setMainImage('${IMG_BASE}${img}')"
                 onerror="this.src='${DEFAULT_THUMB_SVG}'">`,
            )
            .join("")}
         </div>`
      : "";

    const mainImg = v.thumbnail
      ? `<img src="${IMG_BASE}${v.thumbnail}" id="detailMainImg" class="detail-main-img" onerror="this.src='${DEFAULT_THUMB_SVG}'">`
      : `<img src="${DEFAULT_THUMB_SVG}" id="detailMainImg" class="detail-main-img">`;

    const statusClass = v.is_deleted
      ? "status--hidden"
      : v.status === "Available"
        ? "status--available"
        : "status--booked";
    const statusLabel = v.is_deleted ? "Hidden" : v.status;

    const serviceDate = v.last_service_date
      ? new Date(v.last_service_date).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "—";

    document.getElementById("vehicleDetailModal").innerHTML = `
      <div class="modal detail-modal" onclick="event.stopPropagation()">
        <div class="modal-header">
          <div>
            <h2 class="modal-title">${esc(v.name)}</h2>
            <p style="font-size:13px;color:var(--muted);margin-top:3px">${esc(v.brand)} ${esc(v.model)} &middot; ${v.year}</p>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <span class="status ${statusClass}">${statusLabel}</span>
            <button class="modal-close" onclick="closeDetailModal()">✕</button>
          </div>
        </div>

        <!-- Image Section -->
        <div class="detail-img-section">
          <div class="detail-main-wrap">${mainImg}</div>
          ${galleryHTML}
        </div>

        <!-- Info Grid -->
        <div class="detail-info-grid">
          <div class="detail-section">
            <p class="detail-section-title">Basic Info</p>
            <div class="detail-rows">
              <div class="detail-row"><span>License Plate</span><strong>${esc(v.license_plate)}</strong></div>
              <div class="detail-row"><span>Body Type</span><strong>${esc(v.body_type)}</strong></div>
              <div class="detail-row"><span>Fuel Type</span><strong>${esc(v.fuel_type)}</strong></div>
              <div class="detail-row"><span>Transmission</span><strong>${esc(v.transmission)}</strong></div>
              <div class="detail-row"><span>Seating</span><strong>${v.seating_capacity} seats</strong></div>
              <div class="detail-row"><span>Color</span><strong>${esc(v.color || "—")}</strong></div>
            </div>
          </div>

          <div class="detail-section">
            <p class="detail-section-title">Rental Pricing</p>
            <div class="detail-rows">
              <div class="detail-row"><span>4-Hour</span><strong class="price-val">${fmt(v.price_4h)}</strong></div>
              <div class="detail-row"><span>8-Hour</span><strong class="price-val">${fmt(v.price_8h)}</strong></div>
              <div class="detail-row"><span>1-Day</span><strong class="price-val">${fmt(v.price_1d)}</strong></div>
            </div>

            <p class="detail-section-title" style="margin-top:16px">Service Info</p>
            <div class="detail-rows">
              <div class="detail-row"><span>Last Service</span><strong>${serviceDate}</strong></div>
              <div class="detail-row"><span>Service Status</span><strong>${esc(v.service_status || "—")}</strong></div>
            </div>
          </div>
        </div>

        ${
          v.description
            ? `
        <div class="detail-section" style="margin-top:16px">
          <p class="detail-section-title">Description</p>
          <p style="font-size:13.5px;color:var(--text);line-height:1.6">${esc(v.description)}</p>
        </div>`
            : ""
        }

        ${
          features.length
            ? `
        <div class="detail-section" style="margin-top:16px">
          <p class="detail-section-title">Features</p>
          <div class="detail-features">
            ${features.map((f) => `<span class="feature-tag">${esc(f)}</span>`).join("")}
          </div>
        </div>`
            : ""
        }

        <div class="modal-footer">
          <button class="btn-ghost" onclick="closeDetailModal()">Close</button>
          ${
            !v.is_deleted
              ? `<button class="btn-primary" onclick="closeDetailModal(); openEdit(${v.id})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit Vehicle
          </button>`
              : ""
          }
        </div>
      </div>`;

    document.getElementById("vehicleDetailModal").classList.add("open");
  } catch (e) {
    console.error(e);
    toast("Failed to load vehicle details.", "error");
  }
}

function closeDetailModal() {
  document.getElementById("vehicleDetailModal").classList.remove("open");
}

function setMainImage(src) {
  const main = document.getElementById("detailMainImg");
  if (main) main.src = src;
  document.querySelectorAll(".detail-gallery-img").forEach((img) => {
    img.classList.toggle("active", img.src === src);
  });
}

// Close detail modal on backdrop click
document
  .getElementById("vehicleDetailModal")
  .addEventListener("click", function (e) {
    if (e.target === this) closeDetailModal();
  });

// ── Pagination ─────────────────────────────────────────────────
function getPageRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([
    1,
    2,
    current - 1,
    current,
    current + 1,
    total - 1,
    total,
  ]);
  const sorted = [...pages]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);
  const result = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push("…");
    result.push(sorted[i]);
  }
  return result;
}

function renderPagination(total) {
  const bar = document.getElementById("paginationBar");
  if (!bar) return;
  bar.innerHTML = "";
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
  if (totalPages <= 1) {
    bar.style.display = "none";
    return;
  }
  bar.style.display = "flex";

  // Info on the LEFT
  const info = document.createElement("div");
  info.className = "page-info";
  const start = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const end = Math.min(currentPage * ITEMS_PER_PAGE, total);
  info.textContent = `Showing ${start}–${end} of ${total}`;
  bar.appendChild(info);

  // Buttons on the RIGHT
  const btnGroup = document.createElement("div");
  btnGroup.style.display = "flex";
  btnGroup.style.gap = "6px";
  btnGroup.style.alignItems = "center";

  const prev = document.createElement("button");
  prev.className = `pag-btn ${currentPage === 1 ? "disabled" : ""}`;
  prev.disabled = currentPage === 1;
  prev.textContent = "‹";
  prev.onclick = () => {
    if (currentPage > 1) {
      currentPage--;
      renderTable(filteredVehicles);
    }
  };
  btnGroup.appendChild(prev);

  getPageRange(currentPage, totalPages).forEach((p) => {
    if (p === "…") {
      const el = document.createElement("span");
      el.style.cssText = "padding:0 4px;color:var(--muted)";
      el.textContent = "…";
      btnGroup.appendChild(el);
      return;
    }
    const btn = document.createElement("button");
    btn.className = `pag-btn ${p === currentPage ? "active" : ""}`;
    btn.textContent = p;
    btn.onclick = () => {
      currentPage = p;
      renderTable(filteredVehicles);
    };
    btnGroup.appendChild(btn);
  });

  const next = document.createElement("button");
  next.className = `pag-btn ${currentPage === totalPages ? "disabled" : ""}`;
  next.disabled = currentPage === totalPages;
  next.textContent = "›";
  next.onclick = () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderTable(filteredVehicles);
    }
  };
  btnGroup.appendChild(next);

  bar.appendChild(btnGroup);
}

// ── Filters ────────────────────────────────────────────────────
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
      const hay =
        `${v.name} ${v.brand} ${v.model} ${v.license_plate}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  currentPage = 1;
  renderTable(filtered);
}

["searchInput", "filterStatus", "filterType", "filterFuel"].forEach((id) => {
  const evt = id === "searchInput" ? "input" : "change";
  document.getElementById(id).addEventListener(evt, applyFilters);
});

// ── Toggle hidden ──────────────────────────────────────────────
document.getElementById("toggleDeleted").addEventListener("click", function () {
  showingDeleted = !showingDeleted;
  this.textContent = showingDeleted ? "👁 Show Active" : "👁 Show Hidden";
  loadVehicles();
});

// ── Image Validation & Preview ─────────────────────────────────
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_EXT = /\.(jpe?g|png|webp)$/i;
const MAX_IMG_SIZE = 5 * 1024 * 1024;

function validateImageFile(file) {
  if (!ALLOWED_MIME.includes(file.type) || !ALLOWED_EXT.test(file.name))
    return {
      valid: false,
      error: "Only JPG, JPEG, PNG, and WEBP files are accepted.",
    };
  if (file.size > MAX_IMG_SIZE)
    return { valid: false, error: "Image must be under 5 MB." };
  return { valid: true };
}

function previewImage(input, boxId) {
  if (!input.files[0]) return;
  const file = input.files[0];
  const chk = validateImageFile(file);
  if (!chk.valid) {
    toast(chk.error, "error");
    input.value = "";
    return;
  }
  const box = document.getElementById(boxId);
  const old = box.querySelector(".img-preview");
  if (old) old.remove();
  const img = document.createElement("img");
  img.className = "img-preview";
  img.src = URL.createObjectURL(file);
  box.appendChild(img);

  if (boxId === "box_thumbnail") {
    const thumbInput = document.getElementById("f_thumbnail");
    if (thumbInput) {
      thumbInput.classList.remove("invalid");
      const sp = thumbInput
        .closest(".form-group")
        ?.querySelector(".form-error.visible");
      if (sp) {
        sp.classList.remove("visible");
        sp.textContent = "";
      }
    }
  }
}

// ── Form Validation ────────────────────────────────────────────
const REQUIRED_FIELDS = [
  { id: "f_name", label: "Vehicle Name", minLen: 2 },
  { id: "f_brand", label: "Brand", minLen: 1 },
  { id: "f_model", label: "Model", minLen: 1 },
  {
    id: "f_year",
    label: "Vehicle Year",
    type: "number",
    min: 1980,
    max: CUR_YEAR,
    hint: `Year must be between 1980 and ${CUR_YEAR}.`,
  },
  { id: "f_plate", label: "License Plate", minLen: 1 },
  { id: "f_seats", label: "Seating Capacity", type: "number", min: 1, max: 50 },
  { id: "f_body", label: "Body Type" },
  { id: "f_fuel", label: "Fuel Type" },
  { id: "f_trans", label: "Transmission" },
  { id: "f_status", label: "Status" },
  { id: "f_color", label: "Exterior Color", minLen: 1 },
  { id: "f_p4h", label: "4-Hour Price", type: "number", min: 1 },
  { id: "f_p8h", label: "8-Hour Price", type: "number", min: 1 },
  { id: "f_p1d", label: "1-Day Price", type: "number", min: 1 },
];

function clearValidationErrors() {
  document
    .querySelectorAll(".form-control.invalid")
    .forEach((el) => el.classList.remove("invalid"));
  document.querySelectorAll(".form-error.visible").forEach((el) => {
    el.classList.remove("visible");
    el.textContent = "";
  });
}

function showFieldError(fieldId, message) {
  const el = document.getElementById(fieldId);
  if (!el) return;
  el.classList.add("invalid");
  const span = el.closest(".form-group")?.querySelector(".form-error");
  if (span) {
    span.textContent = message;
    span.classList.add("visible");
  }
}

function validateForm() {
  clearValidationErrors();
  let firstError = null;
  let isValid = true;

  for (const field of REQUIRED_FIELDS) {
    const el = document.getElementById(field.id);
    if (!el) continue;
    const val = el.value.trim();

    if (!val) {
      showFieldError(field.id, `${field.label} is required.`);
      if (!firstError) firstError = el;
      isValid = false;
      continue;
    }
    if (field.minLen && val.length < field.minLen) {
      showFieldError(
        field.id,
        `${field.label} must be at least ${field.minLen} character(s).`,
      );
      if (!firstError) firstError = el;
      isValid = false;
      continue;
    }
    if (field.type === "number") {
      const num = Number(val);
      if (isNaN(num)) {
        showFieldError(field.id, `${field.label} must be a valid number.`);
        if (!firstError) firstError = el;
        isValid = false;
        continue;
      }
      if (field.min !== undefined && num < field.min) {
        showFieldError(
          field.id,
          field.hint || `${field.label} must be at least ${field.min}.`,
        );
        if (!firstError) firstError = el;
        isValid = false;
        continue;
      }
      if (field.max !== undefined && num > field.max) {
        showFieldError(
          field.id,
          field.hint || `${field.label} cannot exceed ${field.max}.`,
        );
        if (!firstError) firstError = el;
        isValid = false;
        continue;
      }
    }
  }

  // Service date: today or past only
  const svcEl = document.getElementById("f_service_date");
  if (svcEl && svcEl.value && svcEl.value > TODAY_ISO) {
    showFieldError(
      "f_service_date",
      "Service date must be today or a past date.",
    );
    if (!firstError) firstError = svcEl;
    isValid = false;
  }

  // Price ladder
  const p4h = Number(document.getElementById("f_p4h")?.value);
  const p8h = Number(document.getElementById("f_p8h")?.value);
  const p1d = Number(document.getElementById("f_p1d")?.value);
  if (p4h && p8h && p8h < p4h) {
    showFieldError("f_p8h", "8-Hour price should be ≥ 4-Hour price.");
    if (!firstError) firstError = document.getElementById("f_p8h");
    isValid = false;
  }
  if (p8h && p1d && p1d < p8h) {
    showFieldError("f_p1d", "1-Day price should be ≥ 8-Hour price.");
    if (!firstError) firstError = document.getElementById("f_p1d");
    isValid = false;
  }

  // Thumbnail required
  const thumbnailInput = document.getElementById("f_thumbnail");
  const thumbnailPreview = document
    .getElementById("box_thumbnail")
    ?.querySelector(".img-preview");
  const hasNewThumbFile = thumbnailInput?.files?.length > 0;
  const hasExistingThumb = !!thumbnailPreview;
  if (!hasNewThumbFile && !hasExistingThumb) {
    showFieldError("f_thumbnail", "A thumbnail image is required.");
    if (!firstError) firstError = thumbnailInput;
    isValid = false;
  }

  if (firstError) {
    firstError.scrollIntoView({ behavior: "smooth", block: "center" });
    firstError.focus();
  }
  return isValid;
}

REQUIRED_FIELDS.forEach(({ id }) => {
  const el = document.getElementById(id);
  if (!el) return;
  const clear = () => {
    if (el.value.trim()) {
      el.classList.remove("invalid");
      const sp = el
        .closest(".form-group")
        ?.querySelector(".form-error.visible");
      if (sp) {
        sp.classList.remove("visible");
        sp.textContent = "";
      }
    }
  };
  el.addEventListener("input", clear);
  el.addEventListener("change", clear);
});

// ── Modal Helpers ──────────────────────────────────────────────
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
  document.querySelectorAll(".img-preview").forEach((el) => el.remove());
  clearValidationErrors();
}

// ── Open Edit ──────────────────────────────────────────────────
async function openEdit(id) {
  try {
    const r = await fetch(`${API}/${id}`);
    const d = await r.json();
    if (!d.success) return toast("Could not load vehicle.", "error");

    const v = d.data;
    document.getElementById("vehicleId").value = id;
    document.getElementById("modalTitle").textContent = "Edit Vehicle";

    const map = {
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
      f_color: v.color || "",
      f_destination: v.destination_id || "",
      f_service_date: v.last_service_date
        ? new Date(v.last_service_date).toISOString().split("T")[0]
        : "",
      f_service_status: v.service_status || "Serviced",
    };
    Object.entries(map).forEach(([fid, val]) => {
      const el = document.getElementById(fid);
      if (el) el.value = val ?? "";
    });

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
      img.onerror = () => {
        img.src = DEFAULT_THUMB_SVG;
      };
      box.appendChild(img);
    });

    const picker = document.getElementById("f_color_picker");
    if (picker && v.color) {
      const hexMap = {
        "Pearl White": "#ffffff",
        "Midnight Black": "#000000",
        Red: "#ff0000",
        Blue: "#0000ff",
        Gray: "#808080",
        Silver: "#c0c0c0",
        Brown: "#a52a2a",
        Gold: "#ffd700",
      };
      picker.value = hexMap[v.color] || "#ffffff";
    }
    openModal();
  } catch (e) {
    console.error(e);
    toast("Failed to fetch vehicle.", "error");
  }
}

// ── Submit Form ────────────────────────────────────────────────
document
  .getElementById("vehicleForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();
    if (!validateForm()) {
      toast("Please fill in all required fields correctly.", "error");
      return;
    }

    const id = document.getElementById("vehicleId").value;
    const btn = document.getElementById("submitBtn");
    btn.disabled = true;
    btn.textContent = "Saving…";

    try {
      const method = id ? "PUT" : "POST";
      const url = id ? `${API}/${id}` : API;
      const r = await fetch(url, { method, body: new FormData(this) });
      const d = await r.json();
      if (d.success) {
        toast(d.message, "success");
        closeModal();
        loadVehicles();
      } else toast(d.errors ? d.errors.join(" | ") : d.message, "error");
    } catch {
      toast("Network error. Is the server running?", "error");
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="15" height="15"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Save Vehicle`;
    }
  });

// ── Soft Delete ────────────────────────────────────────────────
function confirmSoftDelete(id, name) {
  openConfirm("🙈", "This will hide the vehicle from customers.", name, () =>
    softDelete(id),
  );
}
async function softDelete(id) {
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

// ── Restore ────────────────────────────────────────────────────
function restoreVehicle(id, name) {
  openConfirm(
    "↩️",
    "Restore this vehicle to the active fleet?",
    name,
    async () => {
      const r = await fetch(`${API}/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore" }),
      });
      const d = await r.json();
      toast(d.message, d.success ? "success" : "error");
      if (d.success) loadVehicles();
    },
  );
}

// ── Hard Delete ────────────────────────────────────────────────
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

// ── Backdrop click to close ────────────────────────────────────
document.getElementById("vehicleModal").addEventListener("click", function (e) {
  if (e.target === this) closeModal();
});
document.getElementById("confirmModal").addEventListener("click", function (e) {
  if (e.target === this) this.classList.remove("open");
});

// ── Load Destinations ──────────────────────────────────────────
async function loadDestinations() {
  try {
    const res = await fetch("http://localhost:5000/api/destinations");
    const json = await res.json();
    const sel = document.getElementById("f_destination");
    (json.data || []).forEach((d) => {
      const opt = document.createElement("option");
      opt.value = d.id;
      opt.textContent = d.name;
      sel.appendChild(opt);
    });
  } catch (e) {
    console.error("Destination load error:", e);
  }
}

// ── Field bounds ───────────────────────────────────────────────
(function initFieldBounds() {
  const yr = document.getElementById("f_year");
  if (yr) {
    yr.min = "1980";
    yr.max = String(CUR_YEAR);
  }
  const svc = document.getElementById("f_service_date");
  if (svc) svc.max = TODAY_ISO;
})();

// ── Init ───────────────────────────────────────────────────────
loadVehicles();
loadDestinations();
