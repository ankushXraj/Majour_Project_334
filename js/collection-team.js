// ── Collection Team Portal ─────────────────────────────────
const $ = (id) => document.getElementById(id);
let requests = [],
  selectedId = null;

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

function toast(s) {
  $("teamToast").textContent = s;
  $("teamToast").style.display = "block";
  setTimeout(() => ($("teamToast").style.display = "none"), 2200);
}

async function render() {
  try {
    const params = {};
    const q = $("teamSearch").value.trim();
    const filter = $("teamFilter").value;
    if (q) params.search = q;
    if (filter !== "all") params.status = filter;

    const result = await api.getRequests(params);
    requests = result.data;

    // Stats (use all requests, not filtered)
    const allResult = await api.getRequests();
    const all = allResult.data;

    $("teamTotal").textContent = all.length;
    $("teamPending").textContent = all.filter((r) => r.status === "Pending").length;
    $("teamCollected").textContent =
      all
        .filter((r) => ["Collected", "Processing", "Completed"].includes(r.status))
        .reduce((a, r) => a + Number(r.quantity), 0) + " kg";
    $("teamCompleted").textContent = all.filter(
      (r) => r.status === "Completed"
    ).length;

    const statuses = ["Pending", "Collected", "Processing", "Completed"];

    $("teamRows").innerHTML = requests
      .map(
        (r) =>
          `<tr><td><b>${esc(r.requestId)}</b><br>${esc(r.temple)}</td><td>${esc(r.flower)}</td><td>${r.quantity} kg</td><td>${esc(r.date)}</td><td>${esc(r.contact)}<br><small>${esc(r.address)}</small></td><td><select class="status-select" data-update="${r._id}">${statuses.map((s) => `<option ${s === r.status ? "selected" : ""}>${s}</option>`).join("")}</select><br><button class="action-btn" data-view="${r._id}" style="margin-top:5px">View details</button></td></tr>`
      )
      .join("");

    $("teamEmpty").hidden = requests.length > 0;

    if (selectedId) {
      const r = requests.find((x) => x._id === selectedId);
      if (r) showDetails(r);
    }
  } catch (err) {
    console.error("Failed to load requests:", err.message);
    toast("Failed to load requests.");
  }
}

function showDetails(r) {
  selectedId = r._id;
  $("teamDetails").innerHTML = `<div class="team-detail-grid"><div><small>Request ID</small><b>${esc(r.requestId)}</b></div><div><small>Temple</small><b>${esc(r.temple)}</b></div><div><small>Flower type</small><b>${esc(r.flower)}</b></div><div><small>Estimated quantity</small><b>${r.quantity} kg</b></div><div><small>Pickup date</small><b>${esc(r.date)}</b></div><div><small>Contact</small><b>${esc(r.contact)}</b></div><div class="detail-wide"><small>Pickup address</small><b>${esc(r.address)}</b></div><div class="detail-wide"><small>Additional instructions</small><b>${esc(r.notes || "No additional instructions.")}</b></div></div>`;
}

// Status change
$("teamRows").addEventListener("change", async (e) => {
  const id = e.target.dataset.update;
  if (!id) return;

  try {
    await api.updateRequest(id, { status: e.target.value });
    toast("Request status updated.");
    await render();
  } catch (err) {
    toast(err.message || "Failed to update status.");
  }
});

// View details
$("teamRows").addEventListener("click", (e) => {
  const id = e.target.dataset.view;
  if (id) {
    const r = requests.find((x) => x._id === id);
    if (r) showDetails(r);
  }
});

// Search, filter, refresh
$("teamSearch").addEventListener("input", render);
$("teamFilter").addEventListener("change", render);
$("teamRefresh").addEventListener("click", () => {
  render();
  toast("Requests refreshed.");
});

// Remove demo note
const demoNote = document.querySelector(".report-note");
if (demoNote) demoNote.style.display = "none";

render();
