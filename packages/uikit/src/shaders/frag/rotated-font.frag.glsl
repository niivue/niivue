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
uniform bool isMTSDF; // Toggle for MTSDF vs MSDF

// Enhanced outline configuration uniforms
uniform float outlineWidth;        // Outline width (0.0-1.0)
uniform float outlineSoftness;     // Edge softness (0.0-1.0)
uniform int outlineStyle;          // 0=solid, 1=glow, 2=inner, 3=outer
uniform vec2 outlineOffset;        // X,Y offset for drop-shadow style
uniform bool outlineEnabled;       // Enable/disable outline rendering

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

// Enhanced outline rendering function
vec4 renderOutlineText(float screenPxDistance, vec4 fillColor, vec4 strokeColor) {
  if (!outlineEnabled) {
    // Simple text rendering without outline
    float alpha = clamp(screenPxDistance + 0.5, 0.0, 1.0);
    return vec4(fillColor.rgb, fillColor.a * alpha);
  }
  
  // Configure outline parameters based on canvas size
  float outlineThicknessNDC = outlineWidth * 0.1; // Scale outline width
  float softness = outlineSoftness * 0.02 + 0.01; // Minimum softness for smooth edges
  
  // Calculate distance fields for fill and outline
  float fillDistance = screenPxDistance;
  float outlineDistance = screenPxDistance + outlineThicknessNDC;
  
  // Apply offset for drop-shadow style outlines
  if (length(outlineOffset) > 0.001) {
    vec2 offsetUV = vUV + outlineOffset * 0.001;
    vec3 offsetMsdf = texture(fontTexture, offsetUV).rgb;
    float offsetSd = isMTSDF 
      ? screenDistanceFromMTSDF(offsetMsdf)
      : screenDistanceFromMSDF(offsetMsdf);
    outlineDistance = (isMTSDF ? screenPxRange * offsetSd : offsetSd) + outlineThicknessNDC;
  }
  
  // Calculate alpha values with configurable softness
  float fillAlpha = smoothstep(-softness, softness, fillDistance);
  float outlineAlpha = smoothstep(-softness, softness, outlineDistance);
  
  // Apply different outline styles
  if (outlineStyle == 1) {
    // Glow style - soft outer glow
    float glowAlpha = smoothstep(-outlineThicknessNDC * 2.0, 0.0, fillDistance);
    glowAlpha = pow(glowAlpha, 2.0); // Quadratic falloff for glow effect
    vec3 glowColor = mix(strokeColor.rgb, fillColor.rgb, 0.3);
    vec3 finalColor = mix(glowColor, fillColor.rgb, fillAlpha);
    float finalAlpha = max(glowAlpha * strokeColor.a * 0.7, fillAlpha * fillColor.a);
    return vec4(finalColor, finalAlpha);
    
  } else if (outlineStyle == 2) {
    // Inner outline style
    float innerOutlineAlpha = smoothstep(outlineThicknessNDC - softness, outlineThicknessNDC + softness, fillDistance);
    vec3 finalColor = mix(strokeColor.rgb, fillColor.rgb, innerOutlineAlpha);
    return vec4(finalColor, fillAlpha * fillColor.a);
    
  } else if (outlineStyle == 3) {
    // Outer outline style
    float outerOutlineAlpha = 1.0 - smoothstep(-outlineThicknessNDC - softness, -outlineThicknessNDC + softness, fillDistance);
    outerOutlineAlpha *= (1.0 - fillAlpha); // Only show outline outside fill
    vec3 finalColor = mix(fillColor.rgb, strokeColor.rgb, outerOutlineAlpha);
    float finalAlpha = max(outerOutlineAlpha * strokeColor.a, fillAlpha * fillColor.a);
    return vec4(finalColor, finalAlpha);
    
  } else {
    // Default solid outline style (style == 0)
    float strokeAlpha = outlineAlpha - fillAlpha;
    strokeAlpha = clamp(strokeAlpha, 0.0, 1.0);
    
    // Combine fill and stroke
    vec3 finalColor = mix(strokeColor.rgb, fillColor.rgb, fillAlpha);
    float finalAlpha = max(strokeAlpha * strokeColor.a, fillAlpha * fillColor.a);
    
    // Ensure proper alpha blending for medical imaging readability
    if (finalAlpha > 0.0) {
      finalColor = (strokeColor.rgb * strokeAlpha * strokeColor.a + 
                   fillColor.rgb * fillAlpha * fillColor.a) / finalAlpha;
    }
    
    return vec4(finalColor, finalAlpha);
  }
}

void main() {
  vec3 msdf = texture(fontTexture, vUV).rgb;

  float sd = isMTSDF
    ? screenDistanceFromMTSDF(msdf)
    : screenDistanceFromMSDF(msdf);

  float screenPxDistance = isMTSDF ? screenPxRange * sd : sd;
  
  // Use enhanced outline rendering
  color = renderOutlineText(screenPxDistance, fontColor, outlineColor);
  
  // Ensure minimum alpha for medical imaging readability
  if (color.a < 0.01) {
    discard;
  }
}
