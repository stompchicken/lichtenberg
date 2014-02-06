// -----------------------------------------------------------------------------
// Field

if(typeof exports == 'undefined'){
    var exports = this['lichtenberg'] = {};
}

function Cell(x, y, index) {
    this.x = x || 0;
    this.y = y || 0;

    this.toString = function() {
        return "["+this.x+","+this.y+"]";
    }
}

function distance(c1, c2) {
    var dx = (c1.x - c2.x);
    var dy = (c1.y - c2.y);
    return Math.sqrt(dx*dx + dy*dy);
}

function uniform(min, max) {
    return Math.random() * (max - min) + min;
}

function jitter(width) {
    return [uniform(-width/2, width/2), uniform(-width/2, width/2)];
}

function Field(width, height)
{
    this.width = width;
    this.height = height;

    // hash -> {cell: Cell, parent: hash, jitter: [x, y]}
    this.source = {};
    // hash -> {value: Float, cell: Cell}
    this.sourceFrontier = {};

    this.sink = {};
    this.sinkFrontier = new Array();

    this.finished = false;

    this.hashCell = function(cell) {
        return (cell.y*this.width) + cell.x;
    }

    this.checkBounds = function(cell) {
        return cell.x >= 0 && cell.x < this.width && cell.y >= 0 && cell.y < this.height;
    }

    this.createNode = function(cell) {
        return {
            cell: cell,
            parent: null,
            jitter: jitter(0.4),
            depth: 0,
            terminal: true
        };
    }

    this.addSink = function(cell) {
        var hash = this.hashCell(cell);
        var node = this.createNode(cell);
        this.sink[hash] = node;
    }

    // parent can be null
    this.addSource = function(cell, parent) {
        if(!this.checkBounds(cell) || (parent != null && !this.checkBounds(parent))) {
            console.error("Out-of-bounds cell passed to addSource");
            return null;
        }

        // Add to source
        var hash = this.hashCell(cell);
        var node = this.createNode(cell);
        if(parent != null) {
            var parentHash = this.hashCell(parent);
            if(!(parentHash in this.source)) {
                console.error("Parent supplied to addSource but is not present")
                return;
            }
            node.parent = parentHash;
            node.depth = this.source[parentHash].depth + 1;
            this.source[parentHash].terminal = false;
        }
        this.source[hash] = node;

        // Remove from frontier
        delete this.sourceFrontier[hash];

        // Update current frontier values
        for(h in this.sourceFrontier) {
            var f = this.sourceFrontier[h];
            f.value += 1.0 - (0.5 / distance(cell, f.cell));
        }

        // Add adjacent cells to frontier
        this.addSourceFrontier(new Cell(cell.x-1, cell.y-1), cell);
        this.addSourceFrontier(new Cell(cell.x,   cell.y-1), cell);
        this.addSourceFrontier(new Cell(cell.x+1, cell.y-1), cell);
        this.addSourceFrontier(new Cell(cell.x+1, cell.y  ), cell);
        this.addSourceFrontier(new Cell(cell.x-1, cell.y  ), cell);
        this.addSourceFrontier(new Cell(cell.x-1, cell.y+1), cell);
        this.addSourceFrontier(new Cell(cell.x  , cell.y+1), cell);
        this.addSourceFrontier(new Cell(cell.x+1, cell.y+1), cell);
    };

    this.getSource = function() {
        var cells = new Array();
        for(h in this.source) {
            cells.push(this.source[h].cell);
        }
        return cells;
    }

    this.addSourceFrontier = function(cell, parent) {
        if(cell.x >= 0 && cell.x < this.width && cell.y >= 0 && cell.y < this.height) {
            var hash = this.hashCell(cell);

            if(!this.source[hash] && !this.sourceFrontier[hash]) {

                v = 0
                for(h in this.source) {
                    v += 1.0 - (0.5 / distance(cell, this.source[h].cell));
                }

                for(h in this.sink) {
//                    console.info(1.0 - (0.5 / distance(cell, this.sink[h].cell)));
                    v += (20.0 / distance(cell, this.sink[h].cell));
                }

                this.sourceFrontier[hash] = {value: v, cell: cell, parent: parent}
            }
        }
    };

    this.getSourceFrontier = function() {
        var cells = new Array();
        for(h in this.sourceFrontier) {
            cells.push(this.sourceFrontier[h]);
        }
        return cells;
    }

    this.sampleSourceFrontier = function(power) {
        var min = 1.0;
        var max = 0.0;
        for(h in this.sourceFrontier) {
            min = Math.min(this.sourceFrontier[h].value, min);
            max = Math.max(this.sourceFrontier[h].value, max);
        }
        var range = max - min;
        var sum = 0.0;
        for(h in this.sourceFrontier) {
            sum += Math.pow((this.sourceFrontier[h].value - min) / range, power);
        }

        var s = Math.random() * sum;
        for(h in this.sourceFrontier) {
            s -= Math.pow((this.sourceFrontier[h].value - min)/range, power);
            if(s <= 0) {
                return {cell: this.sourceFrontier[h].cell, parent: this.sourceFrontier[h].parent}
            }
        }
        console.error("sample failed");
        console.error("min="+min+" max="+max+" sum="+sum+" s="+s);
        return null;
    }

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
}

exports.Cell = Cell
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

    this.target1 = new THREE.WebGLRenderTarget(64, 64, params);
    this.target2 = new THREE.WebGLRenderTarget(64, 64, params);
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.scene = new THREE.Scene();
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.passes = new Array();

    this.scene.add(this.quad);

    this.target1.width = width;
    this.target1.height = height;

    this.target2.width = width;
    this.target2.height = height;

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
            "sum += texture2D( tDiffuse, vec2( vUv.x - 4.0 * h, vUv.y ) ) * 0.5;",
            "sum += texture2D( tDiffuse, vec2( vUv.x - 3.0 * h, vUv.y ) ) * 0.0918;",
            "sum += texture2D( tDiffuse, vec2( vUv.x - 2.0 * h, vUv.y ) ) * 0.25;",
            "sum += texture2D( tDiffuse, vec2( vUv.x - 1.0 * h, vUv.y ) ) * 0.5;",
            "sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y ) ) * 1.0;",
            "sum += texture2D( tDiffuse, vec2( vUv.x + 1.0 * h, vUv.y ) ) * 0.5;",
            "sum += texture2D( tDiffuse, vec2( vUv.x + 2.0 * h, vUv.y ) ) * 0.25;",
            "sum += texture2D( tDiffuse, vec2( vUv.x + 3.0 * h, vUv.y ) ) * 0.1;",
            "sum += texture2D( tDiffuse, vec2( vUv.x + 4.0 * h, vUv.y ) ) * 0.05;",
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
            "sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 4.0 * v ) ) * 0.05;",
            "sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 3.0 * v ) ) * 0.1;",
            "sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 2.0 * v ) ) * 0.25;",
            "sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 1.0 * v ) ) * 0.5;",
            "sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y ) ) * 1.0;",
            "sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 1.0 * v ) ) * 0.5;",
            "sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 2.0 * v ) ) * 0.25;",
            "sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 3.0 * v ) ) * 0.1;",
            "sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 4.0 * v ) ) * 0.05;",
            "gl_FragColor = sum;",
            "}"
        ].join("\n")}
    );
}

exports.Filter = Filter
exports.HorizontalBlur = HorizontalBlur
exports.VerticalBlur = VerticalBlur
