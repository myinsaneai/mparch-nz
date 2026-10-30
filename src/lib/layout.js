// Project page layout model.
//
// A layout is stored on the project document as:
//   { v: 1, mode: 'grid', cols: 96, rowDiv: 96, items: [{ id, x, y, w, h }] }
//
// `id` is an image id, or LEGEND_ID for the details text box. Units are grid cells:
// x/w count columns (of `cols`), y/h count rows; one row is 1/rowDiv of the page width.
// With 96 x 96 a cell is about 13 px on a desktop screen. Because positions are plain numbers in these
// units, a finer grid or a free-positioning mode can reuse them (see normalizeLayout: older layouts
// saved with other cols/rowDiv values are scaled automatically).

export const LEGEND_ID = 'legend';
export const COLS = 96;
export const ROW_DIV = 96; // row height = page width / ROW_DIV
export const ROWS_PER_COL = ROW_DIV / COLS;
export const MIN_IMAGE_W = 12;
export const MIN_LEGEND_W = 16;
export const ITEM_PAD = 6; // px padding inside every item (gap between neighbours = 2 x this)

/** Width of the page area the editor draws at (matches the public site at >= 1280 px wide). */
export const EDIT_WIDTH = 1232 + ITEM_PAD * 2;

export function aspectOf(img) {
  return img && img.width && img.height ? img.width / img.height : 1.5;
}

/** Rows an image needs at `w` columns so the box has the image's own proportions. */
export function rowsForImage(w, img) {
  return Math.max(4, Math.round((w * ROWS_PER_COL) / aspectOf(img)));
}

function legendHasContent(project) {
  return Boolean((project.fields || []).some((f) => f.label && f.value) || project.year);
}

/** Approximate rows the legend needs at `w` columns (the editor measures the real value). */
function legendRows(project, w) {
  const lines = (project.fields || []).filter((f) => f.label && f.value).length + (project.year ? 1 : 0);
  const perLine = w >= 32 ? 1 : 2;
  return Math.max(8, Math.ceil((lines * perLine * 22 + 16) / (EDIT_WIDTH / ROW_DIV)));
}

/** The first-time arrangement: big image + legend beside it, remaining images in rows of three. */
export function defaultLayout(project) {
  const images = project.images || [];
  const items = [];
  let y = 0;
  const main = images[0];
  const hasLegend = legendHasContent(project);

  if (main) {
    const portrait = aspectOf(main) < 1;
    const w = portrait ? 40 : 64;
    const h = rowsForImage(w, main);
    items.push({ id: main.id, x: 0, y: 0, w, h });
    if (hasLegend) {
      items.push({ id: LEGEND_ID, x: w, y: 0, w: COLS - w, h: legendRows(project, COLS - w) });
    }
    y = h;
  } else if (hasLegend) {
    items.push({ id: LEGEND_ID, x: 0, y: 0, w: 32, h: legendRows(project, 32) });
    y = items[0].h;
  }

  const rest = images.slice(1);
  const w = 32;
  let rowH = 0;
  rest.forEach((img, i) => {
    const col = i % 3;
    if (col === 0 && i > 0) {
      y += rowH;
      rowH = 0;
    }
    const h = rowsForImage(w, img);
    items.push({ id: img.id, x: col * w, y, w, h });
    rowH = Math.max(rowH, h);
  });

  return { v: 1, mode: 'grid', cols: COLS, rowDiv: ROW_DIV, items };
}

/** Scale a layout saved with a different grid resolution (for example the first release's 24 columns). */
function rescale(saved) {
  const fromCols = saved.cols || 24;
  const fromRowDiv = saved.rowDiv || fromCols * 2; // the first release used 2 rows per column
  const fx = COLS / fromCols;
  const fy = ROW_DIV / fromRowDiv;
  if (fx === 1 && fy === 1) return saved.items;
  return saved.items.map((it) => ({ ...it, x: it.x * fx, w: it.w * fx, y: it.y * fy, h: it.h * fy }));
}

/**
 * Make a saved layout consistent with the project's current images and legend:
 * drops items for deleted images, appends new images below everything else,
 * recomputes image heights from their widths (so the aspect ratio can never drift),
 * and clamps everything inside the grid.
 */
export function normalizeLayout(project, saved) {
  const hasSaved = saved && Array.isArray(saved.items);
  const source = hasSaved ? rescale(saved) : defaultLayout(project).items;
  const images = project.images || [];
  const byId = new Map(images.map((i) => [i.id, i]));
  const hasLegend = legendHasContent(project);

  const items = [];
  const seen = new Set();
  for (const it of source) {
    if (seen.has(it.id)) continue;
    if (it.id === LEGEND_ID) {
      if (!hasLegend) continue;
      const w = clamp(Math.round(it.w), MIN_LEGEND_W, COLS);
      items.push({ id: it.id, x: clamp(Math.round(it.x), 0, COLS - w), y: Math.max(0, Math.round(it.y)), w, h: Math.max(4, Math.round(it.h)) });
    } else {
      const img = byId.get(it.id);
      if (!img) continue;
      const w = clamp(Math.round(it.w), MIN_IMAGE_W, COLS);
      items.push({ id: it.id, x: clamp(Math.round(it.x), 0, COLS - w), y: Math.max(0, Math.round(it.y)), w, h: rowsForImage(w, img) });
    }
    seen.add(it.id);
  }

  // Anything new goes to the bottom, three per row.
  const missing = [];
  if (hasLegend && !seen.has(LEGEND_ID)) missing.push({ id: LEGEND_ID });
  images.forEach((img) => {
    if (!seen.has(img.id)) missing.push({ id: img.id, img });
  });
  if (missing.length) {
    let y = items.reduce((m, i) => Math.max(m, i.y + i.h), 0);
    let col = 0;
    let rowH = 0;
    const w = 32;
    missing.forEach((m) => {
      const h = m.id === LEGEND_ID ? legendRows(project, w) : rowsForImage(w, m.img);
      if (col >= 3) {
        y += rowH;
        col = 0;
        rowH = 0;
      }
      items.push({ id: m.id, x: col * w, y, w, h });
      rowH = Math.max(rowH, h);
      col += 1;
    });
  }

  return { v: 1, mode: 'grid', cols: COLS, rowDiv: ROW_DIV, items };
}

/** Reading order for phones, where the layout collapses to one column. */
export function stackOrder(items) {
  return [...items].sort((a, b) => a.y - b.y || a.x - b.x);
}

/** True when two layouts place the same items in the same cells. */
export function sameLayout(a, b) {
  if (!a || !b || a.items.length !== b.items.length) return false;
  const key = (l) =>
    [...l.items]
      .sort((p, q) => (p.id < q.id ? -1 : 1))
      .map((i) => `${i.id}:${i.x},${i.y},${i.w},${i.h}`)
      .join('|');
  return key(a) === key(b);
}

// ---------------------------------------------------------------- alignment helpers

export const SNAP_CELLS = 3; // how close (in cells, about 39 px) an edge must be to snap to a neighbour

/**
 * Where `start` (an item's x or y) lands if its start edge, centre or end edge is within SNAP_CELLS of a
 * neighbour's start, centre or end edge, or if it touches the neighbour. Returns the original value
 * when nothing is close enough.
 */
export function snapPosition(start, size, others, axis) {
  let best = 0;
  let bestDist = SNAP_CELLS + 1;
  const consider = (target, current) => {
    const d = target - current;
    if (Math.abs(d) < Math.abs(bestDist) || (Math.abs(d) === Math.abs(bestDist) && best === 0)) {
      if (Math.abs(d) <= SNAP_CELLS) {
        best = d;
        bestDist = d;
      }
    }
  };
  for (const o of others) {
    const os = axis === 'x' ? o.x : o.y;
    const osz = axis === 'x' ? o.w : o.h;
    consider(os, start); // start edges line up
    consider(os + osz - size, start); // end edges line up
    consider(os + (osz - size) / 2, start); // centres line up
    consider(os + osz, start); // touching: starts where the neighbour ends
    consider(os - size, start); // touching: ends where the neighbour starts
  }
  return bestDist <= SNAP_CELLS ? start + best : start;
}

/** Snap the far edge (x+w or y+h) of a resized item to neighbour edges. Returns the new size. */
export function snapSize(start, size, others, axis) {
  const edge = start + size;
  let best = null;
  for (const o of others) {
    const os = axis === 'x' ? o.x : o.y;
    const oe = os + (axis === 'x' ? o.w : o.h);
    for (const t of [os, oe]) {
      const d = t - edge;
      if (Math.abs(d) <= SNAP_CELLS && (best === null || Math.abs(d) < Math.abs(best))) best = d;
    }
  }
  return best === null ? size : size + best;
}

/** Lines to draw while an item is being moved or resized: wherever its edges/centre match a neighbour's. */
export function alignmentGuides(item, others) {
  const guides = [];
  const seen = new Set();
  const add = (g) => {
    const k = `${g.type}:${g.at}:${g.from}:${g.to}`;
    if (!seen.has(k)) {
      seen.add(k);
      guides.push(g);
    }
  };
  for (const o of others) {
    const xs = [
      [item.x, o.x],
      [item.x + item.w / 2, o.x + o.w / 2],
      [item.x + item.w, o.x + o.w],
      [item.x, o.x + o.w],
      [item.x + item.w, o.x],
    ];
    const ys = [
      [item.y, o.y],
      [item.y + item.h / 2, o.y + o.h / 2],
      [item.y + item.h, o.y + o.h],
      [item.y, o.y + o.h],
      [item.y + item.h, o.y],
    ];
    for (const [a, b] of xs) {
      if (Math.abs(a - b) < 0.01) add({ type: 'v', at: a, from: Math.min(item.y, o.y), to: Math.max(item.y + item.h, o.y + o.h) });
    }
    for (const [a, b] of ys) {
      if (Math.abs(a - b) < 0.01) add({ type: 'h', at: a, from: Math.min(item.x, o.x), to: Math.max(item.x + item.w, o.x + o.w) });
    }
  }
  return guides;
}

const gap = (aStart, aSize, bStart, bSize) => (bStart >= aStart + aSize ? bStart - (aStart + aSize) : aStart - (bStart + bSize));
const overlaps = (aStart, aSize, bStart, bSize) => aStart < bStart + bSize && bStart < aStart + aSize;

/**
 * The neighbour to align with. For left/centre/right alignment it is the nearest item above or below
 * (it shares no rows with this one); for top/middle/bottom the nearest item beside it (shares no columns).
 * Using those neighbours means aligning never pushes an item on top of another.
 */
export function alignNeighbour(item, items, direction) {
  const others = items.filter((o) => o.id !== item.id);
  let pool;
  let measure;
  if (direction === 'horizontal') {
    pool = others.filter((o) => !overlaps(item.y, item.h, o.y, o.h));
    measure = (o) => [gap(item.y, item.h, o.y, o.h), Math.abs(o.x - item.x)];
  } else {
    pool = others.filter((o) => !overlaps(item.x, item.w, o.x, o.w));
    measure = (o) => [gap(item.x, item.w, o.x, o.w), Math.abs(o.y - item.y)];
  }
  pool.sort((a, b) => {
    const [a1, a2] = measure(a);
    const [b1, b2] = measure(b);
    return a1 - b1 || a2 - b2;
  });
  return pool[0] || null;
}

/** New position for `item` after an alignment command against its neighbour `n`. */
export function alignedPosition(item, n, how) {
  switch (how) {
    case 'left':
      return { x: n.x, y: item.y };
    case 'center':
      return { x: Math.round(n.x + (n.w - item.w) / 2), y: item.y };
    case 'right':
      return { x: n.x + n.w - item.w, y: item.y };
    case 'top':
      return { x: item.x, y: n.y };
    case 'middle':
      return { x: item.x, y: Math.round(n.y + (n.h - item.h) / 2) };
    case 'bottom':
      return { x: item.x, y: n.y + n.h - item.h };
    default:
      return { x: item.x, y: item.y };
  }
}

function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, Number.isFinite(n) ? n : lo));
}
