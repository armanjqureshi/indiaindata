// Credit card charges of 12 issuers, read from each issuer's own published terms (MITC, key fact
// statement or schedule of charges). Pure data, no imports: scripts/routes.mjs reads it too.
// Raw copies of the documents are in data/raw/cc/. Checked on CHECKED.
// Rates are per month before 18% GST. "pa" is the monthly rate times 12, as most issuers quote it.

export const CHECKED = '2026-11-17'
export const CC_HUB = '/credit-card-charges'
export const ccPath = (slug) => `${CC_HUB}/${slug}`
export const GST = 0.18

// late fee slabs [from, to, fee]; to = null for "and above"
const STD = [[0, 100, 0], [101, 500, 100], [501, 1000, 500], [1001, 5000, 600], [5001, 10000, 750], [10001, 25000, 900], [25001, 50000, 1100], [50001, null, 1300]]

// minimum due rules used for the repayment model: P = principal owed, I = interest, G = GST on interest
// (all fees and EMIs are zero in the model)
export const MAD_RULES = {
  hdfc: (P, I, G) => Math.ceil((0.05 * (P + I) + G) / 10) * 10,
  icici: (P, I, G) => Math.max(0.05 * (P + I), I) + G,
  rbl: (P, I, G) => G + Math.max(0.05 * (P + I), 200),
  sbi: (P, I, G) => I + G + Math.max(0.02 * P, 200),
  bob: (P, I, G) => Math.max(I + G + 0.02 * P, 200),
  two: (P, I, G) => Math.max(I + G + 0.02 * P, 100),
  kotak: (P, I, G) => Math.max(I + G + 0.01 * P, 100),
  hsbc: (P, I, G) => Math.max(I + G + 0.01 * P, 100),
  au: (P, I, G, month) => I + G + (month === 1 ? 0.05 : 0.02) * P,
}

const I = (o) => o
export const ISSUERS = [
  I({
    slug: 'hdfc-bank', name: 'HDFC Bank', short: 'HDFC', rate: 3.75,
    variants: [['Infinia, Infinia Metal, Diners Club Black, Diners Black Metal, BizBlack Metal, H.O.G Diners Club', 1.99], ['Cards issued against a fixed deposit', 1.99], ['All other cards', 3.75]],
    late: { slabs: STD }, cash: { pct: 2.5, min: 500, label: '2.5%, min ₹500', note: 'Infinia and Infinia Metal Edition cards are excluded from this fee.' },
    ifp: '20 to 50 days',
    mad: { rule: 'hdfc', text: '5% of the retail and cash balance and finance charges, plus 100% of fees, charges, EMIs and taxes, rounded up to the next ₹10.' },
    since: 'HDFC Bank moved most cards to 3.75% a month from 1 August 2024.',
    sources: [['HDFC Bank, key fact statement and MITC for credit cards, version 2.3 (October 2024)', 'https://www.hdfc.bank.in/content/dam/hdfcbankpws/in/en/personal-banking/discover-products/cards/mitc-1-64.pdf']],
  }),
  I({
    slug: 'sbi-card', name: 'SBI Card', short: 'SBI', rate: 3.75, upTo: true,
    variants: [['Unsecured cards', 3.75], ['Shaurya, Defence and secured cards', 2.75]],
    late: { slabs: [[0, 100, 0], [101, 500, 100], [501, 1000, 500], [1001, 10000, 750], [10001, 25000, 950], [25001, 50000, 1100], [50001, null, 1300]] },
    lateExtra: 'An extra ₹100 is charged for every cycle once the minimum due has been missed for two cycles in a row, until it is paid.',
    cash: { pct: 2.5, min: 500, label: '2.5%, min ₹500' }, ifp: '20 to 50 days', minFinance: 'Minimum finance charge ₹25.',
    mad: { rule: 'sbi', text: '100% of GST, EMIs, fees and charges, finance charges and any amount over the limit, plus 2% of the remaining balance (at least ₹200).' },
    madExample: 'SBI Card’s own terms say that ₹10,000 paid off at the minimum due takes up to 52 months.',
    sources: [['SBI Card, most important terms and conditions', 'https://www.sbicard.com/en/most-important-terms-and-conditions.page']],
  }),
  I({
    slug: 'icici-bank', name: 'ICICI Bank', short: 'ICICI', rate: 3.75,
    defaultRate: 'In case of default the rate can rise to a maximum of 3.8% a month (46% a year).',
    late: { slabs: STD, basis: 'Total amount due minus any payment made before the due date' },
    cash: { pct: 2.5, min: 500, label: '2.5%, min ₹500' }, ifp: '18 to 48 days',
    mad: { rule: 'icici', text: '5% of finance charges, retail spends and cash advances, or 100% of finance charges if that is higher, plus fees, taxes, EMIs and any overdue minimum.' },
    since: 'ICICI Bank’s 3.75% rate has applied since 15 November 2024.',
    sources: [['ICICI Bank, MITC for credit cards (Amazon Pay ICICI Bank card), last updated 10 July 2026', 'https://www.icici.bank.in/terms-condition/tnc-for-amazon-pay']],
  }),
  I({
    slug: 'axis-bank', name: 'Axis Bank', short: 'Axis', rate: 3.75, quotedPa: 55.55,
    variants: [['Most cards, including Flipkart, Airtel, ACE, MY Zone, Select, Atlas, IndianOil and IndiGo cards', 3.75], ['Reserve, Magnus, Magnus for Burgundy and Olympus', 3.0], ['Secured and Easy cards', 3.4], ['Burgundy Private', 1.5]],
    late: { slabs: [[0, 500, 0], [501, 5000, 500], [5001, 10000, 750], [10001, 50000, 1200], [50001, null, 1300]] },
    lateExtra: 'An extra ₹100 is charged for every cycle once the minimum due has been missed for two cycles in a row, until it is paid.',
    cash: { pct: 2.5, min: 500, label: '2.5%, min ₹500', note: 'Waived on Burgundy Private, Reserve and Magnus cards; 2% (min ₹300) on Olympus.' },
    ifp: '20 to 50 days',
    mad: { rule: 'two', text: 'All EMIs, fees, interest, taxes and any amount over the limit, plus 2% of the remaining balance, subject to a minimum of ₹100.' },
    madExample: 'Axis Bank’s terms say that ₹5,000 paid off at the minimum due takes up to about seven years.',
    since: 'Axis Bank raised most cards from 3.6% to 3.75% a month on 20 December 2024.',
    sources: [['Axis Bank, MITC for credit cards (finance charges effective 20 December 2024)', 'https://www.axisbank.com/docs/default-source/default-document-library/mitc-credit-cards.pdf'], ['Axis Bank, LIC Axis Bank Platinum card fees and charges', 'https://www.axis.bank.in/cards/credit-card/lic-axis-bank-platinum-credit-card']],
  }),
  I({
    slug: 'kotak-mahindra-bank', name: 'Kotak Mahindra Bank', short: 'Kotak', rate: 3.75,
    variants: [['Fortune credit card', 3.75], ['Kotak811 Super Money credit card', 3.5]],
    late: { slabs: STD }, cash: { pct: 2.5, min: 500, label: '2.5%, min ₹500' }, ifp: 'Up to 51 days',
    mad: { rule: 'kotak', text: '1% of purchases and cash advances, plus 100% of EMIs, finance charges, fees and taxes, at least ₹100.' },
    sources: [['Kotak Mahindra Bank, key fact statement, Fortune credit card', 'https://www.kotak.bank.in/content/dam/Kotak/Customer-Service/others/key-fact-statement-fortune-credit-card.pdf'], ['Kotak Mahindra Bank, key fact statement, Kotak811 Super Money credit card', 'https://www.kotak.bank.in/content/dam/Kotak/files/key-fact-statement/key-fact-statement-kfs-kotak-811-super-money-creditcard.pdf']],
  }),
  I({
    slug: 'bobcard', name: 'BOBCARD', short: 'BOB', aka: 'Bank of Baroda', rate: 3.75,
    variants: [['Eterna and Tiara', 3.25], ['All other cards', 3.75]],
    late: { slabs: [[0, 99, 0], [100, 500, 100], [501, 1000, 400], [1001, 10000, 750], [10001, 25000, 950], [25001, 50000, 1100], [50001, null, 1300]] },
    cash: { pct: 2.5, min: 500, label: '2.5%, min ₹500' }, ifp: '20 to 50 days',
    mad: { rule: 'bob', text: '100% of fees, charges, finance charges, GST and EMIs, plus 2% of retail spends and cash advances, or ₹200 if that is higher.' },
    sources: [['BOBCARD, generic MITC version 1.9 (January 2026)', 'https://media.bobcard.co.in//media/gaudahay/bob_mitc_a4-booklet_ver-19jan26_15jan2026.pdf']],
  }),
  I({
    slug: 'au-small-finance-bank', name: 'AU Small Finance Bank', short: 'AU', rate: 3.75,
    variants: [['All retail cards', 3.75], ['AU CA and AU CS', 2.99], ['Zenith+', 1.99]],
    late: { pct: 15, min: 10, max: 1300, basis: 'Total amount due' },
    cash: { pct: 2.5, min: 500, label: '2.5%, min ₹500' }, ifp: 'Up to 50 days',
    mad: { rule: 'au', text: '5% of principal if the previous bill was paid in full, otherwise 2%, plus 100% of fees, interest, EMIs, any annual fee and GST.' },
    sources: [['AU Small Finance Bank, key fact statement and schedule of charges for credit cards, updated 2 November 2026', 'https://www.au.bank.in/pdf/credit-card/Schedule-of-Charges-CC.pdf']],
  }),
  I({
    slug: 'hsbc', name: 'HSBC', short: 'HSBC', rate: 3.75,
    variants: [['Platinum, Cashback/Live+ and TravelOne', 3.75], ['Smart Value (set for each customer)', '1.99% to 3.49%']],
    late: { mpd: true, min: 250, max: 1200 },
    cash: { pct: 2.5, min: 500, label: '2.5%, min ₹500' }, ifp: 'Up to 48 days (45 on Cashback/Live+ and TravelOne)',
    mad: { rule: 'hsbc', text: 'The higher of ₹100 or the sum of all interest, fees and taxes, EMIs, any past-due or over-limit amount, and 1% of the statement balance.' },
    sources: [['HSBC India, important terms and conditions for credit cards', 'https://www.hsbc.co.in/content/dam/hsbc/in/documents/help/forms/mitc-t1.pdf']],
  }),
  I({
    slug: 'indusind-bank', name: 'IndusInd Bank', short: 'IndusInd', rate: 3.95, rateLow: 3.83, rangeLabel: 'most cards', paQuoted: [46, 47.4],
    variants: [['Platinum Aura, Platinum Aura Edge, ePay American Express, Platinum, Platinum RuPay, Legend, Platinum Select, Samman, CRED IndusInd Bank RuPay, Jio-bp Mobility+', 3.95], ['EazyDiner Signature, EazyDiner Platinum, Nexxt, Pinnacle, Pioneer Legacy, Indus Solitaire, Iconia, Duo, Poonawalla Fincorp eLITE RuPay', 3.83], ['Tiger', 3.5], ['Avios Visa Infinite', 3.0], ['Pioneer Heritage, Celesta, Crest', 2.99], ['Club Vistara Explorer', 2.85], ['Pioneer Private', 2.0], ['Indulge', 1.79]],
    late: { slabs: STD, from: '15 June 2026' },
    cash: { pct: 2.5, min: 300, label: '2.5%, min ₹300' },
    mad: { rule: 'two', text: '100% of EMIs, GST, fees and charges, finance charges and any amount over the limit, plus 2% of retail spends, cash advances and the remaining balance.' },
    sources: [['IndusInd Bank, MITC for credit cards (late payment charges effective 15 June 2026)', 'https://www.indusind.bank.in/content/dam/indusind-corporate/schedule-of-charges/credit-cards/MITC_Premium.pdf']],
  }),
  I({
    slug: 'rbl-bank', name: 'RBL Bank', short: 'RBL', rate: 3.99, rateLow: 3.35, rangeLabel: 'set by credit score',
    variants: [['Bureau score above 775', 3.35], ['Bureau score 725 to 775', 3.85], ['Bureau score below 725', 3.99]],
    variantNote: 'Score bands from the key fact statement of RBL Bank’s ₹499-a-year card; RBL’s schedule of charges puts all cards at up to 3.99% a month.',
    late: { pct: 12.5, min: 5, max: 1300, basis: 'Outstanding amount' },
    cash: { pct: 2.5, min: 500, label: '2.5%, min ₹500' }, ifp: 'Up to 50 days',
    mad: { rule: 'rbl', text: 'All GST, EMIs, fees and charges, plus 5% of retail spends, cash advances and interest (at least ₹200), plus any unpaid minimum and over-limit amount.' },
    sources: [['RBL Bank, schedule of charges for credit cards', 'https://webassets.rbl.bank.in/document/Credit%20Cards/CardsScheduleCharges.pdf'], ['RBL Bank, key fact statement (₹499 card)', 'https://webassets.rbl.bank.in/document/credit-cards/kfs-499.pdf']],
  }),
  I({
    slug: 'idfc-first-bank', name: 'IDFC FIRST Bank', short: 'IDFC FIRST', rate: 3.85, rateLow: 0.71, rangeLabel: 'set for each customer', paQuoted: [8.5, 46.2],
    defaultRate: 'If the minimum due is not paid, 3.99% a month (47.88% a year) applies until it is.',
    late: { pct: 15, min: 100, max: 1300, basis: 'Total amount due on the previous statement minus payments made before the due date' },
    cash: { flat: 199, label: '₹199 flat' }, ifp: 'Up to 45 days',
    mad: { rule: 'two', text: 'EMIs, interest, fees, other charges and taxes and any amount over the limit, plus 2% of the principal balance (purchases, cash and balance transfers).' },
    sources: [['IDFC FIRST Bank, MITC for credit cards (October 2026)', 'https://www.idfcfirst.bank.in/MITC.pdf'], ['IDFC FIRST Bank, dynamic APR', 'https://www.idfcfirst.bank.in/credit-card/apr-faq']],
  }),
  I({
    slug: 'american-express', name: 'American Express', short: 'Amex', rate: 3.5,
    defaultRate: 'The rate rises to 3.99% a month (47.88% a year) for 12 months if the minimum due is missed twice in 12 months (three times on the Platinum Reserve and Platinum Travel cards).',
    late: { slabs: [[0, 500, 0], [501, 5000, 500], [5001, 10000, 750], [10001, 25000, 900], [25001, 50000, 1100], [50001, null, 1250]] },
    cash: { pct: 3.5, min: 250, label: '3.5%, min ₹250', note: 'American Express has suspended cash withdrawals in India; the fee applies abroad.' },
    ifp: 'Up to 48 days',
    madExample: 'American Express’s terms say that ₹5,000 paid off at the minimum due (at least ₹100 a month) takes up to 44 months at 3.5% a month.',
    sources: [['American Express, MITC for credit cards, updated 15 November 2026', 'https://www.americanexpress.com/content/dam/amex/in/legal/mitc/Lending_MITC_English.pdf'], ['American Express, key fact statement, updated 15 November 2026', 'https://www.americanexpress.com/content/dam/amex/in/legal/mitc/key_fact_Statement.pdf']],
  }),
]
export const issuer = Object.fromEntries(ISSUERS.map((x) => [x.slug, x]))
export const lateMax = (x) => (x.late.slabs ? x.late.slabs[x.late.slabs.length - 1][2] : x.late.max)
