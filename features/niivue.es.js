var Shader = function(gl, vertexSrc, fragmentSrc) {
  var self = this;
  this.program = compileShader(gl, vertexSrc, fragmentSrc);
  var regexUniform = /uniform[^;]+[ ](\w+);/g;
  var matchUniformName = /uniform[^;]+[ ](\w+);/;
  this.uniforms = {};
  var vertexUnifs = vertexSrc.match(regexUniform);
  var fragUnifs = fragmentSrc.match(regexUniform);
  if (vertexUnifs) {
    vertexUnifs.forEach(function(unif2) {
      var m = unif2.match(matchUniformName);
      self.uniforms[m[1]] = -1;
    });
  }
  if (fragUnifs) {
    fragUnifs.forEach(function(unif2) {
      var m = unif2.match(matchUniformName);
      self.uniforms[m[1]] = -1;
    });
  }
  for (var unif in this.uniforms) {
    this.uniforms[unif] = gl.getUniformLocation(this.program, unif);
  }
};
Shader.prototype.use = function(gl) {
  gl.useProgram(this.program);
};
var compileShader = function(gl, vert, frag) {
  var vs = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vs, vert);
  gl.compileShader(vs);
  if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
    alert("Vertex shader failed to compile, see console for log");
    console.log(gl.getShaderInfoLog(vs));
    return null;
  }
  var fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fs, frag);
  gl.compileShader(fs);
  if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
    alert("Fragment shader failed to compile, see console for log");
    console.log(gl.getShaderInfoLog(fs));
    return null;
  }
  var program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    alert("Shader failed to link, see console for log");
    console.log(gl.getProgramInfoLog(program));
    return null;
  }
  return program;
};
var ARRAY_TYPE = typeof Float32Array !== "undefined" ? Float32Array : Array;
if (!Math.hypot)
  Math.hypot = function() {
    var y = 0, i = arguments.length;
    while (i--) {
      y += arguments[i] * arguments[i];
    }
    return Math.sqrt(y);
  };
function fromValues$3(m00, m01, m02, m10, m11, m12, m20, m21, m22) {
  var out = new ARRAY_TYPE(9);
  out[0] = m00;
  out[1] = m01;
  out[2] = m02;
  out[3] = m10;
  out[4] = m11;
  out[5] = m12;
  out[6] = m20;
  out[7] = m21;
  out[8] = m22;
  return out;
}
function create$2() {
  var out = new ARRAY_TYPE(16);
  if (ARRAY_TYPE != Float32Array) {
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
  }
  out[0] = 1;
  out[5] = 1;
  out[10] = 1;
  out[15] = 1;
  return out;
}
function clone(a) {
  var out = new ARRAY_TYPE(16);
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  out[4] = a[4];
  out[5] = a[5];
  out[6] = a[6];
  out[7] = a[7];
  out[8] = a[8];
  out[9] = a[9];
  out[10] = a[10];
  out[11] = a[11];
  out[12] = a[12];
  out[13] = a[13];
  out[14] = a[14];
  out[15] = a[15];
  return out;
}
function copy(out, a) {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  out[4] = a[4];
  out[5] = a[5];
  out[6] = a[6];
  out[7] = a[7];
  out[8] = a[8];
  out[9] = a[9];
  out[10] = a[10];
  out[11] = a[11];
  out[12] = a[12];
  out[13] = a[13];
  out[14] = a[14];
  out[15] = a[15];
  return out;
}
function fromValues$2(m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33) {
  var out = new ARRAY_TYPE(16);
  out[0] = m00;
  out[1] = m01;
  out[2] = m02;
  out[3] = m03;
  out[4] = m10;
  out[5] = m11;
  out[6] = m12;
  out[7] = m13;
  out[8] = m20;
  out[9] = m21;
  out[10] = m22;
  out[11] = m23;
  out[12] = m30;
  out[13] = m31;
  out[14] = m32;
  out[15] = m33;
  return out;
}
function identity$1(out) {
  out[0] = 1;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = 1;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = 1;
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;
  return out;
}
function transpose(out, a) {
  if (out === a) {
    var a01 = a[1], a02 = a[2], a03 = a[3];
    var a12 = a[6], a13 = a[7];
    var a23 = a[11];
    out[1] = a[4];
    out[2] = a[8];
    out[3] = a[12];
    out[4] = a01;
    out[6] = a[9];
    out[7] = a[13];
    out[8] = a02;
    out[9] = a12;
    out[11] = a[14];
    out[12] = a03;
    out[13] = a13;
    out[14] = a23;
  } else {
    out[0] = a[0];
    out[1] = a[4];
    out[2] = a[8];
    out[3] = a[12];
    out[4] = a[1];
    out[5] = a[5];
    out[6] = a[9];
    out[7] = a[13];
    out[8] = a[2];
    out[9] = a[6];
    out[10] = a[10];
    out[11] = a[14];
    out[12] = a[3];
    out[13] = a[7];
    out[14] = a[11];
    out[15] = a[15];
  }
  return out;
}
function invert(out, a) {
  var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
  var a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
  var a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
  var a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
  var b00 = a00 * a11 - a01 * a10;
  var b01 = a00 * a12 - a02 * a10;
  var b02 = a00 * a13 - a03 * a10;
  var b03 = a01 * a12 - a02 * a11;
  var b04 = a01 * a13 - a03 * a11;
  var b05 = a02 * a13 - a03 * a12;
  var b06 = a20 * a31 - a21 * a30;
  var b07 = a20 * a32 - a22 * a30;
  var b08 = a20 * a33 - a23 * a30;
  var b09 = a21 * a32 - a22 * a31;
  var b10 = a21 * a33 - a23 * a31;
  var b11 = a22 * a33 - a23 * a32;
  var det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
  if (!det) {
    return null;
  }
  det = 1 / det;
  out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
  out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
  out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
  out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
  out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
  out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
  out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
  out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
  out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
  out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
  out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
  out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
  out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
  out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
  out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
  out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
  return out;
}
function multiply$1(out, a, b) {
  var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
  var a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
  var a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
  var a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
  var b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
  out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[4];
  b1 = b[5];
  b2 = b[6];
  b3 = b[7];
  out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[8];
  b1 = b[9];
  b2 = b[10];
  b3 = b[11];
  out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[12];
  b1 = b[13];
  b2 = b[14];
  b3 = b[15];
  out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  return out;
}
function translate(out, a, v) {
  var x = v[0], y = v[1], z = v[2];
  var a00, a01, a02, a03;
  var a10, a11, a12, a13;
  var a20, a21, a22, a23;
  if (a === out) {
    out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
    out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
    out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
    out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
  } else {
    a00 = a[0];
    a01 = a[1];
    a02 = a[2];
    a03 = a[3];
    a10 = a[4];
    a11 = a[5];
    a12 = a[6];
    a13 = a[7];
    a20 = a[8];
    a21 = a[9];
    a22 = a[10];
    a23 = a[11];
    out[0] = a00;
    out[1] = a01;
    out[2] = a02;
    out[3] = a03;
    out[4] = a10;
    out[5] = a11;
    out[6] = a12;
    out[7] = a13;
    out[8] = a20;
    out[9] = a21;
    out[10] = a22;
    out[11] = a23;
    out[12] = a00 * x + a10 * y + a20 * z + a[12];
    out[13] = a01 * x + a11 * y + a21 * z + a[13];
    out[14] = a02 * x + a12 * y + a22 * z + a[14];
    out[15] = a03 * x + a13 * y + a23 * z + a[15];
  }
  return out;
}
function rotateX(out, a, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  var a10 = a[4];
  var a11 = a[5];
  var a12 = a[6];
  var a13 = a[7];
  var a20 = a[8];
  var a21 = a[9];
  var a22 = a[10];
  var a23 = a[11];
  if (a !== out) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  }
  out[4] = a10 * c + a20 * s;
  out[5] = a11 * c + a21 * s;
  out[6] = a12 * c + a22 * s;
  out[7] = a13 * c + a23 * s;
  out[8] = a20 * c - a10 * s;
  out[9] = a21 * c - a11 * s;
  out[10] = a22 * c - a12 * s;
  out[11] = a23 * c - a13 * s;
  return out;
}
function rotateZ(out, a, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  var a00 = a[0];
  var a01 = a[1];
  var a02 = a[2];
  var a03 = a[3];
  var a10 = a[4];
  var a11 = a[5];
  var a12 = a[6];
  var a13 = a[7];
  if (a !== out) {
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  }
  out[0] = a00 * c + a10 * s;
  out[1] = a01 * c + a11 * s;
  out[2] = a02 * c + a12 * s;
  out[3] = a03 * c + a13 * s;
  out[4] = a10 * c - a00 * s;
  out[5] = a11 * c - a01 * s;
  out[6] = a12 * c - a02 * s;
  out[7] = a13 * c - a03 * s;
  return out;
}
function orthoNO(out, left, right, bottom, top, near, far) {
  var lr = 1 / (left - right);
  var bt = 1 / (bottom - top);
  var nf = 1 / (near - far);
  out[0] = -2 * lr;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = -2 * bt;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = 2 * nf;
  out[11] = 0;
  out[12] = (left + right) * lr;
  out[13] = (top + bottom) * bt;
  out[14] = (far + near) * nf;
  out[15] = 1;
  return out;
}
var ortho = orthoNO;
function create$1() {
  var out = new ARRAY_TYPE(3);
  if (ARRAY_TYPE != Float32Array) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
  }
  return out;
}
function fromValues$1(x, y, z) {
  var out = new ARRAY_TYPE(3);
  out[0] = x;
  out[1] = y;
  out[2] = z;
  return out;
}
function subtract(out, a, b) {
  out[0] = a[0] - b[0];
  out[1] = a[1] - b[1];
  out[2] = a[2] - b[2];
  return out;
}
function normalize(out, a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  var len = x * x + y * y + z * z;
  if (len > 0) {
    len = 1 / Math.sqrt(len);
  }
  out[0] = a[0] * len;
  out[1] = a[1] * len;
  out[2] = a[2] * len;
  return out;
}
(function() {
  var vec = create$1();
  return function(a, stride, offset, count, fn, arg) {
    var i, l;
    if (!stride) {
      stride = 3;
    }
    if (!offset) {
      offset = 0;
    }
    if (count) {
      l = Math.min(count * stride + offset, a.length);
    } else {
      l = a.length;
    }
    for (i = offset; i < l; i += stride) {
      vec[0] = a[i];
      vec[1] = a[i + 1];
      vec[2] = a[i + 2];
      fn(vec, vec, arg);
      a[i] = vec[0];
      a[i + 1] = vec[1];
      a[i + 2] = vec[2];
    }
    return a;
  };
})();
function create() {
  var out = new ARRAY_TYPE(4);
  if (ARRAY_TYPE != Float32Array) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
  }
  return out;
}
function fromValues(x, y, z, w) {
  var out = new ARRAY_TYPE(4);
  out[0] = x;
  out[1] = y;
  out[2] = z;
  out[3] = w;
  return out;
}
function add(out, a, b) {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
  out[2] = a[2] + b[2];
  out[3] = a[3] + b[3];
  return out;
}
function multiply(out, a, b) {
  out[0] = a[0] * b[0];
  out[1] = a[1] * b[1];
  out[2] = a[2] * b[2];
  out[3] = a[3] * b[3];
  return out;
}
function transformMat4(out, a, m) {
  var x = a[0], y = a[1], z = a[2], w = a[3];
  out[0] = m[0] * x + m[4] * y + m[8] * z + m[12] * w;
  out[1] = m[1] * x + m[5] * y + m[9] * z + m[13] * w;
  out[2] = m[2] * x + m[6] * y + m[10] * z + m[14] * w;
  out[3] = m[3] * x + m[7] * y + m[11] * z + m[15] * w;
  return out;
}
var mul = multiply;
(function() {
  var vec = create();
  return function(a, stride, offset, count, fn, arg) {
    var i, l;
    if (!stride) {
      stride = 4;
    }
    if (!offset) {
      offset = 0;
    }
    if (count) {
      l = Math.min(count * stride + offset, a.length);
    } else {
      l = a.length;
    }
    for (i = offset; i < l; i += stride) {
      vec[0] = a[i];
      vec[1] = a[i + 1];
      vec[2] = a[i + 2];
      vec[3] = a[i + 3];
      fn(vec, vec, arg);
      a[i] = vec[0];
      a[i + 1] = vec[1];
      a[i + 2] = vec[2];
      a[i + 3] = vec[3];
    }
    return a;
  };
})();
var vertRenderShader = `#version 300 es
#line 4
layout(location=0) in vec3 pos;
in vec3 texCoords;
uniform mat4 mvpMtx;
out vec3 vColor;

void main(void) {
	gl_Position = mvpMtx * vec4(pos, 1.0); //vec4(2.0 * (pos.xyz - 0.5), 1.0);
	vColor = texCoords;
}`;
var fragRenderShader = `#version 300 es
#line 15
precision highp int;
precision highp float;
uniform vec3 rayDir;
uniform vec3 texVox;
uniform vec3 volScale;
uniform vec4 clipPlane;
uniform highp sampler3D volume, overlay;
uniform float overlays;
uniform float backOpacity;
in vec3 vColor;
out vec4 fColor;
vec3 GetBackPosition(vec3 startPositionTex) {
 //texture space is 0..1 in each dimension, volScale adjusts for relative field of view
 //convert startPosition to world space units:
 vec3 startPosition = startPositionTex * volScale; 
 vec3 invR = 1.0 / rayDir;
 vec3 tbot = invR * (vec3(0.0)-startPosition);
 vec3 ttop = invR * (volScale-startPosition);
 vec3 tmax = max(ttop, tbot);
 vec2 t = min(tmax.xx, tmax.yz);
 vec3 endPosition = startPosition + (rayDir * min(t.x, t.y));
 //convert world position back to texture position:
 endPosition = endPosition / volScale;
 return endPosition;
}
vec4 applyClip (vec3 dir, inout vec4 samplePos, inout float len) {
	float cdot = dot(dir,clipPlane.xyz);
	if  ((clipPlane.a > 1.0) || (cdot == 0.0)) return samplePos;
    bool frontface = (cdot > 0.0);
	float clipThick = 2.0;
    float dis = (-clipPlane.a - dot(clipPlane.xyz, samplePos.xyz-0.5)) / cdot;
    float  disBackFace = (-(clipPlane.a-clipThick) - dot(clipPlane.xyz, samplePos.xyz-0.5)) / cdot;
    if (((frontface) && (dis >= len)) || ((!frontface) && (dis <= 0.0))) {
        samplePos.a = len + 1.0;
        return samplePos;
    }
    if (frontface) {
        dis = max(0.0, dis);
        samplePos = vec4(samplePos.xyz+dir * dis, dis);
        len = min(disBackFace, len);
    }
    if (!frontface) {
        len = min(dis, len);
        disBackFace = max(0.0, disBackFace);
        samplePos = vec4(samplePos.xyz+dir * disBackFace, disBackFace);
    }
    return samplePos;
}
void main() {
  fColor = vec4(0.0,0.0,0.0,0.0);
	//fColor = vec4(vColor.rgb, 1.0); return;
	// fColor = texture(volume, vColor.xyz);
	// return;
	vec3 start = vColor;
	vec3 backPosition = GetBackPosition(start);
	// fColor = vec4(backPosition, 1.0); return;
  vec3 dir = backPosition - start;
  float len = length(dir);
	float lenVox = length((texVox * start) - (texVox * backPosition));
	if (lenVox < 0.5) return;
	float sliceSize = len / lenVox; //e.g. if ray length is 1.0 and traverses 50 voxels, each voxel is 0.02 in unit cube
	float stepSize = sliceSize; //quality: larger step is faster traversal, but fewer samples
	float opacityCorrection = stepSize/sliceSize;
    dir = normalize(dir);
	vec4 deltaDir = vec4(dir.xyz * stepSize, stepSize);
	vec4 samplePos = vec4(start.xyz, 0.0); //ray position
	float lenNoClip = len;
	vec4 clipPos = applyClip(dir, samplePos, len);
	//start: OPTIONAL fast pass: rapid traversal until first hit
	float stepSizeFast = sliceSize * 1.9;
	vec4 deltaDirFast = vec4(dir.xyz * stepSizeFast, stepSizeFast);
	while (samplePos.a <= len) {
		float val = texture(volume, samplePos.xyz).a;
		if (val > 0.01) break;
		samplePos += deltaDirFast; //advance ray position
	}
	// fColor = vec4(1.0, 0.0, 0.0, 1.0);
	if ((samplePos.a > len) && (overlays < 1.0)) return;
	samplePos -= deltaDirFast;
	if (samplePos.a < 0.0)
		vec4 samplePos = vec4(start.xyz, 0.0); //ray position
	//end: fast pass
	vec4 colAcc = vec4(0.0,0.0,0.0,0.0);
	const float earlyTermination = 0.95;
	float backNearest = len; //assume no hit
    float ran = fract(sin(gl_FragCoord.x * 12.9898 + gl_FragCoord.y * 78.233) * 43758.5453);
    samplePos += deltaDir * ran; //jitter ray
	while (samplePos.a <= len) {
		vec4 colorSample = texture(volume, samplePos.xyz);
		samplePos += deltaDir; //advance ray position
		if (colorSample.a < 0.01) continue;
		backNearest = min(backNearest, samplePos.a);
		colorSample.a = 1.0-pow((1.0 - colorSample.a), opacityCorrection);
		colorSample.rgb *= colorSample.a;
		colAcc= (1.0 - colAcc.a) * colorSample + colAcc;
		if ( colAcc.a > earlyTermination )
			break;
	}
	colAcc.a = (colAcc.a / earlyTermination) * backOpacity;
	fColor = colAcc;
	if (overlays < 1.0) return;
	//overlay pass
	len = lenNoClip;
	samplePos = vec4(start.xyz, 0.0); //ray position
    //start: OPTIONAL fast pass: rapid traversal until first hit
	stepSizeFast = sliceSize * 1.9;
	deltaDirFast = vec4(dir.xyz * stepSizeFast, stepSizeFast);
	while (samplePos.a <= len) {
		float val = texture(overlay, samplePos.xyz).a;
		if (val > 0.01) break;
		samplePos += deltaDirFast; //advance ray position
	}
	if (samplePos.a > len) return;
	samplePos -= deltaDirFast;
	if (samplePos.a < 0.0)
		vec4 samplePos = vec4(start.xyz, 0.0); //ray position
	//end: fast pass
	float overFarthest = len;
	colAcc = vec4(0.0, 0.0, 0.0, 0.0);
	samplePos += deltaDir * ran; //jitter ray
	while (samplePos.a <= len) {
		vec4 colorSample = texture(overlay, samplePos.xyz);
		samplePos += deltaDir; //advance ray position
		if (colorSample.a < 0.01) continue;
		colorSample.a = 1.0-pow((1.0 - colorSample.a), opacityCorrection);
		colorSample.rgb *= colorSample.a;
		colAcc= (1.0 - colAcc.a) * colorSample + colAcc;
		overFarthest = samplePos.a;
		if ( colAcc.a > earlyTermination )
			break;
	}
	float overMix = colAcc.a;
	float overlayDepth = 0.3;
	if (fColor.a <= 0.0)
			overMix = 1.0;
	else if (((overFarthest) > backNearest)) {
		float dx = (overFarthest - backNearest)/1.73;
		dx = fColor.a * pow(dx, overlayDepth);
		overMix *= 1.0 - dx;
	}
	fColor.rgb = mix(fColor.rgb, colAcc.rgb, overMix);
	fColor.a = max(fColor.a, colAcc.a);
}`;
var vertSliceShader = `#version 300 es
#line 150
layout(location=0) in vec3 pos;
uniform int axCorSag;
uniform float slice;
uniform vec2 canvasWidthHeight;
uniform vec4 leftTopWidthHeight;
out vec3 texPos;
void main(void) {
	//convert pixel x,y space 1..canvasWidth,1..canvasHeight to WebGL 1..-1,-1..1
	vec2 frac;
	frac.x = (leftTopWidthHeight.x + (pos.x * leftTopWidthHeight.z)) / canvasWidthHeight.x; //0..1
	frac.y = 1.0 - ((leftTopWidthHeight.y + ((1.0 - pos.y) * leftTopWidthHeight.w)) / canvasWidthHeight.y); //1..0
	frac = (frac * 2.0) - 1.0;
	gl_Position = vec4(frac, 0.0, 1.0);
	if (axCorSag == 1)
		texPos = vec3(pos.x, slice, pos.y);
	else if (axCorSag == 2)
		texPos = vec3(slice, pos.x, pos.y);
	else
		texPos = vec3(pos.xy, slice);
}`;
var fragSliceShader = `#version 300 es
#line 173
precision highp int;
precision highp float;
uniform highp sampler3D volume, overlay;
uniform float overlays;
uniform float opacity;
in vec3 texPos;
out vec4 color;
void main() {
	color = vec4(texture(volume, texPos).rgb, opacity);
	vec4 ocolor = vec4(0.0);
	if (overlays < 1.0) {
	 ocolor = vec4(0.0, 0.0, 0.0, 0.0);
	} else {
		ocolor = texture(overlay, texPos);
	}
	float aout = ocolor.a + (1.0 - ocolor.a) * color.a;
	if (aout <= 0.0) return;
	color.rgb = ((ocolor.rgb * ocolor.a) + (color.rgb * color.a * (1.0 - ocolor.a))) / aout;
	color.a = aout;
}`;
var fragLineShader = `#version 300 es
#line 189
precision highp int;
precision highp float;
uniform vec4 lineColor;
out vec4 color;
void main() {
	color = lineColor;
}`;
var vertColorbarShader = `#version 300 es
#line 200
layout(location=0) in vec3 pos;
uniform vec2 canvasWidthHeight;
uniform vec4 leftTopWidthHeight;
out vec2 vColor;
void main(void) {
	//convert pixel x,y space 1..canvasWidth,1..canvasHeight to WebGL 1..-1,-1..1
	vec2 frac;
	frac.x = (leftTopWidthHeight.x + (pos.x * leftTopWidthHeight.z)) / canvasWidthHeight.x; //0..1
	frac.y = 1.0 - ((leftTopWidthHeight.y + ((1.0 - pos.y) * leftTopWidthHeight.w)) / canvasWidthHeight.y); //1..0
	frac = (frac * 2.0) - 1.0;
	gl_Position = vec4(frac, 0.0, 1.0);
	vColor = pos.xy;
}`;
var fragColorbarShader = `#version 300 es
#line 217
precision highp int;
precision highp float;
uniform highp sampler2D colormap;
in vec2 vColor;
out vec4 color;
void main() {
	color = vec4(texture(colormap, vColor).rgb, 1.0);
}`;
var vertLineShader = `#version 300 es
#line 229
layout(location=0) in vec3 pos;
uniform vec2 canvasWidthHeight;
uniform vec4 leftTopWidthHeight;
void main(void) {
	//convert pixel x,y space 1..canvasWidth,1..canvasHeight to WebGL 1..-1,-1..1
	vec2 frac;
	frac.x = (leftTopWidthHeight.x + (pos.x * leftTopWidthHeight.z)) / canvasWidthHeight.x; //0..1
	frac.y = 1.0 - ((leftTopWidthHeight.y + ((1.0 - pos.y) * leftTopWidthHeight.w)) / canvasWidthHeight.y); //1..0
	frac = (frac * 2.0) - 1.0;
	gl_Position = vec4(frac, 0.0, 1.0);
}`;
var vertFontShader = `#version 300 es
#line 244
layout(location=0) in vec3 pos;
uniform vec2 canvasWidthHeight;
uniform vec4 leftTopWidthHeight;
uniform vec4 uvLeftTopWidthHeight;
out vec2 vUV;
void main(void) {
	//convert pixel x,y space 1..canvasWidth,1..canvasHeight to WebGL 1..-1,-1..1
	vec2 frac;
	frac.x = (leftTopWidthHeight.x + (pos.x * leftTopWidthHeight.z)) / canvasWidthHeight.x; //0..1
	frac.y = 1.0 - ((leftTopWidthHeight.y + ((1.0 - pos.y) * leftTopWidthHeight.w)) / canvasWidthHeight.y); //1..0
	frac = (frac * 2.0) - 1.0;
	gl_Position = vec4(frac, 0.0, 1.0);
	vUV = vec2(uvLeftTopWidthHeight.x + (pos.x * uvLeftTopWidthHeight.z), uvLeftTopWidthHeight.y  + ((1.0 - pos.y) * uvLeftTopWidthHeight.w) );
}`;
var fragFontShader = `#version 300 es
#line 262
precision highp int;
precision highp float;
uniform highp sampler2D fontTexture;
uniform vec4 fontColor;
uniform float screenPxRange;
in vec2 vUV;
out vec4 color;
float median(float r, float g, float b) {
    return max(min(r, g), min(max(r, g), b));
}
void main() {
	vec3 msd = texture(fontTexture, vUV).rgb;
	float sd = median(msd.r, msd.g, msd.b);
    float screenPxDistance = screenPxRange*(sd - 0.5);
    float opacity = clamp(screenPxDistance + 0.5, 0.0, 1.0);
	color = vec4(fontColor.rgb , fontColor.a * opacity);
}`;
var vertOrientShader = `#version 300 es
#line 283
precision highp int;
precision highp float;
in vec3 vPos;
out vec2 TexCoord;
void main() {
    TexCoord = vPos.xy;
    gl_Position = vec4( (vPos.xy-vec2(0.5,0.5)) * 2.0, 0.0, 1.0);
}`;
var fragOrientShaderU = `#version 300 es
uniform highp usampler3D intensityVol;
`;
var fragOrientShaderI = `#version 300 es
uniform highp isampler3D intensityVol;
`;
var fragOrientShaderF = `#version 300 es
uniform highp sampler3D intensityVol;
`;
var fragOrientShader = `#line 309
precision highp int;
precision highp float;
in vec2 TexCoord;
out vec4 FragColor;
uniform float coordZ;
uniform float layer;
uniform float numLayers;
uniform float scl_slope;
uniform float scl_inter;
uniform float cal_max;
uniform float cal_min;
uniform highp sampler2D colormap;
uniform lowp sampler3D blend3D;
uniform float opacity;
uniform mat4 mtx;
void main(void) {
 vec4 vx = vec4(TexCoord.xy, coordZ, 1.0) * mtx;
 float f = (scl_slope * float(texture(intensityVol, vx.xyz).r)) + scl_inter;
 float r = max(0.00001, abs(cal_max - cal_min));
 float mn = min(cal_min, cal_max);
 f = mix(0.0, 1.0, (f - mn) / r);
 //float y = 1.0 / numLayers;
 //y = ((layer + 0.5) * y);
 //https://stackoverflow.com/questions/5879403/opengl-texture-coordinates-in-pixel-space
 float y = (2.0 * layer + 1.0)/(2.0 * numLayers);
 FragColor = texture(colormap, vec2(f, y)).rgba;
 FragColor.a *= opacity;
 if (layer < 2.0) return;
 vec2 texXY = TexCoord.xy*0.5 +vec2(0.5,0.5);
 vec4 prevColor = texture(blend3D, vec3(texXY, coordZ));
 // https://en.wikipedia.org/wiki/Alpha_compositing
 float aout = FragColor.a + (1.0 - FragColor.a) * prevColor.a;
 if (aout <= 0.0) return;
 FragColor.rgb = ((FragColor.rgb * FragColor.a) + (prevColor.rgb * prevColor.a * (1.0 - FragColor.a))) / aout;
 FragColor.a = aout;
}`;
var fragRGBOrientShader = `#line 309
precision highp int;
precision highp float;
in vec2 TexCoord;
out vec4 FragColor;
uniform float coordZ;
uniform float layer;
uniform float numLayers;
uniform float scl_slope;
uniform float scl_inter;
uniform float cal_max;
uniform float cal_min;
uniform highp sampler2D colormap;
uniform lowp sampler3D blend3D;
uniform float opacity;
uniform mat4 mtx;
uniform bool hasAlpha;
void main(void) {
 uvec4 aColor = texture(intensityVol, vec3(TexCoord.xy, coordZ));
 FragColor = vec4(float(aColor.r) / 255.0, float(aColor.g) / 255.0, float(aColor.b) / 255.0, float(aColor.a) / 255.0);
 if (!hasAlpha)
   FragColor.a = (FragColor.r * 0.21 + FragColor.g * 0.72 + FragColor.b * 0.07);
 FragColor.a *= opacity;
}`;
var vertPassThroughShader = `#version 300 es
#line 283
precision highp int;
precision highp float;
in vec3 vPos;
out vec2 TexCoord;
void main() {
    TexCoord = vPos.xy;
    gl_Position = vec4(vPos.x, vPos.y, 0.0, 1.0);
}`;
var fragPassThroughShader = `#version 300 es
precision highp int;
precision highp float;
in vec2 TexCoord;
out vec4 FragColor;
uniform float coordZ;
uniform lowp sampler3D in3D;
void main(void) {
 FragColor = texture(in3D, vec3(TexCoord.xy, coordZ));
}`;
var vertSurfaceShader = `#version 300 es
layout(location=0) in vec3 pos;
uniform mat4 mvpMtx;
void main(void) {
	gl_Position = mvpMtx * vec4(2.0 * (pos.xyz - 0.5), 1.0);
}`;
var fragSurfaceShader = `#version 300 es
precision highp int;
precision highp float;
uniform vec4 surfaceColor;
out vec4 color;
void main() {
	color = surfaceColor;
}`;
var vertDepthPickingShader = `#version 300 es
#line 414
layout(location=0) in vec3 pos;
in vec3 texCoords;
uniform mat4 mvpMtx;
out vec3 posColor;
void main(void) {
	gl_Position = mvpMtx * vec4(pos, 1.0);
	posColor = texCoords;
}`;
var fragDepthPickingShader = `#version 300 es
precision highp int;
precision highp float;
uniform int id;
in vec3 posColor;
out vec4 color;
void main() {
	color = vec4(posColor, float(id & 255) / 255.0);
}`;
var vertVolumePickingShader = `#version 300 es
#line 4
layout(location=0) in vec3 pos;
in vec3 texCoords;
uniform mat4 mvpMtx;
out vec3 posColor;
void main(void) {
	gl_Position = mvpMtx * vec4(pos, 1.0);//mvpMtx * vec4(2.0 * (pos.xyz - 0.5), 1.0);
	posColor = texCoords; //pos;
}`;
var fragVolumePickingShader = `#version 300 es
#line 15
precision highp int;
precision highp float;
uniform vec3 rayDir;
uniform vec3 volScale;
uniform vec3 texVox;
uniform vec4 clipPlane;
uniform highp sampler3D volume, overlay;
uniform float overlays;
uniform float backOpacity;
uniform int id;
in vec3 posColor;
out vec4 fColor;
vec3 GetBackPosition(vec3 startPositionTex) {
	//texture space is 0..1 in each dimension, volScale adjusts for relative field of view
	//convert startPosition to world space units:
	vec3 startPosition = startPositionTex * volScale; 
	vec3 invR = 1.0 / rayDir;
	vec3 tbot = invR * (vec3(0.0)-startPosition);
	vec3 ttop = invR * (volScale-startPosition);
	vec3 tmax = max(ttop, tbot);
	vec2 t = min(tmax.xx, tmax.yz);
	vec3 endPosition = startPosition + (rayDir * min(t.x, t.y));
	//convert world position back to texture position:
	endPosition = endPosition / volScale;
	return endPosition;
 }
vec4 applyClip (vec3 dir, inout vec4 samplePos, inout float len) {
	float cdot = dot(dir,clipPlane.xyz);
	if  ((clipPlane.a > 1.0) || (cdot == 0.0)) return samplePos;
    bool frontface = (cdot > 0.0);
	float clipThick = 2.0;
    float dis = (-clipPlane.a - dot(clipPlane.xyz, samplePos.xyz-0.5)) / cdot;
    float  disBackFace = (-(clipPlane.a-clipThick) - dot(clipPlane.xyz, samplePos.xyz-0.5)) / cdot;
    if (((frontface) && (dis >= len)) || ((!frontface) && (dis <= 0.0))) {
        samplePos.a = len + 1.0;
        return samplePos;
    }
    if (frontface) {
        dis = max(0.0, dis);
        samplePos = vec4(samplePos.xyz+dir * dis, dis);
        len = min(disBackFace, len);
    }
    if (!frontface) {
        len = min(dis, len);
        disBackFace = max(0.0, disBackFace);
        samplePos = vec4(samplePos.xyz+dir * disBackFace, disBackFace);
    }
    return samplePos;
}
void main() {
	vec3 start = posColor;
	vec3 backPosition = GetBackPosition(start);
  vec3 dir = backPosition - start;
  float len = length(dir);
	float lenVox = length((texVox * start) - (texVox * backPosition));
	if (lenVox < 0.5) return;
	// fColor = vec4(posColor, 1.0);
	float sliceSize = len / lenVox; //e.g. if ray length is 1.0 and traverses 50 voxels, each voxel is 0.02 in unit cube
	float stepSize = sliceSize; //quality: larger step is faster traversal, but fewer samples
	float opacityCorrection = stepSize/sliceSize;
  dir = normalize(dir);
	vec4 deltaDir = vec4(dir.xyz * stepSize, stepSize);
	vec4 samplePos = vec4(start.xyz, 0.0); //ray position
	float lenNoClip = len;
	vec4 clipPos = applyClip(dir, samplePos, len);
	//start: OPTIONAL fast pass: rapid traversal until first hit
	float stepSizeFast = sliceSize * 1.9;
	vec4 deltaDirFast = vec4(dir.xyz * stepSizeFast, stepSizeFast);
	while (samplePos.a <= len) {
		float val = texture(volume, samplePos.xyz).a;
		if (val > 0.01) {
			fColor = vec4(samplePos.rgb, float(id & 255) / 255.0);
			return;
		}
		samplePos += deltaDirFast; //advance ray position
	}
	//end: fast pass

	
	if (overlays < 1.0) discard;
	
	//overlay pass
	len = lenNoClip;
	samplePos = vec4(start.xyz, 0.0); //ray position
    //start: OPTIONAL fast pass: rapid traversal until first hit
	stepSizeFast = sliceSize * 1.9;
	deltaDirFast = vec4(dir.xyz * stepSizeFast, stepSizeFast);
	while (samplePos.a <= len) {
		float val = texture(overlay, samplePos.xyz).a;
		if (val > 0.01) break;
		samplePos += deltaDirFast; //advance ray position
	}
	if (samplePos.a > len) return;
	fColor = vec4(posColor, float(id & 255) / 255.0);
}`;
const min$P = 0;
const max$P = 0;
const R$P = [
  0,
  0,
  24,
  248,
  255
];
const G$P = [
  0,
  0,
  177,
  254,
  0
];
const B$P = [
  0,
  136,
  0,
  0,
  0
];
const A$P = [
  0,
  32,
  64,
  78,
  128
];
const I$P = [
  0,
  64,
  128,
  156,
  255
];
var actc = {
  min: min$P,
  max: max$P,
  R: R$P,
  G: G$P,
  B: B$P,
  A: A$P,
  I: I$P
};
const min$O = 0;
const max$O = 0;
const R$O = [
  0,
  0,
  0
];
const G$O = [
  0,
  0,
  0
];
const B$O = [
  0,
  128,
  255
];
const A$O = [
  0,
  64,
  128
];
const I$O = [
  0,
  128,
  255
];
var blue = {
  min: min$O,
  max: max$O,
  R: R$O,
  G: G$O,
  B: B$O,
  A: A$O,
  I: I$O
};
const min$N = 0;
const max$N = 0;
const R$N = [
  0,
  0,
  0,
  0,
  196,
  255
];
const G$N = [
  0,
  32,
  128,
  128,
  128,
  32
];
const B$N = [
  0,
  255,
  196,
  0,
  0,
  0
];
const A$N = [
  0,
  128,
  64,
  64,
  64,
  128
];
const I$N = [
  0,
  1,
  64,
  128,
  192,
  255
];
var blue2red = {
  min: min$N,
  max: max$N,
  R: R$N,
  G: G$N,
  B: B$N,
  A: A$N,
  I: I$N
};
const min$M = 0;
const max$M = 0;
const R$M = [
  0,
  0,
  0,
  0
];
const G$M = [
  0,
  1,
  128,
  255
];
const B$M = [
  0,
  222,
  127,
  32
];
const A$M = [
  0,
  0,
  64,
  128
];
const I$M = [
  0,
  1,
  128,
  255
];
var bluegrn = {
  min: min$M,
  max: max$M,
  R: R$M,
  G: G$M,
  B: B$M,
  A: A$M,
  I: I$M
};
const min$L = 0;
const max$L = 0;
const R$L = [
  0,
  103,
  255
];
const G$L = [
  0,
  126,
  255
];
const B$L = [
  0,
  165,
  255
];
const A$L = [
  0,
  76,
  128
];
const I$L = [
  0,
  153,
  255
];
var bone = {
  min: min$L,
  max: max$L,
  R: R$L,
  G: G$L,
  B: B$L,
  A: A$L,
  I: I$L
};
const min$K = 0;
const max$K = 0;
const R$K = [
  0,
  43,
  103,
  199,
  216,
  255
];
const G$K = [
  0,
  0,
  37,
  155,
  213,
  255
];
const B$K = [
  0,
  0,
  20,
  97,
  201,
  255
];
const A$K = [
  0,
  44,
  48,
  54,
  56,
  56
];
const I$K = [
  0,
  64,
  128,
  196,
  240,
  255
];
var bronze = {
  min: min$K,
  max: max$K,
  R: R$K,
  G: G$K,
  B: B$K,
  A: A$K,
  I: I$K
};
const min$J = 0;
const max$J = 0;
const R$J = [
  0,
  86,
  166,
  255
];
const G$J = [
  32,
  92,
  156,
  233
];
const B$J = [
  76,
  108,
  117,
  69
];
const A$J = [
  0,
  56,
  80,
  88
];
const I$J = [
  0,
  64,
  192,
  255
];
var cividis = {
  min: min$J,
  max: max$J,
  R: R$J,
  G: G$J,
  B: B$J,
  A: A$J,
  I: I$J
};
const min$I = 0;
const max$I = 0;
const R$I = [
  0,
  0,
  0
];
const G$I = [
  127,
  196,
  254
];
const B$I = [
  255,
  255,
  255
];
const A$I = [
  0,
  64,
  128
];
const I$I = [
  0,
  128,
  255
];
var cool = {
  min: min$I,
  max: max$I,
  R: R$I,
  G: G$I,
  B: B$I,
  A: A$I,
  I: I$I
};
const min$H = 0;
const max$H = 0;
const R$H = [
  0,
  61,
  122,
  183,
  244,
  255
];
const G$H = [
  0,
  41,
  81,
  122,
  163,
  203
];
const B$H = [
  0,
  25,
  51,
  76,
  102,
  127
];
const A$H = [
  0,
  25,
  51,
  71,
  102,
  128
];
const I$H = [
  0,
  51,
  102,
  153,
  204,
  255
];
var copper = {
  min: min$H,
  max: max$H,
  R: R$H,
  G: G$H,
  B: B$H,
  A: A$H,
  I: I$H
};
const min$G = 0;
const max$G = 0;
const R$G = [
  0,
  61,
  122,
  183,
  244,
  255
];
const G$G = [
  0,
  41,
  81,
  122,
  163,
  255
];
const B$G = [
  0,
  25,
  51,
  76,
  102,
  255
];
const A$G = [
  0,
  25,
  51,
  71,
  102,
  128
];
const I$G = [
  0,
  51,
  102,
  153,
  204,
  255
];
var copper2 = {
  min: min$G,
  max: max$G,
  R: R$G,
  G: G$G,
  B: B$G,
  A: A$G,
  I: I$G
};
const min$F = -643;
const max$F = -235;
const R$F = [
  0,
  0,
  0
];
const G$F = [
  154,
  154,
  154
];
const B$F = [
  179,
  179,
  101
];
const A$F = [
  0,
  32,
  0
];
const I$F = [
  0,
  163,
  255
];
var ct_airways = {
  min: min$F,
  max: max$F,
  R: R$F,
  G: G$F,
  B: B$F,
  A: A$F,
  I: I$F
};
const min$E = 180;
const max$E = 600;
const R$E = [
  0,
  0,
  113,
  255
];
const G$E = [
  0,
  0,
  109,
  250
];
const B$E = [
  0,
  0,
  101,
  245
];
const A$E = [
  0,
  0,
  100,
  160
];
const I$E = [
  0,
  1,
  128,
  255
];
var ct_bones = {
  min: min$E,
  max: max$E,
  R: R$E,
  G: G$E,
  B: B$E,
  A: A$E,
  I: I$E
};
const min$D = -10;
const max$D = 110;
const R$D = [
  0,
  199,
  255
];
const G$D = [
  0,
  127,
  255
];
const B$D = [
  0,
  127,
  255
];
const A$D = [
  0,
  48,
  128
];
const I$D = [
  0,
  124,
  255
];
var ct_brain = {
  min: min$D,
  max: max$D,
  R: R$D,
  G: G$D,
  B: B$D,
  A: A$D,
  I: I$D
};
const min$C = -10;
const max$C = 110;
const R$C = [
  0,
  127,
  255
];
const G$C = [
  0,
  127,
  255
];
const B$C = [
  0,
  127,
  255
];
const A$C = [
  0,
  48,
  128
];
const I$C = [
  0,
  124,
  255
];
var ct_brain_gray = {
  min: min$C,
  max: max$C,
  R: R$C,
  G: G$C,
  B: B$C,
  A: A$C,
  I: I$C
};
const min$B = -80;
const max$B = 1e3;
const R$B = [
  0,
  189,
  150,
  150,
  150,
  150,
  255
];
const G$B = [
  0,
  169,
  54,
  54,
  54,
  54,
  240
];
const B$B = [
  0,
  153,
  52,
  52,
  52,
  52,
  242
];
const A$B = [
  0,
  32,
  64,
  0,
  0,
  64,
  64
];
const I$B = [
  0,
  1,
  82,
  92,
  234,
  242,
  255
];
var ct_cardiac = {
  min: min$B,
  max: max$B,
  R: R$B,
  G: G$B,
  B: B$B,
  A: A$B,
  I: I$B
};
const min$A = -590;
const max$A = 600;
const R$A = [
  0,
  241,
  241,
  248,
  248,
  178,
  178,
  232,
  255,
  255,
  255
];
const G$A = [
  0,
  156,
  156,
  222,
  222,
  36,
  36,
  51,
  255,
  255,
  255
];
const B$A = [
  0,
  130,
  130,
  169,
  169,
  24,
  24,
  37,
  255,
  255,
  255
];
const A$A = [
  0,
  8,
  0,
  0,
  0,
  64,
  64,
  0,
  0,
  222,
  222
];
const I$A = [
  0,
  2,
  3,
  64,
  122,
  142,
  172,
  182,
  252,
  253,
  255
];
var ct_head = {
  min: min$A,
  max: max$A,
  R: R$A,
  G: G$A,
  B: B$A,
  A: A$A,
  I: I$A
};
const min$z = 114;
const max$z = 302;
const R$z = [
  0,
  255,
  255
];
const G$z = [
  0,
  129,
  255
];
const B$z = [
  0,
  0,
  255
];
const A$z = [
  0,
  88,
  228
];
const I$z = [
  0,
  103,
  255
];
var ct_kidneys = {
  min: min$z,
  max: max$z,
  R: R$z,
  G: G$z,
  B: B$z,
  A: A$z,
  I: I$z
};
const min$y = -23;
const max$y = 246;
const R$y = [
  0,
  44,
  255,
  255,
  255
];
const G$y = [
  0,
  128,
  90,
  255,
  255
];
const B$y = [
  0,
  0,
  70,
  0,
  255
];
const A$y = [
  0,
  0,
  82,
  184,
  228
];
const I$y = [
  0,
  64,
  131,
  196,
  255
];
var ct_liver = {
  min: min$y,
  max: max$y,
  R: R$y,
  G: G$y,
  B: B$y,
  A: A$y,
  I: I$y
};
const min$x = -100;
const max$x = 246;
const R$x = [
  0,
  128,
  159,
  255,
  255,
  255,
  255
];
const G$x = [
  0,
  0,
  56,
  90,
  0,
  255,
  255
];
const B$x = [
  0,
  0,
  41,
  70,
  0,
  0,
  255
];
const A$x = [
  0,
  63,
  105,
  135,
  167,
  184,
  228
];
const I$x = [
  0,
  100,
  128,
  155,
  180,
  209,
  255
];
var ct_muscles = {
  min: min$x,
  max: max$x,
  R: R$x,
  G: G$x,
  B: B$x,
  A: A$x,
  I: I$x
};
const min$w = -590;
const max$w = 600;
const R$w = [
  0,
  241,
  241,
  248,
  248,
  178,
  232,
  255,
  255
];
const G$w = [
  0,
  156,
  156,
  222,
  222,
  36,
  51,
  255,
  255
];
const B$w = [
  0,
  130,
  130,
  169,
  169,
  24,
  37,
  255,
  255
];
const A$w = [
  0,
  63,
  105,
  135,
  167,
  184,
  228,
  228,
  228
];
const I$w = [
  0,
  1,
  52,
  127,
  137,
  162,
  172,
  252,
  255
];
var ct_scalp = {
  min: min$w,
  max: max$w,
  R: R$w,
  G: G$w,
  B: B$w,
  A: A$w,
  I: I$w
};
const min$v = 140;
const max$v = 1024;
const R$v = [
  0,
  2,
  113,
  255
];
const G$v = [
  0,
  1,
  109,
  250
];
const B$v = [
  0,
  1,
  101,
  245
];
const A$v = [
  0,
  1,
  96,
  168
];
const I$v = [
  0,
  1,
  128,
  255
];
var ct_skull = {
  min: min$v,
  max: max$v,
  R: R$v,
  G: G$v,
  B: B$v,
  A: A$v,
  I: I$v
};
const min$u = -923;
const max$u = 679;
const R$u = [
  0,
  0,
  0,
  0,
  0,
  255,
  255,
  255
];
const G$u = [
  154,
  154,
  154,
  154,
  0,
  0,
  254,
  255
];
const B$u = [
  179,
  179,
  179,
  179,
  0,
  0,
  0,
  255
];
const A$u = [
  0,
  3,
  8,
  0,
  0,
  10,
  15,
  20
];
const I$u = [
  0,
  30,
  62,
  88,
  170,
  200,
  232,
  255
];
var ct_soft = {
  min: min$u,
  max: max$u,
  R: R$u,
  G: G$u,
  B: B$u,
  A: A$u,
  I: I$u
};
const min$t = -10;
const max$t = 110;
const R$t = [
  0,
  199,
  255
];
const G$t = [
  0,
  127,
  255
];
const B$t = [
  0,
  127,
  255
];
const A$t = [
  0,
  48,
  128
];
const I$t = [
  0,
  124,
  255
];
var ct_soft_tissue = {
  min: min$t,
  max: max$t,
  R: R$t,
  G: G$t,
  B: B$t,
  A: A$t,
  I: I$t
};
const min$s = -600;
const max$s = 100;
const R$s = [
  0,
  134,
  255
];
const G$s = [
  0,
  109,
  250
];
const B$s = [
  0,
  101,
  245
];
const A$s = [
  0,
  60,
  148
];
const I$s = [
  0,
  128,
  255
];
var ct_surface = {
  min: min$s,
  max: max$s,
  R: R$s,
  G: G$s,
  B: B$s,
  A: A$s,
  I: I$s
};
const min$r = 114;
const max$r = 246;
const R$r = [
  0,
  255,
  255
];
const G$r = [
  0,
  128,
  255
];
const B$r = [
  0,
  128,
  255
];
const A$r = [
  0,
  64,
  96
];
const I$r = [
  0,
  87,
  255
];
var ct_vessels = {
  min: min$r,
  max: max$r,
  R: R$r,
  G: G$r,
  B: B$r,
  A: A$r,
  I: I$r
};
const min$q = 50;
const max$q = 1e3;
const R$q = [
  98,
  210,
  169,
  128,
  255
];
const G$q = [
  94,
  26,
  77,
  128,
  255
];
const B$q = [
  45,
  21,
  74,
  128,
  255
];
const A$q = [
  0,
  25,
  0,
  4,
  168
];
const I$q = [
  0,
  41,
  87,
  154,
  255
];
var ct_w_contrast = {
  min: min$q,
  max: max$q,
  R: R$q,
  G: G$q,
  B: B$q,
  A: A$q,
  I: I$q
};
const min$p = 0;
const max$p = 0;
const R$p = [
  0,
  13,
  21,
  26,
  27,
  25,
  22,
  21,
  22,
  28,
  39,
  54,
  75,
  98,
  124,
  148,
  171,
  189,
  202,
  210,
  213,
  211,
  206,
  200,
  195,
  193,
  195,
  201,
  211,
  225,
  240,
  255
];
const G$p = [
  0,
  5,
  11,
  20,
  31,
  44,
  58,
  72,
  86,
  99,
  109,
  116,
  120,
  122,
  122,
  122,
  121,
  121,
  124,
  129,
  137,
  147,
  161,
  175,
  190,
  205,
  218,
  229,
  238,
  245,
  251,
  255
];
const B$p = [
  0,
  14,
  30,
  46,
  61,
  71,
  77,
  78,
  75,
  68,
  60,
  52,
  48,
  47,
  53,
  65,
  83,
  105,
  131,
  157,
  183,
  205,
  222,
  235,
  241,
  243,
  242,
  240,
  239,
  240,
  245,
  255
];
const A$p = [
  0,
  4,
  8,
  12,
  17,
  21,
  25,
  29,
  33,
  37,
  41,
  45,
  50,
  54,
  58,
  62,
  66,
  70,
  74,
  78,
  83,
  87,
  91,
  95,
  99,
  103,
  107,
  111,
  116,
  120,
  124,
  128
];
const I$p = [
  0,
  8,
  16,
  25,
  33,
  41,
  49,
  58,
  66,
  74,
  82,
  90,
  99,
  107,
  115,
  123,
  132,
  140,
  148,
  156,
  165,
  173,
  181,
  189,
  197,
  206,
  214,
  222,
  230,
  239,
  247,
  255
];
var cubehelix = {
  min: min$p,
  max: max$p,
  R: R$p,
  G: G$p,
  B: B$p,
  A: A$p,
  I: I$p
};
const min$o = 0;
const max$o = 0;
const R$o = [
  0,
  10,
  136,
  255
];
const G$o = [
  0,
  39,
  220,
  255
];
const B$o = [
  0,
  223,
  253,
  255
];
const A$o = [
  0,
  48,
  64,
  70
];
const I$o = [
  0,
  92,
  192,
  255
];
var electric_blue = {
  min: min$o,
  max: max$o,
  R: R$o,
  G: G$o,
  B: B$o,
  A: A$o,
  I: I$o
};
const min$n = 0;
const max$n = 0;
const R$n = [
  0,
  0,
  128,
  255,
  255
];
const G$n = [
  0,
  128,
  0,
  128,
  255
];
const B$n = [
  0,
  125,
  255,
  0,
  255
];
const A$n = [
  0,
  32,
  64,
  96,
  128
];
const I$n = [
  0,
  63,
  128,
  192,
  255
];
var ge_color = {
  min: min$n,
  max: max$n,
  R: R$n,
  G: G$n,
  B: B$n,
  A: A$n,
  I: I$n
};
const min$m = 0;
const max$m = 0;
const R$m = [
  0,
  142,
  227,
  255
];
const G$m = [
  0,
  85,
  170,
  255
];
const B$m = [
  0,
  14,
  76,
  255
];
const A$m = [
  0,
  42,
  84,
  128
];
const I$m = [
  0,
  85,
  170,
  255
];
var gold = {
  min: min$m,
  max: max$m,
  R: R$m,
  G: G$m,
  B: B$m,
  A: A$m,
  I: I$m
};
const min$l = 0;
const max$l = 0;
const R$l = [
  0,
  255
];
const G$l = [
  0,
  255
];
const B$l = [
  0,
  255
];
const A$l = [
  0,
  128
];
const I$l = [
  0,
  255
];
var gray = {
  min: min$l,
  max: max$l,
  R: R$l,
  G: G$l,
  B: B$l,
  A: A$l,
  I: I$l
};
const min$k = 0;
const max$k = 0;
const R$k = [
  0,
  0,
  0
];
const G$k = [
  0,
  128,
  255
];
const B$k = [
  0,
  0,
  0
];
const A$k = [
  0,
  64,
  128
];
const I$k = [
  0,
  128,
  255
];
var green = {
  min: min$k,
  max: max$k,
  R: R$k,
  G: G$k,
  B: B$k,
  A: A$k,
  I: I$k
};
const min$j = 0;
const max$j = 0;
const R$j = [
  3,
  255,
  255,
  255
];
const G$j = [
  0,
  0,
  255,
  255
];
const B$j = [
  0,
  0,
  0,
  255
];
const A$j = [
  0,
  48,
  96,
  128
];
const I$j = [
  0,
  95,
  191,
  255
];
var hot = {
  min: min$j,
  max: max$j,
  R: R$j,
  G: G$j,
  B: B$j,
  A: A$j,
  I: I$j
};
const min$i = 0;
const max$i = 0;
const R$i = [
  0,
  255,
  255,
  255
];
const G$i = [
  0,
  0,
  126,
  255
];
const B$i = [
  0,
  0,
  0,
  255
];
const A$i = [
  0,
  64,
  96,
  128
];
const I$i = [
  0,
  128,
  191,
  255
];
var hotiron = {
  min: min$i,
  max: max$i,
  R: R$i,
  G: G$i,
  B: B$i,
  A: A$i,
  I: I$i
};
const min$h = 0;
const max$h = 0;
const R$h = [
  255,
  255,
  0,
  0,
  0,
  255,
  255
];
const G$h = [
  0,
  255,
  255,
  255,
  0,
  0,
  0
];
const B$h = [
  0,
  0,
  0,
  255,
  255,
  255,
  0
];
const A$h = [
  0,
  14,
  28,
  43,
  57,
  71,
  85
];
const I$h = [
  0,
  43,
  85,
  128,
  170,
  213,
  255
];
var hsv = {
  min: min$h,
  max: max$h,
  R: R$h,
  G: G$h,
  B: B$h,
  A: A$h,
  I: I$h
};
const min$g = 0;
const max$g = 0;
const R$g = [
  0,
  120,
  237,
  240
];
const G$g = [
  0,
  28,
  105,
  249
];
const B$g = [
  4,
  109,
  37,
  33
];
const A$g = [
  0,
  56,
  80,
  88
];
const I$g = [
  0,
  64,
  192,
  255
];
var inferno = {
  min: min$g,
  max: max$g,
  R: R$g,
  G: G$g,
  B: B$g,
  A: A$g,
  I: I$g
};
const min$f = 0;
const max$f = 0;
const R$f = [
  0,
  0,
  127,
  255,
  127
];
const G$f = [
  0,
  127,
  255,
  127,
  0
];
const B$f = [
  127,
  255,
  127,
  0,
  0
];
const A$f = [
  0,
  32,
  64,
  96,
  128
];
const I$f = [
  0,
  63,
  128,
  192,
  255
];
var jet = {
  min: min$f,
  max: max$f,
  R: R$f,
  G: G$f,
  B: B$f,
  A: A$f,
  I: I$f
};
const min$e = 0;
const max$e = 0;
const R$e = [
  94,
  50,
  90,
  152,
  215,
  238,
  249,
  254,
  252,
  241,
  209,
  158
];
const G$e = [
  79,
  131,
  186,
  214,
  240,
  244,
  237,
  210,
  157,
  100,
  57,
  1
];
const B$e = [
  162,
  189,
  167,
  164,
  155,
  169,
  168,
  123,
  86,
  68,
  79,
  66
];
const A$e = [
  0,
  12,
  23,
  35,
  47,
  58,
  70,
  81,
  93,
  105,
  116,
  128
];
const I$e = [
  0,
  23,
  46,
  70,
  93,
  116,
  139,
  162,
  185,
  209,
  232,
  255
];
var linspecer = {
  min: min$e,
  max: max$e,
  R: R$e,
  G: G$e,
  B: B$e,
  A: A$e,
  I: I$e
};
const min$d = 0;
const max$d = 0;
const R$d = [
  0,
  148,
  183,
  223,
  247,
  252
];
const G$d = [
  0,
  44,
  55,
  74,
  112,
  253
];
const B$d = [
  4,
  128,
  121,
  104,
  92,
  191
];
const A$d = [
  0,
  44,
  53,
  64,
  75,
  107
];
const I$d = [
  0,
  107,
  128,
  154,
  179,
  255
];
var magma = {
  min: min$d,
  max: max$d,
  R: R$d,
  G: G$d,
  B: B$d,
  A: A$d,
  I: I$d
};
const min$c = 0;
const max$c = 0;
const R$c = [
  11,
  59,
  55,
  222
];
const G$c = [
  4,
  45,
  165,
  245
];
const B$c = [
  5,
  91,
  172,
  229
];
const A$c = [
  0,
  23,
  70,
  107
];
const I$c = [
  0,
  56,
  167,
  255
];
var mako = {
  min: min$c,
  max: max$c,
  R: R$c,
  G: G$c,
  B: B$c,
  A: A$c,
  I: I$c
};
const min$b = 0;
const max$b = 0;
const R$b = [
  0,
  85,
  0,
  0,
  0,
  0,
  0,
  0,
  85,
  255,
  255,
  255,
  172
];
const G$b = [
  0,
  0,
  0,
  0,
  85,
  170,
  255,
  255,
  255,
  255,
  85,
  0,
  0
];
const B$b = [
  0,
  170,
  85,
  255,
  255,
  170,
  170,
  0,
  85,
  0,
  0,
  0,
  0
];
const A$b = [
  0,
  5,
  10,
  21,
  26,
  32,
  37,
  42,
  48,
  53,
  64,
  72,
  85
];
const I$b = [
  0,
  15,
  31,
  63,
  79,
  95,
  111,
  127,
  143,
  159,
  191,
  217,
  255
];
var nih = {
  min: min$b,
  max: max$b,
  R: R$b,
  G: G$b,
  B: B$b,
  A: A$b,
  I: I$b
};
const min$a = 0;
const max$a = 0;
const R$a = [
  13,
  156,
  237,
  240
];
const G$a = [
  8,
  23,
  121,
  249
];
const B$a = [
  135,
  158,
  83,
  33
];
const A$a = [
  0,
  56,
  80,
  88
];
const I$a = [
  0,
  64,
  192,
  255
];
var plasma = {
  min: min$a,
  max: max$a,
  R: R$a,
  G: G$a,
  B: B$a,
  A: A$a,
  I: I$a
};
const min$9 = 0;
const max$9 = 255;
const R$9 = [
  208,
  71,
  33,
  192,
  32,
  195,
  208,
  173,
  233,
  202,
  25,
  210,
  145,
  89,
  87,
  245,
  246,
  38,
  3,
  25,
  57,
  167,
  245,
  86,
  227,
  208,
  81,
  64,
  90,
  199,
  140,
  48,
  212,
  180,
  70,
  120,
  9,
  192,
  245,
  177,
  65,
  157,
  9,
  193,
  100,
  181,
  125,
  145,
  62,
  8,
  108,
  36,
  140,
  237,
  242,
  248,
  161,
  189,
  41,
  114,
  65,
  121,
  97,
  50,
  238,
  149,
  44,
  214,
  124,
  167,
  40,
  167,
  127,
  178,
  231,
  30,
  173,
  244,
  193,
  203,
  204,
  238,
  139,
  135,
  71,
  234,
  234,
  217,
  66,
  14,
  129,
  19,
  97,
  165,
  112,
  244,
  35,
  73,
  192,
  12,
  149,
  71,
  33,
  192,
  32,
  195,
  208,
  173,
  233,
  202,
  25,
  210,
  145,
  89,
  87,
  245,
  246,
  38,
  3,
  25,
  57,
  167,
  245,
  86,
  227,
  208,
  81,
  64,
  90,
  199,
  140,
  48,
  212,
  180,
  70,
  120,
  9,
  192,
  245,
  177,
  65,
  157,
  9,
  193,
  100,
  181,
  125,
  145,
  62,
  8,
  108,
  36,
  140,
  237,
  242,
  248,
  161,
  189,
  41,
  114,
  65,
  121,
  97,
  50,
  238,
  149,
  44,
  214,
  124,
  167,
  40,
  167,
  127,
  178,
  231,
  30,
  173,
  244,
  193,
  203,
  204,
  238,
  139,
  135,
  71,
  234,
  234,
  217,
  66,
  14,
  129,
  19,
  97,
  165,
  112,
  244,
  35,
  73,
  192,
  12,
  149,
  71,
  33,
  192,
  32,
  195,
  208,
  173,
  233,
  202,
  25,
  210,
  145,
  89,
  87,
  245,
  246,
  38,
  3,
  25,
  57,
  167,
  245,
  86,
  227,
  208,
  81,
  64,
  90,
  199,
  140,
  48,
  212,
  180,
  70,
  120,
  9,
  192,
  245,
  177,
  65,
  157,
  9,
  193,
  100,
  181,
  125,
  145,
  62,
  8,
  108,
  36,
  140,
  237,
  242,
  248
];
const G$9 = [
  182,
  46,
  78,
  199,
  79,
  89,
  41,
  208,
  135,
  20,
  154,
  35,
  21,
  43,
  230,
  113,
  191,
  147,
  208,
  37,
  28,
  27,
  86,
  203,
  25,
  209,
  148,
  187,
  139,
  111,
  48,
  102,
  76,
  110,
  106,
  130,
  37,
  160,
  34,
  222,
  90,
  165,
  245,
  222,
  102,
  47,
  19,
  130,
  4,
  232,
  137,
  211,
  240,
  11,
  140,
  21,
  42,
  22,
  241,
  61,
  99,
  115,
  199,
  166,
  114,
  190,
  204,
  60,
  233,
  66,
  115,
  230,
  125,
  103,
  203,
  125,
  13,
  176,
  94,
  131,
  39,
  198,
  167,
  124,
  67,
  175,
  254,
  1,
  15,
  198,
  62,
  237,
  159,
  31,
  218,
  58,
  244,
  47,
  61,
  67,
  94,
  46,
  78,
  199,
  79,
  89,
  41,
  208,
  135,
  20,
  154,
  35,
  21,
  43,
  230,
  113,
  191,
  147,
  208,
  37,
  28,
  27,
  86,
  203,
  25,
  209,
  148,
  187,
  139,
  111,
  48,
  102,
  76,
  110,
  106,
  130,
  37,
  160,
  34,
  222,
  90,
  165,
  245,
  222,
  102,
  47,
  19,
  130,
  4,
  232,
  137,
  211,
  240,
  11,
  140,
  21,
  42,
  22,
  241,
  61,
  99,
  115,
  199,
  166,
  114,
  190,
  204,
  60,
  233,
  66,
  115,
  230,
  125,
  103,
  203,
  125,
  13,
  176,
  94,
  131,
  39,
  198,
  167,
  124,
  67,
  175,
  254,
  1,
  15,
  198,
  62,
  237,
  159,
  31,
  218,
  58,
  244,
  47,
  61,
  67,
  94,
  46,
  78,
  199,
  79,
  89,
  41,
  208,
  135,
  20,
  154,
  35,
  21,
  43,
  230,
  113,
  191,
  147,
  208,
  37,
  28,
  27,
  86,
  203,
  25,
  209,
  148,
  187,
  139,
  111,
  48,
  102,
  76,
  110,
  106,
  130,
  37,
  160,
  34,
  222,
  90,
  165,
  245,
  222,
  102,
  47,
  19,
  130,
  4,
  232,
  137,
  211,
  240,
  11,
  140,
  21
];
const B$9 = [
  191,
  154,
  43,
  10,
  207,
  204,
  164,
  231,
  136,
  58,
  239,
  30,
  147,
  230,
  101,
  111,
  150,
  35,
  128,
  57,
  252,
  79,
  173,
  120,
  25,
  126,
  81,
  85,
  8,
  7,
  122,
  237,
  190,
  152,
  246,
  182,
  130,
  219,
  67,
  76,
  167,
  178,
  235,
  250,
  28,
  61,
  186,
  250,
  199,
  67,
  58,
  50,
  86,
  182,
  108,
  77,
  89,
  112,
  59,
  125,
  226,
  50,
  205,
  227,
  125,
  128,
  104,
  27,
  59,
  66,
  53,
  133,
  159,
  203,
  97,
  125,
  139,
  159,
  158,
  7,
  215,
  47,
  140,
  226,
  223,
  231,
  44,
  110,
  184,
  61,
  233,
  47,
  67,
  148,
  22,
  120,
  173,
  156,
  117,
  181,
  94,
  154,
  43,
  10,
  207,
  204,
  164,
  231,
  136,
  58,
  239,
  30,
  147,
  230,
  101,
  111,
  150,
  35,
  128,
  57,
  252,
  79,
  173,
  120,
  25,
  126,
  81,
  85,
  8,
  7,
  122,
  237,
  190,
  152,
  246,
  182,
  130,
  219,
  67,
  76,
  167,
  178,
  235,
  250,
  28,
  61,
  186,
  250,
  199,
  67,
  58,
  50,
  86,
  182,
  108,
  77,
  89,
  112,
  59,
  125,
  226,
  50,
  205,
  227,
  125,
  128,
  104,
  27,
  59,
  66,
  53,
  133,
  159,
  203,
  97,
  125,
  139,
  159,
  158,
  7,
  215,
  47,
  140,
  226,
  223,
  231,
  44,
  110,
  184,
  61,
  233,
  47,
  67,
  148,
  22,
  120,
  173,
  156,
  117,
  181,
  94,
  154,
  43,
  10,
  207,
  204,
  164,
  231,
  136,
  58,
  239,
  30,
  147,
  230,
  101,
  111,
  150,
  35,
  128,
  57,
  252,
  79,
  173,
  120,
  25,
  126,
  81,
  85,
  8,
  7,
  122,
  237,
  190,
  152,
  246,
  182,
  130,
  219,
  67,
  76,
  167,
  178,
  235,
  250,
  28,
  61,
  186,
  250,
  199,
  67,
  58,
  50,
  86,
  182,
  108,
  77
];
const A$9 = [
  0,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64,
  64
];
const I$9 = [
  0,
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  16,
  17,
  18,
  19,
  20,
  21,
  22,
  23,
  24,
  25,
  26,
  27,
  28,
  29,
  30,
  31,
  32,
  33,
  34,
  35,
  36,
  37,
  38,
  39,
  40,
  41,
  42,
  43,
  44,
  45,
  46,
  47,
  48,
  49,
  50,
  51,
  52,
  53,
  54,
  55,
  56,
  57,
  58,
  59,
  60,
  61,
  62,
  63,
  64,
  65,
  66,
  67,
  68,
  69,
  70,
  71,
  72,
  73,
  74,
  75,
  76,
  77,
  78,
  79,
  80,
  81,
  82,
  83,
  84,
  85,
  86,
  87,
  88,
  89,
  90,
  91,
  92,
  93,
  94,
  95,
  96,
  97,
  98,
  99,
  100,
  101,
  102,
  103,
  104,
  105,
  106,
  107,
  108,
  109,
  110,
  111,
  112,
  113,
  114,
  115,
  116,
  117,
  118,
  119,
  120,
  121,
  122,
  123,
  124,
  125,
  126,
  127,
  128,
  129,
  130,
  131,
  132,
  133,
  134,
  135,
  136,
  137,
  138,
  139,
  140,
  141,
  142,
  143,
  144,
  145,
  146,
  147,
  148,
  149,
  150,
  151,
  152,
  153,
  154,
  155,
  156,
  157,
  158,
  159,
  160,
  161,
  162,
  163,
  164,
  165,
  166,
  167,
  168,
  169,
  170,
  171,
  172,
  173,
  174,
  175,
  176,
  177,
  178,
  179,
  180,
  181,
  182,
  183,
  184,
  185,
  186,
  187,
  188,
  189,
  190,
  191,
  192,
  193,
  194,
  195,
  196,
  197,
  198,
  199,
  200,
  201,
  202,
  203,
  204,
  205,
  206,
  207,
  208,
  209,
  210,
  211,
  212,
  213,
  214,
  215,
  216,
  217,
  218,
  219,
  220,
  221,
  222,
  223,
  224,
  225,
  226,
  227,
  228,
  229,
  230,
  231,
  232,
  233,
  234,
  235,
  236,
  237,
  238,
  239,
  240,
  241,
  242,
  243,
  244,
  245,
  246,
  247,
  248,
  249,
  250,
  251,
  252,
  253,
  254,
  255
];
var random = {
  min: min$9,
  max: max$9,
  R: R$9,
  G: G$9,
  B: B$9,
  A: A$9,
  I: I$9
};
const min$8 = 0;
const max$8 = 0;
const R$8 = [
  0,
  128,
  255
];
const G$8 = [
  0,
  0,
  0
];
const B$8 = [
  0,
  0,
  0
];
const A$8 = [
  0,
  64,
  128
];
const I$8 = [
  0,
  128,
  255
];
var red = {
  min: min$8,
  max: max$8,
  R: R$8,
  G: G$8,
  B: B$8,
  A: A$8,
  I: I$8
};
const min$7 = 0;
const max$7 = 0;
const R$7 = [
  192,
  224,
  255
];
const G$7 = [
  1,
  128,
  255
];
const B$7 = [
  0,
  0,
  0
];
const A$7 = [
  0,
  64,
  128
];
const I$7 = [
  1,
  128,
  255
];
var redyell = {
  min: min$7,
  max: max$7,
  R: R$7,
  G: G$7,
  B: B$7,
  A: A$7,
  I: I$7
};
const min$6 = 0;
const max$6 = 0;
const R$6 = [
  3,
  112,
  144,
  188,
  236,
  246,
  255
];
const G$6 = [
  5,
  31,
  29,
  22,
  76,
  158,
  250
];
const B$6 = [
  26,
  87,
  91,
  86,
  62,
  117,
  235
];
const A$6 = [
  0,
  30,
  38,
  49,
  67,
  85,
  107
];
const I$6 = [
  0,
  73,
  92,
  118,
  160,
  205,
  255
];
var rocket = {
  min: min$6,
  max: max$6,
  R: R$6,
  G: G$6,
  B: B$6,
  A: A$6,
  I: I$6
};
const min$5 = 0;
const max$5 = 0;
const R$5 = [
  1,
  240,
  255
];
const G$5 = [
  1,
  128,
  255
];
const B$5 = [
  1,
  128,
  255
];
const A$5 = [
  0,
  76,
  128
];
const I$5 = [
  0,
  153,
  255
];
var surface = {
  min: min$5,
  max: max$5,
  R: R$5,
  G: G$5,
  B: B$5,
  A: A$5,
  I: I$5
};
const min$4 = 0;
const max$4 = 0;
const R$4 = [
  0,
  128,
  255
];
const G$4 = [
  0,
  0,
  0
];
const B$4 = [
  0,
  128,
  255
];
const A$4 = [
  0,
  64,
  128
];
const I$4 = [
  0,
  128,
  255
];
var violet = {
  min: min$4,
  max: max$4,
  R: R$4,
  G: G$4,
  B: B$4,
  A: A$4,
  I: I$4
};
const min$3 = 0;
const max$3 = 0;
const R$3 = [
  68,
  49,
  53,
  253
];
const G$3 = [
  1,
  104,
  183,
  231
];
const B$3 = [
  84,
  142,
  121,
  37
];
const A$3 = [
  0,
  56,
  80,
  88
];
const I$3 = [
  0,
  64,
  192,
  255
];
var viridis = {
  min: min$3,
  max: max$3,
  R: R$3,
  G: G$3,
  B: B$3,
  A: A$3,
  I: I$3
};
const min$2 = 0;
const max$2 = 0;
const R$2 = [
  255,
  255,
  255
];
const G$2 = [
  127,
  196,
  254
];
const B$2 = [
  0,
  0,
  0
];
const A$2 = [
  0,
  64,
  128
];
const I$2 = [
  0,
  128,
  255
];
var warm = {
  min: min$2,
  max: max$2,
  R: R$2,
  G: G$2,
  B: B$2,
  A: A$2,
  I: I$2
};
const min$1 = 0;
const max$1 = 0;
const R$1 = [
  0,
  0,
  0
];
const G$1 = [
  0,
  128,
  255
];
const B$1 = [
  255,
  196,
  128
];
const A$1 = [
  0,
  64,
  128
];
const I$1 = [
  0,
  128,
  255
];
var winter = {
  min: min$1,
  max: max$1,
  R: R$1,
  G: G$1,
  B: B$1,
  A: A$1,
  I: I$1
};
const min = 0;
const max = 0;
const R = [
  3,
  64,
  0,
  0,
  255,
  255,
  255
];
const G = [
  0,
  0,
  0,
  255,
  255,
  192,
  3
];
const B = [
  0,
  32,
  48,
  56,
  64,
  96,
  128
];
const A = [
  0,
  8,
  16,
  24,
  32,
  52,
  80
];
const I = [
  0,
  32,
  64,
  96,
  160,
  192,
  255
];
var x_rain = {
  min,
  max,
  R,
  G,
  B,
  A,
  I
};
var cmaps = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  actc,
  blue,
  blue2red,
  bluegrn,
  bone,
  bronze,
  cividis,
  cool,
  copper,
  copper2,
  ct_airways,
  ct_bones,
  ct_brain,
  ct_brain_gray,
  ct_cardiac,
  ct_head,
  ct_kidneys,
  ct_liver,
  ct_muscles,
  ct_scalp,
  ct_skull,
  ct_soft,
  ct_soft_tissue,
  ct_surface,
  ct_vessels,
  ct_w_contrast,
  cubehelix,
  electric_blue,
  ge_color,
  gold,
  gray,
  green,
  hot,
  hotiron,
  hsv,
  inferno,
  jet,
  linspecer,
  magma,
  mako,
  nih,
  plasma,
  random,
  red,
  redyell,
  rocket,
  surface,
  violet,
  viridis,
  warm,
  winter,
  x_rain
});
/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
var extendStatics = function(d, b) {
  extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
    d2.__proto__ = b2;
  } || function(d2, b2) {
    for (var p in b2)
      if (Object.prototype.hasOwnProperty.call(b2, p))
        d2[p] = b2[p];
  };
  return extendStatics(d, b);
};
function __extends(d, b) {
  if (typeof b !== "function" && b !== null)
    throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
  extendStatics(d, b);
  function __() {
    this.constructor = d;
  }
  d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}
function __values(o) {
  var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
  if (m)
    return m.call(o);
  if (o && typeof o.length === "number")
    return {
      next: function() {
        if (o && i >= o.length)
          o = void 0;
        return { value: o && o[i++], done: !o };
      }
    };
  throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
}
function __read(o, n) {
  var m = typeof Symbol === "function" && o[Symbol.iterator];
  if (!m)
    return o;
  var i = m.call(o), r, ar = [], e;
  try {
    while ((n === void 0 || n-- > 0) && !(r = i.next()).done)
      ar.push(r.value);
  } catch (error) {
    e = { error };
  } finally {
    try {
      if (r && !r.done && (m = i["return"]))
        m.call(i);
    } finally {
      if (e)
        throw e.error;
    }
  }
  return ar;
}
function __spreadArray(to, from) {
  for (var i = 0, il = from.length, j = to.length; i < il; i++, j++)
    to[j] = from[i];
  return to;
}
function isFunction(value) {
  return typeof value === "function";
}
function createErrorClass(createImpl) {
  var _super = function(instance) {
    Error.call(instance);
    instance.stack = new Error().stack;
  };
  var ctorFunc = createImpl(_super);
  ctorFunc.prototype = Object.create(Error.prototype);
  ctorFunc.prototype.constructor = ctorFunc;
  return ctorFunc;
}
var UnsubscriptionError = createErrorClass(function(_super) {
  return function UnsubscriptionErrorImpl(errors) {
    _super(this);
    this.message = errors ? errors.length + " errors occurred during unsubscription:\n" + errors.map(function(err2, i) {
      return i + 1 + ") " + err2.toString();
    }).join("\n  ") : "";
    this.name = "UnsubscriptionError";
    this.errors = errors;
  };
});
function arrRemove(arr, item) {
  if (arr) {
    var index = arr.indexOf(item);
    0 <= index && arr.splice(index, 1);
  }
}
var Subscription = function() {
  function Subscription2(initialTeardown) {
    this.initialTeardown = initialTeardown;
    this.closed = false;
    this._parentage = null;
    this._teardowns = null;
  }
  Subscription2.prototype.unsubscribe = function() {
    var e_1, _a, e_2, _b;
    var errors;
    if (!this.closed) {
      this.closed = true;
      var _parentage = this._parentage;
      if (_parentage) {
        this._parentage = null;
        if (Array.isArray(_parentage)) {
          try {
            for (var _parentage_1 = __values(_parentage), _parentage_1_1 = _parentage_1.next(); !_parentage_1_1.done; _parentage_1_1 = _parentage_1.next()) {
              var parent_1 = _parentage_1_1.value;
              parent_1.remove(this);
            }
          } catch (e_1_1) {
            e_1 = { error: e_1_1 };
          } finally {
            try {
              if (_parentage_1_1 && !_parentage_1_1.done && (_a = _parentage_1.return))
                _a.call(_parentage_1);
            } finally {
              if (e_1)
                throw e_1.error;
            }
          }
        } else {
          _parentage.remove(this);
        }
      }
      var initialTeardown = this.initialTeardown;
      if (isFunction(initialTeardown)) {
        try {
          initialTeardown();
        } catch (e) {
          errors = e instanceof UnsubscriptionError ? e.errors : [e];
        }
      }
      var _teardowns = this._teardowns;
      if (_teardowns) {
        this._teardowns = null;
        try {
          for (var _teardowns_1 = __values(_teardowns), _teardowns_1_1 = _teardowns_1.next(); !_teardowns_1_1.done; _teardowns_1_1 = _teardowns_1.next()) {
            var teardown_1 = _teardowns_1_1.value;
            try {
              execTeardown(teardown_1);
            } catch (err2) {
              errors = errors !== null && errors !== void 0 ? errors : [];
              if (err2 instanceof UnsubscriptionError) {
                errors = __spreadArray(__spreadArray([], __read(errors)), __read(err2.errors));
              } else {
                errors.push(err2);
              }
            }
          }
        } catch (e_2_1) {
          e_2 = { error: e_2_1 };
        } finally {
          try {
            if (_teardowns_1_1 && !_teardowns_1_1.done && (_b = _teardowns_1.return))
              _b.call(_teardowns_1);
          } finally {
            if (e_2)
              throw e_2.error;
          }
        }
      }
      if (errors) {
        throw new UnsubscriptionError(errors);
      }
    }
  };
  Subscription2.prototype.add = function(teardown) {
    var _a;
    if (teardown && teardown !== this) {
      if (this.closed) {
        execTeardown(teardown);
      } else {
        if (teardown instanceof Subscription2) {
          if (teardown.closed || teardown._hasParent(this)) {
            return;
          }
          teardown._addParent(this);
        }
        (this._teardowns = (_a = this._teardowns) !== null && _a !== void 0 ? _a : []).push(teardown);
      }
    }
  };
  Subscription2.prototype._hasParent = function(parent) {
    var _parentage = this._parentage;
    return _parentage === parent || Array.isArray(_parentage) && _parentage.includes(parent);
  };
  Subscription2.prototype._addParent = function(parent) {
    var _parentage = this._parentage;
    this._parentage = Array.isArray(_parentage) ? (_parentage.push(parent), _parentage) : _parentage ? [_parentage, parent] : parent;
  };
  Subscription2.prototype._removeParent = function(parent) {
    var _parentage = this._parentage;
    if (_parentage === parent) {
      this._parentage = null;
    } else if (Array.isArray(_parentage)) {
      arrRemove(_parentage, parent);
    }
  };
  Subscription2.prototype.remove = function(teardown) {
    var _teardowns = this._teardowns;
    _teardowns && arrRemove(_teardowns, teardown);
    if (teardown instanceof Subscription2) {
      teardown._removeParent(this);
    }
  };
  Subscription2.EMPTY = function() {
    var empty = new Subscription2();
    empty.closed = true;
    return empty;
  }();
  return Subscription2;
}();
var EMPTY_SUBSCRIPTION = Subscription.EMPTY;
function isSubscription(value) {
  return value instanceof Subscription || value && "closed" in value && isFunction(value.remove) && isFunction(value.add) && isFunction(value.unsubscribe);
}
function execTeardown(teardown) {
  if (isFunction(teardown)) {
    teardown();
  } else {
    teardown.unsubscribe();
  }
}
var config = {
  onUnhandledError: null,
  onStoppedNotification: null,
  Promise: void 0,
  useDeprecatedSynchronousErrorHandling: false,
  useDeprecatedNextContext: false
};
var timeoutProvider = {
  setTimeout: function() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
      args[_i] = arguments[_i];
    }
    var delegate = timeoutProvider.delegate;
    return ((delegate === null || delegate === void 0 ? void 0 : delegate.setTimeout) || setTimeout).apply(void 0, __spreadArray([], __read(args)));
  },
  clearTimeout: function(handle) {
    var delegate = timeoutProvider.delegate;
    return ((delegate === null || delegate === void 0 ? void 0 : delegate.clearTimeout) || clearTimeout)(handle);
  },
  delegate: void 0
};
function reportUnhandledError(err2) {
  timeoutProvider.setTimeout(function() {
    {
      throw err2;
    }
  });
}
function noop() {
}
var context = null;
function errorContext(cb) {
  if (config.useDeprecatedSynchronousErrorHandling) {
    var isRoot = !context;
    if (isRoot) {
      context = { errorThrown: false, error: null };
    }
    cb();
    if (isRoot) {
      var _a = context, errorThrown = _a.errorThrown, error = _a.error;
      context = null;
      if (errorThrown) {
        throw error;
      }
    }
  } else {
    cb();
  }
}
var Subscriber = function(_super) {
  __extends(Subscriber2, _super);
  function Subscriber2(destination) {
    var _this = _super.call(this) || this;
    _this.isStopped = false;
    if (destination) {
      _this.destination = destination;
      if (isSubscription(destination)) {
        destination.add(_this);
      }
    } else {
      _this.destination = EMPTY_OBSERVER;
    }
    return _this;
  }
  Subscriber2.create = function(next, error, complete) {
    return new SafeSubscriber(next, error, complete);
  };
  Subscriber2.prototype.next = function(value) {
    if (this.isStopped)
      ;
    else {
      this._next(value);
    }
  };
  Subscriber2.prototype.error = function(err2) {
    if (this.isStopped)
      ;
    else {
      this.isStopped = true;
      this._error(err2);
    }
  };
  Subscriber2.prototype.complete = function() {
    if (this.isStopped)
      ;
    else {
      this.isStopped = true;
      this._complete();
    }
  };
  Subscriber2.prototype.unsubscribe = function() {
    if (!this.closed) {
      this.isStopped = true;
      _super.prototype.unsubscribe.call(this);
      this.destination = null;
    }
  };
  Subscriber2.prototype._next = function(value) {
    this.destination.next(value);
  };
  Subscriber2.prototype._error = function(err2) {
    try {
      this.destination.error(err2);
    } finally {
      this.unsubscribe();
    }
  };
  Subscriber2.prototype._complete = function() {
    try {
      this.destination.complete();
    } finally {
      this.unsubscribe();
    }
  };
  return Subscriber2;
}(Subscription);
var SafeSubscriber = function(_super) {
  __extends(SafeSubscriber2, _super);
  function SafeSubscriber2(observerOrNext, error, complete) {
    var _this = _super.call(this) || this;
    var next;
    if (isFunction(observerOrNext)) {
      next = observerOrNext;
    } else if (observerOrNext) {
      next = observerOrNext.next, error = observerOrNext.error, complete = observerOrNext.complete;
      var context_1;
      if (_this && config.useDeprecatedNextContext) {
        context_1 = Object.create(observerOrNext);
        context_1.unsubscribe = function() {
          return _this.unsubscribe();
        };
      } else {
        context_1 = observerOrNext;
      }
      next = next === null || next === void 0 ? void 0 : next.bind(context_1);
      error = error === null || error === void 0 ? void 0 : error.bind(context_1);
      complete = complete === null || complete === void 0 ? void 0 : complete.bind(context_1);
    }
    _this.destination = {
      next: next ? wrapForErrorHandling(next) : noop,
      error: wrapForErrorHandling(error !== null && error !== void 0 ? error : defaultErrorHandler),
      complete: complete ? wrapForErrorHandling(complete) : noop
    };
    return _this;
  }
  return SafeSubscriber2;
}(Subscriber);
function wrapForErrorHandling(handler, instance) {
  return function() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
      args[_i] = arguments[_i];
    }
    try {
      handler.apply(void 0, __spreadArray([], __read(args)));
    } catch (err2) {
      {
        reportUnhandledError(err2);
      }
    }
  };
}
function defaultErrorHandler(err2) {
  throw err2;
}
var EMPTY_OBSERVER = {
  closed: true,
  next: noop,
  error: defaultErrorHandler,
  complete: noop
};
var observable = function() {
  return typeof Symbol === "function" && Symbol.observable || "@@observable";
}();
function identity(x) {
  return x;
}
function pipeFromArray(fns) {
  if (fns.length === 0) {
    return identity;
  }
  if (fns.length === 1) {
    return fns[0];
  }
  return function piped(input) {
    return fns.reduce(function(prev, fn) {
      return fn(prev);
    }, input);
  };
}
var Observable = function() {
  function Observable2(subscribe) {
    if (subscribe) {
      this._subscribe = subscribe;
    }
  }
  Observable2.prototype.lift = function(operator) {
    var observable2 = new Observable2();
    observable2.source = this;
    observable2.operator = operator;
    return observable2;
  };
  Observable2.prototype.subscribe = function(observerOrNext, error, complete) {
    var _this = this;
    var subscriber = isSubscriber(observerOrNext) ? observerOrNext : new SafeSubscriber(observerOrNext, error, complete);
    errorContext(function() {
      var _a = _this, operator = _a.operator, source = _a.source;
      subscriber.add(operator ? operator.call(subscriber, source) : source ? _this._subscribe(subscriber) : _this._trySubscribe(subscriber));
    });
    return subscriber;
  };
  Observable2.prototype._trySubscribe = function(sink) {
    try {
      return this._subscribe(sink);
    } catch (err2) {
      sink.error(err2);
    }
  };
  Observable2.prototype.forEach = function(next, promiseCtor) {
    var _this = this;
    promiseCtor = getPromiseCtor(promiseCtor);
    return new promiseCtor(function(resolve, reject) {
      var subscription;
      subscription = _this.subscribe(function(value) {
        try {
          next(value);
        } catch (err2) {
          reject(err2);
          subscription === null || subscription === void 0 ? void 0 : subscription.unsubscribe();
        }
      }, reject, resolve);
    });
  };
  Observable2.prototype._subscribe = function(subscriber) {
    var _a;
    return (_a = this.source) === null || _a === void 0 ? void 0 : _a.subscribe(subscriber);
  };
  Observable2.prototype[observable] = function() {
    return this;
  };
  Observable2.prototype.pipe = function() {
    var operations = [];
    for (var _i = 0; _i < arguments.length; _i++) {
      operations[_i] = arguments[_i];
    }
    return pipeFromArray(operations)(this);
  };
  Observable2.prototype.toPromise = function(promiseCtor) {
    var _this = this;
    promiseCtor = getPromiseCtor(promiseCtor);
    return new promiseCtor(function(resolve, reject) {
      var value;
      _this.subscribe(function(x) {
        return value = x;
      }, function(err2) {
        return reject(err2);
      }, function() {
        return resolve(value);
      });
    });
  };
  Observable2.create = function(subscribe) {
    return new Observable2(subscribe);
  };
  return Observable2;
}();
function getPromiseCtor(promiseCtor) {
  var _a;
  return (_a = promiseCtor !== null && promiseCtor !== void 0 ? promiseCtor : config.Promise) !== null && _a !== void 0 ? _a : Promise;
}
function isObserver(value) {
  return value && isFunction(value.next) && isFunction(value.error) && isFunction(value.complete);
}
function isSubscriber(value) {
  return value && value instanceof Subscriber || isObserver(value) && isSubscription(value);
}
var ObjectUnsubscribedError = createErrorClass(function(_super) {
  return function ObjectUnsubscribedErrorImpl() {
    _super(this);
    this.name = "ObjectUnsubscribedError";
    this.message = "object unsubscribed";
  };
});
var Subject = function(_super) {
  __extends(Subject2, _super);
  function Subject2() {
    var _this = _super.call(this) || this;
    _this.closed = false;
    _this.observers = [];
    _this.isStopped = false;
    _this.hasError = false;
    _this.thrownError = null;
    return _this;
  }
  Subject2.prototype.lift = function(operator) {
    var subject = new AnonymousSubject(this, this);
    subject.operator = operator;
    return subject;
  };
  Subject2.prototype._throwIfClosed = function() {
    if (this.closed) {
      throw new ObjectUnsubscribedError();
    }
  };
  Subject2.prototype.next = function(value) {
    var _this = this;
    errorContext(function() {
      var e_1, _a;
      _this._throwIfClosed();
      if (!_this.isStopped) {
        var copy2 = _this.observers.slice();
        try {
          for (var copy_1 = __values(copy2), copy_1_1 = copy_1.next(); !copy_1_1.done; copy_1_1 = copy_1.next()) {
            var observer = copy_1_1.value;
            observer.next(value);
          }
        } catch (e_1_1) {
          e_1 = { error: e_1_1 };
        } finally {
          try {
            if (copy_1_1 && !copy_1_1.done && (_a = copy_1.return))
              _a.call(copy_1);
          } finally {
            if (e_1)
              throw e_1.error;
          }
        }
      }
    });
  };
  Subject2.prototype.error = function(err2) {
    var _this = this;
    errorContext(function() {
      _this._throwIfClosed();
      if (!_this.isStopped) {
        _this.hasError = _this.isStopped = true;
        _this.thrownError = err2;
        var observers = _this.observers;
        while (observers.length) {
          observers.shift().error(err2);
        }
      }
    });
  };
  Subject2.prototype.complete = function() {
    var _this = this;
    errorContext(function() {
      _this._throwIfClosed();
      if (!_this.isStopped) {
        _this.isStopped = true;
        var observers = _this.observers;
        while (observers.length) {
          observers.shift().complete();
        }
      }
    });
  };
  Subject2.prototype.unsubscribe = function() {
    this.isStopped = this.closed = true;
    this.observers = null;
  };
  Object.defineProperty(Subject2.prototype, "observed", {
    get: function() {
      var _a;
      return ((_a = this.observers) === null || _a === void 0 ? void 0 : _a.length) > 0;
    },
    enumerable: false,
    configurable: true
  });
  Subject2.prototype._trySubscribe = function(subscriber) {
    this._throwIfClosed();
    return _super.prototype._trySubscribe.call(this, subscriber);
  };
  Subject2.prototype._subscribe = function(subscriber) {
    this._throwIfClosed();
    this._checkFinalizedStatuses(subscriber);
    return this._innerSubscribe(subscriber);
  };
  Subject2.prototype._innerSubscribe = function(subscriber) {
    var _a = this, hasError = _a.hasError, isStopped = _a.isStopped, observers = _a.observers;
    return hasError || isStopped ? EMPTY_SUBSCRIPTION : (observers.push(subscriber), new Subscription(function() {
      return arrRemove(observers, subscriber);
    }));
  };
  Subject2.prototype._checkFinalizedStatuses = function(subscriber) {
    var _a = this, hasError = _a.hasError, thrownError = _a.thrownError, isStopped = _a.isStopped;
    if (hasError) {
      subscriber.error(thrownError);
    } else if (isStopped) {
      subscriber.complete();
    }
  };
  Subject2.prototype.asObservable = function() {
    var observable2 = new Observable();
    observable2.source = this;
    return observable2;
  };
  Subject2.create = function(destination, source) {
    return new AnonymousSubject(destination, source);
  };
  return Subject2;
}(Observable);
var AnonymousSubject = function(_super) {
  __extends(AnonymousSubject2, _super);
  function AnonymousSubject2(destination, source) {
    var _this = _super.call(this) || this;
    _this.destination = destination;
    _this.source = source;
    return _this;
  }
  AnonymousSubject2.prototype.next = function(value) {
    var _a, _b;
    (_b = (_a = this.destination) === null || _a === void 0 ? void 0 : _a.next) === null || _b === void 0 ? void 0 : _b.call(_a, value);
  };
  AnonymousSubject2.prototype.error = function(err2) {
    var _a, _b;
    (_b = (_a = this.destination) === null || _a === void 0 ? void 0 : _a.error) === null || _b === void 0 ? void 0 : _b.call(_a, err2);
  };
  AnonymousSubject2.prototype.complete = function() {
    var _a, _b;
    (_b = (_a = this.destination) === null || _a === void 0 ? void 0 : _a.complete) === null || _b === void 0 ? void 0 : _b.call(_a);
  };
  AnonymousSubject2.prototype._subscribe = function(subscriber) {
    var _a, _b;
    return (_b = (_a = this.source) === null || _a === void 0 ? void 0 : _a.subscribe(subscriber)) !== null && _b !== void 0 ? _b : EMPTY_SUBSCRIPTION;
  };
  return AnonymousSubject2;
}(Subject);
var NiivueObject3D = function(id, vertexBuffer, mode, indexCount, indexBuffer = null, textureCoordinateBuffer = null) {
  this.BLEND = 1;
  this.CULL_FACE = 2;
  this.CULL_FRONT = 4;
  this.CULL_BACK = 8;
  this.ENABLE_DEPTH_TEST = 16;
  this.renderShaders = [];
  this.pickingShader = null;
  this.isVisible = true;
  this.vertexBuffer = vertexBuffer;
  this.indexCount = indexCount;
  this.indexBuffer = indexBuffer;
  this.textureCoordinateBuffer = textureCoordinateBuffer;
  this.mode = mode;
  this.glFlags = 0;
  this.id = id;
  this.colorId = [
    (id >> 0 & 255) / 255,
    (id >> 8 & 255) / 255,
    (id >> 16 & 255) / 255,
    (id >> 24 & 255) / 255
  ];
  this.modelMatrix = create$2();
  this.scale = [1, 1, 1];
  this.position = [0, 0, 0];
  this.rotation = [0, 0, 0];
  this.rotationRadians = 0;
  this.extentsMin = [];
  this.extentsMax = [];
};
var NiivueShader3D = function(shader) {
  this.shader = shader;
  this.uniforms = shader.uniforms;
  this.mvpUniformName = "";
  this.clipPlaneUniformName = "";
  this.rayDirUniformName = "";
};
NiivueShader3D.prototype.use = function(gl) {
  return this.shader.use(gl);
};
function commonjsRequire(path) {
  throw new Error('Could not dynamically require "' + path + '". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.');
}
var nifti = { exports: {} };
var nifti1 = { exports: {} };
var utilities = { exports: {} };
(function(module) {
  var nifti3 = nifti3 || {};
  nifti3.Utils = nifti3.Utils || {};
  nifti3.Utils.crcTable = null;
  nifti3.Utils.GUNZIP_MAGIC_COOKIE1 = 31;
  nifti3.Utils.GUNZIP_MAGIC_COOKIE2 = 139;
  nifti3.Utils.getStringAt = function(data, start, end) {
    var str = "", ctr, ch;
    for (ctr = start; ctr < end; ctr += 1) {
      ch = data.getUint8(ctr);
      if (ch !== 0) {
        str += String.fromCharCode(ch);
      }
    }
    return str;
  };
  nifti3.Utils.getByteAt = function(data, start) {
    return data.getInt8(start);
  };
  nifti3.Utils.getShortAt = function(data, start, littleEndian) {
    return data.getInt16(start, littleEndian);
  };
  nifti3.Utils.getIntAt = function(data, start, littleEndian) {
    return data.getInt32(start, littleEndian);
  };
  nifti3.Utils.getFloatAt = function(data, start, littleEndian) {
    return data.getFloat32(start, littleEndian);
  };
  nifti3.Utils.getDoubleAt = function(data, start, littleEndian) {
    return data.getFloat64(start, littleEndian);
  };
  nifti3.Utils.getLongAt = function(data, start, littleEndian) {
    var ctr, array = [], value = 0;
    for (ctr = 0; ctr < 8; ctr += 1) {
      array[ctr] = nifti3.Utils.getByteAt(data, start + ctr, littleEndian);
    }
    for (ctr = array.length - 1; ctr >= 0; ctr--) {
      value = value * 256 + array[ctr];
    }
    return value;
  };
  nifti3.Utils.toArrayBuffer = function(buffer) {
    var ab, view, i;
    ab = new ArrayBuffer(buffer.length);
    view = new Uint8Array(ab);
    for (i = 0; i < buffer.length; i += 1) {
      view[i] = buffer[i];
    }
    return ab;
  };
  nifti3.Utils.isString = function(obj) {
    return typeof obj === "string" || obj instanceof String;
  };
  nifti3.Utils.formatNumber = function(num, shortFormat) {
    var val = 0;
    if (nifti3.Utils.isString(num)) {
      val = Number(num);
    } else {
      val = num;
    }
    if (shortFormat) {
      val = val.toPrecision(5);
    } else {
      val = val.toPrecision(7);
    }
    return parseFloat(val);
  };
  nifti3.Utils.makeCRCTable = function() {
    var c;
    var crcTable2 = [];
    for (var n = 0; n < 256; n++) {
      c = n;
      for (var k = 0; k < 8; k++) {
        c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
      }
      crcTable2[n] = c;
    }
    return crcTable2;
  };
  nifti3.Utils.crc32 = function(dataView) {
    var crcTable2 = nifti3.Utils.crcTable || (nifti3.Utils.crcTable = nifti3.Utils.makeCRCTable());
    var crc = 0 ^ -1;
    for (var i = 0; i < dataView.byteLength; i++) {
      crc = crc >>> 8 ^ crcTable2[(crc ^ dataView.getUint8(i)) & 255];
    }
    return (crc ^ -1) >>> 0;
  };
  if (module.exports) {
    module.exports = nifti3.Utils;
  }
})(utilities);
(function(module) {
  var nifti3 = nifti3 || {};
  nifti3.Utils = nifti3.Utils || (typeof commonjsRequire !== "undefined" ? utilities.exports : null);
  nifti3.NIFTI1 = nifti3.NIFTI1 || function() {
    this.littleEndian = false;
    this.dim_info = 0;
    this.dims = [];
    this.intent_p1 = 0;
    this.intent_p2 = 0;
    this.intent_p3 = 0;
    this.intent_code = 0;
    this.datatypeCode = 0;
    this.numBitsPerVoxel = 0;
    this.slice_start = 0;
    this.slice_end = 0;
    this.slice_code = 0;
    this.pixDims = [];
    this.vox_offset = 0;
    this.scl_slope = 1;
    this.scl_inter = 0;
    this.xyzt_units = 0;
    this.cal_max = 0;
    this.cal_min = 0;
    this.slice_duration = 0;
    this.toffset = 0;
    this.description = "";
    this.aux_file = "";
    this.intent_name = "";
    this.qform_code = 0;
    this.sform_code = 0;
    this.quatern_b = 0;
    this.quatern_c = 0;
    this.quatern_d = 0;
    this.qoffset_x = 0;
    this.qoffset_y = 0;
    this.qoffset_z = 0;
    this.affine = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
    this.magic = 0;
    this.isHDR = false;
    this.extensionFlag = [0, 0, 0, 0];
    this.extensionSize = 0;
    this.extensionCode = 0;
  };
  nifti3.NIFTI1.TYPE_NONE = 0;
  nifti3.NIFTI1.TYPE_BINARY = 1;
  nifti3.NIFTI1.TYPE_UINT8 = 2;
  nifti3.NIFTI1.TYPE_INT16 = 4;
  nifti3.NIFTI1.TYPE_INT32 = 8;
  nifti3.NIFTI1.TYPE_FLOAT32 = 16;
  nifti3.NIFTI1.TYPE_COMPLEX64 = 32;
  nifti3.NIFTI1.TYPE_FLOAT64 = 64;
  nifti3.NIFTI1.TYPE_RGB24 = 128;
  nifti3.NIFTI1.TYPE_INT8 = 256;
  nifti3.NIFTI1.TYPE_UINT16 = 512;
  nifti3.NIFTI1.TYPE_UINT32 = 768;
  nifti3.NIFTI1.TYPE_INT64 = 1024;
  nifti3.NIFTI1.TYPE_UINT64 = 1280;
  nifti3.NIFTI1.TYPE_FLOAT128 = 1536;
  nifti3.NIFTI1.TYPE_COMPLEX128 = 1792;
  nifti3.NIFTI1.TYPE_COMPLEX256 = 2048;
  nifti3.NIFTI1.XFORM_UNKNOWN = 0;
  nifti3.NIFTI1.XFORM_SCANNER_ANAT = 1;
  nifti3.NIFTI1.XFORM_ALIGNED_ANAT = 2;
  nifti3.NIFTI1.XFORM_TALAIRACH = 3;
  nifti3.NIFTI1.XFORM_MNI_152 = 4;
  nifti3.NIFTI1.SPATIAL_UNITS_MASK = 7;
  nifti3.NIFTI1.TEMPORAL_UNITS_MASK = 56;
  nifti3.NIFTI1.UNITS_UNKNOWN = 0;
  nifti3.NIFTI1.UNITS_METER = 1;
  nifti3.NIFTI1.UNITS_MM = 2;
  nifti3.NIFTI1.UNITS_MICRON = 3;
  nifti3.NIFTI1.UNITS_SEC = 8;
  nifti3.NIFTI1.UNITS_MSEC = 16;
  nifti3.NIFTI1.UNITS_USEC = 24;
  nifti3.NIFTI1.UNITS_HZ = 32;
  nifti3.NIFTI1.UNITS_PPM = 40;
  nifti3.NIFTI1.UNITS_RADS = 48;
  nifti3.NIFTI1.MAGIC_COOKIE = 348;
  nifti3.NIFTI1.STANDARD_HEADER_SIZE = 348;
  nifti3.NIFTI1.MAGIC_NUMBER_LOCATION = 344;
  nifti3.NIFTI1.MAGIC_NUMBER = [110, 43, 49];
  nifti3.NIFTI1.MAGIC_NUMBER2 = [110, 105, 49];
  nifti3.NIFTI1.EXTENSION_HEADER_SIZE = 8;
  nifti3.NIFTI1.prototype.readHeader = function(data) {
    var rawData = new DataView(data), magicCookieVal = nifti3.Utils.getIntAt(rawData, 0, this.littleEndian), ctr, ctrOut, ctrIn, index;
    if (magicCookieVal !== nifti3.NIFTI1.MAGIC_COOKIE) {
      this.littleEndian = true;
      magicCookieVal = nifti3.Utils.getIntAt(rawData, 0, this.littleEndian);
    }
    if (magicCookieVal !== nifti3.NIFTI1.MAGIC_COOKIE) {
      throw new Error("This does not appear to be a NIFTI file!");
    }
    this.dim_info = nifti3.Utils.getByteAt(rawData, 39);
    for (ctr = 0; ctr < 8; ctr += 1) {
      index = 40 + ctr * 2;
      this.dims[ctr] = nifti3.Utils.getShortAt(rawData, index, this.littleEndian);
    }
    this.intent_p1 = nifti3.Utils.getFloatAt(rawData, 56, this.littleEndian);
    this.intent_p2 = nifti3.Utils.getFloatAt(rawData, 60, this.littleEndian);
    this.intent_p3 = nifti3.Utils.getFloatAt(rawData, 64, this.littleEndian);
    this.intent_code = nifti3.Utils.getShortAt(rawData, 68, this.littleEndian);
    this.datatypeCode = nifti3.Utils.getShortAt(rawData, 70, this.littleEndian);
    this.numBitsPerVoxel = nifti3.Utils.getShortAt(rawData, 72, this.littleEndian);
    this.slice_start = nifti3.Utils.getShortAt(rawData, 74, this.littleEndian);
    for (ctr = 0; ctr < 8; ctr += 1) {
      index = 76 + ctr * 4;
      this.pixDims[ctr] = nifti3.Utils.getFloatAt(rawData, index, this.littleEndian);
    }
    this.vox_offset = nifti3.Utils.getFloatAt(rawData, 108, this.littleEndian);
    this.scl_slope = nifti3.Utils.getFloatAt(rawData, 112, this.littleEndian);
    this.scl_inter = nifti3.Utils.getFloatAt(rawData, 116, this.littleEndian);
    this.slice_end = nifti3.Utils.getShortAt(rawData, 120, this.littleEndian);
    this.slice_code = nifti3.Utils.getByteAt(rawData, 122);
    this.xyzt_units = nifti3.Utils.getByteAt(rawData, 123);
    this.cal_max = nifti3.Utils.getFloatAt(rawData, 124, this.littleEndian);
    this.cal_min = nifti3.Utils.getFloatAt(rawData, 128, this.littleEndian);
    this.slice_duration = nifti3.Utils.getFloatAt(rawData, 132, this.littleEndian);
    this.toffset = nifti3.Utils.getFloatAt(rawData, 136, this.littleEndian);
    this.description = nifti3.Utils.getStringAt(rawData, 148, 228);
    this.aux_file = nifti3.Utils.getStringAt(rawData, 228, 252);
    this.qform_code = nifti3.Utils.getShortAt(rawData, 252, this.littleEndian);
    this.sform_code = nifti3.Utils.getShortAt(rawData, 254, this.littleEndian);
    this.quatern_b = nifti3.Utils.getFloatAt(rawData, 256, this.littleEndian);
    this.quatern_c = nifti3.Utils.getFloatAt(rawData, 260, this.littleEndian);
    this.quatern_d = nifti3.Utils.getFloatAt(rawData, 264, this.littleEndian);
    this.qoffset_x = nifti3.Utils.getFloatAt(rawData, 268, this.littleEndian);
    this.qoffset_y = nifti3.Utils.getFloatAt(rawData, 272, this.littleEndian);
    this.qoffset_z = nifti3.Utils.getFloatAt(rawData, 276, this.littleEndian);
    for (ctrOut = 0; ctrOut < 3; ctrOut += 1) {
      for (ctrIn = 0; ctrIn < 4; ctrIn += 1) {
        index = 280 + (ctrOut * 4 + ctrIn) * 4;
        this.affine[ctrOut][ctrIn] = nifti3.Utils.getFloatAt(rawData, index, this.littleEndian);
      }
    }
    this.affine[3][0] = 0;
    this.affine[3][1] = 0;
    this.affine[3][2] = 0;
    this.affine[3][3] = 1;
    this.intent_name = nifti3.Utils.getStringAt(rawData, 328, 344);
    this.magic = nifti3.Utils.getStringAt(rawData, 344, 348);
    this.isHDR = this.magic === nifti3.NIFTI1.MAGIC_NUMBER2;
    if (rawData.byteLength > nifti3.NIFTI1.MAGIC_COOKIE) {
      this.extensionFlag[0] = nifti3.Utils.getByteAt(rawData, 348);
      this.extensionFlag[1] = nifti3.Utils.getByteAt(rawData, 348 + 1);
      this.extensionFlag[2] = nifti3.Utils.getByteAt(rawData, 348 + 2);
      this.extensionFlag[3] = nifti3.Utils.getByteAt(rawData, 348 + 3);
      if (this.extensionFlag[0]) {
        this.extensionSize = this.getExtensionSize(rawData);
        this.extensionCode = this.getExtensionCode(rawData);
      }
    }
  };
  nifti3.NIFTI1.prototype.toFormattedString = function() {
    var fmt = nifti3.Utils.formatNumber, string = "";
    string += "Dim Info = " + this.dim_info + "\n";
    string += "Image Dimensions (1-8): " + this.dims[0] + ", " + this.dims[1] + ", " + this.dims[2] + ", " + this.dims[3] + ", " + this.dims[4] + ", " + this.dims[5] + ", " + this.dims[6] + ", " + this.dims[7] + "\n";
    string += "Intent Parameters (1-3): " + this.intent_p1 + ", " + this.intent_p2 + ", " + this.intent_p3 + "\n";
    string += "Intent Code = " + this.intent_code + "\n";
    string += "Datatype = " + this.datatypeCode + " (" + this.getDatatypeCodeString(this.datatypeCode) + ")\n";
    string += "Bits Per Voxel = " + this.numBitsPerVoxel + "\n";
    string += "Slice Start = " + this.slice_start + "\n";
    string += "Voxel Dimensions (1-8): " + fmt(this.pixDims[0]) + ", " + fmt(this.pixDims[1]) + ", " + fmt(this.pixDims[2]) + ", " + fmt(this.pixDims[3]) + ", " + fmt(this.pixDims[4]) + ", " + fmt(this.pixDims[5]) + ", " + fmt(this.pixDims[6]) + ", " + fmt(this.pixDims[7]) + "\n";
    string += "Image Offset = " + this.vox_offset + "\n";
    string += "Data Scale:  Slope = " + fmt(this.scl_slope) + "  Intercept = " + fmt(this.scl_inter) + "\n";
    string += "Slice End = " + this.slice_end + "\n";
    string += "Slice Code = " + this.slice_code + "\n";
    string += "Units Code = " + this.xyzt_units + " (" + this.getUnitsCodeString(nifti3.NIFTI1.SPATIAL_UNITS_MASK & this.xyzt_units) + ", " + this.getUnitsCodeString(nifti3.NIFTI1.TEMPORAL_UNITS_MASK & this.xyzt_units) + ")\n";
    string += "Display Range:  Max = " + fmt(this.cal_max) + "  Min = " + fmt(this.cal_min) + "\n";
    string += "Slice Duration = " + this.slice_duration + "\n";
    string += "Time Axis Shift = " + this.toffset + "\n";
    string += 'Description: "' + this.description + '"\n';
    string += 'Auxiliary File: "' + this.aux_file + '"\n';
    string += "Q-Form Code = " + this.qform_code + " (" + this.getTransformCodeString(this.qform_code) + ")\n";
    string += "S-Form Code = " + this.sform_code + " (" + this.getTransformCodeString(this.sform_code) + ")\n";
    string += "Quaternion Parameters:  b = " + fmt(this.quatern_b) + "  c = " + fmt(this.quatern_c) + "  d = " + fmt(this.quatern_d) + "\n";
    string += "Quaternion Offsets:  x = " + this.qoffset_x + "  y = " + this.qoffset_y + "  z = " + this.qoffset_z + "\n";
    string += "S-Form Parameters X: " + fmt(this.affine[0][0]) + ", " + fmt(this.affine[0][1]) + ", " + fmt(this.affine[0][2]) + ", " + fmt(this.affine[0][3]) + "\n";
    string += "S-Form Parameters Y: " + fmt(this.affine[1][0]) + ", " + fmt(this.affine[1][1]) + ", " + fmt(this.affine[1][2]) + ", " + fmt(this.affine[1][3]) + "\n";
    string += "S-Form Parameters Z: " + fmt(this.affine[2][0]) + ", " + fmt(this.affine[2][1]) + ", " + fmt(this.affine[2][2]) + ", " + fmt(this.affine[2][3]) + "\n";
    string += 'Intent Name: "' + this.intent_name + '"\n';
    if (this.extensionFlag[0]) {
      string += "Extension: Size = " + this.extensionSize + "  Code = " + this.extensionCode + "\n";
    }
    return string;
  };
  nifti3.NIFTI1.prototype.getDatatypeCodeString = function(code) {
    if (code === nifti3.NIFTI1.TYPE_UINT8) {
      return "1-Byte Unsigned Integer";
    } else if (code === nifti3.NIFTI1.TYPE_INT16) {
      return "2-Byte Signed Integer";
    } else if (code === nifti3.NIFTI1.TYPE_INT32) {
      return "4-Byte Signed Integer";
    } else if (code === nifti3.NIFTI1.TYPE_FLOAT32) {
      return "4-Byte Float";
    } else if (code === nifti3.NIFTI1.TYPE_FLOAT64) {
      return "8-Byte Float";
    } else if (code === nifti3.NIFTI1.TYPE_RGB24) {
      return "RGB";
    } else if (code === nifti3.NIFTI1.TYPE_INT8) {
      return "1-Byte Signed Integer";
    } else if (code === nifti3.NIFTI1.TYPE_UINT16) {
      return "2-Byte Unsigned Integer";
    } else if (code === nifti3.NIFTI1.TYPE_UINT32) {
      return "4-Byte Unsigned Integer";
    } else if (code === nifti3.NIFTI1.TYPE_INT64) {
      return "8-Byte Signed Integer";
    } else if (code === nifti3.NIFTI1.TYPE_UINT64) {
      return "8-Byte Unsigned Integer";
    } else {
      return "Unknown";
    }
  };
  nifti3.NIFTI1.prototype.getTransformCodeString = function(code) {
    if (code === nifti3.NIFTI1.XFORM_SCANNER_ANAT) {
      return "Scanner";
    } else if (code === nifti3.NIFTI1.XFORM_ALIGNED_ANAT) {
      return "Aligned";
    } else if (code === nifti3.NIFTI1.XFORM_TALAIRACH) {
      return "Talairach";
    } else if (code === nifti3.NIFTI1.XFORM_MNI_152) {
      return "MNI";
    } else {
      return "Unknown";
    }
  };
  nifti3.NIFTI1.prototype.getUnitsCodeString = function(code) {
    if (code === nifti3.NIFTI1.UNITS_METER) {
      return "Meters";
    } else if (code === nifti3.NIFTI1.UNITS_MM) {
      return "Millimeters";
    } else if (code === nifti3.NIFTI1.UNITS_MICRON) {
      return "Microns";
    } else if (code === nifti3.NIFTI1.UNITS_SEC) {
      return "Seconds";
    } else if (code === nifti3.NIFTI1.UNITS_MSEC) {
      return "Milliseconds";
    } else if (code === nifti3.NIFTI1.UNITS_USEC) {
      return "Microseconds";
    } else if (code === nifti3.NIFTI1.UNITS_HZ) {
      return "Hz";
    } else if (code === nifti3.NIFTI1.UNITS_PPM) {
      return "PPM";
    } else if (code === nifti3.NIFTI1.UNITS_RADS) {
      return "Rads";
    } else {
      return "Unknown";
    }
  };
  nifti3.NIFTI1.prototype.getQformMat = function() {
    return this.convertNiftiQFormToNiftiSForm(this.quatern_b, this.quatern_c, this.quatern_d, this.qoffset_x, this.qoffset_y, this.qoffset_z, this.pixDims[1], this.pixDims[2], this.pixDims[3], this.pixDims[0]);
  };
  nifti3.NIFTI1.prototype.convertNiftiQFormToNiftiSForm = function(qb, qc, qd, qx, qy, qz, dx, dy, dz, qfac) {
    var R2 = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], a, b = qb, c = qc, d = qd, xd, yd, zd;
    R2[3][0] = R2[3][1] = R2[3][2] = 0;
    R2[3][3] = 1;
    a = 1 - (b * b + c * c + d * d);
    if (a < 1e-7) {
      a = 1 / Math.sqrt(b * b + c * c + d * d);
      b *= a;
      c *= a;
      d *= a;
      a = 0;
    } else {
      a = Math.sqrt(a);
    }
    xd = dx > 0 ? dx : 1;
    yd = dy > 0 ? dy : 1;
    zd = dz > 0 ? dz : 1;
    if (qfac < 0) {
      zd = -zd;
    }
    R2[0][0] = (a * a + b * b - c * c - d * d) * xd;
    R2[0][1] = 2 * (b * c - a * d) * yd;
    R2[0][2] = 2 * (b * d + a * c) * zd;
    R2[1][0] = 2 * (b * c + a * d) * xd;
    R2[1][1] = (a * a + c * c - b * b - d * d) * yd;
    R2[1][2] = 2 * (c * d - a * b) * zd;
    R2[2][0] = 2 * (b * d - a * c) * xd;
    R2[2][1] = 2 * (c * d + a * b) * yd;
    R2[2][2] = (a * a + d * d - c * c - b * b) * zd;
    R2[0][3] = qx;
    R2[1][3] = qy;
    R2[2][3] = qz;
    return R2;
  };
  nifti3.NIFTI1.prototype.convertNiftiSFormToNEMA = function(R2) {
    var xi, xj, xk, yi, yj, yk, zi, zj, zk, val, detQ, detP, i, j, k, p, q, r, ibest, jbest, kbest, pbest, qbest, rbest, M, vbest, Q, P, iChar, jChar, kChar, iSense, jSense, kSense;
    k = 0;
    Q = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    P = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    xi = R2[0][0];
    xj = R2[0][1];
    xk = R2[0][2];
    yi = R2[1][0];
    yj = R2[1][1];
    yk = R2[1][2];
    zi = R2[2][0];
    zj = R2[2][1];
    zk = R2[2][2];
    val = Math.sqrt(xi * xi + yi * yi + zi * zi);
    if (val === 0) {
      return null;
    }
    xi /= val;
    yi /= val;
    zi /= val;
    val = Math.sqrt(xj * xj + yj * yj + zj * zj);
    if (val === 0) {
      return null;
    }
    xj /= val;
    yj /= val;
    zj /= val;
    val = xi * xj + yi * yj + zi * zj;
    if (Math.abs(val) > 1e-4) {
      xj -= val * xi;
      yj -= val * yi;
      zj -= val * zi;
      val = Math.sqrt(xj * xj + yj * yj + zj * zj);
      if (val === 0) {
        return null;
      }
      xj /= val;
      yj /= val;
      zj /= val;
    }
    val = Math.sqrt(xk * xk + yk * yk + zk * zk);
    if (val === 0) {
      xk = yi * zj - zi * yj;
      yk = zi * xj - zj * xi;
      zk = xi * yj - yi * xj;
    } else {
      xk /= val;
      yk /= val;
      zk /= val;
    }
    val = xi * xk + yi * yk + zi * zk;
    if (Math.abs(val) > 1e-4) {
      xk -= val * xi;
      yk -= val * yi;
      zk -= val * zi;
      val = Math.sqrt(xk * xk + yk * yk + zk * zk);
      if (val === 0) {
        return null;
      }
      xk /= val;
      yk /= val;
      zk /= val;
    }
    val = xj * xk + yj * yk + zj * zk;
    if (Math.abs(val) > 1e-4) {
      xk -= val * xj;
      yk -= val * yj;
      zk -= val * zj;
      val = Math.sqrt(xk * xk + yk * yk + zk * zk);
      if (val === 0) {
        return null;
      }
      xk /= val;
      yk /= val;
      zk /= val;
    }
    Q[0][0] = xi;
    Q[0][1] = xj;
    Q[0][2] = xk;
    Q[1][0] = yi;
    Q[1][1] = yj;
    Q[1][2] = yk;
    Q[2][0] = zi;
    Q[2][1] = zj;
    Q[2][2] = zk;
    detQ = this.nifti_mat33_determ(Q);
    if (detQ === 0) {
      return null;
    }
    vbest = -666;
    ibest = pbest = qbest = rbest = 1;
    jbest = 2;
    kbest = 3;
    for (i = 1; i <= 3; i += 1) {
      for (j = 1; j <= 3; j += 1) {
        if (i !== j) {
          for (k = 1; k <= 3; k += 1) {
            if (!(i === k || j === k)) {
              P[0][0] = P[0][1] = P[0][2] = P[1][0] = P[1][1] = P[1][2] = P[2][0] = P[2][1] = P[2][2] = 0;
              for (p = -1; p <= 1; p += 2) {
                for (q = -1; q <= 1; q += 2) {
                  for (r = -1; r <= 1; r += 2) {
                    P[0][i - 1] = p;
                    P[1][j - 1] = q;
                    P[2][k - 1] = r;
                    detP = this.nifti_mat33_determ(P);
                    if (detP * detQ > 0) {
                      M = this.nifti_mat33_mul(P, Q);
                      val = M[0][0] + M[1][1] + M[2][2];
                      if (val > vbest) {
                        vbest = val;
                        ibest = i;
                        jbest = j;
                        kbest = k;
                        pbest = p;
                        qbest = q;
                        rbest = r;
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    iChar = jChar = kChar = iSense = jSense = kSense = 0;
    switch (ibest * pbest) {
      case 1:
        iChar = "X";
        iSense = "+";
        break;
      case -1:
        iChar = "X";
        iSense = "-";
        break;
      case 2:
        iChar = "Y";
        iSense = "+";
        break;
      case -2:
        iChar = "Y";
        iSense = "-";
        break;
      case 3:
        iChar = "Z";
        iSense = "+";
        break;
      case -3:
        iChar = "Z";
        iSense = "-";
        break;
    }
    switch (jbest * qbest) {
      case 1:
        jChar = "X";
        jSense = "+";
        break;
      case -1:
        jChar = "X";
        jSense = "-";
        break;
      case 2:
        jChar = "Y";
        jSense = "+";
        break;
      case -2:
        jChar = "Y";
        jSense = "-";
        break;
      case 3:
        jChar = "Z";
        jSense = "+";
        break;
      case -3:
        jChar = "Z";
        jSense = "-";
        break;
    }
    switch (kbest * rbest) {
      case 1:
        kChar = "X";
        kSense = "+";
        break;
      case -1:
        kChar = "X";
        kSense = "-";
        break;
      case 2:
        kChar = "Y";
        kSense = "+";
        break;
      case -2:
        kChar = "Y";
        kSense = "-";
        break;
      case 3:
        kChar = "Z";
        kSense = "+";
        break;
      case -3:
        kChar = "Z";
        kSense = "-";
        break;
    }
    return iChar + jChar + kChar + iSense + jSense + kSense;
  };
  nifti3.NIFTI1.prototype.nifti_mat33_mul = function(A2, B2) {
    var C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], i, j;
    for (i = 0; i < 3; i += 1) {
      for (j = 0; j < 3; j += 1) {
        C[i][j] = A2[i][0] * B2[0][j] + A2[i][1] * B2[1][j] + A2[i][2] * B2[2][j];
      }
    }
    return C;
  };
  nifti3.NIFTI1.prototype.nifti_mat33_determ = function(R2) {
    var r11, r12, r13, r21, r22, r23, r31, r32, r33;
    r11 = R2[0][0];
    r12 = R2[0][1];
    r13 = R2[0][2];
    r21 = R2[1][0];
    r22 = R2[1][1];
    r23 = R2[1][2];
    r31 = R2[2][0];
    r32 = R2[2][1];
    r33 = R2[2][2];
    return r11 * r22 * r33 - r11 * r32 * r23 - r21 * r12 * r33 + r21 * r32 * r13 + r31 * r12 * r23 - r31 * r22 * r13;
  };
  nifti3.NIFTI1.prototype.getExtensionLocation = function() {
    return nifti3.NIFTI1.MAGIC_COOKIE + 4;
  };
  nifti3.NIFTI1.prototype.getExtensionSize = function(data) {
    return nifti3.Utils.getIntAt(data, this.getExtensionLocation(), this.littleEndian);
  };
  nifti3.NIFTI1.prototype.getExtensionCode = function(data) {
    return nifti3.Utils.getIntAt(data, this.getExtensionLocation() + 4, this.littleEndian);
  };
  if (module.exports) {
    module.exports = nifti3.NIFTI1;
  }
})(nifti1);
var nifti2 = { exports: {} };
(function(module) {
  var nifti3 = nifti3 || {};
  nifti3.Utils = nifti3.Utils || (typeof commonjsRequire !== "undefined" ? utilities.exports : null);
  nifti3.NIFTI1 = nifti3.NIFTI1 || (typeof commonjsRequire !== "undefined" ? nifti1.exports : null);
  nifti3.NIFTI2 = nifti3.NIFTI2 || function() {
    this.littleEndian = false;
    this.dim_info = 0;
    this.dims = [];
    this.intent_p1 = 0;
    this.intent_p2 = 0;
    this.intent_p3 = 0;
    this.intent_code = 0;
    this.datatypeCode = 0;
    this.numBitsPerVoxel = 0;
    this.slice_start = 0;
    this.slice_end = 0;
    this.slice_code = 0;
    this.pixDims = [];
    this.vox_offset = 0;
    this.scl_slope = 1;
    this.scl_inter = 0;
    this.xyzt_units = 0;
    this.cal_max = 0;
    this.cal_min = 0;
    this.slice_duration = 0;
    this.toffset = 0;
    this.description = "";
    this.aux_file = "";
    this.intent_name = "";
    this.qform_code = 0;
    this.sform_code = 0;
    this.quatern_b = 0;
    this.quatern_c = 0;
    this.quatern_d = 0;
    this.qoffset_x = 0;
    this.qoffset_y = 0;
    this.qoffset_z = 0;
    this.affine = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
    this.magic = 0;
    this.extensionFlag = [0, 0, 0, 0];
  };
  nifti3.NIFTI2.MAGIC_COOKIE = 540;
  nifti3.NIFTI2.MAGIC_NUMBER_LOCATION = 4;
  nifti3.NIFTI2.MAGIC_NUMBER = [110, 43, 50, 0, 13, 10, 26, 10];
  nifti3.NIFTI2.prototype.readHeader = function(data) {
    var rawData = new DataView(data), magicCookieVal = nifti3.Utils.getIntAt(rawData, 0, this.littleEndian), ctr, ctrOut, ctrIn, index;
    if (magicCookieVal !== nifti3.NIFTI2.MAGIC_COOKIE) {
      this.littleEndian = true;
      magicCookieVal = nifti3.Utils.getIntAt(rawData, 0, this.littleEndian);
    }
    if (magicCookieVal !== nifti3.NIFTI2.MAGIC_COOKIE) {
      throw new Error("This does not appear to be a NIFTI file!");
    }
    this.datatypeCode = nifti3.Utils.getShortAt(rawData, 12, this.littleEndian);
    this.numBitsPerVoxel = nifti3.Utils.getShortAt(rawData, 14, this.littleEndian);
    for (ctr = 0; ctr < 8; ctr += 1) {
      index = 16 + ctr * 8;
      this.dims[ctr] = nifti3.Utils.getLongAt(rawData, index, this.littleEndian);
    }
    this.intent_p1 = nifti3.Utils.getDoubleAt(rawData, 80, this.littleEndian);
    this.intent_p2 = nifti3.Utils.getDoubleAt(rawData, 88, this.littleEndian);
    this.intent_p3 = nifti3.Utils.getDoubleAt(rawData, 96, this.littleEndian);
    for (ctr = 0; ctr < 8; ctr += 1) {
      index = 104 + ctr * 8;
      this.pixDims[ctr] = nifti3.Utils.getDoubleAt(rawData, index, this.littleEndian);
    }
    this.vox_offset = nifti3.Utils.getLongAt(rawData, 168, this.littleEndian);
    this.scl_slope = nifti3.Utils.getDoubleAt(rawData, 176, this.littleEndian);
    this.scl_inter = nifti3.Utils.getDoubleAt(rawData, 184, this.littleEndian);
    this.cal_max = nifti3.Utils.getDoubleAt(rawData, 192, this.littleEndian);
    this.cal_min = nifti3.Utils.getDoubleAt(rawData, 200, this.littleEndian);
    this.slice_duration = nifti3.Utils.getDoubleAt(rawData, 208, this.littleEndian);
    this.toffset = nifti3.Utils.getDoubleAt(rawData, 216, this.littleEndian);
    this.slice_start = nifti3.Utils.getLongAt(rawData, 224, this.littleEndian);
    this.slice_end = nifti3.Utils.getLongAt(rawData, 232, this.littleEndian);
    this.description = nifti3.Utils.getStringAt(rawData, 240, 240 + 80);
    this.aux_file = nifti3.Utils.getStringAt(rawData, 320, 320 + 24);
    this.qform_code = nifti3.Utils.getIntAt(rawData, 344, this.littleEndian);
    this.sform_code = nifti3.Utils.getIntAt(rawData, 348, this.littleEndian);
    this.quatern_b = nifti3.Utils.getDoubleAt(rawData, 352, this.littleEndian);
    this.quatern_c = nifti3.Utils.getDoubleAt(rawData, 360, this.littleEndian);
    this.quatern_d = nifti3.Utils.getDoubleAt(rawData, 368, this.littleEndian);
    this.qoffset_x = nifti3.Utils.getDoubleAt(rawData, 376, this.littleEndian);
    this.qoffset_y = nifti3.Utils.getDoubleAt(rawData, 384, this.littleEndian);
    this.qoffset_z = nifti3.Utils.getDoubleAt(rawData, 392, this.littleEndian);
    for (ctrOut = 0; ctrOut < 3; ctrOut += 1) {
      for (ctrIn = 0; ctrIn < 4; ctrIn += 1) {
        index = 400 + (ctrOut * 4 + ctrIn) * 8;
        this.affine[ctrOut][ctrIn] = nifti3.Utils.getDoubleAt(rawData, index, this.littleEndian);
      }
    }
    this.affine[3][0] = 0;
    this.affine[3][1] = 0;
    this.affine[3][2] = 0;
    this.affine[3][3] = 1;
    this.slice_code = nifti3.Utils.getIntAt(rawData, 496, this.littleEndian);
    this.xyzt_units = nifti3.Utils.getIntAt(rawData, 500, this.littleEndian);
    this.intent_code = nifti3.Utils.getIntAt(rawData, 504, this.littleEndian);
    this.intent_name = nifti3.Utils.getStringAt(rawData, 508, 508 + 16);
    this.dim_info = nifti3.Utils.getByteAt(rawData, 524);
    if (rawData.byteLength > nifti3.NIFTI2.MAGIC_COOKIE) {
      this.extensionFlag[0] = nifti3.Utils.getByteAt(rawData, 540);
      this.extensionFlag[1] = nifti3.Utils.getByteAt(rawData, 540 + 1);
      this.extensionFlag[2] = nifti3.Utils.getByteAt(rawData, 540 + 2);
      this.extensionFlag[3] = nifti3.Utils.getByteAt(rawData, 540 + 3);
      if (this.extensionFlag[0]) {
        this.extensionSize = this.getExtensionSize(rawData);
        this.extensionCode = this.getExtensionCode(rawData);
      }
    }
  };
  nifti3.NIFTI2.prototype.toFormattedString = function() {
    var fmt = nifti3.Utils.formatNumber, string = "";
    string += "Datatype = " + +this.datatypeCode + " (" + this.getDatatypeCodeString(this.datatypeCode) + ")\n";
    string += "Bits Per Voxel =  = " + this.numBitsPerVoxel + "\n";
    string += "Image Dimensions (1-8): " + this.dims[0] + ", " + this.dims[1] + ", " + this.dims[2] + ", " + this.dims[3] + ", " + this.dims[4] + ", " + this.dims[5] + ", " + this.dims[6] + ", " + this.dims[7] + "\n";
    string += "Intent Parameters (1-3): " + this.intent_p1 + ", " + this.intent_p2 + ", " + this.intent_p3 + "\n";
    string += "Voxel Dimensions (1-8): " + fmt(this.pixDims[0]) + ", " + fmt(this.pixDims[1]) + ", " + fmt(this.pixDims[2]) + ", " + fmt(this.pixDims[3]) + ", " + fmt(this.pixDims[4]) + ", " + fmt(this.pixDims[5]) + ", " + fmt(this.pixDims[6]) + ", " + fmt(this.pixDims[7]) + "\n";
    string += "Image Offset = " + this.vox_offset + "\n";
    string += "Data Scale:  Slope = " + fmt(this.scl_slope) + "  Intercept = " + fmt(this.scl_inter) + "\n";
    string += "Display Range:  Max = " + fmt(this.cal_max) + "  Min = " + fmt(this.cal_min) + "\n";
    string += "Slice Duration = " + this.slice_duration + "\n";
    string += "Time Axis Shift = " + this.toffset + "\n";
    string += "Slice Start = " + this.slice_start + "\n";
    string += "Slice End = " + this.slice_end + "\n";
    string += 'Description: "' + this.description + '"\n';
    string += 'Auxiliary File: "' + this.aux_file + '"\n';
    string += "Q-Form Code = " + this.qform_code + " (" + this.getTransformCodeString(this.qform_code) + ")\n";
    string += "S-Form Code = " + this.sform_code + " (" + this.getTransformCodeString(this.sform_code) + ")\n";
    string += "Quaternion Parameters:  b = " + fmt(this.quatern_b) + "  c = " + fmt(this.quatern_c) + "  d = " + fmt(this.quatern_d) + "\n";
    string += "Quaternion Offsets:  x = " + this.qoffset_x + "  y = " + this.qoffset_y + "  z = " + this.qoffset_z + "\n";
    string += "S-Form Parameters X: " + fmt(this.affine[0][0]) + ", " + fmt(this.affine[0][1]) + ", " + fmt(this.affine[0][2]) + ", " + fmt(this.affine[0][3]) + "\n";
    string += "S-Form Parameters Y: " + fmt(this.affine[1][0]) + ", " + fmt(this.affine[1][1]) + ", " + fmt(this.affine[1][2]) + ", " + fmt(this.affine[1][3]) + "\n";
    string += "S-Form Parameters Z: " + fmt(this.affine[2][0]) + ", " + fmt(this.affine[2][1]) + ", " + fmt(this.affine[2][2]) + ", " + fmt(this.affine[2][3]) + "\n";
    string += "Slice Code = " + this.slice_code + "\n";
    string += "Units Code = " + this.xyzt_units + " (" + this.getUnitsCodeString(nifti3.NIFTI1.SPATIAL_UNITS_MASK & this.xyzt_units) + ", " + this.getUnitsCodeString(nifti3.NIFTI1.TEMPORAL_UNITS_MASK & this.xyzt_units) + ")\n";
    string += "Intent Code = " + this.intent_code + "\n";
    string += 'Intent Name: "' + this.intent_name + '"\n';
    string += "Dim Info = " + this.dim_info + "\n";
    return string;
  };
  nifti3.NIFTI2.prototype.getExtensionLocation = function() {
    return nifti3.NIFTI2.MAGIC_COOKIE + 4;
  };
  nifti3.NIFTI2.prototype.getExtensionSize = nifti3.NIFTI1.prototype.getExtensionSize;
  nifti3.NIFTI2.prototype.getExtensionCode = nifti3.NIFTI1.prototype.getExtensionCode;
  nifti3.NIFTI2.prototype.getDatatypeCodeString = nifti3.NIFTI1.prototype.getDatatypeCodeString;
  nifti3.NIFTI2.prototype.getTransformCodeString = nifti3.NIFTI1.prototype.getTransformCodeString;
  nifti3.NIFTI2.prototype.getUnitsCodeString = nifti3.NIFTI1.prototype.getUnitsCodeString;
  nifti3.NIFTI2.prototype.getQformMat = nifti3.NIFTI1.prototype.getQformMat;
  nifti3.NIFTI2.prototype.convertNiftiQFormToNiftiSForm = nifti3.NIFTI1.prototype.convertNiftiQFormToNiftiSForm;
  nifti3.NIFTI2.prototype.convertNiftiSFormToNEMA = nifti3.NIFTI1.prototype.convertNiftiSFormToNEMA;
  nifti3.NIFTI2.prototype.nifti_mat33_mul = nifti3.NIFTI1.prototype.nifti_mat33_mul;
  nifti3.NIFTI2.prototype.nifti_mat33_determ = nifti3.NIFTI1.prototype.nifti_mat33_determ;
  if (module.exports) {
    module.exports = nifti3.NIFTI2;
  }
})(nifti2);
var pako = {};
var deflate$4 = {};
var deflate$3 = {};
var trees = {};
const Z_FIXED$1 = 4;
const Z_BINARY = 0;
const Z_TEXT = 1;
const Z_UNKNOWN$1 = 2;
function zero$1(buf) {
  let len = buf.length;
  while (--len >= 0) {
    buf[len] = 0;
  }
}
const STORED_BLOCK = 0;
const STATIC_TREES = 1;
const DYN_TREES = 2;
const MIN_MATCH$1 = 3;
const MAX_MATCH$1 = 258;
const LENGTH_CODES$1 = 29;
const LITERALS$1 = 256;
const L_CODES$1 = LITERALS$1 + 1 + LENGTH_CODES$1;
const D_CODES$1 = 30;
const BL_CODES$1 = 19;
const HEAP_SIZE$1 = 2 * L_CODES$1 + 1;
const MAX_BITS$1 = 15;
const Buf_size = 16;
const MAX_BL_BITS = 7;
const END_BLOCK = 256;
const REP_3_6 = 16;
const REPZ_3_10 = 17;
const REPZ_11_138 = 18;
const extra_lbits = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0]);
const extra_dbits = new Uint8Array([0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13]);
const extra_blbits = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 7]);
const bl_order = new Uint8Array([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
const DIST_CODE_LEN = 512;
const static_ltree = new Array((L_CODES$1 + 2) * 2);
zero$1(static_ltree);
const static_dtree = new Array(D_CODES$1 * 2);
zero$1(static_dtree);
const _dist_code = new Array(DIST_CODE_LEN);
zero$1(_dist_code);
const _length_code = new Array(MAX_MATCH$1 - MIN_MATCH$1 + 1);
zero$1(_length_code);
const base_length = new Array(LENGTH_CODES$1);
zero$1(base_length);
const base_dist = new Array(D_CODES$1);
zero$1(base_dist);
function StaticTreeDesc(static_tree, extra_bits, extra_base, elems, max_length) {
  this.static_tree = static_tree;
  this.extra_bits = extra_bits;
  this.extra_base = extra_base;
  this.elems = elems;
  this.max_length = max_length;
  this.has_stree = static_tree && static_tree.length;
}
let static_l_desc;
let static_d_desc;
let static_bl_desc;
function TreeDesc(dyn_tree, stat_desc) {
  this.dyn_tree = dyn_tree;
  this.max_code = 0;
  this.stat_desc = stat_desc;
}
const d_code = (dist) => {
  return dist < 256 ? _dist_code[dist] : _dist_code[256 + (dist >>> 7)];
};
const put_short = (s, w) => {
  s.pending_buf[s.pending++] = w & 255;
  s.pending_buf[s.pending++] = w >>> 8 & 255;
};
const send_bits = (s, value, length) => {
  if (s.bi_valid > Buf_size - length) {
    s.bi_buf |= value << s.bi_valid & 65535;
    put_short(s, s.bi_buf);
    s.bi_buf = value >> Buf_size - s.bi_valid;
    s.bi_valid += length - Buf_size;
  } else {
    s.bi_buf |= value << s.bi_valid & 65535;
    s.bi_valid += length;
  }
};
const send_code = (s, c, tree) => {
  send_bits(s, tree[c * 2], tree[c * 2 + 1]);
};
const bi_reverse = (code, len) => {
  let res = 0;
  do {
    res |= code & 1;
    code >>>= 1;
    res <<= 1;
  } while (--len > 0);
  return res >>> 1;
};
const bi_flush = (s) => {
  if (s.bi_valid === 16) {
    put_short(s, s.bi_buf);
    s.bi_buf = 0;
    s.bi_valid = 0;
  } else if (s.bi_valid >= 8) {
    s.pending_buf[s.pending++] = s.bi_buf & 255;
    s.bi_buf >>= 8;
    s.bi_valid -= 8;
  }
};
const gen_bitlen = (s, desc) => {
  const tree = desc.dyn_tree;
  const max_code = desc.max_code;
  const stree = desc.stat_desc.static_tree;
  const has_stree = desc.stat_desc.has_stree;
  const extra = desc.stat_desc.extra_bits;
  const base = desc.stat_desc.extra_base;
  const max_length = desc.stat_desc.max_length;
  let h;
  let n, m;
  let bits;
  let xbits;
  let f;
  let overflow = 0;
  for (bits = 0; bits <= MAX_BITS$1; bits++) {
    s.bl_count[bits] = 0;
  }
  tree[s.heap[s.heap_max] * 2 + 1] = 0;
  for (h = s.heap_max + 1; h < HEAP_SIZE$1; h++) {
    n = s.heap[h];
    bits = tree[tree[n * 2 + 1] * 2 + 1] + 1;
    if (bits > max_length) {
      bits = max_length;
      overflow++;
    }
    tree[n * 2 + 1] = bits;
    if (n > max_code) {
      continue;
    }
    s.bl_count[bits]++;
    xbits = 0;
    if (n >= base) {
      xbits = extra[n - base];
    }
    f = tree[n * 2];
    s.opt_len += f * (bits + xbits);
    if (has_stree) {
      s.static_len += f * (stree[n * 2 + 1] + xbits);
    }
  }
  if (overflow === 0) {
    return;
  }
  do {
    bits = max_length - 1;
    while (s.bl_count[bits] === 0) {
      bits--;
    }
    s.bl_count[bits]--;
    s.bl_count[bits + 1] += 2;
    s.bl_count[max_length]--;
    overflow -= 2;
  } while (overflow > 0);
  for (bits = max_length; bits !== 0; bits--) {
    n = s.bl_count[bits];
    while (n !== 0) {
      m = s.heap[--h];
      if (m > max_code) {
        continue;
      }
      if (tree[m * 2 + 1] !== bits) {
        s.opt_len += (bits - tree[m * 2 + 1]) * tree[m * 2];
        tree[m * 2 + 1] = bits;
      }
      n--;
    }
  }
};
const gen_codes = (tree, max_code, bl_count) => {
  const next_code = new Array(MAX_BITS$1 + 1);
  let code = 0;
  let bits;
  let n;
  for (bits = 1; bits <= MAX_BITS$1; bits++) {
    next_code[bits] = code = code + bl_count[bits - 1] << 1;
  }
  for (n = 0; n <= max_code; n++) {
    let len = tree[n * 2 + 1];
    if (len === 0) {
      continue;
    }
    tree[n * 2] = bi_reverse(next_code[len]++, len);
  }
};
const tr_static_init = () => {
  let n;
  let bits;
  let length;
  let code;
  let dist;
  const bl_count = new Array(MAX_BITS$1 + 1);
  length = 0;
  for (code = 0; code < LENGTH_CODES$1 - 1; code++) {
    base_length[code] = length;
    for (n = 0; n < 1 << extra_lbits[code]; n++) {
      _length_code[length++] = code;
    }
  }
  _length_code[length - 1] = code;
  dist = 0;
  for (code = 0; code < 16; code++) {
    base_dist[code] = dist;
    for (n = 0; n < 1 << extra_dbits[code]; n++) {
      _dist_code[dist++] = code;
    }
  }
  dist >>= 7;
  for (; code < D_CODES$1; code++) {
    base_dist[code] = dist << 7;
    for (n = 0; n < 1 << extra_dbits[code] - 7; n++) {
      _dist_code[256 + dist++] = code;
    }
  }
  for (bits = 0; bits <= MAX_BITS$1; bits++) {
    bl_count[bits] = 0;
  }
  n = 0;
  while (n <= 143) {
    static_ltree[n * 2 + 1] = 8;
    n++;
    bl_count[8]++;
  }
  while (n <= 255) {
    static_ltree[n * 2 + 1] = 9;
    n++;
    bl_count[9]++;
  }
  while (n <= 279) {
    static_ltree[n * 2 + 1] = 7;
    n++;
    bl_count[7]++;
  }
  while (n <= 287) {
    static_ltree[n * 2 + 1] = 8;
    n++;
    bl_count[8]++;
  }
  gen_codes(static_ltree, L_CODES$1 + 1, bl_count);
  for (n = 0; n < D_CODES$1; n++) {
    static_dtree[n * 2 + 1] = 5;
    static_dtree[n * 2] = bi_reverse(n, 5);
  }
  static_l_desc = new StaticTreeDesc(static_ltree, extra_lbits, LITERALS$1 + 1, L_CODES$1, MAX_BITS$1);
  static_d_desc = new StaticTreeDesc(static_dtree, extra_dbits, 0, D_CODES$1, MAX_BITS$1);
  static_bl_desc = new StaticTreeDesc(new Array(0), extra_blbits, 0, BL_CODES$1, MAX_BL_BITS);
};
const init_block = (s) => {
  let n;
  for (n = 0; n < L_CODES$1; n++) {
    s.dyn_ltree[n * 2] = 0;
  }
  for (n = 0; n < D_CODES$1; n++) {
    s.dyn_dtree[n * 2] = 0;
  }
  for (n = 0; n < BL_CODES$1; n++) {
    s.bl_tree[n * 2] = 0;
  }
  s.dyn_ltree[END_BLOCK * 2] = 1;
  s.opt_len = s.static_len = 0;
  s.last_lit = s.matches = 0;
};
const bi_windup = (s) => {
  if (s.bi_valid > 8) {
    put_short(s, s.bi_buf);
  } else if (s.bi_valid > 0) {
    s.pending_buf[s.pending++] = s.bi_buf;
  }
  s.bi_buf = 0;
  s.bi_valid = 0;
};
const copy_block = (s, buf, len, header) => {
  bi_windup(s);
  if (header) {
    put_short(s, len);
    put_short(s, ~len);
  }
  s.pending_buf.set(s.window.subarray(buf, buf + len), s.pending);
  s.pending += len;
};
const smaller = (tree, n, m, depth) => {
  const _n2 = n * 2;
  const _m2 = m * 2;
  return tree[_n2] < tree[_m2] || tree[_n2] === tree[_m2] && depth[n] <= depth[m];
};
const pqdownheap = (s, tree, k) => {
  const v = s.heap[k];
  let j = k << 1;
  while (j <= s.heap_len) {
    if (j < s.heap_len && smaller(tree, s.heap[j + 1], s.heap[j], s.depth)) {
      j++;
    }
    if (smaller(tree, v, s.heap[j], s.depth)) {
      break;
    }
    s.heap[k] = s.heap[j];
    k = j;
    j <<= 1;
  }
  s.heap[k] = v;
};
const compress_block = (s, ltree, dtree) => {
  let dist;
  let lc;
  let lx = 0;
  let code;
  let extra;
  if (s.last_lit !== 0) {
    do {
      dist = s.pending_buf[s.d_buf + lx * 2] << 8 | s.pending_buf[s.d_buf + lx * 2 + 1];
      lc = s.pending_buf[s.l_buf + lx];
      lx++;
      if (dist === 0) {
        send_code(s, lc, ltree);
      } else {
        code = _length_code[lc];
        send_code(s, code + LITERALS$1 + 1, ltree);
        extra = extra_lbits[code];
        if (extra !== 0) {
          lc -= base_length[code];
          send_bits(s, lc, extra);
        }
        dist--;
        code = d_code(dist);
        send_code(s, code, dtree);
        extra = extra_dbits[code];
        if (extra !== 0) {
          dist -= base_dist[code];
          send_bits(s, dist, extra);
        }
      }
    } while (lx < s.last_lit);
  }
  send_code(s, END_BLOCK, ltree);
};
const build_tree = (s, desc) => {
  const tree = desc.dyn_tree;
  const stree = desc.stat_desc.static_tree;
  const has_stree = desc.stat_desc.has_stree;
  const elems = desc.stat_desc.elems;
  let n, m;
  let max_code = -1;
  let node;
  s.heap_len = 0;
  s.heap_max = HEAP_SIZE$1;
  for (n = 0; n < elems; n++) {
    if (tree[n * 2] !== 0) {
      s.heap[++s.heap_len] = max_code = n;
      s.depth[n] = 0;
    } else {
      tree[n * 2 + 1] = 0;
    }
  }
  while (s.heap_len < 2) {
    node = s.heap[++s.heap_len] = max_code < 2 ? ++max_code : 0;
    tree[node * 2] = 1;
    s.depth[node] = 0;
    s.opt_len--;
    if (has_stree) {
      s.static_len -= stree[node * 2 + 1];
    }
  }
  desc.max_code = max_code;
  for (n = s.heap_len >> 1; n >= 1; n--) {
    pqdownheap(s, tree, n);
  }
  node = elems;
  do {
    n = s.heap[1];
    s.heap[1] = s.heap[s.heap_len--];
    pqdownheap(s, tree, 1);
    m = s.heap[1];
    s.heap[--s.heap_max] = n;
    s.heap[--s.heap_max] = m;
    tree[node * 2] = tree[n * 2] + tree[m * 2];
    s.depth[node] = (s.depth[n] >= s.depth[m] ? s.depth[n] : s.depth[m]) + 1;
    tree[n * 2 + 1] = tree[m * 2 + 1] = node;
    s.heap[1] = node++;
    pqdownheap(s, tree, 1);
  } while (s.heap_len >= 2);
  s.heap[--s.heap_max] = s.heap[1];
  gen_bitlen(s, desc);
  gen_codes(tree, max_code, s.bl_count);
};
const scan_tree = (s, tree, max_code) => {
  let n;
  let prevlen = -1;
  let curlen;
  let nextlen = tree[0 * 2 + 1];
  let count = 0;
  let max_count = 7;
  let min_count = 4;
  if (nextlen === 0) {
    max_count = 138;
    min_count = 3;
  }
  tree[(max_code + 1) * 2 + 1] = 65535;
  for (n = 0; n <= max_code; n++) {
    curlen = nextlen;
    nextlen = tree[(n + 1) * 2 + 1];
    if (++count < max_count && curlen === nextlen) {
      continue;
    } else if (count < min_count) {
      s.bl_tree[curlen * 2] += count;
    } else if (curlen !== 0) {
      if (curlen !== prevlen) {
        s.bl_tree[curlen * 2]++;
      }
      s.bl_tree[REP_3_6 * 2]++;
    } else if (count <= 10) {
      s.bl_tree[REPZ_3_10 * 2]++;
    } else {
      s.bl_tree[REPZ_11_138 * 2]++;
    }
    count = 0;
    prevlen = curlen;
    if (nextlen === 0) {
      max_count = 138;
      min_count = 3;
    } else if (curlen === nextlen) {
      max_count = 6;
      min_count = 3;
    } else {
      max_count = 7;
      min_count = 4;
    }
  }
};
const send_tree = (s, tree, max_code) => {
  let n;
  let prevlen = -1;
  let curlen;
  let nextlen = tree[0 * 2 + 1];
  let count = 0;
  let max_count = 7;
  let min_count = 4;
  if (nextlen === 0) {
    max_count = 138;
    min_count = 3;
  }
  for (n = 0; n <= max_code; n++) {
    curlen = nextlen;
    nextlen = tree[(n + 1) * 2 + 1];
    if (++count < max_count && curlen === nextlen) {
      continue;
    } else if (count < min_count) {
      do {
        send_code(s, curlen, s.bl_tree);
      } while (--count !== 0);
    } else if (curlen !== 0) {
      if (curlen !== prevlen) {
        send_code(s, curlen, s.bl_tree);
        count--;
      }
      send_code(s, REP_3_6, s.bl_tree);
      send_bits(s, count - 3, 2);
    } else if (count <= 10) {
      send_code(s, REPZ_3_10, s.bl_tree);
      send_bits(s, count - 3, 3);
    } else {
      send_code(s, REPZ_11_138, s.bl_tree);
      send_bits(s, count - 11, 7);
    }
    count = 0;
    prevlen = curlen;
    if (nextlen === 0) {
      max_count = 138;
      min_count = 3;
    } else if (curlen === nextlen) {
      max_count = 6;
      min_count = 3;
    } else {
      max_count = 7;
      min_count = 4;
    }
  }
};
const build_bl_tree = (s) => {
  let max_blindex;
  scan_tree(s, s.dyn_ltree, s.l_desc.max_code);
  scan_tree(s, s.dyn_dtree, s.d_desc.max_code);
  build_tree(s, s.bl_desc);
  for (max_blindex = BL_CODES$1 - 1; max_blindex >= 3; max_blindex--) {
    if (s.bl_tree[bl_order[max_blindex] * 2 + 1] !== 0) {
      break;
    }
  }
  s.opt_len += 3 * (max_blindex + 1) + 5 + 5 + 4;
  return max_blindex;
};
const send_all_trees = (s, lcodes, dcodes, blcodes) => {
  let rank2;
  send_bits(s, lcodes - 257, 5);
  send_bits(s, dcodes - 1, 5);
  send_bits(s, blcodes - 4, 4);
  for (rank2 = 0; rank2 < blcodes; rank2++) {
    send_bits(s, s.bl_tree[bl_order[rank2] * 2 + 1], 3);
  }
  send_tree(s, s.dyn_ltree, lcodes - 1);
  send_tree(s, s.dyn_dtree, dcodes - 1);
};
const detect_data_type = (s) => {
  let black_mask = 4093624447;
  let n;
  for (n = 0; n <= 31; n++, black_mask >>>= 1) {
    if (black_mask & 1 && s.dyn_ltree[n * 2] !== 0) {
      return Z_BINARY;
    }
  }
  if (s.dyn_ltree[9 * 2] !== 0 || s.dyn_ltree[10 * 2] !== 0 || s.dyn_ltree[13 * 2] !== 0) {
    return Z_TEXT;
  }
  for (n = 32; n < LITERALS$1; n++) {
    if (s.dyn_ltree[n * 2] !== 0) {
      return Z_TEXT;
    }
  }
  return Z_BINARY;
};
let static_init_done = false;
const _tr_init$1 = (s) => {
  if (!static_init_done) {
    tr_static_init();
    static_init_done = true;
  }
  s.l_desc = new TreeDesc(s.dyn_ltree, static_l_desc);
  s.d_desc = new TreeDesc(s.dyn_dtree, static_d_desc);
  s.bl_desc = new TreeDesc(s.bl_tree, static_bl_desc);
  s.bi_buf = 0;
  s.bi_valid = 0;
  init_block(s);
};
const _tr_stored_block$1 = (s, buf, stored_len, last) => {
  send_bits(s, (STORED_BLOCK << 1) + (last ? 1 : 0), 3);
  copy_block(s, buf, stored_len, true);
};
const _tr_align$1 = (s) => {
  send_bits(s, STATIC_TREES << 1, 3);
  send_code(s, END_BLOCK, static_ltree);
  bi_flush(s);
};
const _tr_flush_block$1 = (s, buf, stored_len, last) => {
  let opt_lenb, static_lenb;
  let max_blindex = 0;
  if (s.level > 0) {
    if (s.strm.data_type === Z_UNKNOWN$1) {
      s.strm.data_type = detect_data_type(s);
    }
    build_tree(s, s.l_desc);
    build_tree(s, s.d_desc);
    max_blindex = build_bl_tree(s);
    opt_lenb = s.opt_len + 3 + 7 >>> 3;
    static_lenb = s.static_len + 3 + 7 >>> 3;
    if (static_lenb <= opt_lenb) {
      opt_lenb = static_lenb;
    }
  } else {
    opt_lenb = static_lenb = stored_len + 5;
  }
  if (stored_len + 4 <= opt_lenb && buf !== -1) {
    _tr_stored_block$1(s, buf, stored_len, last);
  } else if (s.strategy === Z_FIXED$1 || static_lenb === opt_lenb) {
    send_bits(s, (STATIC_TREES << 1) + (last ? 1 : 0), 3);
    compress_block(s, static_ltree, static_dtree);
  } else {
    send_bits(s, (DYN_TREES << 1) + (last ? 1 : 0), 3);
    send_all_trees(s, s.l_desc.max_code + 1, s.d_desc.max_code + 1, max_blindex + 1);
    compress_block(s, s.dyn_ltree, s.dyn_dtree);
  }
  init_block(s);
  if (last) {
    bi_windup(s);
  }
};
const _tr_tally$1 = (s, dist, lc) => {
  s.pending_buf[s.d_buf + s.last_lit * 2] = dist >>> 8 & 255;
  s.pending_buf[s.d_buf + s.last_lit * 2 + 1] = dist & 255;
  s.pending_buf[s.l_buf + s.last_lit] = lc & 255;
  s.last_lit++;
  if (dist === 0) {
    s.dyn_ltree[lc * 2]++;
  } else {
    s.matches++;
    dist--;
    s.dyn_ltree[(_length_code[lc] + LITERALS$1 + 1) * 2]++;
    s.dyn_dtree[d_code(dist) * 2]++;
  }
  return s.last_lit === s.lit_bufsize - 1;
};
trees._tr_init = _tr_init$1;
trees._tr_stored_block = _tr_stored_block$1;
trees._tr_flush_block = _tr_flush_block$1;
trees._tr_tally = _tr_tally$1;
trees._tr_align = _tr_align$1;
const adler32$2 = (adler, buf, len, pos) => {
  let s1 = adler & 65535 | 0, s2 = adler >>> 16 & 65535 | 0, n = 0;
  while (len !== 0) {
    n = len > 2e3 ? 2e3 : len;
    len -= n;
    do {
      s1 = s1 + buf[pos++] | 0;
      s2 = s2 + s1 | 0;
    } while (--n);
    s1 %= 65521;
    s2 %= 65521;
  }
  return s1 | s2 << 16 | 0;
};
var adler32_1 = adler32$2;
const makeTable = () => {
  let c, table = [];
  for (var n = 0; n < 256; n++) {
    c = n;
    for (var k = 0; k < 8; k++) {
      c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
    }
    table[n] = c;
  }
  return table;
};
const crcTable = new Uint32Array(makeTable());
const crc32$2 = (crc, buf, len, pos) => {
  const t = crcTable;
  const end = pos + len;
  crc ^= -1;
  for (let i = pos; i < end; i++) {
    crc = crc >>> 8 ^ t[(crc ^ buf[i]) & 255];
  }
  return crc ^ -1;
};
var crc32_1 = crc32$2;
var messages = {
  2: "need dictionary",
  1: "stream end",
  0: "",
  "-1": "file error",
  "-2": "stream error",
  "-3": "data error",
  "-4": "insufficient memory",
  "-5": "buffer error",
  "-6": "incompatible version"
};
var constants$1 = {
  Z_NO_FLUSH: 0,
  Z_PARTIAL_FLUSH: 1,
  Z_SYNC_FLUSH: 2,
  Z_FULL_FLUSH: 3,
  Z_FINISH: 4,
  Z_BLOCK: 5,
  Z_TREES: 6,
  Z_OK: 0,
  Z_STREAM_END: 1,
  Z_NEED_DICT: 2,
  Z_ERRNO: -1,
  Z_STREAM_ERROR: -2,
  Z_DATA_ERROR: -3,
  Z_MEM_ERROR: -4,
  Z_BUF_ERROR: -5,
  Z_NO_COMPRESSION: 0,
  Z_BEST_SPEED: 1,
  Z_BEST_COMPRESSION: 9,
  Z_DEFAULT_COMPRESSION: -1,
  Z_FILTERED: 1,
  Z_HUFFMAN_ONLY: 2,
  Z_RLE: 3,
  Z_FIXED: 4,
  Z_DEFAULT_STRATEGY: 0,
  Z_BINARY: 0,
  Z_TEXT: 1,
  Z_UNKNOWN: 2,
  Z_DEFLATED: 8
};
const { _tr_init, _tr_stored_block, _tr_flush_block, _tr_tally, _tr_align } = trees;
const adler32$1 = adler32_1;
const crc32$1 = crc32_1;
const msg$2 = messages;
const {
  Z_NO_FLUSH: Z_NO_FLUSH$2,
  Z_PARTIAL_FLUSH,
  Z_FULL_FLUSH: Z_FULL_FLUSH$1,
  Z_FINISH: Z_FINISH$3,
  Z_BLOCK: Z_BLOCK$1,
  Z_OK: Z_OK$3,
  Z_STREAM_END: Z_STREAM_END$3,
  Z_STREAM_ERROR: Z_STREAM_ERROR$2,
  Z_DATA_ERROR: Z_DATA_ERROR$2,
  Z_BUF_ERROR: Z_BUF_ERROR$1,
  Z_DEFAULT_COMPRESSION: Z_DEFAULT_COMPRESSION$1,
  Z_FILTERED,
  Z_HUFFMAN_ONLY,
  Z_RLE,
  Z_FIXED,
  Z_DEFAULT_STRATEGY: Z_DEFAULT_STRATEGY$1,
  Z_UNKNOWN,
  Z_DEFLATED: Z_DEFLATED$2
} = constants$1;
const MAX_MEM_LEVEL = 9;
const MAX_WBITS$1 = 15;
const DEF_MEM_LEVEL = 8;
const LENGTH_CODES = 29;
const LITERALS = 256;
const L_CODES = LITERALS + 1 + LENGTH_CODES;
const D_CODES = 30;
const BL_CODES = 19;
const HEAP_SIZE = 2 * L_CODES + 1;
const MAX_BITS = 15;
const MIN_MATCH = 3;
const MAX_MATCH = 258;
const MIN_LOOKAHEAD = MAX_MATCH + MIN_MATCH + 1;
const PRESET_DICT = 32;
const INIT_STATE = 42;
const EXTRA_STATE = 69;
const NAME_STATE = 73;
const COMMENT_STATE = 91;
const HCRC_STATE = 103;
const BUSY_STATE = 113;
const FINISH_STATE = 666;
const BS_NEED_MORE = 1;
const BS_BLOCK_DONE = 2;
const BS_FINISH_STARTED = 3;
const BS_FINISH_DONE = 4;
const OS_CODE = 3;
const err = (strm, errorCode) => {
  strm.msg = msg$2[errorCode];
  return errorCode;
};
const rank = (f) => {
  return (f << 1) - (f > 4 ? 9 : 0);
};
const zero = (buf) => {
  let len = buf.length;
  while (--len >= 0) {
    buf[len] = 0;
  }
};
let HASH_ZLIB = (s, prev, data) => (prev << s.hash_shift ^ data) & s.hash_mask;
let HASH = HASH_ZLIB;
const flush_pending = (strm) => {
  const s = strm.state;
  let len = s.pending;
  if (len > strm.avail_out) {
    len = strm.avail_out;
  }
  if (len === 0) {
    return;
  }
  strm.output.set(s.pending_buf.subarray(s.pending_out, s.pending_out + len), strm.next_out);
  strm.next_out += len;
  s.pending_out += len;
  strm.total_out += len;
  strm.avail_out -= len;
  s.pending -= len;
  if (s.pending === 0) {
    s.pending_out = 0;
  }
};
const flush_block_only = (s, last) => {
  _tr_flush_block(s, s.block_start >= 0 ? s.block_start : -1, s.strstart - s.block_start, last);
  s.block_start = s.strstart;
  flush_pending(s.strm);
};
const put_byte = (s, b) => {
  s.pending_buf[s.pending++] = b;
};
const putShortMSB = (s, b) => {
  s.pending_buf[s.pending++] = b >>> 8 & 255;
  s.pending_buf[s.pending++] = b & 255;
};
const read_buf = (strm, buf, start, size) => {
  let len = strm.avail_in;
  if (len > size) {
    len = size;
  }
  if (len === 0) {
    return 0;
  }
  strm.avail_in -= len;
  buf.set(strm.input.subarray(strm.next_in, strm.next_in + len), start);
  if (strm.state.wrap === 1) {
    strm.adler = adler32$1(strm.adler, buf, len, start);
  } else if (strm.state.wrap === 2) {
    strm.adler = crc32$1(strm.adler, buf, len, start);
  }
  strm.next_in += len;
  strm.total_in += len;
  return len;
};
const longest_match = (s, cur_match) => {
  let chain_length = s.max_chain_length;
  let scan = s.strstart;
  let match;
  let len;
  let best_len = s.prev_length;
  let nice_match = s.nice_match;
  const limit = s.strstart > s.w_size - MIN_LOOKAHEAD ? s.strstart - (s.w_size - MIN_LOOKAHEAD) : 0;
  const _win = s.window;
  const wmask = s.w_mask;
  const prev = s.prev;
  const strend = s.strstart + MAX_MATCH;
  let scan_end1 = _win[scan + best_len - 1];
  let scan_end = _win[scan + best_len];
  if (s.prev_length >= s.good_match) {
    chain_length >>= 2;
  }
  if (nice_match > s.lookahead) {
    nice_match = s.lookahead;
  }
  do {
    match = cur_match;
    if (_win[match + best_len] !== scan_end || _win[match + best_len - 1] !== scan_end1 || _win[match] !== _win[scan] || _win[++match] !== _win[scan + 1]) {
      continue;
    }
    scan += 2;
    match++;
    do {
    } while (_win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && scan < strend);
    len = MAX_MATCH - (strend - scan);
    scan = strend - MAX_MATCH;
    if (len > best_len) {
      s.match_start = cur_match;
      best_len = len;
      if (len >= nice_match) {
        break;
      }
      scan_end1 = _win[scan + best_len - 1];
      scan_end = _win[scan + best_len];
    }
  } while ((cur_match = prev[cur_match & wmask]) > limit && --chain_length !== 0);
  if (best_len <= s.lookahead) {
    return best_len;
  }
  return s.lookahead;
};
const fill_window = (s) => {
  const _w_size = s.w_size;
  let p, n, m, more, str;
  do {
    more = s.window_size - s.lookahead - s.strstart;
    if (s.strstart >= _w_size + (_w_size - MIN_LOOKAHEAD)) {
      s.window.set(s.window.subarray(_w_size, _w_size + _w_size), 0);
      s.match_start -= _w_size;
      s.strstart -= _w_size;
      s.block_start -= _w_size;
      n = s.hash_size;
      p = n;
      do {
        m = s.head[--p];
        s.head[p] = m >= _w_size ? m - _w_size : 0;
      } while (--n);
      n = _w_size;
      p = n;
      do {
        m = s.prev[--p];
        s.prev[p] = m >= _w_size ? m - _w_size : 0;
      } while (--n);
      more += _w_size;
    }
    if (s.strm.avail_in === 0) {
      break;
    }
    n = read_buf(s.strm, s.window, s.strstart + s.lookahead, more);
    s.lookahead += n;
    if (s.lookahead + s.insert >= MIN_MATCH) {
      str = s.strstart - s.insert;
      s.ins_h = s.window[str];
      s.ins_h = HASH(s, s.ins_h, s.window[str + 1]);
      while (s.insert) {
        s.ins_h = HASH(s, s.ins_h, s.window[str + MIN_MATCH - 1]);
        s.prev[str & s.w_mask] = s.head[s.ins_h];
        s.head[s.ins_h] = str;
        str++;
        s.insert--;
        if (s.lookahead + s.insert < MIN_MATCH) {
          break;
        }
      }
    }
  } while (s.lookahead < MIN_LOOKAHEAD && s.strm.avail_in !== 0);
};
const deflate_stored = (s, flush) => {
  let max_block_size = 65535;
  if (max_block_size > s.pending_buf_size - 5) {
    max_block_size = s.pending_buf_size - 5;
  }
  for (; ; ) {
    if (s.lookahead <= 1) {
      fill_window(s);
      if (s.lookahead === 0 && flush === Z_NO_FLUSH$2) {
        return BS_NEED_MORE;
      }
      if (s.lookahead === 0) {
        break;
      }
    }
    s.strstart += s.lookahead;
    s.lookahead = 0;
    const max_start = s.block_start + max_block_size;
    if (s.strstart === 0 || s.strstart >= max_start) {
      s.lookahead = s.strstart - max_start;
      s.strstart = max_start;
      flush_block_only(s, false);
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
    }
    if (s.strstart - s.block_start >= s.w_size - MIN_LOOKAHEAD) {
      flush_block_only(s, false);
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
    }
  }
  s.insert = 0;
  if (flush === Z_FINISH$3) {
    flush_block_only(s, true);
    if (s.strm.avail_out === 0) {
      return BS_FINISH_STARTED;
    }
    return BS_FINISH_DONE;
  }
  if (s.strstart > s.block_start) {
    flush_block_only(s, false);
    if (s.strm.avail_out === 0) {
      return BS_NEED_MORE;
    }
  }
  return BS_NEED_MORE;
};
const deflate_fast = (s, flush) => {
  let hash_head;
  let bflush;
  for (; ; ) {
    if (s.lookahead < MIN_LOOKAHEAD) {
      fill_window(s);
      if (s.lookahead < MIN_LOOKAHEAD && flush === Z_NO_FLUSH$2) {
        return BS_NEED_MORE;
      }
      if (s.lookahead === 0) {
        break;
      }
    }
    hash_head = 0;
    if (s.lookahead >= MIN_MATCH) {
      s.ins_h = HASH(s, s.ins_h, s.window[s.strstart + MIN_MATCH - 1]);
      hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
      s.head[s.ins_h] = s.strstart;
    }
    if (hash_head !== 0 && s.strstart - hash_head <= s.w_size - MIN_LOOKAHEAD) {
      s.match_length = longest_match(s, hash_head);
    }
    if (s.match_length >= MIN_MATCH) {
      bflush = _tr_tally(s, s.strstart - s.match_start, s.match_length - MIN_MATCH);
      s.lookahead -= s.match_length;
      if (s.match_length <= s.max_lazy_match && s.lookahead >= MIN_MATCH) {
        s.match_length--;
        do {
          s.strstart++;
          s.ins_h = HASH(s, s.ins_h, s.window[s.strstart + MIN_MATCH - 1]);
          hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
          s.head[s.ins_h] = s.strstart;
        } while (--s.match_length !== 0);
        s.strstart++;
      } else {
        s.strstart += s.match_length;
        s.match_length = 0;
        s.ins_h = s.window[s.strstart];
        s.ins_h = HASH(s, s.ins_h, s.window[s.strstart + 1]);
      }
    } else {
      bflush = _tr_tally(s, 0, s.window[s.strstart]);
      s.lookahead--;
      s.strstart++;
    }
    if (bflush) {
      flush_block_only(s, false);
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
    }
  }
  s.insert = s.strstart < MIN_MATCH - 1 ? s.strstart : MIN_MATCH - 1;
  if (flush === Z_FINISH$3) {
    flush_block_only(s, true);
    if (s.strm.avail_out === 0) {
      return BS_FINISH_STARTED;
    }
    return BS_FINISH_DONE;
  }
  if (s.last_lit) {
    flush_block_only(s, false);
    if (s.strm.avail_out === 0) {
      return BS_NEED_MORE;
    }
  }
  return BS_BLOCK_DONE;
};
const deflate_slow = (s, flush) => {
  let hash_head;
  let bflush;
  let max_insert;
  for (; ; ) {
    if (s.lookahead < MIN_LOOKAHEAD) {
      fill_window(s);
      if (s.lookahead < MIN_LOOKAHEAD && flush === Z_NO_FLUSH$2) {
        return BS_NEED_MORE;
      }
      if (s.lookahead === 0) {
        break;
      }
    }
    hash_head = 0;
    if (s.lookahead >= MIN_MATCH) {
      s.ins_h = HASH(s, s.ins_h, s.window[s.strstart + MIN_MATCH - 1]);
      hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
      s.head[s.ins_h] = s.strstart;
    }
    s.prev_length = s.match_length;
    s.prev_match = s.match_start;
    s.match_length = MIN_MATCH - 1;
    if (hash_head !== 0 && s.prev_length < s.max_lazy_match && s.strstart - hash_head <= s.w_size - MIN_LOOKAHEAD) {
      s.match_length = longest_match(s, hash_head);
      if (s.match_length <= 5 && (s.strategy === Z_FILTERED || s.match_length === MIN_MATCH && s.strstart - s.match_start > 4096)) {
        s.match_length = MIN_MATCH - 1;
      }
    }
    if (s.prev_length >= MIN_MATCH && s.match_length <= s.prev_length) {
      max_insert = s.strstart + s.lookahead - MIN_MATCH;
      bflush = _tr_tally(s, s.strstart - 1 - s.prev_match, s.prev_length - MIN_MATCH);
      s.lookahead -= s.prev_length - 1;
      s.prev_length -= 2;
      do {
        if (++s.strstart <= max_insert) {
          s.ins_h = HASH(s, s.ins_h, s.window[s.strstart + MIN_MATCH - 1]);
          hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
          s.head[s.ins_h] = s.strstart;
        }
      } while (--s.prev_length !== 0);
      s.match_available = 0;
      s.match_length = MIN_MATCH - 1;
      s.strstart++;
      if (bflush) {
        flush_block_only(s, false);
        if (s.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
      }
    } else if (s.match_available) {
      bflush = _tr_tally(s, 0, s.window[s.strstart - 1]);
      if (bflush) {
        flush_block_only(s, false);
      }
      s.strstart++;
      s.lookahead--;
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
    } else {
      s.match_available = 1;
      s.strstart++;
      s.lookahead--;
    }
  }
  if (s.match_available) {
    bflush = _tr_tally(s, 0, s.window[s.strstart - 1]);
    s.match_available = 0;
  }
  s.insert = s.strstart < MIN_MATCH - 1 ? s.strstart : MIN_MATCH - 1;
  if (flush === Z_FINISH$3) {
    flush_block_only(s, true);
    if (s.strm.avail_out === 0) {
      return BS_FINISH_STARTED;
    }
    return BS_FINISH_DONE;
  }
  if (s.last_lit) {
    flush_block_only(s, false);
    if (s.strm.avail_out === 0) {
      return BS_NEED_MORE;
    }
  }
  return BS_BLOCK_DONE;
};
const deflate_rle = (s, flush) => {
  let bflush;
  let prev;
  let scan, strend;
  const _win = s.window;
  for (; ; ) {
    if (s.lookahead <= MAX_MATCH) {
      fill_window(s);
      if (s.lookahead <= MAX_MATCH && flush === Z_NO_FLUSH$2) {
        return BS_NEED_MORE;
      }
      if (s.lookahead === 0) {
        break;
      }
    }
    s.match_length = 0;
    if (s.lookahead >= MIN_MATCH && s.strstart > 0) {
      scan = s.strstart - 1;
      prev = _win[scan];
      if (prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan]) {
        strend = s.strstart + MAX_MATCH;
        do {
        } while (prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && scan < strend);
        s.match_length = MAX_MATCH - (strend - scan);
        if (s.match_length > s.lookahead) {
          s.match_length = s.lookahead;
        }
      }
    }
    if (s.match_length >= MIN_MATCH) {
      bflush = _tr_tally(s, 1, s.match_length - MIN_MATCH);
      s.lookahead -= s.match_length;
      s.strstart += s.match_length;
      s.match_length = 0;
    } else {
      bflush = _tr_tally(s, 0, s.window[s.strstart]);
      s.lookahead--;
      s.strstart++;
    }
    if (bflush) {
      flush_block_only(s, false);
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
    }
  }
  s.insert = 0;
  if (flush === Z_FINISH$3) {
    flush_block_only(s, true);
    if (s.strm.avail_out === 0) {
      return BS_FINISH_STARTED;
    }
    return BS_FINISH_DONE;
  }
  if (s.last_lit) {
    flush_block_only(s, false);
    if (s.strm.avail_out === 0) {
      return BS_NEED_MORE;
    }
  }
  return BS_BLOCK_DONE;
};
const deflate_huff = (s, flush) => {
  let bflush;
  for (; ; ) {
    if (s.lookahead === 0) {
      fill_window(s);
      if (s.lookahead === 0) {
        if (flush === Z_NO_FLUSH$2) {
          return BS_NEED_MORE;
        }
        break;
      }
    }
    s.match_length = 0;
    bflush = _tr_tally(s, 0, s.window[s.strstart]);
    s.lookahead--;
    s.strstart++;
    if (bflush) {
      flush_block_only(s, false);
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
    }
  }
  s.insert = 0;
  if (flush === Z_FINISH$3) {
    flush_block_only(s, true);
    if (s.strm.avail_out === 0) {
      return BS_FINISH_STARTED;
    }
    return BS_FINISH_DONE;
  }
  if (s.last_lit) {
    flush_block_only(s, false);
    if (s.strm.avail_out === 0) {
      return BS_NEED_MORE;
    }
  }
  return BS_BLOCK_DONE;
};
function Config(good_length, max_lazy, nice_length, max_chain, func) {
  this.good_length = good_length;
  this.max_lazy = max_lazy;
  this.nice_length = nice_length;
  this.max_chain = max_chain;
  this.func = func;
}
const configuration_table = [
  new Config(0, 0, 0, 0, deflate_stored),
  new Config(4, 4, 8, 4, deflate_fast),
  new Config(4, 5, 16, 8, deflate_fast),
  new Config(4, 6, 32, 32, deflate_fast),
  new Config(4, 4, 16, 16, deflate_slow),
  new Config(8, 16, 32, 32, deflate_slow),
  new Config(8, 16, 128, 128, deflate_slow),
  new Config(8, 32, 128, 256, deflate_slow),
  new Config(32, 128, 258, 1024, deflate_slow),
  new Config(32, 258, 258, 4096, deflate_slow)
];
const lm_init = (s) => {
  s.window_size = 2 * s.w_size;
  zero(s.head);
  s.max_lazy_match = configuration_table[s.level].max_lazy;
  s.good_match = configuration_table[s.level].good_length;
  s.nice_match = configuration_table[s.level].nice_length;
  s.max_chain_length = configuration_table[s.level].max_chain;
  s.strstart = 0;
  s.block_start = 0;
  s.lookahead = 0;
  s.insert = 0;
  s.match_length = s.prev_length = MIN_MATCH - 1;
  s.match_available = 0;
  s.ins_h = 0;
};
function DeflateState() {
  this.strm = null;
  this.status = 0;
  this.pending_buf = null;
  this.pending_buf_size = 0;
  this.pending_out = 0;
  this.pending = 0;
  this.wrap = 0;
  this.gzhead = null;
  this.gzindex = 0;
  this.method = Z_DEFLATED$2;
  this.last_flush = -1;
  this.w_size = 0;
  this.w_bits = 0;
  this.w_mask = 0;
  this.window = null;
  this.window_size = 0;
  this.prev = null;
  this.head = null;
  this.ins_h = 0;
  this.hash_size = 0;
  this.hash_bits = 0;
  this.hash_mask = 0;
  this.hash_shift = 0;
  this.block_start = 0;
  this.match_length = 0;
  this.prev_match = 0;
  this.match_available = 0;
  this.strstart = 0;
  this.match_start = 0;
  this.lookahead = 0;
  this.prev_length = 0;
  this.max_chain_length = 0;
  this.max_lazy_match = 0;
  this.level = 0;
  this.strategy = 0;
  this.good_match = 0;
  this.nice_match = 0;
  this.dyn_ltree = new Uint16Array(HEAP_SIZE * 2);
  this.dyn_dtree = new Uint16Array((2 * D_CODES + 1) * 2);
  this.bl_tree = new Uint16Array((2 * BL_CODES + 1) * 2);
  zero(this.dyn_ltree);
  zero(this.dyn_dtree);
  zero(this.bl_tree);
  this.l_desc = null;
  this.d_desc = null;
  this.bl_desc = null;
  this.bl_count = new Uint16Array(MAX_BITS + 1);
  this.heap = new Uint16Array(2 * L_CODES + 1);
  zero(this.heap);
  this.heap_len = 0;
  this.heap_max = 0;
  this.depth = new Uint16Array(2 * L_CODES + 1);
  zero(this.depth);
  this.l_buf = 0;
  this.lit_bufsize = 0;
  this.last_lit = 0;
  this.d_buf = 0;
  this.opt_len = 0;
  this.static_len = 0;
  this.matches = 0;
  this.insert = 0;
  this.bi_buf = 0;
  this.bi_valid = 0;
}
const deflateResetKeep = (strm) => {
  if (!strm || !strm.state) {
    return err(strm, Z_STREAM_ERROR$2);
  }
  strm.total_in = strm.total_out = 0;
  strm.data_type = Z_UNKNOWN;
  const s = strm.state;
  s.pending = 0;
  s.pending_out = 0;
  if (s.wrap < 0) {
    s.wrap = -s.wrap;
  }
  s.status = s.wrap ? INIT_STATE : BUSY_STATE;
  strm.adler = s.wrap === 2 ? 0 : 1;
  s.last_flush = Z_NO_FLUSH$2;
  _tr_init(s);
  return Z_OK$3;
};
const deflateReset = (strm) => {
  const ret = deflateResetKeep(strm);
  if (ret === Z_OK$3) {
    lm_init(strm.state);
  }
  return ret;
};
const deflateSetHeader = (strm, head) => {
  if (!strm || !strm.state) {
    return Z_STREAM_ERROR$2;
  }
  if (strm.state.wrap !== 2) {
    return Z_STREAM_ERROR$2;
  }
  strm.state.gzhead = head;
  return Z_OK$3;
};
const deflateInit2 = (strm, level, method, windowBits, memLevel, strategy) => {
  if (!strm) {
    return Z_STREAM_ERROR$2;
  }
  let wrap = 1;
  if (level === Z_DEFAULT_COMPRESSION$1) {
    level = 6;
  }
  if (windowBits < 0) {
    wrap = 0;
    windowBits = -windowBits;
  } else if (windowBits > 15) {
    wrap = 2;
    windowBits -= 16;
  }
  if (memLevel < 1 || memLevel > MAX_MEM_LEVEL || method !== Z_DEFLATED$2 || windowBits < 8 || windowBits > 15 || level < 0 || level > 9 || strategy < 0 || strategy > Z_FIXED) {
    return err(strm, Z_STREAM_ERROR$2);
  }
  if (windowBits === 8) {
    windowBits = 9;
  }
  const s = new DeflateState();
  strm.state = s;
  s.strm = strm;
  s.wrap = wrap;
  s.gzhead = null;
  s.w_bits = windowBits;
  s.w_size = 1 << s.w_bits;
  s.w_mask = s.w_size - 1;
  s.hash_bits = memLevel + 7;
  s.hash_size = 1 << s.hash_bits;
  s.hash_mask = s.hash_size - 1;
  s.hash_shift = ~~((s.hash_bits + MIN_MATCH - 1) / MIN_MATCH);
  s.window = new Uint8Array(s.w_size * 2);
  s.head = new Uint16Array(s.hash_size);
  s.prev = new Uint16Array(s.w_size);
  s.lit_bufsize = 1 << memLevel + 6;
  s.pending_buf_size = s.lit_bufsize * 4;
  s.pending_buf = new Uint8Array(s.pending_buf_size);
  s.d_buf = 1 * s.lit_bufsize;
  s.l_buf = (1 + 2) * s.lit_bufsize;
  s.level = level;
  s.strategy = strategy;
  s.method = method;
  return deflateReset(strm);
};
const deflateInit = (strm, level) => {
  return deflateInit2(strm, level, Z_DEFLATED$2, MAX_WBITS$1, DEF_MEM_LEVEL, Z_DEFAULT_STRATEGY$1);
};
const deflate$2 = (strm, flush) => {
  let beg, val;
  if (!strm || !strm.state || flush > Z_BLOCK$1 || flush < 0) {
    return strm ? err(strm, Z_STREAM_ERROR$2) : Z_STREAM_ERROR$2;
  }
  const s = strm.state;
  if (!strm.output || !strm.input && strm.avail_in !== 0 || s.status === FINISH_STATE && flush !== Z_FINISH$3) {
    return err(strm, strm.avail_out === 0 ? Z_BUF_ERROR$1 : Z_STREAM_ERROR$2);
  }
  s.strm = strm;
  const old_flush = s.last_flush;
  s.last_flush = flush;
  if (s.status === INIT_STATE) {
    if (s.wrap === 2) {
      strm.adler = 0;
      put_byte(s, 31);
      put_byte(s, 139);
      put_byte(s, 8);
      if (!s.gzhead) {
        put_byte(s, 0);
        put_byte(s, 0);
        put_byte(s, 0);
        put_byte(s, 0);
        put_byte(s, 0);
        put_byte(s, s.level === 9 ? 2 : s.strategy >= Z_HUFFMAN_ONLY || s.level < 2 ? 4 : 0);
        put_byte(s, OS_CODE);
        s.status = BUSY_STATE;
      } else {
        put_byte(s, (s.gzhead.text ? 1 : 0) + (s.gzhead.hcrc ? 2 : 0) + (!s.gzhead.extra ? 0 : 4) + (!s.gzhead.name ? 0 : 8) + (!s.gzhead.comment ? 0 : 16));
        put_byte(s, s.gzhead.time & 255);
        put_byte(s, s.gzhead.time >> 8 & 255);
        put_byte(s, s.gzhead.time >> 16 & 255);
        put_byte(s, s.gzhead.time >> 24 & 255);
        put_byte(s, s.level === 9 ? 2 : s.strategy >= Z_HUFFMAN_ONLY || s.level < 2 ? 4 : 0);
        put_byte(s, s.gzhead.os & 255);
        if (s.gzhead.extra && s.gzhead.extra.length) {
          put_byte(s, s.gzhead.extra.length & 255);
          put_byte(s, s.gzhead.extra.length >> 8 & 255);
        }
        if (s.gzhead.hcrc) {
          strm.adler = crc32$1(strm.adler, s.pending_buf, s.pending, 0);
        }
        s.gzindex = 0;
        s.status = EXTRA_STATE;
      }
    } else {
      let header = Z_DEFLATED$2 + (s.w_bits - 8 << 4) << 8;
      let level_flags = -1;
      if (s.strategy >= Z_HUFFMAN_ONLY || s.level < 2) {
        level_flags = 0;
      } else if (s.level < 6) {
        level_flags = 1;
      } else if (s.level === 6) {
        level_flags = 2;
      } else {
        level_flags = 3;
      }
      header |= level_flags << 6;
      if (s.strstart !== 0) {
        header |= PRESET_DICT;
      }
      header += 31 - header % 31;
      s.status = BUSY_STATE;
      putShortMSB(s, header);
      if (s.strstart !== 0) {
        putShortMSB(s, strm.adler >>> 16);
        putShortMSB(s, strm.adler & 65535);
      }
      strm.adler = 1;
    }
  }
  if (s.status === EXTRA_STATE) {
    if (s.gzhead.extra) {
      beg = s.pending;
      while (s.gzindex < (s.gzhead.extra.length & 65535)) {
        if (s.pending === s.pending_buf_size) {
          if (s.gzhead.hcrc && s.pending > beg) {
            strm.adler = crc32$1(strm.adler, s.pending_buf, s.pending - beg, beg);
          }
          flush_pending(strm);
          beg = s.pending;
          if (s.pending === s.pending_buf_size) {
            break;
          }
        }
        put_byte(s, s.gzhead.extra[s.gzindex] & 255);
        s.gzindex++;
      }
      if (s.gzhead.hcrc && s.pending > beg) {
        strm.adler = crc32$1(strm.adler, s.pending_buf, s.pending - beg, beg);
      }
      if (s.gzindex === s.gzhead.extra.length) {
        s.gzindex = 0;
        s.status = NAME_STATE;
      }
    } else {
      s.status = NAME_STATE;
    }
  }
  if (s.status === NAME_STATE) {
    if (s.gzhead.name) {
      beg = s.pending;
      do {
        if (s.pending === s.pending_buf_size) {
          if (s.gzhead.hcrc && s.pending > beg) {
            strm.adler = crc32$1(strm.adler, s.pending_buf, s.pending - beg, beg);
          }
          flush_pending(strm);
          beg = s.pending;
          if (s.pending === s.pending_buf_size) {
            val = 1;
            break;
          }
        }
        if (s.gzindex < s.gzhead.name.length) {
          val = s.gzhead.name.charCodeAt(s.gzindex++) & 255;
        } else {
          val = 0;
        }
        put_byte(s, val);
      } while (val !== 0);
      if (s.gzhead.hcrc && s.pending > beg) {
        strm.adler = crc32$1(strm.adler, s.pending_buf, s.pending - beg, beg);
      }
      if (val === 0) {
        s.gzindex = 0;
        s.status = COMMENT_STATE;
      }
    } else {
      s.status = COMMENT_STATE;
    }
  }
  if (s.status === COMMENT_STATE) {
    if (s.gzhead.comment) {
      beg = s.pending;
      do {
        if (s.pending === s.pending_buf_size) {
          if (s.gzhead.hcrc && s.pending > beg) {
            strm.adler = crc32$1(strm.adler, s.pending_buf, s.pending - beg, beg);
          }
          flush_pending(strm);
          beg = s.pending;
          if (s.pending === s.pending_buf_size) {
            val = 1;
            break;
          }
        }
        if (s.gzindex < s.gzhead.comment.length) {
          val = s.gzhead.comment.charCodeAt(s.gzindex++) & 255;
        } else {
          val = 0;
        }
        put_byte(s, val);
      } while (val !== 0);
      if (s.gzhead.hcrc && s.pending > beg) {
        strm.adler = crc32$1(strm.adler, s.pending_buf, s.pending - beg, beg);
      }
      if (val === 0) {
        s.status = HCRC_STATE;
      }
    } else {
      s.status = HCRC_STATE;
    }
  }
  if (s.status === HCRC_STATE) {
    if (s.gzhead.hcrc) {
      if (s.pending + 2 > s.pending_buf_size) {
        flush_pending(strm);
      }
      if (s.pending + 2 <= s.pending_buf_size) {
        put_byte(s, strm.adler & 255);
        put_byte(s, strm.adler >> 8 & 255);
        strm.adler = 0;
        s.status = BUSY_STATE;
      }
    } else {
      s.status = BUSY_STATE;
    }
  }
  if (s.pending !== 0) {
    flush_pending(strm);
    if (strm.avail_out === 0) {
      s.last_flush = -1;
      return Z_OK$3;
    }
  } else if (strm.avail_in === 0 && rank(flush) <= rank(old_flush) && flush !== Z_FINISH$3) {
    return err(strm, Z_BUF_ERROR$1);
  }
  if (s.status === FINISH_STATE && strm.avail_in !== 0) {
    return err(strm, Z_BUF_ERROR$1);
  }
  if (strm.avail_in !== 0 || s.lookahead !== 0 || flush !== Z_NO_FLUSH$2 && s.status !== FINISH_STATE) {
    let bstate = s.strategy === Z_HUFFMAN_ONLY ? deflate_huff(s, flush) : s.strategy === Z_RLE ? deflate_rle(s, flush) : configuration_table[s.level].func(s, flush);
    if (bstate === BS_FINISH_STARTED || bstate === BS_FINISH_DONE) {
      s.status = FINISH_STATE;
    }
    if (bstate === BS_NEED_MORE || bstate === BS_FINISH_STARTED) {
      if (strm.avail_out === 0) {
        s.last_flush = -1;
      }
      return Z_OK$3;
    }
    if (bstate === BS_BLOCK_DONE) {
      if (flush === Z_PARTIAL_FLUSH) {
        _tr_align(s);
      } else if (flush !== Z_BLOCK$1) {
        _tr_stored_block(s, 0, 0, false);
        if (flush === Z_FULL_FLUSH$1) {
          zero(s.head);
          if (s.lookahead === 0) {
            s.strstart = 0;
            s.block_start = 0;
            s.insert = 0;
          }
        }
      }
      flush_pending(strm);
      if (strm.avail_out === 0) {
        s.last_flush = -1;
        return Z_OK$3;
      }
    }
  }
  if (flush !== Z_FINISH$3) {
    return Z_OK$3;
  }
  if (s.wrap <= 0) {
    return Z_STREAM_END$3;
  }
  if (s.wrap === 2) {
    put_byte(s, strm.adler & 255);
    put_byte(s, strm.adler >> 8 & 255);
    put_byte(s, strm.adler >> 16 & 255);
    put_byte(s, strm.adler >> 24 & 255);
    put_byte(s, strm.total_in & 255);
    put_byte(s, strm.total_in >> 8 & 255);
    put_byte(s, strm.total_in >> 16 & 255);
    put_byte(s, strm.total_in >> 24 & 255);
  } else {
    putShortMSB(s, strm.adler >>> 16);
    putShortMSB(s, strm.adler & 65535);
  }
  flush_pending(strm);
  if (s.wrap > 0) {
    s.wrap = -s.wrap;
  }
  return s.pending !== 0 ? Z_OK$3 : Z_STREAM_END$3;
};
const deflateEnd = (strm) => {
  if (!strm || !strm.state) {
    return Z_STREAM_ERROR$2;
  }
  const status = strm.state.status;
  if (status !== INIT_STATE && status !== EXTRA_STATE && status !== NAME_STATE && status !== COMMENT_STATE && status !== HCRC_STATE && status !== BUSY_STATE && status !== FINISH_STATE) {
    return err(strm, Z_STREAM_ERROR$2);
  }
  strm.state = null;
  return status === BUSY_STATE ? err(strm, Z_DATA_ERROR$2) : Z_OK$3;
};
const deflateSetDictionary = (strm, dictionary) => {
  let dictLength = dictionary.length;
  if (!strm || !strm.state) {
    return Z_STREAM_ERROR$2;
  }
  const s = strm.state;
  const wrap = s.wrap;
  if (wrap === 2 || wrap === 1 && s.status !== INIT_STATE || s.lookahead) {
    return Z_STREAM_ERROR$2;
  }
  if (wrap === 1) {
    strm.adler = adler32$1(strm.adler, dictionary, dictLength, 0);
  }
  s.wrap = 0;
  if (dictLength >= s.w_size) {
    if (wrap === 0) {
      zero(s.head);
      s.strstart = 0;
      s.block_start = 0;
      s.insert = 0;
    }
    let tmpDict = new Uint8Array(s.w_size);
    tmpDict.set(dictionary.subarray(dictLength - s.w_size, dictLength), 0);
    dictionary = tmpDict;
    dictLength = s.w_size;
  }
  const avail = strm.avail_in;
  const next = strm.next_in;
  const input = strm.input;
  strm.avail_in = dictLength;
  strm.next_in = 0;
  strm.input = dictionary;
  fill_window(s);
  while (s.lookahead >= MIN_MATCH) {
    let str = s.strstart;
    let n = s.lookahead - (MIN_MATCH - 1);
    do {
      s.ins_h = HASH(s, s.ins_h, s.window[str + MIN_MATCH - 1]);
      s.prev[str & s.w_mask] = s.head[s.ins_h];
      s.head[s.ins_h] = str;
      str++;
    } while (--n);
    s.strstart = str;
    s.lookahead = MIN_MATCH - 1;
    fill_window(s);
  }
  s.strstart += s.lookahead;
  s.block_start = s.strstart;
  s.insert = s.lookahead;
  s.lookahead = 0;
  s.match_length = s.prev_length = MIN_MATCH - 1;
  s.match_available = 0;
  strm.next_in = next;
  strm.input = input;
  strm.avail_in = avail;
  s.wrap = wrap;
  return Z_OK$3;
};
deflate$3.deflateInit = deflateInit;
deflate$3.deflateInit2 = deflateInit2;
deflate$3.deflateReset = deflateReset;
deflate$3.deflateResetKeep = deflateResetKeep;
deflate$3.deflateSetHeader = deflateSetHeader;
deflate$3.deflate = deflate$2;
deflate$3.deflateEnd = deflateEnd;
deflate$3.deflateSetDictionary = deflateSetDictionary;
deflate$3.deflateInfo = "pako deflate (from Nodeca project)";
var common = {};
const _has = (obj, key) => {
  return Object.prototype.hasOwnProperty.call(obj, key);
};
common.assign = function(obj) {
  const sources = Array.prototype.slice.call(arguments, 1);
  while (sources.length) {
    const source = sources.shift();
    if (!source) {
      continue;
    }
    if (typeof source !== "object") {
      throw new TypeError(source + "must be non-object");
    }
    for (const p in source) {
      if (_has(source, p)) {
        obj[p] = source[p];
      }
    }
  }
  return obj;
};
common.flattenChunks = (chunks) => {
  let len = 0;
  for (let i = 0, l = chunks.length; i < l; i++) {
    len += chunks[i].length;
  }
  const result = new Uint8Array(len);
  for (let i = 0, pos = 0, l = chunks.length; i < l; i++) {
    let chunk = chunks[i];
    result.set(chunk, pos);
    pos += chunk.length;
  }
  return result;
};
var strings$2 = {};
let STR_APPLY_UIA_OK = true;
try {
  String.fromCharCode.apply(null, new Uint8Array(1));
} catch (__) {
  STR_APPLY_UIA_OK = false;
}
const _utf8len = new Uint8Array(256);
for (let q = 0; q < 256; q++) {
  _utf8len[q] = q >= 252 ? 6 : q >= 248 ? 5 : q >= 240 ? 4 : q >= 224 ? 3 : q >= 192 ? 2 : 1;
}
_utf8len[254] = _utf8len[254] = 1;
strings$2.string2buf = (str) => {
  if (typeof TextEncoder === "function" && TextEncoder.prototype.encode) {
    return new TextEncoder().encode(str);
  }
  let buf, c, c2, m_pos, i, str_len = str.length, buf_len = 0;
  for (m_pos = 0; m_pos < str_len; m_pos++) {
    c = str.charCodeAt(m_pos);
    if ((c & 64512) === 55296 && m_pos + 1 < str_len) {
      c2 = str.charCodeAt(m_pos + 1);
      if ((c2 & 64512) === 56320) {
        c = 65536 + (c - 55296 << 10) + (c2 - 56320);
        m_pos++;
      }
    }
    buf_len += c < 128 ? 1 : c < 2048 ? 2 : c < 65536 ? 3 : 4;
  }
  buf = new Uint8Array(buf_len);
  for (i = 0, m_pos = 0; i < buf_len; m_pos++) {
    c = str.charCodeAt(m_pos);
    if ((c & 64512) === 55296 && m_pos + 1 < str_len) {
      c2 = str.charCodeAt(m_pos + 1);
      if ((c2 & 64512) === 56320) {
        c = 65536 + (c - 55296 << 10) + (c2 - 56320);
        m_pos++;
      }
    }
    if (c < 128) {
      buf[i++] = c;
    } else if (c < 2048) {
      buf[i++] = 192 | c >>> 6;
      buf[i++] = 128 | c & 63;
    } else if (c < 65536) {
      buf[i++] = 224 | c >>> 12;
      buf[i++] = 128 | c >>> 6 & 63;
      buf[i++] = 128 | c & 63;
    } else {
      buf[i++] = 240 | c >>> 18;
      buf[i++] = 128 | c >>> 12 & 63;
      buf[i++] = 128 | c >>> 6 & 63;
      buf[i++] = 128 | c & 63;
    }
  }
  return buf;
};
const buf2binstring = (buf, len) => {
  if (len < 65534) {
    if (buf.subarray && STR_APPLY_UIA_OK) {
      return String.fromCharCode.apply(null, buf.length === len ? buf : buf.subarray(0, len));
    }
  }
  let result = "";
  for (let i = 0; i < len; i++) {
    result += String.fromCharCode(buf[i]);
  }
  return result;
};
strings$2.buf2string = (buf, max2) => {
  const len = max2 || buf.length;
  if (typeof TextDecoder === "function" && TextDecoder.prototype.decode) {
    return new TextDecoder().decode(buf.subarray(0, max2));
  }
  let i, out;
  const utf16buf = new Array(len * 2);
  for (out = 0, i = 0; i < len; ) {
    let c = buf[i++];
    if (c < 128) {
      utf16buf[out++] = c;
      continue;
    }
    let c_len = _utf8len[c];
    if (c_len > 4) {
      utf16buf[out++] = 65533;
      i += c_len - 1;
      continue;
    }
    c &= c_len === 2 ? 31 : c_len === 3 ? 15 : 7;
    while (c_len > 1 && i < len) {
      c = c << 6 | buf[i++] & 63;
      c_len--;
    }
    if (c_len > 1) {
      utf16buf[out++] = 65533;
      continue;
    }
    if (c < 65536) {
      utf16buf[out++] = c;
    } else {
      c -= 65536;
      utf16buf[out++] = 55296 | c >> 10 & 1023;
      utf16buf[out++] = 56320 | c & 1023;
    }
  }
  return buf2binstring(utf16buf, out);
};
strings$2.utf8border = (buf, max2) => {
  max2 = max2 || buf.length;
  if (max2 > buf.length) {
    max2 = buf.length;
  }
  let pos = max2 - 1;
  while (pos >= 0 && (buf[pos] & 192) === 128) {
    pos--;
  }
  if (pos < 0) {
    return max2;
  }
  if (pos === 0) {
    return max2;
  }
  return pos + _utf8len[buf[pos]] > max2 ? pos : max2;
};
function ZStream$2() {
  this.input = null;
  this.next_in = 0;
  this.avail_in = 0;
  this.total_in = 0;
  this.output = null;
  this.next_out = 0;
  this.avail_out = 0;
  this.total_out = 0;
  this.msg = "";
  this.state = null;
  this.data_type = 2;
  this.adler = 0;
}
var zstream = ZStream$2;
const zlib_deflate = deflate$3;
const utils$1 = common;
const strings$1 = strings$2;
const msg$1 = messages;
const ZStream$1 = zstream;
const toString$1 = Object.prototype.toString;
const {
  Z_NO_FLUSH: Z_NO_FLUSH$1,
  Z_SYNC_FLUSH,
  Z_FULL_FLUSH,
  Z_FINISH: Z_FINISH$2,
  Z_OK: Z_OK$2,
  Z_STREAM_END: Z_STREAM_END$2,
  Z_DEFAULT_COMPRESSION,
  Z_DEFAULT_STRATEGY,
  Z_DEFLATED: Z_DEFLATED$1
} = constants$1;
function Deflate$1(options) {
  this.options = utils$1.assign({
    level: Z_DEFAULT_COMPRESSION,
    method: Z_DEFLATED$1,
    chunkSize: 16384,
    windowBits: 15,
    memLevel: 8,
    strategy: Z_DEFAULT_STRATEGY
  }, options || {});
  let opt = this.options;
  if (opt.raw && opt.windowBits > 0) {
    opt.windowBits = -opt.windowBits;
  } else if (opt.gzip && opt.windowBits > 0 && opt.windowBits < 16) {
    opt.windowBits += 16;
  }
  this.err = 0;
  this.msg = "";
  this.ended = false;
  this.chunks = [];
  this.strm = new ZStream$1();
  this.strm.avail_out = 0;
  let status = zlib_deflate.deflateInit2(this.strm, opt.level, opt.method, opt.windowBits, opt.memLevel, opt.strategy);
  if (status !== Z_OK$2) {
    throw new Error(msg$1[status]);
  }
  if (opt.header) {
    zlib_deflate.deflateSetHeader(this.strm, opt.header);
  }
  if (opt.dictionary) {
    let dict;
    if (typeof opt.dictionary === "string") {
      dict = strings$1.string2buf(opt.dictionary);
    } else if (toString$1.call(opt.dictionary) === "[object ArrayBuffer]") {
      dict = new Uint8Array(opt.dictionary);
    } else {
      dict = opt.dictionary;
    }
    status = zlib_deflate.deflateSetDictionary(this.strm, dict);
    if (status !== Z_OK$2) {
      throw new Error(msg$1[status]);
    }
    this._dict_set = true;
  }
}
Deflate$1.prototype.push = function(data, flush_mode) {
  const strm = this.strm;
  const chunkSize = this.options.chunkSize;
  let status, _flush_mode;
  if (this.ended) {
    return false;
  }
  if (flush_mode === ~~flush_mode)
    _flush_mode = flush_mode;
  else
    _flush_mode = flush_mode === true ? Z_FINISH$2 : Z_NO_FLUSH$1;
  if (typeof data === "string") {
    strm.input = strings$1.string2buf(data);
  } else if (toString$1.call(data) === "[object ArrayBuffer]") {
    strm.input = new Uint8Array(data);
  } else {
    strm.input = data;
  }
  strm.next_in = 0;
  strm.avail_in = strm.input.length;
  for (; ; ) {
    if (strm.avail_out === 0) {
      strm.output = new Uint8Array(chunkSize);
      strm.next_out = 0;
      strm.avail_out = chunkSize;
    }
    if ((_flush_mode === Z_SYNC_FLUSH || _flush_mode === Z_FULL_FLUSH) && strm.avail_out <= 6) {
      this.onData(strm.output.subarray(0, strm.next_out));
      strm.avail_out = 0;
      continue;
    }
    status = zlib_deflate.deflate(strm, _flush_mode);
    if (status === Z_STREAM_END$2) {
      if (strm.next_out > 0) {
        this.onData(strm.output.subarray(0, strm.next_out));
      }
      status = zlib_deflate.deflateEnd(this.strm);
      this.onEnd(status);
      this.ended = true;
      return status === Z_OK$2;
    }
    if (strm.avail_out === 0) {
      this.onData(strm.output);
      continue;
    }
    if (_flush_mode > 0 && strm.next_out > 0) {
      this.onData(strm.output.subarray(0, strm.next_out));
      strm.avail_out = 0;
      continue;
    }
    if (strm.avail_in === 0)
      break;
  }
  return true;
};
Deflate$1.prototype.onData = function(chunk) {
  this.chunks.push(chunk);
};
Deflate$1.prototype.onEnd = function(status) {
  if (status === Z_OK$2) {
    this.result = utils$1.flattenChunks(this.chunks);
  }
  this.chunks = [];
  this.err = status;
  this.msg = this.strm.msg;
};
function deflate$1(input, options) {
  const deflator = new Deflate$1(options);
  deflator.push(input, true);
  if (deflator.err) {
    throw deflator.msg || msg$1[deflator.err];
  }
  return deflator.result;
}
function deflateRaw$1(input, options) {
  options = options || {};
  options.raw = true;
  return deflate$1(input, options);
}
function gzip$1(input, options) {
  options = options || {};
  options.gzip = true;
  return deflate$1(input, options);
}
deflate$4.Deflate = Deflate$1;
deflate$4.deflate = deflate$1;
deflate$4.deflateRaw = deflateRaw$1;
deflate$4.gzip = gzip$1;
deflate$4.constants = constants$1;
var inflate$4 = {};
var inflate$3 = {};
const BAD$1 = 30;
const TYPE$1 = 12;
var inffast = function inflate_fast(strm, start) {
  let _in;
  let last;
  let _out;
  let beg;
  let end;
  let dmax;
  let wsize;
  let whave;
  let wnext;
  let s_window;
  let hold;
  let bits;
  let lcode;
  let dcode;
  let lmask;
  let dmask;
  let here;
  let op;
  let len;
  let dist;
  let from;
  let from_source;
  let input, output;
  const state = strm.state;
  _in = strm.next_in;
  input = strm.input;
  last = _in + (strm.avail_in - 5);
  _out = strm.next_out;
  output = strm.output;
  beg = _out - (start - strm.avail_out);
  end = _out + (strm.avail_out - 257);
  dmax = state.dmax;
  wsize = state.wsize;
  whave = state.whave;
  wnext = state.wnext;
  s_window = state.window;
  hold = state.hold;
  bits = state.bits;
  lcode = state.lencode;
  dcode = state.distcode;
  lmask = (1 << state.lenbits) - 1;
  dmask = (1 << state.distbits) - 1;
  top:
    do {
      if (bits < 15) {
        hold += input[_in++] << bits;
        bits += 8;
        hold += input[_in++] << bits;
        bits += 8;
      }
      here = lcode[hold & lmask];
      dolen:
        for (; ; ) {
          op = here >>> 24;
          hold >>>= op;
          bits -= op;
          op = here >>> 16 & 255;
          if (op === 0) {
            output[_out++] = here & 65535;
          } else if (op & 16) {
            len = here & 65535;
            op &= 15;
            if (op) {
              if (bits < op) {
                hold += input[_in++] << bits;
                bits += 8;
              }
              len += hold & (1 << op) - 1;
              hold >>>= op;
              bits -= op;
            }
            if (bits < 15) {
              hold += input[_in++] << bits;
              bits += 8;
              hold += input[_in++] << bits;
              bits += 8;
            }
            here = dcode[hold & dmask];
            dodist:
              for (; ; ) {
                op = here >>> 24;
                hold >>>= op;
                bits -= op;
                op = here >>> 16 & 255;
                if (op & 16) {
                  dist = here & 65535;
                  op &= 15;
                  if (bits < op) {
                    hold += input[_in++] << bits;
                    bits += 8;
                    if (bits < op) {
                      hold += input[_in++] << bits;
                      bits += 8;
                    }
                  }
                  dist += hold & (1 << op) - 1;
                  if (dist > dmax) {
                    strm.msg = "invalid distance too far back";
                    state.mode = BAD$1;
                    break top;
                  }
                  hold >>>= op;
                  bits -= op;
                  op = _out - beg;
                  if (dist > op) {
                    op = dist - op;
                    if (op > whave) {
                      if (state.sane) {
                        strm.msg = "invalid distance too far back";
                        state.mode = BAD$1;
                        break top;
                      }
                    }
                    from = 0;
                    from_source = s_window;
                    if (wnext === 0) {
                      from += wsize - op;
                      if (op < len) {
                        len -= op;
                        do {
                          output[_out++] = s_window[from++];
                        } while (--op);
                        from = _out - dist;
                        from_source = output;
                      }
                    } else if (wnext < op) {
                      from += wsize + wnext - op;
                      op -= wnext;
                      if (op < len) {
                        len -= op;
                        do {
                          output[_out++] = s_window[from++];
                        } while (--op);
                        from = 0;
                        if (wnext < len) {
                          op = wnext;
                          len -= op;
                          do {
                            output[_out++] = s_window[from++];
                          } while (--op);
                          from = _out - dist;
                          from_source = output;
                        }
                      }
                    } else {
                      from += wnext - op;
                      if (op < len) {
                        len -= op;
                        do {
                          output[_out++] = s_window[from++];
                        } while (--op);
                        from = _out - dist;
                        from_source = output;
                      }
                    }
                    while (len > 2) {
                      output[_out++] = from_source[from++];
                      output[_out++] = from_source[from++];
                      output[_out++] = from_source[from++];
                      len -= 3;
                    }
                    if (len) {
                      output[_out++] = from_source[from++];
                      if (len > 1) {
                        output[_out++] = from_source[from++];
                      }
                    }
                  } else {
                    from = _out - dist;
                    do {
                      output[_out++] = output[from++];
                      output[_out++] = output[from++];
                      output[_out++] = output[from++];
                      len -= 3;
                    } while (len > 2);
                    if (len) {
                      output[_out++] = output[from++];
                      if (len > 1) {
                        output[_out++] = output[from++];
                      }
                    }
                  }
                } else if ((op & 64) === 0) {
                  here = dcode[(here & 65535) + (hold & (1 << op) - 1)];
                  continue dodist;
                } else {
                  strm.msg = "invalid distance code";
                  state.mode = BAD$1;
                  break top;
                }
                break;
              }
          } else if ((op & 64) === 0) {
            here = lcode[(here & 65535) + (hold & (1 << op) - 1)];
            continue dolen;
          } else if (op & 32) {
            state.mode = TYPE$1;
            break top;
          } else {
            strm.msg = "invalid literal/length code";
            state.mode = BAD$1;
            break top;
          }
          break;
        }
    } while (_in < last && _out < end);
  len = bits >> 3;
  _in -= len;
  bits -= len << 3;
  hold &= (1 << bits) - 1;
  strm.next_in = _in;
  strm.next_out = _out;
  strm.avail_in = _in < last ? 5 + (last - _in) : 5 - (_in - last);
  strm.avail_out = _out < end ? 257 + (end - _out) : 257 - (_out - end);
  state.hold = hold;
  state.bits = bits;
  return;
};
const MAXBITS = 15;
const ENOUGH_LENS$1 = 852;
const ENOUGH_DISTS$1 = 592;
const CODES$1 = 0;
const LENS$1 = 1;
const DISTS$1 = 2;
const lbase = new Uint16Array([
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  13,
  15,
  17,
  19,
  23,
  27,
  31,
  35,
  43,
  51,
  59,
  67,
  83,
  99,
  115,
  131,
  163,
  195,
  227,
  258,
  0,
  0
]);
const lext = new Uint8Array([
  16,
  16,
  16,
  16,
  16,
  16,
  16,
  16,
  17,
  17,
  17,
  17,
  18,
  18,
  18,
  18,
  19,
  19,
  19,
  19,
  20,
  20,
  20,
  20,
  21,
  21,
  21,
  21,
  16,
  72,
  78
]);
const dbase = new Uint16Array([
  1,
  2,
  3,
  4,
  5,
  7,
  9,
  13,
  17,
  25,
  33,
  49,
  65,
  97,
  129,
  193,
  257,
  385,
  513,
  769,
  1025,
  1537,
  2049,
  3073,
  4097,
  6145,
  8193,
  12289,
  16385,
  24577,
  0,
  0
]);
const dext = new Uint8Array([
  16,
  16,
  16,
  16,
  17,
  17,
  18,
  18,
  19,
  19,
  20,
  20,
  21,
  21,
  22,
  22,
  23,
  23,
  24,
  24,
  25,
  25,
  26,
  26,
  27,
  27,
  28,
  28,
  29,
  29,
  64,
  64
]);
const inflate_table$1 = (type, lens, lens_index, codes, table, table_index, work, opts) => {
  const bits = opts.bits;
  let len = 0;
  let sym = 0;
  let min2 = 0, max2 = 0;
  let root = 0;
  let curr = 0;
  let drop = 0;
  let left = 0;
  let used = 0;
  let huff = 0;
  let incr;
  let fill;
  let low;
  let mask;
  let next;
  let base = null;
  let base_index = 0;
  let end;
  const count = new Uint16Array(MAXBITS + 1);
  const offs = new Uint16Array(MAXBITS + 1);
  let extra = null;
  let extra_index = 0;
  let here_bits, here_op, here_val;
  for (len = 0; len <= MAXBITS; len++) {
    count[len] = 0;
  }
  for (sym = 0; sym < codes; sym++) {
    count[lens[lens_index + sym]]++;
  }
  root = bits;
  for (max2 = MAXBITS; max2 >= 1; max2--) {
    if (count[max2] !== 0) {
      break;
    }
  }
  if (root > max2) {
    root = max2;
  }
  if (max2 === 0) {
    table[table_index++] = 1 << 24 | 64 << 16 | 0;
    table[table_index++] = 1 << 24 | 64 << 16 | 0;
    opts.bits = 1;
    return 0;
  }
  for (min2 = 1; min2 < max2; min2++) {
    if (count[min2] !== 0) {
      break;
    }
  }
  if (root < min2) {
    root = min2;
  }
  left = 1;
  for (len = 1; len <= MAXBITS; len++) {
    left <<= 1;
    left -= count[len];
    if (left < 0) {
      return -1;
    }
  }
  if (left > 0 && (type === CODES$1 || max2 !== 1)) {
    return -1;
  }
  offs[1] = 0;
  for (len = 1; len < MAXBITS; len++) {
    offs[len + 1] = offs[len] + count[len];
  }
  for (sym = 0; sym < codes; sym++) {
    if (lens[lens_index + sym] !== 0) {
      work[offs[lens[lens_index + sym]]++] = sym;
    }
  }
  if (type === CODES$1) {
    base = extra = work;
    end = 19;
  } else if (type === LENS$1) {
    base = lbase;
    base_index -= 257;
    extra = lext;
    extra_index -= 257;
    end = 256;
  } else {
    base = dbase;
    extra = dext;
    end = -1;
  }
  huff = 0;
  sym = 0;
  len = min2;
  next = table_index;
  curr = root;
  drop = 0;
  low = -1;
  used = 1 << root;
  mask = used - 1;
  if (type === LENS$1 && used > ENOUGH_LENS$1 || type === DISTS$1 && used > ENOUGH_DISTS$1) {
    return 1;
  }
  for (; ; ) {
    here_bits = len - drop;
    if (work[sym] < end) {
      here_op = 0;
      here_val = work[sym];
    } else if (work[sym] > end) {
      here_op = extra[extra_index + work[sym]];
      here_val = base[base_index + work[sym]];
    } else {
      here_op = 32 + 64;
      here_val = 0;
    }
    incr = 1 << len - drop;
    fill = 1 << curr;
    min2 = fill;
    do {
      fill -= incr;
      table[next + (huff >> drop) + fill] = here_bits << 24 | here_op << 16 | here_val | 0;
    } while (fill !== 0);
    incr = 1 << len - 1;
    while (huff & incr) {
      incr >>= 1;
    }
    if (incr !== 0) {
      huff &= incr - 1;
      huff += incr;
    } else {
      huff = 0;
    }
    sym++;
    if (--count[len] === 0) {
      if (len === max2) {
        break;
      }
      len = lens[lens_index + work[sym]];
    }
    if (len > root && (huff & mask) !== low) {
      if (drop === 0) {
        drop = root;
      }
      next += min2;
      curr = len - drop;
      left = 1 << curr;
      while (curr + drop < max2) {
        left -= count[curr + drop];
        if (left <= 0) {
          break;
        }
        curr++;
        left <<= 1;
      }
      used += 1 << curr;
      if (type === LENS$1 && used > ENOUGH_LENS$1 || type === DISTS$1 && used > ENOUGH_DISTS$1) {
        return 1;
      }
      low = huff & mask;
      table[low] = root << 24 | curr << 16 | next - table_index | 0;
    }
  }
  if (huff !== 0) {
    table[next + huff] = len - drop << 24 | 64 << 16 | 0;
  }
  opts.bits = root;
  return 0;
};
var inftrees = inflate_table$1;
const adler32 = adler32_1;
const crc32 = crc32_1;
const inflate_fast2 = inffast;
const inflate_table = inftrees;
const CODES = 0;
const LENS = 1;
const DISTS = 2;
const {
  Z_FINISH: Z_FINISH$1,
  Z_BLOCK,
  Z_TREES,
  Z_OK: Z_OK$1,
  Z_STREAM_END: Z_STREAM_END$1,
  Z_NEED_DICT: Z_NEED_DICT$1,
  Z_STREAM_ERROR: Z_STREAM_ERROR$1,
  Z_DATA_ERROR: Z_DATA_ERROR$1,
  Z_MEM_ERROR: Z_MEM_ERROR$1,
  Z_BUF_ERROR,
  Z_DEFLATED
} = constants$1;
const HEAD = 1;
const FLAGS = 2;
const TIME = 3;
const OS = 4;
const EXLEN = 5;
const EXTRA = 6;
const NAME = 7;
const COMMENT = 8;
const HCRC = 9;
const DICTID = 10;
const DICT = 11;
const TYPE = 12;
const TYPEDO = 13;
const STORED = 14;
const COPY_ = 15;
const COPY = 16;
const TABLE = 17;
const LENLENS = 18;
const CODELENS = 19;
const LEN_ = 20;
const LEN = 21;
const LENEXT = 22;
const DIST = 23;
const DISTEXT = 24;
const MATCH = 25;
const LIT = 26;
const CHECK = 27;
const LENGTH = 28;
const DONE = 29;
const BAD = 30;
const MEM = 31;
const SYNC = 32;
const ENOUGH_LENS = 852;
const ENOUGH_DISTS = 592;
const MAX_WBITS = 15;
const DEF_WBITS = MAX_WBITS;
const zswap32 = (q) => {
  return (q >>> 24 & 255) + (q >>> 8 & 65280) + ((q & 65280) << 8) + ((q & 255) << 24);
};
function InflateState() {
  this.mode = 0;
  this.last = false;
  this.wrap = 0;
  this.havedict = false;
  this.flags = 0;
  this.dmax = 0;
  this.check = 0;
  this.total = 0;
  this.head = null;
  this.wbits = 0;
  this.wsize = 0;
  this.whave = 0;
  this.wnext = 0;
  this.window = null;
  this.hold = 0;
  this.bits = 0;
  this.length = 0;
  this.offset = 0;
  this.extra = 0;
  this.lencode = null;
  this.distcode = null;
  this.lenbits = 0;
  this.distbits = 0;
  this.ncode = 0;
  this.nlen = 0;
  this.ndist = 0;
  this.have = 0;
  this.next = null;
  this.lens = new Uint16Array(320);
  this.work = new Uint16Array(288);
  this.lendyn = null;
  this.distdyn = null;
  this.sane = 0;
  this.back = 0;
  this.was = 0;
}
const inflateResetKeep = (strm) => {
  if (!strm || !strm.state) {
    return Z_STREAM_ERROR$1;
  }
  const state = strm.state;
  strm.total_in = strm.total_out = state.total = 0;
  strm.msg = "";
  if (state.wrap) {
    strm.adler = state.wrap & 1;
  }
  state.mode = HEAD;
  state.last = 0;
  state.havedict = 0;
  state.dmax = 32768;
  state.head = null;
  state.hold = 0;
  state.bits = 0;
  state.lencode = state.lendyn = new Int32Array(ENOUGH_LENS);
  state.distcode = state.distdyn = new Int32Array(ENOUGH_DISTS);
  state.sane = 1;
  state.back = -1;
  return Z_OK$1;
};
const inflateReset = (strm) => {
  if (!strm || !strm.state) {
    return Z_STREAM_ERROR$1;
  }
  const state = strm.state;
  state.wsize = 0;
  state.whave = 0;
  state.wnext = 0;
  return inflateResetKeep(strm);
};
const inflateReset2 = (strm, windowBits) => {
  let wrap;
  if (!strm || !strm.state) {
    return Z_STREAM_ERROR$1;
  }
  const state = strm.state;
  if (windowBits < 0) {
    wrap = 0;
    windowBits = -windowBits;
  } else {
    wrap = (windowBits >> 4) + 1;
    if (windowBits < 48) {
      windowBits &= 15;
    }
  }
  if (windowBits && (windowBits < 8 || windowBits > 15)) {
    return Z_STREAM_ERROR$1;
  }
  if (state.window !== null && state.wbits !== windowBits) {
    state.window = null;
  }
  state.wrap = wrap;
  state.wbits = windowBits;
  return inflateReset(strm);
};
const inflateInit2 = (strm, windowBits) => {
  if (!strm) {
    return Z_STREAM_ERROR$1;
  }
  const state = new InflateState();
  strm.state = state;
  state.window = null;
  const ret = inflateReset2(strm, windowBits);
  if (ret !== Z_OK$1) {
    strm.state = null;
  }
  return ret;
};
const inflateInit = (strm) => {
  return inflateInit2(strm, DEF_WBITS);
};
let virgin = true;
let lenfix, distfix;
const fixedtables = (state) => {
  if (virgin) {
    lenfix = new Int32Array(512);
    distfix = new Int32Array(32);
    let sym = 0;
    while (sym < 144) {
      state.lens[sym++] = 8;
    }
    while (sym < 256) {
      state.lens[sym++] = 9;
    }
    while (sym < 280) {
      state.lens[sym++] = 7;
    }
    while (sym < 288) {
      state.lens[sym++] = 8;
    }
    inflate_table(LENS, state.lens, 0, 288, lenfix, 0, state.work, { bits: 9 });
    sym = 0;
    while (sym < 32) {
      state.lens[sym++] = 5;
    }
    inflate_table(DISTS, state.lens, 0, 32, distfix, 0, state.work, { bits: 5 });
    virgin = false;
  }
  state.lencode = lenfix;
  state.lenbits = 9;
  state.distcode = distfix;
  state.distbits = 5;
};
const updatewindow = (strm, src, end, copy2) => {
  let dist;
  const state = strm.state;
  if (state.window === null) {
    state.wsize = 1 << state.wbits;
    state.wnext = 0;
    state.whave = 0;
    state.window = new Uint8Array(state.wsize);
  }
  if (copy2 >= state.wsize) {
    state.window.set(src.subarray(end - state.wsize, end), 0);
    state.wnext = 0;
    state.whave = state.wsize;
  } else {
    dist = state.wsize - state.wnext;
    if (dist > copy2) {
      dist = copy2;
    }
    state.window.set(src.subarray(end - copy2, end - copy2 + dist), state.wnext);
    copy2 -= dist;
    if (copy2) {
      state.window.set(src.subarray(end - copy2, end), 0);
      state.wnext = copy2;
      state.whave = state.wsize;
    } else {
      state.wnext += dist;
      if (state.wnext === state.wsize) {
        state.wnext = 0;
      }
      if (state.whave < state.wsize) {
        state.whave += dist;
      }
    }
  }
  return 0;
};
const inflate$2 = (strm, flush) => {
  let state;
  let input, output;
  let next;
  let put;
  let have, left;
  let hold;
  let bits;
  let _in, _out;
  let copy2;
  let from;
  let from_source;
  let here = 0;
  let here_bits, here_op, here_val;
  let last_bits, last_op, last_val;
  let len;
  let ret;
  const hbuf = new Uint8Array(4);
  let opts;
  let n;
  const order = new Uint8Array([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
  if (!strm || !strm.state || !strm.output || !strm.input && strm.avail_in !== 0) {
    return Z_STREAM_ERROR$1;
  }
  state = strm.state;
  if (state.mode === TYPE) {
    state.mode = TYPEDO;
  }
  put = strm.next_out;
  output = strm.output;
  left = strm.avail_out;
  next = strm.next_in;
  input = strm.input;
  have = strm.avail_in;
  hold = state.hold;
  bits = state.bits;
  _in = have;
  _out = left;
  ret = Z_OK$1;
  inf_leave:
    for (; ; ) {
      switch (state.mode) {
        case HEAD:
          if (state.wrap === 0) {
            state.mode = TYPEDO;
            break;
          }
          while (bits < 16) {
            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          if (state.wrap & 2 && hold === 35615) {
            state.check = 0;
            hbuf[0] = hold & 255;
            hbuf[1] = hold >>> 8 & 255;
            state.check = crc32(state.check, hbuf, 2, 0);
            hold = 0;
            bits = 0;
            state.mode = FLAGS;
            break;
          }
          state.flags = 0;
          if (state.head) {
            state.head.done = false;
          }
          if (!(state.wrap & 1) || (((hold & 255) << 8) + (hold >> 8)) % 31) {
            strm.msg = "incorrect header check";
            state.mode = BAD;
            break;
          }
          if ((hold & 15) !== Z_DEFLATED) {
            strm.msg = "unknown compression method";
            state.mode = BAD;
            break;
          }
          hold >>>= 4;
          bits -= 4;
          len = (hold & 15) + 8;
          if (state.wbits === 0) {
            state.wbits = len;
          } else if (len > state.wbits) {
            strm.msg = "invalid window size";
            state.mode = BAD;
            break;
          }
          state.dmax = 1 << state.wbits;
          strm.adler = state.check = 1;
          state.mode = hold & 512 ? DICTID : TYPE;
          hold = 0;
          bits = 0;
          break;
        case FLAGS:
          while (bits < 16) {
            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          state.flags = hold;
          if ((state.flags & 255) !== Z_DEFLATED) {
            strm.msg = "unknown compression method";
            state.mode = BAD;
            break;
          }
          if (state.flags & 57344) {
            strm.msg = "unknown header flags set";
            state.mode = BAD;
            break;
          }
          if (state.head) {
            state.head.text = hold >> 8 & 1;
          }
          if (state.flags & 512) {
            hbuf[0] = hold & 255;
            hbuf[1] = hold >>> 8 & 255;
            state.check = crc32(state.check, hbuf, 2, 0);
          }
          hold = 0;
          bits = 0;
          state.mode = TIME;
        case TIME:
          while (bits < 32) {
            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          if (state.head) {
            state.head.time = hold;
          }
          if (state.flags & 512) {
            hbuf[0] = hold & 255;
            hbuf[1] = hold >>> 8 & 255;
            hbuf[2] = hold >>> 16 & 255;
            hbuf[3] = hold >>> 24 & 255;
            state.check = crc32(state.check, hbuf, 4, 0);
          }
          hold = 0;
          bits = 0;
          state.mode = OS;
        case OS:
          while (bits < 16) {
            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          if (state.head) {
            state.head.xflags = hold & 255;
            state.head.os = hold >> 8;
          }
          if (state.flags & 512) {
            hbuf[0] = hold & 255;
            hbuf[1] = hold >>> 8 & 255;
            state.check = crc32(state.check, hbuf, 2, 0);
          }
          hold = 0;
          bits = 0;
          state.mode = EXLEN;
        case EXLEN:
          if (state.flags & 1024) {
            while (bits < 16) {
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            state.length = hold;
            if (state.head) {
              state.head.extra_len = hold;
            }
            if (state.flags & 512) {
              hbuf[0] = hold & 255;
              hbuf[1] = hold >>> 8 & 255;
              state.check = crc32(state.check, hbuf, 2, 0);
            }
            hold = 0;
            bits = 0;
          } else if (state.head) {
            state.head.extra = null;
          }
          state.mode = EXTRA;
        case EXTRA:
          if (state.flags & 1024) {
            copy2 = state.length;
            if (copy2 > have) {
              copy2 = have;
            }
            if (copy2) {
              if (state.head) {
                len = state.head.extra_len - state.length;
                if (!state.head.extra) {
                  state.head.extra = new Uint8Array(state.head.extra_len);
                }
                state.head.extra.set(input.subarray(next, next + copy2), len);
              }
              if (state.flags & 512) {
                state.check = crc32(state.check, input, copy2, next);
              }
              have -= copy2;
              next += copy2;
              state.length -= copy2;
            }
            if (state.length) {
              break inf_leave;
            }
          }
          state.length = 0;
          state.mode = NAME;
        case NAME:
          if (state.flags & 2048) {
            if (have === 0) {
              break inf_leave;
            }
            copy2 = 0;
            do {
              len = input[next + copy2++];
              if (state.head && len && state.length < 65536) {
                state.head.name += String.fromCharCode(len);
              }
            } while (len && copy2 < have);
            if (state.flags & 512) {
              state.check = crc32(state.check, input, copy2, next);
            }
            have -= copy2;
            next += copy2;
            if (len) {
              break inf_leave;
            }
          } else if (state.head) {
            state.head.name = null;
          }
          state.length = 0;
          state.mode = COMMENT;
        case COMMENT:
          if (state.flags & 4096) {
            if (have === 0) {
              break inf_leave;
            }
            copy2 = 0;
            do {
              len = input[next + copy2++];
              if (state.head && len && state.length < 65536) {
                state.head.comment += String.fromCharCode(len);
              }
            } while (len && copy2 < have);
            if (state.flags & 512) {
              state.check = crc32(state.check, input, copy2, next);
            }
            have -= copy2;
            next += copy2;
            if (len) {
              break inf_leave;
            }
          } else if (state.head) {
            state.head.comment = null;
          }
          state.mode = HCRC;
        case HCRC:
          if (state.flags & 512) {
            while (bits < 16) {
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            if (hold !== (state.check & 65535)) {
              strm.msg = "header crc mismatch";
              state.mode = BAD;
              break;
            }
            hold = 0;
            bits = 0;
          }
          if (state.head) {
            state.head.hcrc = state.flags >> 9 & 1;
            state.head.done = true;
          }
          strm.adler = state.check = 0;
          state.mode = TYPE;
          break;
        case DICTID:
          while (bits < 32) {
            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          strm.adler = state.check = zswap32(hold);
          hold = 0;
          bits = 0;
          state.mode = DICT;
        case DICT:
          if (state.havedict === 0) {
            strm.next_out = put;
            strm.avail_out = left;
            strm.next_in = next;
            strm.avail_in = have;
            state.hold = hold;
            state.bits = bits;
            return Z_NEED_DICT$1;
          }
          strm.adler = state.check = 1;
          state.mode = TYPE;
        case TYPE:
          if (flush === Z_BLOCK || flush === Z_TREES) {
            break inf_leave;
          }
        case TYPEDO:
          if (state.last) {
            hold >>>= bits & 7;
            bits -= bits & 7;
            state.mode = CHECK;
            break;
          }
          while (bits < 3) {
            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          state.last = hold & 1;
          hold >>>= 1;
          bits -= 1;
          switch (hold & 3) {
            case 0:
              state.mode = STORED;
              break;
            case 1:
              fixedtables(state);
              state.mode = LEN_;
              if (flush === Z_TREES) {
                hold >>>= 2;
                bits -= 2;
                break inf_leave;
              }
              break;
            case 2:
              state.mode = TABLE;
              break;
            case 3:
              strm.msg = "invalid block type";
              state.mode = BAD;
          }
          hold >>>= 2;
          bits -= 2;
          break;
        case STORED:
          hold >>>= bits & 7;
          bits -= bits & 7;
          while (bits < 32) {
            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          if ((hold & 65535) !== (hold >>> 16 ^ 65535)) {
            strm.msg = "invalid stored block lengths";
            state.mode = BAD;
            break;
          }
          state.length = hold & 65535;
          hold = 0;
          bits = 0;
          state.mode = COPY_;
          if (flush === Z_TREES) {
            break inf_leave;
          }
        case COPY_:
          state.mode = COPY;
        case COPY:
          copy2 = state.length;
          if (copy2) {
            if (copy2 > have) {
              copy2 = have;
            }
            if (copy2 > left) {
              copy2 = left;
            }
            if (copy2 === 0) {
              break inf_leave;
            }
            output.set(input.subarray(next, next + copy2), put);
            have -= copy2;
            next += copy2;
            left -= copy2;
            put += copy2;
            state.length -= copy2;
            break;
          }
          state.mode = TYPE;
          break;
        case TABLE:
          while (bits < 14) {
            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          state.nlen = (hold & 31) + 257;
          hold >>>= 5;
          bits -= 5;
          state.ndist = (hold & 31) + 1;
          hold >>>= 5;
          bits -= 5;
          state.ncode = (hold & 15) + 4;
          hold >>>= 4;
          bits -= 4;
          if (state.nlen > 286 || state.ndist > 30) {
            strm.msg = "too many length or distance symbols";
            state.mode = BAD;
            break;
          }
          state.have = 0;
          state.mode = LENLENS;
        case LENLENS:
          while (state.have < state.ncode) {
            while (bits < 3) {
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            state.lens[order[state.have++]] = hold & 7;
            hold >>>= 3;
            bits -= 3;
          }
          while (state.have < 19) {
            state.lens[order[state.have++]] = 0;
          }
          state.lencode = state.lendyn;
          state.lenbits = 7;
          opts = { bits: state.lenbits };
          ret = inflate_table(CODES, state.lens, 0, 19, state.lencode, 0, state.work, opts);
          state.lenbits = opts.bits;
          if (ret) {
            strm.msg = "invalid code lengths set";
            state.mode = BAD;
            break;
          }
          state.have = 0;
          state.mode = CODELENS;
        case CODELENS:
          while (state.have < state.nlen + state.ndist) {
            for (; ; ) {
              here = state.lencode[hold & (1 << state.lenbits) - 1];
              here_bits = here >>> 24;
              here_op = here >>> 16 & 255;
              here_val = here & 65535;
              if (here_bits <= bits) {
                break;
              }
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            if (here_val < 16) {
              hold >>>= here_bits;
              bits -= here_bits;
              state.lens[state.have++] = here_val;
            } else {
              if (here_val === 16) {
                n = here_bits + 2;
                while (bits < n) {
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits;
                  bits += 8;
                }
                hold >>>= here_bits;
                bits -= here_bits;
                if (state.have === 0) {
                  strm.msg = "invalid bit length repeat";
                  state.mode = BAD;
                  break;
                }
                len = state.lens[state.have - 1];
                copy2 = 3 + (hold & 3);
                hold >>>= 2;
                bits -= 2;
              } else if (here_val === 17) {
                n = here_bits + 3;
                while (bits < n) {
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits;
                  bits += 8;
                }
                hold >>>= here_bits;
                bits -= here_bits;
                len = 0;
                copy2 = 3 + (hold & 7);
                hold >>>= 3;
                bits -= 3;
              } else {
                n = here_bits + 7;
                while (bits < n) {
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits;
                  bits += 8;
                }
                hold >>>= here_bits;
                bits -= here_bits;
                len = 0;
                copy2 = 11 + (hold & 127);
                hold >>>= 7;
                bits -= 7;
              }
              if (state.have + copy2 > state.nlen + state.ndist) {
                strm.msg = "invalid bit length repeat";
                state.mode = BAD;
                break;
              }
              while (copy2--) {
                state.lens[state.have++] = len;
              }
            }
          }
          if (state.mode === BAD) {
            break;
          }
          if (state.lens[256] === 0) {
            strm.msg = "invalid code -- missing end-of-block";
            state.mode = BAD;
            break;
          }
          state.lenbits = 9;
          opts = { bits: state.lenbits };
          ret = inflate_table(LENS, state.lens, 0, state.nlen, state.lencode, 0, state.work, opts);
          state.lenbits = opts.bits;
          if (ret) {
            strm.msg = "invalid literal/lengths set";
            state.mode = BAD;
            break;
          }
          state.distbits = 6;
          state.distcode = state.distdyn;
          opts = { bits: state.distbits };
          ret = inflate_table(DISTS, state.lens, state.nlen, state.ndist, state.distcode, 0, state.work, opts);
          state.distbits = opts.bits;
          if (ret) {
            strm.msg = "invalid distances set";
            state.mode = BAD;
            break;
          }
          state.mode = LEN_;
          if (flush === Z_TREES) {
            break inf_leave;
          }
        case LEN_:
          state.mode = LEN;
        case LEN:
          if (have >= 6 && left >= 258) {
            strm.next_out = put;
            strm.avail_out = left;
            strm.next_in = next;
            strm.avail_in = have;
            state.hold = hold;
            state.bits = bits;
            inflate_fast2(strm, _out);
            put = strm.next_out;
            output = strm.output;
            left = strm.avail_out;
            next = strm.next_in;
            input = strm.input;
            have = strm.avail_in;
            hold = state.hold;
            bits = state.bits;
            if (state.mode === TYPE) {
              state.back = -1;
            }
            break;
          }
          state.back = 0;
          for (; ; ) {
            here = state.lencode[hold & (1 << state.lenbits) - 1];
            here_bits = here >>> 24;
            here_op = here >>> 16 & 255;
            here_val = here & 65535;
            if (here_bits <= bits) {
              break;
            }
            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          if (here_op && (here_op & 240) === 0) {
            last_bits = here_bits;
            last_op = here_op;
            last_val = here_val;
            for (; ; ) {
              here = state.lencode[last_val + ((hold & (1 << last_bits + last_op) - 1) >> last_bits)];
              here_bits = here >>> 24;
              here_op = here >>> 16 & 255;
              here_val = here & 65535;
              if (last_bits + here_bits <= bits) {
                break;
              }
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            hold >>>= last_bits;
            bits -= last_bits;
            state.back += last_bits;
          }
          hold >>>= here_bits;
          bits -= here_bits;
          state.back += here_bits;
          state.length = here_val;
          if (here_op === 0) {
            state.mode = LIT;
            break;
          }
          if (here_op & 32) {
            state.back = -1;
            state.mode = TYPE;
            break;
          }
          if (here_op & 64) {
            strm.msg = "invalid literal/length code";
            state.mode = BAD;
            break;
          }
          state.extra = here_op & 15;
          state.mode = LENEXT;
        case LENEXT:
          if (state.extra) {
            n = state.extra;
            while (bits < n) {
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            state.length += hold & (1 << state.extra) - 1;
            hold >>>= state.extra;
            bits -= state.extra;
            state.back += state.extra;
          }
          state.was = state.length;
          state.mode = DIST;
        case DIST:
          for (; ; ) {
            here = state.distcode[hold & (1 << state.distbits) - 1];
            here_bits = here >>> 24;
            here_op = here >>> 16 & 255;
            here_val = here & 65535;
            if (here_bits <= bits) {
              break;
            }
            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          if ((here_op & 240) === 0) {
            last_bits = here_bits;
            last_op = here_op;
            last_val = here_val;
            for (; ; ) {
              here = state.distcode[last_val + ((hold & (1 << last_bits + last_op) - 1) >> last_bits)];
              here_bits = here >>> 24;
              here_op = here >>> 16 & 255;
              here_val = here & 65535;
              if (last_bits + here_bits <= bits) {
                break;
              }
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            hold >>>= last_bits;
            bits -= last_bits;
            state.back += last_bits;
          }
          hold >>>= here_bits;
          bits -= here_bits;
          state.back += here_bits;
          if (here_op & 64) {
            strm.msg = "invalid distance code";
            state.mode = BAD;
            break;
          }
          state.offset = here_val;
          state.extra = here_op & 15;
          state.mode = DISTEXT;
        case DISTEXT:
          if (state.extra) {
            n = state.extra;
            while (bits < n) {
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            state.offset += hold & (1 << state.extra) - 1;
            hold >>>= state.extra;
            bits -= state.extra;
            state.back += state.extra;
          }
          if (state.offset > state.dmax) {
            strm.msg = "invalid distance too far back";
            state.mode = BAD;
            break;
          }
          state.mode = MATCH;
        case MATCH:
          if (left === 0) {
            break inf_leave;
          }
          copy2 = _out - left;
          if (state.offset > copy2) {
            copy2 = state.offset - copy2;
            if (copy2 > state.whave) {
              if (state.sane) {
                strm.msg = "invalid distance too far back";
                state.mode = BAD;
                break;
              }
            }
            if (copy2 > state.wnext) {
              copy2 -= state.wnext;
              from = state.wsize - copy2;
            } else {
              from = state.wnext - copy2;
            }
            if (copy2 > state.length) {
              copy2 = state.length;
            }
            from_source = state.window;
          } else {
            from_source = output;
            from = put - state.offset;
            copy2 = state.length;
          }
          if (copy2 > left) {
            copy2 = left;
          }
          left -= copy2;
          state.length -= copy2;
          do {
            output[put++] = from_source[from++];
          } while (--copy2);
          if (state.length === 0) {
            state.mode = LEN;
          }
          break;
        case LIT:
          if (left === 0) {
            break inf_leave;
          }
          output[put++] = state.length;
          left--;
          state.mode = LEN;
          break;
        case CHECK:
          if (state.wrap) {
            while (bits < 32) {
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold |= input[next++] << bits;
              bits += 8;
            }
            _out -= left;
            strm.total_out += _out;
            state.total += _out;
            if (_out) {
              strm.adler = state.check = state.flags ? crc32(state.check, output, _out, put - _out) : adler32(state.check, output, _out, put - _out);
            }
            _out = left;
            if ((state.flags ? hold : zswap32(hold)) !== state.check) {
              strm.msg = "incorrect data check";
              state.mode = BAD;
              break;
            }
            hold = 0;
            bits = 0;
          }
          state.mode = LENGTH;
        case LENGTH:
          if (state.wrap && state.flags) {
            while (bits < 32) {
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            if (hold !== (state.total & 4294967295)) {
              strm.msg = "incorrect length check";
              state.mode = BAD;
              break;
            }
            hold = 0;
            bits = 0;
          }
          state.mode = DONE;
        case DONE:
          ret = Z_STREAM_END$1;
          break inf_leave;
        case BAD:
          ret = Z_DATA_ERROR$1;
          break inf_leave;
        case MEM:
          return Z_MEM_ERROR$1;
        case SYNC:
        default:
          return Z_STREAM_ERROR$1;
      }
    }
  strm.next_out = put;
  strm.avail_out = left;
  strm.next_in = next;
  strm.avail_in = have;
  state.hold = hold;
  state.bits = bits;
  if (state.wsize || _out !== strm.avail_out && state.mode < BAD && (state.mode < CHECK || flush !== Z_FINISH$1)) {
    if (updatewindow(strm, strm.output, strm.next_out, _out - strm.avail_out))
      ;
  }
  _in -= strm.avail_in;
  _out -= strm.avail_out;
  strm.total_in += _in;
  strm.total_out += _out;
  state.total += _out;
  if (state.wrap && _out) {
    strm.adler = state.check = state.flags ? crc32(state.check, output, _out, strm.next_out - _out) : adler32(state.check, output, _out, strm.next_out - _out);
  }
  strm.data_type = state.bits + (state.last ? 64 : 0) + (state.mode === TYPE ? 128 : 0) + (state.mode === LEN_ || state.mode === COPY_ ? 256 : 0);
  if ((_in === 0 && _out === 0 || flush === Z_FINISH$1) && ret === Z_OK$1) {
    ret = Z_BUF_ERROR;
  }
  return ret;
};
const inflateEnd = (strm) => {
  if (!strm || !strm.state) {
    return Z_STREAM_ERROR$1;
  }
  let state = strm.state;
  if (state.window) {
    state.window = null;
  }
  strm.state = null;
  return Z_OK$1;
};
const inflateGetHeader = (strm, head) => {
  if (!strm || !strm.state) {
    return Z_STREAM_ERROR$1;
  }
  const state = strm.state;
  if ((state.wrap & 2) === 0) {
    return Z_STREAM_ERROR$1;
  }
  state.head = head;
  head.done = false;
  return Z_OK$1;
};
const inflateSetDictionary = (strm, dictionary) => {
  const dictLength = dictionary.length;
  let state;
  let dictid;
  let ret;
  if (!strm || !strm.state) {
    return Z_STREAM_ERROR$1;
  }
  state = strm.state;
  if (state.wrap !== 0 && state.mode !== DICT) {
    return Z_STREAM_ERROR$1;
  }
  if (state.mode === DICT) {
    dictid = 1;
    dictid = adler32(dictid, dictionary, dictLength, 0);
    if (dictid !== state.check) {
      return Z_DATA_ERROR$1;
    }
  }
  ret = updatewindow(strm, dictionary, dictLength, dictLength);
  if (ret) {
    state.mode = MEM;
    return Z_MEM_ERROR$1;
  }
  state.havedict = 1;
  return Z_OK$1;
};
inflate$3.inflateReset = inflateReset;
inflate$3.inflateReset2 = inflateReset2;
inflate$3.inflateResetKeep = inflateResetKeep;
inflate$3.inflateInit = inflateInit;
inflate$3.inflateInit2 = inflateInit2;
inflate$3.inflate = inflate$2;
inflate$3.inflateEnd = inflateEnd;
inflate$3.inflateGetHeader = inflateGetHeader;
inflate$3.inflateSetDictionary = inflateSetDictionary;
inflate$3.inflateInfo = "pako inflate (from Nodeca project)";
function GZheader$1() {
  this.text = 0;
  this.time = 0;
  this.xflags = 0;
  this.os = 0;
  this.extra = null;
  this.extra_len = 0;
  this.name = "";
  this.comment = "";
  this.hcrc = 0;
  this.done = false;
}
var gzheader = GZheader$1;
const zlib_inflate = inflate$3;
const utils = common;
const strings = strings$2;
const msg = messages;
const ZStream = zstream;
const GZheader = gzheader;
const toString = Object.prototype.toString;
const {
  Z_NO_FLUSH,
  Z_FINISH,
  Z_OK,
  Z_STREAM_END,
  Z_NEED_DICT,
  Z_STREAM_ERROR,
  Z_DATA_ERROR,
  Z_MEM_ERROR
} = constants$1;
function Inflate$1(options) {
  this.options = utils.assign({
    chunkSize: 1024 * 64,
    windowBits: 15,
    to: ""
  }, options || {});
  const opt = this.options;
  if (opt.raw && opt.windowBits >= 0 && opt.windowBits < 16) {
    opt.windowBits = -opt.windowBits;
    if (opt.windowBits === 0) {
      opt.windowBits = -15;
    }
  }
  if (opt.windowBits >= 0 && opt.windowBits < 16 && !(options && options.windowBits)) {
    opt.windowBits += 32;
  }
  if (opt.windowBits > 15 && opt.windowBits < 48) {
    if ((opt.windowBits & 15) === 0) {
      opt.windowBits |= 15;
    }
  }
  this.err = 0;
  this.msg = "";
  this.ended = false;
  this.chunks = [];
  this.strm = new ZStream();
  this.strm.avail_out = 0;
  let status = zlib_inflate.inflateInit2(this.strm, opt.windowBits);
  if (status !== Z_OK) {
    throw new Error(msg[status]);
  }
  this.header = new GZheader();
  zlib_inflate.inflateGetHeader(this.strm, this.header);
  if (opt.dictionary) {
    if (typeof opt.dictionary === "string") {
      opt.dictionary = strings.string2buf(opt.dictionary);
    } else if (toString.call(opt.dictionary) === "[object ArrayBuffer]") {
      opt.dictionary = new Uint8Array(opt.dictionary);
    }
    if (opt.raw) {
      status = zlib_inflate.inflateSetDictionary(this.strm, opt.dictionary);
      if (status !== Z_OK) {
        throw new Error(msg[status]);
      }
    }
  }
}
Inflate$1.prototype.push = function(data, flush_mode) {
  const strm = this.strm;
  const chunkSize = this.options.chunkSize;
  const dictionary = this.options.dictionary;
  let status, _flush_mode, last_avail_out;
  if (this.ended)
    return false;
  if (flush_mode === ~~flush_mode)
    _flush_mode = flush_mode;
  else
    _flush_mode = flush_mode === true ? Z_FINISH : Z_NO_FLUSH;
  if (toString.call(data) === "[object ArrayBuffer]") {
    strm.input = new Uint8Array(data);
  } else {
    strm.input = data;
  }
  strm.next_in = 0;
  strm.avail_in = strm.input.length;
  for (; ; ) {
    if (strm.avail_out === 0) {
      strm.output = new Uint8Array(chunkSize);
      strm.next_out = 0;
      strm.avail_out = chunkSize;
    }
    status = zlib_inflate.inflate(strm, _flush_mode);
    if (status === Z_NEED_DICT && dictionary) {
      status = zlib_inflate.inflateSetDictionary(strm, dictionary);
      if (status === Z_OK) {
        status = zlib_inflate.inflate(strm, _flush_mode);
      } else if (status === Z_DATA_ERROR) {
        status = Z_NEED_DICT;
      }
    }
    while (strm.avail_in > 0 && status === Z_STREAM_END && strm.state.wrap > 0 && data[strm.next_in] !== 0) {
      zlib_inflate.inflateReset(strm);
      status = zlib_inflate.inflate(strm, _flush_mode);
    }
    switch (status) {
      case Z_STREAM_ERROR:
      case Z_DATA_ERROR:
      case Z_NEED_DICT:
      case Z_MEM_ERROR:
        this.onEnd(status);
        this.ended = true;
        return false;
    }
    last_avail_out = strm.avail_out;
    if (strm.next_out) {
      if (strm.avail_out === 0 || status === Z_STREAM_END) {
        if (this.options.to === "string") {
          let next_out_utf8 = strings.utf8border(strm.output, strm.next_out);
          let tail = strm.next_out - next_out_utf8;
          let utf8str = strings.buf2string(strm.output, next_out_utf8);
          strm.next_out = tail;
          strm.avail_out = chunkSize - tail;
          if (tail)
            strm.output.set(strm.output.subarray(next_out_utf8, next_out_utf8 + tail), 0);
          this.onData(utf8str);
        } else {
          this.onData(strm.output.length === strm.next_out ? strm.output : strm.output.subarray(0, strm.next_out));
        }
      }
    }
    if (status === Z_OK && last_avail_out === 0)
      continue;
    if (status === Z_STREAM_END) {
      status = zlib_inflate.inflateEnd(this.strm);
      this.onEnd(status);
      this.ended = true;
      return true;
    }
    if (strm.avail_in === 0)
      break;
  }
  return true;
};
Inflate$1.prototype.onData = function(chunk) {
  this.chunks.push(chunk);
};
Inflate$1.prototype.onEnd = function(status) {
  if (status === Z_OK) {
    if (this.options.to === "string") {
      this.result = this.chunks.join("");
    } else {
      this.result = utils.flattenChunks(this.chunks);
    }
  }
  this.chunks = [];
  this.err = status;
  this.msg = this.strm.msg;
};
function inflate$1(input, options) {
  const inflator = new Inflate$1(options);
  inflator.push(input);
  if (inflator.err)
    throw inflator.msg || msg[inflator.err];
  return inflator.result;
}
function inflateRaw$1(input, options) {
  options = options || {};
  options.raw = true;
  return inflate$1(input, options);
}
inflate$4.Inflate = Inflate$1;
inflate$4.inflate = inflate$1;
inflate$4.inflateRaw = inflateRaw$1;
inflate$4.ungzip = inflate$1;
inflate$4.constants = constants$1;
const { Deflate, deflate, deflateRaw, gzip } = deflate$4;
const { Inflate, inflate, inflateRaw, ungzip } = inflate$4;
const constants = constants$1;
pako.Deflate = Deflate;
pako.deflate = deflate;
pako.deflateRaw = deflateRaw;
pako.gzip = gzip;
pako.Inflate = Inflate;
pako.inflate = inflate;
pako.inflateRaw = inflateRaw;
pako.ungzip = ungzip;
pako.constants = constants;
(function(module) {
  var nifti3 = nifti3 || {};
  nifti3.NIFTI1 = nifti3.NIFTI1 || (typeof commonjsRequire !== "undefined" ? nifti1.exports : null);
  nifti3.NIFTI2 = nifti3.NIFTI2 || (typeof commonjsRequire !== "undefined" ? nifti2.exports : null);
  nifti3.Utils = nifti3.Utils || (typeof commonjsRequire !== "undefined" ? utilities.exports : null);
  var pako$1 = pako$1 || (typeof commonjsRequire !== "undefined" ? pako : null);
  nifti3.isNIFTI1 = function(data) {
    var buf, mag1, mag2, mag3;
    if (data.byteLength < nifti3.NIFTI1.STANDARD_HEADER_SIZE) {
      return false;
    }
    buf = new DataView(data);
    if (buf)
      mag1 = buf.getUint8(nifti3.NIFTI1.MAGIC_NUMBER_LOCATION);
    mag2 = buf.getUint8(nifti3.NIFTI1.MAGIC_NUMBER_LOCATION + 1);
    mag3 = buf.getUint8(nifti3.NIFTI1.MAGIC_NUMBER_LOCATION + 2);
    return !!(mag1 === nifti3.NIFTI1.MAGIC_NUMBER[0] && mag2 === nifti3.NIFTI1.MAGIC_NUMBER[1] && mag3 === nifti3.NIFTI1.MAGIC_NUMBER[2]);
  };
  nifti3.isNIFTI2 = function(data) {
    var buf, mag1, mag2, mag3;
    if (data.byteLength < nifti3.NIFTI1.STANDARD_HEADER_SIZE) {
      return false;
    }
    buf = new DataView(data);
    mag1 = buf.getUint8(nifti3.NIFTI2.MAGIC_NUMBER_LOCATION);
    mag2 = buf.getUint8(nifti3.NIFTI2.MAGIC_NUMBER_LOCATION + 1);
    mag3 = buf.getUint8(nifti3.NIFTI2.MAGIC_NUMBER_LOCATION + 2);
    return !!(mag1 === nifti3.NIFTI2.MAGIC_NUMBER[0] && mag2 === nifti3.NIFTI2.MAGIC_NUMBER[1] && mag3 === nifti3.NIFTI2.MAGIC_NUMBER[2]);
  };
  nifti3.isNIFTI = function(data) {
    return nifti3.isNIFTI1(data) || nifti3.isNIFTI2(data);
  };
  nifti3.isCompressed = function(data) {
    var buf, magicCookie1, magicCookie2;
    if (data) {
      buf = new DataView(data);
      magicCookie1 = buf.getUint8(0);
      magicCookie2 = buf.getUint8(1);
      if (magicCookie1 === nifti3.Utils.GUNZIP_MAGIC_COOKIE1) {
        return true;
      }
      if (magicCookie2 === nifti3.Utils.GUNZIP_MAGIC_COOKIE2) {
        return true;
      }
    }
    return false;
  };
  nifti3.decompress = function(data) {
    return pako$1.inflate(data).buffer;
  };
  nifti3.readHeader = function(data) {
    var header = null;
    if (nifti3.isCompressed(data)) {
      data = nifti3.decompress(data);
    }
    if (nifti3.isNIFTI1(data)) {
      header = new nifti3.NIFTI1();
    } else if (nifti3.isNIFTI2(data)) {
      header = new nifti3.NIFTI2();
    }
    if (header) {
      header.readHeader(data);
    } else {
      console.error("That file does not appear to be NIFTI!");
    }
    return header;
  };
  nifti3.hasExtension = function(header) {
    return header.extensionFlag[0] != 0;
  };
  nifti3.readImage = function(header, data) {
    var imageOffset = header.vox_offset, timeDim = 1, statDim = 1;
    if (header.dims[4]) {
      timeDim = header.dims[4];
    }
    if (header.dims[5]) {
      statDim = header.dims[5];
    }
    var imageSize = header.dims[1] * header.dims[2] * header.dims[3] * timeDim * statDim * (header.numBitsPerVoxel / 8);
    return data.slice(imageOffset, imageOffset + imageSize);
  };
  nifti3.readExtension = function(header, data) {
    var loc = header.getExtensionLocation(), size = header.extensionSize;
    return data.slice(loc, loc + size);
  };
  nifti3.readExtensionData = function(header, data) {
    var loc = header.getExtensionLocation(), size = header.extensionSize;
    return data.slice(loc + 8, loc + size - 8);
  };
  if (module.exports) {
    module.exports = nifti3;
  }
})(nifti);
var getRandomValues;
var rnds8 = new Uint8Array(16);
function rng() {
  if (!getRandomValues) {
    getRandomValues = typeof crypto !== "undefined" && crypto.getRandomValues && crypto.getRandomValues.bind(crypto) || typeof msCrypto !== "undefined" && typeof msCrypto.getRandomValues === "function" && msCrypto.getRandomValues.bind(msCrypto);
    if (!getRandomValues) {
      throw new Error("crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported");
    }
  }
  return getRandomValues(rnds8);
}
var REGEX = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000)$/i;
function validate(uuid) {
  return typeof uuid === "string" && REGEX.test(uuid);
}
var byteToHex = [];
for (var i = 0; i < 256; ++i) {
  byteToHex.push((i + 256).toString(16).substr(1));
}
function stringify(arr) {
  var offset = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 0;
  var uuid = (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + "-" + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + "-" + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + "-" + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + "-" + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase();
  if (!validate(uuid)) {
    throw TypeError("Stringified UUID is invalid");
  }
  return uuid;
}
function v4(options, buf, offset) {
  options = options || {};
  var rnds = options.random || (options.rng || rng)();
  rnds[6] = rnds[6] & 15 | 64;
  rnds[8] = rnds[8] & 63 | 128;
  if (buf) {
    offset = offset || 0;
    for (var i = 0; i < 16; ++i) {
      buf[offset + i] = rnds[i];
    }
    return buf;
  }
  return stringify(rnds);
}
var NVImage = function(dataBuffer, name = "", colorMap = "gray", opacity = 1, trustCalMinMax = true, percentileFrac = 0.02, ignoreZeroVoxels = false, visible = true) {
  this.DT_NONE = 0;
  this.DT_UNKNOWN = 0;
  this.DT_BINARY = 1;
  this.DT_UNSIGNED_CHAR = 2;
  this.DT_SIGNED_SHORT = 4;
  this.DT_SIGNED_INT = 8;
  this.DT_FLOAT = 16;
  this.DT_COMPLEX = 32;
  this.DT_DOUBLE = 64;
  this.DT_RGB = 128;
  this.DT_ALL = 255;
  this.DT_INT8 = 256;
  this.DT_UINT16 = 512;
  this.DT_UINT32 = 768;
  this.DT_INT64 = 1024;
  this.DT_UINT64 = 1280;
  this.DT_FLOAT128 = 1536;
  this.DT_COMPLEX128 = 1792;
  this.DT_COMPLEX256 = 2048;
  this.DT_RGBA32 = 2304;
  this.name = name;
  this.id = v4();
  this.colorMap = colorMap;
  this.opacity = opacity > 1 ? 1 : opacity;
  this.percentileFrac = percentileFrac;
  this.ignoreZeroVoxels = ignoreZeroVoxels;
  this.trustCalMinMax = trustCalMinMax;
  this.visible = visible;
  if (!dataBuffer) {
    return;
  }
  this.hdr = nifti.exports.readHeader(dataBuffer);
  if (isNaN(this.hdr.scl_slope) || this.hdr.scl_slope === 0)
    this.hdr.scl_slope = 1;
  if (isNaN(this.hdr.scl_inter))
    this.hdr.scl_inter = 0;
  if (this.hdr.qform_code > this.hdr.sform_code) {
    console.log("resorting to QForm::", this.hdr);
    const b = this.hdr.quatern_b;
    const c = this.hdr.quatern_c;
    const d = this.hdr.quatern_d;
    const a = Math.sqrt(1 - (Math.pow(b, 2) + Math.pow(c, 2) + Math.pow(d, 2)));
    const qfac = this.hdr.pixDims[0] === 0 ? 1 : this.hdr.pixDims[0];
    const quatern_R = [
      [
        a * a + b * b - c * c - d * d,
        2 * b * c - 2 * a * d,
        2 * b * d + 2 * a * c
      ],
      [
        2 * b * c + 2 * a * d,
        a * a + c * c - b * b - d * d,
        2 * c * d - 2 * a * b
      ],
      [
        2 * b * d - 2 * a * c,
        2 * c * d + 2 * a * b,
        a * a + d * d - c * c - b * b
      ]
    ];
    const affine = this.hdr.affine;
    for (let ctrOut = 0; ctrOut < 3; ctrOut += 1) {
      for (let ctrIn = 0; ctrIn < 3; ctrIn += 1) {
        affine[ctrOut][ctrIn] = quatern_R[ctrOut][ctrIn] * this.hdr.pixDims[ctrIn + 1];
        if (ctrIn === 2) {
          affine[ctrOut][ctrIn] *= qfac;
        }
      }
    }
    affine[0][3] = this.hdr.qoffset_x;
    affine[1][3] = this.hdr.qoffset_y;
    affine[2][3] = this.hdr.qoffset_z;
    this.hdr.affine = affine;
  }
  let imgRaw = null;
  if (nifti.exports.isCompressed(dataBuffer)) {
    imgRaw = nifti.exports.readImage(this.hdr, nifti.exports.decompress(dataBuffer));
  } else {
    imgRaw = nifti.exports.readImage(this.hdr, dataBuffer);
  }
  switch (this.hdr.datatypeCode) {
    case this.DT_UNSIGNED_CHAR:
      this.img = new Uint8Array(imgRaw);
      break;
    case this.DT_SIGNED_SHORT:
      this.img = new Int16Array(imgRaw);
      break;
    case this.DT_FLOAT:
      this.img = new Float32Array(imgRaw);
      break;
    case this.DT_DOUBLE:
      this.img = new Float64Array(imgRaw);
      break;
    case this.DT_RGB:
      this.img = new Uint8Array(imgRaw);
      break;
    case this.DT_UINT16:
      this.img = new Uint16Array(imgRaw);
      break;
    case this.DT_RGBA32:
      this.img = new Uint8Array(imgRaw);
      break;
    case this.DT_INT8:
      let i8 = new Int8Array(imgRaw);
      var vx8 = i8.length;
      this.img = new Int16Array(vx8);
      for (var i = 0; i < vx8 - 1; i++)
        this.img[i] = i8[i];
      this.hdr.datatypeCode = this.DT_SIGNED_SHORT;
      break;
    case this.DT_UINT32:
      let u32 = new Uint32Array(imgRaw);
      var vx32 = u32.length;
      this.img = new Float64Array(vx32);
      for (var i = 0; i < vx32 - 1; i++)
        this.img[i] = u32[i];
      this.hdr.datatypeCode = this.DT_DOUBLE;
      break;
    case this.DT_SIGNED_INT:
      let i32 = new Int32Array(imgRaw);
      var vxi32 = i32.length;
      this.img = new Float64Array(vxi32);
      for (var i = 0; i < vxi32 - 1; i++)
        this.img[i] = i32[i];
      this.hdr.datatypeCode = this.DT_DOUBLE;
      break;
    case this.DT_INT64:
      let i64 = new BigInt64Array(imgRaw);
      let vx = i64.length;
      this.img = new Float64Array(vx);
      for (var i = 0; i < vx - 1; i++)
        this.img[i] = Number(i64[i]);
      this.hdr.datatypeCode = this.DT_DOUBLE;
      break;
    default:
      throw "datatype " + this.hdr.datatypeCode + " not supported";
  }
  this.calculateRAS();
  this.calMinMax();
};
NVImage.prototype.calculateRAS = function() {
  let a = this.hdr.affine;
  let header = this.hdr;
  let absR = fromValues$3(Math.abs(a[0][0]), Math.abs(a[0][1]), Math.abs(a[0][2]), Math.abs(a[1][0]), Math.abs(a[1][1]), Math.abs(a[1][2]), Math.abs(a[2][0]), Math.abs(a[2][1]), Math.abs(a[2][2]));
  let ixyz = [1, 1, 1];
  if (absR[3] > absR[0]) {
    ixyz[0] = 2;
  }
  if (absR[6] > absR[0] && absR[6] > absR[3]) {
    ixyz[0] = 3;
  }
  ixyz[1] = 1;
  if (ixyz[0] === 1) {
    if (absR[4] > absR[7]) {
      ixyz[1] = 2;
    } else {
      ixyz[1] = 3;
    }
  } else if (ixyz[0] === 2) {
    if (absR[1] > absR[7]) {
      ixyz[1] = 1;
    } else {
      ixyz[1] = 3;
    }
  } else {
    if (absR[1] > absR[4]) {
      ixyz[1] = 1;
    } else {
      ixyz[1] = 2;
    }
  }
  ixyz[2] = 6 - ixyz[1] - ixyz[0];
  let perm = [1, 2, 3];
  perm[ixyz[0] - 1] = 1;
  perm[ixyz[1] - 1] = 2;
  perm[ixyz[2] - 1] = 3;
  let rotM = fromValues$2(a[0][0], a[0][1], a[0][2], a[0][3], a[1][0], a[1][1], a[1][2], a[1][3], a[2][0], a[2][1], a[2][2], a[2][3], 0, 0, 0, 1);
  this.mm000 = this.vox2mm([-0.5, -0.5, -0.5], rotM);
  this.mm100 = this.vox2mm([header.dims[1] - 0.5, -0.5, -0.5], rotM);
  this.mm010 = this.vox2mm([-0.5, header.dims[2] - 0.5, -0.5], rotM);
  this.mm001 = this.vox2mm([-0.5, -0.5, header.dims[3] - 0.5], rotM);
  let R2 = create$2();
  copy(R2, rotM);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      R2[i * 4 + j] = rotM[i * 4 + perm[j] - 1];
    }
  }
  let flip = [0, 0, 0];
  if (R2[0] < 0) {
    flip[0] = 1;
  }
  if (R2[5] < 0) {
    flip[1] = 1;
  }
  if (R2[10] < 0) {
    flip[2] = 1;
  }
  this.dimsRAS = [
    header.dims[0],
    header.dims[perm[0]],
    header.dims[perm[1]],
    header.dims[perm[2]]
  ];
  this.pixDimsRAS = [
    header.pixDims[0],
    header.pixDims[perm[0]],
    header.pixDims[perm[1]],
    header.pixDims[perm[2]]
  ];
  if (this.arrayEquals(perm, [1, 2, 3]) && this.arrayEquals(flip, [0, 0, 0])) {
    this.toRAS = create$2();
    this.matRAS = clone(rotM);
    return;
  }
  identity$1(rotM);
  rotM[0 + 0 * 4] = 1 - flip[0] * 2;
  rotM[1 + 1 * 4] = 1 - flip[1] * 2;
  rotM[2 + 2 * 4] = 1 - flip[2] * 2;
  rotM[3 + 0 * 4] = (header.dims[perm[0]] - 1) * flip[0];
  rotM[3 + 1 * 4] = (header.dims[perm[1]] - 1) * flip[1];
  rotM[3 + 2 * 4] = (header.dims[perm[2]] - 1) * flip[2];
  let residualR = create$2();
  invert(residualR, rotM);
  multiply$1(residualR, residualR, R2);
  this.matRAS = clone(residualR);
  rotM = fromValues$2(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1);
  rotM[perm[0] - 1 + 0 * 4] = -flip[0] * 2 + 1;
  rotM[perm[1] - 1 + 1 * 4] = -flip[1] * 2 + 1;
  rotM[perm[2] - 1 + 2 * 4] = -flip[2] * 2 + 1;
  rotM[3 + 0 * 4] = flip[0];
  rotM[3 + 1 * 4] = flip[1];
  rotM[3 + 2 * 4] = flip[2];
  this.toRAS = clone(rotM);
  console.log(this.hdr.dims);
  console.log(this.dimsRAS);
};
NVImage.prototype.vox2mm = function(XYZ, mtx) {
  let sform = clone(mtx);
  transpose(sform, sform);
  let pos = fromValues(XYZ[0], XYZ[1], XYZ[2], 1);
  transformMat4(pos, pos, sform);
  let pos3 = fromValues$1(pos[0], pos[1], pos[2]);
  return pos3;
};
NVImage.prototype.mm2vox = function(mm) {
  let sform = fromValues$2(...this.hdr.affine.flat());
  let out = clone(sform);
  transpose(out, sform);
  invert(out, out);
  let pos = fromValues(mm[0], mm[1], mm[2], 1);
  transformMat4(pos, pos, out);
  let pos3 = fromValues$1(pos[0], pos[1], pos[2]);
  return [Math.round(pos3[0]), Math.round(pos3[1]), Math.round(pos3[2])];
};
NVImage.prototype.arrayEquals = function(a, b) {
  return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((val, index) => val === b[index]);
};
NVImage.prototype.colorMaps = function(sort = true) {
  let cm = [];
  for (const [key] of Object.entries(cmaps)) {
    cm.push(key);
  }
  return sort === true ? cm.sort() : cm;
};
NVImage.prototype.calMinMax = function() {
  if (this.trustCalMinMax && isFinite(this.hdr.cal_min) && isFinite(this.hdr.cal_max) && this.hdr.cal_max > this.hdr.cal_min) {
    this.cal_min = this.hdr.cal_min;
    this.cal_max = this.hdr.cal_max;
    this.global_min = this.hdr.cal_min;
    this.global_max = this.hdr.cal_max;
    return [
      this.hdr.cal_min,
      this.hdr.cal_max,
      this.hdr.cal_min,
      this.hdr.cal_max
    ];
  }
  let cm = this.colorMap;
  let allColorMaps = this.colorMaps();
  let cmMin = 0;
  let cmMax = 0;
  if (allColorMaps.indexOf(cm.toLowerCase()) != -1) {
    cmMin = cmaps[cm.toLowerCase()].min;
    cmMax = cmaps[cm.toLowerCase()].max;
  }
  if (cmMin != cmMax) {
    this.cal_min = cmMin;
    this.cal_max = cmMax;
    return [cmMin, cmMax, cmMin, cmMax];
  }
  let mn = this.img[0];
  let mx = this.img[0];
  let nZero = 0;
  let nNan = 0;
  let nVox = this.img.length;
  for (let i = 0; i < nVox; i++) {
    if (isNaN(this.img[i])) {
      nNan++;
      continue;
    }
    if (this.img[i] === 0) {
      nZero++;
      if (this.ignoreZeroVoxels) {
        continue;
      }
    }
    mn = Math.min(this.img[i], mn);
    mx = Math.max(this.img[i], mx);
  }
  var mnScale = this.intensityRaw2Scaled(this.hdr, mn);
  var mxScale = this.intensityRaw2Scaled(this.hdr, mx);
  if (!this.ignoreZeroVoxels)
    nZero = 0;
  nZero += nNan;
  let n2pct = Math.round((nVox - nZero) * this.percentileFrac);
  if (n2pct < 1 || mn === mx) {
    console.log("no variability in image intensity?");
    this.cal_min = mnScale;
    this.cal_max = mxScale;
    this.global_min = mnScale;
    this.global_max = mxScale;
    return [mnScale, mxScale, mnScale, mxScale];
  }
  let nBins = 1001;
  let scl = (nBins - 1) / (mx - mn);
  let hist = new Array(nBins);
  for (let i = 0; i < nBins; i++) {
    hist[i] = 0;
  }
  if (this.ignoreZeroVoxels) {
    for (let i = 0; i <= nVox; i++) {
      if (this.img[i] === 0)
        continue;
      if (isNaN(this.img[i]))
        continue;
      hist[Math.round((this.img[i] - mn) * scl)]++;
    }
  } else {
    for (let i = 0; i <= nVox; i++) {
      if (isNaN(this.img[i])) {
        continue;
      }
      hist[Math.round((this.img[i] - mn) * scl)]++;
    }
  }
  let n = 0;
  let lo = 0;
  while (n < n2pct) {
    n += hist[lo];
    lo++;
  }
  lo--;
  n = 0;
  let hi = nBins;
  while (n < n2pct) {
    hi--;
    n += hist[hi];
  }
  if (lo == hi) {
    let ok = -1;
    while (ok !== 0) {
      if (lo > 0) {
        lo--;
        if (hist[lo] > 0)
          ok = 0;
      }
      if (ok != 0 && hi < nBins - 1) {
        hi++;
        if (hist[hi] > 0)
          ok = 0;
      }
      if (lo == 0 && hi == nBins - 1)
        ok = 0;
    }
  }
  var pct2 = this.intensityRaw2Scaled(this.hdr, lo / scl + mn);
  var pct98 = this.intensityRaw2Scaled(this.hdr, hi / scl + mn);
  if (this.hdr.cal_min < this.hdr.cal_max && this.hdr.cal_min >= mnScale && this.hdr.cal_max <= mxScale) {
    pct2 = this.hdr.cal_min;
    pct98 = this.hdr.cal_max;
  }
  this.cal_min = pct2;
  this.cal_max = pct98;
  this.global_min = mnScale;
  this.global_max = mxScale;
  return [pct2, pct98, mnScale, mxScale];
};
NVImage.prototype.intensityRaw2Scaled = function(hdr, raw) {
  if (hdr.scl_slope === 0)
    hdr.scl_slope = 1;
  return raw * hdr.scl_slope + hdr.scl_inter;
};
NVImage.loadFromUrl = async function(url, name = "", colorMap = "gray", opacity = 1, trustCalMinMax = true, percentileFrac = 0.02, ignoreZeroVoxels = false, visible = true) {
  let response = await fetch(url);
  let nvimage = null;
  if (!response.ok) {
    throw Error(response.statusText);
  }
  let urlParts = url.split("/");
  name = urlParts.slice(-1)[0];
  let dataBuffer = await response.arrayBuffer();
  if (dataBuffer) {
    nvimage = new NVImage(dataBuffer, name, colorMap, opacity, trustCalMinMax, percentileFrac, ignoreZeroVoxels, visible);
  } else {
    alert("Unable to load buffer properly from volume");
  }
  return nvimage;
};
NVImage.readFileAsync = function(file) {
  return new Promise((resolve, reject) => {
    let reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result);
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};
NVImage.loadFromFile = async function(file, name = "", colorMap = "gray", opacity = 1, trustCalMinMax = true, percentileFrac = 0.02, ignoreZeroVoxels = false, visible = true) {
  let nvimage = null;
  try {
    let dataBuffer = await this.readFileAsync(file);
    nvimage = new NVImage(dataBuffer, name, colorMap, opacity, trustCalMinMax, percentileFrac, ignoreZeroVoxels, visible);
  } catch (err2) {
    console.log(err2);
  }
  return nvimage;
};
NVImage.prototype.clone = function() {
  let clonedImage = new NVImage();
  clonedImage.id = this.id;
  clonedImage.hdr = Object.assign({}, this.hdr);
  clonedImage.img = this.img.slice();
  clonedImage.calculateRAS();
  clonedImage.calMinMax();
  return clonedImage;
};
NVImage.prototype.zeroImage = function() {
  this.img.fill(0);
};
NVImage.prototype.getImageMetadata = function() {
  const id = this.id;
  const datatypeCode = this.hdr.datatypeCode;
  const dims = this.hdr.dims;
  const nx = dims[1];
  const ny = dims[2];
  const nz = dims[3];
  const nt = Math.max(1, dims[4]);
  const pixDims = this.hdr.pixDims;
  const dx = pixDims[1];
  const dy = pixDims[2];
  const dz = pixDims[3];
  const dt = pixDims[4];
  const bpv = Math.floor(this.hdr.numBitsPerVoxel / 8);
  return {
    id,
    datatypeCode,
    nx,
    ny,
    nz,
    nt,
    dx,
    dy,
    dz,
    dt,
    bpv
  };
};
NVImage.zerosLike = function(nvImage) {
  let zeroClone = nvImage.clone();
  zeroClone.zeroImage();
  return zeroClone;
};
String.prototype.getBytes = function() {
  let bytes = [];
  for (var i = 0; i < this.length; i++) {
    bytes.push(this.charCodeAt(i));
  }
  return bytes;
};
NVImage.prototype.getValue = function(x, y, z) {
  const { nx, ny } = this.getImageMetadata();
  if (this.hdr.datatypeCode === this.DT_RGBA32) {
    let vx = 4 * (x + y * nx + z * nx * ny);
    return Math.round(this.img[vx] * 0.21 + this.img[vx + 1] * 0.72 + this.img[vx + 2] * 0.07);
  }
  if (this.hdr.datatypeCode === this.DT_RGB) {
    let vx = 3 * (x + y * nx + z * nx * ny);
    return Math.round(this.img[vx] * 0.21 + this.img[vx + 1] * 0.72 + this.img[vx + 2] * 0.07);
  }
  return this.img[x + y * nx + z * nx * ny];
};
function getExtents(positions) {
  const min2 = positions.slice(0, 3);
  const max2 = positions.slice(0, 3);
  let mxDx = 0;
  for (let i = 3; i < positions.length; i += 3) {
    for (let j = 0; j < 3; ++j) {
      const v = positions[i + j];
      min2[j] = Math.min(v, min2[j]);
      max2[j] = Math.max(v, max2[j]);
    }
    let dx = positions[i] * positions[i] + positions[i + 1] * positions[i + 1] + positions[i + 2] * positions[i + 2];
    mxDx = Math.max(mxDx, dx);
  }
  let furthestVertexFromOrigin = Math.sqrt(mxDx);
  return { min: min2, max: max2, furthestVertexFromOrigin };
}
NVImage.prototype.method1 = function() {
  return {
    left: -(this.dimsRAS[1] / 2) * this.pixDimsRAS[1],
    right: this.dimsRAS[1] / 2 * this.pixDimsRAS[1],
    posterior: -(this.dimsRAS[2] / 2) * this.pixDimsRAS[2],
    anterior: this.dimsRAS[2] / 2 * this.pixDimsRAS[2],
    inferior: -(this.dimsRAS[3] / 2) * this.pixDimsRAS[3],
    superior: this.dimsRAS[3] / 2 * this.pixDimsRAS[3]
  };
};
NVImage.prototype.method2 = function() {
  const affine = [];
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      affine.push(this.hdr.affine[i][j]);
    }
  }
  const affineMatrix = fromValues$2(...affine);
  const qfac = this.hdr.dims[0] ? this.hdr.pixDims[0] : 1;
  let rightTopFront = fromValues(this.hdr.dims[1] * this.hdr.pixDims[1], this.hdr.dims[2] * this.hdr.pixDims[2], qfac * this.hdr.dims[3] * this.hdr.pixDims[3], 1);
  let maxExtent = create();
  transformMat4(maxExtent, rightTopFront, affineMatrix);
  return {
    left: maxExtent[0] / 2,
    right: 0 - maxExtent[0] / 2,
    posterior: 0 - maxExtent[1] / 2,
    anterior: maxExtent[1] / 2,
    inferior: 0 - maxExtent[2] / 2,
    superior: maxExtent[2] / 2
  };
};
NVImage.prototype.method3 = function() {
};
NVImage.prototype.toNiivueObject3D = function(id, gl) {
  let cuboid = this.method1();
  let left = cuboid.left;
  let right = cuboid.right;
  let posterior = cuboid.posterior;
  let anterior = cuboid.anterior;
  let inferior = cuboid.inferior;
  let superior = cuboid.superior;
  const positions = [
    left,
    posterior,
    superior,
    right,
    posterior,
    superior,
    right,
    anterior,
    superior,
    left,
    anterior,
    superior,
    left,
    posterior,
    inferior,
    left,
    anterior,
    inferior,
    right,
    anterior,
    inferior,
    right,
    posterior,
    inferior,
    left,
    anterior,
    inferior,
    left,
    anterior,
    superior,
    right,
    anterior,
    superior,
    right,
    anterior,
    inferior,
    left,
    posterior,
    inferior,
    right,
    posterior,
    inferior,
    right,
    posterior,
    superior,
    left,
    posterior,
    superior,
    right,
    posterior,
    inferior,
    right,
    anterior,
    inferior,
    right,
    anterior,
    superior,
    right,
    posterior,
    superior,
    left,
    posterior,
    inferior,
    left,
    posterior,
    superior,
    left,
    anterior,
    superior,
    left,
    anterior,
    inferior
  ];
  const textureCoordinates = [
    0,
    0,
    1,
    1,
    0,
    1,
    1,
    1,
    1,
    0,
    1,
    1,
    0,
    0,
    0,
    0,
    1,
    0,
    1,
    1,
    0,
    1,
    0,
    0,
    0,
    1,
    0,
    0,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    0,
    0,
    0,
    0,
    1,
    0,
    0,
    1,
    0,
    1,
    0,
    0,
    1,
    1,
    0,
    0,
    1,
    1,
    0,
    1,
    1,
    1,
    1,
    0,
    1,
    0,
    0,
    0,
    0,
    0,
    1,
    0,
    1,
    1,
    0,
    1,
    0
  ];
  const vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
  const indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  const indices = [
    0,
    3,
    2,
    2,
    1,
    0,
    4,
    7,
    6,
    6,
    5,
    4,
    8,
    11,
    10,
    10,
    9,
    8,
    12,
    15,
    14,
    14,
    13,
    12,
    16,
    19,
    18,
    18,
    17,
    16,
    20,
    23,
    22,
    22,
    21,
    20
  ];
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
  const textureCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates), gl.STATIC_DRAW);
  const obj3D = new NiivueObject3D(id, vertexBuffer, gl.TRIANGLES, indices.length, indexBuffer, textureCoordBuffer);
  const extents = getExtents(positions);
  obj3D.extentsMin = extents.min;
  obj3D.extentsMax = extents.max;
  obj3D.furthestVertexFromOrigin = extents.furthestVertexFromOrigin;
  return obj3D;
};
const Log = function(logLevel) {
  this.LOGGING_ON = true;
  this.LOGGING_OFF = false;
  this.LOG_PREFIX = "NiiVue:";
  this.logLevel = logLevel;
};
Log.prototype.getTimeStamp = function() {
  return `${this.LOG_PREFIX} `;
};
Log.prototype.debug = function() {
  if (this.logLevel === this.LOGGING_ON) {
    console.log(this.getTimeStamp(), "DEBUG", ...arguments);
  }
};
Log.prototype.info = function() {
  if (this.logLevel === this.LOGGING_ON) {
    console.log(this.getTimeStamp(), "INFO", ...arguments);
  }
};
Log.prototype.warn = function() {
  if (this.logLevel === this.LOGGING_ON) {
    console.warn(this.getTimeStamp(), "WARN", ...arguments);
  }
};
Log.prototype.error = function() {
  if (this.logLevel === this.LOGGING_ON) {
    console.error(this.getTimeStamp(), "ERROR", ...arguments);
  }
};
Log.prototype.setLogLevel = function(logLevel) {
  this.logLevel = logLevel;
};
var defaultFontPNG = "data:image/png;base64,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";
const atlas = {
  type: "msdf",
  distanceRange: 2,
  size: 59.65625,
  width: 512,
  height: 256,
  yOrigin: "bottom"
};
const metrics = {
  emSize: 1,
  lineHeight: 1.171875,
  ascender: 0.927734375,
  descender: -0.244140625,
  underlineY: -0.09765625,
  underlineThickness: 0.048828125
};
const glyphs = [
  {
    unicode: 32,
    advance: 0.24755859375
  },
  {
    unicode: 33,
    advance: 0.25732421875,
    planeBounds: {
      left: 0.056159633438645884,
      bottom: -0.02437761405677056,
      right: 0.20702396031135412,
      top: 0.7299440203067705
    },
    atlasBounds: {
      left: 488.5,
      bottom: 145.5,
      right: 497.5,
      top: 190.5
    }
  },
  {
    unicode: 34,
    advance: 0.31982421875,
    planeBounds: {
      left: 0.049409125974004715,
      bottom: 0.48691155587022,
      right: 0.2840869677759953,
      top: 0.77187750662978
    },
    atlasBounds: {
      left: 486.5,
      bottom: 213.5,
      right: 500.5,
      top: 230.5
    }
  },
  {
    unicode: 35,
    advance: 0.61572265625,
    planeBounds: {
      left: 0.037219103997511785,
      bottom: -0.02169206718177056,
      right: 0.6239137085024882,
      top: 0.7326295671817705
    },
    atlasBounds: {
      left: 66.5,
      bottom: 51.5,
      right: 101.5,
      top: 96.5
    }
  },
  {
    unicode: 36,
    advance: 0.5615234375,
    planeBounds: {
      left: 0.02956531458715296,
      bottom: -0.12381369908983761,
      right: 0.5324464041628472,
      top: 0.8484230740898377
    },
    atlasBounds: {
      left: 109.5,
      bottom: 197.5,
      right: 139.5,
      top: 255.5
    }
  },
  {
    unicode: 37,
    advance: 0.732421875,
    planeBounds: {
      left: 0.026481776289942378,
      bottom: -0.030073418674698794,
      right: 0.7137525987100576,
      top: 0.7410109186746989
    },
    atlasBounds: {
      left: 88.5,
      bottom: 144.5,
      right: 129.5,
      top: 190.5
    }
  },
  {
    unicode: 38,
    advance: 0.62158203125,
    planeBounds: {
      left: 0.03225572125458355,
      bottom: -0.030073418674698794,
      right: 0.6357130287454166,
      top: 0.7410109186746989
    },
    atlasBounds: {
      left: 130.5,
      bottom: 144.5,
      right: 166.5,
      top: 190.5
    }
  },
  {
    unicode: 39,
    advance: 0.17431640625,
    planeBounds: {
      left: 0.028244602049502358,
      bottom: 0.49895501673814824,
      right: 0.14558352295049765,
      top: 0.7671582645118518
    },
    atlasBounds: {
      left: 498.5,
      bottom: 62.5,
      right: 505.5,
      top: 78.5
    }
  },
  {
    unicode: 40,
    advance: 0.341796875,
    planeBounds: {
      left: 0.042983329377291775,
      bottom: -0.250029542422407,
      right: 0.34471198312270823,
      top: 0.8227834486724072
    },
    atlasBounds: {
      left: 0.5,
      bottom: 191.5,
      right: 18.5,
      top: 255.5
    }
  },
  {
    unicode: 41,
    advance: 0.34765625,
    planeBounds: {
      left: -0.003159248747708225,
      bottom: -0.250029542422407,
      right: 0.29856940499770823,
      top: 0.8227834486724072
    },
    atlasBounds: {
      left: 19.5,
      bottom: 191.5,
      right: 37.5,
      top: 255.5
    }
  },
  {
    unicode: 42,
    advance: 0.4306640625,
    planeBounds: {
      left: -0.011208599684062338,
      bottom: 0.27785390031593765,
      right: 0.44138438093406235,
      top: 0.7304468809340623
    },
    atlasBounds: {
      left: 449.5,
      bottom: 23.5,
      right: 476.5,
      top: 50.5
    }
  },
  {
    unicode: 43,
    advance: 0.56689453125,
    planeBounds: {
      left: 0.01353503347629649,
      bottom: 0.053493525733368255,
      right: 0.5499415290237036,
      top: 0.6066627242666317
    },
    atlasBounds: {
      left: 361.5,
      bottom: 17.5,
      right: 393.5,
      top: 50.5
    }
  },
  {
    unicode: 44,
    advance: 0.1962890625,
    planeBounds: {
      left: -0.009919475797210583,
      bottom: -0.15981695975478,
      right: 0.1744702570472106,
      top: 0.12514899100478
    },
    atlasBounds: {
      left: 498.5,
      bottom: 79.5,
      right: 509.5,
      top: 96.5
    }
  },
  {
    unicode: 45,
    advance: 0.27587890625,
    planeBounds: {
      left: -0.00527594412977999,
      bottom: 0.24333249267450235,
      right: 0.27969000662978,
      top: 0.36067141357549765
    },
    atlasBounds: {
      left: 52.5,
      bottom: 7.5,
      right: 69.5,
      top: 14.5
    }
  },
  {
    unicode: 46,
    advance: 0.26318359375,
    planeBounds: {
      left: 0.051032680313645884,
      bottom: -0.027092319686354116,
      right: 0.20189700718635412,
      top: 0.12377200718635412
    },
    atlasBounds: {
      left: 501.5,
      bottom: 221.5,
      right: 510.5,
      top: 230.5
    }
  },
  {
    unicode: 47,
    advance: 0.412109375,
    planeBounds: {
      left: -0.013733006073205867,
      bottom: -0.08573505127848349,
      right: 0.4053345685732059,
      top: 0.7356373950284835
    },
    atlasBounds: {
      left: 252.5,
      bottom: 206.5,
      right: 277.5,
      top: 255.5
    }
  },
  {
    unicode: 48,
    advance: 0.5615234375,
    planeBounds: {
      left: 0.037458384830081196,
      bottom: -0.030073418674698794,
      right: 0.5235767714199189,
      top: 0.7410109186746989
    },
    atlasBounds: {
      left: 167.5,
      bottom: 144.5,
      right: 196.5,
      top: 190.5
    }
  },
  {
    unicode: 49,
    advance: 0.5615234375,
    planeBounds: {
      left: 0.06023674350936354,
      bottom: -0.01998308280677056,
      right: 0.37872810024063647,
      top: 0.7343385515567705
    },
    atlasBounds: {
      left: 488.5,
      bottom: 97.5,
      right: 507.5,
      top: 142.5
    }
  },
  {
    unicode: 50,
    advance: 0.5615234375,
    planeBounds: {
      left: 0.025334353719224725,
      bottom: -0.01680925468177056,
      right: 0.5449781462807752,
      top: 0.7375123796817705
    },
    atlasBounds: {
      left: 278.5,
      bottom: 51.5,
      right: 309.5,
      top: 96.5
    }
  },
  {
    unicode: 51,
    advance: 0.5615234375,
    planeBounds: {
      left: 0.028181041080081196,
      bottom: -0.030073418674698794,
      right: 0.5142994276699189,
      top: 0.7410109186746989
    },
    atlasBounds: {
      left: 197.5,
      bottom: 144.5,
      right: 226.5,
      top: 190.5
    }
  },
  {
    unicode: 52,
    advance: 0.5615234375,
    planeBounds: {
      left: 0.005886103858368255,
      bottom: -0.02169206718177056,
      right: 0.5590553023916317,
      top: 0.7326295671817705
    },
    atlasBounds: {
      left: 310.5,
      bottom: 51.5,
      right: 343.5,
      top: 96.5
    }
  },
  {
    unicode: 53,
    advance: 0.5615234375,
    planeBounds: {
      left: 0.055524791080081196,
      bottom: -0.02657487968177056,
      right: 0.5416431776699189,
      top: 0.7277467546817705
    },
    atlasBounds: {
      left: 344.5,
      bottom: 51.5,
      right: 373.5,
      top: 96.5
    }
  },
  {
    unicode: 54,
    advance: 0.5615234375,
    planeBounds: {
      left: 0.046003306705081196,
      bottom: -0.034712090549698794,
      right: 0.5321216932949189,
      top: 0.7363722467996989
    },
    atlasBounds: {
      left: 227.5,
      bottom: 144.5,
      right: 256.5,
      top: 190.5
    }
  },
  {
    unicode: 55,
    advance: 0.5615234375,
    planeBounds: {
      left: 0.018010134969224725,
      bottom: -0.02169206718177056,
      right: 0.5376539275307752,
      top: 0.7326295671817705
    },
    atlasBounds: {
      left: 374.5,
      bottom: 51.5,
      right: 405.5,
      top: 96.5
    }
  },
  {
    unicode: 56,
    advance: 0.5615234375,
    planeBounds: {
      left: 0.037702525455081196,
      bottom: -0.030073418674698794,
      right: 0.5238209120449189,
      top: 0.7410109186746989
    },
    atlasBounds: {
      left: 257.5,
      bottom: 144.5,
      right: 286.5,
      top: 190.5
    }
  },
  {
    unicode: 57,
    advance: 0.5615234375,
    planeBounds: {
      left: 0.029401744205081196,
      bottom: -0.025434746799698794,
      right: 0.5155201307949189,
      top: 0.7456495905496989
    },
    atlasBounds: {
      left: 287.5,
      bottom: 144.5,
      right: 316.5,
      top: 190.5
    }
  },
  {
    unicode: 58,
    advance: 0.2421875,
    planeBounds: {
      left: 0.046394008438645884,
      bottom: -0.029431286627488215,
      right: 0.19725833531135412,
      top: 0.5572633178774882
    },
    atlasBounds: {
      left: 439.5,
      bottom: 61.5,
      right: 448.5,
      top: 96.5
    }
  },
  {
    unicode: 59,
    advance: 0.21142578125,
    planeBounds: {
      left: 0.001066852327789419,
      bottom: -0.16459733294591408,
      right: 0.1854565851722106,
      top: 0.556198895445914
    },
    atlasBounds: {
      left: 406.5,
      bottom: 53.5,
      right: 417.5,
      top: 96.5
    }
  },
  {
    unicode: 60,
    advance: 0.50830078125,
    planeBounds: {
      left: 0.016948142433865897,
      bottom: 0.0726146348300812,
      right: 0.4527784200661341,
      top: 0.5587330214199189
    },
    atlasBounds: {
      left: 394.5,
      bottom: 21.5,
      right: 420.5,
      top: 50.5
    }
  },
  {
    unicode: 61,
    advance: 0.548828125,
    planeBounds: {
      left: 0.051535540940937666,
      bottom: 0.17620354038436353,
      right: 0.5041285215590624,
      top: 0.49469489711563647
    },
    atlasBounds: {
      left: 477.5,
      bottom: 31.5,
      right: 504.5,
      top: 50.5
    }
  },
  {
    unicode: 62,
    advance: 0.5224609375,
    planeBounds: {
      left: 0.047629290940937666,
      bottom: 0.0731029160800812,
      right: 0.5002222715590624,
      top: 0.5592213026699189
    },
    atlasBounds: {
      left: 421.5,
      bottom: 21.5,
      right: 448.5,
      top: 50.5
    }
  },
  {
    unicode: 63,
    advance: 0.47216796875,
    planeBounds: {
      left: 0.016704001808865897,
      bottom: -0.027876153049698794,
      right: 0.4525342794411341,
      top: 0.7432081842996989
    },
    atlasBounds: {
      left: 317.5,
      bottom: 144.5,
      right: 343.5,
      top: 190.5
    }
  },
  {
    unicode: 64,
    advance: 0.89794921875,
    planeBounds: {
      left: 0.034064457306783605,
      bottom: -0.23896750384690937,
      right: 0.8721996065996072,
      top: 0.7165065663469093
    },
    atlasBounds: {
      left: 155.5,
      bottom: 198.5,
      right: 205.5,
      top: 255.5
    }
  },
  {
    unicode: 65,
    advance: 0.65234375,
    planeBounds: {
      left: -0.008838044092129387,
      bottom: -0.02169206718177056,
      right: 0.6616700753421295,
      top: 0.7326295671817705
    },
    atlasBounds: {
      left: 237.5,
      bottom: 51.5,
      right: 277.5,
      top: 96.5
    }
  },
  {
    unicode: 66,
    advance: 0.62255859375,
    planeBounds: {
      left: 0.06464099434422473,
      bottom: -0.02169206718177056,
      right: 0.5842847869057752,
      top: 0.7326295671817705
    },
    atlasBounds: {
      left: 205.5,
      bottom: 51.5,
      right: 236.5,
      top: 96.5
    }
  },
  {
    unicode: 67,
    advance: 0.65087890625,
    planeBounds: {
      left: 0.038439807122511785,
      bottom: -0.030073418674698794,
      right: 0.6251344116274882,
      top: 0.7410109186746989
    },
    atlasBounds: {
      left: 344.5,
      bottom: 144.5,
      right: 379.5,
      top: 190.5
    }
  },
  {
    unicode: 68,
    advance: 0.65576171875,
    planeBounds: {
      left: 0.06301501010836826,
      bottom: -0.02169206718177056,
      right: 0.6161842086416317,
      top: 0.7326295671817705
    },
    atlasBounds: {
      left: 162.5,
      bottom: 51.5,
      right: 195.5,
      top: 96.5
    }
  },
  {
    unicode: 69,
    advance: 0.568359375,
    planeBounds: {
      left: 0.0652904160800812,
      bottom: -0.02169206718177056,
      right: 0.5514088026699189,
      top: 0.7326295671817705
    },
    atlasBounds: {
      left: 132.5,
      bottom: 51.5,
      right: 161.5,
      top: 96.5
    }
  },
  {
    unicode: 70,
    advance: 0.552734375,
    planeBounds: {
      left: 0.059675181705081196,
      bottom: -0.02169206718177056,
      right: 0.5457935682949189,
      top: 0.7326295671817705
    },
    atlasBounds: {
      left: 102.5,
      bottom: 51.5,
      right: 131.5,
      top: 96.5
    }
  },
  {
    unicode: 71,
    advance: 0.68115234375,
    planeBounds: {
      left: 0.040148791497511785,
      bottom: -0.030073418674698794,
      right: 0.6268433960024882,
      top: 0.7410109186746989
    },
    atlasBounds: {
      left: 380.5,
      bottom: 144.5,
      right: 415.5,
      top: 190.5
    }
  },
  {
    unicode: 72,
    advance: 0.712890625,
    planeBounds: {
      left: 0.062365588372511785,
      bottom: -0.02169206718177056,
      right: 0.6490601928774882,
      top: 0.7326295671817705
    },
    atlasBounds: {
      left: 30.5,
      bottom: 51.5,
      right: 65.5,
      top: 96.5
    }
  },
  {
    unicode: 73,
    advance: 0.27197265625,
    planeBounds: {
      left: 0.06917965680657412,
      bottom: -0.02169206718177056,
      right: 0.20328128069342588,
      top: 0.7326295671817705
    },
    atlasBounds: {
      left: 196.5,
      bottom: 51.5,
      right: 204.5,
      top: 96.5
    }
  },
  {
    unicode: 74,
    advance: 0.5517578125,
    planeBounds: {
      left: 0.007184947330081194,
      bottom: -0.02657487968177056,
      right: 0.4933033339199188,
      top: 0.7277467546817705
    },
    atlasBounds: {
      left: 0.5,
      bottom: 51.5,
      right: 29.5,
      top: 96.5
    }
  },
  {
    unicode: 75,
    advance: 0.626953125,
    planeBounds: {
      left: 0.061633166497511785,
      bottom: -0.02169206718177056,
      right: 0.6483277710024882,
      top: 0.7326295671817705
    },
    atlasBounds: {
      left: 452.5,
      bottom: 97.5,
      right: 487.5,
      top: 142.5
    }
  },
  {
    unicode: 76,
    advance: 0.5380859375,
    planeBounds: {
      left: 0.06341786132300943,
      bottom: -0.02169206718177056,
      right: 0.5327735449269906,
      top: 0.7326295671817705
    },
    atlasBounds: {
      left: 423.5,
      bottom: 97.5,
      right: 451.5,
      top: 142.5
    }
  },
  {
    unicode: 77,
    advance: 0.873046875,
    planeBounds: {
      left: 0.05911847969322944,
      bottom: -0.02169206718177056,
      right: 0.8134401140567705,
      top: 0.7326295671817705
    },
    atlasBounds: {
      left: 377.5,
      bottom: 97.5,
      right: 422.5,
      top: 142.5
    }
  },
  {
    unicode: 78,
    advance: 0.712890625,
    planeBounds: {
      left: 0.062365588372511785,
      bottom: -0.02169206718177056,
      right: 0.6490601928774882,
      top: 0.7326295671817705
    },
    atlasBounds: {
      left: 341.5,
      bottom: 97.5,
      right: 376.5,
      top: 142.5
    }
  },
  {
    unicode: 79,
    advance: 0.6875,
    planeBounds: {
      left: 0.033395854136655315,
      bottom: -0.030073418674698794,
      right: 0.6536158646133446,
      top: 0.7410109186746989
    },
    atlasBounds: {
      left: 416.5,
      bottom: 144.5,
      right: 453.5,
      top: 190.5
    }
  },
  {
    unicode: 80,
    advance: 0.630859375,
    planeBounds: {
      left: 0.061550166358368255,
      bottom: -0.02169206718177056,
      right: 0.6147193648916317,
      top: 0.7326295671817705
    },
    atlasBounds: {
      left: 273.5,
      bottom: 97.5,
      right: 306.5,
      top: 142.5
    }
  },
  {
    unicode: 81,
    advance: 0.6875,
    planeBounds: {
      left: 0.030466166636655315,
      bottom: -0.14391866037519643,
      right: 0.6506861771133446,
      top: 0.7445045978751964
    },
    atlasBounds: {
      left: 214.5,
      bottom: 202.5,
      right: 251.5,
      top: 255.5
    }
  },
  {
    unicode: 82,
    advance: 0.61572265625,
    planeBounds: {
      left: 0.06350329135836826,
      bottom: -0.02169206718177056,
      right: 0.6166724898916317,
      top: 0.7326295671817705
    },
    atlasBounds: {
      left: 186.5,
      bottom: 97.5,
      right: 219.5,
      top: 142.5
    }
  },
  {
    unicode: 83,
    advance: 0.59326171875,
    planeBounds: {
      left: 0.020778681983368255,
      bottom: -0.030073418674698794,
      right: 0.5739478805166317,
      top: 0.7410109186746989
    },
    atlasBounds: {
      left: 454.5,
      bottom: 144.5,
      right: 487.5,
      top: 190.5
    }
  },
  {
    unicode: 84,
    advance: 0.5966796875,
    planeBounds: {
      left: 0.005480822747511787,
      bottom: -0.02169206718177056,
      right: 0.5921754272524882,
      top: 0.7326295671817705
    },
    atlasBounds: {
      left: 112.5,
      bottom: 97.5,
      right: 147.5,
      top: 142.5
    }
  },
  {
    unicode: 85,
    advance: 0.6484375,
    planeBounds: {
      left: 0.049098994483368255,
      bottom: -0.02657487968177056,
      right: 0.6022681930166317,
      top: 0.7277467546817705
    },
    atlasBounds: {
      left: 78.5,
      bottom: 97.5,
      right: 111.5,
      top: 142.5
    }
  },
  {
    unicode: 86,
    advance: 0.63623046875,
    planeBounds: {
      left: -0.008269192599201152,
      bottom: -0.02169206718177056,
      right: 0.6454762238492011,
      top: 0.7326295671817705
    },
    atlasBounds: {
      left: 38.5,
      bottom: 97.5,
      right: 77.5,
      top: 142.5
    }
  },
  {
    unicode: 87,
    advance: 0.88720703125,
    planeBounds: {
      left: 0.011923628617731797,
      bottom: -0.02169206718177056,
      right: 0.8835841838822683,
      top: 0.7326295671817705
    },
    atlasBounds: {
      left: 220.5,
      bottom: 97.5,
      right: 272.5,
      top: 142.5
    }
  },
  {
    unicode: 88,
    advance: 0.626953125,
    planeBounds: {
      left: 0.004098979136655316,
      bottom: -0.02169206718177056,
      right: 0.6243189896133446,
      top: 0.7326295671817705
    },
    atlasBounds: {
      left: 0.5,
      bottom: 97.5,
      right: 37.5,
      top: 142.5
    }
  },
  {
    unicode: 89,
    advance: 0.6005859375,
    planeBounds: {
      left: -0.010793598988344685,
      bottom: -0.02169206718177056,
      right: 0.6094264114883446,
      top: 0.7326295671817705
    },
    atlasBounds: {
      left: 148.5,
      bottom: 97.5,
      right: 185.5,
      top: 142.5
    }
  },
  {
    unicode: 90,
    advance: 0.5986328125,
    planeBounds: {
      left: 0.024196650733368255,
      bottom: -0.02169206718177056,
      right: 0.5773658492666317,
      top: 0.7326295671817705
    },
    atlasBounds: {
      left: 307.5,
      bottom: 97.5,
      right: 340.5,
      top: 142.5
    }
  },
  {
    unicode: 91,
    advance: 0.26513671875,
    planeBounds: {
      left: 0.05437250871693295,
      bottom: -0.17280296457569408,
      right: 0.27228764753306706,
      top: 0.8329592145756942
    },
    atlasBounds: {
      left: 59.5,
      bottom: 195.5,
      right: 72.5,
      top: 255.5
    }
  },
  {
    unicode: 92,
    advance: 0.41015625,
    planeBounds: {
      left: 0.0014037126767941326,
      bottom: -0.08573505127848349,
      right: 0.4204712873232059,
      top: 0.7356373950284835
    },
    atlasBounds: {
      left: 278.5,
      bottom: 206.5,
      right: 303.5,
      top: 255.5
    }
  },
  {
    unicode: 93,
    advance: 0.26513671875,
    planeBounds: {
      left: -0.020659233400995285,
      bottom: -0.17280296457569408,
      right: 0.2140186084009953,
      top: 0.8329592145756942
    },
    atlasBounds: {
      left: 94.5,
      bottom: 195.5,
      right: 108.5,
      top: 255.5
    }
  },
  {
    unicode: 94,
    advance: 0.41796875,
    planeBounds: {
      left: 0.006855376669722368,
      bottom: 0.33229482979472236,
      right: 0.40916024833027764,
      top: 0.7345997014552776
    },
    atlasBounds: {
      left: 486.5,
      bottom: 231.5,
      right: 510.5,
      top: 255.5
    }
  },
  {
    unicode: 95,
    advance: 0.451171875,
    planeBounds: {
      left: -0.017473255794918804,
      bottom: -0.09553469482549765,
      right: 0.4686451307949188,
      top: 0.021804226075497646
    },
    atlasBounds: {
      left: 70.5,
      bottom: 7.5,
      right: 99.5,
      top: 14.5
    }
  },
  {
    unicode: 96,
    advance: 0.30908203125,
    planeBounds: {
      left: 0.00391839948107648,
      bottom: 0.5860277898277895,
      right: 0.2553589442689235,
      top: 0.7704175226722105
    },
    atlasBounds: {
      left: 36.5,
      bottom: 3.5,
      right: 51.5,
      top: 14.5
    }
  },
  {
    unicode: 97,
    advance: 0.5439453125,
    planeBounds: {
      left: 0.028181041080081196,
      bottom: -0.029187146002488215,
      right: 0.5142994276699189,
      top: 0.5575074585024882
    },
    atlasBounds: {
      left: 30.5,
      bottom: 15.5,
      right: 59.5,
      top: 50.5
    }
  },
  {
    unicode: 98,
    advance: 0.56103515625,
    planeBounds: {
      left: 0.048932994205081196,
      bottom: -0.032187684160555265,
      right: 0.5350513807949189,
      top: 0.7724220591605554
    },
    atlasBounds: {
      left: 304.5,
      bottom: 207.5,
      right: 333.5,
      top: 255.5
    }
  },
  {
    unicode: 99,
    advance: 0.5234375,
    planeBounds: {
      left: 0.024518931705081196,
      bottom: -0.029187146002488215,
      right: 0.5106373182949189,
      top: 0.5575074585024882
    },
    atlasBounds: {
      left: 0.5,
      bottom: 15.5,
      right: 29.5,
      top: 50.5
    }
  },
  {
    unicode: 100,
    advance: 0.56396484375,
    planeBounds: {
      left: 0.026227916080081196,
      bottom: -0.032187684160555265,
      right: 0.5123463026699189,
      top: 0.7724220591605554
    },
    atlasBounds: {
      left: 334.5,
      bottom: 207.5,
      right: 363.5,
      top: 255.5
    }
  },
  {
    unicode: 101,
    advance: 0.52978515625,
    planeBounds: {
      left: 0.026472056705081196,
      bottom: -0.029187146002488215,
      right: 0.5125904432949189,
      top: 0.5575074585024882
    },
    atlasBounds: {
      left: 468.5,
      bottom: 61.5,
      right: 497.5,
      top: 96.5
    }
  },
  {
    unicode: 102,
    advance: 0.34716796875,
    planeBounds: {
      left: 0.004575110905578838,
      bottom: -0.022177918535555265,
      right: 0.3733545765944212,
      top: 0.7824318247855554
    },
    atlasBounds: {
      left: 364.5,
      bottom: 207.5,
      right: 386.5,
      top: 255.5
    }
  },
  {
    unicode: 103,
    advance: 0.56103515625,
    planeBounds: {
      left: 0.026960337955081196,
      bottom: -0.22888445766762702,
      right: 0.5130787245449189,
      top: 0.558962582667627
    },
    atlasBounds: {
      left: 28.5,
      bottom: 143.5,
      right: 57.5,
      top: 190.5
    }
  },
  {
    unicode: 104,
    advance: 0.55078125,
    planeBounds: {
      left: 0.049826556565937666,
      bottom: -0.01892352016762703,
      right: 0.5024195371840624,
      top: 0.768923520167627
    },
    atlasBounds: {
      left: 0.5,
      bottom: 143.5,
      right: 27.5,
      top: 190.5
    }
  },
  {
    unicode: 105,
    advance: 0.24267578125,
    planeBounds: {
      left: 0.046882289688645884,
      bottom: -0.01680925468177056,
      right: 0.19774661656135412,
      top: 0.7375123796817705
    },
    atlasBounds: {
      left: 498.5,
      bottom: 145.5,
      right: 507.5,
      top: 190.5
    }
  },
  {
    unicode: 106,
    advance: 0.23876953125,
    planeBounds: {
      left: -0.048979545900995285,
      bottom: -0.2324562772148376,
      right: 0.1856982959009953,
      top: 0.7397804959648377
    },
    atlasBounds: {
      left: 140.5,
      bottom: 197.5,
      right: 154.5,
      top: 255.5
    }
  },
  {
    unicode: 107,
    advance: 0.5068359375,
    planeBounds: {
      left: 0.044294322330081196,
      bottom: -0.01892352016762703,
      right: 0.5304127089199189,
      top: 0.768923520167627
    },
    atlasBounds: {
      left: 58.5,
      bottom: 143.5,
      right: 87.5,
      top: 190.5
    }
  },
  {
    unicode: 108,
    advance: 0.24267578125,
    planeBounds: {
      left: 0.05428707868157412,
      bottom: -0.01892352016762703,
      right: 0.18838870256842588,
      top: 0.768923520167627
    },
    atlasBounds: {
      left: 477.5,
      bottom: 208.5,
      right: 485.5,
      top: 255.5
    }
  },
  {
    unicode: 109,
    advance: 0.87646484375,
    planeBounds: {
      left: 0.04430890170737297,
      bottom: -0.024304333502488215,
      right: 0.832155942042627,
      top: 0.5623902710024882
    },
    atlasBounds: {
      left: 116.5,
      bottom: 15.5,
      right: 163.5,
      top: 50.5
    }
  },
  {
    unicode: 110,
    advance: 0.5517578125,
    planeBounds: {
      left: 0.049826556565937666,
      bottom: -0.024304333502488215,
      right: 0.5024195371840624,
      top: 0.5623902710024882
    },
    atlasBounds: {
      left: 60.5,
      bottom: 15.5,
      right: 87.5,
      top: 50.5
    }
  },
  {
    unicode: 111,
    advance: 0.5703125,
    planeBounds: {
      left: 0.025090213094224725,
      bottom: -0.029187146002488215,
      right: 0.5447340056557752,
      top: 0.5575074585024882
    },
    atlasBounds: {
      left: 193.5,
      bottom: 15.5,
      right: 224.5,
      top: 50.5
    }
  },
  {
    unicode: 112,
    advance: 0.56103515625,
    planeBounds: {
      left: 0.048444712955081196,
      bottom: -0.22644305141762702,
      right: 0.5345630995449189,
      top: 0.561403988917627
    },
    atlasBounds: {
      left: 447.5,
      bottom: 208.5,
      right: 476.5,
      top: 255.5
    }
  },
  {
    unicode: 113,
    advance: 0.568359375,
    planeBounds: {
      left: 0.025983775455081196,
      bottom: -0.22644305141762702,
      right: 0.5121021620449189,
      top: 0.561403988917627
    },
    atlasBounds: {
      left: 417.5,
      bottom: 208.5,
      right: 446.5,
      top: 255.5
    }
  },
  {
    unicode: 114,
    advance: 0.33837890625,
    planeBounds: {
      left: 0.045180595002291775,
      bottom: -0.024304333502488215,
      right: 0.34690924874770823,
      top: 0.5623902710024882
    },
    atlasBounds: {
      left: 449.5,
      bottom: 61.5,
      right: 467.5,
      top: 96.5
    }
  },
  {
    unicode: 115,
    advance: 0.515625,
    planeBounds: {
      left: 0.021669814448009427,
      bottom: -0.029187146002488215,
      right: 0.4910254980519906,
      top: 0.5575074585024882
    },
    atlasBounds: {
      left: 164.5,
      bottom: 15.5,
      right: 192.5,
      top: 50.5
    }
  },
  {
    unicode: 116,
    advance: 0.32666015625,
    planeBounds: {
      left: -0.019433670483564695,
      bottom: -0.02877457520298586,
      right: 0.3158203892335647,
      top: 0.675258950202986
    },
    atlasBounds: {
      left: 418.5,
      bottom: 54.5,
      right: 438.5,
      top: 96.5
    }
  },
  {
    unicode: 117,
    advance: 0.55126953125,
    planeBounds: {
      left: 0.048117572190937666,
      bottom: -0.034069958502488215,
      right: 0.5007105528090624,
      top: 0.5526246460024882
    },
    atlasBounds: {
      left: 88.5,
      bottom: 15.5,
      right: 115.5,
      top: 50.5
    }
  },
  {
    unicode: 118,
    advance: 0.484375,
    planeBounds: {
      left: -0.002092396419918806,
      bottom: -0.02080579450955998,
      right: 0.4840259901699188,
      top: 0.5491261070095601
    },
    atlasBounds: {
      left: 331.5,
      bottom: 16.5,
      right: 360.5,
      top: 50.5
    }
  },
  {
    unicode: 119,
    advance: 0.75146484375,
    planeBounds: {
      left: -0.002649098431770561,
      bottom: -0.02080579450955998,
      right: 0.7516725359317705,
      top: 0.5491261070095601
    },
    atlasBounds: {
      left: 225.5,
      bottom: 16.5,
      right: 270.5,
      top: 50.5
    }
  },
  {
    unicode: 120,
    advance: 0.49560546875,
    planeBounds: {
      left: -0.0046143729128470395,
      bottom: -0.02080579450955998,
      right: 0.4982667166628471,
      top: 0.5491261070095601
    },
    atlasBounds: {
      left: 300.5,
      bottom: 16.5,
      right: 330.5,
      top: 50.5
    }
  },
  {
    unicode: 121,
    advance: 0.47314453125,
    planeBounds: {
      left: -0.007219349544918806,
      bottom: -0.23645281704262702,
      right: 0.4788990370449188,
      top: 0.551394223292627
    },
    atlasBounds: {
      left: 387.5,
      bottom: 208.5,
      right: 416.5,
      top: 255.5
    }
  },
  {
    unicode: 122,
    advance: 0.49560546875,
    planeBounds: {
      left: 0.018007705073009427,
      bottom: -0.02080579450955998,
      right: 0.4873633886769906,
      top: 0.5491261070095601
    },
    atlasBounds: {
      left: 271.5,
      bottom: 16.5,
      right: 299.5,
      top: 50.5
    }
  },
  {
    unicode: 123,
    advance: 0.33837890625,
    planeBounds: {
      left: 0.011572188891435306,
      bottom: -0.20234398020069408,
      right: 0.3468262486085647,
      top: 0.8034181989506942
    },
    atlasBounds: {
      left: 73.5,
      bottom: 195.5,
      right: 93.5,
      top: 255.5
    }
  },
  {
    unicode: 124,
    advance: 0.24365234375,
    planeBounds: {
      left: 0.06315671142450235,
      bottom: -0.15466084787519643,
      right: 0.18049563232549765,
      top: 0.7337624103751964
    },
    atlasBounds: {
      left: 206.5,
      bottom: 202.5,
      right: 213.5,
      top: 255.5
    }
  },
  {
    unicode: 125,
    advance: 0.33837890625,
    planeBounds: {
      left: -0.010156326733564695,
      bottom: -0.20234398020069408,
      right: 0.3250977329835647,
      top: 0.8034181989506942
    },
    atlasBounds: {
      left: 38.5,
      bottom: 195.5,
      right: 58.5,
      top: 255.5
    }
  },
  {
    unicode: 126,
    advance: 0.68017578125,
    planeBounds: {
      left: 0.046984728997511785,
      bottom: 0.1766063915990047,
      right: 0.6336793335024882,
      top: 0.4112842334009953
    },
    atlasBounds: {
      left: 0.5,
      bottom: 0.5,
      right: 35.5,
      top: 14.5
    }
  }
];
const kerning = [];
var defaultFontMetrics = {
  atlas,
  metrics,
  glyphs,
  kerning
};
const log = new Log();
const Niivue = function(options = {}) {
  this.opts = {};
  this.defaults = {
    textHeight: 0.03,
    colorbarHeight: 0.05,
    crosshairWidth: 1,
    backColor: [0, 0, 0, 1],
    crosshairColor: [1, 0, 0, 1],
    selectionBoxColor: [1, 1, 1, 0.5],
    clipPlaneColor: [1, 1, 1, 0.5],
    colorBarMargin: 0.05,
    trustCalMinMax: true,
    clipPlaneHotKey: "KeyC",
    viewModeHotKey: "KeyV",
    keyDebounceTime: 50,
    isRadiologicalConvention: false,
    logging: false
  };
  this.canvas = null;
  this.gl = null;
  this.colormapTexture = null;
  this.volumeTexture = null;
  this.overlayTexture = null;
  this.sliceShader = null;
  this.lineShader = null;
  this.renderShader = null;
  this.colorbarShader = null;
  this.fontShader = null;
  this.passThroughShader = null;
  this.orientShaderU = null;
  this.orientShaderI = null;
  this.orientShaderF = null;
  this.orientShaderRGBU = null;
  this.surfaceShader = null;
  this.pickingSurfaceShader = null;
  this.DEFAULT_FONT_GLYPH_SHEET = defaultFontPNG;
  this.DEFAULT_FONT_METRICS = defaultFontMetrics;
  this.fontMets = null;
  this.sliceTypeAxial = 0;
  this.sliceTypeCoronal = 1;
  this.sliceTypeSagittal = 2;
  this.sliceTypeMultiplanar = 3;
  this.sliceTypeRender = 4;
  this.sliceType = this.sliceTypeMultiplanar;
  this.scene = {};
  this.scene.renderAzimuth = 110;
  this.scene.renderElevation = 15;
  this.scene.crosshairPos = [0.5, 0.5, 0.5];
  this.scene.clipPlane = [0, 0, 0, 0];
  this.scene.mousedown = false;
  this.scene.touchdown = false;
  this.scene.mouseButtonLeft = 0;
  this.scene.mouseButtonRight = 2;
  this.scene.mouseButtonLeftDown = false;
  this.scene.mouseButtonRightDown = false;
  this.scene.prevX = 0;
  this.scene.prevY = 0;
  this.scene.currX = 0;
  this.scene.currY = 0;
  this.back = {};
  this.overlays = [];
  this.volumes = [];
  this.backTexture = [];
  this.objectsToRender3D = [];
  this.volScaleMultiplier = 1;
  this.volScale = [];
  this.vox = [];
  this.mousePos = [0, 0];
  this.numScreenSlices = 0;
  this.screenSlices = [
    { leftTopWidthHeight: [1, 0, 0, 1], axCorSag: this.sliceTypeAxial },
    { leftTopWidthHeight: [1, 0, 0, 1], axCorSag: this.sliceTypeAxial },
    { leftTopWidthHeight: [1, 0, 0, 1], axCorSag: this.sliceTypeAxial },
    { leftTopWidthHeight: [1, 0, 0, 1], axCorSag: this.sliceTypeAxial }
  ];
  this.backOpacity = 1;
  this.isDragging = false;
  this.dragStart = [0, 0];
  this.dragEnd = [0, 0];
  this.lastTwoTouchDistance = 0;
  this.otherNV = null;
  this.volumeObject3D = null;
  this.clipPlaneObject3D = null;
  this.intensityRange$ = new Subject();
  this.scene.location$ = new Subject();
  this.scene.loading$ = new Subject();
  this.loadingText = "waiting for images...";
  this.currentClipPlaneIndex = 0;
  this.lastCalled = new Date().getTime();
  this.multiTouchGesture = false;
  this.gestureInterval = null;
  this.selectedObjectId = -1;
  this.CLIP_PLANE_ID = 1;
  this.VOLUME_ID = 2;
  this.DISTANCE_FROM_CAMERA = -0.54;
  this.initialized = false;
  for (let prop in this.defaults) {
    this.opts[prop] = options[prop] === void 0 ? this.defaults[prop] : options[prop];
  }
  log.setLogLevel(this.opts.logging);
  this.eventsToSubjects = {
    location: this.scene.location$,
    loading: this.scene.loading$
  };
  this.subscriptions = [];
};
Niivue.prototype.attachTo = async function(id) {
  await this.attachToCanvas(document.getElementById(id));
  log.debug("attached to element with id: ", id);
  return this;
};
Niivue.prototype.on = function(event, callback) {
  let knownEvents = Object.keys(this.eventsToSubjects);
  if (knownEvents.indexOf(event) == -1) {
    return;
  }
  let subject = this.eventsToSubjects[event];
  let subscription = subject.subscribe({
    next: (data) => callback(data)
  });
  this.subscriptions.push({ [event]: subscription });
};
Niivue.prototype.off = function(event) {
  let knownEvents = Object.keys(this.eventsToSubjects);
  if (knownEvents.indexOf(event) == -1) {
    return;
  }
  let nsubs = this.subscriptions.length;
  for (let i = 0; i < nsubs; i++) {
    let key = Object.keys(this.subscriptions[i])[0];
    if (key === event) {
      this.subscriptions[i][event].unsubscribe();
      this.subscriptions.splice(i, 1);
      return;
    }
  }
};
Niivue.prototype.attachToCanvas = async function(canvas) {
  this.canvas = canvas;
  this.gl = this.canvas.getContext("webgl2");
  if (!this.gl) {
    alert("unable to get webgl2 context. Perhaps this browser does not support webgl2");
    console.log("unable to get webgl2 context. Perhaps this browser does not support webgl2");
  }
  this.canvas.parentElement.style.backgroundColor = "black";
  this.canvas.style.width = "100%";
  this.canvas.style.height = "100%";
  this.canvas.width = this.canvas.offsetWidth;
  this.canvas.height = this.canvas.offsetHeight;
  window.addEventListener("resize", this.resizeListener.bind(this));
  this.registerInteractions();
  await this.init();
  this.drawScene();
  return this;
};
Niivue.prototype.syncWith = function(otherNV) {
  this.otherNV = otherNV;
};
Niivue.prototype.sync = function() {
  if (!this.otherNV || typeof this.otherNV === "undefined") {
    return;
  }
  let thisMM = this.frac2mm(this.scene.crosshairPos);
  this.otherNV.scene.crosshairPos = this.otherNV.mm2frac(thisMM);
  this.otherNV.scene.renderAzimuth = this.scene.renderAzimuth;
  this.otherNV.scene.renderElevation = this.scene.renderElevation;
  this.otherNV.drawScene();
};
Niivue.prototype.arrayEquals = function(a, b) {
  return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((val, index) => val === b[index]);
};
Niivue.prototype.resizeListener = function() {
  this.canvas.style.width = "100%";
  this.canvas.style.height = "100%";
  this.canvas.width = this.canvas.offsetWidth;
  this.canvas.height = this.canvas.offsetHeight;
  this.drawScene();
};
Niivue.prototype.getRelativeMousePosition = function(event, target) {
  target = target || event.target;
  var rect = target.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
};
Niivue.prototype.getNoPaddingNoBorderCanvasRelativeMousePosition = function(event, target) {
  target = target || event.target;
  var pos = this.getRelativeMousePosition(event, target);
  pos.x = pos.x * target.width / target.clientWidth;
  pos.y = pos.y * target.height / target.clientHeight;
  return pos;
};
Niivue.prototype.mouseContextMenuListener = function(e) {
  e.preventDefault();
};
Niivue.prototype.mouseDownListener = function(e) {
  e.preventDefault();
  this.scene.mousedown = true;
  if (e.button === this.scene.mouseButtonLeft) {
    this.scene.mouseButtonLeftDown = true;
    this.mouseLeftButtonHandler(e);
  } else if (e.button === this.scene.mouseButtonRight) {
    this.scene.mouseButtonRightDown = true;
    this.mouseRightButtonHandler(e);
  }
};
Niivue.prototype.mouseLeftButtonHandler = function(e) {
  let pos = this.getNoPaddingNoBorderCanvasRelativeMousePosition(e, this.gl.canvas);
  this.mouseClick(pos.x, pos.y);
  this.mouseDown(pos.x, pos.y);
};
Niivue.prototype.mouseRightButtonHandler = function(e) {
  this.isDragging = true;
  let pos = this.getNoPaddingNoBorderCanvasRelativeMousePosition(e, this.gl.canvas);
  this.dragStart[0] = pos.x;
  this.dragStart[1] = pos.y;
  return;
};
Niivue.prototype.calculateMinMaxVoxIdx = function(array) {
  if (array.length > 2) {
    throw new Error("array must not contain more than two values");
  }
  return [
    Math.floor(Math.min(array[0], array[1])),
    Math.floor(Math.max(array[0], array[1]))
  ];
};
function intensityRaw2Scaled(hdr, raw) {
  if (hdr.scl_slope === 0)
    hdr.scl_slope = 1;
  return raw * hdr.scl_slope + hdr.scl_inter;
}
Niivue.prototype.calculateNewRange = function(volIdx = 0) {
  if (this.sliceType === this.sliceTypeRender) {
    return;
  }
  let frac = this.canvasPos2frac([this.dragStart[0], this.dragStart[1]]);
  let startVox = this.frac2vox(frac, volIdx);
  frac = this.canvasPos2frac([this.dragEnd[0], this.dragEnd[1]]);
  let endVox = this.frac2vox(frac, volIdx);
  let hi = -Number.MAX_VALUE, lo = Number.MAX_VALUE;
  let xrange;
  let yrange;
  let zrange;
  xrange = this.calculateMinMaxVoxIdx([startVox[0], endVox[0]]);
  yrange = this.calculateMinMaxVoxIdx([startVox[1], endVox[1]]);
  zrange = this.calculateMinMaxVoxIdx([startVox[2], endVox[2]]);
  if (startVox[0] - endVox[0] === 0) {
    xrange[1] = startVox[0] + 1;
  } else if (startVox[1] - endVox[1] === 0) {
    yrange[1] = startVox[1] + 1;
  } else if (startVox[2] - endVox[2] === 0) {
    zrange[1] = startVox[2] + 1;
  }
  const hdr = this.volumes[volIdx].hdr;
  const img = this.volumes[volIdx].img;
  const xdim = hdr.dims[1];
  const ydim = hdr.dims[2];
  for (let z = zrange[0]; z < zrange[1]; z++) {
    let zi = z * xdim * ydim;
    for (let y = yrange[0]; y < yrange[1]; y++) {
      let yi = y * xdim;
      for (let x = xrange[0]; x < xrange[1]; x++) {
        let index = zi + yi + x;
        if (lo > img[index]) {
          lo = img[index];
        }
        if (hi < img[index]) {
          hi = img[index];
        }
      }
    }
  }
  var mnScale = intensityRaw2Scaled(hdr, lo);
  var mxScale = intensityRaw2Scaled(hdr, hi);
  this.volumes[volIdx].cal_min = mnScale;
  this.volumes[volIdx].cal_max = mxScale;
  this.intensityRange$.next([mnScale, mxScale]);
};
Niivue.prototype.mouseUpListener = function() {
  this.scene.mousedown = false;
  this.scene.mouseButtonRightDown = false;
  this.scene.mouseButtonLeftDown = false;
  if (this.isDragging) {
    this.isDragging = false;
    this.calculateNewRange();
    this.refreshLayers(this.volumes[0], 0, this.volumes.length);
    this.drawScene();
  }
};
Niivue.prototype.checkMultitouch = function(e) {
  if (this.scene.touchdown && !this.multiTouchGesture) {
    var rect = this.canvas.getBoundingClientRect();
    this.mouseClick(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
    this.mouseDown(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
  }
};
Niivue.prototype.touchStartListener = function(e) {
  e.preventDefault();
  this.scene.touchdown = true;
  if (this.scene.touchdown && e.touches.length < 2) {
    this.multiTouchGesture = false;
  } else {
    this.multiTouchGesture = true;
  }
  setTimeout(this.checkMultitouch.bind(this), 1, e);
};
Niivue.prototype.touchEndListener = function() {
  this.scene.touchdown = false;
  this.lastTwoTouchDistance = 0;
  this.multiTouchGesture = false;
};
Niivue.prototype.mouseMoveListener = function(e) {
  if (this.scene.mousedown) {
    let pos = this.getNoPaddingNoBorderCanvasRelativeMousePosition(e, this.gl.canvas);
    if (this.scene.mouseButtonLeftDown) {
      this.mouseClick(pos.x, pos.y);
      this.mouseMove(pos.x, pos.y);
    } else if (this.scene.mouseButtonRightDown) {
      this.dragEnd[0] = pos.x;
      this.dragEnd[1] = pos.y;
    }
    this.drawScene();
    this.scene.prevX = this.scene.currX;
    this.scene.prevY = this.scene.currY;
  }
};
Niivue.prototype.resetBriCon = function() {
  this.volumes[0].cal_min = this.volumes[0].global_min;
  this.volumes[0].cal_max = this.volumes[0].global_max;
  this.refreshLayers(this.volumes[0], 0, this.volumes.length);
  this.drawScene();
};
Niivue.prototype.touchMoveListener = function(e) {
  if (this.scene.touchdown && e.touches.length < 2) {
    var rect = this.canvas.getBoundingClientRect();
    this.mouseClick(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
    this.mouseMove(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
  } else {
    this.handlePinchZoom(e);
  }
};
Niivue.prototype.handlePinchZoom = function(e) {
  if (e.targetTouches.length == 2 && e.changedTouches.length == 2) {
    var dist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
    var rect = this.canvas.getBoundingClientRect();
    this.mousePos = [
      e.touches[0].clientX - rect.left,
      e.touches[0].clientY - rect.top
    ];
    if (dist < this.lastTwoTouchDistance) {
      this.sliceScroll2D(-0.01, e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
    } else {
      this.sliceScroll2D(0.01, e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
    }
    this.lastTwoTouchDistance = dist;
  }
};
Niivue.prototype.keyUpListener = function(e) {
  if (e.code === this.opts.clipPlaneHotKey) {
    if (this.sliceType != this.sliceTypeRender) {
      return;
    }
    let now = new Date().getTime();
    let elapsed = now - this.lastCalled;
    if (elapsed > this.opts.keyDebounceTime) {
      this.currentClipPlaneIndex = (this.currentClipPlaneIndex + 1) % 4;
      this.clipPlaneObject3D.isVisible = this.currentClipPlaneIndex;
      switch (this.currentClipPlaneIndex) {
        case 0:
          this.scene.clipPlane = [0, 0, 0, 0];
          this.clipPlaneObject3D.rotation = [0, 0, 0];
          break;
        case 1:
          this.scene.clipPlane = [1, 0, 0, 0];
          this.clipPlaneObject3D.rotation = [0, 1, 0];
          break;
        case 2:
          this.scene.clipPlane = [0, 1, 0, 0];
          this.clipPlaneObject3D.rotation = [1, 0, 0];
          break;
        case 3:
          this.scene.clipPlane = [0, 0, 1, 0];
          this.clipPlaneObject3D.rotation = [0, 0, 1];
          break;
      }
      this.drawScene();
    }
    this.lastCalled = now;
  } else if (e.code === this.opts.viewModeHotKey) {
    let now = new Date().getTime();
    let elapsed = now - this.lastCalled;
    if (elapsed > this.opts.keyDebounceTime) {
      this.setSliceType((this.sliceType + 1) % 5);
      this.lastCalled = now;
    }
  }
};
Niivue.prototype.wheelListener = function(e) {
  e.preventDefault();
  e.stopPropagation();
  var rect = this.canvas.getBoundingClientRect();
  if (e.deltaY < 0) {
    this.sliceScroll2D(-0.01, e.clientX - rect.left, e.clientY - rect.top);
  } else {
    this.sliceScroll2D(0.01, e.clientX - rect.left, e.clientY - rect.top);
  }
};
Niivue.prototype.registerInteractions = function() {
  this.canvas.addEventListener("mousedown", this.mouseDownListener.bind(this));
  this.canvas.addEventListener("mouseup", this.mouseUpListener.bind(this));
  this.canvas.addEventListener("mousemove", this.mouseMoveListener.bind(this));
  this.canvas.addEventListener("touchstart", this.touchStartListener.bind(this));
  this.canvas.addEventListener("touchend", this.touchEndListener.bind(this));
  this.canvas.addEventListener("touchmove", this.touchMoveListener.bind(this));
  this.canvas.addEventListener("wheel", this.wheelListener.bind(this));
  this.canvas.addEventListener("contextmenu", this.mouseContextMenuListener.bind(this));
  this.canvas.addEventListener("dblclick", this.resetBriCon.bind(this));
  this.canvas.addEventListener("dragenter", this.dragEnterListener.bind(this), false);
  this.canvas.addEventListener("dragover", this.dragOverListener.bind(this), false);
  this.canvas.addEventListener("drop", this.dropListener.bind(this), false);
  this.canvas.setAttribute("tabindex", 0);
  this.canvas.addEventListener("keyup", this.keyUpListener.bind(this), false);
  this.canvas.focus();
};
Niivue.prototype.dragEnterListener = function(e) {
  e.stopPropagation();
  e.preventDefault();
};
Niivue.prototype.dragOverListener = function(e) {
  e.stopPropagation();
  e.preventDefault();
};
Niivue.prototype.dropListener = async function(e) {
  e.stopPropagation();
  e.preventDefault();
  const dt = e.dataTransfer;
  const url = dt.getData("text/uri-list");
  if (url) {
    let volume = await NVImage.loadFromUrl(url);
    this.setVolume(volume);
  } else {
    const files = dt.files;
    if (files.length > 0) {
      this.volumes = [];
      this.overlays = [];
      let volume = await NVImage.loadFromFile(files[0]);
      this.setVolume(volume);
    }
  }
};
Niivue.prototype.setRadiologicalConvention = function(isRadiologicalConvention) {
  this.opts.isRadiologicalConvention = isRadiologicalConvention;
};
Niivue.prototype.getRadiologicalConvention = function() {
  return this.opts.isRadiologicalConvention;
};
Niivue.prototype.addVolume = function(volume) {
  if (this.volumes.length > 1) {
    this.overlays.push(volume);
  } else {
    this.back = volume;
  }
  this.volumes.push(volume);
  this.updateGLVolume();
};
Niivue.prototype.getVolumeIndexByID = function(id) {
  let n = this.volumes.length;
  for (let i = 0; i < n; i++) {
    let id_i = this.volumes[i].id;
    if (id_i === id) {
      return i;
    }
  }
  return -1;
};
Niivue.prototype.getOverlayIndexByID = function(id) {
  let n = this.overlays.length;
  for (let i = 0; i < n; i++) {
    let id_i = this.overlays[i].id;
    if (id_i === id) {
      return i;
    }
  }
  return -1;
};
Niivue.prototype.setVolume = function(volume, toIndex = 0) {
  this.volumes.map((v) => {
    log.debug(v.name);
  });
  let numberOfLoadedImages = this.volumes.length;
  if (toIndex > numberOfLoadedImages) {
    return;
  }
  let volIndex = this.getVolumeIndexByID(volume.id);
  if (toIndex === 0) {
    this.volumes.splice(volIndex, 1);
    this.volumes.unshift(volume);
    this.back = this.volumes[0];
    this.overlays = this.volumes.slice(1);
  } else if (toIndex < 0) {
    this.volumes.splice(this.getVolumeIndexByID(volume.id), 1);
    this.back = this.volumes[0];
    if (this.volumes.length > 1) {
      this.overlays = this.volumes.slice(1);
    } else {
      this.overlays = [];
    }
  } else {
    this.volumes.splice(volIndex, 1);
    this.volumes.splice(toIndex, 0, volume);
    this.overlays = this.volumes.slice(1);
    this.back = this.volumes[0];
  }
  this.updateGLVolume();
  this.volumes.map((v) => {
    log.debug(v.name);
  });
};
Niivue.prototype.removeVolume = function(volume) {
  this.setVolume(volume, -1);
};
Niivue.prototype.moveVolumeToBottom = function(volume) {
  this.setVolume(volume, 0);
};
Niivue.prototype.moveVolumeUp = function(volume) {
  let volIdx = this.getVolumeIndexByID(volume.id);
  this.setVolume(volume, volIdx + 1);
};
Niivue.prototype.moveVolumeDown = function(volume) {
  let volIdx = this.getVolumeIndexByID(volume.id);
  this.setVolume(volume, volIdx - 1);
};
Niivue.prototype.moveVolumeToTop = function(volume) {
  this.setVolume(volume, this.volumes.length - 1);
};
Niivue.prototype.mouseDown = function mouseDown(x, y) {
  if (this.sliceType != this.sliceTypeRender)
    return;
  this.mousePos = [x, y];
};
Niivue.prototype.mouseMove = function mouseMove(x, y) {
  if (this.sliceType != this.sliceTypeRender)
    return;
  this.scene.renderAzimuth += x - this.mousePos[0];
  this.scene.renderElevation += y - this.mousePos[1];
  this.mousePos = [x, y];
  this.drawScene();
};
Niivue.prototype.sph2cartDeg = function sph2cartDeg(azimuth, elevation) {
  let Phi = -elevation * (Math.PI / 180);
  let Theta = (azimuth - 90) % 360 * (Math.PI / 180);
  let ret = [
    Math.cos(Phi) * Math.cos(Theta),
    Math.cos(Phi) * Math.sin(Theta),
    Math.sin(Phi)
  ];
  let len = Math.sqrt(ret[0] * ret[0] + ret[1] * ret[1] + ret[2] * ret[2]);
  if (len <= 0)
    return ret;
  ret[0] /= len;
  ret[1] /= len;
  ret[2] /= len;
  return ret;
};
Niivue.prototype.clipPlaneUpdate = function(azimuthElevation) {
  if (this.sliceType != this.sliceTypeRender)
    return;
  let v = this.sph2cartDeg(azimuthElevation[0], azimuthElevation[1]);
  this.scene.clipPlane = [v[0], v[1], v[2], azimuthElevation[2]];
  this.drawScene();
};
Niivue.prototype.setCrosshairColor = function(color) {
  this.opts.crosshairColor = color;
  this.drawScene();
};
Niivue.prototype.setSelectionBoxColor = function(color) {
  this.opts.selectionBoxColor = color;
};
Niivue.prototype.sliceScroll2D = function(posChange, x, y, isDelta = true) {
  this.mouseClick(x, y, posChange, isDelta);
};
Niivue.prototype.setSliceType = function(st) {
  this.sliceType = st;
  this.drawScene();
  return this;
};
Niivue.prototype.setOpacity = function(volIdx, newOpacity) {
  this.volumes[volIdx].opacity = newOpacity;
  if (volIdx === 0) {
    this.backOpacity = newOpacity;
    this.drawScene();
    return;
  }
  this.updateGLVolume();
};
Niivue.prototype.setScale = function(scale) {
  this.volScaleMultiplier = scale;
  this.drawScene();
};
Niivue.prototype.setClipPlaneColor = function(color) {
  this.opts.clipPlaneColor = color;
  this.drawScene();
};
Niivue.prototype.overlayRGBA = function(volume) {
  let hdr = volume.hdr;
  let vox = hdr.dims[1] * hdr.dims[2] * hdr.dims[3];
  let imgRGBA = new Uint8ClampedArray(vox * 4);
  let radius = 0.2 * Math.min(Math.min(hdr.dims[1], hdr.dims[2]), hdr.dims[3]);
  let halfX = 0.5 * hdr.dims[1];
  let halfY = 0.5 * hdr.dims[2];
  let halfZ = 0.5 * hdr.dims[3];
  let j = 0;
  for (let z = 0; z < hdr.dims[3]; z++) {
    for (let y = 0; y < hdr.dims[2]; y++) {
      for (let x = 0; x < hdr.dims[1]; x++) {
        let dx = Math.abs(x - halfX);
        let dy = Math.abs(y - halfY);
        let dz = Math.abs(z - halfZ);
        let dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        let v = 0;
        if (dist < radius)
          v = 255;
        imgRGBA[j++] = 0;
        imgRGBA[j++] = v;
        imgRGBA[j++] = 0;
        imgRGBA[j++] = v * 0.5;
      }
    }
  }
  return imgRGBA;
};
Niivue.prototype.vox2mm = function(XYZ, mtx) {
  let sform = clone(mtx);
  transpose(sform, sform);
  let pos = fromValues(XYZ[0], XYZ[1], XYZ[2], 1);
  transformMat4(pos, pos, sform);
  let pos3 = fromValues$1(pos[0], pos[1], pos[2]);
  return pos3;
};
Niivue.prototype.cloneVolume = function(index) {
  return this.volumes[index].clone();
};
Niivue.prototype.loadVolumes = async function(volumeList) {
  this.on("loading", (isLoading) => {
    if (isLoading) {
      this.loadingText = "loading...";
      this.drawScene();
    } else {
      this.loadingText = "waiting for images...";
    }
  });
  if (!this.initialized)
    ;
  this.volumes = [];
  this.gl.clearColor(0, 0, 0, 1);
  this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  this.scene.loading$.next(true);
  for (let i = 0; i < volumeList.length; i++) {
    let volume = await NVImage.loadFromUrl(volumeList[i].url, volumeList[i].name, volumeList[i].colorMap, volumeList[i].opacity, this.opts.trustCalMinMax);
    this.scene.loading$.next(false);
    this.volumes.push(volume);
    if (i === 0) {
      this.back = volume;
    }
    this.overlays = this.volumes.slice(1);
    this.updateGLVolume();
  }
  return this;
};
Niivue.prototype.rgbaTex = function(texID, activeID, dims, isInit = false) {
  if (texID)
    this.gl.deleteTexture(texID);
  texID = this.gl.createTexture();
  this.gl.activeTexture(activeID);
  this.gl.bindTexture(this.gl.TEXTURE_3D, texID);
  this.gl.texParameteri(this.gl.TEXTURE_3D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
  this.gl.texParameteri(this.gl.TEXTURE_3D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
  this.gl.texParameteri(this.gl.TEXTURE_3D, this.gl.TEXTURE_WRAP_R, this.gl.CLAMP_TO_EDGE);
  this.gl.texParameteri(this.gl.TEXTURE_3D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
  this.gl.texParameteri(this.gl.TEXTURE_3D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
  this.gl.pixelStorei(this.gl.UNPACK_ALIGNMENT, 1);
  this.gl.texStorage3D(this.gl.TEXTURE_3D, 1, this.gl.RGBA8, dims[1], dims[2], dims[3]);
  if (isInit) {
    let img8 = new Uint8Array(dims[1] * dims[2] * dims[3] * 4);
    this.gl.texSubImage3D(this.gl.TEXTURE_3D, 0, 0, 0, 0, dims[1], dims[2], dims[3], this.gl.RGBA, this.gl.UNSIGNED_BYTE, img8);
  }
  return texID;
};
Niivue.prototype.requestCORSIfNotSameOrigin = function(img, url) {
  if (new URL(url, window.location.href).origin !== window.location.origin) {
    img.crossOrigin = "";
  }
};
Niivue.prototype.loadFontTexture = function(fontUrl) {
  return new Promise((resolve, reject) => {
    let img = new Image();
    img.onload = () => {
      let pngTexture = this.gl.createTexture();
      this.gl.activeTexture(this.gl.TEXTURE3);
      this.gl.bindTexture(this.gl.TEXTURE_2D, pngTexture);
      this.gl.uniform1i(this.fontShader.uniforms["fontTexture"], 3);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
      this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, img);
      resolve(pngTexture);
    };
    img.onerror = reject;
    this.requestCORSIfNotSameOrigin(img, fontUrl);
    img.src = fontUrl;
  });
};
Niivue.prototype.initFontMets = function() {
  this.fontMets = [];
  for (let id = 0; id < 256; id++) {
    this.fontMets[id] = {};
    this.fontMets[id].xadv = 0;
    this.fontMets[id].uv_lbwh = [0, 0, 0, 0];
    this.fontMets[id].lbwh = [0, 0, 0, 0];
  }
  this.fontMets.distanceRange = this.fontMetrics.atlas.distanceRange;
  this.fontMets.size = this.fontMetrics.atlas.size;
  let scaleW = this.fontMetrics.atlas.width;
  let scaleH = this.fontMetrics.atlas.height;
  for (let i = 0; i < this.fontMetrics.glyphs.length; i++) {
    let glyph = this.fontMetrics.glyphs[i];
    let id = glyph.unicode;
    this.fontMets[id].xadv = glyph.advance;
    if (glyph.planeBounds === void 0)
      continue;
    let l = glyph.atlasBounds.left / scaleW;
    let b = (scaleH - glyph.atlasBounds.top) / scaleH;
    let w = (glyph.atlasBounds.right - glyph.atlasBounds.left) / scaleW;
    let h = (glyph.atlasBounds.top - glyph.atlasBounds.bottom) / scaleH;
    this.fontMets[id].uv_lbwh = [l, b, w, h];
    l = glyph.planeBounds.left;
    b = glyph.planeBounds.bottom;
    w = glyph.planeBounds.right - glyph.planeBounds.left;
    h = glyph.planeBounds.top - glyph.planeBounds.bottom;
    this.fontMets[id].lbwh = [l, b, w, h];
  }
};
Niivue.prototype.loadFont = async function(fontSheetUrl = defaultFontPNG, metricsUrl = defaultFontMetrics) {
  await this.loadFontTexture(fontSheetUrl);
  let response = await fetch(metricsUrl);
  if (!response.ok) {
    throw Error(response.statusText);
  }
  let jsonText = await response.text();
  this.fontMetrics = JSON.parse(jsonText);
  this.initFontMets();
  this.fontShader.use(this.gl);
  this.gl.uniform1i(this.fontShader.uniforms["fontTexture"], 3);
  this.drawScene();
};
Niivue.prototype.loadDefaultFont = async function() {
  await this.loadFontTexture(this.DEFAULT_FONT_GLYPH_SHEET);
  this.fontMetrics = this.DEFAULT_FONT_METRICS;
  this.initFontMets();
};
Niivue.prototype.initText = async function() {
  this.fontShader = new Shader(this.gl, vertFontShader, fragFontShader);
  this.fontShader.use(this.gl);
  await this.loadDefaultFont();
  this.drawLoadingText(this.loadingText);
};
Niivue.prototype.initText = async function() {
  this.fontShader = new Shader(this.gl, vertFontShader, fragFontShader);
  this.fontShader.use(this.gl);
  await this.loadDefaultFont();
  this.drawLoadingText(this.loadingText);
};
Niivue.prototype.init = async function() {
  let rendererInfo = this.gl.getExtension("WEBGL_debug_renderer_info");
  let vendor = this.gl.getParameter(rendererInfo.UNMASKED_VENDOR_WEBGL);
  let renderer = this.gl.getParameter(rendererInfo.UNMASKED_RENDERER_WEBGL);
  log.info("renderer vendor: ", vendor);
  log.info("renderer: ", renderer);
  this.gl.enable(this.gl.CULL_FACE);
  this.gl.cullFace(this.gl.FRONT);
  this.gl.enable(this.gl.BLEND);
  this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
  this.rgbaTex(this.volumeTexture, this.gl.TEXTURE0, [2, 2, 2, 2], true);
  this.rgbaTex(this.overlayTexture, this.gl.TEXTURE2, [2, 2, 2, 2], true);
  let vao = this.gl.createVertexArray();
  this.gl.bindVertexArray(vao);
  let clipPlaneVertices = new Float32Array([
    0,
    1,
    0.5,
    1,
    1,
    0.5,
    1,
    0,
    0.5,
    0,
    1,
    0.5,
    1,
    0,
    0.5,
    0,
    0,
    0.5
  ]);
  let vertexBuffer = this.gl.createBuffer();
  this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuffer);
  this.gl.bufferData(this.gl.ARRAY_BUFFER, clipPlaneVertices, this.gl.STATIC_DRAW);
  this.gl.enableVertexAttribArray(0);
  this.gl.vertexAttribPointer(0, 3, this.gl.FLOAT, false, 0, 0);
  this.clipPlaneObject3D = new NiivueObject3D(this.CLIP_PLANE_ID, vertexBuffer, this.gl.TRIANGLES, 6);
  this.clipPlaneObject3D.position = [0, 0, this.DISTANCE_FROM_CAMERA];
  this.clipPlaneObject3D.isVisible = false;
  this.clipPlaneObject3D.rotationRadians = Math.PI / 2;
  this.objectsToRender3D.push(this.clipPlaneObject3D);
  let cubeStrip = [
    0,
    1,
    0,
    1,
    1,
    0,
    0,
    1,
    1,
    1,
    1,
    1,
    1,
    0,
    1,
    1,
    1,
    0,
    1,
    0,
    0,
    0,
    1,
    0,
    0,
    0,
    0,
    0,
    1,
    1,
    0,
    0,
    1,
    1,
    0,
    1,
    0,
    0,
    0,
    1,
    0,
    0
  ];
  this.cuboidVertexBuffer = this.gl.createBuffer();
  this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.cuboidVertexBuffer);
  this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(cubeStrip), this.gl.STATIC_DRAW);
  let vbo = this.gl.createBuffer();
  this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vbo);
  this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(cubeStrip), this.gl.STATIC_DRAW);
  this.gl.enableVertexAttribArray(0);
  this.gl.vertexAttribPointer(0, 3, this.gl.FLOAT, false, 0, 0);
  this.volumeObject3D = new NiivueObject3D(this.VOLUME_ID, vbo, this.gl.TRIANGLE_STRIP, 14);
  this.volumeObject3D.glFlags = this.volumeObject3D.BLEND | this.volumeObject3D.CULL_FACE | this.volumeObject3D.CULL_FRONT;
  this.volumeObject3D.position = [0, 0, this.DISTANCE_FROM_CAMERA];
  let pickingShader = new Shader(this.gl, vertVolumePickingShader, fragVolumePickingShader);
  pickingShader.use(this.gl);
  this.gl.uniform1i(pickingShader.uniforms["volume"], 0);
  this.gl.uniform1i(pickingShader.uniforms["colormap"], 1);
  this.gl.uniform1i(pickingShader.uniforms["overlay"], 2);
  pickingShader.mvpUniformName = "mvpMtx";
  pickingShader.rayDirUniformName = "rayDir";
  pickingShader.clipPlaneUniformName = "clipPlane";
  this.volumeObject3D.pickingShader = pickingShader;
  this.objectsToRender3D.push(this.volumeObject3D);
  this.sliceShader = new Shader(this.gl, vertSliceShader, fragSliceShader);
  this.sliceShader.use(this.gl);
  this.gl.uniform1i(this.sliceShader.uniforms["volume"], 0);
  this.gl.uniform1i(this.sliceShader.uniforms["colormap"], 1);
  this.gl.uniform1i(this.sliceShader.uniforms["overlay"], 2);
  this.lineShader = new Shader(this.gl, vertLineShader, fragLineShader);
  this.renderShader = new Shader(this.gl, vertRenderShader, fragRenderShader);
  this.renderShader.use(this.gl);
  this.gl.uniform1i(this.renderShader.uniforms["volume"], 0);
  this.gl.uniform1i(this.renderShader.uniforms["colormap"], 1);
  this.gl.uniform1i(this.renderShader.uniforms["overlay"], 2);
  let volumeRenderShader = new NiivueShader3D(this.renderShader);
  volumeRenderShader.mvpUniformName = "mvpMtx";
  volumeRenderShader.rayDirUniformName = "rayDir";
  volumeRenderShader.clipPlaneUniformName = "clipPlane";
  this.volumeObject3D.renderShaders.push(volumeRenderShader);
  this.colorbarShader = new Shader(this.gl, vertColorbarShader, fragColorbarShader);
  this.colorbarShader.use(this.gl);
  this.gl.uniform1i(this.colorbarShader.uniforms["colormap"], 1);
  this.passThroughShader = new Shader(this.gl, vertPassThroughShader, fragPassThroughShader);
  this.orientShaderU = new Shader(this.gl, vertOrientShader, fragOrientShaderU.concat(fragOrientShader));
  this.orientShaderI = new Shader(this.gl, vertOrientShader, fragOrientShaderI.concat(fragOrientShader));
  this.orientShaderF = new Shader(this.gl, vertOrientShader, fragOrientShaderF.concat(fragOrientShader));
  this.orientShaderRGBU = new Shader(this.gl, vertOrientShader, fragOrientShaderU.concat(fragRGBOrientShader));
  this.pickingSurfaceShader = new Shader(this.gl, vertDepthPickingShader, fragDepthPickingShader);
  this.surfaceShader = new Shader(this.gl, vertSurfaceShader, fragSurfaceShader);
  this.surfaceShader.use(this.gl);
  this.gl.uniform4fv(this.surfaceShader.uniforms["surfaceColor"], this.opts.clipPlaneColor);
  let clipPlaneShader = new NiivueShader3D(this.surfaceShader);
  clipPlaneShader.mvpUniformName = "mvpMtx";
  this.clipPlaneObject3D.renderShaders.push(clipPlaneShader);
  await this.initText();
  this.updateGLVolume();
  this.initialized = true;
  this.drawScene();
  return this;
};
Niivue.prototype.updateGLVolume = function() {
  let visibleLayers = 0;
  let numLayers = this.volumes.length;
  this.refreshColormaps();
  for (let i = 0; i < numLayers; i++) {
    if (!this.volumes[i].toRAS) {
      continue;
    }
    this.refreshLayers(this.volumes[i], visibleLayers, numLayers);
    visibleLayers++;
  }
  this.drawScene();
};
Niivue.prototype.refreshLayers = function(overlayItem, layer, numLayers) {
  let hdr = overlayItem.hdr;
  let img = overlayItem.img;
  let opacity = overlayItem.opacity;
  let outTexture = null;
  let mtx = clone(overlayItem.toRAS);
  if (layer === 0) {
    this.volumeObject3D = overlayItem.toNiivueObject3D(this.VOLUME_ID, this.gl);
    this.volumeObject3D.glFlags = this.volumeObject3D.CULL_FACE;
    this.objectsToRender3D.splice(0, 1, this.volumeObject3D);
    invert(mtx, mtx);
    log.debug(`mtx layer ${layer}`, mtx);
    this.back.matRAS = overlayItem.matRAS;
    this.back.dims = overlayItem.dimsRAS;
    this.back.pixDims = overlayItem.pixDimsRAS;
    outTexture = this.rgbaTex(this.volumeTexture, this.gl.TEXTURE0, overlayItem.dimsRAS);
    let { volScale: volScale2, vox: vox2 } = this.sliceScale();
    this.volScale = volScale2;
    this.vox = vox2;
    this.volumeObject3D.scale = volScale2;
    this.renderShader.use(this.gl);
    this.gl.uniform3fv(this.renderShader.uniforms["texVox"], vox2);
    this.gl.uniform3fv(this.renderShader.uniforms["volScale"], volScale2);
    let volumeRenderShader = new NiivueShader3D(this.renderShader);
    volumeRenderShader.mvpUniformName = "mvpMtx";
    volumeRenderShader.rayDirUniformName = "rayDir";
    volumeRenderShader.clipPlaneUniformName = "clipPlane";
    let pickingShader = new Shader(this.gl, vertVolumePickingShader, fragVolumePickingShader);
    pickingShader.use(this.gl);
    this.gl.uniform1i(pickingShader.uniforms["volume"], 0);
    this.gl.uniform1i(pickingShader.uniforms["colormap"], 1);
    this.gl.uniform1i(pickingShader.uniforms["overlay"], 2);
    pickingShader.mvpUniformName = "mvpMtx";
    pickingShader.rayDirUniformName = "rayDir";
    pickingShader.clipPlaneUniformName = "clipPlane";
    this.gl.uniform3fv(pickingShader.uniforms["volScale"], volScale2);
    this.volumeObject3D.pickingShader = pickingShader;
    this.volumeObject3D.renderShaders.push(volumeRenderShader);
  } else {
    if (this.back.dims === void 0)
      console.log("Fatal error: Unable to render overlay: background dimensions not defined!");
    let f000 = this.mm2frac(overlayItem.mm000);
    let f100 = this.mm2frac(overlayItem.mm100);
    let f010 = this.mm2frac(overlayItem.mm010);
    let f001 = this.mm2frac(overlayItem.mm001);
    f100 = subtract(f100, f100, f000);
    f010 = subtract(f010, f010, f000);
    f001 = subtract(f001, f001, f000);
    mtx = fromValues$2(f100[0], f100[1], f100[2], f000[0], f010[0], f010[1], f010[2], f000[1], f001[0], f001[1], f001[2], f000[2], 0, 0, 0, 1);
    invert(mtx, mtx);
    if (layer === 1) {
      outTexture = this.rgbaTex(this.overlayTexture, this.gl.TEXTURE2, this.back.dims);
      this.backTexture = outTexture;
    } else
      outTexture = this.backTexture;
  }
  let fb = this.gl.createFramebuffer();
  this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, fb);
  this.gl.disable(this.gl.CULL_FACE);
  this.gl.viewport(0, 0, this.back.dims[1], this.back.dims[2]);
  this.gl.disable(this.gl.BLEND);
  let tempTex3D = this.gl.createTexture();
  this.gl.activeTexture(this.gl.TEXTURE6);
  this.gl.bindTexture(this.gl.TEXTURE_3D, tempTex3D);
  this.gl.texParameteri(this.gl.TEXTURE_3D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
  this.gl.texParameteri(this.gl.TEXTURE_3D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
  this.gl.texParameteri(this.gl.TEXTURE_3D, this.gl.TEXTURE_WRAP_R, this.gl.CLAMP_TO_EDGE);
  this.gl.texParameteri(this.gl.TEXTURE_3D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
  this.gl.texParameteri(this.gl.TEXTURE_3D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
  this.gl.pixelStorei(this.gl.UNPACK_ALIGNMENT, 1);
  let orientShader = this.orientShaderU;
  if (hdr.datatypeCode === 2) {
    this.gl.texStorage3D(this.gl.TEXTURE_3D, 1, this.gl.R8UI, hdr.dims[1], hdr.dims[2], hdr.dims[3]);
    this.gl.texSubImage3D(this.gl.TEXTURE_3D, 0, 0, 0, 0, hdr.dims[1], hdr.dims[2], hdr.dims[3], this.gl.RED_INTEGER, this.gl.UNSIGNED_BYTE, img);
  } else if (hdr.datatypeCode === 4) {
    this.gl.texStorage3D(this.gl.TEXTURE_3D, 1, this.gl.R16I, hdr.dims[1], hdr.dims[2], hdr.dims[3]);
    this.gl.texSubImage3D(this.gl.TEXTURE_3D, 0, 0, 0, 0, hdr.dims[1], hdr.dims[2], hdr.dims[3], this.gl.RED_INTEGER, this.gl.SHORT, img);
    orientShader = this.orientShaderI;
  } else if (hdr.datatypeCode === 16) {
    this.gl.texStorage3D(this.gl.TEXTURE_3D, 1, this.gl.R32F, hdr.dims[1], hdr.dims[2], hdr.dims[3]);
    this.gl.texSubImage3D(this.gl.TEXTURE_3D, 0, 0, 0, 0, hdr.dims[1], hdr.dims[2], hdr.dims[3], this.gl.RED, this.gl.FLOAT, img);
    orientShader = this.orientShaderF;
  } else if (hdr.datatypeCode === 64) {
    let img32f = new Float32Array();
    img32f = Float32Array.from(img);
    this.gl.texStorage3D(this.gl.TEXTURE_3D, 1, this.gl.R32F, hdr.dims[1], hdr.dims[2], hdr.dims[3]);
    this.gl.texSubImage3D(this.gl.TEXTURE_3D, 0, 0, 0, 0, hdr.dims[1], hdr.dims[2], hdr.dims[3], this.gl.RED, this.gl.FLOAT, img32f);
    orientShader = this.orientShaderF;
  } else if (hdr.datatypeCode === 128) {
    orientShader = this.orientShaderRGBU;
    orientShader.use(this.gl);
    this.gl.uniform1i(orientShader.uniforms["hasAlpha"], false);
    this.gl.texStorage3D(this.gl.TEXTURE_3D, 1, this.gl.RGB8UI, hdr.dims[1], hdr.dims[2], hdr.dims[3]);
    this.gl.texSubImage3D(this.gl.TEXTURE_3D, 0, 0, 0, 0, hdr.dims[1], hdr.dims[2], hdr.dims[3], this.gl.RGB_INTEGER, this.gl.UNSIGNED_BYTE, img);
  } else if (hdr.datatypeCode === 512) {
    this.gl.texStorage3D(this.gl.TEXTURE_3D, 1, this.gl.R16UI, hdr.dims[1], hdr.dims[2], hdr.dims[3]);
    this.gl.texSubImage3D(this.gl.TEXTURE_3D, 0, 0, 0, 0, hdr.dims[1], hdr.dims[2], hdr.dims[3], this.gl.RED_INTEGER, this.gl.UNSIGNED_SHORT, img);
  } else if (hdr.datatypeCode === 2304) {
    orientShader = this.orientShaderRGBU;
    orientShader.use(this.gl);
    this.gl.uniform1i(orientShader.uniforms["hasAlpha"], true);
    this.gl.texStorage3D(this.gl.TEXTURE_3D, 1, this.gl.RGBA8UI, hdr.dims[1], hdr.dims[2], hdr.dims[3]);
    this.gl.texSubImage3D(this.gl.TEXTURE_3D, 0, 0, 0, 0, hdr.dims[1], hdr.dims[2], hdr.dims[3], this.gl.RGBA_INTEGER, this.gl.UNSIGNED_BYTE, img);
  }
  if (overlayItem.global_min === void 0) {
    overlayItem.calMinMax();
  }
  let blendTexture = null;
  if (layer > 1) {
    blendTexture = this.rgbaTex(blendTexture, this.gl.TEXTURE5, this.back.dims);
    this.gl.bindTexture(this.gl.TEXTURE_3D, blendTexture);
    let passShader = this.passThroughShader;
    passShader.use(this.gl);
    this.gl.uniform1i(passShader.uniforms["in3D"], 2);
    for (let i = 0; i < this.back.dims[3]; i++) {
      let coordZ = 1 / this.back.dims[3] * (i + 0.5);
      this.gl.uniform1f(passShader.uniforms["coordZ"], coordZ);
      this.gl.framebufferTextureLayer(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, blendTexture, 0, i);
      this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 5, 4);
    }
  } else
    blendTexture = this.rgbaTex(blendTexture, this.gl.TEXTURE5, [2, 2, 2, 2]);
  orientShader.use(this.gl);
  this.gl.activeTexture(this.gl.TEXTURE1);
  this.gl.bindTexture(this.gl.TEXTURE_2D, this.colormapTexture);
  this.gl.uniform1f(orientShader.uniforms["cal_min"], overlayItem.cal_min);
  this.gl.uniform1f(orientShader.uniforms["cal_max"], overlayItem.cal_max);
  this.gl.bindTexture(this.gl.TEXTURE_3D, tempTex3D);
  this.gl.uniform1i(orientShader.uniforms["intensityVol"], 6);
  this.gl.uniform1i(orientShader.uniforms["blend3D"], 5);
  this.gl.uniform1i(orientShader.uniforms["colormap"], 1);
  this.gl.uniform1f(orientShader.uniforms["layer"], layer);
  this.gl.uniform1f(orientShader.uniforms["numLayers"], numLayers);
  this.gl.uniform1f(orientShader.uniforms["scl_inter"], hdr.scl_inter);
  this.gl.uniform1f(orientShader.uniforms["scl_slope"], hdr.scl_slope);
  this.gl.uniform1f(orientShader.uniforms["opacity"], opacity);
  this.gl.uniformMatrix4fv(orientShader.uniforms["mtx"], false, mtx);
  log.debug("back dims: ", this.back.dims);
  for (let i = 0; i < this.back.dims[3]; i++) {
    let coordZ = 1 / this.back.dims[3] * (i + 0.5);
    this.gl.uniform1f(orientShader.uniforms["coordZ"], coordZ);
    this.gl.framebufferTextureLayer(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, outTexture, 0, i);
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 5, 4);
  }
  this.gl.deleteTexture(tempTex3D);
  this.gl.deleteTexture(blendTexture);
  this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
  this.gl.deleteFramebuffer(fb);
  this.sliceShader.use(this.gl);
  this.gl.uniform1f(this.sliceShader.uniforms["overlays"], this.overlays);
  this.renderShader.use(this.gl);
  let slicescl = this.sliceScale();
  let vox = slicescl.vox;
  let volScale = slicescl.volScale;
  this.gl.uniform1f(this.renderShader.uniforms["overlays"], this.overlays);
  this.gl.uniform1f(this.renderShader.uniforms["backOpacity"], this.volumes[0].opacity);
  this.gl.uniform4fv(this.renderShader.uniforms["clipPlane"], this.scene.clipPlane);
  this.gl.uniform3fv(this.renderShader.uniforms["texVox"], vox);
  this.gl.uniform3fv(this.renderShader.uniforms["volScale"], volScale);
  this.volumeObject3D.pickingShader.use(this.gl);
  this.gl.uniform3fv(this.volumeObject3D.pickingShader.uniforms["texVox"], vox);
};
Niivue.prototype.colorMaps = function(sort = true) {
  let cm = [];
  for (const [key] of Object.entries(cmaps)) {
    cm.push(key);
  }
  return sort === true ? cm.sort() : cm;
};
Niivue.prototype.setColorMap = function(id, colorMap) {
  let idx = this.getVolumeIndexByID(id);
  this.volumes[idx].colorMap = colorMap;
  this.updateGLVolume();
};
Niivue.prototype.colormapFromKey = function(name) {
  let availMaps = this.colorMaps();
  for (let i = 0; i < availMaps.length; i++) {
    let key = availMaps[i];
    if (name.toLowerCase() === key.toLowerCase()) {
      return cmaps[key];
    }
  }
};
Niivue.prototype.colormap = function(lutName = "") {
  let defaultLutName = "gray";
  let availMaps = this.colorMaps();
  for (let i = 0; i < availMaps.length; i++) {
    let key = availMaps[i];
    if (lutName.toLowerCase() === key.toLowerCase()) {
      return this.makeLut(cmaps[key].R, cmaps[key].G, cmaps[key].B, cmaps[key].A, cmaps[key].I);
    }
  }
  return this.makeLut(cmaps[defaultLutName].R, cmaps[defaultLutName].G, cmaps[defaultLutName].B, cmaps[defaultLutName].A, cmaps[defaultLutName].I);
};
Niivue.prototype.refreshColormaps = function() {
  let nLayer = this.volumes.length;
  if (nLayer < 1)
    return;
  if (this.colormapTexture !== null)
    this.gl.deleteTexture(this.colormapTexture);
  this.colormapTexture = this.gl.createTexture();
  this.gl.activeTexture(this.gl.TEXTURE1);
  this.gl.bindTexture(this.gl.TEXTURE_2D, this.colormapTexture);
  this.gl.texStorage2D(this.gl.TEXTURE_2D, 1, this.gl.RGBA8, 256, nLayer);
  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_R, this.gl.CLAMP_TO_EDGE);
  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
  this.gl.pixelStorei(this.gl.UNPACK_ALIGNMENT, 1);
  let luts = this.colormap(this.volumes[0].colorMap);
  if (nLayer > 1) {
    for (let i = 1; i < nLayer; i++) {
      let lut = this.colormap(this.volumes[i].colorMap);
      let c = new Uint8ClampedArray(luts.length + lut.length);
      c.set(luts);
      c.set(lut, luts.length);
      luts = c;
    }
  }
  this.gl.texSubImage2D(this.gl.TEXTURE_2D, 0, 0, 0, 256, nLayer, this.gl.RGBA, this.gl.UNSIGNED_BYTE, luts);
  return this;
};
Niivue.prototype.makeLut = function(Rs, Gs, Bs, As, Is) {
  var lut = new Uint8ClampedArray(256 * 4);
  for (var i = 0; i < Is.length - 1; i++) {
    var idxLo = Is[i];
    var idxHi = Is[i + 1];
    var idxRng = idxHi - idxLo;
    var k = idxLo * 4;
    for (var j = idxLo; j <= idxHi; j++) {
      var f = (j - idxLo) / idxRng;
      lut[k++] = Rs[i] + f * (Rs[i + 1] - Rs[i]);
      lut[k++] = Gs[i] + f * (Gs[i + 1] - Gs[i]);
      lut[k++] = Bs[i] + f * (Bs[i + 1] - Bs[i]);
      lut[k++] = As[i] + f * (As[i + 1] - As[i]);
    }
  }
  return lut;
};
Niivue.prototype.sliceScale = function() {
  var dims = [
    1,
    this.back.dims[1] * this.back.pixDims[1],
    this.back.dims[2] * this.back.pixDims[2],
    this.back.dims[3] * this.back.pixDims[3]
  ];
  var longestAxis = Math.max(dims[1], Math.max(dims[2], dims[3]));
  var volScale = [
    dims[1] / longestAxis,
    dims[2] / longestAxis,
    dims[3] / longestAxis
  ];
  var vox = [this.back.dims[1], this.back.dims[2], this.back.dims[3]];
  return { volScale, vox };
};
Niivue.prototype.mouseClick = function(x, y, posChange = 0, isDelta = true) {
  var posNow;
  var posFuture;
  this.canvas.focus();
  if (this.sliceType === this.sliceTypeRender) {
    if (posChange === 0)
      return;
    if (posChange > 0)
      this.volScaleMultiplier = Math.min(2, this.volScaleMultiplier * 1.1);
    if (posChange < 0)
      this.volScaleMultiplier = Math.max(0.5, this.volScaleMultiplier * 0.9);
    this.drawScene();
    return;
  }
  if (this.numScreenSlices < 1 || this.gl.canvas.height < 1 || this.gl.canvas.width < 1)
    return;
  for (let i = 0; i < this.numScreenSlices; i++) {
    var axCorSag = this.screenSlices[i].axCorSag;
    if (axCorSag > this.sliceTypeSagittal)
      continue;
    var ltwh = this.screenSlices[i].leftTopWidthHeight;
    let isMirror = false;
    if (ltwh[2] < 0) {
      isMirror = true;
      ltwh[0] += ltwh[2];
      ltwh[2] = -ltwh[2];
    }
    var fracX = (x - ltwh[0]) / ltwh[2];
    if (isMirror)
      fracX = 1 - fracX;
    var fracY = 1 - (y - ltwh[1]) / ltwh[3];
    if (fracX >= 0 && fracX < 1 && fracY >= 0 && fracY < 1) {
      if (!isDelta) {
        this.scene.crosshairPos[2 - axCorSag] = posChange;
        this.drawScene();
        return;
      }
      if (posChange !== 0) {
        posNow = this.scene.crosshairPos[2 - axCorSag];
        posFuture = posNow + posChange;
        if (posFuture > 1)
          posFuture = 1;
        if (posFuture < 0)
          posFuture = 0;
        this.scene.crosshairPos[2 - axCorSag] = posFuture;
        this.drawScene();
        this.scene.location$.next({
          mm: this.frac2mm(this.scene.crosshairPos),
          vox: this.frac2vox(this.scene.crosshairPos),
          frac: this.scene.crosshairPos,
          values: this.volumes.map((v, index) => {
            let mm = this.frac2mm(this.scene.crosshairPos);
            let vox = v.mm2vox(mm);
            let val = v.getValue(...vox);
            return val;
          })
        });
        return;
      }
      if (axCorSag === this.sliceTypeAxial) {
        this.scene.crosshairPos[0] = fracX;
        this.scene.crosshairPos[1] = fracY;
      }
      if (axCorSag === this.sliceTypeCoronal) {
        this.scene.crosshairPos[0] = fracX;
        this.scene.crosshairPos[2] = fracY;
      }
      if (axCorSag === this.sliceTypeSagittal) {
        this.scene.crosshairPos[1] = fracX;
        this.scene.crosshairPos[2] = fracY;
      }
      this.drawScene();
      this.scene.location$.next({
        mm: this.frac2mm(this.scene.crosshairPos),
        vox: this.frac2vox(this.scene.crosshairPos),
        frac: this.scene.crosshairPos,
        values: this.volumes.map((v, index) => {
          let mm = this.frac2mm(this.scene.crosshairPos);
          let vox = v.mm2vox(mm);
          let val = v.getValue(...vox);
          return val;
        })
      });
      return;
    } else {
      if (x === null && y === null) {
        this.scene.crosshairPos[2 - axCorSag] = posChange;
        this.drawScene();
        return;
      }
    }
  }
};
Niivue.prototype.drawSelectionBox = function(leftTopWidthHeight) {
  this.lineShader.use(this.gl);
  this.gl.uniform4fv(this.lineShader.uniforms["lineColor"], this.opts.selectionBoxColor);
  this.gl.uniform2fv(this.lineShader.uniforms["canvasWidthHeight"], [
    this.gl.canvas.width,
    this.gl.canvas.height
  ]);
  this.gl.uniform4f(this.lineShader.uniforms["leftTopWidthHeight"], leftTopWidthHeight[0], leftTopWidthHeight[1], leftTopWidthHeight[2], leftTopWidthHeight[3]);
  this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 5, 4);
};
Niivue.prototype.drawColorbar = function(leftTopWidthHeight) {
  if (leftTopWidthHeight[2] <= 0 || leftTopWidthHeight[3] <= 0)
    return;
  this.colorbarShader.use(this.gl);
  this.gl.activeTexture(this.gl.TEXTURE1);
  this.gl.bindTexture(this.gl.TEXTURE_2D, this.colormapTexture);
  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
  this.gl.uniform2fv(this.colorbarShader.uniforms["canvasWidthHeight"], [
    this.gl.canvas.width,
    this.gl.canvas.height
  ]);
  this.gl.uniform4f(this.colorbarShader.uniforms["leftTopWidthHeight"], leftTopWidthHeight[0], leftTopWidthHeight[1], leftTopWidthHeight[2], leftTopWidthHeight[3]);
  this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 5, 4);
  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
};
Niivue.prototype.textWidth = function(scale, str) {
  let w = 0;
  var bytes = new TextEncoder().encode(str);
  for (let i = 0; i < str.length; i++)
    w += scale * this.fontMets[bytes[i]].xadv;
  return w;
};
Niivue.prototype.drawChar = function(xy, scale, char) {
  let metrics2 = this.fontMets[char];
  let l = xy[0] + scale * metrics2.lbwh[0];
  let b = -(scale * metrics2.lbwh[1]);
  let w = scale * metrics2.lbwh[2];
  let h = scale * metrics2.lbwh[3];
  let t = xy[1] + (b - h) + scale;
  this.gl.uniform4f(this.fontShader.uniforms["leftTopWidthHeight"], l, t, w, h);
  this.gl.uniform4fv(this.fontShader.uniforms["uvLeftTopWidthHeight"], metrics2.uv_lbwh);
  this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 5, 4);
  return scale * metrics2.xadv;
};
Niivue.prototype.drawLoadingText = function(text) {
  this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
  this.gl.enableVertexAttribArray(0);
  this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.cuboidVertexBuffer);
  this.gl.vertexAttribPointer(0, 3, this.gl.FLOAT, false, 0, 0);
  this.gl.enable(this.gl.CULL_FACE);
  this.drawTextBelow([this.canvas.width / 2, this.canvas.height / 2], text, 3);
  this.canvas.focus();
};
Niivue.prototype.drawText = function(xy, str, scale = 1) {
  if (this.opts.textHeight <= 0)
    return;
  this.fontShader.use(this.gl);
  let size = this.opts.textHeight * this.gl.canvas.height * scale;
  this.gl.enable(this.gl.BLEND);
  this.gl.uniform2f(this.fontShader.uniforms["canvasWidthHeight"], this.gl.canvas.width, this.gl.canvas.height);
  this.gl.uniform4fv(this.fontShader.uniforms["fontColor"], this.opts.crosshairColor);
  let screenPxRange = size / this.fontMets.size * this.fontMets.distanceRange;
  screenPxRange = Math.max(screenPxRange, 1);
  this.gl.uniform1f(this.fontShader.uniforms["screenPxRange"], screenPxRange);
  var bytes = new TextEncoder().encode(str);
  for (let i = 0; i < str.length; i++)
    xy[0] += this.drawChar(xy, size, bytes[i]);
};
Niivue.prototype.drawTextRight = function(xy, str, scale = 1) {
  if (this.opts.textHeight <= 0)
    return;
  xy[1] -= 0.5 * this.opts.textHeight * this.gl.canvas.height;
  this.drawText(xy, str, scale);
};
Niivue.prototype.drawTextBelow = function(xy, str, scale = 1) {
  if (this.opts.textHeight <= 0)
    return;
  let size = this.opts.textHeight * this.gl.canvas.height * scale;
  xy[0] -= 0.5 * this.textWidth(size, str);
  this.drawText(xy, str, scale);
};
Niivue.prototype.draw2D = function(leftTopWidthHeight, axCorSag) {
  this.gl.cullFace(this.gl.FRONT);
  this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.cuboidVertexBuffer);
  this.gl.vertexAttribPointer(0, 3, this.gl.FLOAT, false, 0, 0);
  var crossXYZ = [
    this.scene.crosshairPos[0],
    this.scene.crosshairPos[1],
    this.scene.crosshairPos[2]
  ];
  if (axCorSag === this.sliceTypeCoronal)
    crossXYZ = [
      this.scene.crosshairPos[0],
      this.scene.crosshairPos[2],
      this.scene.crosshairPos[1]
    ];
  if (axCorSag === this.sliceTypeSagittal)
    crossXYZ = [
      this.scene.crosshairPos[1],
      this.scene.crosshairPos[2],
      this.scene.crosshairPos[0]
    ];
  let isMirrorLR = this.opts.isRadiologicalConvention && axCorSag < this.sliceTypeSagittal;
  this.sliceShader.use(this.gl);
  this.gl.uniform1f(this.sliceShader.uniforms["opacity"], this.backOpacity);
  this.gl.uniform1i(this.sliceShader.uniforms["axCorSag"], axCorSag);
  this.gl.uniform1f(this.sliceShader.uniforms["slice"], crossXYZ[2]);
  this.gl.uniform2fv(this.sliceShader.uniforms["canvasWidthHeight"], [
    this.gl.canvas.width,
    this.gl.canvas.height
  ]);
  if (isMirrorLR) {
    this.gl.disable(this.gl.CULL_FACE);
    leftTopWidthHeight[2] = -leftTopWidthHeight[2];
    leftTopWidthHeight[0] = leftTopWidthHeight[0] - leftTopWidthHeight[2];
  }
  this.gl.uniform4f(this.sliceShader.uniforms["leftTopWidthHeight"], leftTopWidthHeight[0], leftTopWidthHeight[1], leftTopWidthHeight[2], leftTopWidthHeight[3]);
  this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 5, 4);
  this.screenSlices[this.numScreenSlices].leftTopWidthHeight = leftTopWidthHeight;
  this.screenSlices[this.numScreenSlices].axCorSag = axCorSag;
  this.numScreenSlices += 1;
  if (this.opts.crosshairWidth <= 0)
    return;
  this.lineShader.use(this.gl);
  this.gl.uniform4fv(this.lineShader.uniforms["lineColor"], this.opts.crosshairColor);
  this.gl.uniform2fv(this.lineShader.uniforms["canvasWidthHeight"], [
    this.gl.canvas.width,
    this.gl.canvas.height
  ]);
  var xleft = leftTopWidthHeight[0] + leftTopWidthHeight[2] * crossXYZ[0];
  this.gl.uniform4f(this.lineShader.uniforms["leftTopWidthHeight"], xleft - 0.5 * this.opts.crosshairWidth, leftTopWidthHeight[1], this.opts.crosshairWidth, leftTopWidthHeight[3]);
  this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 5, 4);
  var xtop = leftTopWidthHeight[1] + leftTopWidthHeight[3] * (1 - crossXYZ[1]);
  this.gl.uniform4f(this.lineShader.uniforms["leftTopWidthHeight"], leftTopWidthHeight[0], xtop - 0.5 * this.opts.crosshairWidth, leftTopWidthHeight[2], this.opts.crosshairWidth);
  this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 5, 4);
  this.gl.enable(this.gl.CULL_FACE);
  if (isMirrorLR)
    this.drawTextRight([
      leftTopWidthHeight[0] + leftTopWidthHeight[2] + 1,
      leftTopWidthHeight[1] + 0.5 * leftTopWidthHeight[3]
    ], "R");
  else if (axCorSag < this.sliceTypeSagittal)
    this.drawTextRight([
      leftTopWidthHeight[0] + 1,
      leftTopWidthHeight[1] + 0.5 * leftTopWidthHeight[3]
    ], "L");
  if (axCorSag === this.sliceTypeAxial)
    this.drawTextBelow([
      leftTopWidthHeight[0] + 0.5 * leftTopWidthHeight[2],
      leftTopWidthHeight[1] + 1
    ], "A");
  if (axCorSag > this.sliceTypeAxial)
    this.drawTextBelow([
      leftTopWidthHeight[0] + 0.5 * leftTopWidthHeight[2],
      leftTopWidthHeight[1] + 1
    ], "S");
  this.sync();
};
Niivue.prototype.calculateMvpMatrix = function(object3D) {
  function deg2rad(deg) {
    return deg * (Math.PI / 180);
  }
  let whratio = this.gl.canvas.clientWidth / this.gl.canvas.clientHeight;
  let projectionMatrix = create$2();
  let scale = 0.7 * object3D.furthestVertexFromOrigin * 1 / this.volScaleMultiplier;
  if (whratio < 1)
    ortho(projectionMatrix, -scale, scale, -scale / whratio, scale / whratio, 0.01, scale * 8);
  else
    ortho(projectionMatrix, -scale * whratio, scale * whratio, -scale, scale, 0.01, scale * 8);
  const modelMatrix = create$2();
  modelMatrix[0] = -1;
  let translateVec3 = fromValues$1(0, 0, -scale * 1.8);
  translate(modelMatrix, modelMatrix, translateVec3);
  rotateX(modelMatrix, modelMatrix, deg2rad(270 - this.scene.renderElevation));
  rotateZ(modelMatrix, modelMatrix, deg2rad(this.scene.renderAzimuth - 180));
  let modelViewProjectionMatrix = create$2();
  multiply$1(modelViewProjectionMatrix, projectionMatrix, modelMatrix);
  return modelViewProjectionMatrix;
};
Niivue.prototype.calculateRayDirection = function(mvpMatrix) {
  var inv = create$2();
  invert(inv, mvpMatrix);
  var rayDir4 = fromValues(0, 0, -1, 1);
  transformMat4(rayDir4, rayDir4, inv);
  let rayDir = fromValues$1(rayDir4[0], rayDir4[1], rayDir4[2]);
  normalize(rayDir, rayDir);
  const tiny = 1e-5;
  if (Math.abs(rayDir[0]) < tiny)
    rayDir[0] = tiny;
  if (Math.abs(rayDir[1]) < tiny)
    rayDir[1] = tiny;
  if (Math.abs(rayDir[2]) < tiny)
    rayDir[2] = tiny;
  return rayDir;
};
Niivue.prototype.draw3D = function() {
  this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
  this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
  let m = null;
  for (const object3D of this.objectsToRender3D) {
    if (!object3D.isVisible) {
      continue;
    }
    let pickingShader = object3D.pickingShader ? object3D.pickingShader : this.pickingSurfaceShader;
    pickingShader.use(this.gl);
    if (object3D.glFlags & object3D.CULL_FACE) {
      this.gl.enable(this.gl.CULL_FACE);
      if (object3D.glFlags & object3D.CULL_FRONT) {
        this.gl.cullFace(this.gl.FRONT);
      } else {
        this.gl.cullFace(this.gl.BACK);
      }
    } else {
      this.gl.disable(this.gl.CULL_FACE);
    }
    m = this.calculateMvpMatrix(object3D);
    this.gl.uniformMatrix4fv(pickingShader.uniforms["mvpMtx"], false, m);
    if (pickingShader.rayDirUniformName) {
      let rayDir = this.calculateRayDirection(m);
      this.gl.uniform3fv(pickingShader.uniforms[pickingShader.rayDirUniformName], rayDir);
    }
    if (pickingShader.clipPlaneUniformName) {
      this.gl.uniform4fv(pickingShader.uniforms["clipPlane"], this.scene.clipPlane);
    }
    this.gl.uniform1i(pickingShader.uniforms["id"], object3D.id);
    this.gl.enableVertexAttribArray(0);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, object3D.vertexBuffer);
    this.gl.vertexAttribPointer(0, 3, this.gl.FLOAT, false, 0, 0);
    if (object3D.textureCoordinateBuffer) {
      this.gl.enableVertexAttribArray(1);
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, object3D.textureCoordinateBuffer);
      this.gl.vertexAttribPointer(1, 3, this.gl.FLOAT, false, 0, 0);
    }
    if (object3D.indexBuffer) {
      this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, object3D.indexBuffer);
    }
    this.gl.drawElements(object3D.mode, object3D.indexCount, this.gl.UNSIGNED_SHORT, 0);
    break;
  }
  const pixelX = this.mousePos[0] * this.gl.canvas.width / this.gl.canvas.clientWidth;
  const pixelY = this.gl.canvas.height - this.mousePos[1] * this.gl.canvas.height / this.gl.canvas.clientHeight - 1;
  const rgbaPixel = new Uint8Array(4);
  this.gl.readPixels(pixelX, pixelY, 1, 1, this.gl.RGBA, this.gl.UNSIGNED_BYTE, rgbaPixel);
  this.selectedObjectId = rgbaPixel[3];
  if (this.selectedObjectId === this.VOLUME_ID) {
    this.scene.crosshairPos = new Float32Array(rgbaPixel.slice(0, 3)).map((x) => x / 255);
  }
  this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
  this.gl.clearColor(0.2, 0, 0, 1);
  for (const object3D of this.objectsToRender3D) {
    if (!object3D.isVisible) {
      continue;
    }
    this.gl.enableVertexAttribArray(0);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, object3D.vertexBuffer);
    this.gl.vertexAttribPointer(0, 3, this.gl.FLOAT, false, 0, 0);
    if (object3D.textureCoordinateBuffer) {
      this.gl.enableVertexAttribArray(1);
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, object3D.textureCoordinateBuffer);
      this.gl.vertexAttribPointer(1, 3, this.gl.FLOAT, false, 0, 0);
    }
    if (object3D.indexBuffer) {
      this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, object3D.indexBuffer);
    }
    if (object3D.glFlags & object3D.BLEND) {
      this.gl.enable(this.gl.BLEND);
      this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
    } else {
      this.gl.disable(this.gl.BLEND);
    }
    if (object3D.glFlags & object3D.CULL_FACE) {
      this.gl.enable(this.gl.CULL_FACE);
      if (object3D.glFlags & object3D.CULL_FRONT) {
        this.gl.cullFace(this.gl.FRONT);
      } else {
        this.gl.cullFace(this.gl.FRONT);
      }
    } else {
      this.gl.disable(this.gl.CULL_FACE);
    }
    m = this.calculateMvpMatrix(object3D);
    let rayDir = this.calculateRayDirection(m);
    for (const shader of object3D.renderShaders) {
      shader.use(this.gl);
      if (shader.mvpUniformName) {
        this.gl.uniformMatrix4fv(shader.uniforms[shader.mvpUniformName], false, m);
      }
      if (shader.rayDirUniformName) {
        this.gl.uniform3fv(shader.uniforms[shader.rayDirUniformName], rayDir);
      }
      if (shader.clipPlaneUniformName) {
        this.gl.uniform4fv(shader.uniforms["clipPlane"], this.scene.clipPlane);
      }
      this.gl.drawElements(object3D.mode, object3D.indexCount, this.gl.UNSIGNED_SHORT, 0);
    }
    break;
  }
  let posString = "azimuth: " + this.scene.renderAzimuth.toFixed(0) + " elevation: " + this.scene.renderElevation.toFixed(0);
  this.sync();
  return posString;
};
Niivue.prototype.mm2frac = function(mm, volIdx = 0) {
  let mm4 = fromValues(mm[0], mm[1], mm[2], 1);
  let d = this.volumes[volIdx].hdr.dims;
  let frac = [0, 0, 0];
  if (typeof d === "undefined") {
    return frac;
  }
  if (d[1] < 1 || d[2] < 1 || d[3] < 1)
    return frac;
  let sform = clone(this.volumes[volIdx].matRAS);
  transpose(sform, sform);
  invert(sform, sform);
  transformMat4(mm4, mm4, sform);
  frac[0] = (mm4[0] + 0.5) / d[1];
  frac[1] = (mm4[1] + 0.5) / d[2];
  frac[2] = (mm4[2] + 0.5) / d[3];
  return frac;
};
Niivue.prototype.vox2frac = function(vox, volIdx = 0) {
  let frac = [
    (vox[0] + 0.5) / this.volumes[volIdx].hdr.dims[1],
    (vox[1] + 0.5) / this.volumes[volIdx].hdr.dims[2],
    (vox[2] + 0.5) / this.volumes[volIdx].hdr.dims[3]
  ];
  return frac;
};
Niivue.prototype.frac2vox = function(frac, volIdx = 0) {
  let vox = [
    Math.round(frac[0] * this.volumes[volIdx].hdr.dims[1] - 0.5),
    Math.round(frac[1] * this.volumes[volIdx].hdr.dims[2] - 0.5),
    Math.round(frac[2] * this.volumes[volIdx].hdr.dims[3] - 0.5)
  ];
  return vox;
};
Niivue.prototype.frac2mm = function(frac, volIdx = 0) {
  let pos = fromValues(frac[0], frac[1], frac[2], 1);
  let dim = fromValues(this.volumes[volIdx].hdr.dims[1], this.volumes[volIdx].hdr.dims[2], this.volumes[volIdx].hdr.dims[3], 1);
  let sform = clone(this.volumes[volIdx].matRAS);
  transpose(sform, sform);
  mul(pos, pos, dim);
  let shim = fromValues(-0.5, -0.5, -0.5, 0);
  add(pos, pos, shim);
  transformMat4(pos, pos, sform);
  return pos;
};
Niivue.prototype.canvasPos2frac = function(canvasPos) {
  let x, y, z;
  for (let i = 0; i < this.numScreenSlices; i++) {
    var axCorSag = this.screenSlices[i].axCorSag;
    if (axCorSag > this.sliceTypeSagittal)
      continue;
    var ltwh = this.screenSlices[i].leftTopWidthHeight;
    let isMirror = false;
    if (ltwh[2] < 0) {
      isMirror = true;
      ltwh[0] += ltwh[2];
      ltwh[2] = -ltwh[2];
    }
    var fracX = (canvasPos[0] - ltwh[0]) / ltwh[2];
    if (isMirror) {
      fracX = 1 - fracX;
    }
    var fracY = 1 - (canvasPos[1] - ltwh[1]) / ltwh[3];
    if (fracX >= 0 && fracX < 1 && fracY >= 0 && fracY < 1) {
      switch (axCorSag) {
        case this.sliceTypeAxial:
          break;
        case this.sliceTypeCoronal:
          break;
      }
      if (axCorSag === this.sliceTypeAxial) {
        x = fracX;
        y = fracY;
        z = this.scene.crosshairPos[2];
      }
      if (axCorSag === this.sliceTypeCoronal) {
        x = fracX;
        y = this.scene.crosshairPos[1];
        z = fracY;
      }
      if (axCorSag === this.sliceTypeSagittal) {
        x = this.scene.crosshairPos[0];
        y = fracX;
        z = fracY;
      }
      break;
    }
  }
  return [x, y, z];
};
Niivue.prototype.scaleSlice = function(w, h) {
  let scalePix = this.gl.canvas.clientWidth / w;
  if (h * scalePix > this.gl.canvas.clientHeight)
    scalePix = this.gl.canvas.clientHeight / h;
  let wPix = w * scalePix;
  let hPix = h * scalePix;
  let leftTopWidthHeight = [
    (this.gl.canvas.clientWidth - wPix) * 0.5,
    (this.gl.canvas.clientHeight - hPix) * 0.5,
    wPix,
    hPix
  ];
  return leftTopWidthHeight;
};
Niivue.prototype.drawScene = function() {
  if (!this.initialized) {
    return;
  }
  this.gl.clearColor(this.opts.backColor[0], this.opts.backColor[1], this.opts.backColor[2], this.opts.backColor[3]);
  this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  let posString = "";
  if (this.volumes.length === 0 || typeof this.volumes[0].dims === "undefined") {
    this.drawLoadingText(this.loadingText);
    return;
  }
  if (this.sliceType === this.sliceTypeRender)
    return this.draw3D();
  let { volScale } = this.sliceScale();
  this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
  this.numScreenSlices = 0;
  if (this.sliceType === this.sliceTypeAxial) {
    let leftTopWidthHeight = this.scaleSlice(volScale[0], volScale[1]);
    this.draw2D(leftTopWidthHeight, 0);
  } else if (this.sliceType === this.sliceTypeCoronal) {
    let leftTopWidthHeight = this.scaleSlice(volScale[0], volScale[2]);
    this.draw2D(leftTopWidthHeight, 1);
  } else if (this.sliceType === this.sliceTypeSagittal) {
    let leftTopWidthHeight = this.scaleSlice(volScale[1], volScale[2]);
    this.draw2D(leftTopWidthHeight, 2);
  } else {
    let ltwh = this.scaleSlice(volScale[0] + volScale[1], volScale[1] + volScale[2]);
    let wX = ltwh[2] * volScale[0] / (volScale[0] + volScale[1]);
    let ltwh3x1 = this.scaleSlice(volScale[0] + volScale[0] + volScale[1], Math.max(volScale[1], volScale[2]));
    let wX1 = ltwh3x1[2] * volScale[0] / (volScale[0] + volScale[0] + volScale[1]);
    if (wX1 > wX) {
      let pixScale = wX1 / volScale[0];
      let hY1 = volScale[1] * pixScale;
      let hZ1 = volScale[2] * pixScale;
      this.draw2D([ltwh3x1[0], ltwh3x1[1], wX1, hY1], 0);
      this.draw2D([ltwh3x1[0] + wX1, ltwh3x1[1], wX1, hZ1], 1);
      this.draw2D([ltwh3x1[0] + wX1 + wX1, ltwh3x1[1], hY1, hZ1], 2);
    } else {
      let wY = ltwh[2] - wX;
      let hY = ltwh[3] * volScale[1] / (volScale[1] + volScale[2]);
      let hZ = ltwh[3] - hY;
      this.draw2D([ltwh[0], ltwh[1] + hZ, wX, hY], 0);
      this.draw2D([ltwh[0], ltwh[1], wX, hZ], 1);
      this.draw2D([ltwh[0] + wX, ltwh[1], wY, hZ], 2);
      var margin = this.opts.colorBarMargin * hY;
      this.drawColorbar([
        ltwh[0] + wX + margin,
        ltwh[1] + hZ + margin,
        wY - margin - margin,
        hY * this.opts.colorbarHeight
      ]);
    }
  }
  if (this.isDragging && this.sliceType !== this.sliceTypeRender) {
    let width = Math.abs(this.dragStart[0] - this.dragEnd[0]);
    let height = Math.abs(this.dragStart[1] - this.dragEnd[1]);
    this.drawSelectionBox([
      Math.min(this.dragStart[0], this.dragEnd[0]),
      Math.min(this.dragStart[1], this.dragEnd[1]),
      width,
      height
    ]);
  }
  const pos = this.frac2mm([
    this.scene.crosshairPos[0],
    this.scene.crosshairPos[1],
    this.scene.crosshairPos[2]
  ]);
  posString = pos[0].toFixed(2) + "\xD7" + pos[1].toFixed(2) + "\xD7" + pos[2].toFixed(2);
  this.gl.finish();
  return posString;
};
export { NVImage, Niivue };
