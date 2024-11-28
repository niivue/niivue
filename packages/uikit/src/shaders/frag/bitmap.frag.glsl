#version 300 es
precision mediump float;

in vec2 v_texcoord;             // Texture coordinates
uniform sampler2D u_texture;    // Texture sampler

out vec4 fragColor;

void main() {
  // Sample the texture and output the color
  fragColor = texture(u_texture, v_texcoord);
}
