const CollectionRequest = require("../models/CollectionRequest");
const WasteRecord = require("../models/WasteRecord");
const EcoProduct = require("../models/EcoProduct");
const User = require("../models/User");

/**
 * Ordinary Least Squares linear regression on sequential numeric series.
 * Returns slope, intercept, and next-step prediction.
 */
function linearForecast(values) {
  const n = values.length;
  if (n === 0) return { nextValue: 0, slope: 0, trendPct: 0 };
  if (n === 1) return { nextValue: Math.max(0, Math.round(values[0])), slope: 0, trendPct: 0 };

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }

  const denom = n * sumXX - sumX * sumX;
  const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  const nextRaw = intercept + slope * n;
  const lastVal = values[n - 1] || 1;
  const trendPct = ((nextRaw - lastVal) / Math.max(1, Math.abs(lastVal))) * 100;

  return {
    nextValue: Math.max(0, Math.round(nextRaw)),
    slope: Number(slope.toFixed(2)),
    trendPct: Number(trendPct.toFixed(1)),
  };
}

/**
 * Compute full financial P&L, waste efficiency, opportunity gaps,
 * category ROI, and AI predictions from live MongoDB collections.
 */
async function computeFullAnalysis() {
  const [requests, waste, products, templeCount] = await Promise.all([
    CollectionRequest.find().sort({ date: 1 }),
    WasteRecord.find().sort({ date: 1 }),
    EcoProduct.find().sort({ date: 1 }),
    User.countDocuments({ role: "temple" }),
  ]);

  // ── 1. Product-Level Financials ────────────────────────────────
  const productAnalytics = products.map((p) => {
    const qty = Number(p.quantity || 0);
    const sold = Number(p.soldQuantity || 0);
    const price = Number(p.price || 0);
    const cost = Number(p.costPrice || Math.round(price * 0.45));
    const totalProduced = qty + sold;

    const revenue = sold * price;
    const cogs = sold * cost; // Cost of Goods Sold
    const grossProfit = revenue - cogs;
    const profitMarginPct = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
    const sellThroughPct = totalProduced > 0 ? (sold / totalProduced) * 100 : 0;
    const capitalBlockedInStock = qty * cost;
    const potentialUnsoldRevenue = qty * price;

    return {
      id: p.productId,
      name: p.name,
      category: p.category,
      date: p.date,
      price,
      costPrice: cost,
      soldQuantity: sold,
      inStock: qty,
      wasteUsedKg: Number(p.wasteUsedKg || 0),
      revenue,
      cogs,
      grossProfit,
      profitMarginPct: Number(profitMarginPct.toFixed(1)),
      sellThroughPct: Number(sellThroughPct.toFixed(1)),
      capitalBlockedInStock,
      potentialUnsoldRevenue,
    };
  });

  const totalRevenue = productAnalytics.reduce((s, p) => s + p.revenue, 0);
  const totalCOGS = productAnalytics.reduce((s, p) => s + p.cogs, 0);
  const totalWasteProcessingCost = waste.reduce(
    (s, w) => s + (Number(w.processingCost) || Number(w.received || 0) * 4),
    0
  );
  const netProfit = totalRevenue - totalCOGS - totalWasteProcessingCost;
  const profitMarginPct = totalRevenue > 0 ? Number(((netProfit / totalRevenue) * 100).toFixed(1)) : 0;

  const unsoldCapitalBlocked = productAnalytics.reduce((s, p) => s + p.capitalBlockedInStock, 0);
  const potentialStockRevenue = productAnalytics.reduce((s, p) => s + p.potentialUnsoldRevenue, 0);

  // ── 2. Waste & Opportunity Loss ("Kya Nahi Hua") ───────────────
  const totalReceivedKg = waste.reduce((s, w) => s + Number(w.received || 0), 0);
  const totalUsableKg = waste.reduce((s, w) => s + Number(w.usable || 0), 0);
  const totalContaminationKg = waste.reduce((s, w) => s + Number(w.other || 0), 0);

  const usableYieldPct = totalReceivedKg > 0 ? Number(((totalUsableKg / totalReceivedKg) * 100).toFixed(1)) : 0;

  const sentToProcessingKg = waste
    .filter((w) => w.stage === "Sent for processing")
    .reduce((s, w) => s + Number(w.usable || 0), 0);
  const idleWasteKg = waste
    .filter((w) => w.stage !== "Sent for processing")
    .reduce((s, w) => s + Number(w.usable || 0), 0);

  const totalWasteUsedInProductsKg = productAnalytics.reduce((s, p) => s + p.wasteUsedKg, 0);
  const avgProfitPerUsableKg =
    totalWasteUsedInProductsKg > 0 ? Math.max(0, netProfit / totalWasteUsedInProductsKg) : 120;

  const contaminationLossINR = Math.round(totalContaminationKg * avgProfitPerUsableKg);
  const idleWasteOpportunityINR = Math.round(idleWasteKg * avgProfitPerUsableKg);
  const totalOpportunityLoss = contaminationLossINR + idleWasteOpportunityINR;

  // ── 3. Category ROI Breakdown ──────────────────────────────────
  const categories = ["Incense", "Compost", "Organic colours", "Decorative items"];
  const categoryStats = categories
    .map((cat) => {
      const items = productAnalytics.filter((p) => p.category === cat);
      const revenue = items.reduce((s, p) => s + p.revenue, 0);
      const cost = items.reduce((s, p) => s + p.cogs, 0);
      const profit = revenue - cost;
      const sold = items.reduce((s, p) => s + p.soldQuantity, 0);
      const stock = items.reduce((s, p) => s + p.inStock, 0);
      const totalUnits = sold + stock;
      return {
        category: cat,
        productCount: items.length,
        unitsSold: sold,
        unitsInStock: stock,
        revenue,
        cost,
        profit,
        marginPct: revenue > 0 ? Number(((profit / revenue) * 100).toFixed(1)) : 0,
        sellThroughPct: totalUnits > 0 ? Number(((sold / totalUnits) * 100).toFixed(1)) : 0,
      };
    })
    .filter((c) => c.productCount > 0)
    .sort((a, b) => b.profit - a.profit);

  // ── 4. Flower Yield & Source Efficiency ────────────────────────
  const flowerMap = {};
  waste.forEach((w) => {
    if (!flowerMap[w.flower]) {
      flowerMap[w.flower] = { flower: w.flower, received: 0, usable: 0, other: 0 };
    }
    flowerMap[w.flower].received += Number(w.received || 0);
    flowerMap[w.flower].usable += Number(w.usable || 0);
    flowerMap[w.flower].other += Number(w.other || 0);
  });
  const flowerEfficiency = Object.values(flowerMap)
    .map((f) => ({
      ...f,
      yieldPct: f.received > 0 ? Number(((f.usable / f.received) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.yieldPct - a.yieldPct);

  // Temple contamination ranking (to flag which temple needs better segregation)
  const templeWasteMap = {};
  waste.forEach((w) => {
    if (!templeWasteMap[w.source]) {
      templeWasteMap[w.source] = { temple: w.source, received: 0, usable: 0, other: 0 };
    }
    templeWasteMap[w.source].received += Number(w.received || 0);
    templeWasteMap[w.source].usable += Number(w.usable || 0);
    templeWasteMap[w.source].other += Number(w.other || 0);
  });
  const templeEfficiency = Object.values(templeWasteMap)
    .map((t) => ({
      ...t,
      contaminationPct: t.received > 0 ? Number(((t.other / t.received) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.contaminationPct - a.contaminationPct);

  // ── 5. Monthly Time-Series & Linear Regression Forecast ────────
  const monthMap = {};
  const ensureMonth = (ym) => {
    if (!monthMap[ym]) {
      monthMap[ym] = { month: ym, wasteKg: 0, usableKg: 0, processingCost: 0, revenue: 0, cogs: 0, profit: 0 };
    }
  };

  waste.forEach((w) => {
    const ym = String(w.date || "").slice(0, 7);
    if (!ym) return;
    ensureMonth(ym);
    monthMap[ym].wasteKg += Number(w.received || 0);
    monthMap[ym].usableKg += Number(w.usable || 0);
    monthMap[ym].processingCost += Number(w.processingCost) || Number(w.received || 0) * 4;
  });

  productAnalytics.forEach((p) => {
    const ym = String(p.date || "").slice(0, 7);
    if (!ym) return;
    ensureMonth(ym);
    monthMap[ym].revenue += p.revenue;
    monthMap[ym].cogs += p.cogs;
  });

  const monthlySeries = Object.values(monthMap)
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((m) => ({
      ...m,
      profit: m.revenue - m.cogs - m.processingCost,
    }));

  const wasteForecast = linearForecast(monthlySeries.map((m) => m.wasteKg));
  const revenueForecast = linearForecast(monthlySeries.map((m) => m.revenue));
  const profitForecast = linearForecast(monthlySeries.map((m) => m.profit));

  // Next month label
  let nextMonthLabel = "Next Month";
  if (monthlySeries.length > 0) {
    const [y, m] = monthlySeries[monthlySeries.length - 1].month.split("-").map(Number);
    const d = new Date(y, m, 1); // m is 1-based, so Date(y, m, 1) is next month
    nextMonthLabel = d.toLocaleString("en-IN", { month: "short", year: "numeric" });
  }

  // ── 6. Winners vs Underperformers ("Kya Hua vs Kya Nahi Hua") ──
  const topProducts = [...productAnalytics].sort((a, b) => b.grossProfit - a.grossProfit).slice(0, 4);
  const slowOrLowMarginProducts = [...productAnalytics]
    .filter((p) => p.sellThroughPct < 55 || p.profitMarginPct < 35)
    .sort((a, b) => a.sellThroughPct - b.sellThroughPct);

  const pendingPickupCount = requests.filter((r) => r.status === "Pending").length;
  const pendingPickupKg = requests
    .filter((r) => r.status === "Pending")
    .reduce((s, r) => s + Number(r.quantity || 0), 0);

  // ── 7. AI Actionable Recommendations ───────────────────────────
  const topCat = categoryStats[0];
  const worstCat = categoryStats[categoryStats.length - 1];
  const highContamTemple = templeEfficiency[0];
  const bestFlower = flowerEfficiency[0];

  const recommendations = [];
  if (topCat) {
    recommendations.push({
      type: "profit",
      title: `Scale ${topCat.category} Production`,
      detail: `${topCat.category} generated ₹${topCat.profit.toLocaleString("en-IN")} profit (${topCat.marginPct}% margin, ${topCat.sellThroughPct}% sell-through). Prioritizing ${topCat.category} maximizes ROI per kg of flowers.`,
    });
  }
  if (idleWasteKg > 0) {
    recommendations.push({
      type: "warning",
      title: `Process ${idleWasteKg} kg Idle Segregated Flowers`,
      detail: `${idleWasteKg} kg of usable flowers are sitting in "Ready/Awaiting processing", holding back ~₹${idleWasteOpportunityINR.toLocaleString("en-IN")} in potential profit.`,
    });
  }
  if (slowOrLowMarginProducts.length > 0) {
    const worstProd = slowOrLowMarginProducts[0];
    recommendations.push({
      type: "gap",
      title: `Clear Slow-Moving Stock (${worstProd.name})`,
      detail: `${worstProd.name} only sold ${worstProd.sellThroughPct}% (${worstProd.inStock} units left, blocking ₹${worstProd.capitalBlockedInStock.toLocaleString("en-IN")} capital). Bundle it with top-selling incense packs or trim batch size.`,
    });
  }
  if (highContamTemple && highContamTemple.contaminationPct > 15) {
    recommendations.push({
      type: "segregation",
      title: `Improve Pre-Sorting at ${highContamTemple.temple}`,
      detail: `${highContamTemple.temple} has ${highContamTemple.contaminationPct}% non-floral contamination (${highContamTemple.other} kg plastic/cloth). Placing dual bins at the temple can recover ~₹${contaminationLossINR.toLocaleString("en-IN")} across all temples.`,
    });
  }
  if (bestFlower) {
    recommendations.push({
      type: "efficiency",
      title: `Highest Yield Flower: ${bestFlower.flower} (${bestFlower.yieldPct}%)`,
      detail: `${bestFlower.flower} yields ${bestFlower.yieldPct}% usable petals with minimal sorting loss compared to Mixed temple offerings.`,
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    overview: {
      templesConnected: templeCount,
      totalRequests: requests.length,
      pendingPickupCount,
      pendingPickupKg,
      totalReceivedKg,
      totalUsableKg,
      totalContaminationKg,
      usableYieldPct,
      sentToProcessingKg,
      idleWasteKg,
    },
    financials: {
      totalRevenue,
      totalCOGS,
      totalWasteProcessingCost,
      netProfit,
      profitMarginPct,
      unsoldCapitalBlocked,
      potentialStockRevenue,
      contaminationLossINR,
      idleWasteOpportunityINR,
      totalOpportunityLoss,
    },
    forecast: {
      nextMonthLabel,
      projectedWasteKg: wasteForecast.nextValue,
      wasteTrendPct: wasteForecast.trendPct,
      projectedRevenue: revenueForecast.nextValue,
      revenueTrendPct: revenueForecast.trendPct,
      projectedProfit: profitForecast.nextValue,
      profitTrendPct: profitForecast.trendPct,
    },
    monthlySeries,
    categoryStats,
    flowerEfficiency,
    templeEfficiency,
    topProducts,
    slowOrLowMarginProducts,
    recommendations,
    productAnalytics,
  };
}

/**
 * Natural Language AI Analyst (supports English & Hinglish queries).
 * Uses GEMINI_API_KEY when configured, with full deterministic AI fallback.
 */
async function answerQuestion(question) {
  const analysis = await computeFullAnalysis();
  const q = String(question || "").trim();
  const ql = q.toLowerCase();

  // Optional Gemini API upgrade if key is present in .env
  if (process.env.GEMINI_API_KEY) {
    try {
      const prompt = `You are FlowerCycle AI Profit & Sustainability Analyst. Answer the user's question clearly, concisely, and accurately using ONLY the verified database metrics below (in INR ₹ and kg). If they ask in Hinglish/Hindi, reply in friendly Hinglish; otherwise reply in English.

Live Database Analytics:
${JSON.stringify({
  financials: analysis.financials,
  overview: analysis.overview,
  forecast: analysis.forecast,
  categoryStats: analysis.categoryStats,
  topProducts: analysis.topProducts,
  slowOrLowMarginProducts: analysis.slowOrLowMarginProducts,
  templeEfficiency: analysis.templeEfficiency,
})}

User Question: ${q}`;

      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      );
      if (resp.ok) {
        const json = await resp.json();
        const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          return { answer: text, engine: "Gemini AI + Live DB", analysis };
        }
      }
    } catch (e) {
      // Fall back cleanly to deterministic AI engine
    }
  }

  // Deterministic Bilingual NLP Intent Engine
  const f = analysis.financials;
  const o = analysis.overview;
  const fc = analysis.forecast;
  const topCat = analysis.categoryStats[0];
  const worstCat = analysis.categoryStats[analysis.categoryStats.length - 1];
  const topProd = analysis.topProducts[0];
  const slowProd = analysis.slowOrLowMarginProducts[0];
  const highContam = analysis.templeEfficiency[0];

  const isHinglish = /(kitna|hua|nahi|kya|batao|kaise|kyu|kaun|sabse|zyada|kam|kahan|becho|munafa|nuksan)/i.test(ql);
  const fmt = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");

  if (/(forecast|predict|next|agla|future|aage|trend)/i.test(ql)) {
    return {
      engine: "FlowerCycle Regression AI",
      answer: isHinglish
        ? `📈 **AI Forecast (${fc.nextMonthLabel}):**\n• Expected Flower Waste: **${fc.projectedWasteKg} kg** (${fc.wasteTrendPct >= 0 ? "+" : ""}${fc.wasteTrendPct}% trend)\n• Projected Revenue: **${fmt(fc.projectedRevenue)}**\n• Projected Net Profit: **${fmt(fc.projectedProfit)}** (${fc.profitTrendPct >= 0 ? "+" : ""}${fc.profitTrendPct}% trend)\n\nLinear regression pichle 6 mahino ke waste aur sales growth par based hai.`
        : `📈 **AI Forecast for ${fc.nextMonthLabel}:**\n• Projected Flower Waste: **${fc.projectedWasteKg} kg** (${fc.wasteTrendPct >= 0 ? "+" : ""}${fc.wasteTrendPct}% trend)\n• Projected Revenue: **${fmt(fc.projectedRevenue)}**\n• Projected Net Profit: **${fmt(fc.projectedProfit)}** (${fc.profitTrendPct >= 0 ? "+" : ""}${fc.profitTrendPct}% trend)\n\nCalculated via Ordinary Least Squares (OLS) regression across your 6-month historical data.`,
      analysis,
    };
  }

  if (/(loss|nahi|gap|problem|slow|unsold|waste|idle|nuksan|kahan|stuck|pending)/i.test(ql) && !/(profit.*loss|summary)/i.test(ql)) {
    return {
      engine: "FlowerCycle Diagnostic AI",
      answer: isHinglish
        ? `⚠️ **Kya Nahi Hua / Kahan Loss & Gap Hai:**\n1. **Contamination Loss:** **${o.totalContaminationKg} kg** plastic/kapda mix waste mila, jisse lagbhag **${fmt(f.contaminationLossINR)}** ka potential profit waste hua (Sabse zyada ${highContam?.temple || "Mixed batches"} mein ${highContam?.contaminationPct || 0}%).\n2. **Idle Unprocessed Flowers:** **${o.idleWasteKg} kg** usable phool abhi processing ke liye wait kar rahe hain (~**${fmt(f.idleWasteOpportunityINR)}** opportunity gap).\n3. **Slow-Moving Stock:** **${slowProd ? slowProd.name : "Decorative items"}** sirf **${slowProd ? slowProd.sellThroughPct : 0}%** bika hai, jisme **${fmt(f.unsoldCapitalBlocked)}** capital total unsold inventory mein atka hai.`
        : `⚠️ **Losses, Bottlenecks & Unmonetized Gaps:**\n1. **Contamination Loss:** **${o.totalContaminationKg} kg** of non-floral waste (plastic/cloth) reduced usable yield to **${o.usableYieldPct}%**, causing an estimated **${fmt(f.contaminationLossINR)}** opportunity loss (highest at ${highContam?.temple || "mixed batches"}: ${highContam?.contaminationPct || 0}%).\n2. **Idle Usable Flowers:** **${o.idleWasteKg} kg** of segregated flowers are awaiting processing (~**${fmt(f.idleWasteOpportunityINR)}** unrealized value).\n3. **Slow-Moving Inventory:** ${slowProd ? `**${slowProd.name}** has only **${slowProd.sellThroughPct}%** sell-through (${slowProd.inStock} units unsold). ` : ""}Total capital tied up in unsold stock is **${fmt(f.unsoldCapitalBlocked)}**.`,
      analysis,
    };
  }

  if (/(best|top|category|product|kaun|zyada|roi|margin)/i.test(ql)) {
    return {
      engine: "FlowerCycle Profit AI",
      answer: isHinglish
        ? `🏆 **Best vs Weakest Categories & Products:**\n• **Top Category:** **${topCat?.category}** — Net Profit **${fmt(topCat?.profit)}** (${topCat?.marginPct}% margin, ${topCat?.unitsSold} units sold).\n• **Top Product:** **${topProd?.name}** — Profit **${fmt(topProd?.grossProfit)}** (${topProd?.sellThroughPct}% sold).\n• **Weakest Category:** **${worstCat?.category}** — Profit **${fmt(worstCat?.profit)}** (${worstCat?.sellThroughPct}% sell-through). Iski production kam karke Incense aur Organic colours badhana faydemand rahega.`
        : `🏆 **Top vs Underperforming Categories:**\n• **Most Profitable Category:** **${topCat?.category}** with **${fmt(topCat?.profit)}** profit (${topCat?.marginPct}% margin, ${topCat?.sellThroughPct}% sell-through).\n• **Top Product:** **${topProd?.name}** generating **${fmt(topProd?.grossProfit)}** gross profit.\n• **Slowest Category:** **${worstCat?.category}** with **${fmt(worstCat?.profit)}** profit and only **${worstCat?.sellThroughPct}%** sell-through.`,
      analysis,
    };
  }

  // Default: Comprehensive Profit & Loss + What Worked vs What Didn't Summary
  return {
    engine: "FlowerCycle AI Profit Analyst",
    answer: isHinglish
      ? `📊 **FlowerCycle Complete Profit & Loss Report:**\n\n✅ **Kitna Profit Hua (What Worked):**\n• Total Sales Revenue: **${fmt(f.totalRevenue)}**\n• Manufacturing + Waste Cost: **${fmt(f.totalCOGS + f.totalWasteProcessingCost)}**\n• **Net Realized Profit:** **${fmt(f.netProfit)}** (**${f.profitMarginPct}%** profit margin)\n• Sabse zyada kamayi **${topCat?.category}** ne di (**${fmt(topCat?.profit)}** profit).\n\n⚠️ **Kya Nahi Hua (Gaps & Potential Loss):**\n• **${o.idleWasteKg} kg** usable phool abhi process nahi hue (**${fmt(f.idleWasteOpportunityINR)}** ruka hua value)\n• **${o.totalContaminationKg} kg** plastic/kooda mix hone se **${fmt(f.contaminationLossINR)}** ka nuksan\n• Unsold inventory mein **${fmt(f.unsoldCapitalBlocked)}** capital block hai (potential revenue **${fmt(f.potentialStockRevenue)}**).\n\n🔮 **AI Prediction (${fc.nextMonthLabel}):** Agle mahine **${fmt(fc.projectedProfit)}** net profit aur **${fc.projectedWasteKg} kg** flower waste hone ka anumaan hai.`
      : `📊 **FlowerCycle AI Profit & Sustainability Summary:**\n\n✅ **Profit Earned (What Worked):**\n• Total Revenue: **${fmt(f.totalRevenue)}** | Total Costs (COGS + Processing): **${fmt(f.totalCOGS + f.totalWasteProcessingCost)}**\n• **Net Realized Profit:** **${fmt(f.netProfit)}** (**${f.profitMarginPct}%** net margin)\n• Top Category: **${topCat?.category}** (**${fmt(topCat?.profit)}** profit) | Top Product: **${topProd?.name}** (**${fmt(topProd?.grossProfit)}** profit).\n\n⚠️ **What Didn't Convert (Losses & Gaps):**\n• **${o.idleWasteKg} kg** usable flowers awaiting processing (~**${fmt(f.idleWasteOpportunityINR)}** unrealized profit)\n• **${o.totalContaminationKg} kg** non-floral contamination (~**${fmt(f.contaminationLossINR)}** opportunity loss)\n• **${fmt(f.unsoldCapitalBlocked)}** capital tied in unsold inventory (potential revenue **${fmt(f.potentialStockRevenue)}**).\n\n🔮 **Next Month AI Forecast (${fc.nextMonthLabel}):** Projected **${fc.projectedWasteKg} kg** waste, **${fmt(fc.projectedRevenue)}** revenue, and **${fmt(fc.projectedProfit)}** net profit.`,
    analysis,
  };
}

module.exports = { computeFullAnalysis, answerQuestion };
