#version 300 es

layout(location = 0) in vec3 pos;

uniform vec2 canvasWidthHeight;
uniform vec4 leftTopWidthHeight;
uniform vec4 uvLeftTopWidthHeight;
uniform float z;

out vec2 vUV;

void main(void) {
  // Convert pixel x,y space to WebGL coordinate system
  vec2 frac;
  frac.x = (leftTopWidthHeight.x + (pos.x * leftTopWidthHeight.z)) / canvasWidthHeight.x;
  frac.y = 1.0 - ((leftTopWidthHeight.y + ((1.0 - pos.y) * leftTopWidthHeight.w)) / canvasWidthHeight.y);
  frac = (frac * 2.0) - 1.0;
  gl_Position = vec4(frac, z, 1.0);
  vUV = pos.xy;
}
