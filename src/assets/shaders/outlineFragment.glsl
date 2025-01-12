#include <packing>

uniform sampler2D sceneColorBuffer;
uniform sampler2D depthBuffer;
uniform sampler2D normalBuffer;
uniform sampler2D nonOutlinesDepthBuffer;
uniform float cameraNear;
uniform float cameraFar;
uniform vec4 screenSize;
uniform vec3 outlineColor;
uniform float outlineThickness;
uniform vec4 multiplierParameters;
uniform int debugVisualize;

varying vec2 vUv;

float readDepth(sampler2D depthSampler, vec2 coord) {
    float fragCoordZ = texture2D(depthSampler, coord).x;
    float viewZ = perspectiveDepthToViewZ(fragCoordZ, cameraNear, cameraFar);
    return viewZToOrthographicDepth(viewZ, cameraNear, cameraFar);
}

// functions for reading normals and depth of neighboring pixels
float getPixelDepth(int x, int y) {
    // screenSize.zw is pixel size, vUv is current position
    return readDepth(depthBuffer, vUv + screenSize.zw * vec2(x, y) * outlineThickness);
}

vec3 getPixelNormal(int x, int y) {
    return texture2D(normalBuffer, vUv + screenSize.zw * vec2(x, y) * outlineThickness).rgb;
}

float saturate(float num) {
    return clamp(num, 0.0, 1.0);
}

void main() {
    vec4 sceneColor = texture2D(sceneColorBuffer, vUv);
    float depth = getPixelDepth(0, 0);
    float nonOutlinesDepth = readDepth(nonOutlinesDepthBuffer, vUv + screenSize.zw);
    vec3 normal = getPixelNormal(0, 0);

    // apply multiplier & bias to each
    float depthBias = multiplierParameters.x;
    float depthMultiplier = multiplierParameters.y;
    float normalBias = multiplierParameters.z;
    float normalMultiplier = multiplierParameters.w;

    // Get the difference between depth of neighboring pixels and current.
    float depthDiff = 0.0;
    depthDiff += abs(depth - getPixelDepth(1, 0));
    depthDiff += abs(depth - getPixelDepth(-1, 0));
    depthDiff += abs(depth - getPixelDepth(0, 1));
    depthDiff += abs(depth - getPixelDepth(0, -1));

    // get the difference between normals of neighboring pixels and current
    float normalDiff = 0.0;
    normalDiff += distance(normal, getPixelNormal(1, 0));
    normalDiff += distance(normal, getPixelNormal(0, 1));
    normalDiff += distance(normal, getPixelNormal(0, 1));
    normalDiff += distance(normal, getPixelNormal(0, -1));
    normalDiff += distance(normal, getPixelNormal(1, 1));
    normalDiff += distance(normal, getPixelNormal(1, -1));
    normalDiff += distance(normal, getPixelNormal(-1, 1));
    normalDiff += distance(normal, getPixelNormal(-1, -1));

    depthDiff = depthDiff * depthMultiplier;
    depthDiff = saturate(depthDiff);
    depthDiff = pow(depthDiff, depthBias);

    normalDiff = normalDiff * normalMultiplier;
    normalDiff = saturate(normalDiff);
    normalDiff = pow(normalDiff, normalBias);

    float outline = normalDiff + depthDiff;

    // don't render outlines if they are behind something in the original depth buffer we find this out by comparing the depth value of current pixel
    if (depth > nonOutlinesDepth) {
        outline = 0.0;
    }

    if (outline >= 1.0) {
        // outlines only
        gl_FragColor = vec4(vec3(outline * outlineColor), 1.0);
    } else if (outline > 0.0) {
        // mix outline with scene color
        vec4 outlineColor = vec4(outlineColor, 1.0);
        gl_FragColor = vec4(mix(sceneColor, outlineColor, outline));
    } else {
        // scene color only
        gl_FragColor = sceneColor;
    }

    // combine outline with scene color
    // vec4 outlineColor = vec4(outlineColor, 1.0);
    // gl_FragColor = vec4(mix(sceneColor, outlineColor, outline));

    // outlines only
    // gl_FragColor = vec4(vec3(outline * outlineColor), 1.0);
}
