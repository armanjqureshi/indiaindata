// Mandi (wholesale market) price pages. Source: Agmarknet via data.gov.in,
// Directorate of Marketing and Inspection, Ministry of Agriculture and Farmers Welfare.
// Pure data, no imports: the scheduled job (scripts/data/update-mandi.mjs) reads it too.

// api = exact commodity name in the data.gov.in dataset
export const MANDI_COMMODITIES = [
  { slug: 'onion', api: 'Onion', name: 'Onion', lower: 'onion', kg: 'onion' },
  { slug: 'tomato', api: 'Tomato', name: 'Tomato', lower: 'tomato' },
  { slug: 'potato', api: 'Potato', name: 'Potato', lower: 'potato' },
  { slug: 'garlic', api: 'Garlic', name: 'Garlic', lower: 'garlic' },
  { slug: 'ginger', api: 'Ginger(Green)', name: 'Ginger', lower: 'ginger' },
  { slug: 'green-chilli', api: 'Green Chilli', name: 'Green chilli', lower: 'green chilli' },
  { slug: 'cauliflower', api: 'Cauliflower', name: 'Cauliflower', lower: 'cauliflower' },
  { slug: 'cabbage', api: 'Cabbage', name: 'Cabbage', lower: 'cabbage' },
  { slug: 'brinjal', api: 'Brinjal', name: 'Brinjal', lower: 'brinjal' },
  { slug: 'bhindi', api: 'Bhindi(Ladies Finger)', name: 'Bhindi', lower: 'bhindi (lady finger)' },
  { slug: 'carrot', api: 'Carrot', name: 'Carrot', lower: 'carrot' },
  { slug: 'capsicum', api: 'Capsicum', name: 'Capsicum', lower: 'capsicum' },
  { slug: 'wheat', api: 'Wheat', name: 'Wheat', lower: 'wheat' },
  { slug: 'gram', api: 'Bengal Gram(Gram)(Whole)', name: 'Chana (whole gram)', lower: 'chana (whole bengal gram)' },
  { slug: 'tur', api: 'Red gram/Arhar/Tur(whole)', name: 'Tur (whole arhar)', lower: 'tur (whole arhar)' },
]

// State names as the dataset spells them -> how we show them
export const MANDI_STATE_NAMES = {
  Keralam: 'Kerala',
  Chattisgarh: 'Chhattisgarh',
  Pondicherry: 'Puducherry',
  'NCT of Delhi': 'Delhi',
  'Andaman and Nicobar': 'Andaman and Nicobar Islands',
}
export const stateLabel = (s) => MANDI_STATE_NAMES[s] || s
export const stateSlug = (s) =>
  stateLabel(s).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export const MANDI_HUB = { path: '/mandi-prices-today', title: 'Mandi prices today' }
export const mandiPath = (c, state) => `/mandi-price/${c.slug}${state ? '/' + stateSlug(state) : ''}`
export const bySlug = Object.fromEntries(MANDI_COMMODITIES.map((c) => [c.slug, c]))
