if(typeof exports == 'undefined'){
    var exports = this['lichtenberg'] = {};
}

function distance(c1, c2) {
    var dx = (c1[0] - c2[0]);
    var dy = (c1[1] - c2[1]);
    var dz = (c1[2] - c2[2]);
    return Math.sqrt(dx*dx + dy*dy + dz*dz);
}

// -----------------------------------------------------------------------------
// Field

// dim = [xspan, yspan, zspan]
function Field(dim) {
    this.dim = dim;
    this.source = new Structure(this);
    this.finished = false;

    this.checkBounds = function(cell) {
        return cell[0] >= 0 && cell[0] < this.dim[0] &&
               cell[1] >= 0 && cell[1] < this.dim[1] &&
               cell[2] >= 0 && cell[2] < this.dim[2];
    }

    this.makeCell(x, y, z) {
        return [x, y, z, (z*this.dim[0]*this.dim[1]) + (y*this.dim[0]) + x]
    }

/*
    this.getChannels = function() {
        // Gather terminal nodes
        var terminals = [];
        for(h in this.source) {
            if(this.source[h].terminal) {
                terminals.push(h);
            }
        }

        // Sort by depth
        terminals.sort(function(a,b){ return b.depth-a.depth; });

        var visited = {}

        // Create channels from root to leaf, deepest first
        var channels = [];
        for(var i=0; i<terminals.length; i++) {
            var channel = [];
            var node = this.source[terminals[i]];
            while(node != null) {
                var hash = this.hashCell(node.cell);
                channel.push({x: node.cell.x + node.jitter[0],
                              y: node.cell.y + node.jitter[1]});

                if(visited[hash]) {
                    break;
                } else {
                    visited[hash] = true
                }

                node = this.source[node.parent];
            }
            channel.reverse();

            channels.push(channel);
        }

        return channels;
    }
*/
}

function Structure(field) {

    this.field = field;
    // index -> cell
    this.cells = {};
    // index -> [value, cell]
    this.frontier = {};

    // Some cached frontier values
    this.frontierMax = -Number.MAX_VALUE;
    this.frontierMin = Number.MAX_VALUE;
    this.frontierSize = 0;

    // Add a cell to the structure
    this.addCell = function(cell) {
        if(!this.field.checkBounds(cell)) {
            throw "Out-of-bounds cell passed to addCell: "+cell;
        }

        var index = cell[3];

        // Add to structure
        this.cells[index] = cell

        // Remove from frontier
        delete this.frontier[index];

        // Update current frontier values
        for(c in this.frontier) {
            var f = this.frontier[c];
            f[0] += 1.0 - (0.5 / distance(cell, f.cell));
        }

        // Add adjacent cells to frontier
        for(var dx=-1; dx<=1; dx++) {
            for(var dy=-1; dy<=1; dy++) {
                for(var dz=-1; dz<=1; dz++) {
                    if(dx != 0 && dy !=0 && dz != 0) {
                        var newCell = this.field.makeCell(cell.x+dx, cell.y+dy, cell.z+dz);
                        this.addFrontier(newCell);
                    }
                }
            }
        }
    };

    // Add a cell to the frontier
    this.addFrontier = function(cell) {
        if(!this.field.checkBounds(cell)) {
            throw "Out-of-bounds cell passed to addFrontier: "+cell;
        }

        var index = cell[3];

        if(this.cells[index] || this.frontier[index]) {
            // Adding cells in structure or cells already in the
            // frontier is a no-op
            return;
        }

        var v = 0;
        for(h in this.cells) {
            v += 1.0 - (0.5 / distance(cell, this.cells[h].cell));
        }

        this.frontierMin = Math.min(v, this.frontierMin);
        this.frontierMax = Math.max(v, this.frontierMax);
        this.frontierCount += 1;

        this.frontier[index] = [v, cell]
    };

    // Sample a cell from the frontier
    this.sample = function(power) {
        var min = this.frontierMin;
        var max = this.frontierMax;
        var range = max - min;

        if(valueRange <= 0.001) {
            // For very narrow value ranges, sample uniformly
            var s = Math.random() * total;
            for(h in this.frontier) {
                s -= 1.0;
                if(s <= 0) {
                    return this.frontier[h][1];
                }
            }
        } else {
            var sum = 0.0;
            for(h in this.frontier) {
                sum += Math.pow((this.frontier[h][0] - min) / range, power);
            }
            var s = Math.random() * sum;
            for(h in this.frontier) {
                s -= Math.pow((this.frontier[h][0] - min)/range, power);
                if(s <= 0) {
                    return this.frontier[h][1];
                }
            }
        }

        throw "sample failed";
    }
}

exports.Field = Field

// -----------------------------------------------------------------------------
// Filter

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
