var map = (function () {
    'use strict';

    var aspectRatio, width, height, // for resizing
        dataTotal, dataYear, dataRow, dataEvent, dataDescription, // underscore template functions
        timer, // holds interval ID, so user can pause and resume
        animating, // is the animation currently playing?
        cachedData;

    // month name lookups
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    var duration = 500; // event display time in ms, 500 means total animation takes ~50 seconds

    var drawMap = function() {
        dataTotal = _.template($('script#dataTotal').html(), {variable: 'd'});
        dataYear = _.template($('script#dataYear').html(), {variable: 'd'});
        dataRow = _.template($('script#dataRow').html(), {variable: 'd'});
        dataEvent = _.template($('script#dataEvent').html(), {variable: 'd'});
        dataDescription = _.template($('script#dataDescription').html(), {variable: 'd'});

        aspectRatio = 500 / 750;
        width = 768;
        height = width * aspectRatio;
        var self = this;

        // map projection: Albers USA
        var projection = d3.geo.albersUsa()
            .scale(1000)
            .translate([width / 2, height / 2]);
        var path = d3.geo.path()
            .projection(projection);
        this.projection = projection;
        this.path = path;

        // responsive SVG
        this.svg = d3.select('#map').insert('svg', ':first-child')
            .attr('preserveAspectRatio', 'xMinYMin meet')
            .attr("width", width) // need to set these for IE
            .attr("height", height)
            .attr("viewBox", "0 0 " + width + " " + height);

        this.svg.append('rect')
            .attr('class', 'background')
            .attr('width', width)
            .attr('height', height);

        this.map = this.svg.append('g');
        setMapSize();
        $(window).resize(setMapSize);

        d3.json("data/96a4c04b.us-states.json", function(error, us) {
          if (error) return console.error(error);
          
          self.map.append("path")
              .datum(us)
              .attr("d", self.path)
              .classed('border', true);
        });

        d3.json("data/7c7cdb75.attacks.json", function(error, attacks) {
            if (error) return console.error(error);

            var data = _.sortBy(attacks.features,
                function(d) { return (d.properties.date); }
            );

            calculateTotal(data);

            // draw circles, but start hidden
            drawCircles(data);
            
            // save data for animation
            cachedData = data;

            // setup restart button
            d3.select('button.restart')
                .on('click', function() {
                    stopAnimation();

                    //clear existing info
                    $('#data .description').empty();
                    $('.playback').empty();
                    d3.selectAll('circle')
                        .classed('hidden', true);

                    // restart animation
                    startAnimation(cachedData);
                });
        });
    };

    var calculateTotal = function(data) {
        var numAttacks = data.length;
        var numKilled = d3.sum(data, function(d) {
            return parseInt(d.properties.killed);
        });
        var numInjured = d3.sum(data, function(d) {
            return parseInt(d.properties.injured);
        });
        $('#totalData').html(
            dataTotal({total: numAttacks, deaths: numKilled, injuries: numInjured})
        );
    };

    var drawCircles = function(data) {
        var radius = d3.scale.sqrt()
            .domain([0, 10])
            .range([7, 14]);

        map.svg.append("g")
            .attr("class", "bubble")
          .selectAll("circle")
            .data(data)
          .enter().append("circle")
            .filter(function(d){
                return !!map.path.centroid(d)[0];
                // filter out points that are outside the projection
            }) 
            .attr("transform", function(d) {
                return "translate(" + map.path.centroid(d) + ")";
            })
            .attr("r", function(d) { return radius(d.properties.killed + d.properties.injured); })
            .style("opacity", 0)
            .classed("hidden", true)
            .on("mouseover", hover)
            .on("touchstart", hover);
    };

    var updateData = function(d) {
        d.properties.location = getLocation(d);
        d.properties.date_string = getDate(d);
        var text = dataDescription(d.properties);
        $('#data .description').html(text).addClass('show');
    };

    var hover = function(d) {
        // don't update if animating
        if (animating || d3.select(this).classed('hidden')) { return false; }

        // unset other active events
        d3.selectAll('circle.active')
            .classed('active', false);
        updateData(d);
    };

    var getDate = function(d) {
        // turn "YYYY-MM(-DD)" into "Month Day Year"
        if (d.properties.date) {
            var parts = d.properties.date.split('-');
            if (parts.length == 1) { return parts[0]; } // year
            else {
                var monthIndex = parseInt(parts[1]) - 1;
                if (parts.length == 2) { return months[monthIndex] + " " + parts[0]; } // month year
                if (parts.length == 3) { return months[monthIndex] + " " + parts[2] + ", " + parts[0];} // month day, year
            }
        }
    };

    var getLocation = function(d) {
        var location;
        if (d.properties.city && d.properties.state) {
            var state_abbr = states_hash[d.properties.state];
            location = d.properties.city;
            if (state_abbr) {
                location += ', ' + state_abbr;
            }
        } else {
            location = d.properties.state;
        }
        return location;
    } ;

    var startAnimation = function() {
        animating = true;
        d3.selectAll('g.bubble').classed('animating', animating);

        var data = cachedData;

        var firstDate = new Date(data[0].properties.date);
        var lastDate = new Date(data[data.length - 1].properties.date);
        var years = d3.time.years(firstDate, lastDate, 1); // year boundary dates

        var y = 0;
        var i = 0;

        // group attacks by year
        var grouped = d3.nest()
            .key(function(d) { return (new Date(d.properties.date)).getUTCFullYear(); })
            .map(data);

        // add first year to playback
        $('.playback').prepend(dataYear({year: years[y].getUTCFullYear()}));
        $('.playback li.year:first').addClass('show');

        timer = setInterval(function() {
            var year = years[y].getUTCFullYear(); // eg, 1995
            var eventsInYear = grouped[year] || []; // list of events and properties

            // get the event for this interval    
            var e = eventsInYear[i];

            if (e) {
                var eventDate = (new Date(e.properties.date));

                // filter for other attacks in month and city
                var attacks = d3.selectAll('circle')
                    .filter(function(d) {
                        var date = new Date(d.properties.date);
                        return ((date.getUTCFullYear() === year) &&
                                (date.getUTCMonth() === eventDate.getUTCMonth()) &&
                                (d.properties.city === e.properties.city)
                            );
                    });

                // unset previously active
                d3.selectAll('circle.active')
                    .classed('active', false);
                
                // highlight the events
                attacks
                    .classed('hidden', false)
                    .classed('active', true);
                attacks.transition(duration)
                    .style('opacity', 1);

                var attacksData = attacks.data();

                if (attacksData.length > 0) {
                    // update year listing with events

                    if (i%3 === 0) {
                        // prepend new row
                        $('.playback .year').first() // the current year
                            .children('.events') // the event ul
                            .prepend(dataRow());
                    }

                    // append to first row
                    var eventData = _.extend(e.properties, {location: getLocation(e) });
                    var eventText = $(dataEvent(eventData));
                    $('.playback .year').first() // the current year
                        .children('.events') // the event ul
                        .children('.row').first()
                        .append(eventText);
                    eventText.addClass('show');
                }
            }

            // end if at last event
            if ((y >= years.length - 1) && (i >= eventsInYear.length - 1)) {
                // stop animation
                window.clearInterval(timer);
                animating = false;

                // show data for final event
                updateData(e);

                // show restart button
                $('button.restart').addClass('show');
                
                return true;
            }

            // advance counter for next iteration
            i = (i+1);
            if (i >= eventsInYear.length) {
                y = y+1;
                i = 0;

                var nextYear = years[y].getUTCFullYear();
                if (grouped[nextYear] && grouped[nextYear].length > 0) {
                    $('.playback').prepend(dataYear({year: nextYear}));
                    $('.playback li.year:first').addClass('show');
                }
                return true;
            }
        }, duration);
    };

    var stopAnimation = function() {
        animating = false;
        d3.selectAll('g.bubble').classed('animating', animating);
        window.clearInterval(timer);
        d3.selectAll('circle')
            .classed('hidden', false);

        // TBD, show all events?
    };

    var setMapSize = function() {
        width = $('#map').width();
        height = width * aspectRatio;
        d3.select('svg').attr('width', width)
            .attr('height', height);
    };

    return {
        draw: drawMap,
        start: startAnimation,
        stop: stopAnimation,
        cache: cachedData
    };
})();
