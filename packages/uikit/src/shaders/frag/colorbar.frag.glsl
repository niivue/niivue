#version 300 es
#line 506

precision highp int;
precision highp float;

uniform highp sampler2D colormap;
uniform float layer;

in vec2 vColor;
out vec4 color;

void main() {
  float nlayer = float(textureSize(colormap, 0).y);
  float fmap = (0.5 + layer) / nlayer;
  color = vec4(texture(colormap, vec2(vColor.x, fmap)).rgb, 1.0);
}
