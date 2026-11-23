/**
 * Day sun: a path on open ground, buildings of several sizes along one side,
 * the sun somewhere above it all. At rest the sun sits low, the day nearly
 * over, the buildings' shadows stretched long; the pointer's height lifts
 * the sun back up the sky, the shadows drawing in short beneath it as it
 * climbs. The sun is a true round orb, the figure's one bright fill.
 *
 * The pattern: a continuous input (rule 08) — the pointer's own screen
 * height — retargets one spring, clamped so the sun never climbs out of the
 * frame (rule 03); each building's shadow is that same height read a second
 * way, a hull of its footprint and that footprint pushed out along a fixed
 * away-from-the-sun direction (rule 09), the push shorter the higher the sun.
 */
const {
  Cam, clamp, facing, fit, hull, mk, place, pointer, poly, prism, proj, put,
  register, rings, disposer, solid, spring, stepS,
} = HL;

// The camera is fitted to this box only, so the view stays exactly as before; the ground
// and path below are drawn much longer than this and simply run off past the plate's own
// edge, clipped there, the way a path in the distance really would.
const FIT_GX0 = -50, FIT_GX1 = 34, FIT_GY = 26;
const GX0 = -150, GX1 = 120, GY = 26, GH = 2;
const PATH_X0 = -146, PATH_X1 = 116, PATH_Y = 15;
const SUN_X = 15, SUN_Y = -48, SUN_R = 9;
const Z_LOW = 7, Z_HIGH = 58;
const Y_TOP = 40, Y_BOT = 280;

// Buildings the length of the path, big and small, each its own box (rule 09). Their
// footprints sit just past the path's own edge (PATH_Y), on its far side from the sun.
const BUILD_Y0 = -25, BUILD_DEPTH = 7, SHADOW_K = 1.1;
const BUILD_N = 14, BUILD_X0 = PATH_X0 + 14, BUILD_X1 = PATH_X1 - 10;
const BUILD_STEP = (BUILD_X1 - BUILD_X0) / BUILD_N;
const BUILDINGS = Array.from({ length: BUILD_N }, (_, i) => ({
  x0: BUILD_X0 + i * BUILD_STEP, w: 7 + (i * 5) % 7, h: 12 + (i * 9) % 26,
}));

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let reach = value;
  const C = Cam(45, 0.5, 3.0);
  // This box is fixed (not the sun's own, now-moved position), so the ground and path keep
  // exactly the framing they always had, whatever the sun's own spot turns out to be.
  fit(C, [[FIT_GX0, -FIT_GY, -GH], [FIT_GX1, FIT_GY, -GH], [-33, 0, 0], [0, 0, Z_HIGH + 6]], 200, 200);
  const P = proj(C), front = facing(C);
  const g = mk("g", {}, svg);

  // The ground, which never moves.
  const [gr, gi] = rings(GX0, -GY, GX1, GY, 8, 2.2);
  put(solid(g), prism(P, front, gr, gi, -GH, 0));

  // The sun: a true round orb (11주 cinecamera's glowing orb, the same technique) — both radii
  // equal, so the camera's own flattening never squashes it into a disc lying on the ground.
  // Appended here, right after the ground, so the path and the buildings paint over it
  // wherever they cross in front of it, instead of it sitting on top of everything (rule 06).
  const sun = mk("ellipse", { rx: (SUN_R * C.S).toFixed(2), ry: (SUN_R * C.S).toFixed(2), class: "dot" }, g);

  // The path: two dashed edges receding, painted over the ground but under the sun's height.
  const seg = (a, b) => `M${a[0]} ${a[1]}L${b[0]} ${b[1]}`;
  mk("path", { class: "dash lo", d: seg(P(PATH_X0, -PATH_Y, 0), P(PATH_X1, -PATH_Y, 0)) }, g);
  mk("path", { class: "dash lo", d: seg(P(PATH_X0, PATH_Y, 0), P(PATH_X1, PATH_Y, 0)) }, g);

  // Each building: its shadow first (so the building paints over the near end of its own
  // shadow, rule 06), then the box itself. The shadow's direction is fixed per building — the
  // sun never moves sideways, only up and down — so only its length changes, each frame.
  const buildings = BUILDINGS.map((b) => {
    const x1 = b.x0 + b.w, y1 = BUILD_Y0 + BUILD_DEPTH;
    const shadow = mk("path", { class: "dot off" }, g);
    const [br, bi] = rings(b.x0, BUILD_Y0, x1, y1, 1.4, 0.8);
    put(solid(g), prism(P, front, br, bi, 0, b.h));
    const cx = (b.x0 + x1) / 2, cy = (BUILD_Y0 + y1) / 2;
    const dx = cx - SUN_X, dy = cy - SUN_Y, dlen = Math.hypot(dx, dy) || 1;
    const footprint = [[b.x0, BUILD_Y0], [x1, BUILD_Y0], [x1, y1], [b.x0, y1]];
    return { h: b.h, footprint, dir: [dx / dlen, dy / dlen], shadow };
  });
  const sp = spring(Z_LOW, { eps: 0.05 });
  let drawn = NaN;
  function draw() {
    if (sp.x === drawn) return;
    drawn = sp.x;
    place(sun, P(SUN_X, SUN_Y, sp.x));
    const high = clamp((sp.x - Z_LOW) / (Z_HIGH - Z_LOW), 0, 1);
    for (const bd of buildings) {
      const len = bd.h * SHADOW_K * (1 - high * 0.85);
      const cast = bd.footprint.map(([x, y]) => [x + bd.dir[0] * len, y + bd.dir[1] * len]);
      const near = bd.footprint.map(([x, y]) => P(x, y, 0.05));
      const far = cast.map(([x, y]) => P(x, y, 0.05));
      bd.shadow.setAttribute("d", poly(hull(near.concat(far))));
    }
  }

  const B = register(stage, (dt) => { const m = stepS(sp, dt); draw(); return m; });
  bag.add(B.unregister);

  function retarget(py) {
    const t = clamp((py - Y_TOP) / (Y_BOT - Y_TOP), 0, 1);
    sp.t = clamp(Z_LOW + (Z_HIGH - Z_LOW) * reach * (1 - t), Z_LOW, Z_HIGH);
    read.textContent = String(Math.round(sp.t)).padStart(2, "0");
    B.wake();
  }

  bag.add(pointer(stage, {
    move: (p) => retarget(p[1]),
    leave: () => { sp.t = Z_LOW; read.textContent = "rest"; B.wake(); },
  }));
  bag.add(() => svg.replaceChildren());
  read.textContent = "rest";

  return {
    set: (v) => { reach = v; },
    destroy: bag.dispose,
  };
}

hairline({
  name: "daysun",
  means: "A path on open ground: the pointer's height lifts the sun back up the sky; letting go lets it set again.",
  rules: [3, 4, 5, 8],
  range: [0.6, 1, 1.3],
  tour: [[200, 60], [200, 260], [200, 60], null],
  mount,
});
