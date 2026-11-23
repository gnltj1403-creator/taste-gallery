/**
 * Book stack: one book sits on the table; four more wait high above it,
 * each at its own height, in a loose queue. Hovering drops them one by one
 * onto the first, staggered from the top down, each landing with a long
 * ease-out. Leaving lifts them back up the same way, in reverse.
 *
 * The pattern: a discrete change (fallen or not) on each book's own tween
 * (rule 08), staggered by index (rule 02) instead of by distance from the
 * pointer, since every book answers the same yes/no.
 */
const {
  Cam, facing, fit, mk, pointer, prism, proj, put, register, rings,
  disposer, solid, tdone, tset, tval, tween, unproj,
} = HL;

const BOOKS = [
  { w: 34, d: 24, h: 7, dx: 0, dy: 0, rot: -9 },
  { w: 31, d: 22, h: 6, dx: 2, dy: -1, lift: 18, rot: 13 },
  { w: 33, d: 23, h: 5, dx: -2, dy: 1, lift: 28, rot: -16 },
  { w: 28, d: 19, h: 6, dx: 1, dy: -2, lift: 38, rot: 10 },
  { w: 25, d: 17, h: 5, dx: -1, dy: 2, lift: 50, rot: -6 },
];
/** Turns a ring (and its normals) about (cx, cy) by deg, so books cross each other instead of all facing the same way. */
function spin(ring, cx, cy, deg) {
  const r = (deg * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
  return ring.map((q) => {
    const u = q.u - cx, v = q.v - cy;
    return { u: u * c - v * s + cx, v: u * s + v * c + cy, nu: q.nu * c - q.nv * s, nv: q.nu * s + q.nv * c };
  });
}
let z0 = 0;
for (const b of BOOKS) { b.z0 = z0; z0 += b.h; }
const STACK_H = z0;
const halfBox = (b) => {
  const r = (b.rot * Math.PI) / 180, c = Math.abs(Math.cos(r)), s = Math.abs(Math.sin(r));
  return { hw: (b.w / 2) * c + (b.d / 2) * s, hd: (b.w / 2) * s + (b.d / 2) * c };
};
const SPAN_X = Math.max(...BOOKS.map((b) => halfBox(b).hw + Math.abs(b.dx))) + 4;
const SPAN_Y = Math.max(...BOOKS.map((b) => halfBox(b).hd + Math.abs(b.dy))) + 4;
const TOP = STACK_H + BOOKS.at(-1).lift + 6;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let STEP = value;
  const C = Cam(45, 0.5, 3.1);
  fit(C, [[-SPAN_X, -SPAN_Y, 0], [SPAN_X, SPAN_Y, TOP]], 200, 166);
  const P = proj(C), front = facing(C);
  const g = mk("g", {}, svg);

  let over = false;
  const books = BOOKS.map((b, i) => {
    const [ring0, inner0] = rings(b.dx - b.w / 2, b.dy - b.d / 2, b.dx + b.w / 2, b.dy + b.d / 2, 2, 1.1);
    const ring = spin(ring0, b.dx, b.dy, b.rot), inner = spin(inner0, b.dx, b.dy, b.rot);
    return { ...b, i, ring, inner, el: solid(g), tw: i === 0 ? null : tween(1) };
  });

  function drawBook(b, now) {
    const lift = b.tw ? tval(b.tw, now) * b.lift : 0;
    put(b.el, prism(P, front, b.ring, b.inner, b.z0 + lift, b.z0 + lift + b.h));
  }

  const B = register(stage, (dt, now) => {
    let moving = false;
    for (const b of books) {
      if (b.tw && !tdone(b.tw, now)) moving = true;
      drawBook(b, now);
    }
    return moving;
  });
  bag.add(B.unregister);

  function retarget(now) {
    for (const b of books) {
      if (!b.tw) continue;
      const topDown = BOOKS.length - 1 - b.i; // the top book falls first, staggered down the pile
      tset(b.tw, over ? 0 : 1, now, topDown * STEP);
    }
    B.wake();
  }

  bag.add(pointer(stage, {
    move: (p) => {
      const w = unproj(C, p[0], p[1], 0);
      const inside = Math.abs(w[0]) <= SPAN_X && Math.abs(w[1]) <= SPAN_Y;
      if (inside !== over) { over = inside; read.textContent = over ? "stacked" : "rest"; retarget(performance.now()); }
    },
    leave: () => { if (over) { over = false; read.textContent = "rest"; retarget(performance.now()); } },
  }));
  bag.add(() => svg.replaceChildren());
  for (const b of books) drawBook(b, performance.now());
  read.textContent = "rest";

  return {
    set: (v) => { STEP = v; },
    destroy: bag.dispose,
  };
}

hairline({
  name: "bookstack",
  means: "One book on the table; four more wait high above it. Hovering drops them on one by one; leaving lifts them back up.",
  rules: [2, 5, 8, 9],
  range: [20, 60, 150],
  tour: [[200, 190], [200, 190], null],
  mount,
});
