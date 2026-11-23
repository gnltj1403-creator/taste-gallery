/**
 * Walker: a standing figure on a path, a low sun behind it at the end of the
 * day. Each time the pointer arrives close, the figure takes one step: its
 * two legs swap which is forward and which is back, one a beat after the
 * other. The sun is a plain ring, the figure's one bright edge; nothing else
 * changes colour. The slider is the stride's reach.
 *
 * The pattern: a discrete arrival (rule 01, tested on the ground plane,
 * which never moves) retargets two tweens (rule 08) a beat apart (rule 02),
 * each easing a foot's signed world offset; each leg is its own tilted
 * cylinder, the two rings of rule 09 built at different points instead of
 * the same one, so the leg itself leans from hip to foot.
 */
const {
  Cam, facing, fit, flatDot, hull, mk, open, place, pointer, poly, prism, proj, put,
  register, ringAt, run, disposer, solid, tdone, tset, tval, tween, unproj, circ,
} = HL;

const HIP_Z = 20, NECK_Z = 34, HEAD_Z = 42;
const BODY_R = 5, HEAD_R = 3.5, LEG_R = 2.3;
const FOOT_Y = 4.5;
const SUN_X = -32, SUN_Z = 7, SUN_R = 9;
const PATH_Y = 15, PATH_X0 = -46, PATH_X1 = 26;
const HIT_R = 20;
const STAGGER = 80;

const at = (ring, dx, dy) => ring.map((q) => ({ ...q, u: q.u + dx, v: q.v + dy }));

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let reach = value;
  const C = Cam(45, 0.5, 3.1);
  fit(C, [[PATH_X0, -PATH_Y, 0], [PATH_X1, PATH_Y, 0], [SUN_X - SUN_R, 0, 0], [0, 0, HEAD_Z + 4], [reach + 6, -FOOT_Y, 0], [-reach - 6, FOOT_Y, 0]], 200, 180);
  const P = proj(C), front = facing(C);
  const g = mk("g", {}, svg);

  // The path: two dashed edges receding, painted first so the figure's plates sit over them.
  const seg = (a, b) => `M${a[0]} ${a[1]}L${b[0]} ${b[1]}`;
  mk("path", { class: "dash lo", d: seg(P(PATH_X0, -PATH_Y, 0), P(PATH_X1, -PATH_Y, 0)) }, g);
  mk("path", { class: "dash lo", d: seg(P(PATH_X0, PATH_Y, 0), P(PATH_X1, PATH_Y, 0)) }, g);

  // The sun: a plain ring, low and still — the figure's one bright edge (rule 04), never a filled glow.
  place(flatDot(g, C, SUN_R, "nf hi"), P(SUN_X, 0, SUN_Z));

  // Torso and head, stacked: the figure's fixed solids.
  put(solid(g), prism(P, front, circ(BODY_R, 24), circ(BODY_R - 1, 24), HIP_Z, NECK_Z));
  put(solid(g), prism(P, front, circ(HEAD_R, 20), circ(HEAD_R - 0.7, 20), NECK_Z, HEAD_Z));

  // Each leg: two rings — a hip ring fixed at the centre, a foot ring that eases between fore and aft — so the leg itself leans.
  const hipRing = circ(LEG_R, 12), hipInner = circ(LEG_R - 0.4, 12);
  function legSolid(footY) {
    return { el: solid(g), x: tween(0), y: footY, drawn: NaN };
  }
  const legs = [legSolid(-FOOT_Y), legSolid(FOOT_Y)];

  function drawLeg(l, now) {
    const fx = tval(l.x, now);
    if (fx === l.drawn) return;
    l.drawn = fx;
    const footRing = at(hipRing, fx, l.y), footInner = at(hipInner, fx, l.y);
    put(l.el, {
      sil: poly(hull(ringAt(P, footRing, 0).concat(ringAt(P, hipRing, HIP_Z)))),
      crease: open(ringAt(P, run(hipInner, front), HIP_Z)),
    });
  }

  tset(legs[0].x, reach, performance.now(), 0);
  tset(legs[1].x, -reach, performance.now(), 0);

  const B = register(stage, (_dt, now) => {
    for (const l of legs) drawLeg(l, now);
    return legs.some((l) => !tdone(l.x, now));
  });
  bag.add(B.unregister);

  let stride = 1, over = false;
  function step() {
    stride = -stride;
    const now = performance.now();
    tset(legs[0].x, reach * stride, now, 0);
    tset(legs[1].x, -reach * stride, now, STAGGER);
    B.wake();
  }

  bag.add(pointer(stage, {
    move: (p) => {
      const w = unproj(C, p[0], p[1], 0);
      const near = Math.hypot(w[0], w[1]) <= HIT_R;
      if (near && !over) step();
      over = near;
      read.textContent = over ? "walks" : "rest";
    },
    leave: () => { over = false; read.textContent = "rest"; },
  }));
  bag.add(() => svg.replaceChildren());
  read.textContent = "rest";

  return {
    set: (v) => { reach = v; },
    destroy: bag.dispose,
  };
}

hairline({
  name: "walker",
  means: "A figure on a path at sunset: the pointer's arrival makes it take one step, each leg swapping fore and aft a beat apart.",
  rules: [1, 2, 8, 9],
  range: [6, 9, 13],
  tour: [[200, 185], [270, 150], [200, 185], null],
  mount,
});
