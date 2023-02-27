## Introduction

There are [several approaches to render text in WebGL](https://stackoverflow.com/questions/25956272/better-quality-text-in-webgl) as described [here](https://css-tricks.com/techniques-for-rendering-text-with-webgl/). NiiVue uses
[multi-channel signed distance field](https://github.com/Chlumsky/msdfgen). The default font supplied with NiiVue is [Roboto](https://fonts.google.com/specimen/Roboto?preview.text_type=custom), created with [msdf-atlas-gen](https://github.com/Chlumsky/msdf-atlas-gen) using the command:

```
msdf-atlas-gen.exe -font Roboto-Regular.ttf -charset chars.txt -pxrange 2 -dimensions 512 256 -format png -json fnt.json -imageout fnt.png
```

Where chars.txt is a text file with the following characters

```
"\"\\ ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890!`?'.,;:()[]{}<>|/@^$-%+=#_&~*"
```

Running the command will generate output

```
Loaded geometry of 95 out of 95 characters.
Glyph size: 59.65625 pixels/EM
Atlas image file saved.
Glyph layout and metadata written into JSON file.
```

The typeface or character set can be changed by modifiying the commands. NiiVue will read the JSON format created by msdf-atlas-gen (version 1.1), so to change the typeface used by NiiVue, simply replace the `fnt.json` and `fnt.png` files in `public` folder.

## Usage

Viktor Chlumský's[GLSL fragment shader](https://github.com/Chlumsky/msdfgen) is easily adapted for WebGL. The uniform screenPxRange is described by Viktor as `the distance field range in output screen pixels. For example, if the pixel range was set to 2 when generating a 32x32 distance field, and it is used to draw a quad that is 72x72 pixels on the screen, it should return 4.5 (because 72/32 * 2 = 4.5).` Note that both distance range and distance field are reported in the JSON file created by msdf-atlas-gen: `"distanceRange":2,"size":59.65625`. Therefore, the complete WebGL fragment shader is:

```
#version 300 es
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
	//color = vec4(msd, 1.0); return;
    float sd = median(msd.r, msd.g, msd.b);
    float screenPxDistance = screenPxRange*(sd - 0.5);
    float opacity = clamp(screenPxDistance + 0.5, 0.0, 1.0);
	color = vec4(fontColor.rgb , opacity);
}
```
