var width, height;
var scene, camera, renderer;

var stats;
var settings;
var frame;

var field;
var lineGeometry;
var lineSize = 1000;

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
        power: 2.0
    };

    var gui = new dat.GUI();
    gui.add(settings, 'reset');
    gui.add(settings, 'power', 0, 10);
    gui.closed = true;

    setup();
}

var setup = function() {
    frame = 0;

    field = new Field(64, 64);
    field.addSource({x: 32, y: 32});

    for(var i=0; i<lineSize; i++) {
        lineGeometry.vertices[i].set(0, 0, 0);
        lineGeometry.colors[i].setRGB(1, 1, 1);
    }


    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({color: 0x202020})));
}

var render = function () {
    requestAnimationFrame(render);

    if(frame <= 100) {
        var sample = field.sampleSourceFrontier(2);
        field.addSource(sample.cell, sample.parent);

        if(!field.finished) {
            var channels = field.getChannels();
            var vertex = 0;
            for(var i=0; i<channels.length; i++) {

                var channel = channels[i];
                for(var j=1; j<channel.length; j++) {
                    var pt1 = channel[j-1];
                    var pt2 = channel[j];

                    lineGeometry.vertices[vertex].set(pt1.x*width/64, pt1.y*height/64, 0);
                    lineGeometry.vertices[vertex+1].set(pt2.x*width/64, pt2.y*height/64, 0);
                    vertex += 2;
                }
            }
        }

        lineGeometry.verticesNeedUpdate = true;
        lineGeometry.colorsNeedUpdate = true;

    }

    renderer.render(scene, camera);

    stats.update();
    frame += 1;
};

init();
render();
