#version 300 es
#line 534
layout(location=0) in vec3 pos;
uniform vec2 canvasWidthHeight;
uniform float thickness;
uniform vec4 startXYendXY;
void main(void) {
	vec2 posXY = mix(startXYendXY.xy, startXYendXY.zw, pos.x);
	vec2 dir = normalize(startXYendXY.xy - startXYendXY.zw);
	posXY += vec2(-dir.y, dir.x) * thickness * (pos.y - 0.5);
	posXY.x = (posXY.x) / canvasWidthHeight.x; //0..1
	posXY.y = 1.0 - (posXY.y / canvasWidthHeight.y); //1..0
	gl_Position = vec4((posXY * 2.0) - 1.0, 0.0, 1.0);
}

