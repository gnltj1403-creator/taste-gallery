/**
 * Sunset: a row of clouds over a ridge. Each takes its puff from its
 * distance to the pointer, on its own spring, and falls off with distance.
 * At rest the row is already uneven, two low rises of light. Clouds puffed
 * past half take the bright stroke, like catching the last orange light.
 * The slider is the falloff's radius.
 *
 * The pattern: Terrain's field, in one row instead of a grid.
 */
const {
  Cam, clamp, facing, fit, prism, proj, rings, unproj, spring, stepS,
  mk, put, pointer, register, disposer, solid,
} = HL;

const EXT = 250, LANE_Y0 = 14, LANE_Y1 = 24, RIDGE_H = 11, M = 7, ALT = 16, HMAX = 11;

/** Same shape as Terrain's falloff: 1 → .31 at 42% of the radius → .09 beyond. */
const falloff = (u) =>
  u <= 0 ? 1 : u <= 0.417 ? 1 - (u / 0.417) * 0.6875 : u <= 1 ? 0.3125 - ((u - 0.417) / 0.583) * 0.2185 : 0.094;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  const C = Cam(45, 0.5, 1.82);
  fit(C, [[-10, -4, -RIDGE_H], [EXT + 10, LANE_Y1 + 10, ALT + HMAX + 4], [EXT + 10, -4, 0], [-10, LANE_Y1 + 10, 0]], 200, 166);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  const [rr, ri] = rings(-10, -4, EXT + 10, LANE_Y1 + 10, 10, 2.6);
  put(solid(g), prism(P, front, rr, ri, -RIDGE_H, 0));

  const clouds = [];
  for (let i = 0; i < M; i++) {
    const u = i / (M - 1);
    const bx = (i + 0.5) * (EXT / M);
    const w = 16 + 4 * Math.sin(i * 1.9 + 1);
    const h0 = 1.5 + HMAX * 0.55 * Math.exp(-((u - 0.26) ** 2) / 0.02) + HMAX * 0.3 * Math.exp(-((u - 0.78) ** 2) / 0.03);
    clouds.push({ i, bx, w, h0, sp: spring(h0, { eps: 0.03 }), el: solid(g), drawn: NaN });
  }

  let R = value, over = null;

  function drawCloud(c) {
    const h = Math.max(1.2, c.sp.x);
    if (h === c.drawn) return;
    c.drawn = h;
    const [ring, inner] = rings(c.bx - c.w / 2, LANE_Y0, c.bx + c.w / 2, LANE_Y1, 3.4, 1.0);
    put(c.el, prism(P, front, ring, inner, ALT, ALT + h));
    c.el.sil.classList.toggle("hi", h > HMAX * 0.5);
  }

  const B = register(stage, (dt) => {
    let m = false;
    for (const c of clouds) { if (stepS(c.sp, dt)) m = true; drawCloud(c); }
    return m;
  });
  bag.add(B.unregister);

  function retarget() {
    for (const c of clouds) {
      if (over == null) { c.sp.t = c.h0; continue; }
      c.sp.t = 1.2 + HMAX * falloff(Math.abs(c.bx - over) / R);
    }
    if (over != null) {
      let near = clouds[0];
      for (const c of clouds) if (Math.abs(c.bx - over) < Math.abs(near.bx - over)) near = c;
      read.textContent = `cloud ${near.i + 1}`;
    } else read.textContent = "rest";
    B.wake();
  }

  bag.add(pointer(stage, {
    move: (p) => { over = unproj(C, p[0], p[1], ALT)[0]; retarget(); },
    leave: () => { over = null; retarget(); },
  }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { R = v; if (over != null) retarget(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "sunset",
  means: "Clouds puff up near the pointer and fall off with distance, bright past half height.",
  rules: [1, 3, 4, 5, 9],
  range: [40, 75, 130],
  tour: [[90, 158], [200, 150], [320, 168], null],
  mount,
});
