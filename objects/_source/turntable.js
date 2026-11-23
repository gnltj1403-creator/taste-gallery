/**
 * Turntable: a record on a plinth. Hovering lowers the tonearm onto the
 * edge, on a long ease, and the platter spins up on a spring; the groove
 * line sweeps round while it plays. Leaving lifts the arm and the platter
 * coasts to a stop. At rest the arm sits parked, up and to the side.
 *
 * The pattern: a discrete choice (Riffle's tween, up/down) driving a
 * continuous one (a spring on spin speed), on a thin rod built as a
 * two-ring solid (rule 9) whose ends move independently.
 */
const {
  Cam, circ, facing, fit, hull, lerp, mk, open, poly, prism, proj,
  ringAt, rrect, run, spring, stepS, tdone, tset, tval, tween, unproj,
  pointer, put, register, disposer, solid, seg,
} = HL;

const R_PLATTER = 32, Z_BASE = 12, PIVOT = [40, -32, 28], TIP_UP = [10, -34, 21], TIP_DOWN = [22, -10, 16.6];

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  const C = Cam(45, 0.5, 2.6);
  fit(C, [[-46, -42, 0], [48, 42, 30]], 200, 176);
  const P = proj(C), front = facing(C);
  const g = mk("g", {}, svg);

  const base = rrect(-46, -40, 46, 40, 10);
  const baseI = rrect(-44, -38, 44, 38, 8);
  put(solid(g), prism(P, front, base, baseI, 0, Z_BASE));

  const plat = circ(R_PLATTER, 56), platI = circ(R_PLATTER - 2.4, 56);
  put(solid(g), prism(P, front, plat, platI, Z_BASE, Z_BASE + 4));

  const groove = mk("path", { class: "lo" }, g);
  const pivotPost = solid(g);
  const [ppR, ppI] = [circ(2.6, 16), circ(1.4, 16)];
  put(pivotPost, prism(P, front, ppR.map((q) => ({ ...q, u: q.u + PIVOT[0], v: q.v + PIVOT[1] })),
    ppI.map((q) => ({ ...q, u: q.u + PIVOT[0], v: q.v + PIVOT[1] })), 0, PIVOT[2]));
  const arm = solid(g);

  let SPEED = value, over = false, angle = 0;
  const down = tween(0);
  const spin = spring(0, { eps: 0.02 });

  function drawArm(now) {
    const t = tval(down, now);
    const tip = [lerp(TIP_UP[0], TIP_DOWN[0], t), lerp(TIP_UP[1], TIP_DOWN[1], t), lerp(TIP_UP[2], TIP_DOWN[2], t)];
    const foot = circ(2.3, 10).map((q) => ({ ...q, u: q.u + PIVOT[0], v: q.v + PIVOT[1] }));
    const top = circ(1.3, 10).map((q) => ({ ...q, u: q.u + tip[0], v: q.v + tip[1] }));
    const topI = circ(0.6, 10).map((q) => ({ ...q, u: q.u + tip[0], v: q.v + tip[1] }));
    const sil = poly(hull(ringAt(P, foot, PIVOT[2]).concat(ringAt(P, top, tip[2]))));
    const crease = open(ringAt(P, run(topI, front), tip[2]));
    put(arm, { sil, crease });
    arm.sil.classList.toggle("hi", t > 0.6);
  }

  function drawGroove() {
    const cx = 0, cy = 0, z = Z_BASE + 4;
    const ex = cx + (R_PLATTER - 4) * Math.cos(angle), ey = cy + (R_PLATTER - 4) * Math.sin(angle);
    groove.setAttribute("d", seg(P(cx, cy, z), P(ex, ey, z)));
    groove.classList.toggle("hi", over);
  }

  const B = register(stage, (dt, now) => {
    spin.t = over ? SPEED : 0;
    const m1 = stepS(spin, dt);
    angle += spin.x * dt;
    drawArm(now);
    drawGroove();
    return m1 || !tdone(down, now);
  });
  bag.add(B.unregister);

  bag.add(pointer(stage, {
    move: (p) => {
      const w = unproj(C, p[0], p[1], Z_BASE + 4);
      const inside = Math.hypot(w[0], w[1]) <= R_PLATTER + 6;
      if (inside !== over) {
        over = inside;
        tset(down, over ? 1 : 0, performance.now(), 0);
        read.textContent = over ? "playing" : "rest";
      }
      B.wake();
    },
    leave: () => {
      over = false;
      tset(down, 0, performance.now(), 0);
      read.textContent = "rest";
      B.wake();
    },
  }));
  bag.add(() => svg.replaceChildren());
  drawArm(performance.now());
  drawGroove();
  read.textContent = "rest";

  return {
    set: (v) => { SPEED = v; },
    destroy: bag.dispose,
  };
}

hairline({
  name: "turntable",
  means: "Hovering lowers the tonearm and spins the platter up; leaving lifts it and lets it coast down.",
  rules: [4, 5, 8, 9],
  range: [20, 40, 70],
  tour: [[200, 176], [230, 150], [160, 200], null],
  mount,
});
