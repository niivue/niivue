#version 300 es
precision highp float;

uniform vec4 u_color;         // RGBA color for the triangle
uniform float u_antialiasing; // Antialiasing width in pixels
uniform vec2 u_canvasSize;    // Canvas size in pixels

out vec4 fragColor;

void main() {
    // Convert u_antialiasing from pixels to normalized device coordinates
    float aa_ndc = u_antialiasing / u_canvasSize.x; // Assume square aspect ratio for simplicity

    // Smooth alpha based on edge distance in NDC
    float alpha = smoothstep(1.0 - aa_ndc, 1.0, gl_FragCoord.x);

    // Set the fragment color with the blended alpha
    fragColor = vec4(u_color.rgb, u_color.a * alpha);
}
