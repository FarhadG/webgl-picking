var VSHADER_SOURCE = [
    'attribute vec4 a_Position;',
    'attribute vec4 a_Color;',
    'attribute vec4 a_Normal;',
    'uniform mat4 u_MvpMatrix;',
    'uniform mat4 u_ModelMatrix;',
    'uniform mat4 u_NormalMatrix;',
    'varying vec4 v_Color;',
    'varying vec3 v_Normal;',
    'varying vec3 v_Position;',
    'void main() {',
        'gl_Position = u_MvpMatrix * a_Position;',
        'v_Position  = vec3(u_ModelMatrix * a_Position);',
        'v_Normal    = normalize(vec3(u_NormalMatrix * a_Normal));',
        'v_Color     = a_Color;',
    '}',
].gl();

var FSHADER_SOURCE = [
    'precision mediump float;',
    'uniform vec3 u_LightColor;',
    'uniform vec3 u_LightDirection;',
    'uniform vec3 u_Ambient;',
    'uniform bool u_Clicked;',
    'varying vec3 v_Normal;',
    'varying vec3 v_Position;',
    'varying vec4 v_Color;',
    'void main() {',
        'vec3 normal         = normalize(v_Normal);',
        'vec3 lightDirection = normalize(u_LightDirection - v_Position);',
        'float nDotL         = max(dot(lightDirection, normal), 0.0);',
        'vec3 diffuse        = u_LightColor * v_Color.rgb * nDotL;',
        'vec3 ambient        = u_Ambient * v_Color.rgb;',
        'if (u_Clicked) {',
            'gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);',
        '} else {',
            'gl_FragColor = vec4(diffuse + ambient, v_Color.a);',
        '}',
    '}',
].gl();

function main() {
    var alertMessage = true;
    var visualHit    = true;
    var canvas    = document.getElementById('webgl');
    canvas.height = window.innerHeight;
    canvas.width  = window.innerWidth;
    var gl        = getWebGLContext(canvas);
    initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    // Model View Projection Matrix
    var u_MvpMatrix = gl.getUniformLocation(gl.program, 'u_MvpMatrix');
    var mvpMatrix   = new Matrix4();

    // View Projection Matrix
    var vpMatrix   = new Matrix4();
    vpMatrix.setPerspective(20, canvas.width/canvas.height, 1, 100);
    vpMatrix.lookAt(6, 6, 14, 0, 0, 0, 0, 1, 0);

    // Clicked
    var u_Clicked = gl.getUniformLocation(gl.program, 'u_Clicked');
    gl.uniform1i(u_Clicked, 0);

    // Mouse Click
    canvas.onmousedown = function(ev) {
        var x    = ev.clientX, y = ev.clientY;
        var rect = ev.target.getBoundingClientRect();
        if (rect.left <= x && x < rect.right && rect.top <= y && y < rect.bottom) {
            x = x - rect.left, y = rect.bottom - y;
            check(x, y, gl, n, u_Clicked, currentAngle, vpMatrix, u_ModelMatrix, modelMatrix, mvpMatrix, u_MvpMatrix, u_NormalMatrix, normalMatrix, alertMessage, visualHit);
        }
    }

    // Model Matrix
    var u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
    var modelMatrix   = new Matrix4();

    // Normal Matrix
    var u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
    var normalMatrix = new Matrix4();

    // Lighting
    var u_LightColor     = gl.getUniformLocation(gl.program, 'u_LightColor');
    var u_LightDirection = gl.getUniformLocation(gl.program, 'u_LightDirection');
    var u_Ambient = gl.getUniformLocation(gl.program, 'u_Ambient');
    gl.uniform3f(u_LightColor, 1.0, 1.0, 1.0);
    gl.uniform3f(u_LightDirection, 17.3, 8.0, 10.5);
    gl.uniform3f(u_Ambient, 0.4, 0.4, 0.4);

    var n = initVertexBuffers(gl);
    var currentAngle = 0.0;
    function tick() {
        currentAngle = animate(currentAngle);
        draw(gl, n, currentAngle, vpMatrix, u_ModelMatrix, modelMatrix, mvpMatrix, u_MvpMatrix, u_NormalMatrix, normalMatrix);
        requestAnimationFrame(tick, canvas);
    }
    tick();
}


function check(x, y, gl, n, u_Clicked, currentAngle, vpMatrix, u_ModelMatrix, modelMatrix, mvpMatrix, u_MvpMatrix, u_NormalMatrix, normalMatrix, alertMessage, visualHit) {
    var picked = false;
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.uniform1i(u_Clicked, 1);
    draw(gl, n, currentAngle, vpMatrix, u_ModelMatrix, modelMatrix, mvpMatrix, u_MvpMatrix, u_NormalMatrix, normalMatrix);
    var pixels = new Uint8Array(4);
    gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    var isWhite = pixels[0] == 255 && pixels[1] == 255 && pixels[2] == 255;
    if (isWhite) picked = true;
    if (picked) {
        if (!visualHit) {
            gl.clearColor(1.0, 1.0, 1.0, 1.0);
            gl.uniform1i(u_Clicked, 0);
            draw(gl, n, currentAngle, vpMatrix, u_ModelMatrix, modelMatrix, mvpMatrix, u_MvpMatrix, u_NormalMatrix, normalMatrix);
        }
        if (alertMessage) alert("Geometry was clicked!");
    } else {
        gl.clearColor(1.0, 1.0, 1.0, 1.0);
        gl.uniform1i(u_Clicked, 0);
        draw(gl, n, currentAngle, vpMatrix, u_ModelMatrix, modelMatrix, mvpMatrix, u_MvpMatrix, u_NormalMatrix, normalMatrix);
    }
    return picked;
}

function draw(gl, n, currentAngle, vpMatrix, u_ModelMatrix, modelMatrix, mvpMatrix, u_MvpMatrix, u_NormalMatrix, normalMatrix) {
    modelMatrix.setRotate(currentAngle, 0.3, 0, 1);
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    mvpMatrix.set(vpMatrix).multiply(modelMatrix);
    gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
    normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);
}

function initVertexBuffers(gl) {
    //    4 ------ 5
    //  / |      / |
    // 0 ------ 1  |
    // |  |     |  |
    // |  7 ----|- 6
    // | /      | /
    // 3 ------ 2
    //
    // v0 = -1.0, 1.0, 1.0,
    // v1 =  1.0, 1.0, 1.0,
    // v2 =  1.0,-1.0, 1.0,
    // v3 = -1.0,-1.0, 1.0,
    // v4 = -1.0, 1.0,-1.0,
    // v5 =  1.0, 1.0,-1.0,
    // v6 =  1.0,-1.0,-1.0,
    // v7 = -1.0,-1.0,-1.0,
    var vertices = new Float32Array([
        -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0,-1.0, 1.0,-1.0,-1.0, 1.0, //front
         1.0, 1.0, 1.0, 1.0,-1.0, 1.0, 1.0,-1.0,-1.0, 1.0, 1.0,-1.0, //right
         1.0, 1.0,-1.0, 1.0,-1.0,-1.0,-1.0,-1.0,-1.0,-1.0, 1.0,-1.0, //back
        -1.0, 1.0, 1.0,-1.0,-1.0, 1.0,-1.0,-1.0,-1.0,-1.0, 1.0,-1.0, //left
         1.0,-1.0, 1.0,-1.0,-1.0, 1.0,-1.0,-1.0,-1.0, 1.0,-1.0,-1.0, //down
        -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0,-1.0,-1.0, 1.0,-1.0, //up
    ]);
    var normals = new Float32Array([
         0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0,
         1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0,
         1.0, 0.0,-1.0, 1.0, 0.0,-1.0, 1.0, 0.0,-1.0, 1.0, 0.0,-1.0,
        -1.0, 0.0, 0.0,-1.0, 0.0, 0.0,-1.0, 0.0, 0.0,-1.0, 0.0, 0.0,
         0.0,-1.0, 0.0, 0.0,-1.0, 0.0, 0.0,-1.0, 0.0, 0.0,-1.0, 0.0,
         0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0,
    ]);
    var colors = new Float32Array([
        1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0,
        1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0,
        1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0,
        1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0,
        1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0,
        1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0,
    ]);
    initArrayBuffer(gl, vertices, 'a_Position', 3);
    initArrayBuffer(gl, normals, 'a_Normal', 3);
    initArrayBuffer(gl, colors, 'a_Color', 3);
    var n = initIndices(gl);
    return n;
}

function initArrayBuffer(gl, data, attribute, num) {
    var a_Attribute = gl.getAttribLocation(gl.program, attribute);
    var buffer      = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.vertexAttribPointer(a_Attribute, num, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Attribute);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
}

function initIndices(gl) {
    var indices = [0, 1, 2, 0, 2, 3];
    for(var i = 0; i < 30; i++) indices.push(indices[i] + 4);
    var indicesArray = new Uint8Array(indices);
    var indexBuffer  = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indicesArray, gl.STATIC_DRAW);
    return indices.length;
}

var ANGLE_STEP = 3.0;
var g_last = Date.now();
function animate(angle) {
    var now      = Date.now();
    var elapsed  = now - g_last;
    g_last       = now;
    var newAngle = angle + (elapsed * ANGLE_STEP / 1000.0);
    return newAngle %= 360;
}
