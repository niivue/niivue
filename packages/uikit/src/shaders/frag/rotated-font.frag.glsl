#version 300 es
#line 593
precision highp int;
precision highp float;

uniform highp sampler2D fontTexture;
uniform vec4 fontColor;
uniform vec4 outlineColor;
uniform float screenPxRange;
uniform float outlineThickness;
uniform vec2 canvasWidthHeight;
uniform bool isMTSDF; // ← Add toggle for MTSDF vs MSDF

in vec2 vUV;
out vec4 color;

float median(float r, float g, float b) {
  return max(min(r, g), min(max(r, g), b));
}

// Signed distance for MTSDF
float screenDistanceFromMTSDF(vec3 msdf) {
  vec3 v = msdf * 2.0 - 1.0; // Normalize to [-1, 1]
  return length(v) * sign(median(msdf.r, msdf.g, msdf.b) - 0.5);
}

// Signed distance for MSDF
float screenDistanceFromMSDF(vec3 msdf) {
  return screenPxRange * (median(msdf.r, msdf.g, msdf.b) - 0.5);
}

void main() {
  vec3 msdf = texture(fontTexture, vUV).rgb;

  float sd = isMTSDF
    ? screenDistanceFromMTSDF(msdf)
    : screenDistanceFromMSDF(msdf);

  float outlineThicknessNDC = outlineThickness / max(canvasWidthHeight.x, canvasWidthHeight.y);
  float screenPxDistance = isMTSDF ? screenPxRange * sd : sd;

  float glyphAlpha = clamp(screenPxDistance + 0.5, 0.0, 1.0);

  float outlineEdgeStart = -outlineThicknessNDC;
  float outlineEdgeEnd = 0.0;
  float outlineAlpha = smoothstep(outlineEdgeStart - 0.01, outlineEdgeEnd + 0.01, screenPxDistance) * (1.0 - glyphAlpha);

  vec3 finalColor = mix(outlineColor.rgb, fontColor.rgb, glyphAlpha);
  float finalAlpha = max(outlineAlpha * outlineColor.a, glyphAlpha * fontColor.a);

  color = vec4(finalColor, finalAlpha);
}
