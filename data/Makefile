all: attacks.json

clean:
	rm -r raw/*.csv

raw/google_sheet.csv:
	mkdir -p $(dir $@)
	curl 'https://docs.google.com/spreadsheets/d/1g8oETfpKJVg1CFt5zSIS0vZdOt2lO0F6Fr8HCi84riw/pub?gid=0&single=true&output=csv' -o $@.download
	mv $@.download $@

attacks.json: raw/google_sheet.csv
	python scripts/convert_data.py