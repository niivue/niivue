#version 300 es

in vec3 position;
uniform mat4 u_transform;

out vec2 v_position;

void main() {
    gl_Position = u_transform * vec4(position, 1.0);
    // Pass position in the range [-1, 1] for use in the fragment shader
    v_position = position.xy;
    v_position = (v_position * 2.0) - 1.0;
}
