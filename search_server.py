#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Horizons Influencer Panel - kone.vc Search Bridge
Flask server: POST /search -> kone.vc MCP (direct JSON-RPC, no Claude) -> JSON + CSV
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import os
import re
import json
import csv
import io
import time
import datetime
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

KONE_MCP_URL = "https://go.kone.vc/influbalance_gohorizons"

STATE_CITIES = {
    'South Carolina': ['Columbia', 'Charleston', 'Greenville', 'Spartanburg', 'Myrtle Beach', 'Rock Hill', 'Charlotte', 'Concord', 'Gastonia', 'Fort Mill', 'Huntersville', 'Kannapolis'],
    'Texas':          ['Houston', 'Dallas', 'Austin', 'San Antonio', 'Fort Worth', 'El Paso', 'Arlington', 'Plano'],
    'California':     ['Los Angeles', 'San Francisco', 'San Diego', 'San Jose', 'Sacramento', 'Oakland', 'Fresno'],
    'Tennessee':      ['Nashville', 'Memphis', 'Knoxville', 'Chattanooga', 'Clarksville', 'Murfreesboro'],
    'Ohio':           ['Columbus', 'Cleveland', 'Cincinnati', 'Toledo', 'Akron', 'Dayton'],
}

# North Carolina cities included when searching SC (Charlotte metro)
SC_NC_CITIES = ['north carolina', 'nc', 'charlotte', 'concord', 'gastonia',
                'fort mill', 'huntersville', 'kannapolis', 'mooresville',
                'wilmington', 'raleigh', 'asheville', 'durham', 'greensboro']

# All geo keywords per state (for bio parsing)
STATE_GEO = {
    'South Carolina': {
        'keywords': ['south carolina', ' sc ', ',sc', 'sc-', 'columbia', 'charleston',
                     'greenville', 'spartanburg', 'myrtle beach', 'rock hill',
                     # NC included for SC zone
                     'north carolina', ' nc ', ',nc', 'charlotte', 'concord', 'gastonia',
                     'fort mill', 'huntersville', 'kannapolis', 'mooresville',
                     'wilmington', 'raleigh', 'asheville', 'durham', 'greensboro'],
        'label': 'South Carolina / Charlotte area',
    },
    'North Carolina': {
        'keywords': ['north carolina', ' nc ', ',nc', 'charlotte', 'raleigh', 'durham',
                     'greensboro', 'winston-salem', 'fayetteville', 'cary', 'wilmington',
                     'asheville', 'concord', 'gastonia', 'huntersville'],
        'label': 'North Carolina',
    },
    'Texas': {
        'keywords': ['texas', ' tx ', ',tx', 'houston', 'dallas', 'austin', 'san antonio',
                     'fort worth', 'el paso', 'arlington', 'plano', 'lubbock', 'laredo',
                     'irving', 'garland', 'amarillo', 'frisco', 'mckinney'],
        'label': 'Texas',
    },
    'California': {
        'keywords': ['california', ' ca ', ',ca', 'los angeles', 'san francisco', 'san diego',
                     'san jose', 'sacramento', 'oakland', 'fresno', 'long beach', 'bakersfield',
                     'anaheim', 'santa ana', 'riverside', 'irvine', 'socal', 'norcal',
                     'bay area', 'silicon valley', 'hollywood', 'venice beach', 'malibu'],
        'label': 'California',
    },
    'Tennessee': {
        'keywords': ['tennessee', ' tn ', ',tn', 'nashville', 'memphis', 'knoxville',
                     'chattanooga', 'clarksville', 'murfreesboro', 'franklin', 'jackson'],
        'label': 'Tennessee',
    },
    'Ohio': {
        'keywords': ['ohio', ' oh ', ',oh', 'columbus', 'cleveland', 'cincinnati', 'toledo',
                     'akron', 'dayton', 'parma', 'canton', 'youngstown', 'lorain'],
        'label': 'Ohio',
    },
}

# All known US geo keywords that indicate a DIFFERENT location (for negative filtering)
# Built dynamically from STATE_GEO — see build_negative_keywords()
_NEGATIVE_GEO_CACHE = {}

def build_negative_keywords(target_states):
    """Return geo keywords for all states NOT in target_states."""
    cache_key = tuple(sorted(target_states))
    if cache_key in _NEGATIVE_GEO_CACHE:
        return _NEGATIVE_GEO_CACHE[cache_key]
    # SC automatically includes NC
    effective_targets = set(target_states)
    if 'South Carolina' in effective_targets:
        effective_targets.add('North Carolina')

    negative = set()
    # Other US states not in our 5
    other_states = {
        'new york': [' ny ', ',ny', 'new york', 'nyc', 'manhattan', 'brooklyn', 'queens', 'bronx'],
        'florida':  ['florida', ' fl ', ',fl', 'miami', 'orlando', 'tampa', 'jacksonville', 'ft lauderdale'],
        'illinois': ['illinois', ' il ', ',il', 'chicago'],
        'georgia':  ['georgia', ' ga ', ',ga', 'atlanta'],
        'virginia': ['virginia', ' va ', ',va', 'richmond', 'virginia beach'],
        'washington': ['washington state', 'seattle', ' wa ', ',wa'],
        'massachusetts': ['massachusetts', ' ma ', ',ma', 'boston'],
        'colorado': ['colorado', ' co ', ',co', 'denver'],
        'arizona':  ['arizona', ' az ', ',az', 'phoenix', 'scottsdale', 'tucson'],
        'nevada':   ['nevada', ' nv ', ',nv', 'las vegas', 'reno'],
        'oregon':   ['oregon', ' or ', ',or', 'portland'],
        'minnesota':['minnesota', ' mn ', ',mn', 'minneapolis'],
        'michigan': ['michigan', ' mi ', ',mi', 'detroit'],
        'pennsylvania': ['pennsylvania', ' pa ', ',pa', 'philadelphia', 'pittsburgh'],
        'new jersey': ['new jersey', ' nj ', ',nj', 'newark'],
        'maryland': ['maryland', ' md ', ',md', 'baltimore'],
        'missouri': ['missouri', ' mo ', ',mo', 'st. louis', 'kansas city'],
        'indiana':  ['indiana', ',in', 'indianapolis'],
        'wisconsin':['wisconsin', ' wi ', ',wi', 'milwaukee'],
        'utah':     ['utah', ' ut ', ',ut', 'salt lake'],
        'kansas':   ['kansas', ' ks ', ',ks'],
        'louisiana':['louisiana', ',la', 'new orleans'],
        'kentucky': ['kentucky', ' ky ', ',ky', 'louisville', 'lexington'],
        'alabama':  ['alabama', ' al ', ',al', 'birmingham', 'montgomery'],
        'mississippi': ['mississippi', ' ms ', ',ms', 'jackson'],
        'arkansas': ['arkansas', ' ar ', ',ar', 'little rock'],
        'iowa':     ['iowa', ' ia ', ',ia', 'des moines'],
        'nebraska': ['nebraska', ' ne ', ',ne', 'omaha'],
        'new mexico': ['new mexico', ' nm ', ',nm', 'albuquerque'],
        'hawaii':   ['hawaii', ' hi ', ',hi', 'honolulu'],
        'alaska':   ['alaska', ' ak ', ',ak', 'anchorage'],
        'connecticut': ['connecticut', ' ct ', ',ct', 'hartford'],
        'oklahoma': ['oklahoma', ' ok ', ',ok', 'oklahoma city', 'tulsa'],
    }
    for state_name, kws in other_states.items():
        negative.update(kws)

    # Also add keywords from our 5 states that are NOT in target
    for state, info in STATE_GEO.items():
        if state not in effective_targets:
            negative.update(info['keywords'])

    _NEGATIVE_GEO_CACHE[cache_key] = negative
    return negative

KONE_REGIONS = {
    'South Carolina': 'south_carolina',
    'North Carolina': 'north_carolina',
    'Texas':          'texas',
    'California':     'california',
    'Tennessee':      'tennessee',
    'Ohio':           'ohio',
    'Columbia':       'columbia',
    'Charleston':     'charleston',
    'Greenville':     'greenville',
    'Spartanburg':    'spartanburg',
    'Myrtle Beach':   'myrtle_beach',
    'Rock Hill':      'rock_hill',
    'Charlotte':      'charlotte',
    'Concord':        'concord',
    'Gastonia':       'gastonia',
    'Fort Mill':      'fort_mill',
    'Huntersville':   'huntersville',
    'Kannapolis':     'kannapolis',
    'Houston':        'houston',
    'Dallas':         'dallas',
    'Austin':         'austin',
    'San Antonio':    'san_antonio',
    'Fort Worth':     'fort_worth',
    'El Paso':        'el_paso',
    'Arlington':      'arlington',
    'Plano':          'plano',
    'Los Angeles':    'los_angeles',
    'San Francisco':  'san_francisco',
    'San Diego':      'san_diego',
    'San Jose':       'san_jose',
    'Sacramento':     'sacramento',
    'Oakland':        'oakland',
    'Fresno':         'fresno',
    'Nashville':      'nashville',
    'Memphis':        'memphis',
    'Knoxville':      'knoxville',
    'Chattanooga':    'chattanooga',
    'Clarksville':    'clarksville',
    'Murfreesboro':   'murfreesboro',
    'Columbus':       'columbus',
    'Cleveland':      'cleveland',
    'Cincinnati':     'cincinnati',
    'Toledo':         'toledo',
    'Akron':          'akron',
    'Dayton':         'dayton',
}

# Category -> kone.vc description keywords for richer searches
CATEGORY_KEYWORDS = {
    'lifestyle':  ['lifestyle', 'influencer', 'content creator', 'blogger'],
    'travel':     ['travel', 'adventure', 'explore', 'wanderlust', 'tourism'],
    'food':       ['food', 'foodie', 'restaurant', 'chef', 'cooking', 'cuisine'],
    'fashion':    ['fashion', 'style', 'outfit', 'clothing', 'designer', 'ootd'],
    'fitness':    ['fitness', 'gym', 'workout', 'health', 'wellness', 'sport'],
    'beauty':     ['beauty', 'makeup', 'skincare', 'cosmetics', 'glam'],
    'outdoor':    ['outdoor', 'nature', 'hiking', 'camping', 'adventure'],
    'luxury':     ['luxury', 'premium', 'high-end', 'exclusive', 'upscale'],
    'family':     ['family', 'mom', 'dad', 'parenting', 'kids', 'children'],
    'photography':['photography', 'photographer', 'photo', 'visual', 'creative'],
}

_LOG = []

def log(tag, data):
    entry = {"t": datetime.datetime.now().strftime("%H:%M:%S"), "tag": tag, "data": data}
    _LOG.append(entry)
    try:
        print(f"[{entry['t']}] {tag}: {json.dumps(data, ensure_ascii=False)[:300]}")
    except Exception:
        print(f"[{entry['t']}] {tag}: (log print error)")


@app.route('/log', methods=['GET'])
def get_log():
    return jsonify({"log": _LOG[-50:]})


def kone_call(location_tags, platform, category_tags, description_tags, range_tags, retries=3):
    """Call kone.vc directly via JSON-RPC MCP protocol."""
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": "get_contacts",
            "arguments": {
                "location_tags": location_tags,
                "range_tags": range_tags,
                "platform_tags": [platform],
                "category_tags": category_tags,
                "intention_tags": [{"tag_value": "contact_search_by_common_keywords", "tag_weight": 1}],
                "description_tags": description_tags,
            }
        }
    }
    for attempt in range(1, retries + 1):
        try:
            r = requests.post(KONE_MCP_URL, json=payload, timeout=60)
            r.raise_for_status()
            data = r.json()
            if 'error' in data:
                log('kone_error', {'attempt': attempt, 'error': str(data['error'])[:200]})
                if attempt < retries:
                    time.sleep(5 * attempt)
                    continue
                return []
            content = data.get('result', {}).get('content', [])
            for item in content:
                text = item.get('text', '')
                try:
                    parsed = json.loads(text)
                    contacts = parsed.get('contacts_top_20', [])
                    if contacts:
                        return contacts
                except Exception:
                    pass
            return []
        except requests.exceptions.Timeout:
            log('kone_timeout', {'attempt': attempt, 'platform': platform})
            if attempt < retries:
                time.sleep(5 * attempt)
        except Exception as e:
            log('kone_exception', {'attempt': attempt, 'error': str(e)[:200]})
            if attempt < retries:
                time.sleep(5 * attempt)
    return []


def extract_location_from_bio(bio):
    """Try to extract a city/state location string from bio text."""
    if not bio:
        return ''

    text = bio.lower()

    # All known city -> canonical label mappings
    CITY_MAP = {
        # SC
        'columbia, sc': 'Columbia, SC', 'columbia, south carolina': 'Columbia, SC',
        'charleston, sc': 'Charleston, SC', 'charleston, south carolina': 'Charleston, SC',
        'greenville, sc': 'Greenville, SC', 'greenville, south carolina': 'Greenville, SC',
        'spartanburg, sc': 'Spartanburg, SC', 'spartanburg, south carolina': 'Spartanburg, SC',
        'myrtle beach, sc': 'Myrtle Beach, SC', 'myrtle beach, south carolina': 'Myrtle Beach, SC',
        'rock hill, sc': 'Rock Hill, SC', 'rock hill, south carolina': 'Rock Hill, SC',
        # NC
        'charlotte, nc': 'Charlotte, NC', 'charlotte, north carolina': 'Charlotte, NC',
        'raleigh, nc': 'Raleigh, NC', 'raleigh, north carolina': 'Raleigh, NC',
        'durham, nc': 'Durham, NC', 'durham, north carolina': 'Durham, NC',
        'greensboro, nc': 'Greensboro, NC', 'greensboro, north carolina': 'Greensboro, NC',
        'wilmington, nc': 'Wilmington, NC', 'wilmington, north carolina': 'Wilmington, NC',
        'asheville, nc': 'Asheville, NC', 'asheville, north carolina': 'Asheville, NC',
        'concord, nc': 'Concord, NC', 'gastonia, nc': 'Gastonia, NC',
        'huntersville, nc': 'Huntersville, NC', 'fort mill, sc': 'Fort Mill, SC',
        # TX
        'houston, tx': 'Houston, TX', 'houston, texas': 'Houston, TX',
        'dallas, tx': 'Dallas, TX', 'dallas, texas': 'Dallas, TX',
        'austin, tx': 'Austin, TX', 'austin, texas': 'Austin, TX',
        'san antonio, tx': 'San Antonio, TX', 'fort worth, tx': 'Fort Worth, TX',
        'plano, tx': 'Plano, TX', 'frisco, tx': 'Frisco, TX',
        # CA
        'los angeles, ca': 'Los Angeles, CA', 'la, ca': 'Los Angeles, CA',
        'san francisco, ca': 'San Francisco, CA', 'sf, ca': 'San Francisco, CA',
        'san diego, ca': 'San Diego, CA', 'san jose, ca': 'San Jose, CA',
        'sacramento, ca': 'Sacramento, CA', 'oakland, ca': 'Oakland, CA',
        # TN
        'nashville, tn': 'Nashville, TN', 'nashville, tennessee': 'Nashville, TN',
        'memphis, tn': 'Memphis, TN', 'memphis, tennessee': 'Memphis, TN',
        'knoxville, tn': 'Knoxville, TN', 'chattanooga, tn': 'Chattanooga, TN',
        # OH
        'columbus, oh': 'Columbus, OH', 'columbus, ohio': 'Columbus, OH',
        'cleveland, oh': 'Cleveland, OH', 'cleveland, ohio': 'Cleveland, OH',
        'cincinnati, oh': 'Cincinnati, OH', 'cincinnati, ohio': 'Cincinnati, OH',
        'toledo, oh': 'Toledo, OH', 'akron, oh': 'Akron, OH', 'dayton, oh': 'Dayton, OH',
        # Other major
        'new york, ny': 'New York, NY', 'nyc': 'New York, NY',
        'miami, fl': 'Miami, FL', 'atlanta, ga': 'Atlanta, GA',
        'chicago, il': 'Chicago, IL', 'los angeles': 'Los Angeles, CA',
        'new orleans, la': 'New Orleans, LA', 'denver, co': 'Denver, CO',
        'seattle, wa': 'Seattle, WA', 'boston, ma': 'Boston, MA',
        'phoenix, az': 'Phoenix, AZ', 'las vegas, nv': 'Las Vegas, NV',
    }

    # Try exact city+state patterns first (longest match wins)
    for pattern, label in sorted(CITY_MAP.items(), key=lambda x: -len(x[0])):
        if pattern in text:
            return label

    return ''


def parse_kone_contact(raw, platform):
    """Parse a raw kone.vc contact dict into our standard format."""
    contact_str = raw.get('contact', '')

    # Extract username and platform from contact field
    username = ''
    detected_platform = platform
    email = ''
    for line in contact_str.splitlines():
        line = line.strip()
        if line.startswith('username:'):
            username = line.split(':', 1)[1].strip().lstrip('@')
        elif line.startswith('type:'):
            detected_platform = line.split(':', 1)[1].strip()
        elif line.startswith('email:'):
            email = line.split(':', 1)[1].strip()

    # Parse description field for er/followers
    desc_str = raw.get('description', '')
    er = 0.0
    followers = 0
    bio = ''
    in_bio = False
    bio_lines = []
    for line in desc_str.splitlines():
        stripped = line.strip()
        if stripped.startswith('er:'):
            in_bio = False
            try:
                er = float(stripped.split(':', 1)[1].strip())
            except Exception:
                pass
        elif stripped.startswith('fi:'):
            in_bio = False
            try:
                followers = int(stripped.split(':', 1)[1].strip())
            except Exception:
                pass
        elif stripped.startswith('description:'):
            in_bio = True
            first = stripped.split(':', 1)[1].strip()
            if first:
                bio_lines.append(first)
        elif stripped.startswith('keywords:'):
            in_bio = False
        elif in_bio and stripped:
            bio_lines.append(stripped)

    bio = ' '.join(bio_lines)
    full_bio = bio or raw.get('description', '')
    location = extract_location_from_bio(full_bio) or raw.get('location', '')

    return {
        'name':     raw.get('name', ''),
        'username': username,
        'email':    email,
        'platform': detected_platform or platform,
        'location': location,
        'followers': followers,
        'er':        er,
        'category':  raw.get('category', ''),
        'description': full_bio,
    }


@app.route('/search', methods=['POST'])
def search():
    params = request.get_json(force=True)

    states         = params.get('states', [])
    cities         = params.get('cities', [])
    platforms      = params.get('platforms', ['instagram'])
    category       = params.get('category', '').strip()
    followers_min  = int(params.get('followers_min') or 0)
    followers_max  = int(params.get('followers_max') or 0)

    log('request', {'states': states, 'platforms': platforms,
                    'category': category, 'followers_min': followers_min, 'followers_max': followers_max})

    # SC zone always includes NC
    search_states = list(states)
    if 'South Carolina' in search_states and 'North Carolina' not in search_states:
        search_states.append('North Carolina')

    plat_list = [p.lower() for p in platforms] if platforms else ['instagram']
    effective_category = (category or 'lifestyle').lower()

    # Build location_tags: one per state
    location_tags = []
    if search_states:
        for state in search_states:
            region = KONE_REGIONS.get(state, state.lower().replace(' ', '_'))
            location_tags.append({
                "country": "united_states",
                "macroregion": "north_america",
                "region": region
            })
    else:
        location_tags = [{"country": "united_states", "macroregion": "north_america", "region": ""}]

    # Geo keywords per state — added to description_tags so kone.vc finds people who mention their location in bio
    STATE_DESC_GEO = {
        'South Carolina': ['south carolina', 'charleston', 'columbia sc', 'greenville sc', 'spartanburg', 'myrtle beach'],
        'North Carolina': ['north carolina', 'charlotte nc', 'raleigh nc', 'durham nc', 'asheville nc', 'wilmington nc'],
        'Texas':          ['texas', 'houston tx', 'dallas tx', 'austin tx', 'san antonio tx', 'fort worth tx'],
        'California':     ['california', 'los angeles', 'san francisco', 'san diego', 'bay area', 'socal'],
        'Tennessee':      ['tennessee', 'nashville tn', 'memphis tn', 'knoxville tn', 'chattanooga tn'],
        'Ohio':           ['ohio', 'columbus ohio', 'cleveland ohio', 'cincinnati ohio', 'akron ohio'],
    }

    # Build description_tags: category keywords + geo keywords for requested states
    cat_keywords = CATEGORY_KEYWORDS.get(effective_category, [effective_category, 'influencer', 'content creator'])
    geo_keywords = []
    for state in search_states:
        geo_keywords.extend(STATE_DESC_GEO.get(state, []))

    # Category at weight 1, geo at weight 2 (geo is more specific — rank higher)
    description_tags = (
        [{"tag_value": kw, "tag_weight": 1} for kw in cat_keywords] +
        [{"tag_value": kw, "tag_weight": 2} for kw in geo_keywords]
    )

    # Build category_tags
    category_tags = [effective_category] if effective_category else ["lifestyle"]

    # Build range_tags for followers
    range_tags = [{
        "range_tag_key": "amount_of_followers",
        "min": followers_min if followers_min else -1,
        "max": followers_max if followers_max else -1,
    }]

    # Build per-state location_tags lists (kone.vc ANDs multiple regions — query one state at a time)
    per_state_location_tags = []
    if search_states:
        for state in search_states:
            region = KONE_REGIONS.get(state, state.lower().replace(' ', '_'))
            per_state_location_tags.append([{
                "country": "united_states",
                "macroregion": "north_america",
                "region": region
            }])
    else:
        per_state_location_tags = [[{"country": "united_states", "macroregion": "north_america", "region": ""}]]

    log('kone_params', {
        'states': search_states,
        'category_tags': category_tags,
        'description_tags': description_tags,
    })

    all_contacts = []
    seen_keys = set()

    for platform in plat_list:
        for loc_tags in per_state_location_tags:
            raw_contacts = kone_call(loc_tags, platform, category_tags, description_tags, range_tags)
            log('raw_contacts', {'platform': platform, 'region': loc_tags[0]['region'], 'count': len(raw_contacts)})

            contacts = [parse_kone_contact(c, platform) for c in raw_contacts]

            if states:
                contacts = geo_filter_by_bio(contacts, states)
            log('after_filter', {'platform': platform, 'region': loc_tags[0]['region'], 'count': len(contacts)})

            for c in contacts:
                key = (c.get('username') or c.get('name') or '').lower()
                if key and key not in seen_keys:
                    seen_keys.add(key)
                    all_contacts.append(c)

    log('final', {'total': len(all_contacts)})

    return jsonify({
        "success": True,
        "count": len(all_contacts),
        "contacts": all_contacts,
        "csv": contacts_to_csv(all_contacts),
    })


def geo_filter_by_bio(contacts, states):
    """
    Filter contacts by scanning bio text for geographic keywords.
    Logic:
      1. Build positive keywords for requested states
      2. Build negative keywords for all other US states/cities
      3. For each contact, scan name + bio:
         - Found positive keyword -> keep, set location
         - Found negative keyword (and no positive) -> discard
         - Found nothing -> keep (trust kone.vc region filter)
    """
    effective_states = set(states)
    if 'South Carolina' in effective_states:
        effective_states.add('North Carolina')

    positive_kws = set()
    for state in effective_states:
        info = STATE_GEO.get(state)
        if info:
            positive_kws.update(info['keywords'])

    negative_kws = build_negative_keywords(states)
    # Remove any overlap (positive wins)
    negative_kws -= positive_kws

    result = []
    for c in contacts:
        bio = ' ' + ' '.join([
            (c.get('name') or ''),
            (c.get('description') or ''),
            (c.get('location') or ''),
        ]).lower() + ' '

        # Check positive match
        matched_positive = next((kw for kw in positive_kws if kw in bio), None)
        if matched_positive:
            # Try to set a clean location label
            if not c.get('location') or c['location'].lower() in ('united states', ''):
                for state in effective_states:
                    info = STATE_GEO.get(state)
                    if info and any(kw in bio for kw in info['keywords']):
                        c['location'] = info['label']
                        break
            result.append(c)
            continue

        # Check negative match
        matched_negative = next((kw for kw in negative_kws if kw in bio), None)
        if matched_negative:
            log('geo_reject', {'name': c.get('name'), 'matched': matched_negative})
            continue

        # No geo found in bio — trust kone.vc, keep
        result.append(c)

    return result


def contacts_to_csv(contacts):
    output = io.StringIO()
    fieldnames = ['name', 'username', 'platform', 'location', 'followers', 'er', 'content_text']
    writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction='ignore')
    writer.writeheader()
    for c in contacts:
        handle = (c.get('username') or '').lstrip('@')
        content_text = f"{c.get('category', '')} {c.get('description', '')}".strip()
        writer.writerow({
            'name':         c.get('name', ''),
            'username':     handle,
            'platform':     c.get('platform', 'instagram'),
            'location':     c.get('location') or '',
            'followers':    c.get('followers', ''),
            'er':           c.get('er') or '',
            'content_text': content_text,
        })
    return output.getvalue()


@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "mode": "direct-kone-mcp"})


@app.route('/tools', methods=['GET'])
def get_tools():
    """Show kone.vc tool schema via JSON-RPC."""
    try:
        r = requests.post(KONE_MCP_URL, json={
            "jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}
        }, timeout=15)
        return jsonify(r.json())
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    port = int(os.environ.get('SEARCH_PORT', 5050))
    print(f"Horizons Search Bridge running on http://localhost:{port}")
    print(f"  Mode: direct kone.vc JSON-RPC (no Claude)")
    app.run(port=port, debug=False)
