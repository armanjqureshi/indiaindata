// Gold, silver and platinum rate pages. Source: India Bullion and Jewellers Association (IBJA),
// ibjarates.com: the national benchmark that RBI uses for Sovereign Gold Bonds and gold loans.
// Pure data, no imports: the scheduled job (scripts/data/update-gold.mjs) reads it too.

// fields in live/gold.json; gold and platinum are per 10 g, silver per kg (as IBJA quotes them)
export const PURITIES = [
  { key: 'g999', label: '24 carat (999)', short: '24K', carat: 24, fine: 0.999 },
  { key: 'g995', label: '24 carat (995)', short: '995', carat: 23.9, fine: 0.995 },
  { key: 'g916', label: '22 carat (916)', short: '22K', carat: 22, fine: 0.916 },
  { key: 'g750', label: '18 carat (750)', short: '18K', carat: 18, fine: 0.75 },
  { key: 'g585', label: '14 carat (585)', short: '14K', carat: 14, fine: 0.585 },
]
export const GOLD_HUB = '/gold-rate-today'
export const SILVER_HUB = '/silver-rate-today'
export const PLATINUM_PAGE = '/platinum-rate-today'
export const goldCityPath = (slug) => `${GOLD_HUB}/${slug}`
export const silverCityPath = (slug) => `${SILVER_HUB}/${slug}`

// Local units: a sovereign (pavan) is 8 g in Tamil Nadu, Kerala and Puducherry;
// a tola is 11.6638 g, still used in Punjab and Jammu.
export const UNITS = {
  sovereign: { name: 'sovereign (pavan)', grams: 8 },
  tola: { name: 'tola', grams: 11.6638 },
}

// name: how searchers write it; aka: official or other name; state; unit: local unit if any;
// silver: also gets a silver page; aqi / property: slugs of our other pages for the same city
const C = (slug, name, state, opts = {}) => ({ slug, name, state, ...opts })
export const GOLD_CITIES = [
  C('mumbai', 'Mumbai', 'Maharashtra', { silver: true, aqi: 'mumbai', property: 'mumbai' }),
  C('delhi', 'Delhi', 'Delhi', { silver: true, aqi: 'delhi', property: 'delhi' }),
  C('chennai', 'Chennai', 'Tamil Nadu', { silver: true, unit: 'sovereign', aqi: 'chennai', property: 'chennai' }),
  C('bangalore', 'Bangalore', 'Karnataka', { aka: 'Bengaluru', silver: true, aqi: 'bengaluru', property: 'bengaluru' }),
  C('hyderabad', 'Hyderabad', 'Telangana', { silver: true, aqi: 'hyderabad', property: 'hyderabad' }),
  C('kolkata', 'Kolkata', 'West Bengal', { silver: true, aqi: 'kolkata', property: 'kolkata' }),
  C('pune', 'Pune', 'Maharashtra', { silver: true, aqi: 'pune', property: 'pune' }),
  C('ahmedabad', 'Ahmedabad', 'Gujarat', { silver: true, aqi: 'ahmedabad', property: 'ahmedabad' }),
  C('kerala', 'Kerala', null, { kind: 'state', silver: true, unit: 'sovereign' }),
  C('jaipur', 'Jaipur', 'Rajasthan', { silver: true, aqi: 'jaipur', property: 'jaipur' }),
  C('lucknow', 'Lucknow', 'Uttar Pradesh', { silver: true, aqi: 'lucknow', property: 'lucknow' }),
  C('patna', 'Patna', 'Bihar', { silver: true, aqi: 'patna', property: 'patna' }),
  C('coimbatore', 'Coimbatore', 'Tamil Nadu', { silver: true, unit: 'sovereign', aqi: 'coimbatore', property: 'coimbatore' }),
  C('vijayawada', 'Vijayawada', 'Andhra Pradesh', { silver: true, aqi: 'vijayawada', property: 'vijayawada' }),
  C('punjab', 'Punjab', null, { kind: 'state', unit: 'tola' }),
  C('ranchi', 'Ranchi', 'Jharkhand', { property: 'ranchi' }),
  C('karnataka', 'Karnataka', null, { kind: 'state' }),
  C('mangalore', 'Mangalore', 'Karnataka', { aka: 'Mangaluru', aqi: 'mangalore' }),
  C('bhubaneswar', 'Bhubaneswar', 'Odisha', { aqi: 'bhubaneswar', property: 'bhubaneswar' }),
  C('kanpur', 'Kanpur', 'Uttar Pradesh', { aqi: 'kanpur', property: 'kanpur' }),
  C('nagpur', 'Nagpur', 'Maharashtra', { aqi: 'nagpur', property: 'nagpur' }),
  C('chandigarh', 'Chandigarh', 'Chandigarh', { unit: 'tola', aqi: 'chandigarh', property: 'chandigarh' }),
  C('mysore', 'Mysore', 'Karnataka', { aka: 'Mysuru', aqi: 'mysuru' }),
  C('surat', 'Surat', 'Gujarat', { aqi: 'surat', property: 'surat' }),
  C('indore', 'Indore', 'Madhya Pradesh', { aqi: 'indore', property: 'indore' }),
  C('nashik', 'Nashik', 'Maharashtra', { aqi: 'nashik', property: 'nashik' }),
  C('kochi', 'Kochi', 'Kerala', { unit: 'sovereign', property: 'kochi' }),
  C('amritsar', 'Amritsar', 'Punjab', { unit: 'tola', aqi: 'amritsar' }),
  C('jammu', 'Jammu', 'Jammu and Kashmir', { unit: 'tola' }),
  C('aurangabad', 'Aurangabad', 'Maharashtra', { aka: 'Chhatrapati Sambhajinagar', aqi: 'aurangabad-maharashtra' }),
  C('thrissur', 'Thrissur', 'Kerala', { unit: 'sovereign', aqi: 'thrissur' }),
  C('varanasi', 'Varanasi', 'Uttar Pradesh', { aqi: 'varanasi' }),
  C('meerut', 'Meerut', 'Uttar Pradesh', { aqi: 'meerut', property: 'meerut' }),
  C('gurgaon', 'Gurgaon', 'Haryana', { aka: 'Gurugram', aqi: 'gurugram', property: 'gurugram' }),
  C('raipur', 'Raipur', 'Chhattisgarh', { aqi: 'raipur', property: 'raipur' }),
  C('ludhiana', 'Ludhiana', 'Punjab', { unit: 'tola', aqi: 'ludhiana', property: 'ludhiana' }),
  C('salem', 'Salem', 'Tamil Nadu', { unit: 'sovereign', aqi: 'salem' }),
  C('dehradun', 'Dehradun', 'Uttarakhand', { aqi: 'dehradun', property: 'dehradun' }),
  C('siliguri', 'Siliguri', 'West Bengal', { aqi: 'siliguri' }),
  C('jodhpur', 'Jodhpur', 'Rajasthan', { aqi: 'jodhpur' }),
  C('guntur', 'Guntur', 'Andhra Pradesh', { aqi: 'guntur' }),
  C('erode', 'Erode', 'Tamil Nadu', { unit: 'sovereign' }),
  C('madurai', 'Madurai', 'Tamil Nadu', { unit: 'sovereign', aqi: 'madurai' }),
  C('visakhapatnam', 'Visakhapatnam', 'Andhra Pradesh', { aka: 'Vizag', aqi: 'visakhapatnam', property: 'visakhapatnam' }),
  C('vadodara', 'Vadodara', 'Gujarat', { aqi: 'vadodara', property: 'vadodara' }),
  C('bhopal', 'Bhopal', 'Madhya Pradesh', { aqi: 'bhopal', property: 'bhopal' }),
  C('trivandrum', 'Trivandrum', 'Kerala', { aka: 'Thiruvananthapuram', unit: 'sovereign', aqi: 'thiruvananthapuram', property: 'thiruvananthapuram' }),
  C('trichy', 'Trichy', 'Tamil Nadu', { aka: 'Tiruchirappalli', unit: 'sovereign', aqi: 'tiruchirappalli' }),
  C('hubli', 'Hubli', 'Karnataka', { aka: 'Hubballi', aqi: 'hubballi' }),
  C('vellore', 'Vellore', 'Tamil Nadu', { unit: 'sovereign', aqi: 'vellore' }),
  C('tirunelveli', 'Tirunelveli', 'Tamil Nadu', { unit: 'sovereign', aqi: 'tirunelveli' }),
  C('gorakhpur', 'Gorakhpur', 'Uttar Pradesh', { aqi: 'gorakhpur' }),
  C('nellore', 'Nellore', 'Andhra Pradesh', { aqi: 'nellore' }),
  C('kolhapur', 'Kolhapur', 'Maharashtra', { aqi: 'kolhapur' }),
  C('udaipur', 'Udaipur', 'Rajasthan', { aqi: 'udaipur' }),
  C('agra', 'Agra', 'Uttar Pradesh', { aqi: 'agra' }),
  C('guwahati', 'Guwahati', 'Assam', { aqi: 'guwahati', property: 'guwahati' }),
  C('puducherry', 'Puducherry', 'Puducherry', { aka: 'Pondicherry', unit: 'sovereign', aqi: 'puducherry' }),
  C('tirupati', 'Tirupati', 'Andhra Pradesh', { aqi: 'tirupati' }),
  C('rajkot', 'Rajkot', 'Gujarat', { aqi: 'rajkot', property: 'rajkot' }),
  C('noida', 'Noida', 'Uttar Pradesh', { aqi: 'noida', property: 'noida' }),
]
export const goldCity = Object.fromEntries(GOLD_CITIES.map((c) => [c.slug, c]))
