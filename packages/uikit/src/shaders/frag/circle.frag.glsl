#version 300 es
precision highp int;
precision highp float;

uniform vec4 circleColor;
uniform float fillPercent;

in vec2 vUV;
out vec4 color;

// Anti-aliased disk / ring using the msdfgen "screenPxRange" pattern, but with
// a procedural signed-distance field instead of a sampled MSDF texture. The
// SDF is exact (length of a vec2 minus radius), so the analogue of
// screenPxRange is 1 / fwidth(sd): exactly one device pixel of feathering at
// the boundary, independent of CSS pixel ratio or canvas zoom. This matches
// fragFontShader's clamp(screenPxRange * (sd - 0.5) + 0.5, 0, 1) exactly when
// screenPxRange == 1 / fwidth.
//
// fillPercent in [0, 1] controls the inner hole radius so the same shader
// renders both the filled thumb (fillPercent = 1.0) and the thin ring border
// (fillPercent < 1.0) UIKSlider uses on top.
void main() {
    const float radius = 0.5;
    const vec2 center = vec2(0.5, 0.5);
    float innerRadius = (1.0 - fillPercent) * 0.5;

    float dist = length(vUV - center);

    // Outer edge: positive inside the disk, negative outside.
    float sdOuter = radius - dist;
    float aaOuter = max(fwidth(sdOuter), 1e-6);
    float alpha = clamp(sdOuter / aaOuter + 0.5, 0.0, 1.0);

    // Inner edge (ring only): positive in the ring, negative in the hole.
    if (fillPercent < 1.0) {
        float sdInner = dist - innerRadius;
        float aaInner = max(fwidth(sdInner), 1e-6);
        alpha *= clamp(sdInner / aaInner + 0.5, 0.0, 1.0);
    }

    if (alpha <= 0.0) discard;
    color = vec4(circleColor.rgb, circleColor.a * alpha);
}
