// ===== ISHAN RENTAL — Admin Dashboard JS =====

// ── SIDEBAR NAVIGATION ──
const navItems = document.querySelectorAll('.nav-item');
const pages    = document.querySelectorAll('.page');

navItems.forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    const target = item.dataset.page;

    navItems.forEach(n => n.classList.remove('active'));
    pages.forEach(p => p.classList.remove('active'));

    item.classList.add('active');
    document.getElementById(`page-${target}`)?.classList.add('active');

    // close sidebar on mobile
    if (window.innerWidth < 768) {
      document.getElementById('sidebar').classList.remove('open');
    }
  });
});

// ── MOBILE SIDEBAR TOGGLE ──
document.getElementById('sidebarToggle')?.addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

// ── COUNTER ANIMATION ──
function animateCounter(el) {
  const target = parseInt(el.dataset.target);
  if (!target) return;
  let start = 0;
  const duration = 1200;
  const step = (timestamp) => {
    if (!start) start = timestamp;
    const progress = Math.min((timestamp - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(eased * target);
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = target;
  };
  requestAnimationFrame(step);
}

document.querySelectorAll('.stat-value[data-target]').forEach(el => {
  const obs = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) { animateCounter(el); obs.disconnect(); }
  });
  obs.observe(el);
});

// ── BAR CHART (Chart.js) ──
const ctx = document.getElementById('barChart')?.getContext('2d');
if (ctx) {
  const months   = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN'];
  const revenue  = [28, 35, 78, 52, 45, 60];
  const bookings = [18, 22, 40, 30, 28, 35];

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: months,
      datasets: [
        {
          label: 'Revenue (k)',
          data: revenue,
          backgroundColor: (ctx) => {
            const i = ctx.dataIndex;
            return i === 2 ? '#FF5C1A' : '#F3F4F6';
          },
          borderRadius: 8,
          borderSkipped: false,
          barPercentage: 0.5,
          categoryPercentage: 0.6,
        },
        {
          label: 'Bookings',
          data: bookings,
          backgroundColor: '#E5E7EB',
          borderRadius: 8,
          borderSkipped: false,
          barPercentage: 0.5,
          categoryPercentage: 0.6,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#111827',
          titleColor: '#F9FAFB',
          bodyColor: '#D1D5DB',
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: (ctx) => {
              const label = ctx.dataset.label;
              return ` ${label}: ${ctx.parsed.y}${label.includes('Revenue') ? 'k' : ''}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: {
            font: { family: "'Space Mono', monospace", size: 10 },
            color: '#9CA3AF'
          }
        },
        y: {
          grid: { color: '#F3F4F6', lineWidth: 1 },
          border: { display: false, dash: [4, 4] },
          ticks: {
            font: { family: "'DM Sans', sans-serif", size: 11 },
            color: '#9CA3AF',
            callback: v => v + 'k'
          }
        }
      }
    }
  });
}

// ── TABLE ROW CLICK ──
document.querySelectorAll('.data-table tbody tr').forEach(row => {
  row.addEventListener('click', () => {
    const bookingId = row.querySelector('.mono')?.textContent;
    if (bookingId) alert(`Opening booking: ${bookingId}`);
  });
});

// ── EXPORT REPORT BUTTON ──
document.querySelector('.btn-primary')?.addEventListener('click', () => {
  alert('Generating report... (connect to backend to export real data)');
});

// ── SEARCH ──
const searchInput = document.querySelector('.search-wrap input');
searchInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && searchInput.value.trim()) {
    alert(`Searching for: "${searchInput.value}"`);
  }
});

// ── NOTIFICATION BELL ──
document.querySelector('.notif-btn')?.addEventListener('click', () => {
  alert('3 new notifications:\n• New booking #BK-2042\n• KYC pending: Rajan Thapa\n• Service due: BA 1 KHA 4321');
});

// ===== VEHICLES PAGE =====

// Switch between fleet list and add form
function showView(viewId) {
  document.getElementById('view-fleet-list').style.display = viewId === 'list' ? 'block' : 'none';
  document.getElementById('view-add-vehicle').style.display = viewId === 'add' ? 'block' : 'none';
}

document.getElementById('btnShowAddVehicle')?.addEventListener('click', () => showView('add'));
document.getElementById('btnAddCard')?.addEventListener('click', () => showView('add'));
document.getElementById('btnDiscard')?.addEventListener('click', () => showView('list'));
document.getElementById('btnCancel')?.addEventListener('click', () => showView('list'));

// Transmission toggle
document.querySelectorAll('.trans-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.trans-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// Color picker sync
const colorPicker = document.getElementById('colorPicker');
const colorSwatch = document.getElementById('colorSwatch');
if (colorPicker && colorSwatch) {
  colorSwatch.style.background = colorPicker.value;
  colorPicker.addEventListener('input', () => {
    colorSwatch.style.background = colorPicker.value;
  });
}

// Media upload
let mediaFiles = [];
const mediaUpload = document.getElementById('mediaUpload');
const mediaGrid   = document.getElementById('mediaGrid');
const mediaCount  = document.getElementById('mediaCount');

mediaUpload?.addEventListener('change', (e) => {
  const files = Array.from(e.target.files);
  files.forEach(file => {
    if (mediaFiles.length >= 8) return;
    if (file.size > 5 * 1024 * 1024) { alert(`${file.name} exceeds 5MB`); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      mediaFiles.push(ev.target.result);
      renderMedia();
    };
    reader.readAsDataURL(file);
  });
  e.target.value = '';
});

function renderMedia() {
  if (!mediaGrid) return;
  mediaGrid.innerHTML = '';
  mediaFiles.forEach((src, i) => {
    const div = document.createElement('div');
    div.className = 'media-thumb';
    div.innerHTML = `<img src="${src}" alt="media-${i}">
      <button class="media-remove" onclick="removeMedia(${i})">✕</button>`;
    mediaGrid.appendChild(div);
  });
  if (mediaCount) mediaCount.textContent = `${mediaFiles.length}/8 MAX`;
}

window.removeMedia = (i) => {
  mediaFiles.splice(i, 1);
  renderMedia();
};

// Auto-save ticker
function updateAutosave() {
  const el = document.getElementById('autosaveTime');
  if (!el) return;
  const now = new Date();
  let h = now.getHours(), m = now.getMinutes(), am = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  el.textContent = `${h}:${String(m).padStart(2,'0')} ${am}`;
}

// Trigger autosave every 60s
setInterval(() => {
  const view = document.getElementById('view-add-vehicle');
  if (view && view.style.display !== 'none') updateAutosave();
}, 60000);

// Also update on any input change
document.getElementById('view-add-vehicle')?.addEventListener('input', () => {
  updateAutosave();
});

// Create Asset button
document.getElementById('btnCreateAsset')?.addEventListener('click', () => {
  const name = document.querySelector('#view-add-vehicle .av-input')?.value?.trim();
  if (!name) { alert('Please enter a Car Name before creating the asset.'); return; }
  alert(`✅ Vehicle "${name}" created successfully!\nQR tracking ID will be generated shortly.`);
  mediaFiles = [];
  renderMedia();
  document.querySelectorAll('#view-add-vehicle .av-input, #view-add-vehicle .av-textarea').forEach(el => {
    if (el.type !== 'number' && el.type !== 'color') el.value = '';
  });
  showView('list');
});

// Save Asset (top right button)
document.getElementById('btnSaveAsset')?.addEventListener('click', () => {
  updateAutosave();
  const bar = document.querySelector('.autosave-txt');
  if (bar) {
    bar.style.color = '#16A34A';
    setTimeout(() => bar.style.color = '', 2000);
  }
  alert('Draft saved!');
});

// Fleet card edit/view buttons
document.querySelectorAll('.fc-btn-edit').forEach(btn => {
  btn.addEventListener('click', () => showView('add'));
});