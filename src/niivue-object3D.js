import * as mat from "gl-matrix";

export var NiivueObject3D = function (
  id,
  vertexBuffer,
  mode,
  indexCount,
  indexBuffer = null,
  textureCoordinateBuffer = null
) {
  this.BLEND = 1;
  this.CULL_FACE = 2;
  this.CULL_FRONT = 4;
  this.CULL_BACK = 8;
  this.ENABLE_DEPTH_TEST = 16;

  this.renderShaders = [];
  this.pickingShader = null;
  this.isVisible = true;
  this.isPickable = true;
  this.vertexBuffer = vertexBuffer;
  this.indexCount = indexCount;
  this.indexBuffer = indexBuffer;
  this.textureCoordinateBuffer = textureCoordinateBuffer;
  this.mode = mode;

  this.glFlags = 0;
  this.id = id;
  this.colorId = [
    ((id >> 0) & 0xff) / 255.0,
    ((id >> 8) & 0xff) / 255.0,
    ((id >> 16) & 0xff) / 255.0,
    ((id >> 24) & 0xff) / 255.0,
  ];

  this.modelMatrix = mat.mat4.create();
  this.scale = [1, 1, 1];
  this.position = [0, 0, 0];
  this.rotation = [0, 0, 0];
  this.rotationRadians = 0.0;

  this.extentsMin = [];
  this.extentsMax = [];
};

NiivueObject3D.generateCrosshairs = function (
  gl,
  id,
    xyzMM,
    xyzMin,
    xyzMax,
  radius,
  sides = 20
) {
  let geometry = this.generateCrosshairsGeometry(
    gl,
    xyzMM,
    xyzMin,
    xyzMax,
    radius,
    sides
  );
  return new NiivueObject3D(
    id,
    geometry.vertexBuffer,
    gl.TRIANGLES,
    geometry.indexCount,
    geometry.indexBuffer
  );
};

// not included in public docs
NiivueObject3D.generateCrosshairsGeometry = function (
  gl,
    xyzMM,
    xyzMin,
    xyzMax,
  radius,
  sides = 20
) {
  let vertices = [];
  let indices = [];

  // this.makeCrosshairs(radius, indices, vertices, sides);
  NiivueObject3D.makeCylinder(
    vertices,
    indices,
    0,
    xyzMM,
    xyzMin,
    xyzMax,
    radius,
    sides
  );
  NiivueObject3D.makeCylinder(
    vertices,
    indices,
    2,
    xyzMM,
    xyzMin,
    xyzMax,
    radius,
    sides
  );
  NiivueObject3D.makeCylinder(
    vertices,
    indices,
    1,
    xyzMM,
    xyzMin,
    xyzMax,
    radius,
    sides
  );
  let vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  // index buffer allocated in parent class
  let indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array(indices),
    gl.STATIC_DRAW
  );

  return {
    vertexBuffer,
    indexBuffer,
    indexCount: indices.length,
  };
};

NiivueObject3D.makeCylinder = function (
  vertices,
  indices,
  axis,
    xyzMMi,
    xyzMin,
    xyzMax,
  radius,
  sides = 20
) {
  var stepTheta = (2 * Math.PI) / sides;
  var verticesPerCap = 9 * sides;
  // var radius = 0.05;
  var xyzMM = xyzMMi.slice();
  var theta = 0;
  var i = 0;
  let v0 = vertices.length;
  //default: axis = 0, X goes from far left to far right
   let constrain = 0;
   let xOffset = 1;
   let yOffset = 2;
   let zOffset = 0;
   if (axis === 0) {
   }
   if (axis === 1) { //Y goes from posterior to anteiro
      constrain = 1;
      xOffset = 0;
      yOffset = 1;
      zOffset = 2;
   }
   if (axis === 2) { //Z goes from inferior to superior
      constrain = 2;
      xOffset = 0;
      yOffset = 2;
      zOffset = 1;
   }
   
   let cylinderMin = xyzMin[constrain];
   let cylinderMax = xyzMax[constrain];
   let mm = xyzMM;
   mm[constrain] = 0;
  let vals = null;
  // Top Cap
  for (; i < verticesPerCap; i += 9) {
    vals = [];
    vals.push(radius * Math.cos(theta));
    vals.push(cylinderMax);
    vals.push(radius * Math.sin(theta));
    vertices[v0 + i] = vals[xOffset] + mm[0];
    vertices[v0 + i + 1] = vals[yOffset] + mm[1];
    vertices[v0 + i + 2] = vals[zOffset] + mm[2];
    theta += stepTheta;

    vals = [];
    vals.push(0.0);
    vals.push(cylinderMax);
    vals.push(0.0);
    vertices[v0 + i + 3] = vals[xOffset] + mm[0];
    vertices[v0 + i + 4] = vals[yOffset] + mm[1];
    vertices[v0 + i + 5] = vals[zOffset] + mm[2];

    vals = [];
    vals.push(radius * Math.cos(theta));
    vals.push(cylinderMax);
    vals.push(radius * Math.sin(theta));
    vertices[v0 + i + 6] = vals[xOffset] + mm[0];
    vertices[v0 + i + 7] = vals[yOffset] + mm[1];
    vertices[v0 + i + 8] = vals[zOffset] + mm[2];
  }

  // Bottom Cap
  theta = 0;
  for (; i < verticesPerCap * 2; i += 9) {
    vals = [];
    vals.push(radius * Math.cos(theta));
    vals.push(cylinderMin);
    vals.push(radius * Math.sin(theta));
    vertices[v0 + i + 6] = vals[xOffset] + mm[0];
    vertices[v0 + i + 7] = vals[yOffset] + mm[1];
    vertices[v0 + i + 8] = vals[zOffset] + mm[2];
    theta += stepTheta;

    vals = [];
    vals.push(0.0);
    vals.push(cylinderMin);
    vals.push(0.0);
    vertices[v0 + i + 3] = vals[xOffset] + mm[0];
    vertices[v0 + i + 4] = vals[yOffset] + mm[1];
    vertices[v0 + i + 5] = vals[zOffset] + mm[2];

    vals = [];
    vals.push(radius * Math.cos(theta));
    vals.push(cylinderMin);
    vals.push(radius * Math.sin(theta));
    vertices[v0 + i] = vals[xOffset] + mm[0];
    vertices[v0 + i + 1] = vals[yOffset] + mm[1];
    vertices[v0 + i + 2] = vals[zOffset] + mm[2];
  }

  for (var j = 0; j < sides; ++j) {
    for (let k = 0; k < 3; ++k, ++i) {
      vertices[v0 + i] = vertices[v0 + k + 9 * j];
    }
    for (let k = 0; k < 3; ++k, ++i) {
      vertices[v0 + i] = vertices[v0 + 6 + k + 9 * j];
    }
    for (let k = 0; k < 3; ++k, ++i) {
      vertices[v0 + i] = vertices[verticesPerCap + v0 + k + 9 * j];
    }

    for (let k = 0; k < 3; ++k, ++i) {
      vertices[v0 + i] = vertices[v0 + k + 9 * j];
    }
    for (let k = 0; k < 3; ++k, ++i) {
      vertices[v0 + i] = vertices[v0 + verticesPerCap + k + 9 * j];
    }
    for (let k = 0; k < 3; ++k, ++i) {
      vertices[v0 + i] = vertices[v0 + verticesPerCap + 6 + k + 9 * j];
    }
  }

  let indicesLength = indices.length;
  var indicesToAdd = new Array((vertices.length - v0) / 3);
  for (i = 0; i < indicesToAdd.length; ++i) indicesToAdd[i] = indicesLength + i;
  indices.push(...indicesToAdd);
};
