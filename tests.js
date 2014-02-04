test("distance", function() {
    equal(distance(new Cell(1, 0), new Cell(2, 0)), 1);
    equal(distance(new Cell(0, 0), new Cell(1, 1)), Math.sqrt(2));
});

test("Field::source add/get", function() {
    var source = new Field(32, 32);
    var cell = new Cell(16, 16);
    source.addSource(cell);
    ok(source.getSource().indexOf(cell) > -1);
});

test("Field::frontier", function() {
    var field = new Field(32, 32);
    var cell1 = new Cell(16, 16);
    field.addSource(cell1, null);

    var frontier = field.getSourceFrontier();
    var valueFunction = function(c1, c2) {
        return 1.0 - (0.5 / distance(c1, c2));
    }

    equal(8, frontier.length);
    for(var i=0; i<frontier.length; i++) {
        equal(frontier[i].value, valueFunction(frontier[i].cell, cell1));
    }

    var sample1 = field.sampleSourceFrontier(2.0);
    equal(sample1.parent.x, 16);
    equal(sample1.parent.y, 16);

    var cell2 = new Cell(15, 16);
    field.addSource(cell2, cell1);
    var frontier = field.getSourceFrontier();
    equal(frontier.length, 10);
    for(var i=0; i<frontier.length; i++) {
        equal(frontier[i].value, valueFunction(frontier[i].cell, cell1) +
                                 valueFunction(frontier[i].cell, cell2));
    }

    var channels = field.getChannels();
    equal(1, channels.length);
    equal(2, channels[0].length);
    equal(16, channels[0][0].x);
    equal(16, channels[0][0].y);
    equal(15, channels[0][1].x);
    equal(16, channels[0][1].y);
});




