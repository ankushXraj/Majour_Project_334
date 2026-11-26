// ── Waste Records ──────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const modal = $("wasteModal"),
  form = $("wasteForm");
let records = [];

const prefillParams = new URLSearchParams(location.search);
const prefillRequest = prefillParams.get("requestId")
  ? {
      id: prefillParams.get("requestId"),
      source: prefillParams.get("source") || "",
      flower: prefillParams.get("flower") || "",
      received: Number(prefillParams.get("received") || 0),
      date: prefillParams.get("date") || new Date().toISOString().slice(0, 10),
    }
  : null;

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

function toast(s) {
  $("wToast").textContent = s;
  $("wToast").style.display = "block";
  setTimeout(() => ($("wToast").style.display = "none"), 2200);
}

async function render() {
  try {
    const params = {};
    const q = $("searchWaste").value.trim();
    const f = $("wasteStatusFilter").value;
    if (q) params.search = q;
    if (f !== "all") params.stage = f;

    const result = await api.getWasteRecords(params);
    records = result.data;

    $("wasteTable").innerHTML = records
      .map(
        (r) =>
          `<tr><td><b>${esc(r.source)}</b><br><small class="muted">${esc(r.recordId)} · ${esc(r.date)}</small></td><td><span class="record-type">${esc(r.flower)}</span></td><td>${r.received} kg</td><td>${r.usable} kg</td><td>${r.other} kg</td><td><select class="status-select ${r.stage === "Sent for processing" ? "processing" : r.stage === "Ready for processing" ? "collected" : "pending"}" data-stage="${r._id}">${["Awaiting processing", "Ready for processing", "Sent for processing"].map((s) => `<option ${s === r.stage ? "selected" : ""}>${s}</option>`).join("")}</select></td><td><div class="row-actions"><button class="action-btn" data-edit-waste="${r._id}">Edit</button><button class="action-btn" data-delete-waste="${r._id}">Delete</button></div></td></tr>`
      )
      .join("");

    $("wasteEmpty").hidden = records.length > 0;

    // Stats (get all records)
    const allResult = await api.getWasteRecords();
    const all = allResult.data;
    $("wTotalRecords").textContent = all.length;
    const sum = (k) => all.reduce((a, r) => a + Number(r[k]), 0);
    $("wReceived").textContent = sum("received").toLocaleString() + " kg";
    $("wUsable").textContent = sum("usable").toLocaleString() + " kg";
    $("wOther").textContent = sum("other").toLocaleString() + " kg";
  } catch (err) {
    console.error("Failed to load waste records:", err.message);
    toast("Failed to load records.");
  }
}

function open(r) {
  form.reset();
  $("wasteId").value = r?._id || "";
  $("wasteModalTitle").textContent = r ? "Edit waste record" : "Add waste record";
  $("wSource").value = r?.source || "";
  $("wFlower").value = r?.flower || "";
  $("wReceivedInput").value = r?.received ?? "";
  $("wUsableInput").value = r?.usable ?? "";
  $("wOtherInput").value = r?.other ?? "";
  $("wDate").value = r?.date || new Date().toISOString().slice(0, 10);
  $("wStage").value = r?.stage || "Awaiting processing";
  $("wNotes").value = r?.notes || "";
  modal.classList.add("show");
}

function close() {
  modal.classList.remove("show");
}

// Event listeners
$("openWasteModal").onclick = () => open();
$("wClose").onclick = close;
$("wCancel").onclick = close;
modal.addEventListener("click", (e) => {
  if (e.target === modal) close();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") close();
});

// Form submit
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const received = Number($("wReceivedInput").value);
  const usable = Number($("wUsableInput").value);
  const other = Number($("wOtherInput").value);

  if (usable + other > received + 0.00001) {
    toast("Usable flowers + other material cannot exceed received quantity.");
    return;
  }

  const id = $("wasteId").value;
  const rec = {
    source: $("wSource").value.trim(),
    flower: $("wFlower").value,
    received,
    usable,
    other,
    date: $("wDate").value,
    stage: $("wStage").value,
    notes: $("wNotes").value.trim(),
    sourceRequestId: prefillRequest?.id || undefined,
  };

  try {
    if (id) {
      await api.updateWasteRecord(id, rec);
      toast("Waste record updated.");
    } else {
      await api.createWasteRecord(rec);
      toast("Waste record added.");
    }
    close();
    if (prefillRequest) {
      history.replaceState({}, "", location.pathname);
    }
    await render();
  } catch (err) {
    toast(err.message || "Failed to save record.");
  }
});

// Search & filter
$("searchWaste").addEventListener("input", render);
$("wasteStatusFilter").addEventListener("change", render);

// Table actions
$("wasteTable").addEventListener("click", async (e) => {
  const edit = e.target.dataset.editWaste;
  const del = e.target.dataset.deleteWaste;

  if (edit) {
    const r = records.find((x) => x._id === edit);
    if (r) open(r);
  }

  if (del) {
    const r = records.find((x) => x._id === del);
    if (r && confirm("Delete this waste record?")) {
      try {
        await api.deleteWasteRecord(del);
        toast("Waste record deleted.");
        await render();
      } catch (err) {
        toast(err.message || "Failed to delete.");
      }
    }
  }
});

// Stage change
$("wasteTable").addEventListener("change", async (e) => {
  const id = e.target.dataset.stage;
  if (!id) return;

  try {
    await api.updateWasteRecord(id, { stage: e.target.value });
    toast("Processing stage updated.");
    await render();
  } catch (err) {
    toast(err.message || "Failed to update stage.");
  }
});

// Remove demo note
const demoNote = document.querySelector(".report-note");
if (demoNote) demoNote.style.display = "none";

render();

// Handle prefill from collection request
if (prefillRequest) {
  (async () => {
    try {
      const check = await api.getWasteRecordByRequest(prefillRequest.id);
      if (check.exists) {
        alert("A waste record already exists for this collection request.");
      } else {
        open();
        $("wSource").value = prefillRequest.source;
        $("wFlower").value = prefillRequest.flower;
        $("wReceivedInput").value = prefillRequest.received;
        $("wUsableInput").value = "";
        $("wOtherInput").value = "";
        $("wDate").value = prefillRequest.date;
        $("wNotes").value =
          "Created from collection request " + prefillRequest.id +
          ". Enter the segregation quantities before saving.";
      }
    } catch (err) {
      // Open blank form if check fails
      open();
      $("wSource").value = prefillRequest.source;
      $("wFlower").value = prefillRequest.flower;
      $("wReceivedInput").value = prefillRequest.received;
      $("wDate").value = prefillRequest.date;
    }
  })();
}
