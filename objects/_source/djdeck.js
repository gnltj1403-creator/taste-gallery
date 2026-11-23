/**
 * DJ deck: a flat controller, a big jog wheel sunk into its left half, a
 * 2 x 2 grid of pads and three knobs on its right. The pointer picks one
 * part at a time: over the wheel it spins on a spring, a spoke sweeping
 * round and bright; over a pad or knob that one sinks on its own spring
 * and takes the bright stroke, like a button pressed. Leaving lets
 * whichever was active spring back up.
 *
 * The pattern: a discrete pick (rule 01, tested on the deck's own flat top
 * so the plane never moves) choosing which part's continuous spring (rule
 * 08) is driven toward its pressed or spinning target.
 */
const {
  Cam, circ, facing, fit, mk, pointer, prism, proj, put, register, rings,
  disposer, seg, solid, spring, stepS, unproj,
} = HL;

const BODY = [-42, -26, 42, 26], BODY_H = 9;
const JX = -24, JY = 0, JOG_R = 19, JOG_H = 5;
const PAD = 8, PAD_H = 3, PAD_DOWN = 0.8, PAD_GAP = 11, PAD_CX = 27, PAD_CY = 0;
const KNOB_R = 2.6, KNOB_H = 3, KNOB_DOWN = 0.8, KNOB_Y = BODY[1] + 6;

const at = (ring, dx, dy) => ring.map((q) => ({ ...q, u: q.u + dx, v: q.v + dy }));

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  const C = Cam(45, 0.5, 2.9);
  fit(C, [[BODY[0], BODY[1], 0], [BODY[2], BODY[3], BODY_H + JOG_H]], 200, 166);
  const P = proj(C), front = facing(C);
  const g = mk("g", {}, svg);

  put(solid(g), prism(P, front, ...rings(...BODY, 6, 2.2), 0, BODY_H));

  const [wheelR, wheelI] = [at(circ(JOG_R, 48), JX, JY), at(circ(JOG_R - 2.6, 48), JX, JY)];
  const wheel = solid(g);
  const spoke = mk("path", { class: "lo" }, g);

  // Four pads in a 2 x 2 grid, and three knobs above them: each its own footprint and press spring.
  const pads = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([dx, dy]) => {
    const cx = PAD_CX + (dx * PAD_GAP) / 2, cy = PAD_CY + (dy * PAD_GAP) / 2;
    const [ring, inner] = rings(cx - PAD / 2, cy - PAD / 2, cx + PAD / 2, cy + PAD / 2, 1.6, 0.9);
    return { cx, cy, half: PAD / 2, ring, inner, el: solid(g), h: spring(PAD_H, { eps: 0.02 }) };
  });
  const knobs = [PAD_CX - PAD_GAP / 2, PAD_CX, PAD_CX + PAD_GAP / 2].map((cx) => ({
    cx, cy: KNOB_Y, ring: at(circ(KNOB_R, 20), cx, KNOB_Y), inner: at(circ(KNOB_R - 0.8, 20), cx, KNOB_Y),
    el: solid(g), h: spring(KNOB_H, { eps: 0.02 }),
  }));

  let SPEED = value, angle = 0, target = null;
  const spin = spring(0, { eps: 0.02 });
  const topZ = BODY_H + JOG_H;

  /** Which part, if any, world point (wx, wy) is over: the wheel first, then a pad, then a knob. */
  function pick(wx, wy) {
    if (Math.hypot(wx - JX, wy - JY) <= JOG_R) return { kind: "wheel" };
    for (let i = 0; i < pads.length; i++) {
      const p = pads[i];
      if (Math.abs(wx - p.cx) <= p.half && Math.abs(wy - p.cy) <= p.half) return { kind: "pad", i };
    }
    for (let i = 0; i < knobs.length; i++) {
      if (Math.hypot(wx - knobs[i].cx, wy - knobs[i].cy) <= KNOB_R) return { kind: "knob", i };
    }
    return null;
  }
  const isWheel = () => target?.kind === "wheel";
  const isPart = (kind, i) => target?.kind === kind && target.i === i;

  const B = register(stage, (dt) => {
    const wheelOver = isWheel();
    spin.t = wheelOver ? SPEED : 0;
    let moving = stepS(spin, dt) || wheelOver;
    angle += spin.x * dt;
    const r = JOG_R - 3;
    spoke.setAttribute("d", seg(P(JX - r * Math.cos(angle), JY - r * Math.sin(angle), topZ),
      P(JX + r * Math.cos(angle), JY + r * Math.sin(angle), topZ)));
    spoke.classList.toggle("hi", wheelOver);
    wheel.sil.classList.toggle("hi", wheelOver);
    put(wheel, prism(P, front, wheelR, wheelI, BODY_H, BODY_H + JOG_H));

    pads.forEach((p, i) => {
      const on = isPart("pad", i);
      p.h.t = on ? PAD_DOWN : PAD_H;
      if (stepS(p.h, dt)) moving = true;
      put(p.el, prism(P, front, p.ring, p.inner, BODY_H, BODY_H + p.h.x));
      p.el.sil.classList.toggle("hi", on);
    });
    knobs.forEach((k, i) => {
      const on = isPart("knob", i);
      k.h.t = on ? KNOB_DOWN : KNOB_H;
      if (stepS(k.h, dt)) moving = true;
      put(k.el, prism(P, front, k.ring, k.inner, BODY_H, BODY_H + k.h.x));
      k.el.sil.classList.toggle("hi", on);
    });
    return moving;
  });
  bag.add(B.unregister);

  bag.add(pointer(stage, {
    move: (p) => {
      const w = unproj(C, p[0], p[1], BODY_H);
      const t = pick(w[0], w[1]);
      const same = (!target && !t) || (target && t && target.kind === t.kind && target.i === t.i);
      if (!same) {
        target = t;
        read.textContent = !t ? "rest" : t.kind === "wheel" ? "spins" : `${t.kind} ${t.i + 1}`;
      }
      B.wake();
    },
    leave: () => { target = null; read.textContent = "rest"; B.wake(); },
  }));
  bag.add(() => svg.replaceChildren());
  read.textContent = "rest";

  return {
    set: (v) => { SPEED = v; },
    destroy: bag.dispose,
  };
}

hairline({
  name: "djdeck",
  means: "A DJ deck: a jog wheel on its left, pads and knobs on its right. Hovering spins the wheel or presses a pad or knob.",
  rules: [1, 4, 5, 8, 9],
  range: [6, 10, 16],
  tour: [[160, 170], [255, 160], [230, 192], null],
  mount,
});
