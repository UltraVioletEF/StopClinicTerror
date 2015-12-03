var map = (function () {
    'use strict';

    var dataEvent, dataTotal, dataPlayback, // underscore template functions
        lastEvent, // holds the last event in the data, so we know when to stop
        timer; // holds interval ID, so user can pause and resume

    var drawMap = function() {
        dataTotal = _.template($('script#dataTotal').html());
        dataEvent = _.template($('script#dataEvent').html());
        dataPlayback = _.template($('script#dataPlayback').html());

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
        this.svg = d3.select('#map').append('svg')
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
            lastEvent = data[data.length - 1];
            console.log('lastEvent', lastEvent);

            calculateTotal(data);
            drawCircles(data);
            startAnimation(data);
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
            .on("mouseover", updateData)
            .classed("hidden", true);
    };

    var updateData = function(d) {
        if (d.properties.city && d.properties.state) {
            var state_abbr = states_hash[d.properties.state];
            d.properties.location = d.properties.city;
            if (state_abbr) {
                d.properties.location += ', ' + state_abbr;
            }
        } else {
            d.properties.location = d.properties.state;
        }
        var text = dataEvent(d.properties);
        $('#data').html(text);
    };

    var startAnimation = function(data) {
        var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Nov', 'Dec'];
        var years = [1995, 1996, 1997, 1998, 1999, 2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008,
                    2009, 2010, 2011, 2012, 2013, 2014, 2015];

        var y = 0;
        var m = 0;
        var duration = 100; // in ms, so total animation takes ~24 seconds to play 

        timer = setInterval(function() {
            // get year & month for interval
            var year = years[y];
            var month = months[m || 0];

            // advance counter
            m = (m+1);
            if (m >= months.length) {
                y = y+1;
                m = 0;
            }

            // filter for matching attacks
            var attacks = d3.selectAll('circle')
                .filter(function(d) {
                    var date = new Date(d.properties.date);
                    return ((date.getUTCFullYear() === year) && (date.getUTCMonth() === m));
                });

            d3.selectAll('circle.active')
                .classed('active', false);
            // unset previous iteration colors

            attacks
                .classed('hidden', false)
                .classed('active', true);
                // transition radius on show?

            var attacksData = attacks.data();
            var summary = {
                month: month,
                year: year,
                attacks: attacksData.length,
                deaths: d3.sum(attacksData, function(d) { return d.properties.killed; }),
                injured: d3.sum(attacksData, function(d) { return d.properties.injured; })
            };

            // update summary with total for month
            var summaryText = dataPlayback(summary);
            $('#playback').html(summaryText);

            // display last event in month
            var lastEventInMonth;
            if (attacksData.length > 0) {
                lastEventInMonth = attacksData[attacksData.length - 1];
                updateData(lastEventInMonth);
            }

            // end when through last event          
            if (lastEventInMonth && lastEventInMonth.properties.date === lastEvent.properties.date) {
                window.clearInterval(timer);
                d3.selectAll('circle.active')
                    .classed('active', false);
            }
        }, duration);

    };

    return {
        draw: drawMap,
        start: startAnimation,
        //pause: pauseAnimation,
        //reset: resetAnimation
    };
})();