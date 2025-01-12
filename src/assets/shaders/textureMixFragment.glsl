uniform sampler2D texture1;
uniform sampler2D texture2;
uniform float transition;
varying vec2 vUv;

void main() {
    // Get colors from both textures
    vec4 tex1 = texture2D(texture1, vUv);
    vec4 tex2 = texture2D(texture2, vUv);

    // Convert from sRGB to linear space
    tex1.rgb = pow(tex1.rgb, vec3(2.2));
    tex2.rgb = pow(tex2.rgb, vec3(2.2));

    // Determine which texture to use based on transition threshold
    vec4 finalColor;
    if (transition < 0.5) {
        // During transition (0.0 to 0.5), interpolate from texture1 to texture2
        float normalizedTransition = transition * 2.0; // Scale 0-0.5 to 0-1
        finalColor = mix(tex1, tex2, normalizedTransition);
    } else {
        // After transition (0.5 to 1.0), show only texture2
        finalColor = tex2;
    }

    // Convert back to sRGB space
    finalColor.rgb = pow(finalColor.rgb, vec3(1.0 / 2.2));

    gl_FragColor = finalColor;
}
