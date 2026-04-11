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
