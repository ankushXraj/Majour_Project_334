// ── Smart Waste-to-Wealth Calculator ───────────────────────
const $ = (id) => document.getElementById(id);
const money = (n) => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );

function animateVal(el, targetNum, prefix = "", suffix = "", decimals = 2) {
  if (!el) return;
  const start = parseFloat(el.dataset.currentVal || 0);
  const duration = 450;
  const startTime = performance.now();
  el.dataset.currentVal = targetNum;

  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    const val = start + (targetNum - start) * ease;
    el.textContent = `${prefix}${val.toLocaleString("en-IN", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}${suffix}`;
    if (progress < 1) requestAnimationFrame(step);
    else {
      el.textContent = `${prefix}${targetNum.toLocaleString("en-IN", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}${suffix}`;
    }
  }
  requestAnimationFrame(step);
}

function renderSimulation(d) {
  const mb = d.massBalance || {};
  const sel = d.selected || {};
  const exp = sel.expenseBreakdown || {};

  animateVal($("resUsable"), Number(mb.usableWasteKg || 0), "", " kg", 1);
  $("resDryMatter").textContent = `After ${mb.handlingRejectionPct}% sort loss & ${mb.moisturePct}% moisture → ${mb.dryFloralKg} kg dry`;

  animateVal($("resOutput"), Number(sel.estimatedOutputKg || 0), "", " kg", 1);
  $("resProductName").textContent = sel.productName;

  animateVal($("resRevenue"), Number(sel.totalRevenueINR || 0), "₹", "", 2);
  $("resRevRange").textContent = `Confidence range: ${money(sel.revenueRangeINR?.min)} – ${money(sel.revenueRangeINR?.max)}`;

  animateVal($("resExpenses"), Number(sel.totalExpensesINR || 0), "₹", "", 2);
  $("resCostSplit").textContent = `Direct: ${money(sel.directProductionCostINR)} · Overhead: ${money(sel.operatingOverheadINR)}`;

  animateVal($("resReward"), Number(sel.templeRewardINR || 0), "₹", "", 2);

  const profitEl = $("resNetProfit");
  animateVal(profitEl, Number(sel.flowercycleProfitINR || 0), "₹", "", 2);
  profitEl.className = sel.flowercycleProfitINR >= 0 ? "fin-green" : "fin-red";
  $("resMargin").textContent = `Margin: ${sel.marginPct}% (${sel.isProfitable ? "Profitable" : "Operating Loss"})`;

  // Visual Breakdown Bar Update
  const totalKg = mb.totalWasteKg || 1;
  const dryPct = Math.max(2, Math.round(((mb.dryFloralKg || 0) / totalKg) * 100));
  const contamPct = Math.max(1, Math.round(((mb.contaminationRemovedKg || 0) / totalKg) * 100));
  const rejectPct = Math.max(1, Math.round(((mb.handlingRejectionKg || 0) / totalKg) * 100));
  const moistPct = Math.max(5, 100 - dryPct - contamPct - rejectPct);

  if ($("barDry")) {
    $("barDry").style.width = `${dryPct}%`;
    $("barMoisture").style.width = `${moistPct}%`;
    $("barContam").style.width = `${contamPct}%`;
    $("barReject").style.width = `${rejectPct}%`;
    $("pctDry").textContent = `${dryPct}%`;
    $("pctMoisture").textContent = `${moistPct}%`;
    $("pctContam").textContent = `${contamPct}%`;
    $("pctReject").textContent = `${rejectPct}%`;
  }

  $("resPriceMeta").textContent = `Price Source: ${d.priceDataSource} (Date: ${d.priceDataDate})`;
  $("resDisclaimer").textContent = `ⓘ ${d.disclaimer}`;
  $("simEngineInfo").textContent = `Engine: ${d.calculationMode} (Config v${d.configVersion})`;

  $("resMassAndCost").innerHTML = `
    <div><span>Total Input Waste:</span><b>${mb.totalWasteKg} kg (${esc(d.inputSummary.condition)})</b></div>
    <div><span>Contamination Removed (${d.inputSummary.contaminationPct}%):</span><b>-${mb.contaminationRemovedKg} kg</b></div>
    <div><span>Handling Rejection (${mb.handlingRejectionPct}%):</span><b>-${mb.handlingRejectionKg} kg</b></div>
    <div><span>Moisture Evaporated:</span><b>-${mb.moistureLossKg} kg</b></div>
    <div><span>Collection &amp; Transport:</span><b>${money((exp.collectionCostINR || 0) + (exp.transportationCostINR || 0))}</b></div>
    <div><span>Segregation Labour &amp; Overhead:</span><b>${money((exp.labourCostINR || 0) + (exp.otherOperationalCostINR || 0))}</b></div>
    <div><span>Drying &amp; Processing:</span><b>${money((exp.dryingCostINR || 0) + (exp.processingCostINR || 0))}</b></div>
    <div><span>Co-Ingredients &amp; Packaging:</span><b>${money((exp.additionalIngredientsCostINR || 0) + (exp.packagingCostINR || 0))}</b></div>
  `;

  $("resCompareTable").innerHTML = (d.allProductOptions || [])
    .map((o) => {
      const isSelected = o.productKey === sel.productKey;
      const pClass = o.flowercycleProfitINR >= 0 ? "fin-green" : "fin-red";
      return `<tr class="${isSelected ? "fin-row-highlight" : ""}">
        <td><b>${esc(o.productName)}</b> ${isSelected ? '<span class="status collected">Selected</span>' : ""}</td>
        <td>${o.estimatedOutputKg} kg</td>
        <td><b>${money(o.totalRevenueINR)}</b><br><small class="muted">${money(o.revenueRangeINR?.min)}–${money(o.revenueRangeINR?.max)}</small></td>
        <td>${money(o.totalExpensesINR)}</td>
        <td>${money(o.templeRewardINR)}</td>
        <td><strong class="${pClass}">${money(o.flowercycleProfitINR)}</strong><br><small class="muted">${o.marginPct}%</small></td>
      </tr>`;
    })
    .join("");

  window.FlowerCycleMotion?.refresh();
}

async function runSimulation() {
  const payload = {
    flowerType: $("simFlower").value,
    quantity: Number($("simQuantity").value || 3),
    condition: $("simCondition").value,
    contaminationPct: Number($("simContam").value || 0),
  };

  try {
    const res = await api.simulateFinancial(payload);
    renderSimulation(res.data);
  } catch (err) {
    const el = $("calcToast");
    el.textContent = err.message || "Simulation failed";
    el.style.display = "block";
    setTimeout(() => (el.style.display = "none"), 2400);
  }
}

$("simContam").addEventListener("input", () => {
  $("simContamLabel").textContent = $("simContam").value + "%";
  runSimulation();
});

["simFlower", "simQuantity", "simCondition"].forEach((id) => {
  $(id).addEventListener("change", runSimulation);
});

$("simForm").addEventListener("submit", (e) => {
  e.preventDefault();
  runSimulation();
});

runSimulation();
