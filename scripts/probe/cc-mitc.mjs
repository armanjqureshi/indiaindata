// One-off probe: download credit card MITC / schedule-of-charges documents from issuers' own sites
// so rates can be read from the primary text. Saves to data/raw/cc/ (pdf, html and pdftotext output).
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
const DIR = 'data/raw/cc'
fs.mkdirSync(DIR, { recursive: true })
const DOCS = {
  hdfc: 'https://www.hdfc.bank.in/content/dam/hdfcbankpws/in/en/personal-banking/discover-products/cards/mitc-1-64.pdf',
  sbi_pdf: 'https://www.sbicard.com/sbi-card-en/assets/docs/pdf/most-important-terms-and-conditions/english-mitc.pdf',
  sbi_page: 'https://www.sbicard.com/en/most-important-terms-and-conditions.page',
  sbi_rates: 'https://www.sbicard.com/en/personal/rates-and-fees.page',
  icici_amazon: 'https://www.icici.bank.in/terms-condition/tnc-for-amazon-pay',
  icici_blog: 'https://www.icici.bank.in/blogs/credit-card/interest-rates',
  axis_faq: 'https://www.axisbank.com/docs/default-source/default-document-library/credit-cards/faqs-for-credit-card.pdf',
  axis_soc: 'https://www.axis.bank.in/docs/default-source/default-document-library/mitc_schedule-of-charges.pdf',
  axis_lic: 'https://www.axisbank.com/retail/cards/credit-card/lic-axis-bank-platinum-credit-card/fees-charges',
  kotak_fortune: 'https://www.kotak.bank.in/content/dam/Kotak/Customer-Service/others/key-fact-statement-fortune-credit-card.pdf',
  kotak_811: 'https://www.kotak.bank.in/content/dam/Kotak/files/key-fact-statement/key-fact-statement-kfs-kotak-811-super-money-creditcard.pdf',
  idfc: 'https://www.idfcfirst.bank.in/MITC.pdf',
  idfc_apr: 'https://www.idfcfirst.bank.in/credit-card/apr-faq',
  indusind: 'https://www.indusind.bank.in/content/dam/indusind-corporate/schedule-of-charges/credit-cards/MITC_Premium.pdf',
  rbl_soc: 'https://webassets.rbl.bank.in/document/Credit%20Cards/CardsScheduleCharges.pdf',
  rbl_kfs499: 'https://webassets.rbl.bank.in/document/credit-cards/kfs-499.pdf',
  bob_jan26: 'https://media.bobcard.co.in//media/gaudahay/bob_mitc_a4-booklet_ver-19jan26_15jan2026.pdf',
  bob_apr26: 'https://media.bobcard.co.in//media/gaudahay/bobcard-generic_mitc_4x8_ver-20_06apr26.pdf',
  au_soc: 'https://www.au.bank.in/content/dam/aubank/in/en/pdf/credit-card/Schedule-of-Charges-CC.pdf',
  hsbc: 'https://hsbc.co.in/content/dam/hsbc/in/documents/help/forms/mitc-t1.pdf',
  amex_soc: 'https://www.americanexpress.com/content/dam/amex/in/legal-disclosures/Schedule-of-Fee-and-Charges.pdf',
  amex_fees: 'https://www.americanexpress.com/in/credit-know-how/credit-card-fees/',
  yes_mitc: 'https://www.yes.bank.in/pdf/mitc_credit_cards_english.pdf',
  yes_mitc2: 'https://www.yesbank.in/pdf/mitc_credit_cards_english.pdf',
  sc_mitc: 'https://av.sc.com/in/content/docs/in-mitc-credit-cards.pdf',
  federal_kfs: 'https://www.federal.bank.in/documents/10180/0/MITC-credit-card.pdf',
  rbi_md_amend: 'https://website.rbi.org.in/documents/87730/39710850/1.+Circular+-++Amendment+to+MD.pdf',
  rbi_notif: 'https://rbi.org.in/Scripts/NotificationUser.aspx?Id=12620',
}
const out = { runAt: new Date().toISOString(), items: {} }
for (const [key, url] of Object.entries(DOCS)) {
  try {
    const r = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(60000), headers: { 'User-Agent': UA, Accept: '*/*' } })
    const buf = Buffer.from(await r.arrayBuffer())
    const isPdf = buf.subarray(0, 4).toString() === '%PDF'
    const ext = isPdf ? 'pdf' : 'html'
    fs.writeFileSync(`${DIR}/${key}.${ext}`, buf)
    let chars = null
    if (isPdf) {
      try {
        const txt = execFileSync('pdftotext', ['-layout', `${DIR}/${key}.pdf`, '-'], { encoding: 'utf8', maxBuffer: 64e6 })
        fs.writeFileSync(`${DIR}/${key}.txt`, txt)
        chars = txt.length
      } catch (e) { chars = `pdftotext failed: ${e.message.slice(0, 80)}` }
    }
    out.items[key] = { url, status: r.status, finalUrl: r.url, type: r.headers.get('content-type'), lastModified: r.headers.get('last-modified'), bytes: buf.length, isPdf, chars }
  } catch (e) { out.items[key] = { url, error: String(e.cause?.code || e.message) } }
  console.log(key, JSON.stringify(out.items[key]).slice(0, 220))
}
fs.mkdirSync('live/debug', { recursive: true })
fs.writeFileSync('live/debug/cc-probe.json', JSON.stringify(out, null, 1))
