import React, { useMemo } from 'react';
import { COLS, LEGEND_ID, normalizeLayout, stackOrder } from '../lib/layout.js';
import Legend from './Legend.jsx';

// Public rendering of a saved layout. A CSS grid with the same 96 columns / row size as the editor.
// Rows are `minmax(row, auto)`, so a text box that wraps onto more lines on a narrow screen simply
// makes its rows taller instead of overflowing. Below 640 px everything stacks in reading order.
export default function ProjectLayout({ project, onOpenImage }) {
  const layout = useMemo(() => normalizeLayout(project, project.layout), [project]);
  const images = project.images || [];
  const byId = useMemo(() => new Map(images.map((img, i) => [img.id, { img, index: i }])), [images]);
  const items = useMemo(() => stackOrder(layout.items), [layout]);

  return (
    <div className="layout-wrap">
      <div className="layout-grid">
        {items.map((it) => {
          const style = { gridColumn: `${it.x + 1} / span ${it.w}`, gridRow: `${it.y + 1} / span ${it.h}` };
          if (it.id === LEGEND_ID) {
            return (
              <div key={it.id} className="layout-item layout-legend" style={style}>
                <Legend project={project} />
              </div>
            );
          }
          const entry = byId.get(it.id);
          if (!entry) return null;
          const { img, index } = entry;
          const src = it.w <= COLS / 3 ? img.thumbUrl || img.url : img.url;
          return (
            <div key={it.id} className="layout-item" style={style}>
              <button type="button" className="zoom" onClick={() => onOpenImage(index)} aria-label={`Open image ${index + 1}`}>
                <img src={src} alt={index === 0 ? project.title : ''} width={img.width} height={img.height} loading={index === 0 ? 'eager' : 'lazy'} decoding="async" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
