#version 300 es
precision highp int;
precision highp float;

uniform vec4 fillColor;
uniform vec4 borderColor;
uniform vec4 leftTopWidthHeight; // x, y, width, height
uniform float thickness; // line thickness in pixels
uniform float cornerRadius; // also in pixels
uniform vec2 canvasWidthHeight;

out vec4 color;

void main() {
    vec2 fragCoord = gl_FragCoord.xy;
    float canvasHeight = canvasWidthHeight.y;

    // 'top' and 'bottom' to match gl_FragCoord.y coordinate system
    float top = canvasHeight - leftTopWidthHeight.y;
    float bottom = top - leftTopWidthHeight.w;
    float left = leftTopWidthHeight.x;
    float right = left + leftTopWidthHeight.z;

    // Corner positions
    vec2 topLeft = vec2(left + cornerRadius, top - cornerRadius);
    vec2 topRight = vec2(right - cornerRadius, top - cornerRadius);
    vec2 bottomLeft = vec2(left + cornerRadius, bottom + cornerRadius);
    vec2 bottomRight = vec2(right - cornerRadius, bottom + cornerRadius);

    // Distance function for rounded rectangle
    vec2 cornerDir;
    float dist = 0.0;

    if (fragCoord.x < left + cornerRadius && fragCoord.y > top - cornerRadius) {
        cornerDir = fragCoord - topLeft;
        dist = length(cornerDir) - cornerRadius;
    } else if (fragCoord.x > right - cornerRadius && fragCoord.y > top - cornerRadius) {
        cornerDir = fragCoord - topRight;
        dist = length(cornerDir) - cornerRadius;
    } else if (fragCoord.x < left + cornerRadius && fragCoord.y < bottom + cornerRadius) {
        cornerDir = fragCoord - bottomLeft;
        dist = length(cornerDir) - cornerRadius;
    } else if (fragCoord.x > right - cornerRadius && fragCoord.y < bottom + cornerRadius) {
        cornerDir = fragCoord - bottomRight;
        dist = length(cornerDir) - cornerRadius;
    } else {
        dist = max(max(left - fragCoord.x, fragCoord.x - right), max(bottom - fragCoord.y, fragCoord.y - top));
    }

    float aa = length(vec2(dFdx(dist), dFdy(dist)));

    // Feather the border and corners
    float edgeAlpha = smoothstep(-aa, aa, dist + thickness * 0.5) - smoothstep(-aa, aa, dist - thickness * 0.5);
    float cornerAlpha = smoothstep(0.0, aa, -dist);

    vec4 finalColor = mix(fillColor, borderColor, edgeAlpha);
    finalColor.a *= cornerAlpha;

    color = finalColor;
}
