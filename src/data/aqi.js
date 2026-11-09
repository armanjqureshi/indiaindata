// Air quality index pages. Source: Central Pollution Control Board (CPCB) daily AQI bulletin,
// 4 pm, average of the past 24 hours, one figure per city.
// Pure data, no imports: the scheduled job (scripts/data/update-aqi.mjs) reads it too.

// CPCB's AQI categories and the health statement printed on every bulletin
export const AQI_CATS = [
  { name: 'Good', min: 0, max: 50, color: '#3ba55c', ink: '#0b2914', health: 'Minimal impact' },
  { name: 'Satisfactory', min: 51, max: 100, color: '#9bc53d', ink: '#1d2a06', health: 'Minor breathing discomfort to sensitive people' },
  { name: 'Moderate', min: 101, max: 200, color: '#e8c547', ink: '#2e2504', health: 'Breathing discomfort to people with lung disease, asthma and heart disease' },
  { name: 'Poor', min: 201, max: 300, color: '#f08a24', ink: '#2e1500', health: 'Breathing discomfort to most people on prolonged exposure' },
  { name: 'Very Poor', min: 301, max: 400, color: '#e0433a', ink: '#ffffff', health: 'Respiratory illness on prolonged exposure' },
  { name: 'Severe', min: 401, max: 500, color: '#9e1b32', ink: '#ffffff', health: 'Affects healthy people and seriously impacts those with existing diseases' },
]
export const aqiCat = (v) => AQI_CATS.find((c) => v >= c.min && v <= c.max) || AQI_CATS[AQI_CATS.length - 1]

// CPCB writes some names in different ways on different days
export const AQI_ALIASES = { mira: 'mira-bhayandar' }

export const aqiSlug = (name) => {
  const s = String(name).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return AQI_ALIASES[s] || s
}
// CPCB capitalises only the first word ("Navi mumbai"); show every word capitalised
export const aqiName = (name) => String(name).trim().toLowerCase().replace(/(^|[\s(\-])([a-z])/g, (m, p, c) => p + c.toUpperCase())

// Tier 1: the eight metros. Tier 2: other cities with 10 lakh or more people in the 2011 Census
// (million-plus cities and urban agglomerations). Tier 3: every other city in the bulletin.
const TIER1 = ['delhi', 'mumbai', 'kolkata', 'chennai', 'bengaluru', 'hyderabad', 'ahmedabad', 'pune']
const TIER2 = ['surat', 'jaipur', 'kanpur', 'lucknow', 'nagpur', 'ghaziabad', 'indore', 'coimbatore', 'kochi', 'patna', 'kozhikode', 'bhopal',
  'thrissur', 'vadodara', 'agra', 'visakhapatnam', 'malappuram', 'thiruvananthapuram', 'kannur', 'ludhiana', 'nashik', 'vijayawada', 'madurai',
  'varanasi', 'meerut', 'faridabad', 'rajkot', 'jamshedpur', 'srinagar', 'jabalpur', 'asansol', 'vasai', 'virar', 'prayagraj', 'dhanbad',
  'aurangabad-maharashtra', 'amritsar', 'jodhpur', 'ranchi', 'raipur', 'kollam', 'gwalior', 'bhilai', 'chandigarh', 'tiruchirappalli', 'kota']
export const aqiTier = (slug) => (TIER1.includes(slug) ? 1 : TIER2.includes(slug) ? 2 : 3)
export const TIER_LABEL = { 1: 'Metros', 2: 'Million-plus cities', 3: 'Other cities' }

// State or UT of each bulletin city (left out where the name alone is ambiguous)
const S = {
  AP: 'Andhra Pradesh', AR: 'Arunachal Pradesh', AS: 'Assam', BR: 'Bihar', CG: 'Chhattisgarh', CH: 'Chandigarh', DL: 'Delhi', GJ: 'Gujarat',
  HR: 'Haryana', HP: 'Himachal Pradesh', JK: 'Jammu and Kashmir', JH: 'Jharkhand', KA: 'Karnataka', KL: 'Kerala', LA: 'Ladakh', MP: 'Madhya Pradesh',
  MH: 'Maharashtra', MN: 'Manipur', ML: 'Meghalaya', MZ: 'Mizoram', NL: 'Nagaland', OD: 'Odisha', PY: 'Puducherry', PB: 'Punjab', RJ: 'Rajasthan',
  SK: 'Sikkim', TN: 'Tamil Nadu', TS: 'Telangana', TR: 'Tripura', UP: 'Uttar Pradesh', UK: 'Uttarakhand', WB: 'West Bengal', AN: 'Andaman and Nicobar Islands',
}
const BY_STATE = {
  AP: 'amaravati anantapur chittoor eluru guntur kadapa kakinada kurnool machilipatnam nellore ongole rajamahendravaram srikakulam tirumala tirupati vijayawada visakhapatnam',
  AR: 'naharlagun', AS: 'byrnihat-assam guwahati nagaon nalbari silchar sivasagar',
  BR: 'araria arrah aurangabad-bihar begusarai bettiah bhagalpur bihar-sharif buxar chhapra darbhanga gaya gopalganj hajipur jamui katihar kishanganj kiul madhubani manguraha motihari munger muzaffarpur patna purnia rajgir saharsa samastipur sasaram sitamarhi siwan',
  CG: 'bhilai chhal korba kunjemura milupara raipur tumidih', CH: 'chandigarh', DL: 'delhi',
  GJ: 'ahmedabad ankleshwar bhavnagar gandhinagar mehsana nandesari rajkot surat vadodara vapi vatva',
  HR: 'ambala bahadurgarh ballabgarh bhiwani charkhi-dadri dharuhera faridabad fatehabad gurugram hisar jind kaithal karnal kurukshetra mandikhera manesar narnaul palwal panchgaon panchkula panipat rohtak sirsa sonipat yamuna-nagar',
  HP: 'baddi', JK: 'pampore srinagar', JH: 'dhanbad jorapokhar pathardih',
  KA: 'bagalkot belgaum bengaluru bidar chamarajanagar chikkaballapur chikkamagaluru davanagere dharwad gadag hassan haveri hubballi kalaburagi karwar kolar koppal madikeri mangalore mysuru raichur ramanagara shivamogga tumakuru udupi vijayapura yadgir',
  KL: 'eloor ernakulam kannur kochi kollam kozhikode thiruvananthapuram thrissur', LA: 'leh',
  MP: 'bhopal damoh dewas gwalior indore jabalpur katni maihar mandideep pithampur ratlam sagar satna singrauli ujjain',
  MH: 'ahmednagar akola ambernath amravati aurangabad-maharashtra badlapur beed belapur bhiwandi boisar chandrapur dhule dombivli hingoli jalgaon jalna kalyan kolhapur latur mahad malegaon mira-bhayandar mumbai nagpur nanded nashik navi-mumbai parbhani pimpri-chinchwad pune sangli satara solapur thane ulhasnagar vasai virar',
  MN: 'imphal', ML: 'byrnihat-meghalaya shillong', MZ: 'aizawl', NL: 'kohima',
  OD: 'angul balasore barbil baripada bhubaneswar bileipada brajrajnagar byasanagar cuttack keonjhar nayagarh paradeep rairangpur rourkela suakati talcher tensa',
  PY: 'puducherry', PB: 'amritsar bathinda jalandhar khanna ludhiana mandi-gobindgarh patiala rupnagar',
  RJ: 'ajmer alwar banswara baran barmer bharatpur bhilwara bhiwadi bikaner bundi chittorgarh churu dausa deeg dholpur dungarpur hanumangarh jaipur jaisalmer jalore jhalawar jhunjhunu jodhpur karauli khairthal kota kotputli nagaur pali rajsamand sawai-madhopur sikar sirohi sri-ganganagar tonk udaipur',
  SK: 'gangtok',
  TN: 'ariyalur chengalpattu chennai coimbatore cuddalore dindigul gummidipoondi hosur kanchipuram karur madurai nagapattinam namakkal ooty palkalaiperur perundurai pudukottai ramanathapuram ranipet salem thanjavur thoothukudi tiruchirappalli tirunelveli tirupur vellore virudhunagar',
  TS: 'hyderabad', TR: 'agartala',
  UP: 'agra anpara baghpat baraut bareilly bulandshahr fatehpur-sikri firozabad gajraula ghaziabad gorakhpur greater-noida hapur jhansi kanpur khora khurja lucknow mathura meerut modinagar moradabad muzaffarnagar noida prayagraj raebareli shamli varanasi vrindavan',
  UK: 'dehradun kashipur rishikesh', WB: 'asansol barrackpore durgapur haldia howrah kolkata siliguri', AN: 'sri-vijaya-puram',
}
export const AQI_STATE = Object.fromEntries(Object.entries(BY_STATE).flatMap(([k, v]) => v.split(' ').map((slug) => [slug, S[k]])))

export const AQI_HUB = '/aqi'
export const aqiPath = (slug) => `/aqi/${slug}`
