// ── Admin Financial Analytics & Config ─────────────────────
const $ = (id) => document.getElementById(id);
const money = (n) => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );

function toast(msg) {
  const el = $("finToast");
  el.textContent = msg;
  el.style.display = "block";
  setTimeout(() => (el.style.display = "none"), 2400);
}

let loadedConfig = null;

async function loadAnalytics() {
  try {
    const params = {
      startDate: $("fStart").value,
      endDate: $("fEnd").value,
      flower: $("fFlower").value,
      category: $("fCategory").value,
      temple: $("fTemple").value,
    };

    const res = await api.getFinancialAnalytics(params);
    const d = res.data;
    const s = d.summary;

    // Populate temple filter once
    const templeSel = $("fTemple");
    if (templeSel.options.length <= 1 && d.filters?.availableTemples) {
      d.filters.availableTemples.forEach((t) => {
        const opt = document.createElement("option");
        opt.value = t;
        opt.textContent = t;
        templeSel.appendChild(opt);
      });
    }

    $("finWasteStat").textContent = `${s.totalWasteCollectedKg} / ${s.totalWasteProcessedKg} kg`;
    $("finWasteReceived").textContent = `Segregation Received: ${s.totalWasteReceivedKg} kg`;

    $("finActualRev").textContent = money(s.actualRevenueINR);
    $("finGrossProfit").textContent = `Gross Profit: ${money(s.grossProfitINR)} (Best Product: ${d.mostProfitableProduct?.name || "—"})`;

    const netEl = $("finNetProfit");
    netEl.textContent = money(s.netProfitINR);
    netEl.className = s.netProfitINR >= 0 ? "fin-green" : "fin-red";
    $("finExpenditure").textContent = `Processing Exp: ${money(s.totalProcessingExpenditureINR)} | COGS: ${money(s.actualDirectCostINR)}`;

    $("finEstPipeline").textContent = money(s.estimatedPipelineRevenueINR);
    $("finTemplePay").textContent = `Temple Paid: ${money(s.totalTemplePaymentsPaidINR)} | Est: ${money(s.totalTemplePaymentsEstimatedINR)}`;

    $("bestFlowerLabel").textContent = d.mostProfitableFlower
      ? `Most Profitable Flower: ${d.mostProfitableFlower.flower} (${money(d.mostProfitableFlower.estimatedProfit)} est. profit)`
      : "No matching flower records";

    $("finDisclaimer").textContent = `ⓘ ${d.disclaimer}`;

    // Product-Wise Revenue Bars
    const maxProd = Math.max(1, ...d.productWiseRevenue.map((p) => p.revenue));
    $("finProductBars").innerHTML = d.productWiseRevenue.length
      ? d.productWiseRevenue
          .map(
            (p) => `<div class="category-bar-row">
              <span>${esc(p.category)}</span>
              <div class="category-bar-track"><b style="width:${(p.revenue / maxProd) * 100}%"></b></div>
              <strong>${money(p.revenue)}</strong>
            </div>`
          )
          .join("")
      : `<p class="muted">No product sales match current filters.</p>`;

    // Monthly P&L Bars (Green for positive profit, Red for loss)
    const maxM = Math.max(1, ...d.monthlyPnL.map((m) => Math.abs(m.actualProfit)));
    $("finMonthlyBars").innerHTML = d.monthlyPnL.length
      ? d.monthlyPnL
          .map((m) => {
            const isLoss = m.actualProfit < 0;
            const barStyle = isLoss
              ? "background:linear-gradient(90deg,#c0392b,#e74c3c)"
              : "";
            return `<div class="category-bar-row">
              <span>${esc(m.month)}</span>
              <div class="category-bar-track"><b style="width:${Math.max(5, (Math.abs(m.actualProfit) / maxM) * 100)}%;${barStyle}"></b></div>
              <strong class="${isLoss ? "fin-red" : "fin-green"}">${money(m.actualProfit)}</strong>
            </div>`;
          })
          .join("")
      : `<p class="muted">No monthly P&L data for selected filters.</p>`;

    // Flower Profitability Bars
    const maxFl = Math.max(1, ...d.flowerProfitability.map((f) => Math.max(0, f.estimatedProfit)));
    $("finFlowerBars").innerHTML = d.flowerProfitability.length
      ? d.flowerProfitability
          .map(
            (f) => `<div class="category-bar-row">
              <span>${esc(f.flower)} (${f.totalKg}kg)</span>
              <div class="category-bar-track"><b style="width:${Math.max(4, (Math.max(0, f.estimatedProfit) / maxFl) * 100)}%"></b></div>
              <strong class="${f.estimatedProfit >= 0 ? "fin-green" : "fin-red"}">${money(f.estimatedProfit)}</strong>
            </div>`
          )
          .join("")
      : `<p class="muted">No flower submissions match filters.</p>`;

    // Transactions table
    $("finTxRows").innerHTML = (d.recentTransactions || [])
      .map((t) => {
        const isPaid = t.status === "Paid";
        const plClass = (t.flowercycleProfitINR || 0) >= 0 ? "fin-green" : "fin-red";
        return `<tr>
          <td><b>${esc(t.transactionId)}</b><br><small class="muted">${esc(t.requestId || "—")} · ${esc(t.date)}</small></td>
          <td>${esc(t.templeName || "—")}</td>
          <td>${t.wasteQuantityKg || 0} kg ${esc(t.flowerType || "")}<br><small class="muted">${esc(t.productName || "")}</small></td>
          <td>${money(t.estimatedRevenueINR)}</td>
          <td><b class="${plClass}">${money(t.flowercycleProfitINR)}</b></td>
          <td><b>${money(t.templeRewardINR)}</b></td>
          <td><span class="status ${isPaid ? "collected" : "pending"}">${esc(t.status)}</span></td>
          <td>${!isPaid ? `<button class="action-btn" data-pay-tx="${t._id}">Mark Paid</button>` : `<span class="muted">Settled</span>`}</td>
        </tr>`;
      })
      .join("");
  } catch (err) {
    console.error("Financial analytics error:", err);
    toast("Failed to load financial analytics.");
  }
}

async function loadConfigAndML() {
  try {
    const [cfgRes, mlRes] = await Promise.all([api.getFinancialConfig(), api.getMLStatus()]);
    const cfg = cfgRes.data;
    loadedConfig = cfg;

    $("cfgVersion").textContent = cfg.version || 1;
    $("cfgCollection").value = cfg.costRates?.collectionPerKg ?? 2;
    $("cfgTransport").value = cfg.costRates?.transportPerKg ?? 2.5;
    $("cfgLabour").value = cfg.costRates?.labourPerUsableKg ?? 8;
    $("cfgDrying").value = cfg.costRates?.dryingPerUsableKg ?? 3.5;
    $("cfgPackaging").value = cfg.costRates?.packagingPerOutputKg ?? 18;

    $("cfgRewardType").value = cfg.templeRewardPolicy?.policyType || "per_usable_kg";
    $("cfgRewardPerKg").value = cfg.templeRewardPolicy?.ratePerUsableKg ?? 4;
    $("cfgRewardPct").value = cfg.templeRewardPolicy?.revenueSharePct ?? 10;

    $("cfgIncensePrice").value = cfg.products?.natural_incense?.sellingPriceINR ?? 380;
    $("cfgCompostPrice").value = cfg.products?.organic_compost?.sellingPriceINR ?? 12;
    $("cfgVermiPrice").value = cfg.products?.vermicompost?.sellingPriceINR ?? 14;
    $("cfgColoursPrice").value = cfg.products?.natural_colours?.sellingPriceINR ?? 320;

    const ml = mlRes.data;
    const pub = ml.evaluationReport?.publicCompostDataset;
    const rf = pub?.models?.RandomForestRegressor;
    $("finMlStatusBox").innerHTML = `
      <div class="ai-rec">
        <b>Active Financial Engine: Validated Rule-Based Model (ML Not Used for Estimates)</b>
        <p>${esc(ml.architectureNote)}</p>
      </div>
      <div class="ai-item win">
        <div>
          <b>Logged Real Batches (MongoDB CalculationHistory)</b>
          <small>${ml.loggedSubmissionBatches} / ${ml.minRequiredForFinancialML} batches collected for future ML training</small>
        </div>
        <strong>${ml.readinessPct}%</strong>
      </div>
      ${pub ? `<div class="ai-item warn">
        <div>
          <b>Public Compost Chemistry Benchmark (${pub.rows} rows)</b>
          <small>scikit-learn RandomForest on compost Score: R²=${rf?.r2}, MAE=${rf?.mae} (chemistry only, not INR profit)</small>
        </div>
        <strong>R² ${rf?.r2}</strong>
      </div>` : ""}
    `;
  } catch (err) {
    console.error("Config/ML load error:", err);
  }
}

$("configForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!loadedConfig) return;

  const updatedProducts = { ...loadedConfig.products };
  if (updatedProducts.natural_incense) updatedProducts.natural_incense.sellingPriceINR = Number($("cfgIncensePrice").value);
  if (updatedProducts.organic_compost) updatedProducts.organic_compost.sellingPriceINR = Number($("cfgCompostPrice").value);
  if (updatedProducts.vermicompost) updatedProducts.vermicompost.sellingPriceINR = Number($("cfgVermiPrice").value);
  if (updatedProducts.natural_colours) updatedProducts.natural_colours.sellingPriceINR = Number($("cfgColoursPrice").value);

  try {
    const res = await api.updateFinancialConfig({
      costRates: {
        collectionPerKg: Number($("cfgCollection").value),
        transportPerKg: Number($("cfgTransport").value),
        labourPerUsableKg: Number($("cfgLabour").value),
        dryingPerUsableKg: Number($("cfgDrying").value),
        packagingPerOutputKg: Number($("cfgPackaging").value),
      },
      templeRewardPolicy: {
        policyType: $("cfgRewardType").value,
        ratePerUsableKg: Number($("cfgRewardPerKg").value),
        revenueSharePct: Number($("cfgRewardPct").value),
      },
      products: updatedProducts,
    });
    loadedConfig = res.data;
    $("cfgVersion").textContent = res.data.version;
    toast("Backend financial configuration saved!");
    await loadAnalytics();
  } catch (err) {
    toast(err.message || "Only Admins can save configuration.");
  }
});

$("finTxRows").addEventListener("click", async (e) => {
  const id = e.target.dataset.payTx;
  if (!id) return;
  try {
    await api.payTransaction(id);
    toast("Temple reward marked as Paid.");
    await loadAnalytics();
  } catch (err) {
    toast(err.message || "Could not update transaction.");
  }
});

["fStart", "fEnd", "fFlower", "fCategory", "fTemple"].forEach((id) => {
  $(id).addEventListener("change", loadAnalytics);
});

$("clearFiltersBtn").addEventListener("click", () => {
  $("fStart").value = "";
  $("fEnd").value = "";
  $("fFlower").value = "all";
  $("fCategory").value = "all";
  $("fTemple").value = "all";
  loadAnalytics();
});

$("refreshFinBtn").addEventListener("click", () => {
  loadAnalytics();
  loadConfigAndML();
  toast("Financial analytics refreshed.");
});

loadAnalytics();
loadConfigAndML();
