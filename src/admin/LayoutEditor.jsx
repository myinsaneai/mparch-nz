import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactGridLayout from 'react-grid-layout';
import { aspectRatio, createScaledStrategy, gridBounds, minMaxSize, noCompactor } from 'react-grid-layout/core';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase.js';
import Legend from '../components/Legend.jsx';
import {
  COLS,
  EDIT_WIDTH,
  ITEM_PAD,
  LEGEND_ID,
  MIN_IMAGE_W,
  MIN_LEGEND_W,
  ROW_DIV,
  alignNeighbour,
  alignedPosition,
  alignmentGuides,
  aspectOf,
  defaultLayout,
  normalizeLayout,
  rowsForImage,
  sameLayout,
  snapPosition,
  snapSize,
} from '../lib/layout.js';

const CELL = EDIT_WIDTH / COLS; // px per column at full size (about 13)
const ROW_H = EDIT_WIDTH / ROW_DIV; // px per row at full size
const EXTRA_ROWS = 28; // empty space below the lowest item so things can be dragged lower

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

// Snaps a moved or resized item to the edges and centres of the items around it.
const neighbourSnap = {
  name: 'neighbourSnap',
  constrainPosition(item, x, y, ctx) {
    const others = ctx.layout.filter((l) => l.i !== item.i);
    return {
      x: clamp(snapPosition(x, item.w, others, 'x'), 0, COLS - item.w),
      y: Math.max(0, snapPosition(y, item.h, others, 'y')),
    };
  },
  constrainSize(item, w, h, handle, ctx) {
    const others = ctx.layout.filter((l) => l.i !== item.i);
    const nw = handle.includes('e') ? snapSize(item.x, w, others, 'x') : w;
    const nh = handle.includes('s') ? snapSize(item.y, h, others, 'y') : h;
    return { w: clamp(nw, item.minW || 1, COLS - item.x), h: Math.max(item.minH || 1, nh) };
  },
};

const ALIGN_BUTTONS = [
  { how: 'left', label: 'Left', axis: 'horizontal', hint: 'Line up the left edge with' },
  { how: 'center', label: 'Centre', axis: 'horizontal', hint: 'Centre horizontally on' },
  { how: 'right', label: 'Right', axis: 'horizontal', hint: 'Line up the right edge with' },
  { how: 'top', label: 'Top', axis: 'vertical', hint: 'Line up the top edge with' },
  { how: 'middle', label: 'Middle', axis: 'vertical', hint: 'Centre vertically on' },
  { how: 'bottom', label: 'Bottom', axis: 'vertical', hint: 'Line up the bottom edge with' },
];

// Visual page editor for one project: drag items, resize them (images keep their proportions),
// and the details text is a resizable box whose text wraps inside it.
export default function LayoutEditor({ project, projectId, onSaved }) {
  const images = project.images || [];
  const imgById = useMemo(() => new Map(images.map((i) => [i.id, i])), [images]);
  const hasLegend = Boolean((project.fields || []).some((f) => f.label && f.value) || project.year);

  const [items, setItems] = useState(() => normalizeLayout(project, project.layout).items);
  const [saved, setSaved] = useState(() => (project.layout ? normalizeLayout(project, project.layout) : null));
  const [legendNeed, setLegendNeed] = useState(4);
  const [selectedId, setSelectedId] = useState(null);
  const [guides, setGuides] = useState([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState({ type: '', text: '' });

  // Keep the layout in step with the project: new images appear at the bottom, deleted ones disappear.
  const membershipKey = images.map((i) => i.id).join(',') + (hasLegend ? '|legend' : '');
  useEffect(() => {
    setItems((prev) => {
      const next = normalizeLayout(project, { ...project.layout, cols: COLS, rowDiv: ROW_DIV, items: prev }).items;
      return sameLayout({ items: prev }, { items: next }) ? prev : next;
    });
    setSelectedId((id) => (id === LEGEND_ID ? (hasLegend ? id : null) : id && imgById.has(id) ? id : null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [membershipKey]);

  // --- fit the 1244 px wide page into the available width (scaled, so wrapping matches the live site)
  const wrapRef = useRef(null);
  const [avail, setAvail] = useState(EDIT_WIDTH);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const update = () => setAvail(el.clientWidth || EDIT_WIDTH);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const scale = Math.min(1, avail / EDIT_WIDTH) || 1;
  // react-grid-layout's own scaled strategy ignores where the (scaled) canvas sits on the page, so the dragged
  // item would jump by that offset. This one measures the position relative to the canvas.
  const canvasRef = useRef(null);
  const positionStrategy = useMemo(() => {
    const base = createScaledStrategy(scale);
    return {
      ...base,
      calcDragPosition(clientX, clientY, offsetX, offsetY) {
        const r = canvasRef.current ? canvasRef.current.getBoundingClientRect() : { left: 0, top: 0 };
        return { left: (clientX - offsetX - r.left) / scale, top: (clientY - offsetY - r.top) / scale };
      },
    };
  }, [scale]);

  // --- the text box must always be tall enough for its text
  const legendRef = useRef(null);
  const legendW = items.find((i) => i.id === LEGEND_ID)?.w;
  useEffect(() => {
    const el = legendRef.current;
    if (!el) return undefined;
    const measure = () => setLegendNeed(Math.max(4, Math.ceil((el.offsetHeight + ITEM_PAD * 2 + 2) / ROW_H)));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [hasLegend, legendW]);

  useEffect(() => {
    setItems((prev) => {
      const l = prev.find((i) => i.id === LEGEND_ID);
      if (!l || l.h >= legendNeed) return prev;
      return prev.map((i) => (i.id === LEGEND_ID ? { ...i, h: legendNeed } : i));
    });
  }, [legendNeed]);

  const rglLayout = useMemo(
    () =>
      items.map((it) => {
        if (it.id === LEGEND_ID) {
          return { i: it.id, x: it.x, y: it.y, w: it.w, h: Math.max(it.h, legendNeed), minW: MIN_LEGEND_W, minH: legendNeed, resizeHandles: ['se', 'e', 's'] };
        }
        const img = imgById.get(it.id);
        return {
          i: it.id,
          x: it.x,
          y: it.y,
          w: it.w,
          h: it.h,
          minW: MIN_IMAGE_W,
          resizeHandles: ['se'],
          constraints: [aspectRatio(aspectOf(img))],
        };
      }),
    [items, imgById, legendNeed]
  );

  const onLayoutChange = useCallback(
    (next) => {
      setItems((prev) => {
        const mapped = next
          .filter((l) => l.i === LEGEND_ID || imgById.has(l.i))
          .map((l) => ({
            id: l.i,
            x: l.x,
            y: l.y,
            w: l.w,
            h: l.i === LEGEND_ID ? Math.max(l.h, legendNeed) : rowsForImage(l.w, imgById.get(l.i)),
          }));
        return sameLayout({ items: prev }, { items: mapped }) ? prev : mapped;
      });
    },
    [imgById, legendNeed]
  );

  // --- alignment guides while dragging / resizing, and selection
  const showGuides = useCallback((layout, oldItem, newItem, placeholder) => {
    const cur = placeholder || newItem;
    if (!cur) return;
    setGuides(alignmentGuides(cur, layout.filter((l) => l.i !== cur.i)));
  }, []);
  const startInteraction = useCallback((layout, oldItem) => {
    if (oldItem) setSelectedId(oldItem.i);
  }, []);
  const lastStop = useRef(0);
  const stopInteraction = useCallback(() => {
    lastStop.current = Date.now();
    setGuides([]);
  }, []);

  // --- align the selected item with its nearest neighbour
  const selected = items.find((i) => i.id === selectedId) || null;
  const neighbours = useMemo(
    () => ({
      horizontal: selected ? alignNeighbour(selected, items, 'horizontal') : null,
      vertical: selected ? alignNeighbour(selected, items, 'vertical') : null,
    }),
    [selected, items]
  );
  const labelOf = (id) => (id === LEGEND_ID ? 'the details text' : `image ${images.findIndex((i) => i.id === id) + 1}`);

  const align = (how, axis) => {
    const nb = neighbours[axis];
    if (!selected || !nb) return;
    const pos = alignedPosition(selected, nb, how);
    setItems((prev) =>
      prev.map((i) => (i.id === selected.id ? { ...i, x: clamp(pos.x, 0, COLS - i.w), y: Math.max(0, pos.y) } : i))
    );
  };

  const dirty = !saved || !sameLayout({ items }, saved);
  const bottom = items.reduce((m, i) => Math.max(m, i.y + i.h), 0);
  const rows = Math.max(80, bottom + EXTRA_ROWS);

  const save = async () => {
    setBusy(true);
    setNote({ type: '', text: '' });
    try {
      const layout = { v: 1, mode: 'grid', cols: COLS, rowDiv: ROW_DIV, items: items.map(({ id, x, y, w, h }) => ({ id, x, y, w, h })) };
      await updateDoc(doc(db, 'projects', projectId), { layout, updatedAt: serverTimestamp() });
      setSaved(layout);
      onSaved(layout);
      setNote({ type: 'ok', text: 'Layout saved. The project page now uses it.' });
    } catch (e) {
      setNote({ type: 'error', text: e.message });
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    if (!window.confirm('Reset to the automatic arrangement? Your current positions will be lost until you save again.')) return;
    setItems(defaultLayout(project).items);
    setSelectedId(null);
    setNote({ type: '', text: '' });
  };

  if (!images.length && !hasLegend) {
    return <p className="muted">Add images or project details first, then arrange them here.</p>;
  }

  // light lines every 2 cells, stronger lines every 8 cells, both directions
  const minor = 'rgba(127, 127, 127, 0.14)';
  const major = 'rgba(127, 127, 127, 0.3)';
  const lines = (c) => `linear-gradient(to right, ${c} 1px, transparent 1px), linear-gradient(to bottom, ${c} 1px, transparent 1px)`;

  return (
    <div>
      <div className="le-bar">
        <span className="muted">
          {saved ? (dirty ? 'Unsaved changes' : 'Saved') : 'Not saved yet: the public page still uses the automatic arrangement'}
        </span>
        <div className="actions">
          <button type="button" className="btn small" onClick={reset} disabled={busy}>
            Reset to automatic
          </button>
          <button type="button" className="btn small primary" onClick={save} disabled={busy || !dirty}>
            {busy ? 'Saving…' : 'Save layout'}
          </button>
        </div>
      </div>
      {note.text && (
        <p className={note.type === 'error' ? 'error' : 'ok'} role={note.type === 'error' ? 'alert' : 'status'}>
          {note.text}
        </p>
      )}
      <p className="muted small-text">
        Drag items to move them. Edges and centres snap to the items around them and pink guide lines show what lines up. Drag the corner of an image to
        resize it (its proportions stay fixed); the details text is a box you can resize from its corner or edges, and its text wraps inside. Click an
        item to select it, then use the align buttons. On phones everything stacks top to bottom in the order shown (by row, then column).
      </p>

      <div className="le-align" role="group" aria-label="Align the selected item">
        <span className="le-sel">{selected ? `Selected: ${selected.id === LEGEND_ID ? 'details text' : `image ${images.findIndex((i) => i.id === selected.id) + 1}`}` : 'Click an item to align it'}</span>
        <span className="le-align-label">Horizontal</span>
        {ALIGN_BUTTONS.filter((b) => b.axis === 'horizontal').map((b) => (
          <button
            key={b.how}
            type="button"
            className="btn small"
            disabled={!neighbours.horizontal}
            title={neighbours.horizontal ? `${b.hint} ${labelOf(neighbours.horizontal.id)}` : 'Needs an item above or below'}
            onClick={() => align(b.how, b.axis)}
          >
            {b.label}
          </button>
        ))}
        <span className="le-align-label">Vertical</span>
        {ALIGN_BUTTONS.filter((b) => b.axis === 'vertical').map((b) => (
          <button
            key={b.how}
            type="button"
            className="btn small"
            disabled={!neighbours.vertical}
            title={neighbours.vertical ? `${b.hint} ${labelOf(neighbours.vertical.id)}` : 'Needs an item beside it'}
            onClick={() => align(b.how, b.axis)}
          >
            {b.label}
          </button>
        ))}
      </div>

      <div className="le-outer" ref={wrapRef} style={{ height: rows * ROW_H * scale }}>
        <div
          className="le-canvas"
          ref={canvasRef}
          onClick={(e) => {
            if (Date.now() - lastStop.current < 400) return;
            if (e.target === e.currentTarget || e.target.classList.contains('react-grid-layout')) setSelectedId(null);
          }}
          style={{
            width: EDIT_WIDTH,
            height: rows * ROW_H,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            backgroundImage: `${lines(minor)}, ${lines(major)}`,
            backgroundSize: `${CELL * 2}px ${ROW_H * 2}px, ${CELL * 2}px ${ROW_H * 2}px, ${CELL * 8}px ${ROW_H * 8}px, ${CELL * 8}px ${ROW_H * 8}px`,
          }}
        >
          <ReactGridLayout
            width={EDIT_WIDTH}
            layout={rglLayout}
            gridConfig={{ cols: COLS, rowHeight: ROW_H, margin: [0, 0], containerPadding: [0, 0] }}
            dragConfig={{ enabled: true, threshold: 3 }}
            resizeConfig={{ enabled: true, handles: ['se'] }}
            compactor={noCompactor}
            constraints={[gridBounds, minMaxSize, neighbourSnap]}
            positionStrategy={positionStrategy}
            onLayoutChange={onLayoutChange}
            onDragStart={startInteraction}
            onDrag={showGuides}
            onDragStop={stopInteraction}
            onResizeStart={startInteraction}
            onResize={showGuides}
            onResizeStop={stopInteraction}
          >
            {items.map((it) => {
              const isSel = it.id === selectedId;
              if (it.id === LEGEND_ID) {
                return (
                  <div key={it.id} className="le-item" onMouseDownCapture={() => setSelectedId(it.id)}>
                    <div className={isSel ? 'le-box le-selected' : 'le-box'} onClick={() => setSelectedId(it.id)}>
                      <div className="le-content le-legend">
                        <span className="le-tag">Details text</span>
                        <div ref={legendRef} className="le-legend-inner">
                          <Legend project={project} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
              const img = imgById.get(it.id);
              if (!img) return <div key={it.id} />;
              return (
                <div key={it.id} className="le-item" onMouseDownCapture={() => setSelectedId(it.id)}>
                  <div className={isSel ? 'le-box le-selected' : 'le-box'} onClick={() => setSelectedId(it.id)}>
                    <div className="le-content">
                      <img src={img.thumbUrl || img.url} alt={img.name || ''} draggable={false} />
                    </div>
                  </div>
                </div>
              );
            })}
          </ReactGridLayout>
          {guides.map((g, i) =>
            g.type === 'v' ? (
              <div key={i} className="le-guide" style={{ left: g.at * CELL, top: g.from * ROW_H, width: 1, height: (g.to - g.from) * ROW_H }} />
            ) : (
              <div key={i} className="le-guide" style={{ top: g.at * ROW_H, left: g.from * CELL, height: 1, width: (g.to - g.from) * CELL }} />
            )
          )}
        </div>
      </div>
    </div>
  );
}
