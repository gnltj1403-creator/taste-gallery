/**
 * Takeoff: a plane on a runway, its centreline a dashed guide, a horizontal
 * stabilizer at the tail, and three legs of landing gear that tuck away soon
 * after the climb begins. Hovering rolls it down the runway, holds it there
 * gaining speed, then lifts it into a climb; leaving brings it back down.
 *
 * The pattern: one continuous progress on a spring (rule 08), driving the
 * plane's distance, its altitude, and the gear's tuck as one motion.
 */
const {
  Cam, clamp, facing, fillet, fit, flatDot, hull, mk, open, place, pointer, poly, prism, proj, put,
  register, ringAt, rings, run, seg, disposer, solid, spring, stepS, unproj,
} = HL;

// RUNWAY is only for the camera fit and the hit test; RUNWAY_LONG is what actually gets drawn,
// stretching well past the plate's own edge, clipped there, as a runway in the distance would.
const RUNWAY = [-92, -44, 92, 44], RUNWAY_H = 3;
const RUNWAY_LONG = [-220, RUNWAY[1], 220, RUNWAY[3]];
const X0 = -68, X1 = 118, ALT_HI = 90, ROLL_FRAC = 0.55, ROLL_SEC = 3;
const FUSE_L = 116, FUSE_W = 18, FUSE_H = 16;
const WING_SPAN = 116, WING_CHORD = 22, WING_H = 4.4;
const FIN_L = 11, FIN_W = 5.6, FIN_H = 22;
const STAB_SPAN = 48, STAB_CHORD = 12, STAB_H = 3.2;
const GEAR_LEN = 12, WHEEL_R = 3.6;
const WING_TIP_R = 4; // just a slight round-off on the wing's one pointed corner, its swept tip
const STAB_TIP_R = 2, FIN_TIP_R = 2;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let ALT_MAX = value;
  const C = Cam(45, 0.5, 1.6);
  fit(C, [[RUNWAY[0], RUNWAY[1], 0], [X1 + FUSE_L / 2, RUNWAY[3], RUNWAY_H + GEAR_LEN + ALT_HI + FIN_H + 4]], 200, 166);
  const P = proj(C), front = facing(C);
  const g = mk("g", {}, svg);

  const [runR, runI] = rings(...RUNWAY_LONG, 3, 2);
  put(solid(g), prism(P, front, runR, runI, 0, RUNWAY_H));
  // The centreline as its own marks (not the shared `.dash` style, one fixed fine pattern for
  // every figure): fixed in count, but redrawn each frame cycling through one period, so the
  // roll reads as the ground streaming past a plane that isn't moving yet.
  const DASH_LEN = 10, DASH_GAP = 9, DASH_PERIOD = DASH_LEN + DASH_GAP;
  const dashX0 = RUNWAY_LONG[0] + 4, dashX1 = RUNWAY_LONG[2] - 4, dashSpan = dashX1 - dashX0;
  const marks = Array.from({ length: Math.ceil(dashSpan / DASH_PERIOD) + 1 }, () => mk("path", {}, g));

  // wingL/stabL sit on the far side at this camera angle, so they're appended, and painted,
  // before the fuselage; wingR/stabR are the near pieces and stay after it. Each is a right
  // triangle (rule 09), its tip swept aft instead of squared off.
  const mkWing = () => ({ face: mk("path", { class: "sil" }, g), back: mk("path", { class: "nf lo" }, g) });
  const wingL = mkWing(), stabL = mkWing(), fuse = solid(g), wingR = mkWing(), stabR = mkWing();
  const gear = ["nose", "mainL", "mainR"].map(() => ({ leg: mk("path", { class: "lo" }, g), wheel: flatDot(g, C, WHEEL_R, "dot off") }));
  // The fin, swept the same way standing up instead of lying flat; last of all, so it always paints on top.
  const fin = mkWing();
  let over = false;
  let elapsed = 0;
  let scrollX = 0;
  const SCROLL_RATE = 70;
  const prog = spring(0, { k: 9, c: 6, eps: 0.01 });

  function draw(dt = 0) {
    const t = prog.x;
    // Before lift, the plane holds its mark while the ground moves (marks streaming back
    // underneath). The body's height depends only on `alt`, never `retract`, so it never dips.
    const climb = Math.max(0, (t - ROLL_FRAC) / (1 - ROLL_FRAC));
    const x = X0 + (X1 - X0) * climb;
    const alt = ALT_MAX * climb * climb;
    const retract = clamp(1 - climb * 4, 0, 1);
    const base = RUNWAY_H + GEAR_LEN + alt;

    // Ground speed, a real clock (`elapsed`, not the settling spring): eased so it accelerates
    // through the roll instead of ramping steadily, then holds at full once the roll's done, so
    // the marks keep streaming past the point the spring itself has landed.
    const rollP = clamp(elapsed / ROLL_SEC, 0, 1);
    scrollX += rollP * rollP * SCROLL_RATE * dt;
    marks.forEach((mark, i) => {
      const raw = dashX0 + i * DASH_PERIOD - scrollX;
      const dx = dashX0 + (((raw - dashX0) % dashSpan) + dashSpan) % dashSpan;
      mark.setAttribute("d", seg(P(dx, 0, RUNWAY_H), P(dx + DASH_LEN, 0, RUNWAY_H)));
    });

    const [fr, fi] = rings(x - FUSE_L / 2, -FUSE_W / 2, x + FUSE_L / 2, FUSE_W / 2, 2.4, 1.2);

    // The fuselage and its nose as one body: the belly stays straight to the tip (full bottom
    // ring), the roof is cut short of it (top ring filtered by `.u`), and a quarter-circle arc —
    // radius the body's own height — closes the gap between them. One hull of all four point
    // sets (rule 09) reads as one solid, since the excluded sharp corner leaves the arc as the
    // only boundary there.
    const NOSE_R = FUSE_H, noseX = x + FUSE_L / 2, NOSE_X0 = noseX - NOSE_R, CAP_N = 10;
    const capShape = [[NOSE_X0, base]];
    for (let i = 0; i <= CAP_N; i++) {
      const a = (i / CAP_N) * (Math.PI / 2);
      capShape.push([NOSE_X0 + NOSE_R * Math.sin(a), base + NOSE_R * Math.cos(a)]);
    }
    const capL = capShape.map(([px, pz]) => P(px, -FUSE_W / 2, pz));
    const capR = capShape.map(([px, pz]) => P(px, FUSE_W / 2, pz));
    const frAft = fr.filter((q) => q.u <= NOSE_X0);
    const topAft = ringAt(P, frAft, base + FUSE_H);
    const botFull = ringAt(P, fr, base);
    const creaseTop = ringAt(P, run(fi, front).filter((q) => q.u <= NOSE_X0), base + FUSE_H);
    put(fuse, {
      sil: poly(hull(topAft.concat(botFull, capL, capR))),
      crease: open(creaseTop.concat(capR.slice(1))),
    });

    // A swept, right-triangle panel out to a slightly rounded tip. `projFace`/`projBack` place its
    // two parallel rings — level for a wing (thickness in z), standing for the fin (thickness in
    // y). One hull of the two (rule 09) reads as a solid with thickness, not two flat triangles.
    const sweptPanel = (w, cx0, cx1, rootA, tipA, projFace, projBack, tipR) => {
      const shape = fillet([[cx0, rootA], [cx1, rootA], [cx0, tipA]], [0, 0, tipR], 4);
      const top = shape.map(([px, pa]) => projFace(px, pa));
      const bot = shape.map(([px, pa]) => projBack(px, pa));
      w.face.setAttribute("d", poly(hull(top.concat(bot))));
      w.back.setAttribute("d", open(top));
    };

    // Two wings, each from the fuselage's own side out to its tip, attached there instead of one plate laid over the top.
    const wx0 = x - WING_CHORD / 2 - 2, wx1 = x + WING_CHORD / 2 - 2, wingY = base + FUSE_H * 0.32;
    const wingFace = (px, py) => P(px, py, wingY + WING_H), wingBack = (px, py) => P(px, py, wingY);
    sweptPanel(wingL, wx0, wx1, -FUSE_W / 2, -WING_SPAN / 2, wingFace, wingBack, WING_TIP_R);
    sweptPanel(wingR, wx0, wx1, FUSE_W / 2, WING_SPAN / 2, wingFace, wingBack, WING_TIP_R);

    // The fin: the same swept triangle, standing up instead of lying flat — root at the fuselage's
    // spine, tip at the top, thickness sideways (y) instead of in height (z).
    const finX0 = x - FUSE_L / 2 + 2, finX1 = finX0 + FIN_L, finZ0 = base + FUSE_H, finZ1 = finZ0 + FIN_H;
    sweptPanel(fin, finX0, finX1, finZ0, finZ1, (px, pz) => P(px, FIN_W / 2, pz), (px, pz) => P(px, -FIN_W / 2, pz), FIN_TIP_R);

    // The horizontal stabilizer: the wing's own swept shape, smaller, at the tail, in two pieces.
    // Its root reaches a little past the fuselage wall (not stopping exactly at it), so it reads as
    // attached rather than just touching edge to edge.
    const sx0 = x - FUSE_L / 2 + 3 - STAB_CHORD / 2, sx1 = x - FUSE_L / 2 + 3 + STAB_CHORD / 2;
    const stabY = base + FUSE_H * 0.55, stabRoot = FUSE_W / 2 - 1.5;
    const stabFace = (px, py) => P(px, py, stabY + STAB_H), stabBack = (px, py) => P(px, py, stabY);
    sweptPanel(stabL, sx0, sx1, -stabRoot, -STAB_SPAN / 2, stabFace, stabBack, STAB_TIP_R);
    sweptPanel(stabR, sx0, sx1, stabRoot, STAB_SPAN / 2, stabFace, stabBack, STAB_TIP_R);

    // Landing gear: a strut and a wheel per leg, tucking up out of sight soon after the climb begins.
    const legs = [
      { gx: x + FUSE_L / 2 - 10, gy: 0 },
      { gx: x - FUSE_L / 2 + 16, gy: -6 },
      { gx: x - FUSE_L / 2 + 16, gy: 6 },
    ];
    gear.forEach((gm, i) => {
      const { gx, gy } = legs[i];
      const top = P(gx, gy, base), bot = P(gx, gy, base - GEAR_LEN * retract);
      gm.leg.setAttribute("d", seg(top, bot));
      gm.wheel.setAttribute("rx", (WHEEL_R * retract * C.S).toFixed(2));
      gm.wheel.setAttribute("ry", (WHEEL_R * retract * C.S * C.k).toFixed(2));
      place(gm.wheel, bot);
    });

    fuse.sil.classList.toggle("hi", over);
    wingL.face.classList.toggle("hi", over);
    wingR.face.classList.toggle("hi", over);
  }

  // Holds the spring at rest for ROLL_SEC real seconds before aiming it at the far end, so the
  // roll is a fixed real time, not whatever the spring itself happens to take.
  const B = register(stage, (dt) => {
    if (over) {
      elapsed += dt;
      prog.t = elapsed >= ROLL_SEC ? 1 : 0;
    } else {
      elapsed = 0;
      prog.t = 0;
    }
    const m = stepS(prog, dt);
    draw(dt);
    // Keep the loop awake for as long as the hover lasts, even once the spring itself has
    // settled, so the ground's own clock (above) can keep running past that point.
    return m || over;
  });
  bag.add(B.unregister);

  bag.add(pointer(stage, {
    move: (p) => {
      const w = unproj(C, p[0], p[1], 0);
      const inside = w[0] >= X0 - FUSE_L / 2 && w[0] <= RUNWAY[2] && w[1] >= RUNWAY[1] && w[1] <= RUNWAY[3];
      if (inside !== over) { over = inside; read.textContent = over ? "climbs" : "rest"; }
      B.wake();
    },
    leave: () => { over = false; read.textContent = "rest"; B.wake(); },
  }));
  bag.add(() => svg.replaceChildren());
  draw();
  read.textContent = "rest";

  return {
    set: (v) => { ALT_MAX = v; },
    destroy: bag.dispose,
  };
}

hairline({
  name: "takeoff",
  means: "A plane on a runway. Hovering rolls it down the strip and lifts it into a climb, its gear tucking away; leaving brings it back down.",
  rules: [1, 3, 5, 8, 9],
  range: [30, 50, 80],
  tour: [[160, 190], [160, 190], null],
  mount,
});
