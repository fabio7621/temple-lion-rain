// 全畫面調色：色散、暗角、掃描線、故障、閃電
export const gradeVert = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

export const gradeFrag = `uniform sampler2D tDiffuse; uniform float uTime, uGlitch, uFlash; uniform vec2 uRes; varying vec2 vUv;
    float h1(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec2 uv = vUv;
      float fr = floor(uTime * 24.0);
      float band = floor(uv.y * 34.0);
      float gs = step(1.0 - 0.16 * uGlitch, h1(vec2(band, fr))) * uGlitch;
      uv.x += (h1(vec2(band, fr + 1.0)) - 0.5) * 0.07 * gs;
      vec2 d = uv - 0.5; float r = dot(d, d);
      float ca = 0.004 + 0.012 * r + 0.012 * uGlitch;
      vec3 c = vec3(texture2D(tDiffuse, uv + d * ca).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - d * ca).b);
      c += vec3(0.32, 0.4, 0.55) * uFlash * (0.5 + 0.5 * uv.y);
      c *= mix(1.0, 0.28, smoothstep(0.12, 0.72, r * 1.7));
      c += (h1(uv * uRes + fract(uTime) * 91.0) - 0.5) * 0.05;
      c *= 0.965 + 0.035 * sin(uv.y * uRes.y * 1.6);
      c += vec3(0.0, 0.008, 0.012) * (1.0 - smoothstep(0.0, 0.25, dot(c, vec3(0.333))));
      gl_FragColor = vec4(c, 1.0);
    }`;
