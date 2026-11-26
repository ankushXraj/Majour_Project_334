// ── Main Navigation & Menu Toggle ──────────────────────────
const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");
if (menuToggle && mainNav)
  menuToggle.addEventListener("click", () => mainNav.classList.toggle("open"));

// Update nav login/logout button based on auth state
(function updateNav() {
  const navLogin = document.querySelector(".nav-login");
  if (navLogin && api.isLoggedIn()) {
    const user = api.getUser();
    navLogin.textContent = "Dashboard";
    if (user && user.role === "temple") {
      navLogin.href = "temple-dashboard.html";
    } else {
      navLogin.href = "dashboard.html";
    }
  }
})();

// Dashboard overview: add request button (quick add from dashboard)
const addRequest = document.getElementById("addRequest");
if (addRequest) {
  addRequest.addEventListener("click", () => {
    window.location.href = "collection-requests.html";
  });
}

// Admin Logout
const adminLogout = document.getElementById("adminLogout");
if (adminLogout) {
  adminLogout.addEventListener("click", () => {
    api.clearAuth();
    location.href = "login.html";
  });
}

// Dashboard: load live data from backend
(async function loadDashboard() {
  const requestRows = document.getElementById("requestRows");
  const statsGrid = document.querySelector(".stats-grid");
  if (!requestRows || !statsGrid) return;

  if (!api.isLoggedIn()) return;

  try {
    const { data } = await api.getDashboard();

    // Update stat cards
    const cards = statsGrid.querySelectorAll(".stat-card");
    if (cards[0]) {
      cards[0].querySelector("strong").innerHTML =
        data.stats.totalCollectedWaste + ' <small>kg</small>';
      cards[0].querySelector(".stat-foot").textContent = "From database";
    }
    if (cards[1]) {
      cards[1].querySelector("strong").textContent =
        String(data.stats.pendingRequests).padStart(2, "0");
      cards[1].querySelector(".stat-foot").textContent = "Awaiting collection";
    }
    if (cards[2]) {
      cards[2].querySelector("strong").innerHTML =
        data.stats.wasteProcessed + ' <small>kg</small>';
      cards[2].querySelector(".stat-foot").textContent = "From database";
    }
    if (cards[3]) {
      cards[3].querySelector("strong").textContent =
        data.stats.ecoProductsRecorded;
      cards[3].querySelector(".stat-foot").textContent = "Units in inventory";
    }

    // Update recent requests table
    requestRows.innerHTML = data.recentRequests
      .map(
        (r) =>
          `<tr><td>${r.temple}</td><td>${r.flower}</td><td>${r.quantity} kg</td><td><span class="status ${r.status.toLowerCase()}">${r.status}</span></td></tr>`
      )
      .join("");

    // Update product categories
    const productsPanel = document.getElementById("products");
    if (productsPanel && data.productCategories.length > 0) {
      const catIcons = { Incense: "🪔", Compost: "🌱", "Organic colours": "🎨", "Decorative items": "🎁" };
      const catSubtitles = { Incense: "Flower-based products", Compost: "Soil enrichment", "Organic colours": "Natural flower extracts", "Decorative items": "Handmade craft items" };
      const rows = productsPanel.querySelectorAll(".category-row");
      // Clear existing and rebuild
      const container = rows[0]?.parentElement;
      if (container) {
        // Remove old category rows
        container.querySelectorAll(".category-row").forEach((el) => el.remove());
        data.productCategories.forEach((cat) => {
          const div = document.createElement("div");
          div.className = "category-row";
          div.innerHTML = `<span class="category-icon">${catIcons[cat.name] || "✿"}</span><div><b>${cat.name}</b><small>${catSubtitles[cat.name] || ""}</small></div><strong>${cat.count}</strong>`;
          container.appendChild(div);
        });
      }
    }

    // Update waste cycle bar chart
    const barChart = document.querySelector(".bar-chart");
    if (barChart && data.wasteCycle) {
      const total = data.wasteCycle.collected || 1;
      barChart.innerHTML = `
        <div><span>Collected</span><i><b style="width:100%"></b></i><strong>${data.wasteCycle.collected} kg</strong></div>
        <div><span>Processed</span><i><b style="width:${(data.wasteCycle.processed / total * 100).toFixed(0)}%"></b></i><strong>${data.wasteCycle.processed} kg</strong></div>
        <div><span>Awaiting processing</span><i><b style="width:${(data.wasteCycle.awaiting / total * 100).toFixed(0)}%"></b></i><strong>${data.wasteCycle.awaiting} kg</strong></div>
      `;
    }

    // Remove demo notice
    const notice = document.querySelector(".notice");
    if (notice) notice.style.display = "none";
  } catch (err) {
    console.log("Dashboard: using static data (backend unavailable)");
  }
})();
