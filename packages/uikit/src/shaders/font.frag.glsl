#version 300 es
precision highp int;
precision highp float;
uniform highp sampler2D fontTexture;
uniform vec4 fontColor;
uniform vec4 outlineColor;
uniform float screenPxRange;
uniform bool isOutline;
in vec2 vUV;
out vec4 color;
float median(float r, float g, float b) {
        return max(min(r, g), min(max(r, g), b));
}
void main() {
        // distances are stored with 1.0 meaning "inside" and 0.0 meaning "outside"
        vec4 distances = texture(fontTexture, vUV);
        float d_msdf = median(distances.r, distances.g, distances.b);
        float screenPxDistance = screenPxRange * (d_msdf - 0.5);

        float fontOpacity = clamp(screenPxDistance + 0.5, 0.0, 1.0) * fontColor.a;
        if (!isOutline) {
                color = vec4(fontColor.rgb, fontOpacity);
                return;
        }
        float u_outline_width_absolute = 0.33333;
        float u_outline_width_relative = 0.05;
        float d_sdf = distances.a; // mtsdf format only
        d_msdf = min(d_msdf, d_sdf + 0.1);  // HACK: to fix glitch in msdf near edges
        // blend between sharp and rounded corners
        float d_edge = mix(d_msdf, d_sdf, 0.0);
        float outerOpacity = screenPxRange * (d_edge - 0.5 + u_outline_width_relative) + 0.75 + u_outline_width_absolute;
        outerOpacity = clamp(outerOpacity, 0.0, 1.0);
        color = vec4(mix(outlineColor.rgb, fontColor.rgb, fontOpacity), outerOpacity);
}