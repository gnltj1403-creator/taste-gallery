/**
 * Otamatone: a round head on a thin neck, topped with a small scroll. The
 * head is two plates, a fixed crown and a jaw that drops on a spring,
 * opening a gap between them like a mouth starting to sing. Two eyes ride
 * the crown's front, fixed. Leaving lets the jaw spring shut.
 *
 * The pattern: a boolean from the pointer driving a continuous open amount
 * on a spring (Turntable's spin, here a gap instead of an angle). The head
 * is two domes: since a sphere is convex, hulling several rings that shrink
 * along a quarter-circle from the equator to the pole gives a round
 * silhouette (rule 09's hull(ringAt…)), not the straight sides a single
 * tapering prism would draw. The jaw's dome is parted from the crown's by
 * animating its own z-range instead of drawing a hinge.
 */
const {
  Cam, circ, facing, fit, flatDot, hull, mk, open, place, pointer, poly,
  prism, proj, put, register, ringAt, run, disposer, rings, solid, spring,
  stepS,
} = HL;

const BALL_R = 18, JAW_H = 13, CROWN_H = 21, BALL_TOP = JAW_H + CROWN_H;
const JAW_POLE_R = 9.5, CROWN_POLE_R = 5.5, DOME_B = 1.8;
const NECK_H = 44, NECK_TOP = BALL_TOP + NECK_H;
const SCROLL_R = 6.5, SCROLL_H = 8, SCROLL_TOP = NECK_TOP + SCROLL_H;
const OPEN_MAX = 11;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  const C = Cam(45, 0.5, 3.1);
  fit(C, [[-BALL_R, -BALL_R, -OPEN_MAX], [BALL_R, BALL_R, SCROLL_TOP]], 200, 166);
  const P = proj(C), front = facing(C);
  const g = mk("g", {}, svg);

  /** A dome standing from the equator (zEq, radius BALL_R) toward a pole `h` away (dir ±1), its
   *  radius shrinking along a quarter-circle, poleR at the very top. A sphere is convex, so hulling
   *  every ring's screen points already draws the round silhouette; one crease rides the equator. */
  const DOME_N = 10;
  function dome(zEq, dir, h, poleR) {
    let pts = [];
    for (let i = 0; i <= DOME_N; i++) {
      const t = i / DOME_N, r = i === DOME_N ? poleR : BALL_R * Math.sqrt(1 - t * t);
      pts = pts.concat(ringAt(P, circ(r, 28), zEq + dir * h * t));
    }
    const eqI = circ(BALL_R - DOME_B, 48);
    return { sil: poly(hull(pts)), crease: open(ringAt(P, run(eqI, front), zEq)) };
  }

  // The jaw is appended first so its opaque plate paints behind the crown's face, never over it.
  const jaw = solid(g);

  const crown = solid(g);
  put(crown, dome(JAW_H, 1, CROWN_H, CROWN_POLE_R));

  const [neckR, neckI] = rings(-3.2, -2.4, 3.2, 2.4, 1.3, 0.8);
  put(solid(g), prism(P, front, neckR, neckI, BALL_TOP, NECK_TOP));

  const [scrollR, scrollI] = [circ(SCROLL_R, 32), circ(SCROLL_R - 1.3, 32)];
  put(solid(g), prism(P, front, scrollR, scrollI, NECK_TOP, SCROLL_TOP));

  // Two eyes low on the crown's front (where its dome is still wide), straddling the camera's own 45°.
  const eyeZ = JAW_H + CROWN_H * 0.3, eyeLocalR = BALL_R + (CROWN_POLE_R - BALL_R) * 0.3, eyeR = eyeLocalR * 0.78;
  [25, 65].forEach((deg) => {
    const a = (deg * Math.PI) / 180;
    const dot = flatDot(g, C, 1.3, "dot");
    place(dot, P(eyeR * Math.cos(a), eyeR * Math.sin(a), eyeZ));
  });

  let OPEN = value, over = false;
  const gap = spring(0, { eps: 0.02 });

  function drawJaw() {
    const d = gap.x;
    put(jaw, dome(JAW_H - d, -1, JAW_H, JAW_POLE_R));
    jaw.sil.classList.toggle("hi", over);
    crown.sil.classList.toggle("hi", over);
  }

  const B = register(stage, (dt) => {
    gap.t = over ? OPEN : 0;
    const m = stepS(gap, dt);
    drawJaw();
    return m;
  });
  bag.add(B.unregister);

  const hitPts = [[-BALL_R, -BALL_R, -OPEN_MAX], [BALL_R, -BALL_R, -OPEN_MAX], [-BALL_R, BALL_R, -OPEN_MAX], [BALL_R, BALL_R, -OPEN_MAX],
    [-BALL_R, -BALL_R, SCROLL_TOP], [BALL_R, -BALL_R, SCROLL_TOP], [-BALL_R, BALL_R, SCROLL_TOP], [BALL_R, BALL_R, SCROLL_TOP]].map((q) => P(...q));
  const hx = hitPts.map((q) => q[0]), hy = hitPts.map((q) => q[1]);
  const hit = { x0: Math.min(...hx), x1: Math.max(...hx), y0: Math.min(...hy), y1: Math.max(...hy) };

  bag.add(pointer(stage, {
    move: (p) => {
      const inside = p[0] >= hit.x0 && p[0] <= hit.x1 && p[1] >= hit.y0 && p[1] <= hit.y1;
      if (inside !== over) { over = inside; read.textContent = over ? "sings" : "rest"; }
      B.wake();
    },
    leave: () => { over = false; read.textContent = "rest"; B.wake(); },
  }));
  bag.add(() => svg.replaceChildren());
  drawJaw();
  read.textContent = "rest";

  return {
    set: (v) => { OPEN = v; },
    destroy: bag.dispose,
  };
}

hairline({
  name: "otamatone",
  means: "An otamatone: a round head on a thin neck, topped with a scroll. Hovering opens its mouth to sing; leaving closes it.",
  rules: [1, 5, 8, 9],
  range: [4, 7, 11],
  tour: [[200, 170], [172, 150], [228, 150], null],
  mount,
});
