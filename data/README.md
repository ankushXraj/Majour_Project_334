# FlowerCycle Research Datasets, Sources, Assumptions & Limitations

**Last Updated:** 2026-11-27  
**Purpose:** Document every dataset, scientific parameter, market price benchmark, and cost assumption powering the FlowerCycle Smart Waste-to-Wealth Calculator and Financial Engine.

---

## 1. Kaggle & Public Dataset Investigation

We searched Kaggle and open scientific repositories (`github.com`, `zenodo.org`, `data.gov.in`) for tabular datasets on **temple flower waste**, **marigold floral recycling**, **vermicomposting yield**, and **agarbatti manufacturing economics**:

1. **Kaggle Findings:**
   - Public Kaggle repositories for *flower waste* primarily consist of **image classification datasets** (e.g., *Flower Classification*, *Oxford 102 Flowers*, *Waste Classification organic vs recyclable images*) or city-level municipal solid waste summaries (*Waste Management and Recycling in Indian Cities*).
   - **No public tabular Kaggle dataset exists** containing temple flower waste weights, moisture conditions, agarbatti/gulal conversion yields, and Indian INR profit/loss records.
2. **Downloaded Public Research Dataset (`data/raw/compost_maturity_github.csv`):**
   - **Source:** `https://github.com/hafsa-kibria/Compost-Dataset` (`Compost Data.csv`, 452 rows).
   - **Contents:** Time-series composting physicochemical readings (`Day`, `Temperature`, `MC(%)`, `pH`, `C/N Ratio`, `Ammonia(mg/kg)`, `Nitrate(mg/kg)`, `TN(%)`, `TOC(%)`, `EC(ms/cm)`, `OM(%)`, `T Value`, `GI(%)`, `Score`).
   - **Suitability & Limitation for ML:** Evaluated via `ml/evaluate_dataset.py` using `pandas` and `scikit-learn`. While suitable for predicting **compost maturity score** from lab sensor chemistry (`pH`, `C/N`, `OM%`, `GI%`), it does **not** contain flower species, agarbatti/gulal yields, or INR financial costs/revenues. Therefore, FlowerCycle uses a **validated rule-based financial engine** rather than claiming ML predictions for financial P&L.

---

## 2. Scientific & Government Conversion References

| File | Primary Sources | Units | Key Assumptions & Limitations |
| :--- | :--- | :--- | :--- |
| `data/flower_waste_dataset.csv` | **CSIR-NBRI (Lucknow)** *Pushpa Swachhata* floral-waste guidelines; **MSME / KVIC** agarbatti raw-material studies | `%`, ratio (`0–1`) | Fresh marigold/rose/jasmine flowers hold **80%–85% moisture** (15%–20% dry weight). Actual dry yield varies by season, storage humidity, and temple watering/garland soaking. |
| `data/processed/conversion_benchmarks.csv` | **CSIR-NBRI**, **MSME/KVIC** (50–60% flower powder + 15–20% jiggit + 10–20% charcoal), **ICAR / NCOF (NCONF)** 60:40 floral-to-cow-dung vermicomposting trials (51–65% feed bioconversion) | ratio, `%` | Accounts for moisture evaporation, handling rejection (2.5%–7%), processing loss (5%–10%), and mandatory co-ingredients (jiggit, charcoal, cow dung/bulking material, arrowroot/starch). |
| `data/product_prices.csv` | Indian bulk/wholesale market observations (**KVIC/NCOF** vermicompost ₹6–₹15/kg bulk; **MSME/artisan** floral agarbatti ₹250–₹550/kg wholesale; herbal gulal ₹200–₹500/kg wholesale) | `INR / kg` | **Market prices fluctuate** by region, festival season (Diwali/Holi), and retail vs bulk channels. All prices include `[min, default, max]` confidence ranges and are **estimates, not guaranteed selling prices**. |
| `data/processing_costs.csv` | Illustrative Indian cottage/SHG micro-enterprise cost structure | `INR / kg` | Assumes urban temple cluster (5–15 km haul) and small-scale solar + mechanical pulverizer setup. Labour, transport, and packaging costs must be calibrated by the admin in the dashboard for local rates. |

---

## 3. Financial Calculation Transparency Rules

1. **No Double-Counting:** Direct production costs (drying, processing, additional ingredients, packaging) and operating expenses (collection, transport, labour, other overhead) are tracked as distinct line items. Gross Profit = `Revenue - Direct Production Costs`; Net Profit = `Revenue - All Operating Expenses`; FlowerCycle Final Profit = `Net Profit - Temple Reward`.
2. **Estimated vs Actual:** Temple submission reports and simulator outputs are explicitly labelled **Estimated** until products are manufactured and sold in the Eco-Product Inventory.
3. **Configurable Parameters:** Every conversion ratio, price benchmark, operational cost, and temple reward policy can be updated by the Admin in MongoDB and is versioned with calculation history.
