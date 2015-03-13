var VSHADER_SOURCE = [
    'attribute vec4 a_Position;',
    'attribute vec4 a_Color;',
    'attribute vec4 a_Normal;',
    'attribute float a_Face;',
    'uniform mat4 u_MvpMatrix;',
    'uniform mat4 u_ModelMatrix;',
    'uniform mat4 u_NormalMatrix;',
    'uniform int u_PickedFace;',
    'uniform vec3 u_SelectedFaceColor;',
    'uniform bool u_HighlightFace;',
    'varying vec4 v_Color;',
    'varying vec3 v_Normal;',
    'varying vec3 v_Position;',
    'void main() {',
        'gl_Position = u_MvpMatrix * a_Position;',
        'v_Position  = vec3(u_ModelMatrix * a_Position);',
        'v_Normal    = normalize(vec3(u_NormalMatrix * a_Normal));',
        'int face    = int(a_Face);',
        'vec3 color  = (face == u_PickedFace && u_HighlightFace) ? u_SelectedFaceColor : a_Color.rgb;',
        'if (u_PickedFace == -2) {',
            'v_Color = vec4(color, a_Face/255.0);',
        '} else {',
            'v_Color = vec4(color, a_Color.a);',
        '}',
    '}',
].gl();

var FSHADER_SOURCE = [
    'precision mediump float;',
    'uniform vec3 u_LightColor;',
    'uniform vec3 u_LightDirection;',
    'uniform vec3 u_Ambient;',
    'varying vec3 v_Normal;',
    'varying vec3 v_Position;',
    'varying vec4 v_Color;',
    'void main() {',
        'vec3 normal         = normalize(v_Normal);',
        'vec3 lightDirection = normalize(u_LightDirection - v_Position);',
        'float nDotL         = max(dot(lightDirection, normal), 0.0);',
        'vec3 diffuse        = u_LightColor * v_Color.rgb * nDotL;',
        'vec3 ambient        = u_Ambient * v_Color.rgb;',
        'gl_FragColor        = vec4(diffuse + ambient, v_Color.a);',
    '}',
].gl();

function main() {
    var canvas    = document.getElementById('webgl');
    canvas.height = window.innerHeight;
    canvas.width  = window.innerWidth;
    var gl        = getWebGLContext(canvas);
    initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE);
    gl.clearColor(0.1, 0.1, 0.1, 1.0);
    gl.enable(gl.DEPTH_TEST);

    // Model View Projection Matrix
    var u_MvpMatrix = gl.getUniformLocation(gl.program, 'u_MvpMatrix');
    var mvpMatrix   = new Matrix4();

    // View Projection Matrix
    var vpMatrix   = new Matrix4();
    vpMatrix.setPerspective(30, canvas.width/canvas.height, 1, 100);
    vpMatrix.lookAt(6, 6, 14, 0, 0, 0, 0, 1, 0);

    // Clicked
    var u_PickedFace = gl.getUniformLocation(gl.program, 'u_PickedFace');

    var u_SelectedFaceColor = gl.getUniformLocation(gl.program, 'u_SelectedFaceColor');
    gl.uniform3f(u_SelectedFaceColor, 0.94, .76, 0.058);

    var u_HighlightFace = gl.getUniformLocation(gl.program, 'u_HighlightFace');

    // Mouse Click
    canvas.onmousedown = function(ev) {
        var x = ev.clientX, y = ev.clientY;
        var rect = ev.target.getBoundingClientRect();
        if (rect.left <= x && x < rect.right && rect.top <= y && y < rect.bottom) {
            var x_in_canvas = x - rect.left, y_in_canvas = rect.bottom - y;
            var pixels = new Uint8Array(4);
            gl.uniform1i(u_PickedFace, -2);
            draw(gl, n, currentAngle, vpMatrix, u_ModelMatrix, modelMatrix, mvpMatrix, u_MvpMatrix, u_NormalMatrix, normalMatrix);
            gl.readPixels(x_in_canvas, y_in_canvas, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
            gl.uniform1i(u_PickedFace, pixels[3]);
            draw(gl, n, currentAngle, vpMatrix, u_ModelMatrix, modelMatrix, mvpMatrix, u_MvpMatrix, u_NormalMatrix, normalMatrix);
            alertHitMessage(pixels[3], gl, u_HighlightFace);
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
    gl.uniform3f(u_LightDirection, 8.0, 4.0, 2.0);
    gl.uniform3f(u_Ambient, 0.2, 0.2, 0.4);

    var n = initVertexBuffers(gl);
    var currentAngle = 0.0;
    function tick() {
        currentAngle = animate(currentAngle);
        draw(gl, n, currentAngle, vpMatrix, u_ModelMatrix, modelMatrix, mvpMatrix, u_MvpMatrix, u_NormalMatrix, normalMatrix);
        requestAnimationFrame(tick, canvas);
    }
    tick();
}

function alertHitMessage(point, gl, u_HighlightFace) {
    var geometryHit            = true;
    var geometryPlaneHit       = true;
    var geometryPlaneHitVisual = true;

    if (!point) return;
    if (geometryPlaneHitVisual) gl.uniform1i(u_HighlightFace, 1);
    else if (geometryPlaneHit) alert('Side '+point+' was selected');
    else if (geometryHit) alert('Geometry was hit');
}

function draw(gl, n, currentAngle, vpMatrix, u_ModelMatrix, modelMatrix, mvpMatrix, u_MvpMatrix, u_NormalMatrix, normalMatrix) {
    modelMatrix.setRotate(-currentAngle, 0.5 * Math.cos(currentAngle/500) + 0.5, 0, 0.5);
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
    //        0
    //      // \\
    //    3 ----- 4
    //   /       /
    //  1 ----- 2
    // v0 =  0.0, 2.0, 0.0,
    // v1 = -1.0,-1.0, 1.0,
    // v2 =  1.0,-1.0, 1.0,
    // v3 = -1.0,-1.0,-1.0,
    // v4 =  1.0,-1.0,-1.0,
    var vertices = new Float32Array([
        0.0, 2.0, 0.0,-1.0,-1.0, 1.0, 1.0,-1.0, 1.0, //front
        0.0, 2.0, 0.0, 1.0,-1.0, 1.0, 1.0,-1.0,-1.0, //right
        0.0, 2.0, 0.0, 1.0,-1.0,-1.0,-1.0,-1.0,-1.0, //back
        0.0, 2.0, 0.0,-1.0,-1.0,-1.0,-1.0,-1.0, 1.0, //left
        1.0,-1.0, 1.0,-1.0,-1.0, 1.0,-1.0,-1.0,-1.0, //down
        1.0,-1.0, 1.0,-1.0,-1.0,-1.0, 1.0,-1.0,-1.0, //down
    ]);
    var normals = new Float32Array([
         0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, //front
         1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, //right
         0.0, 0.0,-1.0, 0.0, 0.0,-1.0, 0.0, 0.0,-1.0, //back
        -1.0, 0.0, 0.0,-1.0, 0.0, 0.0,-1.0, 0.0, 0.0, //left
         0.0,-1.0, 0.0, 0.0,-1.0, 0.0, 0.0,-1.0, 0.0, //down
         0.0,-1.0, 0.0, 0.0,-1.0, 0.0, 0.0,-1.0, 0.0, //down
    ]);
    var faces = new Uint8Array([
        1, 1, 1,
        2, 2, 2,
        3, 3, 3,
        4, 4, 4,
        5, 5, 5,
        5, 5, 5,
    ]);
    var colors = new Float32Array([
        0.1, 0.7, 0.6, 0.1, 0.7, 0.6, 0.1, 0.7, 0.6,
        0.1, 0.7, 0.6, 0.1, 0.7, 0.6, 0.1, 0.7, 0.6,
        0.1, 0.7, 0.6, 0.1, 0.7, 0.6, 0.1, 0.7, 0.6,
        0.1, 0.7, 0.6, 0.1, 0.7, 0.6, 0.1, 0.7, 0.6,
        0.1, 0.7, 0.6, 0.1, 0.7, 0.6, 0.1, 0.7, 0.6,
        0.1, 0.7, 0.6, 0.1, 0.7, 0.6, 0.1, 0.7, 0.6,
    ]);
    initArrayBuffer(gl, vertices, gl.FLOAT, 'a_Position', 3);
    initArrayBuffer(gl, normals, gl.FLOAT, 'a_Normal', 3);
    initArrayBuffer(gl, colors, gl.FLOAT, 'a_Color', 3);
    initArrayBuffer(gl, faces, gl.UNSIGNED_BYTE, 'a_Face', 1);
    var n = initIndices(gl);
    return n;
}

function initArrayBuffer(gl, data, type, attribute, num) {
    var a_Attribute = gl.getAttribLocation(gl.program, attribute);
    var buffer      = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.vertexAttribPointer(a_Attribute, num, type, false, 0, 0);
    gl.enableVertexAttribArray(a_Attribute);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
}

function initIndices(gl) {
    var indices = [0, 1, 2];
    for(var i = 0; i < 15; i++) indices.push(indices[i] + 3);
    var indicesArray = new Uint8Array(indices);
    var indexBuffer  = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indicesArray, gl.STATIC_DRAW);
    return indices.length;
}

var ANGLE_STEP = 30.0;
var g_last = Date.now();
function animate(angle) {
    var now      = Date.now();
    var elapsed  = now - g_last;
    g_last       = now;
    var newAngle = angle + (elapsed * ANGLE_STEP / 2000.0);
    return newAngle %= 360;
}
