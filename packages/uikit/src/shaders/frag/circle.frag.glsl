#version 300 es
precision highp int;
precision highp float;

uniform vec4 circleColor;
uniform float fillPercent;

in vec2 vUV;
out vec4 color;

void main() {
float radius = 0.5;
float innerRadius = (1.0 - fillPercent) / 2.0;
vec2 center = vec2(0.5, 0.5);
float dist = length(vUV - center);
float pixelWidth = fwidth(dist);

float alphaOuter = smoothstep(radius, radius - pixelWidth, dist);
float alpha = alphaOuter;

if (fillPercent < 1.0) {
float alphaInner = smoothstep(innerRadius, innerRadius + pixelWidth, dist);
alpha *= alphaInner;
}

if (alpha <= 0.0) discard;
color = vec4(circleColor.rgb, circleColor.a * alpha);
color.r = 0.0;
}