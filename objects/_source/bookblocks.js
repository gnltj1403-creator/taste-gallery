/**
 * Book blocks: five flat, book-shaped blocks stacked on a plinth, each set a
 * little off its neighbour at rest, the top one bright. The pointer's height
 * picks a block; every block above it sways sideways, farther the higher it
 * sits, to the side the pointer is on. The slider is the sway, in units.
 *
 * The pattern: Tower's own scrub-and-pick, a spring per block, just with a
 * flat rectangular footprint (a closed book) instead of a square one.
 */
const {
  Cam, clamp, facing, fit, prism, proj, rings, spring, stepS,
  mk, pointer, put, register, disposer, solid,
} = HL;

const N = 5, BH = 7, PB = 4;
const BW = [23, 22, 20, 22, 21], BD = 14.5;
const OFF = [0, 2, -1.5, 2.5, -1];
// Each book's own tilt, so the pile reads as books set down at their own angles, not a neat rotated square: some square to the pile, some canted.
const ANG = [0, -16, 11, 0, -9];
const E = [Math.SQRT1_2, -Math.SQRT1_2];
const spin = (ring, deg) => {
  const r = (deg * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
  return ring.map((q) => ({ u: q.u * c - q.v * s, v: q.u * s + q.v * c, nu: q.nu * c - q.nv * s, nv: q.nu * s + q.nv * c }));
};

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let sway = value, amp = 0, pick = -1;
  const C = Cam(45, 0.5, 4.6);
  fit(C, [[-BD, -BD, -PB], [BD, BD, -PB], [BD, -BD, -PB], [-BD, BD, -PB], [0, 0, N * BH + 4], [-sway - 8, sway + 8, N * BH], [sway + 8, -sway - 8, N * BH]], 200, 168);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  const [br, bi] = rings(-BD - 2, -BD - 2, BD + 2, BD + 2, 5, 1.6);
  put(solid(g), prism(P, front, br, bi, -PB, 0));
  const blocks = [];
  for (let k = 0; k < N; k++) {
    const hw = BW[k] / 2, el = solid(g);
    const [ring0, inner0] = rings(-hw, -BD, hw, BD, 2.6, 1.1);
    const ring = spin(ring0, ANG[k]), inner = spin(inner0, ANG[k]);
    blocks.push({ k, ring, inner, el, sp: spring(OFF[k], { eps: 0.03 }), drawn: NaN });
  }
  const top = blocks[N - 1];
  top.el.sil.classList.add("hi");
  let lit = top;

  function drawBlock(b) {
    const o = b.sp.x;
    if (o === b.drawn) return;
    b.drawn = o;
    const ox = E[0] * o, oy = E[1] * o, z0 = b.k * BH, z1 = z0 + BH - 1;
    const P2 = (x, y, z) => P(x + ox, y + oy, z);
    put(b.el, prism(P2, front, b.ring, b.inner, z0, z1));
  }

  const B = register(stage, (dt) => {
    let m = false;
    for (const b of blocks) { if (stepS(b.sp, dt)) m = true; drawBlock(b); }
    return m;
  });
  bag.add(B.unregister);

  // Static bands: block k is picked by the screen height of its resting middle, never its moved one.
  const mid = blocks.map((b) => P(OFF[b.k] * E[0], OFF[b.k] * E[1], b.k * BH + BH / 2)[1]);
  const cx = P(0, 0, 0)[0];
  function level(y) {
    let best = 0;
    for (let k = 1; k < N; k++) if (Math.abs(mid[k] - y) < Math.abs(mid[best] - y)) best = k;
    return best;
  }

  function retarget() {
    for (const b of blocks) {
      const w = pick < 0 || b.k < pick ? 0 : (b.k - pick + 1) / (N - pick);
      b.sp.t = OFF[b.k] + (pick < 0 ? 0 : amp * sway * w);
    }
    const next = pick < 0 ? top : blocks[pick];
    if (next !== lit) { lit.el.sil.classList.remove("hi"); next.el.sil.classList.add("hi"); lit = next; }
    read.textContent = pick < 0 ? "rest" : `book ${pick + 1}`;
    B.wake();
  }

  bag.add(pointer(stage, {
    move: (p) => { pick = level(p[1]); amp = clamp((p[0] - cx) / 100, -1, 1); retarget(); },
    leave: () => { pick = -1; amp = 0; retarget(); },
  }));
  bag.add(() => svg.replaceChildren());

  return { set: (v) => { sway = v; if (pick >= 0) retarget(); }, destroy: bag.dispose };
}

hairline({
  name: "bookblocks",
  means: "Five flat books stacked on a plinth: the pointer's height picks one, and everything above it sways away, more the higher.",
  rules: [1, 3, 5, 9],
  range: [10, 16, 22],
  tour: [[150, 120], [250, 150], [160, 200], null],
  mount,
});
