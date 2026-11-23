/**
 * Summit: five tapered peaks on a plinth, in a row. Each rises toward the
 * pointer's distance along the row, on its own spring, and falls off past
 * the reach. At rest the middle peak already stands tallest, a summit
 * before anyone arrives. A peak past half height takes the bright stroke,
 * as if the fog has cleared off it.
 *
 * The pattern: Terrain's field, one row, with tapered (rule 9) peaks.
 */
const {
  Cam, facing, fit, hull, mk, open, poly, prism, proj, ringAt, rrect, run,
  spring, stepS, unproj, pointer, put, register, disposer, solid,
} = HL;

const EXT = 220, N = 5, FOOT = 30, TOP = 6, HMAX = 62, PB = 7;

const falloff = (u) =>
  u <= 0 ? 1 : u <= 0.417 ? 1 - (u / 0.417) * 0.6875 : u <= 1 ? 0.3125 - ((u - 0.417) / 0.583) * 0.2185 : 0.094;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  const C = Cam(45, 0.5, 1.9);
  fit(C, [[-14, -14, -PB], [EXT + 14, 24, 0], [EXT / 2, -14, HMAX]], 200, 176);
  const P = proj(C), front = facing(C);
  const g = mk("g", {}, svg);

  const base = rrect(-14, -14, EXT + 14, 24, 10);
  const baseI = rrect(-12, -12, EXT + 12, 22, 8);
  put(solid(g), prism(P, front, base, baseI, -PB, 0));

  const peaks = [];
  for (let i = 0; i < N; i++) {
    const u = i / (N - 1);
    const bx = (i + 0.5) * (EXT / N);
    const h0 = 12 + HMAX * 0.78 * Math.exp(-((u - 0.5) ** 2) / 0.05);
    const foot = rrect(bx - FOOT / 2, -2, bx + FOOT / 2, 14, 7);
    peaks.push({ i, bx, foot, h0, sp: spring(h0, { eps: 0.04 }), el: solid(g), drawn: NaN });
  }

  let R = value, over = null;

  function drawPeak(c) {
    const h = Math.max(6, c.sp.x);
    if (h === c.drawn) return;
    c.drawn = h;
    const w = TOP + (FOOT - TOP) * (1 - h / HMAX) * 0.5;
    const top = rrect(c.bx - w / 2, 4, c.bx + w / 2, 10, Math.min(2.6, w / 2 - 0.2));
    const inner = rrect(c.bx - w / 2 + 1.1, 5.1, c.bx + w / 2 - 1.1, 8.9, Math.max(0.3, Math.min(2.6, w / 2 - 0.2) - 1.1));
    const sil = poly(hull(ringAt(P, c.foot, 0).concat(ringAt(P, top, h))));
    const crease = open(ringAt(P, run(inner, front), h));
    put(c.el, { sil, crease });
    c.el.sil.classList.toggle("hi", h > HMAX * 0.5);
  }

  const B = register(stage, (dt) => {
    let m = false;
    for (const c of peaks) { if (stepS(c.sp, dt)) m = true; drawPeak(c); }
    return m;
  });
  bag.add(B.unregister);

  function retarget() {
    for (const c of peaks) {
      if (over == null) { c.sp.t = c.h0; continue; }
      c.sp.t = 10 + HMAX * falloff(Math.abs(c.bx - over) / R);
    }
    if (over != null) {
      let near = peaks[0];
      for (const c of peaks) if (Math.abs(c.bx - over) < Math.abs(near.bx - over)) near = c;
      read.textContent = `peak ${near.i + 1}`;
    } else read.textContent = "rest";
    B.wake();
  }

  bag.add(pointer(stage, {
    move: (p) => { over = unproj(C, p[0], p[1], 0)[0]; retarget(); },
    leave: () => { over = null; retarget(); },
  }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { R = v; if (over != null) retarget(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "summit",
  means: "Peaks rise toward the pointer along the row and fall off with distance, bright past half height.",
  rules: [1, 3, 4, 5, 9],
  range: [30, 55, 95],
  tour: [[80, 190], [200, 170], [320, 190], null],
  mount,
});
