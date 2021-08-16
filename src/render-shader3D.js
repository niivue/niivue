export var RenderShader3D = function (shader) {
  this.shader = shader;
  this.uniforms = shader.uniforms;
  this.mvpUniformName = "";
  this.clipPlaneUniformName = "";
  this.rayDirUniformName = "";
};

RenderShader3D.prototype.use = function (gl) {
  return this.shader.use(gl);
};
