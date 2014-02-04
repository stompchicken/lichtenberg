var width, height;
var scene, camera, renderer;

var stats;
var settings;
var frame;

var field;

var init = function() {
    width = window.innerWidth;
    height = window.innerHeight;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, width/height, 0.1, 1000);

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(width, height);

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
}

var render = function () {
    requestAnimationFrame(render);

    var sample = field.sampleSourceFrontier(2);
    field.addSource(sample.cell, sample.parent);

    if(!field.finished) {
        var channels = field.getChannels();
        for(var i=0; i<channels.length; i++) {
            // Render each channel
        }
    }

    renderer.render(scene, camera);

    stats.update();
    frame += 1;
};

init();
render();
