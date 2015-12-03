var map = (function () {
    'use strict';

    var dataTotal, dataYear, dataRow, dataEvent, dataDescription, // underscore template functions
        timer, // holds interval ID, so user can pause and resume
        animating; // is the animation currently playing?

    var drawMap = function() {
        dataTotal = _.template($('script#dataTotal').html(), {variable: 'd'});
        dataYear = _.template($('script#dataYear').html(), {variable: 'd'});
        dataRow = _.template($('script#dataRow').html(), {variable: 'd'});
        dataEvent = _.template($('script#dataEvent').html(), {variable: 'd'});
        dataDescription = _.template($('script#dataDescription').html(), {variable: 'd'});

        var width = 768,
            height = 500;
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
            .attr('viewBox', '0 0 '+width+' '+height)
            .classed('svg-content-responsive', true);

        this.svg.append('rect')
            .attr('class', 'background')
            .attr('width', width)
            .attr('height', height);

        this.map = this.svg.append('g');

        d3.json("data/us-states.json", function(error, us) {
          if (error) return console.error(error);
          
          self.map.append("path")
              .datum(us)
              .attr("d", self.path)
              .classed('border', true);
        });

        d3.json("data/attacks.json", function(error, attacks) {
            if (error) return console.error(error);

            var data = _.sortBy(attacks.features,
                function(d) { return (d.properties.date); }
            );

            calculateTotal(data);
            drawCircles(data);
            startAnimation(data);

            //d3.selectAll('circle')
            //    .classed('hidden', false);
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
            .on("mouseover", function(d) {
                console.log("animating", animating);
                if (!animating) { updateData(d); }
            })
            .classed("hidden", true);
    };

    var updateData = function(d) {
        d.properties.location = getLocation(d);
        var text = dataDescription(d.properties);
        $('#data .description').html(text);
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

    var startAnimation = function(data) {
        animating = true;

        var firstDate = new Date(data[0].properties.date);
        var lastDate = new Date(data[data.length - 1].properties.date);

        var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Nov', 'Dec'];
        var years = d3.time.years(firstDate, lastDate, 1); // year boundary dates

        var y = 0;
        var i = 0;
        var duration = 300; // in ms: each event display time, so total animation takes ~30 seconds to play 

        // group attacks by year
        var grouped = d3.nest()
            .key(function(d) { return (new Date(d.properties.date)).getUTCFullYear(); })
            .map(data);

        // add first year to playback
        $('.playback').prepend(dataYear({year: years[y].getUTCFullYear()}));

        timer = setInterval(function() {
            var year = years[y].getUTCFullYear(); // eg, 1995
            var eventsInYear = grouped[year] || []; // list of events and properties

            // get the event for this interval    
            var e = eventsInYear[i];
            //console.log(e);

            if (e) {
                var eventDate = (new Date(e.properties.date));

                // filter for other attacks in month
                var attacks = d3.selectAll('circle')
                    .filter(function(d) {
                        var date = new Date(d.properties.date);
                        return ((date.getUTCFullYear() === year) &&
                                (date.getUTCMonth() === eventDate.getUTCMonth())
                            );
                    });

                // unset previously active
                d3.selectAll('circle.active')
                    .classed('active', false);
                
                // highlight the events
                attacks
                    .classed('hidden', false)
                    .classed('active', true);

                var attacksData = attacks.data();

                if (attacksData.length > 0) {
                    // update year listing with events

                    if (i%3 === 0) {
                        // prepend new row
                        $('ul.playback li.year').first() // the current year
                            .children('ul') // the event ul
                            .prepend(dataRow());
                    }

                    // append to first row
                    var eventData = _.extend(e.properties, {location: getLocation(e) });
                    var eventText = dataEvent(eventData);
                    $('ul.playback li.year').first() // the current year
                        .children('ul') // the event ul
                        .children('.row').first()
                        .append(eventText);
                }
            }

            // end if at last event
            if ((y >= years.length - 1) && (i >= eventsInYear.length - 1)) {
                console.log('done');
                window.clearInterval(timer);
                d3.selectAll('circle.active')
                    .classed('active', false);

                animating = false;
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
                }
                return true;
            }
        }, duration);

        // end after reasonable duration
        // var failsafe = duration*data.length;
        // console.log(failsafe);
        // setTimeout(function() {
        //     console.log('cancel interval');
        //     window.clearInterval(timer);
        // }, failsafe);

    };

    return {
        draw: drawMap,
        start: startAnimation,
        //pause: pauseAnimation,
        //reset: resetAnimation
    };
})();


// Resolves collisions between d and all other circles.
// http://bl.ocks.org/mbostock/1748247
function collide(alpha) {
  var quadtree = d3.geom.quadtree(nodes);
  return function(d) {
    var r = d.radius + maxRadius + Math.max(padding, clusterPadding),
        nx1 = d.x - r,
        nx2 = d.x + r,
        ny1 = d.y - r,
        ny2 = d.y + r;
    quadtree.visit(function(quad, x1, y1, x2, y2) {
      if (quad.point && (quad.point !== d)) {
        var x = d.x - quad.point.x,
            y = d.y - quad.point.y,
            l = Math.sqrt(x * x + y * y),
            r = d.radius + quad.point.radius + (d.cluster === quad.point.cluster ? padding : clusterPadding);
        if (l < r) {
          l = (l - r) / l * alpha;
          d.x -= x *= l;
          d.y -= y *= l;
          quad.point.x += x;
          quad.point.y += y;
        }
      }
      return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
    });
  };
}