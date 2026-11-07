"""Builds the district pages' data from the Census 2011 Primary Census Abstract.

Source: Office of the Registrar General and Census Commissioner, India,
Primary Census Abstract 2011, India, states and districts
(DDW_PCA0000_2011_Indiastatedist.xlsx, censusindia.gov.in, catalog 6191),
kept in data/raw/census-2011/ and fetched by .github/workflows/probe-districts.yml.

Writes:
  live/districts/<state-slug>.json   every district of one state or UT, with state and India figures
  live/districts-index.json          one summary row per district, plus state and India totals

Districts are as they were in 2011. They are grouped under today's states and UTs
(Telangana, Ladakh, and Dadra and Nagar Haveli and Daman and Diu), and districts
renamed since 2011 show their current name with the Census name alongside.
All figures are counts from the file or ratios computed from those counts; nothing is estimated.

Run: python3 scripts/data/build-districts.py
"""
import json
import os
import re

import openpyxl

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'data', 'raw', 'census-2011', 'DDW_PCA0000_2011_Indiastatedist.xlsx')
OUT_DIR = os.path.join(ROOT, 'live', 'districts')
INDEX = os.path.join(ROOT, 'live', 'districts-index.json')

SOURCE = {
    'name': 'Census of India 2011, Primary Census Abstract (Office of the Registrar General and Census Commissioner, India)',
    'url': 'https://censusindia.gov.in/nada/index.php/catalog/6191',
}

# Official renames since 2011, keyed by (2011 state code, Census 2011 district name)
RENAMED = {
    ('09', 'Allahabad'): 'Prayagraj',
    ('09', 'Faizabad'): 'Ayodhya',
    ('09', 'Jyotiba Phule Nagar'): 'Amroha',
    ('09', 'Mahamaya Nagar'): 'Hathras',
    ('09', 'Kanshiram Nagar'): 'Kasganj',
    ('09', 'Sant Ravidas Nagar (Bhadohi)'): 'Bhadohi',
    ('06', 'Gurgaon'): 'Gurugram',
    ('06', 'Mewat'): 'Nuh',
    ('27', 'Aurangabad'): 'Chhatrapati Sambhajinagar',
    ('27', 'Osmanabad'): 'Dharashiv',
    ('27', 'Ahmadnagar'): 'Ahilyanagar',
    ('23', 'Hoshangabad'): 'Narmadapuram',
    ('29', 'Bangalore'): 'Bengaluru Urban',
    ('29', 'Bangalore Rural'): 'Bengaluru Rural',
    ('29', 'Mysore'): 'Mysuru',
    ('29', 'Belgaum'): 'Belagavi',
    ('29', 'Gulbarga'): 'Kalaburagi',
    ('29', 'Bellary'): 'Ballari',
    ('29', 'Bijapur'): 'Vijayapura',
    ('29', 'Shimoga'): 'Shivamogga',
    ('29', 'Tumkur'): 'Tumakuru',
    ('29', 'Chikmagalur'): 'Chikkamagaluru',
}
# Tidied display names (same district, clearer label)
DISPLAY = {
    ('01', 'Leh(Ladakh)'): 'Leh',
    ('28', 'Y.S.R.'): 'Y.S.R. (Kadapa)',
}
TELANGANA = {'532', '533', '534', '535', '536', '537', '538', '539', '540', '541'}
LADAKH = {'003', '004'}
STATE_NAMES = {
    '01': 'Jammu and Kashmir', '07': 'Delhi', '25': 'Dadra and Nagar Haveli and Daman and Diu',
    '26': 'Dadra and Nagar Haveli and Daman and Diu', '35': 'Andaman and Nicobar Islands', '34': 'Puducherry',
}

COLS = ['No_HH', 'TOT_P', 'TOT_M', 'TOT_F', 'P_06', 'M_06', 'F_06', 'P_SC', 'P_ST', 'P_LIT', 'M_LIT', 'F_LIT',
        'TOT_WORK_P', 'TOT_WORK_F', 'MAINWORK_P', 'MARGWORK_P', 'MAIN_CL_P', 'MAIN_AL_P', 'MAIN_HH_P', 'MAIN_OT_P',
        'MARG_CL_P', 'MARG_AL_P', 'MARG_HH_P', 'MARG_OT_P']


def slugify(s):
    s = s.lower().replace('&', 'and')
    s = re.sub(r'[^a-z0-9]+', '-', s)
    return s.strip('-')


def title_state(code, name):
    if code in STATE_NAMES:
        return STATE_NAMES[code]
    return ' '.join(w if w == '&' else w.capitalize() for w in name.split()).replace(' & ', ' and ')


def current_state(code, dcode, census_state_name):
    if code == '28' and dcode in TELANGANA:
        return 'Telangana'
    if code == '01' and dcode in LADAKH:
        return 'Ladakh'
    return title_state(code, census_state_name)


def metrics(c):
    """c: dict of counts (Total) plus 'URBAN_P'. Returns counts and ratios used by the pages."""
    p, m, f = c['TOT_P'], c['TOT_M'], c['TOT_F']
    p7, m7, f7 = p - c['P_06'], m - c['M_06'], f - c['F_06']
    cl = c['MAIN_CL_P'] + c['MARG_CL_P']
    al = c['MAIN_AL_P'] + c['MARG_AL_P']
    hhi = c['MAIN_HH_P'] + c['MARG_HH_P']
    ot = c['MAIN_OT_P'] + c['MARG_OT_P']
    w = c['TOT_WORK_P']
    r1 = lambda v: round(v, 1)
    r2 = lambda v: round(v, 2)
    return {
        'pop': p, 'male': m, 'female': f, 'households': c['No_HH'], 'pop06': c['P_06'],
        'urbanPop': c['URBAN_P'], 'ruralPop': p - c['URBAN_P'], 'sc': c['P_SC'], 'st': c['P_ST'],
        'literates': c['P_LIT'], 'workers': w, 'mainWorkers': c['MAINWORK_P'], 'marginalWorkers': c['MARGWORK_P'],
        'cultivators': cl, 'agriLabourers': al, 'householdIndustry': hhi, 'otherWorkers': ot,
        'sexRatio': round(f / m * 1000), 'childSexRatio': round(c['F_06'] / c['M_06'] * 1000),
        'literacy': r2(c['P_LIT'] / p7 * 100), 'literacyMale': r2(c['M_LIT'] / m7 * 100), 'literacyFemale': r2(c['F_LIT'] / f7 * 100),
        'urbanPct': r2(c['URBAN_P'] / p * 100), 'scPct': r2(c['P_SC'] / p * 100), 'stPct': r2(c['P_ST'] / p * 100),
        'workPct': r2(w / p * 100), 'femaleWorkPct': r2(c['TOT_WORK_F'] / f * 100),
        'cultivatorsPct': r1(cl / w * 100), 'agriLabourersPct': r1(al / w * 100),
        'householdIndustryPct': r1(hhi / w * 100), 'otherWorkersPct': r1(ot / w * 100),
        'householdSize': r2(p / c['No_HH']), 'childPct': r2(c['P_06'] / p * 100),
    }


def add(a, b):
    return {k: a.get(k, 0) + b[k] for k in b}


def main():
    ws = openpyxl.load_workbook(SRC, read_only=True)['Sheet1']
    rows = list(ws.iter_rows(values_only=True))
    head = rows[0]
    ix = {h: i for i, h in enumerate(head)}
    census_states = {}
    india = {}
    india_urban = None
    dist = {}  # (state code, district code) -> {'name', 'Total': counts, 'URBAN_P'}
    for r in rows[1:]:
        level, tru = r[ix['Level']], r[ix['TRU']]
        code, dcode, name = r[ix['State']], r[ix['District']], re.sub(r'\s+', ' ', str(r[ix['Name']])).strip()
        counts = {k: int(r[ix[k]]) for k in COLS}
        if level == 'India':
            if tru == 'Total':
                india = counts
            elif tru == 'Urban':
                india_urban = counts['TOT_P']
        elif level == 'STATE' and tru == 'Total':
            census_states[code] = name
        elif level == 'DISTRICT':
            d = dist.setdefault((code, dcode), {'name': name})
            if tru == 'Total':
                d['counts'] = counts
            elif tru == 'Urban':
                d['urban'] = counts['TOT_P']

    districts = []
    for (code, dcode), d in sorted(dist.items()):
        census_name = d['name']
        name = RENAMED.get((code, census_name)) or DISPLAY.get((code, census_name)) or census_name.replace(' & ', ' and ')
        state = current_state(code, dcode, census_states[code])
        c = dict(d['counts'], URBAN_P=d.get('urban', 0))
        row = {
            'code': f'{code}{dcode}', 'name': name, 'slug': slugify(name.replace('(', ' ').replace(')', ' ')),
            'state': state, 'stateSlug': slugify(state), 'census2011State': title_state(code, census_states[code]),
            'counts': c,
        }
        if (code, census_name) in RENAMED:
            row['censusName'] = census_name
        districts.append(row)

    # slugs must be unique within a state
    seen = set()
    for d in districts:
        key = (d['stateSlug'], d['slug'])
        assert key not in seen, key
        seen.add(key)

    # state totals by summing districts (so Telangana, Ladakh and the merged UT are correct)
    states = {}
    for d in districts:
        s = states.setdefault(d['state'], {'name': d['state'], 'slug': d['stateSlug'], 'counts': {}, 'districts': 0})
        s['counts'] = add(s['counts'], d['counts'])
        s['districts'] += 1
    india_counts = dict(india, URBAN_P=india_urban)
    summed = {}
    for s in states.values():
        summed = add(summed, s['counts'])
    for k in COLS:
        assert summed[k] == india[k], (k, summed[k], india[k])  # districts add up to India exactly
    assert summed['URBAN_P'] == india_urban

    for d in districts:
        d.update(metrics(d.pop('counts')))
    for s in states.values():
        s.update(metrics(s.pop('counts')))
    india_m = metrics(india_counts)

    # ranks: 1 = highest
    rank_keys = {'pop': 'pop', 'literacy': 'literacy', 'sexRatio': 'sexRatio', 'childSexRatio': 'childSexRatio', 'urbanPct': 'urbanPct', 'workPct': 'workPct'}
    for key in rank_keys:
        for i, d in enumerate(sorted(districts, key=lambda x: (-x[key], x['name']))):
            d.setdefault('rankIndia', {})[key] = i + 1
        for s in states.values():
            ds = [d for d in districts if d['state'] == s['name']]
            for i, d in enumerate(sorted(ds, key=lambda x: (-x[key], x['name']))):
                d.setdefault('rankState', {})[key] = i + 1

    os.makedirs(OUT_DIR, exist_ok=True)
    for f in os.listdir(OUT_DIR):
        if f.endswith('.json'):
            os.remove(os.path.join(OUT_DIR, f))
    for s in states.values():
        ds = sorted([d for d in districts if d['state'] == s['name']], key=lambda x: -x['pop'])
        with open(os.path.join(OUT_DIR, f"{s['slug']}.json"), 'w') as fh:
            json.dump({'state': s, 'india': india_m, 'districts': ds, 'totalDistricts': len(districts), 'source': SOURCE, 'year': 2011}, fh, separators=(',', ':'))

    keep = ['name', 'slug', 'state', 'stateSlug', 'pop', 'literacy', 'sexRatio', 'urbanPct', 'censusName']
    index = {
        'source': SOURCE, 'year': 2011, 'india': india_m,
        'states': sorted([{k: s[k] for k in ['name', 'slug', 'districts', 'pop', 'literacy', 'sexRatio', 'urbanPct']} for s in states.values()], key=lambda x: x['name']),
        'districts': [{k: d[k] for k in keep if k in d} for d in sorted(districts, key=lambda x: -x['pop'])],
    }
    with open(INDEX, 'w') as fh:
        json.dump(index, fh, separators=(',', ':'))
    print(f"{len(districts)} districts in {len(states)} states and UTs; India population {india_m['pop']:,}, literacy {india_m['literacy']}%, sex ratio {india_m['sexRatio']}")


if __name__ == '__main__':
    main()
