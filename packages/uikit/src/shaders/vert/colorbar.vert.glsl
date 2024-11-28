#version 300 es
#line 490

layout(location = 0) in vec3 pos;

uniform vec2 canvasWidthHeight;
uniform vec4 leftTopWidthHeight;

out vec2 vColor;

void main(void) {
  // Convert pixel x,y space to WebGL coordinate system
  vec2 frac;
  frac.x = (leftTopWidthHeight.x + (pos.x * leftTopWidthHeight.z)) / canvasWidthHeight.x;
  frac.y = 1.0 - ((leftTopWidthHeight.y + ((1.0 - pos.y) * leftTopWidthHeight.w)) / canvasWidthHeight.y);
  frac = (frac * 2.0) - 1.0;
  gl_Position = vec4(frac, 0.0, 1.0);
  vColor = pos.xy;
}
