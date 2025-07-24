export const vertRenderShader = `#version 300 es
#line 4
layout(location=0) in vec3 pos;
layout(location=1) in vec3 texCoords;
uniform mat4 mvpMtx;
out vec3 vColor;
void main(void) {
	gl_Position = mvpMtx * vec4(pos, 1.0);
	vColor = texCoords;
}`

const kDrawFunc = `
	vec4 drawColor(float scalar, float drawOpacity) {
		float nlayer = float(textureSize(colormap, 0).y);
		float layer = (nlayer - 0.5) / nlayer;
		vec4 dcolor = texture(colormap, vec2((scalar * 255.0)/256.0 + 0.5/256.0, layer)).rgba;
		dcolor.a *= drawOpacity;
		return dcolor;
}`

const kRenderFunc =
  `vec3 GetBackPosition(vec3 startPositionTex) {
	vec3 startPosition = startPositionTex * volScale;
	vec3 invR = 1.0 / rayDir;
	vec3 tbot = invR * (vec3(0.0)-startPosition);
	vec3 ttop = invR * (volScale-startPosition);
	vec3 tmax = max(ttop, tbot);
	vec2 t = min(tmax.xx, tmax.yz);
	vec3 endPosition = startPosition + (rayDir * min(t.x, t.y));
	//convert world position back to texture position:
	endPosition = endPosition / volScale;
	return endPosition;
}

vec4 applyClip (vec3 dir, inout vec4 samplePos, inout float len, inout bool isClip) {
	float cdot = dot(dir,clipPlane.xyz);
	isClip = false;
	if  ((clipPlane.a > 1.0) || (cdot == 0.0)) return samplePos;
	bool frontface = (cdot > 0.0);
	float dis = (-clipPlane.a - dot(clipPlane.xyz, samplePos.xyz-0.5)) / cdot;
	float thick = clipThick;
	if (thick <= 0.0) thick = 2.0;
	float  disBackFace = (-(clipPlane.a-thick) - dot(clipPlane.xyz, samplePos.xyz-0.5)) / cdot;
	if (((frontface) && (dis >= len)) || ((!frontface) && (dis <= 0.0))) {
		samplePos.a = len + 1.0;
		return samplePos;
	}
	if (frontface) {
		dis = max(0.0, dis);
		samplePos = vec4(samplePos.xyz+dir * dis, dis);
		if (dis > 0.0) isClip = true;
		len = min(disBackFace, len);
	}
	if (!frontface) {
		len = min(dis, len);
		disBackFace = max(0.0, disBackFace);
		if (len == dis) isClip = true;
		samplePos = vec4(samplePos.xyz+dir * disBackFace, disBackFace);
	}
	return samplePos;
}

void clipVolume(inout vec3 startPos, inout vec3 backPos, int dim, float frac, bool isLo) {
	vec3 dir = backPos - startPos;
	float len = length(dir);
	dir = normalize(dir);
	// Discard if both startPos and backPos are outside the clipping plane
	if (isLo && startPos[dim] < frac && backPos[dim] < frac) {
		discard;
	}
	if (!isLo && startPos[dim] > frac && backPos[dim] > frac) {
		discard;
	}
	vec4 plane = vec4(0.0, 0.0, 0.0, 0.5 - frac);
	plane[dim] = 1.0;
	float cdot = dot(dir, plane.xyz);
	float dis = (-plane.w - dot(plane.xyz, startPos - vec3(0.5))) / cdot;
	// Adjust startPos or backPos based on the intersection with the plane
	bool isFrontFace = (cdot > 0.0);
	if (!isLo)
		isFrontFace = !isFrontFace;
	if (dis > 0.0) {
		if (isFrontFace) {
				if (dis <= len) {
					startPos = startPos + dir * dis;
				}
		} else {
			if (dis < len) {
				backPos = startPos + dir * dis;
			}
		}
	}
}

void clipVolumeStart (inout vec3 startPos, inout vec3 backPos) {
	// vec3 clipLo = vec3(0.1, 0.2, 0.4);
	// vec3 clipHi = vec3(0.8, 0.7, 0.7);
	for (int i = 0; i < 3; i++) {
		if (clipLo[i] > 0.0)
			clipVolume(startPos, backPos, i, clipLo[i], true);
	}
	for (int i = 0; i < 3; i++) {
		if (clipHi[i] < 1.0)
			clipVolume(startPos, backPos, i, clipHi[i], false);
	}
}

float frac2ndc(vec3 frac) {
//https://stackoverflow.com/questions/7777913/how-to-render-depth-linearly-in-modern-opengl-with-gl-fragcoord-z-in-fragment-sh
	vec4 pos = vec4(frac.xyz, 1.0); //fraction
	vec4 dim = vec4(vec3(textureSize(volume, 0)), 1.0);
	pos = pos * dim;
	vec4 shim = vec4(-0.5, -0.5, -0.5, 0.0);
	pos += shim;
	vec4 mm = transpose(matRAS) * pos;
	float z_ndc = (mvpMtx * vec4(mm.xyz, 1.0)).z;
	return (z_ndc + 1.0) / 2.0;
}` + kDrawFunc

const kRenderInit = `void main() {
	if (fColor.x > 2.0) {
		fColor = vec4(1.0, 0.0, 0.0, 0.5);
		return;
	}
	fColor = vec4(0.0,0.0,0.0,0.0);
	vec4 clipPlaneColorX = clipPlaneColor;
	//if (clipPlaneColor.a < 0.0)
	//	clipPlaneColorX.a = - 1.0;
	bool isColorPlaneInVolume = false;
	if (clipPlaneColorX.a < 0.0) {
		isColorPlaneInVolume = true;
		clipPlaneColorX.a = 0.0;
	}
	//fColor = vec4(vColor.rgb, 1.0); return;
	vec3 start = vColor;
	gl_FragDepth = 0.0;
	vec3 backPosition = GetBackPosition(start);
	// fColor = vec4(backPosition, 1.0); return;
	vec3 dir = normalize(backPosition - start);
	clipVolumeStart(start, backPosition);
	dir = normalize(dir);
	float len = length(backPosition - start);
	float lenVox = length((texVox * start) - (texVox * backPosition));
	if ((lenVox < 0.5) || (len > 3.0)) { //length limit for parallel rays
		return;
	}
	float sliceSize = len / lenVox; //e.g. if ray length is 1.0 and traverses 50 voxels, each voxel is 0.02 in unit cube
	float stepSize = sliceSize; //quality: larger step is faster traversal, but fewer samples
	float opacityCorrection = stepSize/sliceSize;
	vec4 deltaDir = vec4(dir.xyz * stepSize, stepSize);
	vec4 samplePos = vec4(start.xyz, 0.0); //ray position
	float lenNoClip = len;
	bool isClip = false;
	vec4 clipPos = applyClip(dir, samplePos, len, isClip);
	//if ((clipPos.a != samplePos.a) && (len < 3.0)) {
	//start: OPTIONAL fast pass: rapid traversal until first hit
	float stepSizeFast = sliceSize * 1.9;
	vec4 deltaDirFast = vec4(dir.xyz * stepSizeFast, stepSizeFast);
	while (samplePos.a <= len) {
		float val = texture(volume, samplePos.xyz).a;
		if (val > 0.01)
			break;
		samplePos += deltaDirFast; //advance ray position
	}
	float drawOpacityA = renderDrawAmbientOcclusionXY.y;
	if ((samplePos.a >= len) && (((overlays < 1.0) && (drawOpacityA <= 0.0) ) || (backgroundMasksOverlays > 0)))  {
		if (isClip)
			fColor += clipPlaneColorX;
		return;
	}
	fColor = vec4(1.0, 1.0, 1.0, 1.0);
	//gl_FragDepth = frac2ndc(samplePos.xyz); //crude due to fast pass resolution
	samplePos -= deltaDirFast;
	if (samplePos.a < 0.0)
		vec4 samplePos = vec4(start.xyz, 0.0); //ray position
	//end: fast pass
	vec4 colAcc = vec4(0.0,0.0,0.0,0.0);
	vec4 firstHit = vec4(0.0,0.0,0.0,2.0 * lenNoClip);
	const float earlyTermination = 0.95;
	float backNearest = len; //assume no hit
	float ran = fract(sin(gl_FragCoord.x * 12.9898 + gl_FragCoord.y * 78.233) * 43758.5453);
	samplePos += deltaDir * ran; //jitter ray
`

const kRenderTail = `
	if (firstHit.a < len) {
		gl_FragDepth = frac2ndc(firstHit.xyz);
		vec4 paqdSample = texture(paqd, samplePos.xyz);
		if (paqdSample.a > 0.0) {
			//colAcc.rgb = paqdSample.rgb;
			float a = max(abs(paqdUniforms[2]), abs(paqdUniforms[3]));
			colAcc.rgb = mix(colAcc.rgb, paqdSample.rgb, 0.5 * paqdSample.a * a);
		}
		
	}
	colAcc.a = (colAcc.a / earlyTermination) * backOpacity;
	fColor = colAcc;
	//if (isClip) //CR
	if ((isColorPlaneInVolume) && (clipPos.a != samplePos.a) && (abs(firstHit.a - clipPos.a) < deltaDir.a))
		fColor.rgb = mix(fColor.rgb, clipPlaneColorX.rgb, abs(clipPlaneColor.a));
		//fColor.rgb = mix(fColor.rgb, clipPlaneColorX.rgb, clipPlaneColorX.a * 0.65);
	float renderDrawAmbientOcclusionX = renderDrawAmbientOcclusionXY.x;
	float drawOpacity = renderDrawAmbientOcclusionXY.y;
	if ((overlays < 1.0) && (drawOpacity <= 0.0))
		return;
	//overlay pass
	len = lenNoClip;
	samplePos = vec4(start.xyz, 0.0); //ray position
	//start: OPTIONAL fast pass: rapid traversal until first hit
	stepSizeFast = sliceSize * 1.0;
	deltaDirFast = vec4(dir.xyz * stepSizeFast, stepSizeFast);
	while (samplePos.a <= len) {
		float val = texture(overlay, samplePos.xyz).a;
		if (drawOpacity > 0.0)
			val = max(val, texture(drawing, samplePos.xyz).r);
		if (val > 0.001)
			break;
		samplePos += deltaDirFast; //advance ray position
	}
	if (samplePos.a >= len) {
		if (isClip && (fColor.a == 0.0))
				fColor += clipPlaneColorX;
			return;
	}
	samplePos -= deltaDirFast;
	if (samplePos.a < 0.0)
		vec4 samplePos = vec4(start.xyz, 0.0); //ray position
	//end: fast pass
	float overFarthest = len;
	colAcc = vec4(0.0, 0.0, 0.0, 0.0);

	samplePos += deltaDir * ran; //jitter ray
	vec4 overFirstHit = vec4(0.0,0.0,0.0,2.0 * len);
	if (backgroundMasksOverlays > 0)
		samplePos = firstHit;
	bool firstDraw = true;
	while (samplePos.a <= len) {
		vec4 colorSample = texture(overlay, samplePos.xyz);
		if ((colorSample.a < 0.01) && (drawOpacity > 0.0)) {
			float val = texture(drawing, samplePos.xyz).r;
			vec4 draw = drawColor(val, drawOpacity);
			if ((draw.a > 0.0) && (firstDraw)) {
				firstDraw = false;
				float sum = 0.0;
				const float mn = 1.0 / 256.0;
				const float sampleRadius = 1.1;
				float dx = sliceSize * sampleRadius;
				vec3 center = samplePos.xyz;
				//six neighbors that share a face
				sum += min(texture(drawing, center.xyz + cross(vec3(0.0,0.0,+dx), dir)).r, mn);
				sum += min(texture(drawing, center.xyz + cross(vec3(0.0,0.0,-dx), dir)).r, mn);
				sum += min(texture(drawing, center.xyz + cross(vec3(0.0,+dx,0.0), dir)).r, mn);
				sum += min(texture(drawing, center.xyz + cross(vec3(0.0,-dx,0.0), dir)).r, mn);
				sum += min(texture(drawing, center.xyz + cross(vec3(+dx,0.0,0.0), dir)).r, mn);
				sum += min(texture(drawing, center.xyz + cross(vec3(-dx,0.0,0.0), dir)).r, mn);
				//float proportion = (sum / mn) / 6.0;
				
				//12 neighbors that share an edge
				dx = sliceSize * sampleRadius * sqrt(2.0) * 0.5;
				sum += min(texture(drawing, center.xyz + cross(vec3(0.0,+dx,+dx), dir)).r, mn);
				sum += min(texture(drawing, center.xyz + cross(vec3(+dx,0.0,+dx), dir)).r, mn);
				sum += min(texture(drawing, center.xyz + cross(vec3(+dx,+dx,0.0), dir)).r, mn);
				sum += min(texture(drawing, center.xyz + cross(vec3(0.0,-dx,-dx), dir)).r, mn);
				sum += min(texture(drawing, center.xyz + cross(vec3(-dx,0.0,-dx), dir)).r, mn);
				sum += min(texture(drawing, center.xyz + cross(vec3(-dx,-dx,0.0), dir)).r, mn);

				sum += min(texture(drawing, center.xyz + cross(vec3(0.0,+dx,-dx), dir)).r, mn);
				sum += min(texture(drawing, center.xyz + cross(vec3(+dx,0.0,-dx), dir)).r, mn);
				sum += min(texture(drawing, center.xyz + cross(vec3(+dx,-dx,0.0), dir)).r, mn);
				
				sum += min(texture(drawing, center.xyz + cross(vec3(0.0,-dx,+dx), dir)).r, mn);
				sum += min(texture(drawing, center.xyz + cross(vec3(-dx,0.0,+dx), dir)).r, mn);
				sum += min(texture(drawing, center.xyz + cross(vec3(-dx,+dx,0.0), dir)).r, mn);
				float proportion = (sum / mn) / 18.0; //proportion of six neighbors is non-zero
				
				//a high proportion of hits means crevice
				//since the AO term adds shadows that darken most voxels, it will result in dark surfaces
				//the term brighten adds a little illumination to balance this
				// without brighten, only the most extreme ridges will not be darker
				const float brighten = 1.2;
				vec3 ao = draw.rgb * (1.0 - proportion) * brighten;
				draw.rgb = mix (draw.rgb, ao , renderDrawAmbientOcclusionX);
			}
			colorSample = draw;
		}
		samplePos += deltaDir; //advance ray position
		if (colorSample.a >= 0.01) {
			if (overFirstHit.a > len)
				overFirstHit = samplePos;
			colorSample.a *= renderOverlayBlend;
			colorSample.a = 1.0-pow((1.0 - colorSample.a), opacityCorrection);
			colorSample.rgb *= colorSample.a;
			colAcc= (1.0 - colAcc.a) * colorSample + colAcc;
			overFarthest = samplePos.a;
			if ( colAcc.a > earlyTermination )
				break;
		}
	}
	//if (samplePos.a >= len) {
	if (colAcc.a <= 0.0) {
		if (isClip && (fColor.a == 0.0))
			fColor += clipPlaneColorX;
		return;
	}
	if (overFirstHit.a < firstHit.a)
		gl_FragDepth = frac2ndc(overFirstHit.xyz);
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
}` // kRenderTail

// https://github.com/niivue/niivue/issues/679
export const fragRenderSliceShader =
  `#version 300 es
#line 215
precision highp int;
precision highp float;
uniform vec3 rayDir;
uniform vec3 texVox;
uniform int backgroundMasksOverlays;
uniform vec3 volScale;
uniform vec4 clipPlane;
uniform highp sampler3D volume, overlay;
uniform highp sampler3D paqd;
uniform vec4 paqdUniforms;
uniform float overlays;
uniform float clipThick;
uniform vec3 clipLo;
uniform vec3 clipHi;
uniform float backOpacity;
uniform mat4 mvpMtx;
uniform mat4 matRAS;
uniform vec4 clipPlaneColor;
uniform float renderOverlayBlend;
uniform highp sampler3D drawing;
uniform highp sampler2D colormap;
uniform vec2 renderDrawAmbientOcclusionXY;
in vec3 vColor;
out vec4 fColor;
` +
  kRenderFunc +
  `
	void main() {
	vec3 start = vColor;
	gl_FragDepth = 0.0;
	vec3 backPosition = GetBackPosition(start);
	vec3 dir = normalize(backPosition - start);
	clipVolumeStart(start, backPosition);
	float len = length(backPosition - start);
	float lenVox = length((texVox * start) - (texVox * backPosition));
	if ((lenVox < 0.5) || (len > 3.0)) { //length limit for parallel rays
		fColor = vec4(0.0,0.0,0.0,0.0);
		return;
	}
	float sliceSize = len / lenVox; //e.g. if ray length is 1.0 and traverses 50 voxels, each voxel is 0.02 in unit cube
	float stepSize = sliceSize; //quality: larger step is faster traversal, but fewer samples
	float opacityCorrection = stepSize/sliceSize;
	vec4 deltaDir = vec4(dir.xyz * stepSize, stepSize);
	vec4 samplePos = vec4(start.xyz, 0.0); //ray position
	vec4 colAcc = vec4(0.0,0.0,0.0,0.0);
	vec4 firstHit = vec4(0.0,0.0,0.0,2.0 * len);
	const float earlyTermination = 0.95;
	float backNearest = len; //assume no hit
	float dis = len;
	//check if axial plane is closest
	vec4 aClip = vec4(0.0, 0.0, 1.0, (1.0- clipPlane.z) - 0.5);
	float adis = (-aClip.a - dot(aClip.xyz, samplePos.xyz-0.5)) / dot(dir,aClip.xyz);
	if (adis > 0.0)
		dis = min(adis, dis);
	//check of coronal plane is closest
	vec4 cClip = vec4(0.0, 1.0, 0.0, (1.0- clipPlane.y) - 0.5);
	float cdis = (-cClip.a - dot(cClip.xyz, samplePos.xyz-0.5)) / dot(dir,cClip.xyz);
	if (cdis > 0.0)
		dis = min(cdis, dis);
	//check if coronal slice is closest
	vec4 sClip = vec4(1.0, 0.0, 0.0, (1.0- clipPlane.x) - 0.5);
	float sdis = (-sClip.a - dot(sClip.xyz, samplePos.xyz-0.5)) / dot(dir,sClip.xyz);
	if (sdis > 0.0)
		dis = min(sdis, dis);
	if ((dis > 0.0) && (dis < len)) {
		samplePos = vec4(samplePos.xyz+dir * dis, dis);
		colAcc = texture(volume, samplePos.xyz);
		colAcc.a = earlyTermination;
		firstHit = samplePos;
		backNearest = min(backNearest, samplePos.a);
	}
	//the following are only used by overlays
	vec4 clipPlaneColorX = clipPlaneColor;
	bool isColorPlaneInVolume = false;
	float lenNoClip = len;
	bool isClip = false;
	vec4 clipPos = applyClip(dir, samplePos, len, isClip);
	float stepSizeFast = sliceSize * 1.9;
	vec4 deltaDirFast = vec4(dir.xyz * stepSizeFast, stepSizeFast);
	if (samplePos.a < 0.0)
		vec4 samplePos = vec4(start.xyz, 0.0); //ray position
	float ran = fract(sin(gl_FragCoord.x * 12.9898 + gl_FragCoord.y * 78.233) * 43758.5453);
	samplePos += deltaDir * ran; //jitter ray
` +
  kRenderTail

export const fragRenderShader =
  `#version 300 es
#line 215
precision highp int;
precision highp float;
uniform vec3 rayDir;
uniform vec3 texVox;
uniform int backgroundMasksOverlays;
uniform vec3 volScale;
uniform vec4 clipPlane;
uniform highp sampler3D volume, overlay;
uniform highp sampler3D paqd;
uniform vec4 paqdUniforms;
uniform float overlays;
uniform float clipThick;
uniform vec3 clipLo;
uniform vec3 clipHi;
uniform float backOpacity;
uniform mat4 mvpMtx;
uniform mat4 matRAS;
uniform vec4 clipPlaneColor;
uniform float renderOverlayBlend;
uniform highp sampler3D drawing;
uniform highp sampler2D colormap;
uniform vec2 renderDrawAmbientOcclusionXY;
in vec3 vColor;
out vec4 fColor;
` +
  kRenderFunc +
  kRenderInit +
  `while (samplePos.a <= len) {
		vec4 colorSample = texture(volume, samplePos.xyz);
		samplePos += deltaDir; //advance ray position
		if (colorSample.a >= 0.01) {
			if (firstHit.a > lenNoClip)
				firstHit = samplePos;
			backNearest = min(backNearest, samplePos.a);
			colorSample.a = 1.0-pow((1.0 - colorSample.a), opacityCorrection);
			colorSample.rgb *= colorSample.a;
			colAcc= (1.0 - colAcc.a) * colorSample + colAcc;
			if ( colAcc.a > earlyTermination )
				break;
		}
	}
` +
  kRenderTail

export const gradientOpacityLutCount = 192

const kFragRenderGradientDecl = `#version 300 es
#line 215
precision highp int;
precision highp float;
uniform vec3 rayDir;
uniform vec3 texVox;
uniform int backgroundMasksOverlays;
uniform vec3 volScale;
uniform vec4 clipPlane;
uniform highp sampler3D volume, overlay;
uniform highp sampler3D paqd;
uniform vec4 paqdUniforms;
uniform float overlays;
uniform float clipThick;
uniform vec3 clipLo;
uniform vec3 clipHi;
uniform float backOpacity;
uniform mat4 mvpMtx;
uniform mat4 normMtx;
uniform mat4 matRAS;
uniform vec4 clipPlaneColor;
uniform float renderOverlayBlend;
uniform highp sampler3D drawing, gradient;
uniform highp sampler2D colormap;
uniform highp sampler2D matCap;
uniform vec2 renderDrawAmbientOcclusionXY;
uniform float gradientAmount;
uniform float silhouettePower;
uniform float gradientOpacity[${gradientOpacityLutCount}];
in vec3 vColor;
out vec4 fColor;
`
export const fragRenderGradientShader =
  kFragRenderGradientDecl +
  kRenderFunc +
  kRenderInit +
  `
	float startPos = samplePos.a;
	float clipClose = clipPos.a + 3.0 * deltaDir.a; //do not apply gradients near clip plane
	float brighten = 2.0; //modulating makes average intensity darker 0.5 * 0.5 = 0.25
	//vec4 prevGrad = vec4(0.0);
	float silhouetteThreshold = 1.0 - silhouettePower;
	while (samplePos.a <= len) {
		vec4 colorSample = texture(volume, samplePos.xyz);
		if (colorSample.a >= 0.0) {
			vec4 grad = texture(gradient, samplePos.xyz);
			grad.rgb = normalize(grad.rgb*2.0 - 1.0);
			//if (grad.a < prevGrad.a)
			//	grad.rgb = prevGrad.rgb;
			//prevGrad = grad;
			vec3 n = mat3(normMtx) * grad.rgb;
			n.y = - n.y;
			vec4 mc = vec4(texture(matCap, n.xy * 0.5 + 0.5).rgb, 1.0) * brighten;
			mc = mix(vec4(1.0), mc, gradientAmount);
			if (samplePos.a > clipClose)
				colorSample.rgb *= mc.rgb;
			if (firstHit.a > lenNoClip)
				firstHit = samplePos;
			backNearest = min(backNearest, samplePos.a);
			colorSample.a = 1.0-pow((1.0 - colorSample.a), opacityCorrection);
			int gradIdx = int(grad.a * ${gradientOpacityLutCount}.0);
			colorSample.a *= gradientOpacity[gradIdx];
			float lightNormDot = dot(grad.rgb, rayDir);
			// n.b. "lightNormDor" is cosTheta, "silhouettePower" is Fresnel effect exponent
 			colorSample.a *= pow(1.0 - abs(lightNormDot), silhouettePower);
 			float viewAlign = abs(lightNormDot); // 0 = perpendicular, 1 = aligned
 			// linearly map silhouettePower (0..1) to a threshold range, e.g., [1.0, 0.0]
 			// Cull voxels that are too aligned with the view direction
 			if (viewAlign > silhouetteThreshold)
 				colorSample.a = 0.0;
			colorSample.rgb *= colorSample.a;
			colAcc= (1.0 - colAcc.a) * colorSample + colAcc;
			if ( colAcc.a > earlyTermination )
				break;
		}
		samplePos += deltaDir; //advance ray position
	}
` +
  kRenderTail

export const fragRenderGradientValuesShader =
  kFragRenderGradientDecl +
  kRenderFunc +
  kRenderInit +
  `
	float startPos = samplePos.a;
	float clipClose = clipPos.a + 3.0 * deltaDir.a; //do not apply gradients near clip plane
	float brighten = 2.0; //modulating makes average intensity darker 0.5 * 0.5 = 0.25
	//vec4 prevGrad = vec4(0.0);
	while (samplePos.a <= len) {
		vec4 colorSample = texture(volume, samplePos.xyz);
		if (colorSample.a >= 0.0) {
			vec4 grad = texture(gradient, samplePos.xyz);
			colorSample.rgb = abs(normalize(grad.rgb*2.0 - 1.0));
			if (firstHit.a > lenNoClip)
				firstHit = samplePos;
			backNearest = min(backNearest, samplePos.a);
			colorSample.a = 1.0-pow((1.0 - colorSample.a), opacityCorrection);
			colorSample.rgb *= colorSample.a;
			colAcc= (1.0 - colAcc.a) * colorSample + colAcc;
			if ( colAcc.a > earlyTermination )
				break;
		}
		samplePos += deltaDir; //advance ray position
	}
` +
  kRenderTail

export const vertSliceMMShader = `#version 300 es
#line 392
layout(location=0) in vec3 pos;
uniform int axCorSag;
uniform mat4 mvpMtx;
uniform mat4 frac2mm;
uniform float slice;
out vec3 texPos;
void main(void) {
	texPos = vec3(pos.x, pos.y, slice);
	if (axCorSag > 1)
		texPos = vec3(slice, pos.x, pos.y);
	else if (axCorSag > 0)
		texPos = vec3(pos.x, slice, pos.y);
	vec4 mm = frac2mm * vec4(texPos, 1.0);
	gl_Position = mvpMtx * mm;
}`

export const kFragSliceHead =
  `#version 300 es
#line 411
precision highp int;
precision highp float;
uniform highp sampler3D volume, overlay;
uniform highp sampler3D paqd;
uniform vec4 paqdUniforms;
uniform int backgroundMasksOverlays;
uniform float overlayOutlineWidth;
uniform float overlayAlphaShader;
uniform int axCorSag;
uniform float overlays;
uniform float opacity;
uniform float drawOpacity;
uniform float drawRimOpacity;
uniform bool isAlphaClipDark;
uniform highp sampler3D drawing;
uniform highp sampler2D colormap;
in vec3 texPos;
out vec4 color;
` +
  kDrawFunc +
  `
vec4 blendRGBA(vec4 foreground, vec4 background) {
  float alphaOut = foreground.a + background.a * (1.0 - foreground.a);
  vec3 colorOut = (foreground.rgb * foreground.a + background.rgb * background.a * (1.0 - foreground.a)) / alphaOut;
  return vec4(colorOut, alphaOut);
}
float paqdEaseAlpha(float alpha) {
  // t are alpha transitions
  // <t0 -> y0
  // t0..t1  -> mix between y0..y1
  // t1..t2 -> mix between y1..y2
  // >t2 -> y2
  float t0 = paqdUniforms[0]; // 0.3;
  float t1 = 0.5 * (paqdUniforms[0] + paqdUniforms[1]); // 0.4;
  float t2 = paqdUniforms[1]; // 0.9;
  float y0 = 0.0;
  float y1 = abs(paqdUniforms[2]); // 1.0;
  float y2 = abs(paqdUniforms[3]); //0.25;
  if (alpha <= t0) {
    return y0;
  } else if (alpha <= t1) {
    return mix(y0, y1, (alpha - t0) / (t1 - t0)); // LERP 0.0 → 1.0
  } else if (alpha <= t2) {
    return mix(y1, y2, (alpha - t1) / (t2 - t1)); // LERP 1.0 → 0.2
  } else {
    return y2;
  }
}

void main() {
	//color = vec4(1.0, 0.0, 1.0, 1.0);return;
	vec4 background = texture(volume, texPos);
	color = vec4(background.rgb, opacity);
	if ((isAlphaClipDark) && (background.a == 0.0)) color.a = 0.0; //FSLeyes clipping range
	vec4 ocolor = vec4(0.0);
	float overlayAlpha = overlayAlphaShader;
	if (overlays > 0.0) {
		ocolor = texture(overlay, texPos);
		//dFdx for "boxing" issue 435 has aliasing on some implementations (coarse vs fine)
		//however, this only identifies 50% of the edges due to aliasing effects
		// http://www.aclockworkberry.com/shader-derivative-functions/
		// https://bgolus.medium.com/distinctive-derivative-differences-cce38d36797b
		//if ((ocolor.a >= 1.0) && ((dFdx(ocolor.a) != 0.0) || (dFdy(ocolor.a) != 0.0)  ))
		//	ocolor.rbg = vec3(0.0, 0.0, 0.0);
		bool isOutlineBelowNotAboveThreshold = true;
		if (isOutlineBelowNotAboveThreshold) {
			if ((overlayOutlineWidth > 0.0) && (ocolor.a < 1.0)) { //check voxel neighbors for edge
				vec3 vx = (overlayOutlineWidth ) / vec3(textureSize(overlay, 0));
				//6 voxel neighbors that share a face
				vec3 vxR = vec3(texPos.x+vx.x, texPos.y, texPos.z);
				vec3 vxL = vec3(texPos.x-vx.x, texPos.y, texPos.z);
				vec3 vxA = vec3(texPos.x, texPos.y+vx.y, texPos.z);
				vec3 vxP = vec3(texPos.x, texPos.y-vx.y, texPos.z);
				vec3 vxS = vec3(texPos.x, texPos.y, texPos.z+vx.z);
				vec3 vxI = vec3(texPos.x, texPos.y, texPos.z-vx.z);
				float a = 0.0;
				if (axCorSag != 2) {
					a = max(a, texture(overlay, vxR).a);
					a = max(a, texture(overlay, vxL).a);
				}
				if (axCorSag != 1) {
					a = max(a, texture(overlay, vxA).a);
					a = max(a, texture(overlay, vxP).a);
				}
				if (axCorSag != 0) {
					a = max(a, texture(overlay, vxS).a);
					a = max(a, texture(overlay, vxI).a);
				}
				bool isCheckCorners = true;
				if (isCheckCorners) {
					//12 voxel neighbors that share an edge
					vec3 vxRA = vec3(texPos.x+vx.x, texPos.y+vx.y, texPos.z);
					vec3 vxLA = vec3(texPos.x-vx.x, texPos.y+vx.y, texPos.z);
					vec3 vxRP = vec3(texPos.x+vx.x, texPos.y-vx.y, texPos.z);
					vec3 vxLP = vec3(texPos.x-vx.x, texPos.y-vx.y, texPos.z);
					vec3 vxRS = vec3(texPos.x+vx.x, texPos.y, texPos.z+vx.z);
					vec3 vxLS = vec3(texPos.x-vx.x, texPos.y, texPos.z+vx.z);
					vec3 vxRI = vec3(texPos.x+vx.x, texPos.y, texPos.z-vx.z);
					vec3 vxLI = vec3(texPos.x-vx.x, texPos.y, texPos.z-vx.z);
					vec3 vxAS = vec3(texPos.x, texPos.y+vx.y, texPos.z+vx.z);
					vec3 vxPS = vec3(texPos.x, texPos.y-vx.y, texPos.z+vx.z);
					vec3 vxAI = vec3(texPos.x, texPos.y+vx.y, texPos.z-vx.z);
					vec3 vxPI = vec3(texPos.x, texPos.y-vx.y, texPos.z-vx.z);

					if (axCorSag == 0) { //axial corners
						a = max(a, texture(overlay, vxRA).a);
						a = max(a, texture(overlay, vxLA).a);
						a = max(a, texture(overlay, vxRP).a);
						a = max(a, texture(overlay, vxLP).a);
					}
					if (axCorSag == 1) { //coronal corners
						a = max(a, texture(overlay, vxRS).a);
						a = max(a, texture(overlay, vxLS).a);
						a = max(a, texture(overlay, vxRI).a);
						a = max(a, texture(overlay, vxLI).a);
					}
					if (axCorSag == 2) { //sagittal corners
						a = max(a, texture(overlay, vxAS).a);
						a = max(a, texture(overlay, vxPS).a);
						a = max(a, texture(overlay, vxAI).a);
						a = max(a, texture(overlay, vxPI).a);
					}
				}
				if (a >= 1.0) {
					ocolor = vec4(0.0, 0.0, 0.0, 1.0);
					overlayAlpha = 1.0;
				}
			}

		} else {
			if ((overlayOutlineWidth > 0.0) && (ocolor.a >= 1.0)) { //check voxel neighbors for edge
				vec3 vx = (overlayOutlineWidth ) / vec3(textureSize(overlay, 0));
				vec3 vxR = vec3(texPos.x+vx.x, texPos.y, texPos.z);
				vec3 vxL = vec3(texPos.x-vx.x, texPos.y, texPos.z);
				vec3 vxA = vec3(texPos.x, texPos.y+vx.y, texPos.z);
				vec3 vxP = vec3(texPos.x, texPos.y-vx.y, texPos.z);
				vec3 vxS = vec3(texPos.x, texPos.y, texPos.z+vx.z);
				vec3 vxI = vec3(texPos.x, texPos.y, texPos.z-vx.z);
				float a = 1.0;
				if (axCorSag != 2) {
					a = min(a, texture(overlay, vxR).a);
					a = min(a, texture(overlay, vxL).a);
				}
				if (axCorSag != 1) {
					a = min(a, texture(overlay, vxA).a);
					a = min(a, texture(overlay, vxP).a);
				}
				if (axCorSag != 0) {
					a = min(a, texture(overlay, vxS).a);
					a = min(a, texture(overlay, vxI).a);
				}
				if (a < 1.0) {
					ocolor = vec4(0.0, 0.0, 0.0, 1.0);
					overlayAlpha = 1.0;
				}
			}
		} //outline above threshold
	}

`

export const fragSlice2DShader =
  `#version 300 es
#line 411
precision highp int;
precision highp float;
uniform highp sampler2D volume, overlay;
uniform int backgroundMasksOverlays;
uniform float overlayOutlineWidth;
uniform float overlayAlphaShader;
uniform int axCorSag;
uniform float overlays;
uniform float opacity;
uniform float drawOpacity;
uniform bool isAlphaClipDark;
uniform highp sampler2D drawing;
uniform highp sampler2D colormap;
in vec3 texPos;
out vec4 color;` +
  kDrawFunc +
  `void main() {
	//color = vec4(1.0, 0.0, 1.0, 1.0);return;
	vec4 background = texture(volume, texPos.xy);
	color = vec4(background.rgb, opacity);
	if ((isAlphaClipDark) && (background.a == 0.0)) color.a = 0.0; //FSLeyes clipping range
	vec4 dcolor = drawColor(texture(drawing, texPos.xy).r, drawOpacity);
	if (dcolor.a > 0.0) {
		color.rgb = mix(color.rgb, dcolor.rgb, dcolor.a);
		color.a = max(drawOpacity, color.a);
	}
}`

export const kFragSliceTail = `	ocolor.a *= overlayAlpha;
	float drawV = texture(drawing, texPos).r;
	vec4 dcolor = drawColor(drawV, drawOpacity);
	if (dcolor.a > 0.0) {
		if (drawRimOpacity >= 0.0) {
			vec3 vx = 1.0 / vec3(textureSize(drawing, 0));
			//6 voxel neighbors that share a face
			vec3 offsetX = dFdx(texPos); // left-right spacing
			vec3 offsetY = dFdy(texPos); // up-down spacing
			float L = texture(drawing, texPos - offsetX).r;
			float R = texture(drawing, texPos + offsetX).r;
			float T = texture(drawing, texPos - offsetY).r;
			float B = texture(drawing, texPos + offsetY).r;
			if (L != drawV || R != drawV || T != drawV || B != drawV)
				dcolor.a = drawRimOpacity;
		}
		color.rgb = mix(color.rgb, dcolor.rgb, dcolor.a);
		color.a = max(drawOpacity, color.a);
	}
	vec4 pcolor = texture(paqd, texPos);
	if (pcolor.a > 0.0) {
		pcolor.a = paqdEaseAlpha(pcolor.a);
		if (pcolor.a > 0.0) {
			if (paqdUniforms[3] < 0.0)
				ocolor = blendRGBA(pcolor, ocolor);
			else
				ocolor = blendRGBA(ocolor, pcolor);
		}
	}
	if ((backgroundMasksOverlays > 0) && (background.a == 0.0))
		return;
	float a = color.a + ocolor.a * (1.0 - color.a); // premultiplied alpha
	if (a == 0.0) return;
	color.rgb = mix(color.rgb, ocolor.rgb, ocolor.a / a);
	color.a = a;
}`

export const fragSliceMMShader = kFragSliceHead + kFragSliceTail

export const fragSliceV1Shader =
  kFragSliceHead +
  `	if (ocolor.a > 0.0) {
		//https://gamedev.stackexchange.com/questions/102889/is-it-possible-to-convert-vec4-to-int-in-glsl-using-opengl-es
		uint alpha = uint(ocolor.a * 255.0);
		vec3 xyzFlip = vec3(float((uint(1) & alpha) > uint(0)), float((uint(2) & alpha) > uint(0)), float((uint(4) & alpha) > uint(0)));
		//convert from 0 and 1 to -1 and 1
		xyzFlip = (xyzFlip * 2.0) - 1.0;
		//https://math.stackexchange.com/questions/1905533/find-perpendicular-distance-from-point-to-line-in-3d
		//v1 principle direction of tensor for this voxel
		vec3 v1 = ocolor.rgb;
		//flips encode polarity to convert from 0..1 to -1..1 (27 bits vs 24 bit precision)
		v1 = normalize( v1 * xyzFlip);
		vec3 vxl = fract(texPos * vec3(textureSize(volume, 0))) - 0.5;
		//vxl coordinates now -0.5..+0.5 so 0,0,0 is origin
		vxl.x = -vxl.x;
		float t = dot(vxl,v1);
		vec3 P = t * v1;
		float dx = length(P-vxl);
		ocolor.a = 1.0 - smoothstep(0.2,0.25, dx);
		//if modulation was applied, use that to scale alpha not color:
		ocolor.a *= length(ocolor.rgb);
		ocolor.rgb = normalize(ocolor.rgb);
		//compute distance one half voxel closer to viewer:
		float pan = 0.5;
		if (axCorSag == 0)
			vxl.z -= pan;
		if (axCorSag == 1)
			vxl.y -= pan;
		if (axCorSag == 2)
			vxl.x += pan;
		t = dot(vxl,v1);
		P = t * v1;
		float dx2 = length(P-vxl);
		ocolor.rgb += (dx2-dx-(0.5 * pan)) * 1.0;
	}
` +
  kFragSliceTail

export const fragRectShader = `#version 300 es
#line 480
precision highp int;
precision highp float;
uniform vec4 lineColor;
out vec4 color;
void main() {
	color = lineColor;
}`

export const fragRectOutlineShader = `#version 300 es
#line 723
precision highp int;
precision highp float;

uniform vec4 lineColor;
uniform vec4 leftTopWidthHeight;
uniform float thickness; // line thickness in pixels
uniform vec2 canvasWidthHeight;

out vec4 color;

void main() {
    // fragment position in screen coordinates
    vec2 fragCoord = gl_FragCoord.xy;

    // canvas height
    float canvasHeight = canvasWidthHeight.y;

    // 'top' and 'bottom' to match gl_FragCoord.y coordinate system
    float top = canvasHeight - leftTopWidthHeight.y;
    float bottom = top - leftTopWidthHeight.w;

    // left and right edges
    float left = leftTopWidthHeight.x;
    float right = left + leftTopWidthHeight.z;

    bool withinLeft = fragCoord.x >= left && fragCoord.x <= left + thickness;
    bool withinRight = fragCoord.x <= right && fragCoord.x >= right - thickness;
    bool withinTop = fragCoord.y <= top && fragCoord.y >= top - thickness;
    bool withinBottom = fragCoord.y >= bottom && fragCoord.y <= bottom + thickness;

    bool isOutline = withinLeft || withinRight || withinTop || withinBottom;

    if (isOutline) {
        color = lineColor;
    } else {
        discard; 
    }
}`

export const vertColorbarShader = `#version 300 es
#line 490
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
}`

export const fragColorbarShader = `#version 300 es
#line 506
precision highp int;
precision highp float;
uniform highp sampler2D colormap;
uniform float layer;
in vec2 vColor;
out vec4 color;
void main() {
	float nlayer = float(textureSize(colormap, 0).y);
	float fmap = (0.5 + layer) / nlayer;
	color = vec4(texture(colormap, vec2(vColor.x, fmap)).rgb, 1.0);
}`

export const vertRectShader = `#version 300 es
#line 520
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
}`

export const vertLineShader = `#version 300 es
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
}`

export const vertLine3DShader = `#version 300 es
#line 534
layout(location=0) in vec3 pos;
uniform vec2 canvasWidthHeight;
uniform float thickness;
uniform vec2 startXY;
uniform vec3 endXYZ; // transformed XYZ point
void main(void) {	
	vec2 posXY = mix(startXY.xy, endXYZ.xy, pos.x);
	vec2 startDiff = endXYZ.xy - startXY.xy;
	float startDistance = length(startDiff);
	vec2 diff = endXYZ.xy - posXY;
	float currentDistance = length(diff);
	vec2 dir = normalize(startXY.xy - endXYZ.xy);
	posXY += vec2(-dir.y, dir.x) * thickness * (pos.y - 0.5);
	posXY.x = (posXY.x) / canvasWidthHeight.x; //0..1
	posXY.y = 1.0 - (posXY.y / canvasWidthHeight.y); //1..0	
	float z = endXYZ.z * ( 1.0 - abs(currentDistance/startDistance)); 
	gl_Position = vec4((posXY * 2.0) - 1.0, z, 1.0);
}`

export const vertBmpShader = `#version 300 es
#line 549
layout(location=0) in vec3 pos;
uniform vec2 canvasWidthHeight;
uniform vec4 leftTopWidthHeight;
out vec2 vUV;
void main(void) {
	//convert pixel x,y space 1..canvasWidth,1..canvasHeight to WebGL 1..-1,-1..1
	vec2 frac;
	frac.x = (leftTopWidthHeight.x + (pos.x * leftTopWidthHeight.z)) / canvasWidthHeight.x; //0..1
	frac.y = 1.0 - ((leftTopWidthHeight.y + ((1.0 - pos.y) * leftTopWidthHeight.w)) / canvasWidthHeight.y); //1..0
	frac = (frac * 2.0) - 1.0;
	gl_Position = vec4(frac, 0.0, 1.0);
	vUV = vec2(pos.x, 1.0 - pos.y);
}`

export const fragBmpShader = `#version 300 es
#line 565
precision highp int;
precision highp float;
uniform highp sampler2D bmpTexture;
in vec2 vUV;
out vec4 color;
void main() {
	color = texture(bmpTexture, vUV);
}`

export const vertFontShader = `#version 300 es
#line 576
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
}`

export const fragFontShader = `#version 300 es
#line 593
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
}`

export const vertCircleShader = `#version 300 es
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
	vUV = pos.xy;
}`

export const fragCircleShader = `#version 300 es
precision highp int;
precision highp float;
uniform vec4 circleColor;
uniform float fillPercent;
in vec2 vUV;
out vec4 color;
void main() {
	/* Check if the pixel is inside the circle
		 and color it with a gradient. Otherwise, color it 
		 transparent   */
	float distance = length(vUV-vec2(0.5,0.5));
	if ( distance < 0.5 && distance >= (1.0 - fillPercent) / 2.0){
			color = vec4(circleColor.r,circleColor.g,circleColor.b,circleColor.a) ;			
	}else{
			color = vec4(0.0,0.0,0.0,0.0);
	}
}
`

export const vertOrientShader = `#version 300 es
#line 613
precision highp int;
precision highp float;
in vec3 vPos;
out vec2 TexCoord;
void main() {
	TexCoord = vPos.xy;
	gl_Position = vec4( (vPos.xy-vec2(0.5,0.5)) * 2.0, 0.0, 1.0);
}`

export const fragOrientShaderU = `#version 300 es
uniform highp usampler3D intensityVol;
`

export const fragOrientShaderI = `#version 300 es
uniform highp isampler3D intensityVol;
`

export const fragOrientShaderF = `#version 300 es
uniform highp sampler3D intensityVol;
`

export const fragOrientShaderAtlas = `#line 1042
precision highp int;
precision highp float;
in vec2 TexCoord;
out vec4 FragColor;
uniform bool isAdditiveBlend;
uniform float coordZ;
uniform float layer;
uniform highp sampler2D colormap;
uniform lowp sampler3D blend3D;
uniform float opacity;
uniform uint activeIndex;
uniform vec4 xyzaFrac;
uniform mat4 mtx;
float textureWidth;
float nlayer;
float layerY;

vec4 scalar2color(uint idx) {
	float fx = (float(idx) + 0.5) / textureWidth;
	vec4 clr = texture(colormap, vec2(fx, layerY)).rgba;
	if (clr.a > 0.0)
		clr.a = 1.0;
	clr.a *= opacity;
	return clr;
}
void main(void) {
	vec4 vx = vec4(TexCoord.x, TexCoord.y, coordZ, 1.0) * mtx;
	uint idx = uint(texture(intensityVol, vx.xyz).r);
	if (idx == uint(0)) {
		if (layer < 1.0) {
			FragColor = vec4(0.0, 0.0, 0.0, 0.0);
			return;
		}
		FragColor = texture(blend3D, vec3(TexCoord.xy, coordZ));
		return;
	}
	textureWidth = float(textureSize(colormap, 0).x);
	nlayer = float(textureSize(colormap, 0).y);
	layerY = ((2.0 * layer) + 1.5) / nlayer;
	//idx = ((idx - uint(1)) % uint(100))+uint(1);
	FragColor = scalar2color(idx);
	bool isBorder = false;
	vx = vec4(TexCoord.x+xyzaFrac.x, TexCoord.y, coordZ, 1.0) * mtx;
	uint R = uint(texture(intensityVol, vx.xyz).r);
	vx = vec4(TexCoord.x-xyzaFrac.x, TexCoord.y, coordZ, 1.0) * mtx;
	uint L = uint(texture(intensityVol, vx.xyz).r);
	vx = vec4(TexCoord.x, TexCoord.y+xyzaFrac.y, coordZ, 1.0) * mtx;
	uint A = uint(texture(intensityVol, vx.xyz).r);
	vx = vec4(TexCoord.x, TexCoord.y-xyzaFrac.y, coordZ, 1.0) * mtx;
	uint P = uint(texture(intensityVol, vx.xyz).r);
	vx = vec4(TexCoord.x, TexCoord.y, coordZ+xyzaFrac.z, 1.0) * mtx;
	uint S = uint(texture(intensityVol, vx.xyz).r);
	vx = vec4(TexCoord.x, TexCoord.y, coordZ-xyzaFrac.z, 1.0) * mtx;
	uint I = uint(texture(intensityVol, vx.xyz).r);
	vec4 centerColor = FragColor;
	FragColor.a += scalar2color(R).a;
	FragColor.a += scalar2color(L).a;
	FragColor.a += scalar2color(A).a;
	FragColor.a += scalar2color(P).a;
	FragColor.a += scalar2color(S).a;
	FragColor.a += scalar2color(I).a;
	FragColor.a /= 7.0;
	if ((!isBorder) &&(idx == activeIndex)) {
		if (centerColor.a > 0.5)
			FragColor.a *= 0.4;
		else
			FragColor.a =0.8;
	}
	if (xyzaFrac.a != 0.0) { //outline
		if ((idx != R) || (idx != L) || (idx != A) || (idx != P) || (idx != S) || (idx != I)) {
			isBorder = true;
			if (xyzaFrac.a > 0.0)
				FragColor.a = xyzaFrac.a;
			else
				FragColor = vec4(0.0, 0.0, 0.0, 1.0);
		}
	}
	if (layer < 1.0) return;
		vec4 prevColor = texture(blend3D, vec3(TexCoord.xy, coordZ));
		// https://en.wikipedia.org/wiki/Alpha_compositing
		float aout = FragColor.a + (1.0 - FragColor.a) * prevColor.a;
		if (aout <= 0.0) return;
		if (isAdditiveBlend)
			FragColor.rgb = ((FragColor.rgb * FragColor.a) + (prevColor.rgb * prevColor.a)) / aout;
		else
			FragColor.rgb = ((FragColor.rgb * FragColor.a) + (prevColor.rgb * prevColor.a * (1.0 - FragColor.a))) / aout;
		FragColor.a = aout;
}`

export const fragOrientShader = `#line 691
precision highp int;
precision highp float;
in vec2 TexCoord;
out vec4 FragColor;
uniform float coordZ;
uniform float layer;
uniform float scl_slope;
uniform float scl_inter;
uniform float cal_max;
uniform float cal_min;
uniform float cal_maxNeg;
uniform float cal_minNeg;
uniform bool isAlphaThreshold;
uniform bool isColorbarFromZero;
uniform bool isAdditiveBlend;
uniform highp sampler2D colormap;
uniform lowp sampler3D blend3D;
uniform int modulation;
uniform highp sampler3D modulationVol;
uniform float opacity;
uniform mat4 mtx;
void main(void) {
	vec4 vx = vec4(TexCoord.xy, coordZ, 1.0) * mtx;
	if ((vx.x < 0.0) || (vx.x > 1.0) || (vx.y < 0.0) || (vx.y > 1.0) || (vx.z < 0.0) || (vx.z > 1.0)) {
		//set transparent if out of range
		//https://webglfundamentals.org/webgl/webgl-3d-textures-repeat-clamp.html
		FragColor = texture(blend3D, vec3(TexCoord.xy, coordZ));
		return;
	}
	float f = (scl_slope * float(texture(intensityVol, vx.xyz).r)) + scl_inter;
	float mn = cal_min;
	float mx = cal_max;
	if ((isAlphaThreshold) || (isColorbarFromZero))
		mn = 0.0;
	float r = max(0.00001, abs(mx - mn));
	mn = min(mn, mx);
	float txl = mix(0.0, 1.0, (f - mn) / r);
	if (f > mn) { //issue1139: survives threshold, so round up to opaque voxel
		txl = max(txl, 2.0/256.0);
	}
	//https://stackoverflow.com/questions/5879403/opengl-texture-coordinates-in-pixel-space
	float nlayer = float(textureSize(colormap, 0).y);
	//each volume has two color maps:
	// (layer*2) = negative and (layer * 2) + 1 = positive
	float y = ((2.0 * layer) + 1.5)/nlayer;
	FragColor = texture(colormap, vec2(txl, y)).rgba;
	//negative colors
	mn = cal_minNeg;
	mx = cal_maxNeg;
	if ((isAlphaThreshold) || (isColorbarFromZero))
		mx = 0.0;
	//if ((!isnan(cal_minNeg)) && ( f < mx)) {
	if ((cal_minNeg < cal_maxNeg) && ( f < mx)) {
		r = max(0.00001, abs(mx - mn));
		mn = min(mn, mx);
		txl = 1.0 - mix(0.0, 1.0, (f - mn) / r);
		//issue1139: survives threshold, so round up to opaque voxel
		txl = max(txl, 2.0/256.0);
		y = ((2.0 * layer) + 0.5)/nlayer;
		FragColor = texture(colormap, vec2(txl, y));
	}
	if (layer > 0.7)
		FragColor.a = step(0.00001, FragColor.a);
	//if (modulation > 10)
	//	FragColor.a *= texture(modulationVol, vx.xyz).r;
	//	FragColor.rgb *= texture(modulationVol, vx.xyz).r;
	if (isAlphaThreshold) {
		if ((cal_minNeg != cal_maxNeg) && ( f < 0.0) && (f > cal_maxNeg))
			FragColor.a = pow(-f / -cal_maxNeg, 2.0);
		else if ((f > 0.0) && (cal_min > 0.0))
			FragColor.a *= pow(f / cal_min, 2.0); //issue435:  A = (V/X)**2
		//FragColor.g = 0.0;
	} else if (isColorbarFromZero) {
		if ((cal_minNeg != cal_maxNeg) && ( f < 0.0) && (f > cal_maxNeg))
			FragColor.a = 0.0;
		else if ((f > 0.0) && (cal_min > 0.0) && (f < cal_min))
			FragColor.a *= 0.0;

	}
	if (modulation == 1) {
		FragColor.rgb *= texture(modulationVol, vx.xyz).r;
	} else if (modulation == 2) {
		FragColor.a = texture(modulationVol, vx.xyz).r;
	}
	FragColor.a *= opacity;
	if (layer < 1.0) return;
	vec4 prevColor = texture(blend3D, vec3(TexCoord.xy, coordZ));
	// https://en.wikipedia.org/wiki/Alpha_compositing
	float aout = FragColor.a + (1.0 - FragColor.a) * prevColor.a;
	if (aout <= 0.0) return;
	if (isAdditiveBlend)
		FragColor.rgb = ((FragColor.rgb * FragColor.a) + (prevColor.rgb * prevColor.a)) / aout;
	else
		FragColor.rgb = ((FragColor.rgb * FragColor.a) + (prevColor.rgb * prevColor.a * (1.0 - FragColor.a))) / aout;
	FragColor.a = aout;
}`

export const fragPAQDOrientShader = `#line 773
precision highp int;
precision highp float;
in vec2 TexCoord;
out vec4 FragColor;
uniform float coordZ;
uniform float layer;
uniform float scl_slope;
uniform float scl_inter;
uniform float cal_max;
uniform float cal_min;
uniform highp sampler2D colormap;
uniform lowp sampler3D blend3D;
uniform float opacity;
uniform mat4 mtx;
uniform bool hasAlpha;
uniform int modulation;
uniform highp sampler3D modulationVol;
float textureWidth;
float nlayer;
float layerY;

vec4 scalar2color(uint idx) {
	float fx = (float(idx) + 0.5) / textureWidth;
	vec4 clr = texture(colormap, vec2(fx, layerY)).rgba;
	if (clr.a > 0.0)
		clr.a = 1.0;
	clr.a *= opacity;
	return clr;
}

vec4 paqd2color(uvec4 rgba) {
  // paqd r: max prob index, g: 2nd index, b: max prob a: 2nd prob
  float prob1 = float(rgba.b)/255.0;
  float prob2 = float(rgba.a)/255.0;
  vec4 clr1 = scalar2color(rgba.r);
  vec4 clr2 = scalar2color(rgba.g);
  float total = prob1 + prob2;
  vec4 clr = vec4(clr1.rgb, total);
  // vec4 clr = vec4(clr1.rgb, prob1);
  if (total > 0.0) {
    clr.rgb = mix(clr2.rgb, clr1.rgb, prob1 / total);
  }
  return clr;
}
void main(void) {
	vec4 vx = vec4(TexCoord.xy, coordZ, 1.0) * mtx;
	ivec3 voxelCoord = ivec3(vx.xyz * vec3(textureSize(intensityVol, 0)));
	uvec4 rgba = texelFetch(intensityVol, voxelCoord, 0);
	FragColor = vec4(0.0, 0.0, 0.0, 0.0);
	if (rgba.r > uint(0)) {
		textureWidth = float(textureSize(colormap, 0).x);
		nlayer = float(textureSize(colormap, 0).y);
		layerY = ((2.0 * layer) + 1.5) / nlayer;
		FragColor = paqd2color(rgba);
		return;
	}
	// if (layer > 2.0) return;
	// FragColor = texture(blend3D, vec3(TexCoord.xy, coordZ));
}`

export const fragRGBOrientShader = `#line 773
precision highp int;
precision highp float;
in vec2 TexCoord;
out vec4 FragColor;
uniform float coordZ;
uniform float layer;
uniform float scl_slope;
uniform float scl_inter;
uniform float cal_max;
uniform float cal_min;
uniform highp sampler2D colormap;
uniform lowp sampler3D blend3D;
uniform float opacity;
uniform mat4 mtx;
uniform bool hasAlpha;
uniform int modulation;
uniform highp sampler3D modulationVol;
void main(void) {
	vec4 vx = vec4(TexCoord.xy, coordZ, 1.0) * mtx;
	uvec4 aColor = texture(intensityVol, vx.xyz);
	FragColor = vec4(float(aColor.r) / 255.0, float(aColor.g) / 255.0, float(aColor.b) / 255.0, float(aColor.a) / 255.0);
	if (modulation == 1)
		FragColor.rgb *= texture(modulationVol, vx.xyz).r;
	if (!hasAlpha) {
		FragColor.a = (FragColor.r * 0.21 + FragColor.g * 0.72 + FragColor.b * 0.07);
		//next line: we could binarize alpha, but see rendering of visible human
		//FragColor.a = step(0.01, FragColor.a);
	}
	if (modulation == 2)
		FragColor.a = texture(modulationVol, vx.xyz).r;
	FragColor.a *= opacity;
	if (layer < 1.0) return;
	vec4 prevColor = texture(blend3D, vec3(TexCoord.xy, coordZ));
	// https://en.wikipedia.org/wiki/Alpha_compositing
	float aout = FragColor.a + (1.0 - FragColor.a) * prevColor.a;
	if (aout <= 0.0) return;
	FragColor.rgb = ((FragColor.rgb * FragColor.a) + (prevColor.rgb * prevColor.a * (1.0 - FragColor.a))) / aout;
	FragColor.a = aout;
}`

export const vertGrowCutShader = `#version 300 es
#line 808
precision highp int;
precision highp float;
in vec3 vPos;
out vec2 TexCoord;
void main() {
	TexCoord = vPos.xy;
	gl_Position = vec4((vPos.x - 0.5) * 2.0, (vPos.y - 0.5) * 2.0, 0.0, 1.0);
}`

// https://github.com/pieper/step/blob/master/src/growcut.js
// Steve Pieper 2022: Apache License 2.0
export const fragGrowCutShader = `#version 300 es
#line 829
	precision highp float;
	precision highp int;
	precision highp isampler3D;
	layout(location = 0) out int label;
	layout(location = 1) out int strength;
	in vec2 TexCoord;
	uniform int finalPass;
	uniform float coordZ;
	uniform lowp sampler3D in3D;
	uniform highp isampler3D backTex; // background
	uniform highp isampler3D labelTex; // label
	uniform highp isampler3D strengthTex; // strength
void main(void) {
	vec3 interpolatedTextureCoordinate = vec3(TexCoord.xy, coordZ);
	ivec3 size = textureSize(backTex, 0);
	ivec3 texelIndex = ivec3(floor(interpolatedTextureCoordinate * vec3(size)));
	int background = texelFetch(backTex, texelIndex, 0).r;
	label = texelFetch(labelTex, texelIndex, 0).r;
	strength = texelFetch(strengthTex, texelIndex, 0).r;
	for (int k = -1; k <= 1; k++) {
		for (int j = -1; j <= 1; j++) {
			for (int i = -1; i <= 1; i++) {
				if (i != 0 && j != 0 && k != 0) {
					ivec3 neighborIndex = texelIndex + ivec3(i,j,k);
					int neighborBackground = texelFetch(backTex, neighborIndex, 0).r;
					int neighborStrength = texelFetch(strengthTex, neighborIndex, 0).r;
					int strengthCost = abs(neighborBackground - background);
					int takeoverStrength = neighborStrength - strengthCost;
					if (takeoverStrength > strength) {
						strength = takeoverStrength;
						label = texelFetch(labelTex, neighborIndex, 0).r;
					}
				}
			}
		}
	}
	if (finalPass < 1)
		return;
	int ok = 1;
	ivec4 labelCount = ivec4(0,0,0,0);
	for (int k = -1; k <= 1; k++)
		for (int j = -1; j <= 1; j++)
			for (int i = -1; i <= 1; i++) {
				ivec3 neighborIndex = texelIndex + ivec3(i,j,k);
				int ilabel = texelFetch(labelTex, neighborIndex, 0).r;
				if ((ilabel < 0) || (ilabel > 3))
					ok = 0;
				else
					labelCount[ilabel]++;
			}
	if (ok != 1) {
		return;
	}
	int maxIdx = 0;
	for (int i = 1; i < 4; i++) {
		if (labelCount[i] > labelCount[maxIdx])
			maxIdx = i;
	}
	label = maxIdx;
}`

export const vertSurfaceShader = `#version 300 es
layout(location=0) in vec3 pos;
uniform mat4 mvpMtx;
void main(void) {
	gl_Position = mvpMtx * vec4(pos, 1.0);
}`

export const fragSurfaceShader = `#version 300 es
precision highp int;
precision highp float;
uniform vec4 surfaceColor;
out vec4 color;
void main() {
	color = surfaceColor;
}`

export const vertFiberShader = `#version 300 es
layout(location=0) in vec3 pos;
layout(location=1) in vec4 clr;
out vec4 vClr;
uniform mat4 mvpMtx;
void main(void) {
	gl_Position = mvpMtx * vec4(pos, 1.0);
	vClr = clr;
}`

export const fragFiberShader = `#version 300 es
precision highp int;
precision highp float;
in vec4 vClr;
out vec4 color;
uniform float opacity;
void main() {
	color = vec4(vClr.rgb, opacity);
}`

export const vertMeshShader = `#version 300 es
layout(location=0) in vec3 pos;
layout(location=1) in vec4 norm;
layout(location=2) in vec4 clr;
uniform mat4 mvpMtx;
//uniform mat4 modelMtx;
uniform mat4 normMtx;
out vec4 vClr;
out vec3 vN;
out vec4 vP;
out vec4 vPc;
void main(void) {
	vec3 lightPosition = vec3(0.0, 0.0, -10.0);
	vP = vec4(pos, 1.0);
	vPc = mvpMtx * vec4(pos, 1.0);
	gl_Position = vPc;
	vN = normalize((normMtx * vec4(norm.xyz,1.0)).xyz);
	//vV = -vec3(modelMtx*vec4(pos,1.0));
	vClr = clr;
}`

// report depth for fragment
// https://github.com/rii-mango/Papaya/blob/782a19341af77a510d674c777b6da46afb8c65f1/src/js/viewer/screensurface.js#L89
export const fragMeshDepthShader = `#version 300 es
precision highp int;
precision highp float;
uniform float opacity;
out vec4 color;
vec4 packFloatToVec4i(const float value) {
	const vec4 bitSh = vec4(256.0*256.0*256.0, 256.0*256.0, 256.0, 1.0);
	const vec4 bitMsk = vec4(0.0, 1.0/256.0, 1.0/256.0, 1.0/256.0);
	vec4 res = fract(value * bitSh);
	res -= res.xxyz * bitMsk;
	return res;
}
void main() {
	color = packFloatToVec4i(gl_FragCoord.z);
}`

// ToonShader https://prideout.net/blog/old/blog/index.html@tag=toon-shader.html
export const fragMeshToonShader = `#version 300 es
precision highp int;
precision highp float;
uniform float opacity;
in vec4 vClr;
in vec3 vN;
out vec4 color;
float stepmix(float edge0, float edge1, float E, float x){
	float T = clamp(0.5 * (x - edge0 + E) / E, 0.0, 1.0);
	return mix(edge0, edge1, T);
}
void main() {
	vec3 r = vec3(0.0, 0.0, 1.0);
	float ambient = 0.3;
	float diffuse = 0.6;
	float specular = 0.5;
	float shininess = 50.0;
	vec3 n = normalize(vN);
	vec3 lightPosition = vec3(0.0, 10.0, -5.0);
	vec3 l = normalize(lightPosition);
	float df = max(0.0, dot(n, l));
	float sf = pow(max(dot(reflect(l, n), r), 0.0), shininess);
	const float A = 0.1;
	const float B = 0.3;
	const float C = 0.6;
	const float D = 1.0;
	float E = fwidth(df);
	if (df > A - E && df < A + E) df = stepmix(A, B, E, df);
	else if (df > B - E && df < B + E) df = stepmix(B, C, E, df);
	else if (df > C - E && df < C + E) df = stepmix(C, D, E, df);
	else if (df < A) df = 0.0;
	else if (df < B) df = B;
	else if (df < C) df = C;
	else df = D;
	E = fwidth(sf);
	if (sf > 0.5 - E && sf < 0.5 + E)
		sf = smoothstep(0.5 - E, 0.5 + E, sf);
	else
		sf = step(0.5, sf);
	vec3 a = vClr.rgb * ambient;
	vec3 d = max(df, 0.0) * vClr.rgb * diffuse;
	color.rgb = a + d + (specular * sf);
	color.a = opacity;
}`

// outline
export const fragMeshOutlineShader = `#version 300 es
precision highp int;
precision highp float;
uniform float opacity;
in vec4 vClr;
in vec3 vN;
out vec4 color;
void main() {
	vec3 r = vec3(0.0, 0.0, 1.0); //rayDir: for orthographic projections moving in Z direction (no need for normal matrix)
	float ambient = 0.3;
	float diffuse = 0.6;
	float specular = 0.25;
	float shininess = 10.0;
	float PenWidth = 0.6;
	vec3 n = normalize(vN);
	vec3 lightPosition = vec3(0.0, 10.0, -5.0);
	vec3 l = normalize(lightPosition);
	float lightNormDot = dot(n, l);
	float view = abs(dot(n,r)); //with respect to viewer
	if (PenWidth < view) discard;
	vec3 a = vClr.rgb * ambient;
	vec3 d = max(lightNormDot, 0.0) * vClr.rgb * diffuse;
	float s = specular * pow(max(dot(reflect(l, n), r), 0.0), shininess);
	color.rgb = a + d + s;
	color.a = opacity;
}`

// Flat shader with edge outline inspired by ggseg
export const fragMeshRimShader = `#version 300 es
precision highp int;
precision highp float;
uniform float opacity;
in vec4 vClr;
in vec3 vN;
out vec4 color;
void main() {
	const float thresh = 0.4;
	const vec3 viewDir = vec3(0.0, 0.0, -1.0);
	vec3 n = normalize(vN);
	// use abs() for two-sided lighting, max() for one sided
	float cosTheta = abs(dot(n, viewDir));
	// float cosTheta = max(dot(n, viewDir), 0.0);
	// optional fresnel equation - adjust exponent
	// cosTheta = 1.0 - pow(1.0 - cosTheta, 2.0);
	// use step for binary edges, smoothstep for feathered edges
	// vec3 d = step(thresh, cosTheta) * vClr.rgb;
	vec3 d = smoothstep(thresh - 0.05, thresh + 0.05, cosTheta) * vClr.rgb;
	color = vec4(d, opacity);
}`

export const fragMeshContourShader = `#version 300 es
precision highp int;
precision highp float;
uniform float opacity;
in vec4 vClr;
in vec3 vN;
out vec4 color;
void main() {
  const float edge0 = 0.1;
  const float edge1 = 0.25;
  const vec3 viewDir = vec3(0.0, 0.0, -1.0);
  vec3 n = normalize(vN);
  float cosTheta = abs(dot(n, viewDir));
  float alpha = 1.0 - smoothstep(edge0, edge1, cosTheta);
  if (alpha <= 0.0) {
    discard;
  }
  color = vec4(0.0, 0.0, 0.0, opacity * alpha);
}`

// Phong headlight shader for edge enhancement, opposite of fresnel rim lighting
export const fragMeshEdgeShader = `#version 300 es
precision highp int;
precision highp float;
uniform float opacity;
in vec4 vClr;
in vec3 vN;
out vec4 color;
void main() {
	vec3 r = vec3(0.0, 0.0, 1.0); //rayDir: for orthographic projections moving in Z direction (no need for normal matrix)
	float diffuse = 1.0;
	float specular = 0.2;
	float shininess = 10.0;
	vec3 n = normalize(vN);
	vec3 lightPosition = vec3(0.0, 0.0, -5.0);
	vec3 l = normalize(lightPosition);
	float lightNormDot = max(dot(n, l), 0.0);
	vec3 d = lightNormDot * vClr.rgb * diffuse;
	float s = specular * pow(max(dot(reflect(l, n), r), 0.0), shininess);
	color = vec4(d + s, opacity);
}`

export const fragMeshDiffuseEdgeShader = `#version 300 es
precision highp int;
precision highp float;
uniform float opacity;
in vec4 vClr;
in vec3 vN;
out vec4 color;
void main() {
	float diffuse = 1.4;
	vec3 l = vec3(0.0, 0.0, -1.0);
	float lightNormDot = max(dot(normalize(vN), l), 0.0);
	color = vec4(lightNormDot * vClr.rgb * diffuse, opacity);
}`

export const fragMeshSpecularEdgeShader = `#version 300 es
precision highp int;
precision highp float;
uniform float opacity;
in vec4 vClr;
in vec3 vN;
out vec4 color;
void main() {
	float specularRGB = 0.7;
	float specularWhite = 0.3;
	float shininess = 10.0;
	float diffuse = 1.0;
	vec3 r = vec3(0.0, 0.0, 1.0); //rayDir: for orthographic projections moving in Z direction (no need for normal matrix)
	vec3 n = normalize(vN);
	vec3 l = vec3(0.0, 0.0, -1.0);
	float lightNormDot = max(dot(n, l), 0.0);
	vec3 d3 = lightNormDot * vClr.rgb * diffuse;
	float s = pow(max(dot(reflect(l, n), r), 0.0), shininess);
	vec3 s3 = specularRGB * s * vClr.rgb;
	s *= specularWhite;
	color = vec4(d3 + s3 + s, opacity);
}`

// https://thorium.rocks/media/curves/curvaceous.html
export const fragMeshShaderCrevice = `#version 300 es
precision highp int;
precision highp float;
uniform float opacity;
in vec4 vClr;
in vec3 vN;
in vec4 vPc;
out vec4 color;
void main() {
	vec3 n = normalize(vN);
	// Compute curvature
	vec3 dx = dFdx(n);
	vec3 dy = dFdy(n);
	vec3 xneg = n - dx;
	vec3 xpos = n + dx;
	vec3 yneg = n - dy;
	vec3 ypos = n + dy;
	float depth = length(vPc.xyz);
	float curv = (cross(xneg, xpos).y - cross(yneg, ypos).x) / depth;
	//at this stage 0.5 for flat, with valleys dark and ridges bright
	curv = 1.0 - (curv + 0.5);
	//clamp
	curv =  min(max(curv, 0.0), 1.0);
	// easing function
	curv = pow(curv, 0.5);
	//modulate ambient and diffuse with curvature
	vec3 r = vec3(0.0, 0.0, 1.0); //rayDir: for orthographic projections moving in Z direction (no need for normal matrix)
	float ambient = 0.6;
	float diffuse = 0.6;
	float specular = 0.2;
	float shininess = 10.0;
	vec3 lightPosition = vec3(0.0, 10.0, -2.0);
	vec3 l = normalize(lightPosition);
	float lightNormDot = dot(n, l);
	vec3 a = vClr.rgb * ambient * curv;
	vec3 d = max(lightNormDot, 0.0) * vClr.rgb * diffuse;
	float s = specular * pow(max(dot(reflect(l, n), r), 0.0), shininess);
	color = vec4(a + d + s, opacity);
}`
// Phong: default
export const fragMeshShader = `#version 300 es
precision highp int;
precision highp float;
uniform float opacity;
in vec4 vClr;
in vec3 vN;
out vec4 color;
void main() {
	vec3 r = vec3(0.0, 0.0, 1.0); //rayDir: for orthographic projections moving in Z direction (no need for normal matrix)
	float ambient = 0.35;
	float diffuse = 0.5;
	float specular = 0.2;
	float shininess = 10.0;
	vec3 n = normalize(vN);
	vec3 lightPosition = vec3(0.0, 10.0, -5.0);
	vec3 l = normalize(lightPosition);
	float lightNormDot = dot(n, l);
	vec3 a = vClr.rgb * ambient;
	vec3 d = max(lightNormDot, 0.0) * vClr.rgb * diffuse;
	float s = specular * pow(max(dot(reflect(l, n), r), 0.0), shininess);
	color = vec4(a + d + s, opacity);
}`

// Matcap: modulate mesh color with spherical matcap image
export const fragMeshMatcapShader = `#version 300 es
precision highp int;
precision highp float;
uniform float opacity;
in vec4 vClr;
in vec3 vN;
uniform sampler2D matCap;
out vec4 color;
void main() {
	vec3 n = normalize(vN);
	vec2 uv = n.xy * 0.5 + 0.5;
	uv.y = 1.0 - uv.y;
	vec3 clr = texture(matCap,uv.xy).rgb * vClr.rgb;
	color = vec4(clr, opacity);
}`

// matte: same as phong without specular and a bit more diffuse
export const fragMeshMatteShader = `#version 300 es
precision highp int;
precision highp float;
uniform float opacity;
in vec4 vClr;
in vec3 vN;
out vec4 color;
void main() {
	float ambient = 0.35;
	float diffuse = 0.6;
	vec3 n = normalize(vN);
	vec3 lightPosition = vec3(0.0, 10.0, -5.0);
	vec3 l = normalize(lightPosition);
	float lightNormDot = dot(n, l);
	vec3 a = vClr.rgb * ambient;
	vec3 d = max(lightNormDot, 0.0) * vClr.rgb * diffuse;
	color = vec4(a + d, opacity);
}`

// Hemispheric
export const fragMeshHemiShader = `#version 300 es
precision highp int;
precision highp float;
uniform float opacity;
in vec4 vClr;
in vec3 vN;
out vec4 color;
void main() {
	vec3 r = vec3(0.0, 0.0, 1.0); //rayDir: for orthographic projections moving in Z direction (no need for normal matrix)
	float ambient = 0.35;
	float diffuse = 0.5;
	float specular = 0.2;
	float shininess = 10.0;
	vec3 n = normalize(vN);
	vec3 lightPosition = vec3(0.0, 10.0, -5.0);
	vec3 l = normalize(lightPosition);
	float lightNormDot = dot(n, l);
	vec3 up = vec3(0.0, 1.0, 0.0);
	float ax = dot(n, up) * 0.5 + 0.5;  //Shreiner et al. (2013) OpenGL Programming Guide, 8th Ed., p 388. ISBN-10: 0321773039
	vec3 upClr = vec3(1.0, 1.0, 0.95);
	vec3 downClr = vec3(0.4, 0.4, 0.6);
	vec3 a = vClr.rgb * ambient;
	a *= mix(downClr, upClr, ax);
	vec3 d = max(lightNormDot, 0.0) * vClr.rgb * diffuse;
	float s = specular * pow(max(dot(reflect(l, n), r), 0.0), shininess);
	color = vec4(a + d + s, opacity);
}`

export const fragMeshShaderSHBlue = `#version 300 es
precision highp int;
precision highp float;
uniform float opacity;
in vec4 vClr;
in vec3 vN;
out vec4 color;
//Spherical harmonics constants
const float C1 = 0.429043;
const float C2 = 0.511664;
const float C3 = 0.743125;
const float C4 = 0.886227;
const float C5 = 0.247708;
//Spherical harmonics coefficients
// Ramamoorthi, R., and P. Hanrahan. 2001b. "An Efficient Representation for Irradiance Environment Maps." In Proceedings of SIGGRAPH 2001, pp. 497–500.
// https://github.com/eskimoblood/processingSketches/blob/master/data/shader/shinyvert.glsl
// https://github.com/eskimoblood/processingSketches/blob/master/data/shader/shinyvert.glsl
// Constants for Eucalyptus Grove lighting
const vec3 L00  = vec3( 0.3783264,  0.4260425,  0.4504587);
const vec3 L1m1 = vec3( 0.2887813,  0.3586803,  0.4147053);
const vec3 L10  = vec3( 0.0379030,  0.0295216,  0.0098567);
const vec3 L11  = vec3(-0.1033028, -0.1031690, -0.0884924);
const vec3 L2m2 = vec3(-0.0621750, -0.0554432, -0.0396779);
const vec3 L2m1 = vec3( 0.0077820, -0.0148312, -0.0471301);
const vec3 L20  = vec3(-0.0935561, -0.1254260, -0.1525629);
const vec3 L21  = vec3(-0.0572703, -0.0502192, -0.0363410);
const vec3 L22  = vec3( 0.0203348, -0.0044201, -0.0452180);
vec3 SH(vec3 vNormal) {
	vNormal = vec3(vNormal.x,vNormal.z,vNormal.y);
	vec3 diffuseColor = C1 * L22 * (vNormal.x * vNormal.x - vNormal.y * vNormal.y) +
	C3 * L20 * vNormal.z * vNormal.z +
	C4 * L00 -
	C5 * L20 +
	2.0 * C1 * L2m2 * vNormal.x * vNormal.y +
	2.0 * C1 * L21  * vNormal.x * vNormal.z +
	2.0 * C1 * L2m1 * vNormal.y * vNormal.z +
	2.0 * C2 * L11  * vNormal.x +
	2.0 * C2 * L1m1 * vNormal.y +
	2.0 * C2 * L10  * vNormal.z;
	return diffuseColor;
}
void main() {
	vec3 r = vec3(0.0, 0.0, 1.0); //rayDir: for orthographic projections moving in Z direction (no need for normal matrix)
	float ambient = 0.3;
	float diffuse = 0.6;
	float specular = 0.1;
	float shininess = 10.0;
	vec3 n = normalize(vN);
	vec3 lightPosition = vec3(0.0, 10.0, -5.0);
	vec3 l = normalize(lightPosition);
	float s = specular * pow(max(dot(reflect(l, n), r), 0.0), shininess);
	vec3 a = vClr.rgb * ambient;
	vec3 d = vClr.rgb * diffuse * SH(-reflect(n, vec3(l.x, l.y, -l.z)) );
	color = vec4(a + d + s, opacity);
}`

export const vertFlatMeshShader = `#version 300 es
layout(location=0) in vec3 pos;
layout(location=1) in vec4 norm;
layout(location=2) in vec4 clr;
uniform mat4 mvpMtx;
//uniform mat4 modelMtx;
uniform mat4 normMtx;
out vec4 vClr;
flat out vec3 vN;
void main(void) {
	gl_Position = mvpMtx * vec4(pos, 1.0);
	vN = normalize((normMtx * vec4(norm.xyz,1.0)).xyz);
	//vV = -vec3(modelMtx*vec4(pos,1.0));
	vClr = clr;
}`

export const fragFlatMeshShader = `#version 300 es
precision highp int;
precision highp float;
uniform float opacity;
in vec4 vClr;
flat in vec3 vN;
out vec4 color;
void main() {
	vec3 r = vec3(0.0, 0.0, 1.0); //rayDir: for orthographic projections moving in Z direction (no need for normal matrix)
	float ambient = 0.35;
	float diffuse = 0.5;
	float specular = 0.2;
	float shininess = 10.0;
	vec3 n = normalize(vN);
	vec3 lightPosition = vec3(0.0, 10.0, -5.0);
	vec3 l = normalize(lightPosition);
	float lightNormDot = dot(n, l);
	vec3 a = vClr.rgb * ambient;
	vec3 d = max(lightNormDot, 0.0) * vClr.rgb * diffuse;
	float s = specular * pow(max(dot(reflect(l, n), r), 0.0), shininess);
	color = vec4(a + d + s, opacity);
}`

export const fragVolumePickingShader =
  `#version 300 es
#line 1260
//precision highp int;
precision highp float;
uniform vec3 rayDir;
uniform vec3 volScale;
uniform vec3 texVox;
uniform vec4 clipPlane;
uniform highp sampler3D volume, overlay;
uniform highp sampler3D paqd;
uniform vec4 paqdUniforms;
uniform float overlays;
uniform float clipThick;
uniform vec3 clipLo;
uniform vec3 clipHi;
uniform mat4 matRAS;
uniform mat4 mvpMtx;
uniform float drawOpacity, renderOverlayBlend;
uniform highp sampler3D drawing;
uniform highp sampler2D colormap;
uniform int backgroundMasksOverlays;
in vec3 vColor;
out vec4 fColor;
` +
  kRenderFunc +
  `
void main() {
	int id = 254;
	vec3 start = vColor;
	gl_FragDepth = 0.0;
	fColor = vec4(0.0, 0.0, 0.0, 0.0); //assume no hit: ID = 0
	float fid = float(id & 255)/ 255.0;
	vec3 backPosition = GetBackPosition(start);
	vec3 dir = normalize(backPosition - start);
	clipVolumeStart(start, backPosition);
	float len = length(backPosition - start);
	float lenVox = length((texVox * start) - (texVox * backPosition));
	if ((lenVox < 0.5) || (len > 3.0)) return;//discard; //length limit for parallel rays
	float sliceSize = len / lenVox; //e.g. if ray length is 1.0 and traverses 50 voxels, each voxel is 0.02 in unit cube
	float stepSize = sliceSize; //quality: larger step is faster traversal, but fewer samples
	float opacityCorrection = stepSize/sliceSize;
	dir = normalize(dir);
	vec4 samplePos = vec4(start.xyz, 0.0); //ray position
	float lenNoClip = len;
	bool isClip = false;
	vec4 clipPos = applyClip(dir, samplePos, len, isClip);
	if (isClip) fColor = vec4(samplePos.xyz, 253.0 / 255.0); //assume no hit: ID = 0
	//start: OPTIONAL fast pass: rapid traversal until first hit
	float stepSizeFast = sliceSize * 1.9;
	vec4 deltaDirFast = vec4(dir.xyz * stepSizeFast, stepSizeFast);
	while (samplePos.a <= len) {
		float val = texture(volume, samplePos.xyz).a;
		if (val > 0.01) {
			fColor = vec4(samplePos.rgb, fid);
			gl_FragDepth = frac2ndc(samplePos.xyz);
			break;
		}
		samplePos += deltaDirFast; //advance ray position
	}
	//end: fast pass
	if ((overlays < 1.0) || (backgroundMasksOverlays > 0)) {
		return; //background hit, no overlays
	}
	//overlay pass
	len = min(lenNoClip, samplePos.a); //only find overlay closer than background
	samplePos = vec4(start.xyz, 0.0); //ray position
	while (samplePos.a <= len) {
		float val = texture(overlay, samplePos.xyz).a;
		if (val > 0.01) {
			fColor = vec4(samplePos.rgb, fid);
			gl_FragDepth = frac2ndc(samplePos.xyz);
			return;
		}
		samplePos += deltaDirFast; //advance ray position
	}
	//if (fColor.a == 0.0) discard; //no hit in either background or overlays
	//you only get here if there is a hit with the background that is closer than any overlay
}`

export const vertOrientCubeShader = `#version 300 es
// an attribute is an input (in) to a vertex shader.
// It will receive data from a buffer
layout(location=0)  in vec3 a_position;
layout(location=1)  in vec3 a_color;
// A matrix to transform the positions by
uniform mat4 u_matrix;
out vec3 vColor;
// all shaders have a main function
void main() {
	// Multiply the position by the matrix.
	vec4 pos = vec4(a_position, 1.0);
	gl_Position = u_matrix * vec4(pos);
	vColor = a_color;
}
`

export const fragOrientCubeShader = `#version 300 es
precision highp float;
uniform vec4 u_color;
in vec3 vColor;
out vec4 outColor;
void main() {
	outColor = vec4(vColor, 1.0);
}`

export const vertPassThroughShader = `#version 300 es
#line 1359
precision highp int;
precision highp float;
in vec3 vPos;
out vec2 TexCoord;
void main() {
	TexCoord = vPos.xy;
	vec2 viewCoord = (vPos.xy - 0.5) * 2.0;
	gl_Position = vec4((vPos.xy - 0.5) * 2.0, 0.0, 1.0);
}`

export const fragPassThroughShader = `#version 300 es
precision highp int;
precision highp float;
in vec2 TexCoord;
out vec4 FragColor;
uniform float coordZ;
uniform lowp sampler3D in3D;
void main(void) {
 FragColor = texture(in3D, vec3(TexCoord.xy, coordZ));
}`

export const blurVertShader = `#version 300 es
#line 286
precision highp int;
precision highp float;
in vec3 vPos;
out vec2 TexCoord;
void main() {
    TexCoord = vPos.xy;
    gl_Position = vec4( (vPos.xy-vec2(0.5,0.5))* 2.0, 0.0, 1.0);
}`

export const blurFragShader = `#version 300 es
#line 298
precision highp int;
precision highp float;
in vec2 TexCoord;
out vec4 FragColor;
uniform float coordZ;
uniform float dX;
uniform float dY;
uniform float dZ;
uniform highp sampler3D intensityVol;
void main(void) {
 vec3 vx = vec3(TexCoord.xy, coordZ);
 vec4 samp = texture(intensityVol,vx+vec3(+dX,+dY,+dZ));
 samp += texture(intensityVol,vx+vec3(+dX,+dY,-dZ));
 samp += texture(intensityVol,vx+vec3(+dX,-dY,+dZ));
 samp += texture(intensityVol,vx+vec3(+dX,-dY,-dZ));
 samp += texture(intensityVol,vx+vec3(-dX,+dY,+dZ));
 samp += texture(intensityVol,vx+vec3(-dX,+dY,-dZ));
 samp += texture(intensityVol,vx+vec3(-dX,-dY,+dZ));
 samp += texture(intensityVol,vx+vec3(-dX,-dY,-dZ));
 FragColor = samp*0.125;
}`

export const sobelBlurFragShader = `#version 300 es
#line 298
precision highp int;
precision highp float;
in vec2 TexCoord;
out vec4 FragColor;
uniform float coordZ;
uniform float dX;
uniform float dY;
uniform float dZ;
uniform highp sampler3D intensityVol;
void main(void) {
 vec3 vx = vec3(TexCoord.xy, coordZ);
 vec4 XYZ = texture(intensityVol,vx+vec3(+dX,+dY,+dZ));
 vec4 OYZ = texture(intensityVol,vx+vec3(0.0,+dY,+dZ));
 vec4 xYZ = texture(intensityVol,vx+vec3(-dX,+dY,+dZ));
 vec4 XOZ = texture(intensityVol,vx+vec3(+dX,0.0,+dZ));
 vec4 OOZ = texture(intensityVol,vx+vec3(0.0,0.0,+dZ));
 vec4 xOZ = texture(intensityVol,vx+vec3(-dX,0.0,+dZ));
 vec4 XyZ = texture(intensityVol,vx+vec3(+dX,-dY,+dZ));
 vec4 OyZ = texture(intensityVol,vx+vec3(0.0,-dY,+dZ));
 vec4 xyZ = texture(intensityVol,vx+vec3(-dX,-dY,+dZ));

 vec4 XYO = texture(intensityVol,vx+vec3(+dX,+dY,0.0));
 vec4 OYO = texture(intensityVol,vx+vec3(0.0,+dY,0.0));
 vec4 xYO = texture(intensityVol,vx+vec3(-dX,+dY,0.0));
 vec4 XOO = texture(intensityVol,vx+vec3(+dX,0.0,0.0));
 vec4 OOO = texture(intensityVol,vx+vec3(0.0,0.0,0.0));
 vec4 xOO = texture(intensityVol,vx+vec3(-dX,0.0,0.0));
 vec4 XyO = texture(intensityVol,vx+vec3(+dX,-dY,0.0));
 vec4 OyO = texture(intensityVol,vx+vec3(0.0,-dY,0.0));
 vec4 xyO = texture(intensityVol,vx+vec3(-dX,-dY,0.0));

 vec4 XYz = texture(intensityVol,vx+vec3(+dX,+dY,-dZ));
 vec4 OYz = texture(intensityVol,vx+vec3(0.0,+dY,-dZ));
 vec4 xYz = texture(intensityVol,vx+vec3(-dX,+dY,-dZ));
 vec4 XOz = texture(intensityVol,vx+vec3(+dX,0.0,-dZ));
 vec4 OOz = texture(intensityVol,vx+vec3(0.0,0.0,-dZ));
 vec4 xOz = texture(intensityVol,vx+vec3(-dX,0.0,-dZ));
 vec4 Xyz = texture(intensityVol,vx+vec3(+dX,-dY,-dZ));
 vec4 Oyz = texture(intensityVol,vx+vec3(0.0,-dY,-dZ));
 vec4 xyz = texture(intensityVol,vx+vec3(-dX,-dY,-dZ));

 vec4 blurred = vec4 (0.0, 0.0, 0.0, 0.0);
 blurred.r = 2.0*(xOz.r +xOZ.r +xyO.r +xYO.r +xOO.r +XOz.r +XOZ.r +XyO.r +XYO.r +XOO.r) +xyz.r +xyZ.r +xYz.r +xYZ.r +Xyz.r +XyZ.r +XYz.r +XYZ.r;
 blurred.g = 2.0*(Oyz.r +OyZ.r +xyO.r +XyO.r +OyO.r +OYz.r +OYZ.r +xYO.r +XYO.r +OYO.r) +xyz.r +Xyz.r +xyZ.r +XyZ.r +xYz.r +XYz.r +xYZ.r +XYZ.r;
 blurred.b = 2.0*(Oyz.r +OYz.r +xOz.r +XOz.r +OOz.r +OyZ.r +OYZ.r +xOZ.r +XOZ.r +OOZ.r) +xyz.r +Xyz.r +xYz.r +XYz.r +xyZ.r +XyZ.r +XyZ.r +XYZ.r;
 blurred.a = 0.32*(abs(blurred.r)+abs(blurred.g)+abs(blurred.b));
 // 0.0357 = 1/28 to account for weights, rescale to 2**16,
 FragColor = 0.0357*blurred;
}`

// -18.988706873717717 = log2(1/(255**2*8)) // 8 is chosen for contrast
// 1.922337562475971e-06 = 1/(255**2*8)
const kGradientMagnitude = `
  gradientSample.a = log2(gradientSample.r*gradientSample.r + gradientSample.g*gradientSample.g + gradientSample.b*gradientSample.b + 1.922337562475971e-06) + 18.988706873717717;
`

export const sobelFirstOrderFragShader = `#version 300 es
#line 323
precision highp int;
precision highp float;
in vec2 TexCoord;
out vec4 FragColor;
uniform float coordZ;
uniform float dX;
uniform float dY;
uniform float dZ;
uniform highp sampler3D intensityVol;
void main(void) {
  vec3 vx = vec3(TexCoord.xy, coordZ);
  //Neighboring voxels 'T'op/'B'ottom, 'A'nterior/'P'osterior, 'R'ight/'L'eft
  float TAR = texture(intensityVol,vx+vec3(+dX,+dY,+dZ)).r;
  float TAL = texture(intensityVol,vx+vec3(+dX,+dY,-dZ)).r;
  float TPR = texture(intensityVol,vx+vec3(+dX,-dY,+dZ)).r;
  float TPL = texture(intensityVol,vx+vec3(+dX,-dY,-dZ)).r;
  float BAR = texture(intensityVol,vx+vec3(-dX,+dY,+dZ)).r;
  float BAL = texture(intensityVol,vx+vec3(-dX,+dY,-dZ)).r;
  float BPR = texture(intensityVol,vx+vec3(-dX,-dY,+dZ)).r;
  float BPL = texture(intensityVol,vx+vec3(-dX,-dY,-dZ)).r;
  vec4 gradientSample = vec4 (0.0, 0.0, 0.0, 0.0);
  gradientSample.r = BAR+BAL+BPR+BPL -TAR-TAL-TPR-TPL;
  gradientSample.g = TPR+TPL+BPR+BPL -TAR-TAL-BAR-BAL;
  gradientSample.b = TAL+TPL+BAL+BPL -TAR-TPR-BAR-BPR;
${kGradientMagnitude}
	// 0.04242020977371934 = 1/(log2(3*8) - log2(1/(255**2*8))) // 3*8 -> max for 1st order gradient
	gradientSample.a *= 0.04242020977371934;
  gradientSample.rgb = normalize(gradientSample.rgb);
  gradientSample.rgb = (gradientSample.rgb * 0.5)+0.5;
  FragColor = gradientSample;
}`

export const sobelSecondOrderFragShader = `#version 300 es
#line 323
precision highp int;
precision highp float;
in vec2 TexCoord;
out vec4 FragColor;
uniform float coordZ;
uniform float dX;
uniform float dY;
uniform float dZ;
uniform float dX2;
uniform float dY2;
uniform float dZ2;
uniform highp sampler3D intensityVol;
void main(void) {
  vec3 vx = vec3(TexCoord.xy, coordZ);
  //Neighboring voxels 'T'op/'B'ottom, 'A'nterior/'P'osterior, 'R'ight/'L'eft
  vec4 TAR = texture(intensityVol,vx+vec3(+dX,+dY,+dZ));
  vec4 TAL = texture(intensityVol,vx+vec3(+dX,+dY,-dZ));
  vec4 TPR = texture(intensityVol,vx+vec3(+dX,-dY,+dZ));
  vec4 TPL = texture(intensityVol,vx+vec3(+dX,-dY,-dZ));
  vec4 BAR = texture(intensityVol,vx+vec3(-dX,+dY,+dZ));
  vec4 BAL = texture(intensityVol,vx+vec3(-dX,+dY,-dZ));
  vec4 BPR = texture(intensityVol,vx+vec3(-dX,-dY,+dZ));
  vec4 BPL = texture(intensityVol,vx+vec3(-dX,-dY,-dZ));
  vec4 T = texture(intensityVol,vx+vec3(+dX2,0.0,0.0));
  vec4 A = texture(intensityVol,vx+vec3(0.0,+dY2,0.0));
  vec4 R = texture(intensityVol,vx+vec3(0.0,0.0,+dZ2));
  vec4 B = texture(intensityVol,vx+vec3(-dX2,0.0,0.0));
  vec4 P = texture(intensityVol,vx+vec3(0.0,-dY2,0.0));
  vec4 L = texture(intensityVol,vx+vec3(0.0,0.0,-dZ2));
  vec4 gradientSample = vec4 (0.0, 0.0, 0.0, 0.0);
  gradientSample.r = -4.0*B.r +8.0*(BAR.r+BAL.r+BPR.r+BPL.r) -8.0*(TAR.r+TAL.r+TPR.r+TPL.r) +4.0*T.r;
  gradientSample.g = -4.0*P.g +8.0*(TPR.g+TPL.g+BPR.g+BPL.g) -8.0*(TAR.g+TAL.g+BAR.g+BAL.g) +4.0*A.g;
  gradientSample.b = -4.0*L.b +8.0*(TAL.b+TPL.b+BAL.b+BPL.b) -8.0*(TAR.b+TPR.b+BAR.b+BPR.b) +4.0*R.b;
${kGradientMagnitude}
	gradientSample.a *= 0.0325;
  gradientSample.rgb = normalize(gradientSample.rgb);
  gradientSample.rgb =  (gradientSample.rgb * 0.5)+0.5;
  FragColor = gradientSample;
}`
