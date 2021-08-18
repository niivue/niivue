export var NiivueShader3D = function (shader) {
  this.shader = shader;
  this.uniforms = shader.uniforms;
  this.mvpUniformName = "";
  this.clipPlaneUniformName = "";
  this.rayDirUniformName = "";
};

NiivueShader3D.prototype.use = function (gl) {
  return this.shader.use(gl);
};
