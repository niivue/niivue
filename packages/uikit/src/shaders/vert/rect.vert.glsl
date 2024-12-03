#version 300 es
#line 520
layout(location=0) in vec3 pos;
uniform vec2 canvasWidthHeight;
uniform vec4 leftTopWidthHeight;
void main(void) {
    // Convert pixel x,y space 1..canvasWidth,1..canvasHeight to WebGL 1..-1,-1..1
    vec2 frac;
    frac.x = (leftTopWidthHeight.x + (pos.x * leftTopWidthHeight.z)) / canvasWidthHeight.x; // 0..1
    frac.y = 1.0 - ((leftTopWidthHeight.y + ((1.0 - pos.y) * leftTopWidthHeight.w)) / canvasWidthHeight.y); // 1..0
    frac = (frac * 2.0) - 1.0;
    gl_Position = vec4(frac, 0.0, 1.0);
}
