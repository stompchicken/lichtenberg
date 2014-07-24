if(typeof exports == 'undefined'){
    var exports = this['lichtenberg'] = {};
}



// -----------------------------------------------------------------------------
// Field

function Cell(x, y, z, index, value) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.index = index;
    this.value = value;
}

function distance(c1, c2) {
    var dx = (c1.x - c2.x);
    var dy = (c1.y - c2.y);
    var dz = (c1.z - c2.z);
    return Math.sqrt(dx*dx + dy*dy + dz*dz);
}

// dim = [xspan, yspan, zspan]
function Field(dim) {
    this.dim = dim;
    this.finished = false;

    // index -> cell
    this.cells = {};
    this.frontier = {};

    // Some cached frontier values
    this.frontierMax = -Number.MAX_VALUE;
    this.frontierMin = Number.MAX_VALUE;
    this.frontierSize = 0;
}

Field.prototype.checkBounds = function(cell) {
    return cell.x >= 0 && cell.x < this.dim[0] &&
        cell.y >= 0 && cell.y < this.dim[1] &&
        cell.z >= 0 && cell.z < this.dim[2];
}

Field.prototype.makeCell = function(x, y, z, value) {
    return new Cell(x, y, z, (z*this.dim[0]*this.dim[1]) + (y*this.dim[0]) + x, value);
}

Field.prototype.addCell = function(cell) {
    if(!this.checkBounds(cell)) {
        throw "Out-of-bounds cell passed to addCell: "+cell;
    }

    var index = cell.index;

    // Add to structure
    this.cells[index] = cell

    // Remove from frontier
    delete this.frontier[index];

    // Update current frontier values with new cell on the structure
    for(c in this.frontier) {
        var f = this.frontier[c];
        f.value += 1.0 - cell.value * (0.5 / distance(cell, f.value));
    }

    // Add adjacent cells to frontier
    for(var dx=-1; dx<=1; dx++) {
        for(var dy=-1; dy<=1; dy++) {
            for(var dz=-1; dz<=1; dz++) {
                if(dx == 0 && dy == 0 && dz == 0) continue;
                var newCell = this.makeCell(cell.x+dx, cell.y+dy, cell.z+dz, 0.0);
                if(this.checkBounds(newCell)) {
                    this.addFrontier(newCell);
                }
            }
        }
    }
};

// Add a cell to the frontier
Field.prototype.addFrontier = function(cell) {
    if(!this.checkBounds(cell)) {
        throw "Out-of-bounds cell passed to addFrontier: "+cell;
    }

    var index = cell.index;

    if(this.cells[index] || this.frontier[index]) {
        // Adding cells in structure or cells already in the
        // frontier is a no-op
        return;
    }

    // Value is inversely proportional to distance from all points
    // on the structure
    var v = 0;
    for(h in this.cells) {
        v += 1.0 - this.cells[h].value * (0.5 / distance(cell, this.cells[h]));
    }
    cell.value = v;
    this.frontier[index] = cell;

    // Update cached frontier values
    this.frontierMin = Math.min(v, this.frontierMin);
    this.frontierMax = Math.max(v, this.frontierMax);
    this.frontierCount += 1;
};

// Sample a cell from the frontier
Field.prototype.sample = function(power) {
    var min = this.frontierMin;
    var max = this.frontierMax;
    var range = max - min;

    if(range <= 0.001) {
        // For very narrow value ranges, sample uniformly
        var s = Math.random() * total;
        for(h in this.frontier) {
            s -= 1.0;
            if(s <= 0) {
                return this.frontier[h];
            }
        }
    } else {
        var sum = 0.0;
        for(h in this.frontier) {
            sum += Math.pow((this.frontier[h].value - min) / range, power);
        }
        var s = Math.random() * sum;
        for(h in this.frontier) {
            s -= Math.pow((this.frontier[h].value - min)/range, power);
            if(s <= 0) {
                return this.frontier[h];
            }
        }
    }

    throw "Field.sample() failed";
}

function FieldView(field, scene) {
    this.field = field;

    this.object = new THREE.Object3D();
    scene.add(this.object);

    this.showBoundingBox = true;
    this.showCells = true;
    this.showFrontier = true;
}

FieldView.prototype.update = function(scene) {

    // Generate bounding box
    scene.remove(this.boundingBoxObject);
    this.boundingBoxObject = new THREE.Object3D();
    if(this.showBoundingBox) {
        this.boundingBox = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 1.0),
                                          new THREE.MeshBasicMaterial());
        var boxOutline = new THREE.BoxHelper(this.boundingBox);
        boxOutline.material.color.setRGB(0.5, 0.5, 0.5);
        this.boundingBoxObject.add(boxOutline);
    }
    scene.add(this.boundingBoxObject);


    var size = new THREE.Vector3(1.0 / this.field.dim[0],
                                 1.0 / this.field.dim[1],
                                 1.0 / this.field.dim[2]);

    // Generate cells
    scene.remove(this.cellObject);
    this.cellObject = new THREE.Object3D();
    if(this.showCells) {
        for(k in this.field.cells) {
            var cell = this.field.cells[k]
            var cube = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z),
                                      new THREE.MeshBasicMaterial());
            cube.position.set(-0.5 + (size.x/2.0) + cell.x*size.x,
                              -0.5 + (size.y/2.0) + cell.y*size.y,
                              -0.5 + (size.z/2.0) + cell.z*size.z);
            cube.material.color.setHSL(-0.25*(cell.value-1.0), 0.5, 0.5);
            var outline = new THREE.BoxHelper(cube);
            outline.material.color.setRGB(1.0, 1.0, 1.0);
            outline.material.linewidth = 2;
            this.cellObject.add(outline);
            // Adding cube after boxhelper works around weird bug in
            // three.js - reports that it is fixed are all lies
            // https://github.com/mrdoob/three.js/issues/4506
            this.cellObject.add(cube);
        }
    }
    scene.add(this.cellObject);

    // Generate frontier
    scene.remove(this.frontierObject);
    this.frontierObject = new THREE.Object3D();
    if(this.showFrontier) {
        for(k in this.field.frontier) {
            var cell = this.field.frontier[k]
            var cube = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z),
                                      new THREE.MeshBasicMaterial({transparent: true, opacity: 0.5}));
            cube.position.set(-0.5 + (size.x/2.0) + cell.x*size.x,
                              -0.5 + (size.y/2.0) + cell.y*size.y,
                              -0.5 + (size.z/2.0) + cell.z*size.z);
            cube.material.color.setHSL(-0.25*(cell.value-1.0), 0.5, 0.5);
            var outline = new THREE.BoxHelper(cube);
            outline.material.color.setRGB(0.5, 0.5, 0.5);
            this.frontierObject.add(outline);
            // Adding cube after boxhelper works around weird bug in
            // three.js - reports that it is fixed are all lies
            // https://github.com/mrdoob/three.js/issues/4506
            this.frontierObject.add(cube);
        }
        scene.add(this.frontierObject);
    }
}

exports.Field = Field

// -----------------------------------------------------------------------------
// Filter
/*
function Filter(width, height) {
    this.width = width;
    this.height = height;

    var params = {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBFormat,
        stencilBuffer: false
    };

    this.target1 = new THREE.WebGLRenderTarget(width, height, params);
    this.target2 = new THREE.WebGLRenderTarget(width, height, params);
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.scene = new THREE.Scene();
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.passes = new Array();

    this.scene.add(this.quad);

    this.addPass = function(filterPass) {
        this.passes.push(filterPass);
    }

    this.render = function(renderer, scene, camera) {
        if(this.passes.length == 0) {
            renderer.render(scene, camera);
            return;
        }

        renderer.render(scene, camera, this.target1);

        var t1 = this.target1;
        var t2 = this.target2;

        for(var i=0; i<this.passes.length-1; i++) {
            this.passes[i].material.uniforms["tDiffuse"].value = t1;
            this.quad.material = this.passes[i].material;

            renderer.render(this.scene, this.camera, t2, false);
            t1 = t2;
            t2 = t1;
        }

        var i = this.passes.length-1;
        this.passes[i].material.uniforms['tDiffuse'].value = t1;
        this.quad.material = this.passes[i].material;
        renderer.render(this.scene, this.camera);
    }
};

function HorizontalBlur(windowSize) {

    this.material = new THREE.ShaderMaterial({
        uniforms: {
            "tDiffuse": { type: "t", value: null },
            "h":        { type: "f", value: windowSize }
        },
        vertexShader: [
            "varying vec2 vUv;",
            "void main() {",
            "vUv = uv;",
            "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",
            "}"
        ].join("\n"),
        fragmentShader: [
            "uniform sampler2D tDiffuse;",
            "uniform float h;",
            "varying vec2 vUv;",
            "void main() {",
            "vec4 sum = vec4( 0.0 );",
            "sum += texture2D( tDiffuse, vec2( vUv.x - 4.0 * h, vUv.y ) ) * 0.01;",
            "sum += texture2D( tDiffuse, vec2( vUv.x - 3.0 * h, vUv.y ) ) * 0.05;",
            "sum += texture2D( tDiffuse, vec2( vUv.x - 2.0 * h, vUv.y ) ) * 0.1;",
            "sum += texture2D( tDiffuse, vec2( vUv.x - 1.0 * h, vUv.y ) ) * 0.2;",
            "sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y ) ) * 0.8;",
            "sum += texture2D( tDiffuse, vec2( vUv.x + 1.0 * h, vUv.y ) ) * 0.2;",
            "sum += texture2D( tDiffuse, vec2( vUv.x + 2.0 * h, vUv.y ) ) * 0.1;",
            "sum += texture2D( tDiffuse, vec2( vUv.x + 3.0 * h, vUv.y ) ) * 0.05;",
            "sum += texture2D( tDiffuse, vec2( vUv.x + 4.0 * h, vUv.y ) ) * 0.01;",
            "gl_FragColor = sum;",
            "}"
        ].join("\n")
    });
}

function VerticalBlur(windowSize) {
    this.material = new THREE.ShaderMaterial({
        uniforms: {
            "tDiffuse": { type: "t", value: null },
            "v":        { type: "f", value: windowSize }
        },
        vertexShader: [
            "varying vec2 vUv;",
            "void main() {",
            "vUv = uv;",
            "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",
            "}"
        ].join("\n"),
        fragmentShader: [
            "uniform sampler2D tDiffuse;",
            "uniform float v;",
            "varying vec2 vUv;",
            "void main() {",
            "vec4 sum = vec4( 0.0 );",
            "sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 4.0 * v ) ) * 0.01;",
            "sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 3.0 * v ) ) * 0.05;",
            "sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 2.0 * v ) ) * 0.1;",
            "sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 1.0 * v ) ) * 0.2;",
            "sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y ) ) * 0.8;",
            "sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 1.0 * v ) ) * 0.2;",
            "sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 2.0 * v ) ) * 0.1;",
            "sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 3.0 * v ) ) * 0.05;",
            "sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 4.0 * v ) ) * 0.01;",
            "gl_FragColor = sum;",
            "}"
        ].join("\n")}
    );
}

exports.Filter = Filter
exports.HorizontalBlur = HorizontalBlur
exports.VerticalBlur = VerticalBlur

// -----------------------------------------------------------------------------
// APSF


function APSF() {

    this.filter = function(size, T, mu) {

        var q = 0.9;
        var k = 0.025;

        



    }

    this.kernel = function(I0, T, mu, M, q) {
        var sum = 0.0;
        for(var m=0; m<M; m++) {
            sum += (this.g(I0, T, m, q) + this.g(I0, T, m+1, q)) * this.legendre(m, mu);
        }
        return sum;
    };

    this.g = function(I0, T, m, q) {
        if(m == 0) {
            return 0.0;
        } else {
            var beta = ((2.0*m+1)/m)*(1 - Math.pow(q, m-1));
            return I0 * Math.exp((-beta*T) - (m+1)*Math.log(T));
        }
    }

    this.legendre = function(m, x) {
        if(m == 0) {
            return 1.0;
        } else if (m == 1.0) {
            return x;
        } else {

            var memo = [];
            memo.length = m+1;
            memo[0] = 1.0;
            memo[1] = x;
            for(var i=2; i<=m; i++) {
                memo[i] = (((2.0*i-1)*x*memo[i-1]) - (i-1)*memo[i-2]) / i;
            }
            return memo[m];
        }
    };

    

};
*/
