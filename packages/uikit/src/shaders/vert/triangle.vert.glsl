#version 300 es
precision highp float;

in vec2 a_position;  // The vertex position in 2D coordinates
uniform float u_z;

void main() {
    // Set the position of the vertex in clip space
    gl_Position = vec4(a_position, u_z, 1.0);
}
