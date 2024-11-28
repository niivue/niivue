#version 300 es
precision mediump float;

in vec2 v_position;

uniform vec4 u_color;
uniform float u_mixValue;

out vec4 outColor;

void main() {
    // Center the ellipse at the origin (0.0, 0.0)
    vec2 center = vec2(0.0, 0.0);

    // Calculate the distance from the center, normalized
    float value = pow((v_position.x - center.x), 2.0) + pow((v_position.y - center.y), 2.0);

    // Use smoothstep with wider values to create a fuzzier edge
    float alpha = smoothstep(0.3, 1.0, value);

    // Mix between color and transparency based on u_mixValue
    vec4 blendedColor = mix(vec4(0.0, 0.0, 0.0, 0.0), u_color, u_mixValue);
    outColor = vec4(blendedColor.rgb, blendedColor.a * (1.0 - alpha));
}
