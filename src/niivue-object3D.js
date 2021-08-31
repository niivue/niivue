import * as mat from "gl-matrix";

export var NiivueObject3D = function (id, vertexBuffer, mode, indexCount) {
  this.BLEND = 1;
  this.CULL_FACE = 2;
  this.CULL_FRONT = 4;
  this.CULL_BACK = 8;
  this.ENABLE_DEPTH_TEST = 16;

  this.shaders = [];
  this.isVisible = true;
  this.vertexBuffer = vertexBuffer;
  this.indexCount = indexCount;
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
};
