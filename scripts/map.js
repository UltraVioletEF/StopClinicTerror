var map = (function () {
    'use strict';

    var dataEvent, dataTotal;

    var drawMap = function() {
        dataEvent = _.template($('script#dataEvent').html());
        dataTotal = _.template($('script#dataTotal').html());

        var width = 960,
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
            startAnimation();
        });
    };

    var calculateTotal = function(data) {
        console.log(data);
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
            .on('mouseover', updateData);
    };

    var updateData = function(d) {
        var text = dataTemplate(d.properties);
        $('#data').html(text);
    };

    var startAnimation = function() {

    };

    return {
        draw: drawMap,
        start: startAnimation,
        //pause: pauseAnimation,
        //reset: resetAnimation
    };
})();