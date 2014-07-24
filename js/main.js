var width, height;
var scene, camera, renderer;
var controls;

var gui;

var stats;
var settings;
var frame;

var field;
var fieldView;

var lineGeometry;
var lineSize = 10000;
var filter;


// Plan for refactor
// 1. Outlined cube geometry
// 2. Better idea on how to set visibility
// 3. 

var init = function() {
    width = window.innerWidth;
    height = window.innerHeight;

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 4.0;

    controls = new THREE.OrbitControls(camera);
    controls.addEventListener('change', render);

    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setSize(width, height);

    var container = document.createElement('div');
    document.body.appendChild(container);
    container.appendChild(renderer.domElement);

    window.addEventListener( 'resize', onWindowResize, false );

    setup();
    setupGui(container);

}

var setupGui = function(container) {
    stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.top = '0px';
    container.appendChild(stats.domElement);

    settings = {
        step: function() { step(); }
    };

    gui = new dat.GUI();
    var fieldGui = gui.addFolder("field");
    fieldGui.add(fieldView, "showBoundingBox").onChange(function(value) {
        fieldView.showBoundingBox = value;
        fieldView.update(scene);
        render();
    });
    fieldGui.add(fieldView, "showCells").onChange(function(value) {
        fieldView.showCells = value;
        fieldView.update(scene);
        render();
    });;
    fieldGui.add(fieldView, "showFrontier").onChange(function(value) {
        fieldView.showFrontier = value;
        fieldView.update(scene);
        render();
    });;


    gui.add(settings, 'step');
    gui.closed = false;
}


var setup = function() {
    frame = 0;

    var size = 9;
    field = new Field([size, size, size]);

    var cell = field.makeCell((size-1)/2,size-1,(size-1)/2, -1.0);
    field.addCell(cell);

    var cell = field.makeCell((size-1)/2,0,(size-1)/2, 0.0);
//    field.addCell(cell);

    fieldView = new FieldView(field, scene);
    fieldView.update(scene);

    // Add axes at origin
    scene.add(new THREE.AxisHelper(1));
}


function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
    render();
}

function animate() {
    requestAnimationFrame(animate);

    controls.update();
    render();
    stats.update();
}

function render() {
    frame += 1;
    renderer.render(scene, camera);
};

var step = function() {
    var cell = field.sample(10.0);
    console.info(cell);
    cell.value = -1.0;
    field.addCell(cell);
    fieldView.update(scene);
    render();

}

if(!init()) animate();
