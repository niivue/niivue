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
  let start = mat.vec3.fromValues(xyzMin[0], xyzMM[1], xyzMM[2]);
  let dest = mat.vec3.fromValues(xyzMax[0], xyzMM[1], xyzMM[2]);
  NiivueObject3D.makeCylinder(
    vertices,
    indices,
    start,
    dest,
    radius,
    sides
    );
  start = mat.vec3.fromValues(xyzMM[0], xyzMin[1], xyzMM[2]);
  dest = mat.vec3.fromValues(xyzMM[0], xyzMax[1], xyzMM[2]);
  NiivueObject3D.makeCylinder(
    vertices,
    indices,
    start,
    dest,
    radius,
    sides
    );
  start = mat.vec3.fromValues(xyzMM[0], xyzMM[1], xyzMin[2]);
  dest = mat.vec3.fromValues(xyzMM[0], xyzMM[1], xyzMax[2]);
  NiivueObject3D.makeCylinder(
    vertices,
    indices,
    start,
    dest,
    radius,
    sides
    );
  //console.log('i:',indices.length / 3, 'v:',vertices.length / 3);

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

NiivueObject3D.getFirstPerpVector = function (v1) {
  let v2 = mat.vec3.fromValues(0.0, 0.0, 0.0);
  if (v1[0] === 0.0)
    v2[0] = 1.0;
  else if (v1[1] === 0.0)
    v2[1] = 1.0;
  else if (v1[2] === 0.0)
    v2[2] = 1.0;
  else {
   // If xyz is all set, we set the z coordinate as first and second argument .
   // As the scalar product must be zero, we add the negated sum of x and y as third argument
   v2[0] = v1[2];      //scalp = z*x
   v2[1] = v1[2];      //scalp = z*(x+y)
   v2[2] = -(v1[0]+v1[1]); //scalp = z*(x+y)-z*(x+y) = 0
   mat.vec3.normalize(v2, v2);
  }
  return v2;
};

NiivueObject3D.makeCylinder = function (
  vertices,
  indices,
  start,
  dest,
  radius,
  sides = 20
) {
  if (sides < 3) sides = 3; //prism is minimal 3D cylinder
  let v1 = mat.vec3.create();
  mat.vec3.subtract(v1, dest, start);
  mat.vec3.normalize(v1, v1); //principle axis of cylinder
  let v2 = NiivueObject3D.getFirstPerpVector(v1);//a unit length vector orthogonal to v1
  // Get the second perp vector by cross product
  let v3 = mat.vec3.create();
  mat.vec3.cross(v3, v1, v2); //a unit length vector orthogonal to v1 and v2
  mat.vec3.normalize(v3, v3);
  let num_v = 2 * sides;
  let num_f = 2 * sides;
  let endcaps = true;
  if (endcaps) {
    num_f += 2 * sides;
    num_v += 2;
  }
  let idx0 = Math.floor(vertices.length/3); //first new vertex will be AFTER previous vertices
  let idx =  new Uint16Array(num_f * 3);
  let vtx =  new Float32Array(num_v * 3);
  function setV(i, vec3) {
    vtx[(i*3)+0] = vec3[0];
    vtx[(i*3)+1] = vec3[1];
    vtx[(i*3)+2] = vec3[2];
  }
  function setI(i, a, b, c) {
    idx[(i*3)+0] = a+idx0;
    idx[(i*3)+1] = b+idx0;
    idx[(i*3)+2] = c+idx0;
  }
  let startPole = 2 * sides;
  let destPole = startPole + 1;
  if (endcaps) {
    setV(startPole, start);
    setV(destPole, dest);
  }
  let pt1 = mat.vec3.create();
  let pt2 = mat.vec3.create();
  for (let i = 0; i < sides; i ++) {
      let c =  Math.cos(i/sides * 2 * Math.PI);
      let s =  Math.sin(i/sides * 2 * Math.PI);
      pt1[0] = (radius * (c * v2[0]+ s *v3[0]));
      pt1[1] = (radius * (c * v2[1]+ s *v3[1]));
      pt1[2] = (radius * (c * v2[2]+ s *v3[2]));
      mat.vec3.add(pt2, start, pt1);
      setV(i, pt2);
      mat.vec3.add(pt2, dest, pt1);
      setV(i + sides, pt2);
      let nxt = 0;
      if (i < (sides-1))
        nxt = i + 1;
      setI(i * 2,  i,  nxt, i + sides);
      setI((i * 2)+1, nxt,  nxt + sides, i + sides);
      if (endcaps) {
        setI((sides*2)+i, i, startPole, nxt);
        setI((sides*2)+i+sides, destPole, i + sides, nxt + sides);
      }
  }
  indices.push(...idx);
  vertices.push(...vtx);
}
