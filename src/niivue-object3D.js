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
  furthestVertexFromOrigin,
  radius,
  sides = 20
) {
  let geometry = this.generateCrosshairsGeometry(
    gl,
    furthestVertexFromOrigin,
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
  furthestVertexFromOrigin,
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
    furthestVertexFromOrigin,
    radius,
    sides
  );
  NiivueObject3D.makeCylinder(
    vertices,
    indices,
    1,
    furthestVertexFromOrigin,
    radius,
    sides
  );
  NiivueObject3D.makeCylinder(
    vertices,
    indices,
    2,
    furthestVertexFromOrigin,
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

// modified from https://github.com/nickdesaulniers/prims/blob/master/cylinder.js
NiivueObject3D.makeCylinder = function (
  vertices,
  indices,
  axis,
  cylinderLength,
  radius,
  sides = 20
) {
  var stepTheta = (2 * Math.PI) / sides;
  var verticesPerCap = 9 * sides;
  // var radius = 0.05;
  var theta = 0;
  var i = 0;

  let v0 = vertices.length;
  let xOffset = 0;
  let yOffset = 1;
  let zOffset = 2;
  let vals = null;

  switch (axis) {
    case 1:
      yOffset = 0;
      zOffset = 1;
      xOffset = 2;
      break;
    case 2:
      zOffset = 0;
      xOffset = 1;
      yOffset = 2;
      break;
  }

  // Top Cap
  for (; i < verticesPerCap; i += 9) {
    vals = [];
    vals.push(radius * Math.cos(theta));
    vals.push(cylinderLength);
    vals.push(radius * Math.sin(theta));
    vertices[v0 + i] = vals[xOffset];
    vertices[v0 + i + 1] = vals[yOffset];
    vertices[v0 + i + 2] = vals[zOffset];
    theta += stepTheta;

    vals = [];
    vals.push(0.0);
    vals.push(cylinderLength);
    vals.push(0.0);
    vertices[v0 + i + 3] = vals[xOffset];
    vertices[v0 + i + 4] = vals[yOffset];
    vertices[v0 + i + 5] = vals[zOffset];

    vals = [];
    vals.push(radius * Math.cos(theta));
    vals.push(cylinderLength);
    vals.push(radius * Math.sin(theta));
    vertices[v0 + i + 6] = vals[xOffset];
    vertices[v0 + i + 7] = vals[yOffset];
    vertices[v0 + i + 8] = vals[zOffset];
  }

  // Bottom Cap
  theta = 0;
  for (; i < verticesPerCap * 2; i += 9) {
    vals = [];
    vals.push(radius * Math.cos(theta));
    vals.push(-cylinderLength);
    vals.push(radius * Math.sin(theta));
    vertices[v0 + i + 6] = vals[xOffset];
    vertices[v0 + i + 7] = vals[yOffset];
    vertices[v0 + i + 8] = vals[zOffset];
    theta += stepTheta;

    vals = [];
    vals.push(0.0);
    vals.push(-cylinderLength);
    vals.push(0.0);
    vertices[v0 + i + 3] = vals[xOffset];
    vertices[v0 + i + 4] = vals[yOffset];
    vertices[v0 + i + 5] = vals[zOffset];

    vals = [];
    vals.push(radius * Math.cos(theta));
    vals.push(-cylinderLength);
    vals.push(radius * Math.sin(theta));
    vertices[v0 + i] = vals[xOffset];
    vertices[v0 + i + 1] = vals[yOffset];
    vertices[v0 + i + 2] = vals[zOffset];
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
