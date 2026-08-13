# Precisa.in — How It Analyses Bank Statements and Reports Results

**Research date:** August 14, 2026
**Source:** precisa.in (public website content)

---

## 1. What Precisa Is

Precisa is a cloud-based financial data analytics platform aimed at lenders (banks, NBFCs), fintechs, DSAs (loan agents), CA/forensic firms, insurers, and government departments. Its core pitch is "Democratising Risk Profiling" — turning raw bank statements (and GST returns, credit bureau reports, ITRs) into structured, actionable credit-risk data. Scale claims on the site: 1,000+ clients, 25+ countries, 850+ banks, 1,200+ statement formats, 1.5M+ statements processed, 51+ crore (510M+) transactions analysed.

It positions itself around two headline outcomes: **5x faster processing** and **8x productivity improvement** versus manual statement review.

---

## 2. The End-to-End Pipeline

Precisa describes its process in four broad stages, consistent across several product pages:

1. **Data intake** — Upload or fetch
2. **Extraction** — Parse the statement into structured data
3. **Analysis** — Classify, score, and detect anomalies
4. **Reporting** — Generate a structured, downloadable/API-deliverable output

### Stage 1: Data Intake
Two ingestion paths:
- **Manual upload**: PDF bank statements — digital, scanned, or password-protected — across savings, current, overdraft (OD), and cash credit (CC) accounts.
- **Account Aggregator (AA) integration**: India's consent-based data-sharing framework (RBI's AA ecosystem). Instead of a user uploading a document, Precisa pulls transaction data directly from the bank via an AA connector with the customer's one-time consent — reducing tampering risk because the data comes straight from the source rather than a document the customer could have edited. The site emphasizes this eliminates "risk of data manipulation fraud."

Coverage claimed: 850+ banks, 1,200+ statement/format variants, spanning Indian public/private/co-operative/payment banks plus US, Middle East, Malaysian, European, Canadian, and African banks.

### Stage 2: Extraction
Once a statement is ingested, Precisa parses it into a normalized transaction ledger (date, narration, debit/credit, running balance, etc.) regardless of the source bank's original layout — this is the "1,200+ formats" claim. For scanned/image PDFs this implies OCR-based extraction (the Custom pricing tier explicitly lists "Scanned Statements" as a feature).

### Stage 3: Analysis — this is where most of the substantive "how" lives

Precisa applies several layers of automated analysis on top of the extracted transactions:

#### a) Authenticity / document-integrity checks (fraud layer, document level)
Before trusting the transaction data at all, Precisa checks whether the statement/PDF itself has been tampered with:
- PDF **creator/producer metadata** verification (does the software that "generated" the file match what a bank would actually use?)
- **Font consistency** analysis across the whole document (edited PDFs often show font/size mismatches)
- **Date created vs. date modified** field validation
- **Balance vs. computed balance** reconciliation — i.e., checking that *opening balance + credits − debits = closing balance* for every statement period, to catch inserted/deleted transactions
- **Account number / IFSC code** consistency checks
- **Penny-drop verification** — a ₹1 test deposit to confirm the account is live and the IFSC is genuine

#### b) Transaction classification & categorization
Transactions are algorithmically tagged — income sources (salary, business deposits, rental income, dividends), and expense/obligation categories (loan EMIs, credit card payments, insurance premiums, rent, recurring bills). The site describes this as "ML driven... comprehensive categorisation of bank transactions & counterparty detection," implying a machine-learning classifier rather than pure rule-matching, layered with rule-based pattern checks.

#### c) Transaction-level fraud & anomaly detection (14+ "pre-mapped" indicators)
Explicitly listed indicators include:
- Circular transactions (money rotating between related/self-controlled accounts to inflate balances or fake business activity)
- Salary inflation / stagnant salary amounts unchanged across consecutive months
- Cash deposits made on bank holidays
- RTGS payments below the RBI minimum threshold (₹2 lakh) — a signal of structuring
- Round-figure/suspiciously clean transaction amounts
- Missing statement months / no-transaction-month gaps (used to hide low-balance or suspicious periods)
- Large debit immediately following a salary credit
- Impossible negative balances

#### d) Counterparty & fund-flow intelligence
- **FIFO (First-In-First-Out) fund tracing** — maps source-to-destination movement of money across all uploaded accounts simultaneously, used for AML-style investigation
- **Inter-bank/inter-account transfer mapping** — visualises transaction totals and date-level breakdowns between related accounts
- **Dormant account activation detection** — sudden high-value activity in a previously inactive account is flagged as a possible money-laundering signal
- **Related-party / counterparty network analysis** — identifies recurring payers/payees, salary sources, business clients, and connected entities that might need disclosure

#### e) Cash flow & behavioural analysis
- Monthly inflow/outflow, average balance, peak balance, minimum-balance-charge incidents
- OD/CC utilisation and days overdrawn
- NACH bounce / cheque return tracking (in and out)
- "Volatility Score" — a measure of how consistent/erratic inflows and outflows are over the statement period

#### f) FOIR (Fixed Obligation to Income Ratio) calculation
Precisa auto-extracts declared income streams and all recurring obligations (EMIs, credit card bills, loan interest) from the statement and computes:

**FOIR = (Total monthly obligations ÷ Total monthly income) × 100**

This is cross-checked against credit bureau data where available, explicitly to surface "hidden EMI obligations your credit bureau does not show."

### Stage 4: Reporting — the "Precisa Score" and output

All of the above rolls up into a single output packet:

- **Precisa Score**: a proprietary **0–1,000 creditworthiness rating**, generated from fraud signals, account volatility, OD/CC utilisation behaviour, transaction pattern risk, income stability, and obligation management. The site states **scores below 499 indicate a "high-risk account."**
- A **detailed irregularity/risk report** listing every flagged transaction with transaction-level evidence (amounts, counterparty, pattern description) — explicitly built to be "audit-ready" for regulatory submission.
- **Aggregated view across multiple bank accounts** — if a borrower submits several accounts, Precisa merges and cross-references them rather than analysing each in isolation.
- **Export** to Excel (standard tiers) or via API/webhook as structured JSON-style data for direct ingestion into a Loan Origination System (LOS) or Loan Management System (LMS) (higher/custom tiers), including white-labelled, custom-branded reports.
- A **CAM (Credit Appraisal Memo) report** download is available on the Custom pricing tier — i.e., the underwriting summary document lenders traditionally write by hand can be auto-generated.

---

## 3. Architecture Summary (How the Pieces Fit)

```
                ┌─────────────────────┐
Upload PDF ───▶ │   Data Intake        │ ◀─── Account Aggregator (consented,
(scanned/       │                      │       direct-from-bank fetch)
digital/        └──────────┬───────────┘
password-prot.)            │
                            ▼
                 ┌─────────────────────┐
                 │  Extraction / OCR    │  → normalizes 1,200+ bank formats
                 │  (parsing engine)    │    into one transaction schema
                 └──────────┬───────────┘
                            ▼
        ┌────────────────────────────────────────────┐
        │              Analysis Layer                  │
        │ ┌──────────────┐ ┌───────────────────────┐  │
        │ │ Doc integrity │ │ ML transaction         │  │
        │ │ checks (PDF   │ │ classification &       │  │
        │ │ metadata,     │ │ categorization         │  │
        │ │ font, balance │ └───────────────────────┘  │
        │ │ reconciliation│ ┌───────────────────────┐  │
        │ └──────────────┘ │ Fraud/anomaly rule set  │  │
        │ ┌──────────────┐ │ (14+ indicators)        │  │
        │ │ FIFO fund-flow│ └───────────────────────┘  │
        │ │ & counterparty│ ┌───────────────────────┐  │
        │ │ mapping (AML) │ │ Cash flow, volatility,  │  │
        │ └──────────────┘ │ FOIR calculation        │  │
        │                   └───────────────────────┘  │
        └────────────────────────┬─────────────────────┘
                                  ▼
                     ┌─────────────────────────┐
                     │  Reporting Layer          │
                     │  - Precisa Score (0-1000) │
                     │  - Irregularity report    │
                     │  - CAM report (custom)    │
                     │  - Excel / API / webhook  │
                     └─────────────────────────┘
```

---

## 4. Delivery Models

- **Standalone web app** (self-serve upload-and-analyse tool, "oneclick.precisa.in")
- **API/webhook integration** into a client's own LOS/LMS or lending app, for real-time decisioning without breaking the borrower's UX
- **White-labelled reports** for partners (DSAs, TSPs) who want to present the analysis under their own brand

---

## 5. Pricing Tiers (as a proxy for feature depth)

| Tier | Price | Key limits/features |
|---|---|---|
| Free Trial | ₹0 | 1 user, up to 3 accounts, 7-day access |
| Pay-per-use | ₹100/account | Up to 12 statements/account, 1 month access, Excel export |
| Pay-as-you-go | ₹14,000 prepaid | Unlimited users, 200 accounts, up to 18 statements/account, 1-year access |
| Custom | Custom | Unlimited accounts, up to 24 statements/account, scanned statements, APIs, CAM report, unlimited GSTR/Credit report analysis, AA connector |

Notably, **scanned statement support, CAM report generation, and full AA/API access are reserved for the Custom tier**, suggesting these are the more resource-intensive (likely OCR- and integration-heavy) capabilities.

---

## 6. Caveats on This Research

This report is based entirely on **Precisa's own public marketing and product pages** — there is no independent technical documentation, whitepaper, patent filing, or third-party audit publicly available to verify the underlying models (e.g., what ML architecture powers "categorisation," or how the Precisa Score is weighted). Specific claims such as "ML driven," "AI-powered," and the exact Precisa Score formula are Precisa's own descriptions and should be treated as vendor claims rather than independently verified technical facts. If you need the actual scoring methodology or model architecture, that would require the API documentation (behind login at webapp.precisa.in) or a direct vendor briefing/NDA.
