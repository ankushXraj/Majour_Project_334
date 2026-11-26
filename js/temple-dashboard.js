// ── Temple Dashboard & Smart Waste Contribution Report ─────
const $ = (id) => document.getElementById(id);

if (!api.isLoggedIn()) {
  alert("Please register or sign in to access the temple dashboard.");
  location.href = "login.html";
}

const user = api.getUser();
if (user && user.role !== "temple") {
  location.href = "dashboard.html";
}

let allRequests = [];
let activeReportRequest = null;

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

function money(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function toast(s) {
  $("templeToast").textContent = s;
  $("templeToast").style.display = "block";
  setTimeout(() => ($("templeToast").style.display = "none"), 2600);
}

// Prefill contact, address, and today's date from user profile
(function prefillFormDefaults() {
  if ($("requestDate") && !$("requestDate").value) {
    $("requestDate").value = new Date().toISOString().slice(0, 10);
  }
  if (user) {
    if ($("requestContact") && user.phone) $("requestContact").value = user.phone;
    if ($("requestAddress") && user.address) $("requestAddress").value = user.address;
  }
})();

function renderContributionReport(req) {
  if (!req || !req.financialEstimate) return;
  activeReportRequest = req;
  const est = req.financialEstimate;
  const mb = est.massBalance || {};
  const sel = est.selected || {};
  const env = est.environmentalImpact || {};

  $("contributionReport").hidden = false;
  $("reportStatusBadge").textContent = `Status: ${req.status} · Estimate Only`;
  $("reportThankYouMsg").textContent =
    `Thank you for contributing to a greener environment. Your ${req.quantity} kg of ${req.flower} waste has entered our recycling process.`;

  const profitClass = sel.flowercycleProfitINR >= 0 ? "fin-green" : "fin-red";

  $("templeReportCards").innerHTML = `
    <div class="fin-mini-card">
      <small>Submitted Waste</small>
      <strong>${req.quantity} kg</strong>
      <span>${esc(req.flower)} (${esc(req.condition || "Fresh")}, ${req.contaminationPct ?? 5}% contam.)</span>
    </div>
    <div class="fin-mini-card">
      <small>Usable Waste</small>
      <strong>${mb.usableWasteKg} kg</strong>
      <span>Dry floral matter: ${mb.dryFloralKg} kg</span>
    </div>
    <div class="fin-mini-card">
      <small>Estimated Product Output</small>
      <strong>${sel.estimatedOutputKg} kg</strong>
      <span>${esc(sel.productName)}</span>
    </div>
    <div class="fin-mini-card fin-card-yellow">
      <small>Est. Product Selling Value</small>
      <strong class="fin-yellow">${money(sel.totalRevenueINR)}</strong>
      <span>Range: ${money(sel.revenueRangeINR?.min)} – ${money(sel.revenueRangeINR?.max)}</span>
    </div>
    <div class="fin-mini-card">
      <small>Processing &amp; Operating Cost</small>
      <strong>${money(sel.totalExpensesINR)}</strong>
      <span>Direct: ${money(sel.directProductionCostINR)} · Logistics: ${money(sel.operatingOverheadINR)}</span>
    </div>
    <div class="fin-mini-card fin-card-green">
      <small>Estimated Temple Reward</small>
      <strong class="fin-green">${money(sel.templeRewardINR)}</strong>
      <span>Indicative reward (not guaranteed)</span>
    </div>
    <div class="fin-mini-card">
      <small>FlowerCycle Est. Net Profit</small>
      <strong class="${profitClass}">${money(sel.flowercycleProfitINR)}</strong>
      <span>Margin: ${sel.marginPct}% (${sel.isProfitable ? "Viable" : "Loss"})</span>
    </div>
    <div class="fin-mini-card">
      <small>Environmental Contribution</small>
      <strong class="fin-green">${env.wasteDivertedFromLandfillKg} kg diverted</strong>
      <span>~${env.estimatedCo2AvoidedKg} kg CO₂e avoided (illustrative)</span>
    </div>
  `;

  const exp = sel.expenseBreakdown || {};
  $("templeReportBreakdown").innerHTML = `
    <h3>Transparent Calculation Breakdown (${esc(req.requestId)})</h3>
    <div class="fin-break-grid">
      <div><span>Collection &amp; Transport:</span><b>${money((exp.collectionCostINR || 0) + (exp.transportationCostINR || 0))}</b></div>
      <div><span>Segregation Labour:</span><b>${money(exp.labourCostINR)}</b></div>
      <div><span>Drying &amp; Processing:</span><b>${money((exp.dryingCostINR || 0) + (exp.processingCostINR || 0))}</b></div>
      <div><span>Additional Ingredients &amp; Packaging:</span><b>${money((exp.additionalIngredientsCostINR || 0) + (exp.packagingCostINR || 0))}</b></div>
      <div><span>Other Operational Overhead:</span><b>${money(exp.otherOperationalCostINR)}</b></div>
      <div><span>Market Benchmark Source (${esc(est.priceDataDate)}):</span><b>${money(sel.sellingPriceINR)}/kg</b></div>
    </div>
  `;

  $("templeReportDisclaimer").textContent =
    `ⓘ ${est.disclaimer} Source: ${est.priceDataSource} (${est.priceDataDate}). Engine: ${est.calculationMode}.`;
}

async function render() {
  try {
    const { data: requests } = await api.getRequests();
    allRequests = requests;
    const q = $("templeSearch").value.trim().toLowerCase();

    $("welcomeTemple").textContent = "Welcome, " + (user.templeName || user.name);
    $("templeProfileName").textContent = user.templeName || user.name;

    $("templeTotal").textContent = requests.length;
    $("templePending").textContent = requests.filter((r) => r.status === "Pending").length;
    $("templeCollected").textContent =
      requests
        .filter((r) => ["Collected", "Processing", "Completed"].includes(r.status))
        .reduce((a, r) => a + Number(r.quantity), 0) + " kg";

    const totalEstReward = requests.reduce(
      (sum, r) => sum + Number(r.financialEstimate?.selected?.templeRewardINR || 0),
      0
    );
    $("templeEarnings").textContent = money(totalEstReward);

    const list = requests.filter((r) => r.flower.toLowerCase().includes(q));

    $("templeRequestRows").innerHTML = list
      .map((r) => {
        const est = r.financialEstimate;
        const usable = est?.massBalance?.usableWasteKg ?? (r.quantity * 0.95).toFixed(2);
        const reward = est?.selected?.templeRewardINR ?? 0;
        return `<tr>
          <td><b>${esc(r.requestId)}</b></td>
          <td>${esc(r.flower)}<br><small class="muted">${esc(r.condition || "Fresh")} · ${r.contaminationPct ?? 5}% contam.</small></td>
          <td>${r.quantity} kg <small class="muted">(${usable} kg usable)</small></td>
          <td><b class="fin-green">${money(reward)}</b><br><small class="muted">${esc(est?.selected?.productName || "Estimated")}</small></td>
          <td>${esc(r.date)}</td>
          <td><span class="status ${r.status.toLowerCase()}">${esc(r.status)}</span></td>
          <td>${est ? `<button class="action-btn" data-view-report="${esc(r._id)}">View Report</button>` : `<span class="muted">—</span>`}</td>
        </tr>`;
      })
      .join("");

    $("templeEmpty").hidden = list.length > 0;

    // Show the latest request report by default if none active
    if (!activeReportRequest && requests.length > 0) {
      const withEst = requests.find((r) => r.financialEstimate);
      if (withEst) renderContributionReport(withEst);
    }
  } catch (err) {
    console.error("Failed to load requests:", err.message);
    toast("Failed to load requests. Please try again.");
  }
}

// Submit collection request (server computes all financial estimates)
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
    condition: $("requestCondition").value,
    contaminationPct: Number($("requestContamination").value || 0),
    preferredMethod: $("requestMethod").value,
    date: $("requestDate").value,
    contact: $("requestContact").value.trim(),
    address: $("requestAddress").value.trim(),
    notes: $("requestNotes").value.trim(),
  };

  try {
    const res = await api.createRequest(requestData);
    e.target.reset();
    prefillFormDefaults();
    activeReportRequest = res.data;
    renderContributionReport(res.data);
    await render();
    $("contributionReport").scrollIntoView({ behavior: "smooth", block: "start" });
    toast("Collection request submitted & financial report generated!");
  } catch (err) {
    toast(err.message || "Failed to submit request.");
  }
});

$("templeRequestRows").addEventListener("click", (e) => {
  const id = e.target.dataset.viewReport;
  if (!id) return;
  const req = allRequests.find((r) => r._id === id);
  if (req) {
    renderContributionReport(req);
    $("contributionReport").scrollIntoView({ behavior: "smooth", block: "start" });
  }
});

$("downloadTempleReport").addEventListener("click", () => {
  if (!activeReportRequest || !activeReportRequest.financialEstimate) return;
  const r = activeReportRequest;
  const est = r.financialEstimate;
  const sel = est.selected;
  const mb = est.massBalance;
  const text = [
    "FLOWERCYCLE - TEMPLE WASTE CONTRIBUTION REPORT",
    "==============================================",
    `Request ID: ${r.requestId}`,
    `Temple: ${r.temple}`,
    `Collection Date: ${r.date}`,
    `Collection Location: ${r.address}`,
    `Collection Status: ${r.status}`,
    "",
    "1. WASTE & CONVERSION SUMMARY",
    `   Submitted Waste: ${r.quantity} kg (${r.flower}, ${r.condition}, ${r.contaminationPct}% contamination)`,
    `   Usable Waste: ${mb.usableWasteKg} kg`,
    `   Dry Floral Matter (after moisture & sorting loss): ${mb.dryFloralKg} kg`,
    `   Target Product: ${sel.productName}`,
    `   Estimated Product Output: ${sel.estimatedOutputKg} kg`,
    "",
    "2. ESTIMATED FINANCIAL BREAKDOWN (INR)",
    `   Estimated Selling Value: Rs ${sel.totalRevenueINR} (Range: Rs ${sel.revenueRangeINR?.min} - Rs ${sel.revenueRangeINR?.max})`,
    `   Direct Production Costs: Rs ${sel.directProductionCostINR}`,
    `   Logistics & Operating Expenses: Rs ${sel.operatingOverheadINR}`,
    `   Total Processing Expenses: Rs ${sel.totalExpensesINR}`,
    `   Estimated Temple Reward: Rs ${sel.templeRewardINR} (Indicative Estimate)`,
    `   FlowerCycle Estimated Net Profit: Rs ${sel.flowercycleProfitINR}`,
    "",
    "3. ENVIRONMENTAL CONTRIBUTION",
    `   Waste Diverted from River/Landfill: ${est.environmentalImpact.wasteDivertedFromLandfillKg} kg`,
    `   Estimated CO2e Avoided: ${est.environmentalImpact.estimatedCo2AvoidedKg} kg`,
    "",
    `Source & Date: ${est.priceDataSource} (${est.priceDataDate})`,
    `Disclaimer: ${est.disclaimer}`,
  ].join("\n");

  const blob = new Blob([text], { type: "text/plain;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `temple-contribution-${r.requestId}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  toast("Contribution report downloaded.");
});

$("templeSearch").addEventListener("input", render);

$("templeLogout").addEventListener("click", () => {
  api.clearAuth();
  location.href = "login.html";
});

render();
