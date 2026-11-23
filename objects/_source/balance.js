/**
 * Balance: a desk figure stands on a round stage, pinned at its foot. The
 * pointer's distance from centre sets how far it leans, on a spring; past
 * about two thirds of the reach it takes the bright stroke, holding the
 * pose. At rest it stands with a small, steady lean, not dead upright.
 *
 * The pattern: a scrub (Exploded's x sets a continuous value), built as a
 * two-ring solid whose top ring is offset from its foot (rule 09).
 */
const {
  Cam, clamp, facing, fit, hull, mk, open, poly, prism, proj, ringAt, rings,
  run, spring, stepS, unproj, pointer, put, register, disposer, solid,
} = HL;

const CX = 200, CY = 166, STAGE_R = 34, STAGE_H = 7, FOOT = 9, H = 58, HEAD_R = 7, REACH = 70;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  const C = Cam(45, 0.5, 2.7);
  fit(C, [[-STAGE_R, -STAGE_R, -STAGE_H], [STAGE_R, STAGE_R, H + HEAD_R * 2]], CX, CY);
  const P = proj(C), front = facing(C);
  const g = mk("g", {}, svg);

  const [sr, si] = rings(-STAGE_R, -STAGE_R, STAGE_R, STAGE_R, STAGE_R, 2.6);
  put(solid(g), prism(P, front, sr, si, -STAGE_H, 0));

  const [foot, footI] = rings(-FOOT / 2, -FOOT / 2, FOOT / 2, FOOT / 2, 3, 1);
  const torso = solid(g), head = solid(g);

  let LEAN = value, lean = spring(LEAN * 0.22, { eps: 0.03 }), over = null;

  function draw() {
    const dx = lean.x, dy = lean.x * 0.35;
    const lit = Math.abs(lean.x) > LEAN * 0.66;

    const [topRing, topInner] = rings(-FOOT / 2 + dx, -FOOT / 2 + dy, FOOT / 2 + dx, FOOT / 2 + dy, 3, 1);
    const sil = poly(hull(ringAt(P, foot, 0).concat(ringAt(P, topRing, H))));
    const crease = open(ringAt(P, run(topInner, front), H));
    put(torso, { sil, crease });
    torso.sil.classList.toggle("hi", lit);

    const [hRing, hInner] = rings(-HEAD_R + dx, -HEAD_R + dy, HEAD_R + dx, HEAD_R + dy, HEAD_R, 1.6);
    put(head, prism(P, front, hRing, hInner, H, H + HEAD_R * 1.7));
    head.sil.classList.toggle("hi", lit);
  }

  const B = register(stage, (dt) => {
    const m = stepS(lean, dt);
    draw();
    return m;
  });
  bag.add(B.unregister);

  function retarget() {
    if (over == null) { lean.t = LEAN * 0.22; read.textContent = "rest"; }
    else {
      const ratio = clamp((over[0] - CX) / REACH, -1, 1);
      lean.t = ratio * LEAN;
      read.textContent = `lean ${Math.round((Math.abs(lean.t) / LEAN) * 100)}`;
    }
    B.wake();
  }

  bag.add(pointer(stage, {
    move: (p) => { over = unproj(C, p[0], p[1], H * 0.6); retarget(); },
    leave: () => { over = null; retarget(); },
  }));
  bag.add(() => svg.replaceChildren());
  draw();

  return {
    set: (v) => { LEAN = v; retarget(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "balance",
  means: "A standing figure leans toward the pointer and holds the pose past two thirds of its reach.",
  rules: [3, 4, 5, 8, 9],
  range: [10, 16, 24],
  tour: [[150, 150], [260, 160], [200, 90], null],
  mount,
});
