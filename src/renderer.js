'use strict';
/* ===================== WebGL2 렌더러 (외부 라이브러리 없음) ===================== */
const MAT = { PLAIN: 0, WALL: 1, FLOOR: 2, BRONZE: 3, EMIT: 4, GOLD: 5, CEIL: 6, CLAY: 7, WOOD: 8, SILK: 9 };
const MAX_LIGHTS = 12;

const MAIN_VS = `#version 300 es
in vec3 aPos; in vec3 aNrm; in vec3 aCol; in float aMat; in vec2 aUV;
uniform mat4 uVP; uniform mat4 uModel;
out vec3 vPos; out vec3 vNrm; out vec3 vCol; out float vMat; out vec2 vUV;
void main(){
  vec4 wp = uModel * vec4(aPos,1.0);
  vPos = wp.xyz; vNrm = normalize(mat3(uModel) * aNrm); vCol = aCol; vMat = aMat; vUV = aUV;
  gl_Position = uVP * wp;
}`;
const MAIN_FS = `#version 300 es
precision highp float;
in vec3 vPos; in vec3 vNrm; in vec3 vCol; in float vMat; in vec2 vUV;
uniform vec4 uLP[${MAX_LIGHTS}]; uniform vec3 uLC[${MAX_LIGHTS}]; uniform int uNL;
uniform vec3 uAmb; uniform vec3 uFogC; uniform float uFogD; uniform vec3 uCam; uniform float uTime;
uniform vec4 uTint; uniform float uEmis; uniform sampler2D uTex; uniform int uUseTex;
out vec4 outC;
float h3(vec3 p){ p=fract(p*0.3183099+0.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float n3(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z); }
void main(){
  vec3 n = normalize(vNrm); vec3 base = vCol; float m = vMat + 0.5; float spec = 0.0;
  if (m < 1.0) { base *= 0.9 + 0.2*n3(vPos*3.0); }
  else if (m < 2.0) { // 석벽 블록
    vec2 uv = abs(n.x) > 0.5 ? vPos.zy : vPos.xy;
    float row = floor(uv.y/0.6); uv.x += mod(row,2.0)*0.6;
    vec2 cell = floor(uv/vec2(1.2,0.6)); vec2 f = fract(uv/vec2(1.2,0.6));
    float g = min(min(f.x,1.0-f.x)*1.2, min(f.y,1.0-f.y)*0.6);
    float bid = h3(vec3(cell, row));
    base *= (0.75 + 0.35*bid) * (0.8 + 0.3*n3(vPos*4.0));
    base *= mix(0.35, 1.0, smoothstep(0.015, 0.045, g));
  } else if (m < 3.0) { // 바닥 석판 + 균열
    vec2 uv = vPos.xz; vec2 f = fract(uv/2.0); vec2 c = floor(uv/2.0);
    float g = min(min(f.x,1.0-f.x), min(f.y,1.0-f.y))*2.0;
    base *= (0.8 + 0.3*h3(vec3(c,3.0))) * (0.8 + 0.35*n3(vPos*2.5));
    base *= mix(0.4, 1.0, smoothstep(0.02, 0.06, g));
    float cr = abs(n3(vec3(uv*0.7, 1.0)) - 0.5);
    base *= mix(0.45, 1.0, smoothstep(0.006, 0.02, cr));
    base = mix(base, vec3(0.42,0.38,0.33), 0.25*n3(vPos*0.8)); // 먼지
  } else if (m < 4.0) { base *= 0.75 + 0.4*n3(vPos*6.0); base = mix(base, vec3(0.25,0.45,0.38), 0.35*smoothstep(0.5,0.8,n3(vPos*3.0))); spec = 0.6; }
  else if (m < 5.0) { outC = vec4(base * (1.6 + uEmis), 1.0) * uTint; return; }
  else if (m < 6.0) { base *= 0.85 + 0.3*n3(vPos*8.0); spec = 1.2; }
  else if (m < 7.0) { base *= 0.6 + 0.5*n3(vPos*1.5); }
  else if (m < 8.0) { base *= 0.7 + 0.45*n3(vPos*7.0) ; base *= 0.85 + 0.2*n3(vPos*30.0); }
  else if (m < 9.0) { base *= 0.7 + 0.4*n3(vec3(vPos.x*1.0, vPos.y*30.0, vPos.z*1.0)); }
  else { base *= 0.85 + 0.3*sin(vPos.x*20.0 + vPos.y*10.0)*0.5; spec = 0.3; }
  vec4 tc = vec4(1.0);
  if (uUseTex == 1) { tc = texture(uTex, vUV); base *= tc.rgb; }
  vec3 V = normalize(uCam - vPos);
  vec3 lit = uAmb * (0.55 + 0.45*n.y) + uAmb*0.25;
  for (int i = 0; i < ${MAX_LIGHTS}; i++) {
    if (i >= uNL) break;
    vec3 L = uLP[i].xyz - vPos; float d = length(L); float r = uLP[i].w;
    if (d > r) continue;
    L /= d; float att = 1.0 - d/r; att *= att;
    float df = max(dot(n, L), 0.0)*0.85 + 0.15;
    lit += uLC[i] * att * df;
    if (spec > 0.0) lit += uLC[i] * att * spec * pow(max(dot(n, normalize(L+V)), 0.0), 24.0);
  }
  vec3 col = base * lit + base * uEmis;
  float dist = length(uCam - vPos);
  float fog = 1.0 - exp(-pow(uFogD*dist, 2.0));
  col = mix(col, uFogC, clamp(fog,0.0,1.0));
  col = col / (1.0 + col*0.35); // 부드러운 톤매핑
  outC = vec4(col, tc.a) * uTint;
}`;

const PART_VS = `#version 300 es
in vec3 aPos; in vec2 aSeed;
uniform mat4 uVP; uniform float uTime; uniform vec3 uCam; uniform float uScale; uniform int uMode;
out float vLife; out float vType; out float vFade;
void main(){
  vec3 p = aPos; float s = aSeed.x; float life = 0.0; float size = 0.0;
  if (uMode == 0) { // 횃불 불꽃
    life = fract(uTime*1.7 + s);
    p.y += life*0.55; p.x += sin(uTime*9.0 + s*40.0)*0.05*life; p.z += cos(uTime*7.0 + s*30.0)*0.05*life;
    size = mix(0.32, 0.05, life);
  } else { // 공기 중 먼지
    vec3 drift = vec3(sin(s*13.0), sin(s*7.0)*0.3, cos(s*11.0)) * 0.15 * uTime;
    vec3 box = vec3(24.0, 8.0, 24.0);
    p = uCam + mod(aPos + drift - uCam + box*0.5, box) - box*0.5;
    p.y = clamp(p.y, 0.1, 7.5);
    life = 0.5 + 0.5*sin(uTime*0.8 + s*20.0);
    size = 0.035;
  }
  vLife = life; vType = float(uMode);
  vec4 cp = uVP * vec4(p, 1.0);
  float dist = max(cp.w, 0.1);
  vFade = clamp(1.0 - dist/40.0, 0.0, 1.0);
  gl_PointSize = clamp(size * uScale / dist, 1.0, 64.0);
  gl_Position = cp;
}`;
const PART_FS = `#version 300 es
precision mediump float;
in float vLife; in float vType; in float vFade; out vec4 o;
void main(){
  vec2 c = gl_PointCoord - 0.5; float d = length(c); if (d > 0.5) discard;
  float a = smoothstep(0.5, 0.0, d);
  if (vType < 0.5) { vec3 col = mix(vec3(1.0,0.85,0.4), vec3(0.9,0.2,0.05), vLife); o = vec4(col*a*(1.0-vLife*0.6), 1.0); }
  else { o = vec4(vec3(0.9,0.8,0.6), a*0.35*vLife*vFade); }
}`;
const MIST_VS = `#version 300 es
in vec3 aPos; uniform mat4 uVP; out vec3 vP;
void main(){ vP = aPos; gl_Position = uVP * vec4(aPos,1.0); }`;
const MIST_FS = `#version 300 es
precision mediump float; in vec3 vP; uniform float uTime; uniform vec3 uCam; uniform vec3 uMistC; out vec4 o;
float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(h2(i),h2(i+vec2(1,0)),f.x), mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x), f.y); }
void main(){
  vec2 p = vP.xz*0.18 + vec2(uTime*0.05, uTime*0.03);
  float n = n2(p)*0.6 + n2(p*2.3 - uTime*0.04)*0.4;
  float d = length(uCam.xz - vP.xz);
  float a = smoothstep(0.35, 0.85, n) * 0.22 * smoothstep(1.0, 5.0, d) * (1.0 - smoothstep(30.0, 45.0, d));
  o = vec4(uMistC, a);
}`;

const R = {
  gl: null, canvas: null, prog: null, pprog: null, mprog: null, u: {}, pu: {}, mu: {},
  vp: null, camPos: [0, 0, 0], time: 0, pixelRatio: 1, whiteTex: null, lights: [], maxLights: MAX_LIGHTS,
  amb: [0.08, 0.075, 0.09], fogC: [0.02, 0.018, 0.02], fogD: 0.04,
  init(canvas) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', { antialias: true, powerPreference: 'high-performance' });
    if (!gl) return false;
    this.gl = gl;
    this.prog = this.compile(MAIN_VS, MAIN_FS);
    this.pprog = this.compile(PART_VS, PART_FS);
    this.mprog = this.compile(MIST_VS, MIST_FS);
    if (!this.prog || !this.pprog || !this.mprog) return false;
    const U = (p, names) => { const o = {}; names.forEach(n => o[n] = gl.getUniformLocation(p, n)); return o; };
    this.u = U(this.prog, ['uVP','uModel','uLP','uLC','uNL','uAmb','uFogC','uFogD','uCam','uTime','uTint','uEmis','uTex','uUseTex']);
    this.pu = U(this.pprog, ['uVP','uTime','uCam','uScale','uMode']);
    this.mu = U(this.mprog, ['uVP','uTime','uCam','uMistC']);
    this.whiteTex = this.texFromCanvas(Object.assign(document.createElement('canvas'), { width: 2, height: 2 }), true);
    gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
    return true;
  },
  compile(vs, fs) {
    const gl = this.gl;
    const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o);
      if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) { console.error(gl.getShaderInfoLog(o)); return null; } return o; };
    const p = gl.createProgram(); const a = sh(gl.VERTEX_SHADER, vs), b = sh(gl.FRAGMENT_SHADER, fs);
    if (!a || !b) return null;
    gl.attachShader(p, a); gl.attachShader(p, b);
    ['aPos','aNrm','aCol','aMat','aUV'].forEach((n, i) => gl.bindAttribLocation(p, i, n));
    gl.bindAttribLocation(p, 1, 'aSeed');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.error(gl.getProgramInfoLog(p)); return null; }
    return p;
  },
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5) * this.pixelRatio;
    const w = Math.floor(innerWidth * dpr), h = Math.floor(innerHeight * dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
    this.gl.viewport(0, 0, w, h);
  },
  // ---- 메시 업로드 ----
  upload(geo) {
    const gl = this.gl, vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const buf = (data, loc, size) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW); gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0); return b; };
    buf(geo.p, 0, 3); buf(geo.n, 1, 3); buf(geo.c, 2, 3); buf(geo.m, 3, 1); buf(geo.uv, 4, 2);
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(geo.i), gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    return { vao, count: geo.i.length };
  },
  texFromCanvas(cv, nearest) {
    const gl = this.gl, t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, nearest ? gl.NEAREST : gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  },
  updateTex(t, cv) { const gl = this.gl; gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv); gl.generateMipmap(gl.TEXTURE_2D); },
  pointBuffer(pts, seeds) {
    const gl = this.gl, vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    let b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pts), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(seeds), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null); return { vao, count: pts.length / 3 };
  },
  mistBuffer(quads) { // quads: [x0,z0,x1,z1,y]
    const p = [];
    quads.forEach(([x0, z0, x1, z1, y]) => p.push(x0,y,z0, x0,y,z1, x1,y,z1, x0,y,z0, x1,y,z1, x1,y,z0));
    const gl = this.gl, vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(p), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0); gl.bindVertexArray(null);
    return { vao, count: p.length / 3 };
  },
  // ---- 프레임 ----
  begin(view, proj, camPos, time, lights) {
    const gl = this.gl; this.vp = M4.mul(proj, view); this.camPos = camPos; this.time = time;
    gl.clearColor(this.fogC[0], this.fogC[1], this.fogC[2], 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.prog); const u = this.u;
    gl.uniformMatrix4fv(u.uVP, false, this.vp);
    const n = Math.min(lights.length, this.maxLights), lp = new Float32Array(MAX_LIGHTS*4), lc = new Float32Array(MAX_LIGHTS*3);
    for (let i = 0; i < n; i++) { const L = lights[i]; lp.set([L.x, L.y, L.z, L.r], i*4); lc.set([L.c[0]*L.i, L.c[1]*L.i, L.c[2]*L.i], i*3); }
    gl.uniform4fv(u.uLP, lp); gl.uniform3fv(u.uLC, lc); gl.uniform1i(u.uNL, n);
    gl.uniform3fv(u.uAmb, this.amb); gl.uniform3fv(u.uFogC, this.fogC); gl.uniform1f(u.uFogD, this.fogD);
    gl.uniform3fv(u.uCam, camPos); gl.uniform1f(u.uTime, time);
    gl.uniform1i(u.uTex, 0); gl.activeTexture(gl.TEXTURE0);
  },
  draw(mesh, model, tint, emis, tex) {
    const gl = this.gl, u = this.u;
    gl.uniformMatrix4fv(u.uModel, false, model || IDENT);
    gl.uniform4fv(u.uTint, tint || ONE4); gl.uniform1f(u.uEmis, emis || 0);
    gl.uniform1i(u.uUseTex, tex ? 1 : 0); gl.bindTexture(gl.TEXTURE_2D, tex || this.whiteTex);
    gl.bindVertexArray(mesh.vao); gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_INT, 0);
  },
  blend(on, additive) {
    const gl = this.gl;
    if (on) { gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, additive ? gl.ONE : gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); }
    else { gl.disable(gl.BLEND); gl.depthMask(true); }
  },
  particles(buf, mode) {
    const gl = this.gl; gl.useProgram(this.pprog);
    gl.uniformMatrix4fv(this.pu.uVP, false, this.vp); gl.uniform1f(this.pu.uTime, this.time);
    gl.uniform3fv(this.pu.uCam, this.camPos); gl.uniform1f(this.pu.uScale, this.canvas.height * 1.1); gl.uniform1i(this.pu.uMode, mode);
    this.blend(true, mode === 0);
    gl.bindVertexArray(buf.vao); gl.drawArrays(gl.POINTS, 0, buf.count);
    this.blend(false); gl.useProgram(this.prog);
  },
  mist(buf, color) {
    const gl = this.gl; gl.useProgram(this.mprog);
    gl.uniformMatrix4fv(this.mu.uVP, false, this.vp); gl.uniform1f(this.mu.uTime, this.time);
    gl.uniform3fv(this.mu.uCam, this.camPos); gl.uniform3fv(this.mu.uMistC, color || [0.55, 0.5, 0.45]);
    this.blend(true, false); gl.disable(gl.CULL_FACE);
    gl.bindVertexArray(buf.vao); gl.drawArrays(gl.TRIANGLES, 0, buf.count);
    gl.enable(gl.CULL_FACE); this.blend(false); gl.useProgram(this.prog);
  },
};
const IDENT = M4.ident(); const ONE4 = new Float32Array([1, 1, 1, 1]);

/* ===================== 절차적 지오메트리 빌더 ===================== */
class Geo {
  constructor() { this.p = []; this.n = []; this.c = []; this.m = []; this.uv = []; this.i = []; this.M = IDENT; }
  vert(x, y, z, nx, ny, nz, col, mat, u, v) {
    const P = M4.xformPt(this.M, x, y, z); let N = M4.xformDir(this.M, nx, ny, nz);
    const l = Math.hypot(N[0], N[1], N[2]) || 1;
    this.p.push(P[0], P[1], P[2]); this.n.push(N[0]/l, N[1]/l, N[2]/l); this.c.push(col[0], col[1], col[2]); this.m.push(mat); this.uv.push(u || 0, v || 0);
    return this.p.length / 3 - 1;
  }
  // 사각형 (반시계 방향이 앞면)
  quad(a, b, c, d, n, col, mat, uvs) {
    uvs = uvs || [[0,1],[1,1],[1,0],[0,0]];
    const i0 = this.vert(...a, ...n, col, mat, ...uvs[0]), i1 = this.vert(...b, ...n, col, mat, ...uvs[1]);
    const i2 = this.vert(...c, ...n, col, mat, ...uvs[2]), i3 = this.vert(...d, ...n, col, mat, ...uvs[3]);
    this.i.push(i0, i1, i2, i0, i2, i3);
  }
  // 중심 (0, h/2, 0) 기준 상자 — 바닥이 y=0
  box(w, h, d, col, mat, M) {
    const old = this.M; if (M) this.M = M4.mul(old, M);
    const x = w/2, z = d/2;
    this.quad([-x,0,z],[x,0,z],[x,h,z],[-x,h,z],[0,0,1],col,mat);
    this.quad([x,0,-z],[-x,0,-z],[-x,h,-z],[x,h,-z],[0,0,-1],col,mat);
    this.quad([x,0,z],[x,0,-z],[x,h,-z],[x,h,z],[1,0,0],col,mat);
    this.quad([-x,0,-z],[-x,0,z],[-x,h,z],[-x,h,-z],[-1,0,0],col,mat);
    this.quad([-x,h,z],[x,h,z],[x,h,-z],[-x,h,-z],[0,1,0],col,mat);
    this.quad([-x,0,-z],[x,0,-z],[x,0,z],[-x,0,z],[0,-1,0],col,mat);
    this.M = old;
  }
  // 원기둥/원뿔대 — 바닥 y=0
  cyl(rb, rt, h, seg, col, mat, M, caps = true) {
    const old = this.M; if (M) this.M = M4.mul(old, M);
    const slope = (rb - rt) / h;
    for (let s = 0; s < seg; s++) {
      const a0 = s / seg * Math.PI * 2, a1 = (s + 1) / seg * Math.PI * 2;
      const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
      const i0 = this.vert(c0*rb, 0, s0*rb, c0, slope, s0, col, mat), i1 = this.vert(c1*rb, 0, s1*rb, c1, slope, s1, col, mat);
      const i2 = this.vert(c1*rt, h, s1*rt, c1, slope, s1, col, mat), i3 = this.vert(c0*rt, h, s0*rt, c0, slope, s0, col, mat);
      this.i.push(i0, i2, i1, i0, i3, i2);
      if (caps) {
        if (rt > 0) { const t0 = this.vert(0, h, 0, 0, 1, 0, col, mat), t1 = this.vert(c0*rt, h, s0*rt, 0, 1, 0, col, mat), t2 = this.vert(c1*rt, h, s1*rt, 0, 1, 0, col, mat); this.i.push(t0, t2, t1); }
        if (rb > 0) { const b0 = this.vert(0, 0, 0, 0, -1, 0, col, mat), b1 = this.vert(c0*rb, 0, s0*rb, 0, -1, 0, col, mat), b2 = this.vert(c1*rb, 0, s1*rb, 0, -1, 0, col, mat); this.i.push(b0, b1, b2); }
      }
    }
    this.M = old;
  }
  sphere(r, sw, sh, col, mat, M, sy = 1) {
    const old = this.M; if (M) this.M = M4.mul(old, M);
    const base = this.p.length / 3;
    for (let j = 0; j <= sh; j++) {
      const v = j / sh, ph = v * Math.PI;
      for (let i = 0; i <= sw; i++) {
        const th = i / sw * Math.PI * 2;
        const nx = Math.sin(ph) * Math.cos(th), ny = Math.cos(ph), nz = Math.sin(ph) * Math.sin(th);
        this.vert(nx * r, ny * r * sy, nz * r, nx, ny / sy, nz, col, mat);
      }
    }
    for (let j = 0; j < sh; j++) for (let i = 0; i < sw; i++) {
      const a = base + j * (sw + 1) + i, b = a + sw + 1;
      this.i.push(a, a + 1, b, b, a + 1, b + 1);
    }
    this.M = old;
  }
  // 텍스처 평면 (중심 원점, +z를 바라봄)
  plane(w, h, col, mat, M) {
    const old = this.M; if (M) this.M = M4.mul(old, M);
    this.quad([-w/2,-h/2,0],[w/2,-h/2,0],[w/2,h/2,0],[-w/2,h/2,0],[0,0,1],col,mat,[[0,1],[1,1],[1,0],[0,0]]);
    this.M = old;
  }
}
