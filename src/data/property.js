// Property price pages. City figures: National Housing Bank RESIDEX (residex.nhbonline.org.in).
// Pure data, no imports: the scheduled job (scripts/data/update-property.mjs) reads it too.

// NHB city name -> how we show it, slug, state, region and tier.
// Tier 1: the eight metros and the cities in their metropolitan regions. Tier 2: other cities
// with 10 lakh or more people in the 2011 Census. Tier 3: the rest.
const C = (nhb, name, slug, state, tier, region = null) => ({ nhb, name, slug, state, tier, region })
export const PROPERTY_CITIES = [
  C('Mumbai', 'Mumbai', 'mumbai', 'Maharashtra', 1, 'Mumbai region'),
  C('Thane', 'Thane', 'thane', 'Maharashtra', 1, 'Mumbai region'),
  C('Navi Mumbai', 'Navi Mumbai', 'navi-mumbai', 'Maharashtra', 1, 'Mumbai region'),
  C('Kalyan Dombivali', 'Kalyan-Dombivli', 'kalyan-dombivli', 'Maharashtra', 1, 'Mumbai region'),
  C('Mira Bhayander', 'Mira-Bhayandar', 'mira-bhayandar', 'Maharashtra', 1, 'Mumbai region'),
  C('Vasai Virar', 'Vasai-Virar', 'vasai-virar', 'Maharashtra', 1, 'Mumbai region'),
  C('Panvel', 'Panvel', 'panvel', 'Maharashtra', 1, 'Mumbai region'),
  C('Delhi', 'Delhi', 'delhi', 'Delhi', 1, 'Delhi NCR'),
  C('Noida', 'Noida', 'noida', 'Uttar Pradesh', 1, 'Delhi NCR'),
  C('Greater Noida', 'Greater Noida', 'greater-noida', 'Uttar Pradesh', 1, 'Delhi NCR'),
  C('Gurugram', 'Gurugram', 'gurugram', 'Haryana', 1, 'Delhi NCR'),
  C('Ghaziabad', 'Ghaziabad', 'ghaziabad', 'Uttar Pradesh', 1, 'Delhi NCR'),
  C('Faridabad', 'Faridabad', 'faridabad', 'Haryana', 1, 'Delhi NCR'),
  C('Bhiwadi', 'Bhiwadi', 'bhiwadi', 'Rajasthan', 1, 'Delhi NCR'),
  C('Kolkata', 'Kolkata', 'kolkata', 'West Bengal', 1, 'Kolkata region'),
  C('Howrah', 'Howrah', 'howrah', 'West Bengal', 1, 'Kolkata region'),
  C('New Town Kolkata', 'New Town', 'new-town-kolkata', 'West Bengal', 1, 'Kolkata region'),
  C('Bidhan Nagar (Excluding Rajarhat)', 'Bidhan Nagar (Salt Lake)', 'bidhan-nagar', 'West Bengal', 1, 'Kolkata region'),
  C('Pune', 'Pune', 'pune', 'Maharashtra', 1, 'Pune region'),
  C('Pimpri Chinchwad', 'Pimpri-Chinchwad', 'pimpri-chinchwad', 'Maharashtra', 1, 'Pune region'),
  C('Chakan', 'Chakan', 'chakan', 'Maharashtra', 1, 'Pune region'),
  C('Ahmedabad', 'Ahmedabad', 'ahmedabad', 'Gujarat', 1, 'Ahmedabad region'),
  C('Gandhinagar', 'Gandhinagar', 'gandhinagar', 'Gujarat', 1, 'Ahmedabad region'),
  C('Bengaluru', 'Bengaluru', 'bengaluru', 'Karnataka', 1),
  C('Chennai', 'Chennai', 'chennai', 'Tamil Nadu', 1),
  C('Hyderabad', 'Hyderabad', 'hyderabad', 'Telangana', 1),
  C('Surat', 'Surat', 'surat', 'Gujarat', 2),
  C('Vadodara', 'Vadodara', 'vadodara', 'Gujarat', 2),
  C('Rajkot', 'Rajkot', 'rajkot', 'Gujarat', 2),
  C('Jaipur', 'Jaipur', 'jaipur', 'Rajasthan', 2),
  C('Lucknow', 'Lucknow', 'lucknow', 'Uttar Pradesh', 2),
  C('Kanpur', 'Kanpur', 'kanpur', 'Uttar Pradesh', 2),
  C('Meerut', 'Meerut', 'meerut', 'Uttar Pradesh', 2),
  C('Nagpur', 'Nagpur', 'nagpur', 'Maharashtra', 2),
  C('Nashik', 'Nashik', 'nashik', 'Maharashtra', 2),
  C('Indore', 'Indore', 'indore', 'Madhya Pradesh', 2),
  C('Bhopal', 'Bhopal', 'bhopal', 'Madhya Pradesh', 2),
  C('Raipur', 'Raipur', 'raipur', 'Chhattisgarh', 2),
  C('Patna', 'Patna', 'patna', 'Bihar', 2),
  C('Ranchi', 'Ranchi', 'ranchi', 'Jharkhand', 2),
  C('Ludhiana', 'Ludhiana', 'ludhiana', 'Punjab', 2),
  C('Chandigarh (Tricity)', 'Chandigarh (tricity)', 'chandigarh', 'Chandigarh', 2),
  C('Kochi', 'Kochi', 'kochi', 'Kerala', 2),
  C('Thiruvananthapuram', 'Thiruvananthapuram', 'thiruvananthapuram', 'Kerala', 2),
  C('Coimbatore', 'Coimbatore', 'coimbatore', 'Tamil Nadu', 2),
  C('Vizag', 'Visakhapatnam', 'visakhapatnam', 'Andhra Pradesh', 2),
  C('Vijayawada', 'Vijayawada', 'vijayawada', 'Andhra Pradesh', 2),
  C('Bhubaneswar', 'Bhubaneswar', 'bhubaneswar', 'Odisha', 3),
  C('Dehradun', 'Dehradun', 'dehradun', 'Uttarakhand', 3),
  C('Guwahati', 'Guwahati', 'guwahati', 'Assam', 3),
]
export const PROPERTY_TIER_LABEL = { 1: 'Metros and their regions', 2: 'Million-plus cities', 3: 'Other cities' }
export const PROPERTY_HUB = '/property-prices'
export const propertyPath = (slug) => `${PROPERTY_HUB}/${slug}`
export const propertyCity = Object.fromEntries(PROPERTY_CITIES.map((c) => [c.slug, c]))
export const SIZE_BANDS = [
  { key: 'small', label: 'Up to 646 sq ft', long: 'Homes up to 60 sq m (646 sq ft) carpet' },
  { key: 'mid', label: '646 to 1,184 sq ft', long: 'Homes of 60 to 110 sq m (646 to 1,184 sq ft) carpet' },
  { key: 'large', label: 'Above 1,184 sq ft', long: 'Homes above 110 sq m (1,184 sq ft) carpet' },
]
