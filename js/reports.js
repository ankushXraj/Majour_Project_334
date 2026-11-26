// ── Reports & Analytics ────────────────────────────────────
const $ = (id) => document.getElementById(id);
const money = (n) =>
  "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const safe = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );

let reportData = {};

async function render() {
  try {
    const result = await api.getReports();
    const d = result.data;
    reportData = d;

    // Stats
    $("rRequests").textContent = d.totalRequests;
    $("rReceived").textContent = d.totalReceived.toLocaleString() + " kg";
    $("rUsable").textContent = d.totalUsable.toLocaleString() + " kg";
    $("rUnits").textContent = d.totalProductUnits.toLocaleString();

    // Segregation bar
    const uPct = d.totalReceived ? (d.totalUsable / d.totalReceived) * 100 : 0;
    const oPct = d.totalReceived ? (d.totalOther / d.totalReceived) * 100 : 0;
    $("usableBar").style.width = uPct + "%";
    $("otherBar").style.width = oPct + "%";
    $("segregationSummary").textContent = d.totalReceived
      ? `${d.totalUsable} kg usable flowers (${uPct.toFixed(1)}%) · ${d.totalOther} kg other material (${oPct.toFixed(1)}%)`
      : "No waste records yet";

    // Status breakdown
    const statuses = ["Pending", "Collected", "Processing", "Completed"];
    const counts = statuses.map((s) => d.statusBreakdown[s] || 0);
    const max = Math.max(1, ...counts);
    $("statusBreakdown").innerHTML = statuses
      .map(
        (s, i) =>
          `<div class="breakdown-item"><span>${s}</span><div class="breakdown-track"><b style="width:${(counts[i] / max) * 100}%"></b></div><strong>${counts[i]}</strong></div>`
      )
      .join("");

    // Category bars
    const catTotals = d.categoryBreakdown || [];
    const maxCat = Math.max(1, ...catTotals.map((x) => x.total));
    $("categoryBars").innerHTML = catTotals.length
      ? catTotals
          .map(
            (c) =>
              `<div class="category-bar-row"><span>${safe(c.name)}</span><div class="category-bar-track"><b style="width:${(c.total / maxCat) * 100}%"></b></div><strong>${c.total}</strong></div>`
          )
          .join("")
      : `<p class="muted">No product records yet.</p>`;

    // Activity table
    const activity = d.activity || [];
    $("activityRows").innerHTML = activity
      .map(
        (a) =>
          `<tr><td>${safe(a.id)}</td><td><b>${safe(a.name)}</b></td><td>${safe(a.detail)}</td><td>${safe(a.status)}</td></tr>`
      )
      .join("");
    $("activityEmpty").hidden = activity.length > 0;

    // Remove demo note
    const demoNote = document.querySelector(".report-note");
    if (demoNote) demoNote.style.display = "none";
  } catch (err) {
    console.error("Failed to load reports:", err.message);
  }
}

function exportCSV() {
  if (!reportData.exportData) {
    toast("No data to export.");
    return;
  }

  const rows = [["Section", "Record ID", "Name", "Details", "Status/Category", "Date"]];

  if (reportData.exportData.requests) {
    reportData.exportData.requests.forEach((r) =>
      rows.push([r.section, r.id, r.name, r.details, r.status, r.date])
    );
  }
  if (reportData.exportData.waste) {
    reportData.exportData.waste.forEach((r) =>
      rows.push([r.section, r.id, r.name, r.details, r.status, r.date])
    );
  }
  if (reportData.exportData.products) {
    reportData.exportData.products.forEach((p) =>
      rows.push([p.section, p.id, p.name, p.details, p.status, p.date])
    );
  }

  const csv = rows
    .map((row) =>
      row.map((v) => '"' + String(v ?? "").replace(/"/g, '""') + '"').join(",")
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "flowercycle-report.csv";
  a.click();
  URL.revokeObjectURL(url);

  toast("CSV report downloaded.");
}

function toast(s) {
  $("reportToast").textContent = s;
  $("reportToast").style.display = "block";
  setTimeout(() => ($("reportToast").style.display = "none"), 2200);
}

$("refreshReports").addEventListener("click", render);
$("exportReport").addEventListener("click", exportCSV);
render();
