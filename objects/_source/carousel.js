/**
 * Carousel: a round platform under a shallow conical canopy, a post at its
 * centre, and four seats on poles riding a circle round it. Circling the
 * pointer round the platform pushes the seats round with it, continuously;
 * leaving lets them coast to the nearest quarter turn. The seat nearest the
 * pointer's angle takes the bright edge.
 *
 * The pattern: the same drag-to-turn-then-snap gesture as Turnstile, with
 * the depth of post and seats re-sorted as they turn, so the near ones
 * always paint over the far ones (rule 06).
 */
const {
  Cam, facing, fit, flatDot, hull, mk, open, place, pointer, poly, proj, prism, put,
  register, ringAt, rrect, run, seg, disposer, solid, spring, stepS, unproj,
} = HL;

const PR = 32, PH = 4;
const BASE_R = 38, BASE_H = 3;
const POST_R = 3, POST_H = 44;
const SR = 22, POLE_R = 1.1, POLE_Z1 = 18;
const BOB_A = 3.5, BOB_F = 2;
const SDR = 5.6, SDT = 3.9, SDH = 3.2;
const CANOPY_R0 = 29, CANOPY_Z0 = 40, CANOPY_R1 = 3, CANOPY_Z1 = 58;
const Q = Math.PI / 2, A0 = 0.3;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const at = (ring, dx, dy) => ring.map((q) => ({ ...q, u: q.u + dx, v: q.v + dy }));
/** A local ring (built at the origin), turned by `ang` and set down at (dx, dy): how each seat keeps its own rounded footprint while riding the circle. */
const rot = (ring, ang, dx, dy) => {
  const c = Math.cos(ang), s = Math.sin(ang);
  return ring.map((q) => ({ u: q.u * c - q.v * s + dx, v: q.u * s + q.v * c + dy, nu: q.nu * c - q.nv * s, nv: q.nu * s + q.nv * c }));
};
const SEAT_O = rrect(-SDR, -SDT, SDR, SDT, 1.6), SEAT_I = rrect(-SDR + 1, -SDT + 1, SDR - 1, SDT - 1, 0.8);

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  const C = Cam(45, 0.5, 3.2);
  fit(C, [[-BASE_R, -BASE_R, -BASE_H], [BASE_R, BASE_R, -BASE_H], [BASE_R, -BASE_R, -BASE_H], [-BASE_R, BASE_R, -BASE_H], [0, 0, CANOPY_Z1 + 2]], 200, 166);
  const P = proj(C), front = facing(C);
  let gain = value, over = null, prev = null, want = -1, shown = -2;
  const sp = spring(A0, { eps: 0.002 });
  const g = mk("g", {}, svg);

  // A wider, lower base under the platform, so a rim of it shows all round the edge. No inner crease: it is a plain plinth, not a plated top.
  put(solid(g), prism(P, front, HL.circ(BASE_R, 56), null, -BASE_H, 0));
  // The platform, which never moves.
  put(solid(g), prism(P, front, HL.circ(PR, 56), HL.circ(PR - 2.4, 56), 0, PH));
  for (let k = 0; k < 4; k++) place(flatDot(g, C, 0.9, "dot off"), P((CANOPY_R0 - 1) * Math.cos(A0 + k * Q), (CANOPY_R0 - 1) * Math.sin(A0 + k * Q), PH));

  // Post and seats share one group, so turning can re-sort them by depth together.
  const midG = mk("g", {}, g);
  const post = solid(midG);
  const seats = [0, 1, 2, 3].map(() => ({ g: mk("g", {}, midG), pole: null, seat: null }));
  seats.forEach((s) => {
    s.pole = solid(s.g);
    s.seat = solid(s.g);
  });

  // The canopy: a cone, built from its own two rings (rule 09, tapered solids).
  // Appended last, above the post and seats, so it always paints over them, the way a roof really would.
  const foot = HL.circ(CANOPY_R0, 48), top = HL.circ(CANOPY_R1, 48), capIn = HL.circ(CANOPY_R1 * 0.4, 48);
  mk("path", { class: "sil", d: poly(hull(ringAt(P, foot, CANOPY_Z0).concat(ringAt(P, top, CANOPY_Z1)))) }, g);
  mk("path", { class: "nf lo", d: open(ringAt(P, run(capIn, front), CANOPY_Z1)) }, g);
  // Ribs, apex to rim, on the canopy's own front half only: a tent's seams, not a flat cone.
  const apex = P(0, 0, CANOPY_Z1), CANOPY_N = 8;
  for (let k = 0; k < CANOPY_N; k++) {
    const a = (k / CANOPY_N) * 2 * Math.PI, nu = Math.cos(a), nv = Math.sin(a);
    if (!front({ nu, nv })) continue;
    mk("path", { class: "nf lo", d: seg(apex, P(CANOPY_R0 * nu, CANOPY_R0 * nv, CANOPY_Z0)) }, g);
  }

  let order = "", drawn = NaN;
  function draw() {
    if (sp.x === drawn) return;
    drawn = sp.x;
    put(post, prism(P, front, HL.circ(POST_R, 20), HL.circ(POST_R - 1, 20), PH, POST_H));
    // The pole only ever reaches up to the seat's own base, so none of it shows above a low seat.
    const dep = seats.map((s, i) => {
      const a = sp.x + i * Q, cx = SR * Math.cos(a), cy = SR * Math.sin(a);
      const z0 = PH + POLE_Z1 + BOB_A * Math.sin(a * BOB_F), z1 = z0 + SDH;
      put(s.pole, prism(P, front, at(HL.circ(POLE_R, 14), cx, cy), at(HL.circ(POLE_R - 0.4, 14), cx, cy), PH, z0));
      put(s.seat, prism(P, front, rot(SEAT_O, a, cx, cy), rot(SEAT_I, a, cx, cy), z0, z1));
      return { s, d: cx + cy };
    });
    dep.push({ s: { g: post.g }, d: 0 });
    dep.sort((p, q) => p.d - q.d);
    const key = dep.map((e) => (e.s.g === post.g ? "p" : seats.indexOf(e.s))).join();
    if (key !== order) { order = key; dep.forEach((e) => midG.append(e.s.g)); }
  }

  const B = register(stage, (dt) => { const m = stepS(sp, dt); draw(); return m; });
  bag.add(B.unregister);

  const mark = (j) => seats.forEach((s, k) => s.seat.sil.classList.toggle("hi", k === j));
  function look() {
    want = over ? ((Math.round(wrap(Math.atan2(over[1], over[0]) - sp.t) / Q) % 4) + 4) % 4 : -1;
    if (want !== shown) { shown = want; mark(want < 0 ? 0 : want); read.textContent = want < 0 ? "rest" : "seat " + (want + 1); }
  }
  bag.add(pointer(stage, {
    move: (p) => {
      over = unproj(C, p[0], p[1], 0);
      const r = Math.hypot(over[0], over[1]), a = Math.atan2(over[1], over[0]);
      if (r < 8 || r > PR + 4) { prev = null; if (r > PR + 4) over = null; } else { if (prev !== null) sp.t += wrap(a - prev) * gain; prev = a; }
      look(); B.wake();
    },
    leave: () => { over = null; prev = null; sp.t = A0 + Math.round((sp.t - A0) / Q) * Q; look(); B.wake(); },
  }));
  bag.add(() => svg.replaceChildren());
  mark(0);
  read.textContent = "rest";
  draw();

  return { set: (v) => { gain = v; }, destroy: bag.dispose };
}

hairline({
  name: "carousel",
  means: "A carousel: circling the pointer round it pushes the seats round, and they settle to the nearest one at rest.",
  rules: [1, 4, 5, 8],
  range: [0.6, 1, 1.6],
  tour: [[290, 160], [200, 215], [110, 160], [200, 105], null],
  mount,
});
