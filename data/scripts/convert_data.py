import requests, os, csv, json
MAPZEN_KEY = os.environ['MAPZEN_KEY']


def geocode(query):
    print "geocoding", query
    payload = {
        'api_key': MAPZEN_KEY,
        'text': query,
        'layer': 'coarse',
        'size': 1  # just one, please
    }
    r = requests.get('https://search.mapzen.com/v1/search', params=payload)
    try:
        match = r.json()['features'][0]
        return match['geometry'].get('coordinates')
    except (ValueError, IndexError):
        return False


def geojson(item):
    location = item.get('state')
    if item.get('city') and item.get('state'):
        location = '%s, %s' % (item['city'], item['state'])
    coordinates = geocode(location)

    feature = {
        "type": "Feature",
        "properties": {
            "date": item.get('date'),
            "city": item.get('city'),
            "state": item.get('state'),
            "killed": item.get('killed', 0),
            "injured": item.get('inured', 0),
            "type": item.get('type'),
            "description": item.get('description')
        }
    }
    if coordinates:
        feature['geometry'] = {
            "type": "Point",
            "coordinates": coordinates
        }
    return feature


def main():
    # converts CSV to geoJSON
    # looking up coordinates for location

    items = []
    with open('raw/google_sheet.csv', 'r') as sheet:
        for row in csv.DictReader(sheet):
            items.append(geojson(row))

    collection = {
        "type": "FeatureCollection",
        "features": items
    }

    with open("attacks.geojson", 'w') as json_file:
        json_file.write(json.dumps(collection, indent=4))

if __name__ == '__main__':
    main()
