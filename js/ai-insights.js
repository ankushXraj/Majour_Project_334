// ── AI Profit & Sustainability Analyst ─────────────────────
const $ = (id) => document.getElementById(id);
const money = (n) => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );

function toast(msg) {
  const el = $("aiToast");
  el.textContent = msg;
  el.style.display = "block";
  setTimeout(() => (el.style.display = "none"), 2400);
}

function formatAiMarkdown(text) {
  return esc(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br>");
}

function appendMessage(sender, text, isUser = false) {
  const log = $("aiChatLog");
  const div = document.createElement("div");
  div.className = `ai-msg ${isUser ? "ai-user" : "ai-bot"}`;
  div.innerHTML = `<strong>${esc(sender)}</strong><p>${formatAiMarkdown(text)}</p>`;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

async function loadAnalysis() {
  try {
    const res = await api.getAiAnalysis();
    const d = res.data;
    const f = d.financials;
    const o = d.overview;
    const fc = d.forecast;

    // KPI Cards
    $("aiNetProfit").textContent = money(f.netProfit);
    $("aiMarginText").textContent = `${f.profitMarginPct}% net profit margin`;
    $("aiRevenue").textContent = money(f.totalRevenue);
    $("aiCostText").textContent = `COGS + Processing: ${money(f.totalCOGS + f.totalWasteProcessingCost)}`;
    $("aiLoss").textContent = money(f.totalOpportunityLoss);
    $("aiIdleText").textContent = `${o.totalContaminationKg} kg contam. + ${o.idleWasteKg} kg idle`;
    $("aiForecastLabel").textContent = `AI Forecast (${fc.nextMonthLabel})`;
    $("aiForecastProfit").textContent = money(fc.projectedProfit);
    $("aiForecastTrend").textContent = `${fc.profitTrendPct >= 0 ? "+" : ""}${fc.profitTrendPct}% projected trend (${fc.projectedWasteKg} kg waste)`;

    // Winners ("What Worked")
    $("aiWinnersList").innerHTML = d.topProducts
      .map(
        (p) => `<div class="ai-item win">
          <div><b>${esc(p.name)}</b><small>${esc(p.category)} · ${p.soldQuantity} sold (${p.sellThroughPct}% sell-through)</small></div>
          <strong>+${money(p.grossProfit)}</strong>
        </div>`
      )
      .join("");

    // Gaps ("What Didn't Work")
    const gapItems = [];
    if (o.idleWasteKg > 0) {
      gapItems.push(`<div class="ai-item warn">
        <div><b>Unprocessed Usable Flowers (${o.idleWasteKg} kg)</b><small>Sitting in Ready / Awaiting processing stages</small></div>
        <strong>-${money(f.idleWasteOpportunityINR)}</strong>
      </div>`);
    }
    if (o.totalContaminationKg > 0) {
      gapItems.push(`<div class="ai-item warn">
        <div><b>Non-Floral Contamination (${o.totalContaminationKg} kg)</b><small>Plastic/cloth waste reducing yield to ${o.usableYieldPct}%</small></div>
        <strong>-${money(f.contaminationLossINR)}</strong>
      </div>`);
    }
    d.slowOrLowMarginProducts.slice(0, 3).forEach((p) => {
      gapItems.push(`<div class="ai-item warn">
        <div><b>Slow Stock: ${esc(p.name)}</b><small>Only ${p.sellThroughPct}% sold · ${p.inStock} units unsold</small></div>
        <strong>${money(p.capitalBlockedInStock)} tied</strong>
      </div>`);
    });
    $("aiGapsList").innerHTML = gapItems.length
      ? gapItems.join("")
      : `<p class="muted">No major inventory or processing gaps detected.</p>`;

    // Monthly Profit Trend Bars
    const maxVal = Math.max(1, ...d.monthlySeries.map((m) => Math.max(0, m.profit)), fc.projectedProfit);
    const barsHtml = d.monthlySeries
      .map(
        (m) => `<div class="category-bar-row">
          <span>${esc(m.month)}</span>
          <div class="category-bar-track"><b style="width:${Math.max(4, (Math.max(0, m.profit) / maxVal) * 100)}%"></b></div>
          <strong>${money(m.profit)}</strong>
        </div>`
      )
      .join("");
    const forecastRow = `<div class="category-bar-row ai-forecast-row">
      <span>${esc(fc.nextMonthLabel)} (AI)</span>
      <div class="category-bar-track"><b style="width:${Math.max(4, (Math.max(0, fc.projectedProfit) / maxVal) * 100)}%;background:linear-gradient(90deg,#e59a32,#ffc45a)"></b></div>
      <strong>${money(fc.projectedProfit)}</strong>
    </div>`;
    $("aiMonthlyBars").innerHTML = barsHtml + forecastRow;

    // Recommendations
    $("aiRecommendations").innerHTML = d.recommendations
      .map(
        (r) => `<div class="ai-rec">
          <b>${esc(r.title)}</b>
          <p>${esc(r.detail)}</p>
        </div>`
      )
      .join("");

    // Category ROI table
    $("aiCategoryTable").innerHTML = d.categoryStats
      .map(
        (c) => `<tr>
          <td><b>${esc(c.category)}</b></td>
          <td>${c.unitsSold.toLocaleString()}</td>
          <td>${c.unitsInStock.toLocaleString()}</td>
          <td>${money(c.revenue)}</td>
          <td>${money(c.cost)}</td>
          <td><strong style="color:#1f7a4c">${money(c.profit)}</strong></td>
          <td><span class="status ${c.marginPct >= 50 ? "collected" : "pending"}">${c.marginPct}%</span></td>
          <td>${c.sellThroughPct}%</td>
        </tr>`
      )
      .join("");

    // Auto-run initial executive summary in chat log
    const initial = await api.askAi("Full summary batao");
    $("aiChatLog").innerHTML = "";
    $("aiEngineTag").textContent = initial.data.engine;
    appendMessage("FlowerCycle AI", initial.data.answer, false);
  } catch (err) {
    console.error("AI Analysis error:", err);
    toast("Failed to load AI insights. Please sign in first.");
  }
}

async function handleAsk(question) {
  if (!question.trim()) return;
  appendMessage("You", question, true);
  $("aiQuestionInput").value = "";

  try {
    const res = await api.askAi(question);
    $("aiEngineTag").textContent = res.data.engine;
    appendMessage("FlowerCycle AI", res.data.answer, false);
  } catch (err) {
    appendMessage("FlowerCycle AI", "Error analyzing query: " + err.message, false);
  }
}

async function downloadDataset(format) {
  try {
    const token = api.getToken();
    const res = await fetch(`/api/ai/dataset?format=${format}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error("Download failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `flowercycle-dataset.${format}`;
    a.click();
    URL.revokeObjectURL(url);
    toast(`Dataset (${format.toUpperCase()}) downloaded.`);
  } catch (err) {
    toast("Could not download dataset.");
  }
}

$("aiChatForm").addEventListener("submit", (e) => {
  e.preventDefault();
  handleAsk($("aiQuestionInput").value);
});

document.querySelectorAll(".ai-chip").forEach((btn) => {
  btn.addEventListener("click", () => handleAsk(btn.dataset.q));
});

$("refreshAiBtn").addEventListener("click", async () => {
  await loadAnalysis();
  toast("AI analysis refreshed.");
});
$("downloadCsvBtn").addEventListener("click", () => downloadDataset("csv"));
$("downloadJsonBtn").addEventListener("click", () => downloadDataset("json"));

loadAnalysis();
