varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
#include <common>
#include <skinning_pars_vertex>

void main() {
    #include <skinbase_vertex>
    #include <begin_vertex>
    #include <beginnormal_vertex>
    #include <defaultnormal_vertex>
    #include <skinning_vertex>
    #include <project_vertex>

    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = vec3(modelViewMatrix * vec4(position, 1.0));
    gl_Position = projectionMatrix * mvPosition;
}
