import requests, os, csv, json
MAPZEN_KEY = os.environ['MAPZEN_KEY']


def reverse_lookup(lat, lon):
    print "geocoding", lat, lon,
    payload = {
        'api_key': MAPZEN_KEY,
        'point.lat': lat,
        'point.lon': lon,
        'layer': 'locality',
        'size': 1  # just one, please
    }
    r = requests.get('https://search.mapzen.com/v1/reverse', params=payload)
    try:
        match = r.json()['features'][0]
        city = match['properties'].get('locality')
        state = match['properties'].get('region_a')
        print "got", city, state
        return (city, state)
    except (ValueError, IndexError):
        return False


def main():
    # converts vox JSON back to CSV, for use in collaborative spreadsheet
    # rename fields, normalize dates to YYYY-MM(-DD), reverse lookup lat/lng to city+state

    items = []
    with open('raw/clinic_escort.json', 'r') as in_file:
        tweets = json.load(in_file)

        for t in tweets:
            # parse date
            date_string = t['date']
            if date_string.count('/') == 2:
                (month, day, year) = date_string.split('/')
                date_parts = [year, month, day]
            elif date_string.count('/') == 1:
                (month, year) = date_string.split('/')
                date_parts = [year, month]
            else:
                print "unparsed", date_string
                date_parts = date_string

            date = '-'.join(date_parts)

            item = dict(
                description=t.get('text').encode("utf-8"),
                source_link=t.get('link'),
                date=date,
                type=t.get('type').upper()
            )

            # reverse lookup coordinates
            if t.get('lat') and t.get('lng'):
                (city, state) = reverse_lookup(t['lat'], t['lng'])
                if city:
                    item['city'] = city
                if state:
                    item['state'] = state

            items.append(item)
    with open('raw/clinic_escort.csv', 'w') as out_file:
        header = ['date', 'city', 'state', 'killed', 'injured', 'type', 'description', 'source_link']
        writer = csv.DictWriter(out_file, fieldnames=header)
        writer.writeheader()
        for row in items:
            try:
                writer.writerow(row)
            except Exception, e:
                print "error on", row
        print "wrote", len(items), "lines"


if __name__ == "__main__":
    main()
