import requests, os, csv, json
MAPZEN_KEY = os.environ.get('MAPZEN_KEY')


def geocode(query):
    print "geocoding", query
    payload = {
        'api_key': MAPZEN_KEY,
        'text': query,
        'boundary.country': 'USA',  # bias search response to USA
        'layer': 'locality',  # limit to cities
        'size': 1  # just one, please
    }
    r = requests.get('https://search.mapzen.com/v1/search', params=payload)
    try:
        match = r.json()['features'][0]
        return match['geometry'].get('coordinates')
    except (ValueError, IndexError):
            return False


def geojson(item):
    feature = {
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": geocode('%s, %s' % (item['city'], item['state']))
        },
        "properties": {
            "date": item.get('date'),
            "city": item.get('city'),
            "state": item.get('state'),
            "killed": int(item.get('killed', 0)),
            "injured": int(item.get('inured', 0)),
            "type": item.get('type'),
            "description": item.get('description')
        }
    }
    return feature


if __name__ == '__main__':
    items = []
    with open('raw/google_sheet.csv', 'r') as sheet:
        for row in csv.DictReader(sheet):
            if row.get('city') and row.get('state'):
                items.append(geojson(row))

    geojson = {
        "type": "FeatureCollection",
        "features": items
    }

    with open("attack.geojson", 'w') as json_file:
        json_file.write(json.dumps(geojson, indent=4))
