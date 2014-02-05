var width, height;
var scene, camera, renderer;

var stats;
var settings;
var frame;

var field;
var lineGeometry;
var lineSize = 10000;
var filter;

var init = function() {
    width = window.innerWidth;
    height = window.innerHeight;

    scene = new THREE.Scene();
    camera = (width > height) ?
        new THREE.OrthographicCamera(-0.6*(width/height), 0.6*(width/height), 0.6, -0.6, 1, 10) :
        new THREE.OrthographicCamera(-0.6, 0.6, 0.6*(height/width), -0.6*(height/width), 1, 10);
    camera.position.z = 5;

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(width, height);

    lineGeometry = new THREE.Geometry();
    var material = new THREE.LineBasicMaterial({
        color: 0xa0c0ff,
        linewidth: 4,
        vertexColors: true});
    for(var i=0; i<lineSize; i++) {
        lineGeometry.vertices.push(new THREE.Vector3(0, 0, 0));
        lineGeometry.colors.push(new THREE.Color(0xffffff))
    }
    var line = new THREE.Line(lineGeometry, material, THREE.LinePieces);
    scene.add(line);

    var container = document.createElement('div');
    document.body.appendChild(container);
    container.appendChild(renderer.domElement);

    stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.top = '0px';
    container.appendChild(stats.domElement);

    settings = {
        reset: function() {
            setup();
        },
        power: 20.0
    };

    var gui = new dat.GUI();
    gui.add(settings, 'reset');
    gui.add(settings, 'power', 0, 1000);
    gui.closed = true;

    setup();
}

var setup = function() {
    frame = 0;

    field = new Field(32, 32);
    field.addSource({x: 16, y: 16});

    for(var i=0; i<lineSize; i++) {
        lineGeometry.vertices[i].set(0, 0, 0);
        lineGeometry.colors[i].setRGB(1, 1, 1);
    }

//    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({color: 0x800000})));
    filter = new Filter(256, 256);
}

var convert = function(pt) {
    return {x: (pt.x / field.width) - 0.5, y: (pt.y / field.height) - 0.5};
};

var render = function () {
    requestAnimationFrame(render);

    if(frame <= 100) {
        var sample = field.sampleSourceFrontier(settings.power);
        field.addSource(sample.cell, sample.parent);

        if(!field.finished) {
            var channels = field.getChannels();
            var vertex = 0;
            for(var i=0; i<channels.length; i++) {

                var channel = channels[i];
                for(var j=1; j<channel.length && vertex < lineSize; j++) {
                    var pt1 = convert(channel[j-1]);
                    var pt2 = convert(channel[j]);
                    lineGeometry.vertices[vertex].set(pt1.x, pt1.y, 0);
                    lineGeometry.vertices[vertex+1].set(pt2.x, pt2.y, 0);
                    vertex += 2;
                }
            }
        }

        lineGeometry.verticesNeedUpdate = true;
        lineGeometry.colorsNeedUpdate = true;
    }

    filter.render(renderer, scene, camera);

    stats.update();
    frame += 1;
};

init();
render();
