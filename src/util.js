'use strict';
/* ===================== 수학 / 유틸리티 ===================== */
const M4 = {
  ident() { return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]); },
  mul(a, b) { // a*b (column-major)
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      o[c*4+r] = a[r]*b[c*4] + a[4+r]*b[c*4+1] + a[8+r]*b[c*4+2] + a[12+r]*b[c*4+3];
    }
    return o;
  },
  trans(x, y, z) { const m = M4.ident(); m[12]=x; m[13]=y; m[14]=z; return m; },
  scale(x, y, z) { const m = M4.ident(); m[0]=x; m[5]=y; m[10]=z; return m; },
  rotY(a) { const c=Math.cos(a), s=Math.sin(a); const m=M4.ident(); m[0]=c; m[2]=-s; m[8]=s; m[10]=c; return m; },
  rotX(a) { const c=Math.cos(a), s=Math.sin(a); const m=M4.ident(); m[5]=c; m[6]=s; m[9]=-s; m[10]=c; return m; },
  rotZ(a) { const c=Math.cos(a), s=Math.sin(a); const m=M4.ident(); m[0]=c; m[1]=s; m[4]=-s; m[5]=c; return m; },
  persp(fov, asp, n, f) {
    const t = 1/Math.tan(fov/2), m = new Float32Array(16);
    m[0]=t/asp; m[5]=t; m[10]=(f+n)/(n-f); m[11]=-1; m[14]=2*f*n/(n-f); return m;
  },
  lookAt(e, c, u) {
    let zx=e[0]-c[0], zy=e[1]-c[1], zz=e[2]-c[2]; let l=Math.hypot(zx,zy,zz)||1; zx/=l; zy/=l; zz/=l;
    let xx=u[1]*zz-u[2]*zy, xy=u[2]*zx-u[0]*zz, xz=u[0]*zy-u[1]*zx; l=Math.hypot(xx,xy,xz)||1; xx/=l; xy/=l; xz/=l;
    const yx=zy*xz-zz*xy, yy=zz*xx-zx*xz, yz=zx*xy-zy*xx;
    return new Float32Array([xx,yx,zx,0, xy,yy,zy,0, xz,yz,zz,0,
      -(xx*e[0]+xy*e[1]+xz*e[2]), -(yx*e[0]+yy*e[1]+yz*e[2]), -(zx*e[0]+zy*e[1]+zz*e[2]), 1]);
  },
  // chain: M4.chain(A,B,C) = A*B*C
  chain(...ms) { let r = ms[0]; for (let i = 1; i < ms.length; i++) r = M4.mul(r, ms[i]); return r; },
  xformPt(m, x, y, z) { return [m[0]*x+m[4]*y+m[8]*z+m[12], m[1]*x+m[5]*y+m[9]*z+m[13], m[2]*x+m[6]*y+m[10]*z+m[14]]; },
  xformDir(m, x, y, z) { return [m[0]*x+m[4]*y+m[8]*z, m[1]*x+m[5]*y+m[9]*z, m[2]*x+m[6]*y+m[10]*z]; },
};
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => t*t*(3-2*t);
function angDiff(a, b) { let d = b - a; while (d > Math.PI) d -= Math.PI*2; while (d < -Math.PI) d += Math.PI*2; return d; }
function hexRGB(h) { const n = parseInt(h.slice(1), 16); return [(n>>16&255)/255, (n>>8&255)/255, (n&255)/255]; }

// 시드 기반 난수 (한 게임 동안 같은 문제가 유지되도록)
function makeRng(seed) {
  let s = seed >>> 0 || 1;
  const f = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  f.int = (a, b) => a + Math.floor(f() * (b - a + 1));
  f.pick = arr => arr[Math.floor(f() * arr.length)];
  f.shuffle = arr => { const a = arr.slice(); for (let i = a.length-1; i > 0; i--) { const j = Math.floor(f()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
  return f;
}

/* ===================== 중국어 숫자 ===================== */
const ZH_D = ['零','一','二','三','四','五','六','七','八','九'];
const PY_D = ['líng','yī','èr','sān','sì','wǔ','liù','qī','bā','jiǔ'];
function numZh(n) {
  if (n < 10) return ZH_D[n];
  if (n < 20) return '十' + (n%10 ? ZH_D[n%10] : '');
  return ZH_D[Math.floor(n/10)] + '十' + (n%10 ? ZH_D[n%10] : '');
}
function numPy(n) {
  if (n < 10) return PY_D[n];
  if (n < 20) return 'shí' + (n%10 ? PY_D[n%10] : '');
  return PY_D[Math.floor(n/10)] + 'shí' + (n%10 ? PY_D[n%10] : '');
}
const dateZh = (m, d) => numZh(m) + '月' + numZh(d) + '号';
const datePy = (m, d) => numPy(m) + ' yuè ' + numPy(d) + ' hào';
const dateKo = (m, d) => m + '월 ' + d + '일';

// 병음 입력 비교용 정규화 (성조·공백·문장부호 제거)
function normAns(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/ü/g, 'v').replace(/[\s.,!?。，！？、·'"’]/g, '');
}

const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} },
};
const $ = (s, r = document) => r.querySelector(s);
function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
function fmtTime(sec) { sec = Math.max(0, Math.ceil(sec)); return String(Math.floor(sec/60)).padStart(2,'0') + ':' + String(sec%60).padStart(2,'0'); }
