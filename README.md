# Stock ATH & Institutional Nifty 500 Analyzer

[![Author](https://img.shields.io/badge/Developed%20By-Sourav%20Kumar%20Bhowmick-10b981.svg)](https://github.com/souravb1980)
[![License](https://img.shields.io/badge/Copyright-Sourav%20Kumar%20Bhowmick-blue.svg)](https://github.com/souravb1980)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6.svg)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8.svg)](https://tailwindcss.com/)

A institutional-grade equity analysis platform designed for Indian stock market investors and institutions (NSE/BSE). It analyzes any stock ticker alongside the benchmark index **Nifty 500 (`^CRSLDX`)**, evaluating Lifetime Price All-Time Highs (ATH), Profit After Tax (PAT) milestones, 11 fundamental parameters, and 4 quantitative technical indicators.

---

## 🌟 Key Capabilities

### 1. Stock Price & Performance Header
- **Google Finance / Market Standard Charting Block**: Clean dark visual header displaying Company Name, Ticker, Current Price in INR (₹), and All-Time High (Price, Month, Year).
- **ATH Proximity Tracker**: Identifies whether the current price is within ±7% of lifetime peak.

### 2. 11 Institutional Fundamental Criteria (Scored 0–3 each, scaled to 100)
1. **Market Cap**: Optimal tier ₹3,000–₹30,000 Cr (Score: 3), ₹30,001–₹60,000 Cr (2), ₹60,001–₹1,00,000 Cr (1), >₹1,00,000 Cr or <₹3,000 Cr (0).
2. **ROE (Return on Equity)**: >15% (3), >10% (2), >7% (1), <7% (0).
3. **PEG Ratio**: 0 to <1.0 (3), 1.0 to <1.5 (2), 1.5 to <2.0 (1), >2.0 (0).
4. **Stock P/E vs Industry P/E**: P/E < Industry (3), <1.5x (2), <2.0x (1), >2.0x (0).
5. **Debt & P/B**: D/E < 0.3 (3), 0.3–0.6 (2), 0.6–1.0 (1), >1.0 (0). Banking stocks automatically evaluated on P/B (<1.0 = 3, <2.0 = 2).
6. **Reserve Money vs Debt**: Reserves > 2x Debt (3), Reserves > Debt (2), Reserves < Debt (0).
7. **PAT / TTM Milestone**: Current PAT / TTM at All-Time High (3), Otherwise (0).
8. **Profit Growth**: Combined YoY (>25%) and QoQ (>6%) matrix (3 for both, 2 for YoY only, 1 for QoQ only, 0 for none).
9. **Value Migration**: Industry tailwind & market share expansion assessment (0–3 scale).
10. **Total Assets**: Assets at All-Time High (3), Otherwise (0).
11. **Institutional Ownership (FII + DII)**: >10% (3), 5%–10% (2), 3%–5% (1), <3% (0).

### 3. 4 Technical Criteria & Action Matrix
1. **Entry ATH Test**: Weekly close within ±7% of previous all-time high (Score: 3, else 0).
2. **Exit Filters**: Weekly close > 30-week MA and Weekly RSI > 50 (Best: 3, Better: 2, Not Good: 0).
3. **1-Year Relative Return**: Stock 365-day return > Nifty 500 by >15% (3), >5% (2), >0% (1), Lagging (0).
4. **Volume Confirmation**: Recent volume > 1.5x 20-day average (3), >1.0x (2), Below avg (0).
- **Institutional Verdict**: Actionable recommendations (**STRONG BUY**, **ACCUMULATE / HOLD**, or **CAUTION / EXIT**).

### 4. Interactive Matplotlib-Style Lifetime Visualizations
- **Figure 1 (3 Stacked Lifetime Charts)**:
  - Top: Stock closing price (₹) lifetime.
  - Middle: Cumulative percentage return (%) vs Nifty 500.
  - Bottom: Outperformance difference in percentage points (Stock % − Nifty 500 %).
- **Figure 2**: PAT history bars with highlighted All-Time High comparison.
- **Figure 3**: 1-Month performance spread against Nifty 500.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- Python 3.8+ (optional, only if running standalone Python analysis script)

### Installation
```bash
# Clone the repository
git clone https://github.com/souravb1980/stock-ath-nifty500-analyzer.git

# Navigate into project directory
cd stock-ath-nifty500-analyzer

# Install dependencies
npm install

# Start the full-stack development server
npm run dev
```

Open your browser at `http://localhost:3000`.

### Building for Production
```bash
npm run build
npm start
```

---

## 🐍 Standalone Python Script

You can also run the original standalone Python script directly from your terminal:
```bash
pip install yfinance matplotlib pandas numpy
python -c "
import yfinance as yf
# Runs identical PAT & Nifty 500 outperformance comparison
"
```
Or click the **"Download .py Script"** button inside the web app for any ticker symbol to get a pre-configured Python script.

---

## 📄 License & Copyright

**Copyright © Sourav Kumar Bhowmick. All Rights Reserved.**  
Developed by **Sourav Kumar Bhowmick** ([@souravb1980](https://github.com/souravb1980)).
