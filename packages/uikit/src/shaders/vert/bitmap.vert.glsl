#version 300 es

layout(location = 0) in vec3 a_position; // Position attribute
layout(location = 1) in vec2 a_texcoord; // Texture coordinate attribute

uniform vec2 canvasWidthHeight;         // Canvas dimensions
uniform vec4 leftTopWidthHeight;        // Texture position and size

out vec2 v_texcoord; // Pass texture coordinates to the fragment shader

void main(void) {
  // Convert vertex positions to normalized device coordinates
  vec2 frac;
  frac.x = (leftTopWidthHeight.x + (a_position.x * leftTopWidthHeight.z)) / canvasWidthHeight.x;
  frac.y = 1.0 - ((leftTopWidthHeight.y + ((1.0 - a_position.y) * leftTopWidthHeight.w)) / canvasWidthHeight.y);
  frac = (frac * 2.0) - 1.0;

  // Set vertex position
  gl_Position = vec4(frac, 0.0, 1.0);
  
  // Pass texture coordinates
  v_texcoord = vec2(a_texcoord.x, a_texcoord.y);
}
