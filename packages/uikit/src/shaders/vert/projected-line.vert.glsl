#version 300 es
layout(location=0) in vec3 pos;
uniform vec2 canvasWidthHeight;
uniform float thickness;
uniform vec3 startXYZ;
uniform vec3 endXYZ;

void main(void) {    
    vec2 posXY = startXYZ.xy + (endXYZ.xy - startXYZ.xy) * pos.x;

    vec2 startDiff = endXYZ.xy - startXYZ.xy;
    float startDistance = length(startDiff);
    vec2 diff = endXYZ.xy - posXY;
    float currentDistance = length(diff);
    vec2 dir = normalize(startXYZ.xy - endXYZ.xy);
    posXY += vec2(-dir.y, dir.x) * thickness * (pos.y - 0.5);
    posXY.x = (posXY.x) / canvasWidthHeight.x; //0..1
    posXY.y = 1.0 - (posXY.y / canvasWidthHeight.y); //1..0
    
    // Linear interpolation of z values based on current distance
    float z = mix(startXYZ.z, endXYZ.z, 1.0 - currentDistance / startDistance);
    gl_Position = vec4((posXY * 2.0) - 1.0, z, 1.0);
}
