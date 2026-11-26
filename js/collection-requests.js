// ── Collection Requests (Admin) ────────────────────────────
const $ = (id) => document.getElementById(id);
const modal = $("requestModal"),
  form = $("requestForm");
let requests = [];

function safe(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.style.display = "block";
  setTimeout(() => (el.style.display = "none"), 2500);
}

async function render() {
  try {
    const params = {};
    const q = $("searchRequests").value.trim();
    const filter = $("statusFilter").value;
    if (q) params.search = q;
    if (filter !== "all") params.status = filter;

    const result = await api.getRequests(params);
    requests = result.data;

    $("requestTable").innerHTML = requests
      .map((r) => {
        const portal = r.origin === "templePortal";
        const createWaste =
          portal && r.status === "Collected"
            ? `<button class="action-btn" data-create-waste="${safe(r._id)}" data-request-id="${safe(r.requestId)}">Create waste record</button>`
            : "";
        return `<tr>
        <td><b>${safe(r.temple)}</b><br><small class="muted">${safe(r.requestId)}${portal ? " · Temple portal" : " · Admin entry"}</small></td>
        <td>${safe(r.flower)}</td><td>${Number(r.quantity).toLocaleString()} kg</td><td>${safe(r.date)}</td>
        <td><select class="status-select ${r.status.toLowerCase()}" data-status="${safe(r._id)}" aria-label="Update status">${["Pending", "Collected", "Processing", "Completed"].map((s) => `<option ${s === r.status ? "selected" : ""}>${s}</option>`).join("")}</select></td>
        <td><div class="row-actions">${createWaste}${!portal ? `<button class="action-btn" data-edit="${safe(r._id)}">Edit</button><button class="action-btn" data-delete="${safe(r._id)}">Delete</button>` : ""}</div></td></tr>`;
      })
      .join("");

    $("emptyState").hidden = requests.length !== 0;

    // Update stats - get all requests without filters for totals
    const allResult = await api.getRequests();
    const allReqs = allResult.data;
    $("totalCount").textContent = allReqs.length;
    $("pendingCount").textContent = allReqs.filter((r) => r.status === "Pending").length;
    $("totalKg").textContent =
      allReqs.reduce((sum, r) => sum + Number(r.quantity), 0).toLocaleString() + " kg";
  } catch (err) {
    console.error("Failed to load requests:", err.message);
    toast("Failed to load requests.");
  }
}

function openModal(request) {
  form.reset();
  $("requestId").value = request?._id || "";
  $("modalTitle").textContent = request
    ? "Edit collection request"
    : "Add collection request";
  $("templeName").value = request?.temple || "";
  $("flowerType").value = request?.flower || "";
  $("quantity").value = request?.quantity || "";
  $("pickupDate").value =
    request?.date || new Date().toISOString().slice(0, 10);
  $("requestStatus").value = request?.status || "Pending";
  $("requestNotes").value = request?.notes || "";
  modal.classList.add("show");
  $("templeName").focus();
}

function closeModal() {
  modal.classList.remove("show");
}

// Event listeners
$("openAddModal").addEventListener("click", () => openModal());
$("closeModal").addEventListener("click", closeModal);
$("cancelModal").addEventListener("click", closeModal);
modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

// Form submit
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = $("requestId").value;
  const record = {
    temple: $("templeName").value.trim(),
    flower: $("flowerType").value,
    quantity: Number($("quantity").value),
    date: $("pickupDate").value,
    status: $("requestStatus").value,
    notes: $("requestNotes").value.trim(),
  };

  if (!record.temple || !record.flower || !record.date || record.quantity <= 0) {
    toast("Please complete all required fields.");
    return;
  }

  try {
    if (id) {
      await api.updateRequest(id, record);
      toast("Request updated successfully.");
    } else {
      await api.createRequest(record);
      toast("Request added successfully.");
    }
    closeModal();
    await render();
  } catch (err) {
    toast(err.message || "Failed to save request.");
  }
});

// Search & filter
$("searchRequests").addEventListener("input", render);
$("statusFilter").addEventListener("change", render);

// Table actions
$("requestTable").addEventListener("click", async (e) => {
  const edit = e.target.dataset.edit;
  const del = e.target.dataset.delete;
  const create = e.target.dataset.createWaste;

  if (create) {
    const r = requests.find((x) => x._id === create);
    if (r) {
      const params = new URLSearchParams({
        requestId: r.requestId,
        source: r.temple,
        flower: r.flower,
        received: String(r.quantity),
        date: r.date,
      });
      location.href = "waste-records.html?" + params.toString();
    }
  }

  if (edit) {
    const r = requests.find((x) => x._id === edit);
    if (r) openModal(r);
  }

  if (del) {
    const r = requests.find((x) => x._id === del);
    if (r && confirm(`Delete the request from ${r.temple}?`)) {
      try {
        await api.deleteRequest(del);
        toast("Request deleted.");
        await render();
      } catch (err) {
        toast(err.message || "Failed to delete.");
      }
    }
  }
});

// Status change
$("requestTable").addEventListener("change", async (e) => {
  const id = e.target.dataset.status;
  if (!id) return;

  try {
    await api.updateRequest(id, { status: e.target.value });
    toast("Request status updated.");
    await render();
  } catch (err) {
    toast(err.message || "Failed to update status.");
  }
});

render();
