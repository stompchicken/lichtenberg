var margin = {top: 20, right: 20, bottom: 30, left: 50},
    width = 600 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;

var x = d3.scale.linear()
    .range([0, width]);

var y = d3.scale.linear()
    .range([height, 0]);

var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom");

var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left");

var line = d3.svg.line()
    .x(function(d) { return x(d.theta); })
    .y(function(d) { return y(d.apsf); });

var svg = d3.select("body").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var rangeX = [-180, 180];

var apsfData = function(range, T, M, q) {
    var kernel = new APSF();

    var data = [];
    var maxY = 0.0;
    for(var i=rangeX[0]; i<=rangeX[1]; i+= 1.0) {

        var mu = Math.cos(i*Math.PI/180.0);
        var apsf = kernel.kernel(1.0, T, mu, M, q);
        maxY = Math.max(maxY, apsf);

        data.push({"theta": i, "apsf": apsf});
    }

//    for(var i=0; i<data.length; i++) {
//        data[i].apsf = data[i].apsf / maxY;
//    }

    return data;
}

svg.append("g")
.attr("class", "x axis")
.attr("transform", "translate(0," + height + ")")
.call(xAxis)
.append("text")
.attr("x", width/2)
.attr("dy", "3em")
.text("theta");

var foo = svg.append("g")
.attr("class", "y axis")
.call(yAxis)
.append("text")
.attr("transform", "rotate(-90)")
.attr("y", 6)
.attr("dy", ".71em")
.style("text-anchor", "end")
.text("APSF");


var T = 1.5;
var q = 0.5;
var M = 15;
var data = apsfData(rangeX, T, M, q);

x.domain(rangeX);
//y.domain(d3.extent(data, function(d) { return d.apsf; }));
y.domain([0,10])

$(function() {
    $("#param-T" ).slider({
      orientation: "horizontal",
      range: "min",
      min: 1.0,
      max: 4.0,
      step: 0.01,
      value: T,
      slide: refresh,
      change: refresh,
    });

    $("#param-q" ).slider({
      orientation: "horizontal",
      range: "min",
      min: 0.0,
      max: 1.0,
      step: 0.01,
      value: q,
      slide: refresh,
      change: refresh,
    });

    $("#param-M" ).slider({
      orientation: "horizontal",
      range: "min",
      min: 1.0,
      max: 50.0,
      step: 1.0,
      value: M,
      slide: refresh,
      change: refresh,
    });

    $("#T").val(T);
    $("#q").val(q);
    $("#M").val(M);


});

var thingy = svg.append("path")
.datum(data)
.attr("class", "line")
.style("stroke", "red")
.attr("d", line);

function refresh() {
    T = $("#param-T").slider("value");
    $("#T").val(T);

    q = $("#param-q").slider("value");
    $( "#q" ).val(q);

    M = $("#param-M").slider("value");
    $( "#M" ).val(M);

    data = apsfData(rangeX, T, M, q);

    thingy.datum(data)
        .attr("d", line);
/*
    y.domain(d3.extent(data, function(d) { return d.apsf; }));
    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left");
    foo.call(yAxis);
*/
}

//refresh();
