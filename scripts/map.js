var map = (function () {
    'use strict';

    var dataEvent, dataTotal;

    var drawMap = function() {
        dataEvent = _.template($('script#dataEvent').html());
        dataTotal = _.template($('script#dataTotal').html());

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
            calculateTotal(attacks.features);
            drawCircles(attacks.features);
            startAnimation(attacks.features);
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
        console.log(data);

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
            .on("mouseover", updateData);
            //.classed("hidden", true);
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

        var grouped = d3.nest()
            .key(function(d) { return parseInt((new Date(d.properties.date)).getUTCFullYear()); })
            .key(function(d) { return parseInt((new Date(d.properties.date)).getUTCMonth()); })
            .entries(data);

        console.log(grouped);

        for (var y in years) {
            var year = years[y];
            for (var m in months) {
                //console.log(m);
                //d3.selectAll()
            }
        }

    };

    return {
        draw: drawMap,
        start: startAnimation,
        //pause: pauseAnimation,
        //reset: resetAnimation
    };
})();