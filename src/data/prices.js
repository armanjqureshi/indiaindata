// Kitchen staples tracked from the Department of Consumer Affairs (Price Monitoring Division).
// `doca` is the commodity name exactly as the department publishes it (the key in live/prices.json).
// Retail prices are all-India averages in ₹ per kg (milk ₹ per litre); wholesale in ₹ per quintal.
// The department's "additional commodities" use mixed units it does not state on the page, so they are left out.
export const PRICE_GROUPS = [
  { key: 'veg', name: 'Vegetables' },
  { key: 'grains', name: 'Grains and atta' },
  { key: 'pulses', name: 'Dals' },
  { key: 'oils', name: 'Edible oils' },
  { key: 'other', name: 'Sugar, milk and other staples' },
]

export const STAPLES = [
  { doca: 'Tomato', name: 'Tomato', group: 'veg', path: '/tomato-price-today' },
  { doca: 'Onion', name: 'Onion', group: 'veg', path: '/onion-price-today' },
  { doca: 'Potato', name: 'Potato', group: 'veg', path: '/potato-price-today' },
  { doca: 'Rice', name: 'Rice', group: 'grains', path: '/rice-price-today' },
  { doca: 'Wheat', name: 'Wheat', group: 'grains' },
  { doca: 'Atta (Wheat)', name: 'Atta (wheat flour)', short: 'Atta', group: 'grains', path: '/atta-price' },
  { doca: 'Broken Rice', name: 'Broken rice', group: 'grains' },
  { doca: 'Tur/Arhar Dal', name: 'Tur (arhar) dal', short: 'Tur dal', group: 'pulses', path: '/tur-dal-price' },
  { doca: 'Gram Dal', name: 'Gram (chana) dal', group: 'pulses' },
  { doca: 'Urad Dal', name: 'Urad dal', group: 'pulses' },
  { doca: 'Moong Dal', name: 'Moong dal', group: 'pulses' },
  { doca: 'Masoor Dal', name: 'Masoor dal', group: 'pulses' },
  { doca: 'Mustard Oil (Packed)', name: 'Mustard oil, packed', group: 'oils', oil: true },
  { doca: 'Groundnut Oil (Packed)', name: 'Groundnut oil, packed', group: 'oils', oil: true },
  { doca: 'Sunflower Oil (Packed)', name: 'Sunflower oil, packed', group: 'oils', oil: true },
  { doca: 'Soya Oil (Packed)', name: 'Soya oil, packed', group: 'oils', oil: true },
  { doca: 'Palm Oil (Packed)', name: 'Palm oil, packed', group: 'oils', oil: true },
  { doca: 'Vanaspati (Packed)', name: 'Vanaspati, packed', group: 'oils', oil: true },
  { doca: 'Sugar', name: 'Sugar', group: 'other', path: '/sugar-price-today' },
  { doca: 'Milk @', name: 'Milk', group: 'other', path: '/milk-price-today', perLitre: true },
  { doca: 'Gur', name: 'Gur (jaggery)', group: 'other' },
  { doca: 'Tea Loose', name: 'Tea, loose', group: 'other' },
  { doca: 'Salt Pack (Iodised)', name: 'Salt, iodised packet', group: 'other' },
]
export const unitOf = (s) => (s.perLitre ? 'litre' : 'kg')

// One page per item people search for, plus a combined edible-oil page and the hub.
export const PRICE_PAGES = [
  { path: '/tomato-price-today', doca: 'Tomato', title: 'Tomato price today in India', h1: 'Tomato price today' },
  { path: '/onion-price-today', doca: 'Onion', title: 'Onion price today in India', h1: 'Onion price today' },
  { path: '/potato-price-today', doca: 'Potato', title: 'Potato price today in India', h1: 'Potato price today' },
  { path: '/tur-dal-price', doca: 'Tur/Arhar Dal', title: 'Tur dal price today in India', h1: 'Tur dal price today' },
  { path: '/atta-price', doca: 'Atta (Wheat)', title: 'Atta price today in India', h1: 'Atta price today' },
  { path: '/rice-price-today', doca: 'Rice', title: 'Rice price today in India', h1: 'Rice price today' },
  { path: '/sugar-price-today', doca: 'Sugar', title: 'Sugar price today in India', h1: 'Sugar price today' },
  { path: '/milk-price-today', doca: 'Milk @', title: 'Milk price today in India', h1: 'Milk price today' },
]
export const OIL_PAGE = { path: '/edible-oil-price-today', title: 'Edible oil price today in India', h1: 'Edible oil prices today' }
export const PRICES_HUB = { path: '/food-prices-today', title: 'Food prices today in India: vegetables, dal, atta, oil and milk', h1: 'Food prices today' }
