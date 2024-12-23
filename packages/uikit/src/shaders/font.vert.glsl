#version 300 es
#line 576
layout(location=0) in vec3 pos;
uniform mat4 modelViewProjectionMatrix;
uniform vec4 uvLeftTopWidthHeight;
out vec2 vUV;

void main(void) {
    // Apply MVP matrix to position (initially just using translation and scale)
    gl_Position = modelViewProjectionMatrix * vec4(pos, 1.0);

    // Calculate normalized UV coordinates
    vUV = vec2(uvLeftTopWidthHeight.x + (pos.x * uvLeftTopWidthHeight.z), 
               uvLeftTopWidthHeight.y + ((1.0 - pos.y) * uvLeftTopWidthHeight.w));
    vUV = clamp(vUV, 0.0, 1.0); // Clamp UV coordinates to the range [0, 1]
}
