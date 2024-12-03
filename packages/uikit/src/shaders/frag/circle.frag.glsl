#version 300 es
precision highp int;
precision highp float;

uniform vec4 circleColor;
uniform float fillPercent;

in vec2 vUV;
out vec4 color;

void main() {
  // Check if the pixel is inside the circle and color it
  float distance = length(vUV - vec2(0.5, 0.5));
  if (distance < 0.5 && distance >= (1.0 - fillPercent) / 2.0) {
    color = circleColor;//vec4(circleColor.r, circleColor.g, circleColor.b, circleColor.a);
  } else {
    discard;
  }
}
