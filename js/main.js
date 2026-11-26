// ── Main Navigation & Menu Toggle ──────────────────────────
const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");
if (menuToggle && mainNav) {
  menuToggle.addEventListener("click", () => mainNav.classList.toggle("open"));
  mainNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => mainNav.classList.remove("open"));
  });
}

// Update nav login/register/dashboard buttons based on auth state
(function updateNav() {
  const navLogin = document.querySelector(".nav-login");
  const navRegister = document.querySelector(".nav-register");
  const navDash = document.getElementById("navDashboard");
  const cartBadge = document.getElementById("cartBadgeCount");

  let dashHref = "login.html";
  if (typeof api !== "undefined" && api.isLoggedIn()) {
    const user = api.getUser();
    if (user && user.role === "temple") dashHref = "temple-dashboard.html";
    else if (user && user.role === "collection") dashHref = "collection-team.html";
    else if (user && user.role === "processing") dashHref = "waste-records.html";
    else if (user && user.role === "customer") dashHref = "shop.html";
    else dashHref = "dashboard.html";

    if (navDash) navDash.href = dashHref;
    if (navLogin) {
      navLogin.textContent = user?.role === "customer" ? "My Orders" : "Portal";
      navLogin.href = dashHref;
    }
    if (navRegister) navRegister.style.display = "none";
  } else {
    if (navDash) navDash.href = "login.html";
  }

  // Sync cart badge on non-shop pages from localStorage or backend
  if (cartBadge && !window.location.pathname.includes("shop.html")) {
    const localCart = JSON.parse(localStorage.getItem("fcShopCart") || "[]");
    const count = localCart.reduce((s, i) => s + Number(i.quantity || 0), 0);
    cartBadge.textContent = count;
    if (typeof api !== "undefined" && api.isLoggedIn()) {
      api.getCart().then((res) => {
        const items = res?.data?.items || [];
        cartBadge.textContent = items.reduce((s, i) => s + Number(i.quantity || 0), 0);
      }).catch(() => {});
    }
  }
})();

// ── Homepage Environmental Impact Counters ──────────────────
(async function initImpactSection() {
  const recycledEl = document.getElementById("impactRecycled");
  const templesEl = document.getElementById("impactTemples");
  const requestsEl = document.getElementById("impactRequests");
  const productsEl = document.getElementById("impactProducts");
  const badgeEl = document.getElementById("impactSourceBadge");

  if (!recycledEl || !templesEl || !requestsEl || !productsEl) return;

  let isLive = false;
  try {
    if (typeof api !== "undefined" && api.getPublicStats) {
      const res = await api.getPublicStats();
      if (res && res.success && res.data) {
        recycledEl.dataset.target = res.data.flowersRecycled;
        templesEl.dataset.target = res.data.templesConnected;
        requestsEl.dataset.target = res.data.requestsCompleted;
        productsEl.dataset.target = res.data.productsCreated;
        isLive = true;
      }
    }
  } catch (err) {
    isLive = false;
  }

  if (badgeEl) {
    badgeEl.textContent = isLive
      ? "Live database metrics"
      : "Sample prototype metrics";
  }

  const counters = [recycledEl, templesEl, requestsEl, productsEl];
  const animateCounter = (el) => {
    const target = Number(el.dataset.target || 0);
    const suffix = el.dataset.suffix || "";
    const duration = 1100;
    const start = performance.now();

    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(target * eased);
      el.textContent = value.toLocaleString() + suffix;
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const impactSection = document.getElementById("impact");
  if ("IntersectionObserver" in window && impactSection) {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          counters.forEach(animateCounter);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(impactSection);
  } else {
    counters.forEach((el) => {
      el.textContent =
        Number(el.dataset.target || 0).toLocaleString() +
        (el.dataset.suffix || "");
    });
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
      const container = rows[0]?.parentElement;
      if (container) {
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
