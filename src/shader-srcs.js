export var vertRenderShader = `#version 300 es
#line 4
layout(location=0) in vec3 pos;
in vec3 texCoords;
uniform mat4 mvpMtx;
out vec3 vColor;

void main(void) {
	gl_Position = mvpMtx * vec4(pos, 1.0); //vec4(2.0 * (pos.xyz - 0.5), 1.0);
	vColor = texCoords;
}`;

export var fragRenderShader = `#version 300 es
#line 15
precision highp int;
precision highp float;
uniform vec3 rayDir;
uniform vec3 texVox;
uniform vec4 clipPlane;
uniform highp sampler3D volume, overlay;
uniform float overlays;
uniform float backOpacity;
in vec3 vColor;
out vec4 fColor;
vec3 GetBackPosition (vec3 startPosition) {
 vec3 invR = 1.0 / rayDir;
 vec3 tbot = invR * (vec3(0.0)-startPosition);
 vec3 ttop = invR * (vec3(1.0)-startPosition);
 vec3 tmax = max(ttop, tbot);
 vec2 t = min(tmax.xx, tmax.yz);
 return startPosition + (rayDir * min(t.x, t.y));
}
vec4 applyClip (vec3 dir, inout vec4 samplePos, inout float len) {
	float cdot = dot(dir,clipPlane.xyz);
	if  ((clipPlane.a > 1.0) || (cdot == 0.0)) return samplePos;
    bool frontface = (cdot > 0.0);
	float clipThick = 2.0;
    float dis = (-clipPlane.a - dot(clipPlane.xyz, samplePos.xyz-0.5)) / cdot;
    float  disBackFace = (-(clipPlane.a-clipThick) - dot(clipPlane.xyz, samplePos.xyz-0.5)) / cdot;
    if (((frontface) && (dis >= len)) || ((!frontface) && (dis <= 0.0))) {
        samplePos.a = len + 1.0;
        return samplePos;
    }
    if (frontface) {
        dis = max(0.0, dis);
        samplePos = vec4(samplePos.xyz+dir * dis, dis);
        len = min(disBackFace, len);
    }
    if (!frontface) {
        len = min(dis, len);
        disBackFace = max(0.0, disBackFace);
        samplePos = vec4(samplePos.xyz+dir * disBackFace, disBackFace);
    }
    return samplePos;
}
void main() {
  fColor = vec4(0.0,0.0,0.0,0.0);
	// fColor = vec4(vColor.rgb, 1.0);
	// fColor = vec4(1.0, 0.0, 0.0, 1.0);
	// fColor = vec4(1.0, 0.0, 0.0, 1.0);
	// fColor = texture(volume, vColor.xyz);
	// fColor = vec4(texture(volume, vColor.xyz).rgb, vColor.r);
	// return;
	vec3 start = vColor;
	vec3 backPosition = GetBackPosition(start);
	// fColor = vec4(backPosition, 1.0); return;
  vec3 dir = backPosition - start;
  float len = length(dir);
	float lenVox = length((texVox * start) - (texVox * backPosition));
	if (lenVox < 0.5) return;
	float sliceSize = len / lenVox; //e.g. if ray length is 1.0 and traverses 50 voxels, each voxel is 0.02 in unit cube
	float stepSize = sliceSize; //quality: larger step is faster traversal, but fewer samples
	float opacityCorrection = stepSize/sliceSize;
    dir = normalize(dir);
	vec4 deltaDir = vec4(dir.xyz * stepSize, stepSize);
	vec4 samplePos = vec4(start.xyz, 0.0); //ray position
	float lenNoClip = len;
	vec4 clipPos = applyClip(dir, samplePos, len);
	//start: OPTIONAL fast pass: rapid traversal until first hit
	float stepSizeFast = sliceSize * 1.9;
	vec4 deltaDirFast = vec4(dir.xyz * stepSizeFast, stepSizeFast);
	while (samplePos.a <= len) {
		float val = texture(volume, samplePos.xyz).a;
		if (val > 0.01) break;
		samplePos += deltaDirFast; //advance ray position
	}
	// fColor = vec4(1.0, 0.0, 0.0, 1.0);
	if ((samplePos.a > len) && (overlays < 1.0)) return;
	samplePos -= deltaDirFast;
	if (samplePos.a < 0.0)
		vec4 samplePos = vec4(start.xyz, 0.0); //ray position
	//end: fast pass
	vec4 colAcc = vec4(0.0,0.0,0.0,0.0);
	const float earlyTermination = 0.95;
	float backNearest = len; //assume no hit
    float ran = fract(sin(gl_FragCoord.x * 12.9898 + gl_FragCoord.y * 78.233) * 43758.5453);
    samplePos += deltaDir * ran; //jitter ray
	while (samplePos.a <= len) {
		vec4 colorSample = texture(volume, samplePos.xyz);
		samplePos += deltaDir; //advance ray position
		if (colorSample.a < 0.01) continue;
		backNearest = min(backNearest, samplePos.a);
		colorSample.a = 1.0-pow((1.0 - colorSample.a), opacityCorrection);
		colorSample.rgb *= colorSample.a;
		colAcc= (1.0 - colAcc.a) * colorSample + colAcc;
		if ( colAcc.a > earlyTermination )
			break;
	}
	colAcc.a = (colAcc.a / earlyTermination) * backOpacity;
	fColor = colAcc;
	if (overlays < 1.0) return;
	//overlay pass
	len = lenNoClip;
	samplePos = vec4(start.xyz, 0.0); //ray position
    //start: OPTIONAL fast pass: rapid traversal until first hit
	stepSizeFast = sliceSize * 1.9;
	deltaDirFast = vec4(dir.xyz * stepSizeFast, stepSizeFast);
	while (samplePos.a <= len) {
		float val = texture(overlay, samplePos.xyz).a;
		if (val > 0.01) break;
		samplePos += deltaDirFast; //advance ray position
	}
	if (samplePos.a > len) return;
	samplePos -= deltaDirFast;
	if (samplePos.a < 0.0)
		vec4 samplePos = vec4(start.xyz, 0.0); //ray position
	//end: fast pass
	float overFarthest = len;
	colAcc = vec4(0.0, 0.0, 0.0, 0.0);
	samplePos += deltaDir * ran; //jitter ray
	while (samplePos.a <= len) {
		vec4 colorSample = texture(overlay, samplePos.xyz);
		samplePos += deltaDir; //advance ray position
		if (colorSample.a < 0.01) continue;
		colorSample.a = 1.0-pow((1.0 - colorSample.a), opacityCorrection);
		colorSample.rgb *= colorSample.a;
		colAcc= (1.0 - colAcc.a) * colorSample + colAcc;
		overFarthest = samplePos.a;
		if ( colAcc.a > earlyTermination )
			break;
	}
	float overMix = colAcc.a;
	float overlayDepth = 0.3;
	if (fColor.a <= 0.0)
			overMix = 1.0;
	else if (((overFarthest) > backNearest)) {
		float dx = (overFarthest - backNearest)/1.73;
		dx = fColor.a * pow(dx, overlayDepth);
		overMix *= 1.0 - dx;
	}
	fColor.rgb = mix(fColor.rgb, colAcc.rgb, overMix);
	fColor.a = max(fColor.a, colAcc.a);
}`;

export var vertSliceShader = `#version 300 es
#line 150
layout(location=0) in vec3 pos;
uniform int axCorSag;
uniform float slice;
uniform vec2 canvasWidthHeight;
uniform vec4 leftTopWidthHeight;
out vec3 texPos;
void main(void) {
	//convert pixel x,y space 1..canvasWidth,1..canvasHeight to WebGL 1..-1,-1..1
	vec2 frac;
	frac.x = (leftTopWidthHeight.x + (pos.x * leftTopWidthHeight.z)) / canvasWidthHeight.x; //0..1
	frac.y = 1.0 - ((leftTopWidthHeight.y + ((1.0 - pos.y) * leftTopWidthHeight.w)) / canvasWidthHeight.y); //1..0
	frac = (frac * 2.0) - 1.0;
	gl_Position = vec4(frac, 0.0, 1.0);
	if (axCorSag == 1)
		texPos = vec3(pos.x, slice, pos.y);
	else if (axCorSag == 2)
		texPos = vec3(slice, pos.x, pos.y);
	else
		texPos = vec3(pos.xy, slice);
}`;

export var fragSliceShader = `#version 300 es
#line 173
precision highp int;
precision highp float;
uniform highp sampler3D volume, overlay;
uniform float overlays;
uniform float opacity;
in vec3 texPos;
out vec4 color;
void main() {
	color = vec4(texture(volume, texPos).rgb, opacity);
	vec4 ocolor = vec4(0.0);
	if (overlays < 1.0) {
	 ocolor = vec4(0.0, 0.0, 0.0, 0.0);
	} else {
		ocolor = texture(overlay, texPos);
	}
	float aout = ocolor.a + (1.0 - ocolor.a) * color.a;
	if (aout <= 0.0) return;
	color.rgb = ((ocolor.rgb * ocolor.a) + (color.rgb * color.a * (1.0 - ocolor.a))) / aout;
	color.a = aout;
}`;

export var fragLineShader = `#version 300 es
#line 189
precision highp int;
precision highp float;
uniform vec4 lineColor;
out vec4 color;
void main() {
	color = lineColor;
}`;

export var vertColorbarShader = `#version 300 es
#line 200
layout(location=0) in vec3 pos;
uniform vec2 canvasWidthHeight;
uniform vec4 leftTopWidthHeight;
out vec2 vColor;
void main(void) {
	//convert pixel x,y space 1..canvasWidth,1..canvasHeight to WebGL 1..-1,-1..1
	vec2 frac;
	frac.x = (leftTopWidthHeight.x + (pos.x * leftTopWidthHeight.z)) / canvasWidthHeight.x; //0..1
	frac.y = 1.0 - ((leftTopWidthHeight.y + ((1.0 - pos.y) * leftTopWidthHeight.w)) / canvasWidthHeight.y); //1..0
	frac = (frac * 2.0) - 1.0;
	gl_Position = vec4(frac, 0.0, 1.0);
	vColor = pos.xy;
}`;

export var fragColorbarShader = `#version 300 es
#line 217
precision highp int;
precision highp float;
uniform highp sampler2D colormap;
in vec2 vColor;
out vec4 color;
void main() {
	color = vec4(texture(colormap, vColor).rgb, 1.0);
}`;

export var vertLineShader = `#version 300 es
#line 229
layout(location=0) in vec3 pos;
uniform vec2 canvasWidthHeight;
uniform vec4 leftTopWidthHeight;
void main(void) {
	//convert pixel x,y space 1..canvasWidth,1..canvasHeight to WebGL 1..-1,-1..1
	vec2 frac;
	frac.x = (leftTopWidthHeight.x + (pos.x * leftTopWidthHeight.z)) / canvasWidthHeight.x; //0..1
	frac.y = 1.0 - ((leftTopWidthHeight.y + ((1.0 - pos.y) * leftTopWidthHeight.w)) / canvasWidthHeight.y); //1..0
	frac = (frac * 2.0) - 1.0;
	gl_Position = vec4(frac, 0.0, 1.0);
}`;

export var vertFontShader = `#version 300 es
#line 244
layout(location=0) in vec3 pos;
uniform vec2 canvasWidthHeight;
uniform vec4 leftTopWidthHeight;
uniform vec4 uvLeftTopWidthHeight;
out vec2 vUV;
void main(void) {
	//convert pixel x,y space 1..canvasWidth,1..canvasHeight to WebGL 1..-1,-1..1
	vec2 frac;
	frac.x = (leftTopWidthHeight.x + (pos.x * leftTopWidthHeight.z)) / canvasWidthHeight.x; //0..1
	frac.y = 1.0 - ((leftTopWidthHeight.y + ((1.0 - pos.y) * leftTopWidthHeight.w)) / canvasWidthHeight.y); //1..0
	frac = (frac * 2.0) - 1.0;
	gl_Position = vec4(frac, 0.0, 1.0);
	vUV = vec2(uvLeftTopWidthHeight.x + (pos.x * uvLeftTopWidthHeight.z), uvLeftTopWidthHeight.y  + ((1.0 - pos.y) * uvLeftTopWidthHeight.w) );
}`;

export var fragFontShader = `#version 300 es
#line 262
precision highp int;
precision highp float;
uniform highp sampler2D fontTexture;
uniform vec4 fontColor;
uniform float screenPxRange;
in vec2 vUV;
out vec4 color;
float median(float r, float g, float b) {
    return max(min(r, g), min(max(r, g), b));
}
void main() {
	vec3 msd = texture(fontTexture, vUV).rgb;
	float sd = median(msd.r, msd.g, msd.b);
    float screenPxDistance = screenPxRange*(sd - 0.5);
    float opacity = clamp(screenPxDistance + 0.5, 0.0, 1.0);
	color = vec4(fontColor.rgb , fontColor.a * opacity);
}`;

export var vertOrientShader = `#version 300 es
#line 283
precision highp int;
precision highp float;
in vec3 vPos;
out vec2 TexCoord;
void main() {
    TexCoord = vPos.xy;
    gl_Position = vec4( (vPos.xy-vec2(0.5,0.5)) * 2.0, 0.0, 1.0);
}`;

export var fragOrientShaderU = `#version 300 es
uniform highp usampler3D intensityVol;
`;

export var fragOrientShaderI = `#version 300 es
uniform highp isampler3D intensityVol;
`;

export var fragOrientShaderF = `#version 300 es
uniform highp sampler3D intensityVol;
`;

export var fragOrientShader = `#line 309
precision highp int;
precision highp float;
in vec2 TexCoord;
out vec4 FragColor;
uniform float coordZ;
uniform float layer;
uniform float numLayers;
uniform float scl_slope;
uniform float scl_inter;
uniform float cal_max;
uniform float cal_min;
uniform highp sampler2D colormap;
uniform lowp sampler3D blend3D;
uniform float opacity;
uniform mat4 mtx;
void main(void) {
 vec4 vx = vec4(TexCoord.xy, coordZ, 1.0) * mtx;
 float f = (scl_slope * float(texture(intensityVol, vx.xyz).r)) + scl_inter;
 float r = max(0.00001, abs(cal_max - cal_min));
 float mn = min(cal_min, cal_max);
 f = mix(0.0, 1.0, (f - mn) / r);
 //float y = 1.0 / numLayers;
 //y = ((layer + 0.5) * y);
 //https://stackoverflow.com/questions/5879403/opengl-texture-coordinates-in-pixel-space
 float y = (2.0 * layer + 1.0)/(2.0 * numLayers);
 FragColor = texture(colormap, vec2(f, y)).rgba;
 FragColor.a *= opacity;
 if (layer < 2.0) return;
 vec2 texXY = TexCoord.xy*0.5 +vec2(0.5,0.5);
 vec4 prevColor = texture(blend3D, vec3(texXY, coordZ));
 // https://en.wikipedia.org/wiki/Alpha_compositing
 float aout = FragColor.a + (1.0 - FragColor.a) * prevColor.a;
 if (aout <= 0.0) return;
 FragColor.rgb = ((FragColor.rgb * FragColor.a) + (prevColor.rgb * prevColor.a * (1.0 - FragColor.a))) / aout;
 FragColor.a = aout;
}`;

export var fragRGBOrientShader = `#line 309
precision highp int;
precision highp float;
in vec2 TexCoord;
out vec4 FragColor;
uniform float coordZ;
uniform float layer;
uniform float numLayers;
uniform float scl_slope;
uniform float scl_inter;
uniform float cal_max;
uniform float cal_min;
uniform highp sampler2D colormap;
uniform lowp sampler3D blend3D;
uniform float opacity;
uniform mat4 mtx;
uniform bool hasAlpha;

void main(void) {
vec4 vx = vec4(TexCoord.xy, coordZ, 1.0);// * mtx;
 
 uvec4 aColor = texture(intensityVol, vx.xyz);
 float a = hasAlpha ? float(aColor.a) / 255.0f : float(aColor.r) * 0.21f + float(aColor.g) * 0.72f + float(aColor.b) * 0.07;  
 FragColor = vec4(float(aColor.r) / 255.0f, float(aColor.g) / 255.0f, float(aColor.b) / 255.0f, a);
 FragColor.a *= opacity;
}`;

export var vertPassThroughShader = `#version 300 es
#line 283
precision highp int;
precision highp float;
in vec3 vPos;
out vec2 TexCoord;
void main() {
    TexCoord = vPos.xy;
    gl_Position = vec4(vPos.x, vPos.y, 0.0, 1.0);
}`;

export var fragPassThroughShader = `#version 300 es
precision highp int;
precision highp float;
in vec2 TexCoord;
out vec4 FragColor;
uniform float coordZ;
uniform lowp sampler3D in3D;
void main(void) {
 FragColor = texture(in3D, vec3(TexCoord.xy, coordZ));
}`;

export var vertSurfaceShader = `#version 300 es
layout(location=0) in vec3 pos;
uniform mat4 mvpMtx;
void main(void) {
	gl_Position = mvpMtx * vec4(2.0 * (pos.xyz - 0.5), 1.0);
}`;

export var fragSurfaceShader = `#version 300 es
precision highp int;
precision highp float;
uniform vec4 surfaceColor;
out vec4 color;
void main() {
	color = surfaceColor;
}`;

export var vertDepthPickingShader = `#version 300 es
#line 4
layout(location=0) in vec3 pos;
uniform mat4 mvpMtx;
out vec3 posColor;
void main(void) {
	gl_Position = mvpMtx * vec4(2.0 * (pos.xyz - 0.5), 1.0);
	posColor = pos;
}`;

export var fragDepthPickingShader = `#version 300 es
precision highp int;
precision highp float;
uniform int id;
in vec3 posColor;
out vec4 color;
void main() {
	color = vec4(posColor, float(id & 255) / 255.0);
}`;

export var vertVolumePickingShader = `#version 300 es
#line 4
layout(location=0) in vec3 pos;
uniform mat4 mvpMtx;
out vec3 posColor;
void main(void) {
	gl_Position = mvpMtx * vec4(2.0 * (pos.xyz - 0.5), 1.0);
	posColor = pos;
}`;

export var fragVolumePickingShader = `#version 300 es
#line 15
precision highp int;
precision highp float;
uniform vec3 rayDir;
uniform vec3 texVox;
uniform vec4 clipPlane;
uniform highp sampler3D volume, overlay;
uniform float overlays;
uniform float backOpacity;
uniform int id;
in vec3 posColor;
out vec4 fColor;
vec3 GetBackPosition (vec3 startPosition) {
 vec3 invR = 1.0 / rayDir;
 vec3 tbot = invR * (vec3(0.0)-startPosition);
 vec3 ttop = invR * (vec3(1.0)-startPosition);
 vec3 tmax = max(ttop, tbot);
 vec2 t = min(tmax.xx, tmax.yz);
 return startPosition + (rayDir * min(t.x, t.y));
}
vec4 applyClip (vec3 dir, inout vec4 samplePos, inout float len) {
	float cdot = dot(dir,clipPlane.xyz);
	if  ((clipPlane.a > 1.0) || (cdot == 0.0)) return samplePos;
    bool frontface = (cdot > 0.0);
	float clipThick = 2.0;
    float dis = (-clipPlane.a - dot(clipPlane.xyz, samplePos.xyz-0.5)) / cdot;
    float  disBackFace = (-(clipPlane.a-clipThick) - dot(clipPlane.xyz, samplePos.xyz-0.5)) / cdot;
    if (((frontface) && (dis >= len)) || ((!frontface) && (dis <= 0.0))) {
        samplePos.a = len + 1.0;
        return samplePos;
    }
    if (frontface) {
        dis = max(0.0, dis);
        samplePos = vec4(samplePos.xyz+dir * dis, dis);
        len = min(disBackFace, len);
    }
    if (!frontface) {
        len = min(dis, len);
        disBackFace = max(0.0, disBackFace);
        samplePos = vec4(samplePos.xyz+dir * disBackFace, disBackFace);
    }
    return samplePos;
}
void main() {
	vec3 start = posColor;
	vec3 backPosition = GetBackPosition(start);
  vec3 dir = backPosition - start;
  float len = length(dir);
	float lenVox = length((texVox * start) - (texVox * backPosition));
	if (lenVox < 0.5) return;
	// fColor = vec4(posColor, 1.0);
	float sliceSize = len / lenVox; //e.g. if ray length is 1.0 and traverses 50 voxels, each voxel is 0.02 in unit cube
	float stepSize = sliceSize; //quality: larger step is faster traversal, but fewer samples
	float opacityCorrection = stepSize/sliceSize;
  dir = normalize(dir);
	vec4 deltaDir = vec4(dir.xyz * stepSize, stepSize);
	vec4 samplePos = vec4(start.xyz, 0.0); //ray position
	float lenNoClip = len;
	vec4 clipPos = applyClip(dir, samplePos, len);
	//start: OPTIONAL fast pass: rapid traversal until first hit
	float stepSizeFast = sliceSize * 1.9;
	vec4 deltaDirFast = vec4(dir.xyz * stepSizeFast, stepSizeFast);
	while (samplePos.a <= len) {
		float val = texture(volume, samplePos.xyz).a;
		if (val > 0.01) {
			fColor = vec4(samplePos.rgb, float(id & 255) / 255.0);
			return;
		}
		samplePos += deltaDirFast; //advance ray position
	}
	//end: fast pass

	
	if (overlays < 1.0) discard;
	
	//overlay pass
	len = lenNoClip;
	samplePos = vec4(start.xyz, 0.0); //ray position
    //start: OPTIONAL fast pass: rapid traversal until first hit
	stepSizeFast = sliceSize * 1.9;
	deltaDirFast = vec4(dir.xyz * stepSizeFast, stepSizeFast);
	while (samplePos.a <= len) {
		float val = texture(overlay, samplePos.xyz).a;
		if (val > 0.01) break;
		samplePos += deltaDirFast; //advance ray position
	}
	if (samplePos.a > len) return;
	fColor = vec4(posColor, float(id & 255) / 255.0);
}`;
