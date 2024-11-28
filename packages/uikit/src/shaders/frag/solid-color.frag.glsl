#version 300 es
precision highp int;
precision highp float;
uniform vec4 lineColor;
out vec4 color;

void main() {
    color = lineColor;
}
