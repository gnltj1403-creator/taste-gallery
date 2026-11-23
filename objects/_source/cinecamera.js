/**
 * Cine camera: a body on the ground, a matte box on its right face (its
 * opening wider than where it joins the body), and two film magazines
 * standing face-on above. Hovering spins both magazines up, on a spring;
 * each carries a spoke mark that sweeps round and takes the bright
 * stroke while turning. Leaving lets them coast to a stop.
 *
 * The pattern: a boolean from the pointer driving a continuous spin speed
 * on a spring (as Turntable's platter does). The magazines and the matte
 * box are built by hand as two parallel rings turned on their side
 * (rule 9's two-ring solid) instead of the usual horizontal ring: the
 * magazines in the camera's x–z plane, the matte box in its y–z plane.
 */
const {
  Cam, circ, facing, fit, hull, mk, open, pointer, poly, prism, proj, put,
  register, disposer, rrect, run, solid, spring, stepS, unproj, seg,
} = HL;

const BODY = [-11, -8, 11, 8], BODY_H = 15;
const MB_X_BACK = 11, MB_X_FRONT = 24;
const MB_BACK = rrect(-5, 4, 5, 11, 1.2);
const MB_FRONT = rrect(-7.5, 0, 7.5, 15, 1.8), MB_FRONT_I = rrect(-6.3, 1.2, 6.3, 13.8, 1.0);
const REEL_R = 17, REEL_R_BACK = 12, REEL_T = 9, REEL_X = 14.5, REEL_Z_MAX = BODY_H + REEL_R;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  const C = Cam(45, 0.5, 3.9);
  fit(C, [[-REEL_X - REEL_R, BODY[1], 0], [MB_X_FRONT, BODY[3], REEL_Z_MAX + REEL_R + 2]], 200, 176);
  const P = proj(C), front = facing(C);
  const g = mk("g", {}, svg);

  const [bodyR, bodyI] = [rrect(...BODY, 2.0), rrect(BODY[0] + 1.3, BODY[1] + 1.3, BODY[2] - 1.3, BODY[3] - 1.3, 1.0)];
  put(solid(g), prism(P, front, bodyR, bodyI, 0, BODY_H));

  /** A ring built in the y–z plane (standing up, facing along x), at fixed x, as screen points. */
  const vRingX = (ring, x) => ring.map((q) => P(x, q.u, q.v));

  put(solid(g), {
    sil: poly(hull(vRingX(MB_BACK, MB_X_BACK).concat(vRingX(MB_FRONT, MB_X_FRONT)))),
    crease: poly(vRingX(MB_FRONT_I, MB_X_FRONT)),
  });

  const vDisc = (r, cx, cz, y) => circ(r, 40).map((q) => P(cx + q.u, y, cz + q.v));
  /** The visible arc of the back ring: the plate's own thickness, its second line (rule 9), not an inset front face. */
  const vArc = (r, cx, cz, y) => run(circ(r, 40), front).map((q) => P(cx + q.u, y, cz + q.v));

  const reels = [-1, 1].map((side) => {
    const cx = side * REEL_X, r = side < 0 ? REEL_R_BACK : REEL_R, cz = BODY_H + r;
    const front_ = vDisc(r, cx, cz, -REEL_T / 2);
    const back_ = vDisc(r, cx, cz, REEL_T / 2);
    const el = solid(g);
    put(el, { sil: poly(hull(front_.concat(back_))), crease: open(vArc(r, cx, cz, REEL_T / 2)) });
    const spoke = mk("path", { class: "lo" }, g);
    return { cx, cz, rad: r, el, spoke };
  });

  let SPEED = value, over = false, angle = 0;
  const spin = spring(0, { eps: 0.02 });

  function drawSpokes() {
    for (const r of reels) {
      const a = P(r.cx, REEL_T / 2, r.cz);
      const b = P(r.cx + (r.rad - 1.5) * Math.cos(angle), REEL_T / 2, r.cz + (r.rad - 1.5) * Math.sin(angle));
      r.spoke.setAttribute("d", seg(a, b));
      r.spoke.classList.toggle("hi", over);
      r.el.sil.classList.toggle("hi", over);
    }
  }

  const B = register(stage, (dt) => {
    spin.t = over ? SPEED : 0;
    const m = stepS(spin, dt);
    angle += spin.x * dt;
    drawSpokes();
    return m;
  });
  bag.add(B.unregister);

  bag.add(pointer(stage, {
    move: (p) => {
      const w = unproj(C, p[0], p[1], 0);
      const inside = w[0] >= -REEL_X - REEL_R && w[0] <= MB_X_FRONT && w[1] >= BODY[1] && w[1] <= BODY[3];
      if (inside !== over) { over = inside; read.textContent = over ? "rolling" : "rest"; }
    },
    leave: () => { over = false; read.textContent = "rest"; },
  }));
  bag.add(() => svg.replaceChildren());
  drawSpokes();
  read.textContent = "rest";

  return {
    set: (v) => { SPEED = v; },
    destroy: bag.dispose,
  };
}

hairline({
  name: "cinecamera",
  means: "Hovering spins both film magazines up on their spring; leaving lets them coast down.",
  rules: [4, 5, 7, 9],
  range: [3, 5, 9],
  tour: [[200, 176], [200, 110], [200, 176], null],
  mount,
});
