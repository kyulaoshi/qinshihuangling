'use strict';
/* ===================== 탐험가 캐릭터 + 3인칭 카메라 ===================== */
const Player = {
  x: 31, y: 0, z: 151, vy: 0, yaw: Math.PI, facing: Math.PI, onGround: true,
  speed: 0, phase: 0, lastStepPhase: 0, rad: 0.38, parts: null, moving: false, running: false,
  cam: { yaw: 0, pitch: 0.28, dist: 5, curDist: 5, shake: 0, x: 0, y: 0, z: 0 },
  build() {
    const mk = fn => { const g = new Geo(); fn(g); return R.upload(g); };
    const khaki = [0.62, 0.52, 0.34], shirt = [0.55, 0.42, 0.28], skin = [0.93, 0.74, 0.6], boot = [0.22, 0.15, 0.1], pants = [0.35, 0.3, 0.24], hat = [0.4, 0.28, 0.16];
    this.parts = {
      torso: mk(g => {
        g.box(0.44, 0.52, 0.26, shirt, MAT.PLAIN, M4.trans(0, 0, 0));
        g.box(0.46, 0.1, 0.28, [0.3, 0.2, 0.12], MAT.PLAIN, M4.trans(0, 0, 0)); // 벨트
        g.box(0.36, 0.42, 0.18, [0.42, 0.33, 0.2], MAT.PLAIN, M4.trans(0, 0.06, -0.2)); // 배낭
        g.box(0.3, 0.12, 0.2, [0.32, 0.25, 0.15], MAT.PLAIN, M4.trans(0, 0.46, -0.2));
        g.cyl(0.07, 0.07, 0.34, 8, [0.3, 0.42, 0.3], MAT.PLAIN, M4.chain(M4.trans(0.19, 0.5, -0.24), M4.rotZ(Math.PI / 2))); // 침낭
        g.box(0.06, 0.55, 0.28, [0.28, 0.19, 0.11], MAT.PLAIN, M4.chain(M4.trans(0, 0.02, 0), M4.rotZ(0.75))); // 가방끈
        g.cyl(0.07, 0.08, 0.08, 8, skin, MAT.PLAIN, M4.trans(0, 0.52, 0)); // 목
        g.box(0.2, 0.08, 0.04, [0.7, 0.15, 0.1], MAT.PLAIN, M4.trans(0, 0.46, 0.13)); // 스카프
      }),
      head: mk(g => {
        g.sphere(0.14, 10, 8, skin, MAT.PLAIN, M4.trans(0, 0.14, 0), 1.1);
        g.sphere(0.145, 10, 6, [0.2, 0.13, 0.08], MAT.PLAIN, M4.chain(M4.trans(0, 0.17, -0.03), M4.scale(1, 0.85, 1))); // 머리카락
        g.cyl(0.3, 0.3, 0.03, 16, hat, MAT.PLAIN, M4.trans(0, 0.25, 0)); // 모자 챙
        g.cyl(0.16, 0.14, 0.17, 12, hat, MAT.PLAIN, M4.trans(0, 0.27, 0));
        g.cyl(0.165, 0.165, 0.04, 12, [0.2, 0.12, 0.06], MAT.PLAIN, M4.trans(0, 0.28, 0));
      }),
      arm: mk(g => {
        g.box(0.12, 0.3, 0.13, shirt, MAT.PLAIN, M4.trans(0, -0.3, 0));
        g.box(0.11, 0.26, 0.11, skin, MAT.PLAIN, M4.trans(0, -0.55, 0));
      }),
      leg: mk(g => {
        g.box(0.16, 0.5, 0.17, pants, MAT.PLAIN, M4.trans(0, -0.5, 0));
        g.box(0.17, 0.3, 0.19, boot, MAT.PLAIN, M4.trans(0, -0.8, 0.02));
        g.box(0.17, 0.08, 0.27, boot, MAT.PLAIN, M4.trans(0, -0.8, 0.05));
      }),
      lantern: mk(g => {
        g.box(0.12, 0.16, 0.12, [0.35, 0.3, 0.2], MAT.BRONZE);
        g.box(0.09, 0.12, 0.09, [1, 0.8, 0.4], MAT.EMIT, M4.trans(0, 0.02, 0));
        g.cyl(0.05, 0.03, 0.05, 6, [0.35, 0.3, 0.2], MAT.BRONZE, M4.trans(0, 0.16, 0));
      }),
    };
  },
  reset(x, z, camYaw) { this.x = x; this.z = z; this.y = 0; this.vy = 0; this.facing = camYaw + Math.PI; this.cam.yaw = camYaw; this.cam.pitch = 0.28; this.cam.curDist = 5; this.speed = 0; },
  // 입력에 따른 이동
  update(dt, input, W, locked) {
    const c = this.cam;
    let mx = 0, mz = 0;
    if (!locked) {
      if (input.f) mz += 1; if (input.b) mz -= 1; if (input.l) mx -= 1; if (input.r) mx += 1;
    }
    const len = Math.hypot(mx, mz);
    this.running = !!input.run && len > 0;
    const target = len > 0 ? (this.running ? 8.5 : 4.6) : 0;
    this.speed = lerp(this.speed, target, 1 - Math.exp(-dt * 10));
    if (len > 0) {
      mx /= len; mz /= len;
      // 카메라 방향 기준 이동 (yaw: 캐릭터가 바라보는 방향, -z가 북쪽)
      const fx = -Math.sin(c.yaw), fz = -Math.cos(c.yaw), rx = Math.cos(c.yaw), rz = -Math.sin(c.yaw);
      const dx = fx * mz + rx * mx, dz = fz * mz + rz * mx;
      this.moveDir = [dx, dz];
      const want = Math.atan2(dx, dz);
      this.facing += angDiff(this.facing, want) * (1 - Math.exp(-dt * 14));
    }
    if (this.speed > 0.05 && this.moveDir) {
      let nx = this.x + this.moveDir[0] * this.speed * dt, nz = this.z + this.moveDir[1] * this.speed * dt;
      [nx, nz] = collideCircle(W, nx, nz, this.rad);
      this.x = nx; this.z = nz;
    }
    // 점프 / 중력
    if (!locked && input.jump && this.onGround) { this.vy = 5.2; this.onGround = false; Sfx.jump(); }
    input.jump = false;
    this.vy -= 14 * dt; this.y += this.vy * dt;
    if (this.y <= 0) { if (!this.onGround && this.vy < -3) Sfx.land(); this.y = 0; this.vy = 0; this.onGround = true; }
    // 걷기 애니메이션 & 발소리
    this.moving = this.speed > 0.5;
    if (this.moving && this.onGround) {
      this.phase += dt * this.speed * 2.1;
      if (Math.floor(this.phase / Math.PI) !== Math.floor(this.lastStepPhase / Math.PI)) Sfx.step(this.running);
    } else this.phase = lerp(this.phase, Math.round(this.phase / Math.PI) * Math.PI, dt * 8);
    this.lastStepPhase = this.phase;
  },
  updateCamera(dt, W, zoneCeil) {
    const c = this.cam;
    const narrow = zoneCeil < 5;
    c.dist = lerp(c.dist, narrow ? 3.4 : 5.2, 1 - Math.exp(-dt * 3));
    const tx = this.x, ty = this.y + 1.75, tz = this.z;
    const cp = Math.cos(c.pitch), dx = Math.sin(c.yaw) * cp, dy = Math.sin(c.pitch), dz = Math.cos(c.yaw) * cp;
    const hit = camRay(W, tx, ty, tz, dx, dy, dz, c.dist);
    c.curDist = hit < c.curDist ? hit : lerp(c.curDist, hit, 1 - Math.exp(-dt * 4));
    c.x = tx + dx * c.curDist; c.y = ty + dy * c.curDist; c.z = tz + dz * c.curDist;
    let sx = 0, sy = 0;
    if (c.shake > 0) { c.shake = Math.max(0, c.shake - dt); sx = (Math.random() - 0.5) * c.shake * 0.5; sy = (Math.random() - 0.5) * c.shake * 0.5; }
    // 캐릭터가 화면 중앙보다 약간 아래에 보이도록 시선을 머리 위로
    this.view = M4.lookAt([c.x + sx, c.y + sy, c.z], [tx - dx * 2 + sx, ty + 0.35 - dy * 0.5, tz - dz * 2], [0, 1, 0]);
    this.camPos = [c.x, c.y, c.z];
  },
  draw() {
    const P = this.parts, base = M4.chain(M4.trans(this.x, this.y, this.z), M4.rotY(this.facing));
    const sw = Math.sin(this.phase) * (this.running ? 0.9 : 0.6) * Math.min(1, this.speed / 3);
    const bob = Math.abs(Math.cos(this.phase)) * 0.05 * Math.min(1, this.speed / 3);
    const air = this.onGround ? 0 : 0.5;
    R.draw(P.leg, M4.chain(base, M4.trans(-0.11, 0.92 + bob, 0), M4.rotX(sw + air)));
    R.draw(P.leg, M4.chain(base, M4.trans(0.11, 0.92 + bob, 0), M4.rotX(-sw + air * 0.3)));
    const lean = this.running ? 0.12 : 0.03 * Math.min(1, this.speed);
    const torso = M4.chain(base, M4.trans(0, 0.95 + bob, 0), M4.rotX(lean));
    R.draw(P.torso, torso);
    R.draw(P.head, M4.chain(torso, M4.trans(0, 0.58, 0)));
    R.draw(P.arm, M4.chain(torso, M4.trans(-0.29, 0.5, 0), M4.rotX(-sw * 0.9 - air), M4.rotZ(-0.08)));
    R.draw(P.arm, M4.chain(torso, M4.trans(0.29, 0.5, 0), M4.rotX(sw * 0.9 - air), M4.rotZ(0.08)));
    R.draw(P.lantern, M4.chain(torso, M4.trans(0.27, 0.02, 0.06), M4.rotX(Math.sin(this.phase * 2) * 0.15)), null, 0);
  },
};
