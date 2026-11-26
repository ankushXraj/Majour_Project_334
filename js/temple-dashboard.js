// ── Temple Dashboard ───────────────────────────────────────
const $ = (id) => document.getElementById(id);

// Auth check
if (!api.isLoggedIn()) {
  alert("Please register or sign in to access the temple dashboard.");
  location.href = "login.html";
}

const user = api.getUser();
if (user && user.role !== "temple") {
  location.href = "dashboard.html";
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

function toast(s) {
  $("templeToast").textContent = s;
  $("templeToast").style.display = "block";
  setTimeout(() => ($("templeToast").style.display = "none"), 2300);
}

async function render() {
  try {
    const { data: requests } = await api.getRequests();
    const q = $("templeSearch").value.trim().toLowerCase();

    // Update welcome message
    $("welcomeTemple").textContent = "Welcome, " + (user.templeName || user.name);
    $("templeProfileName").textContent = user.templeName || user.name;

    // Stats
    $("templeTotal").textContent = requests.length;
    $("templePending").textContent = requests.filter(
      (r) => r.status === "Pending"
    ).length;
    $("templeCollected").textContent =
      requests
        .filter((r) => ["Collected", "Processing", "Completed"].includes(r.status))
        .reduce((a, r) => a + Number(r.quantity), 0) + " kg";
    $("templeCompleted").textContent = requests.filter(
      (r) => r.status === "Completed"
    ).length;

    // Filter and render table
    const list = requests.filter((r) =>
      r.flower.toLowerCase().includes(q)
    );

    $("templeRequestRows").innerHTML = list
      .map(
        (r) =>
          `<tr><td><b>${esc(r.requestId)}</b></td><td>${esc(r.flower)}</td><td>${r.quantity} kg</td><td>${esc(r.date)}</td><td><span class="status ${r.status.toLowerCase()}">${esc(r.status)}</span></td><td>${esc(r.contact)}</td></tr>`
      )
      .join("");

    $("templeEmpty").hidden = list.length > 0;
  } catch (err) {
    console.error("Failed to load requests:", err.message);
    toast("Failed to load requests. Please try again.");
  }
}

// Submit collection request
$("templeRequestForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const quantity = Number($("requestQuantity").value);
  if (quantity <= 0) {
    toast("Enter a valid quantity.");
    return;
  }

  const requestData = {
    temple: user.templeName || user.name,
    flower: $("requestFlower").value,
    quantity,
    date: $("requestDate").value,
    contact: $("requestContact").value.trim(),
    address: $("requestAddress").value.trim(),
    notes: $("requestNotes").value.trim(),
  };

  try {
    await api.createRequest(requestData);
    e.target.reset();
    await render();
    toast("Collection request submitted successfully.");
  } catch (err) {
    toast(err.message || "Failed to submit request.");
  }
});

// Search
$("templeSearch").addEventListener("input", render);

// Logout
$("templeLogout").addEventListener("click", () => {
  api.clearAuth();
  location.href = "login.html";
});

// Remove demo note
const demoNote = document.querySelector(".report-note");
if (demoNote) demoNote.style.display = "none";

render();
