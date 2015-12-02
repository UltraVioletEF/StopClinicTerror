# StopClinicTerror.org

A visualization of terrorist attacks on womens health clinics in the US from 1995-2015.

* Sourced from [Wikipedia](https://en.wikipedia.org/wiki/Anti-abortion_violence#Murders), [National Abortion Federation](http://prochoice.org/education-and-advocacy/violence/violence-statistics-and-history/), [NYTimes](http://www.nytimes.com/interactive/2015/11/29/us/30abortion-clinic-violence.html), [DailyDot](http://www.dailydot.com/politics/history-anti-abortion-terrorism-violence-united-states/), [@ClinicEscort](https://storify.com/ClinicEscort/is100enough-how-many) via [Vox](http://www.vox.com/2015/12/1/9827886/abortion-clinic-attacks-mapped), et al.
* Map design &copy; 2015 [UltraViolet](http://weareultraviolet.org)

### Data
Events are stored in a [google spreadsheet](https://docs.google.com/spreadsheets/d/1g8oETfpKJVg1CFt5zSIS0vZdOt2lO0F6Fr8HCi84riw/edit#gid=0&vpid=A1) for collaborative editing.

To download and convert to geojson: `cd data && make`

### Timeline
Uses [D3](http://d3js.org) to render a map and animate display over time.

## Development
```
npm install
grunt
```

Open a browser to localhost:4000 and it will reflect changes made to html, style or script files automatically.

Deploy by committing to the gh-pages branch.
