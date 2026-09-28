import React, { useRef, useCallback } from 'react';
import { Schema } from '../../types';
import { Eye, EyeOff, MapPin } from 'lucide-react';

interface DiagramMinimapProps {
  schema: Schema;
  pan: { x: number; y: number };
  zoom: number;
  containerWidth: number;
  containerHeight: number;
  onPanChange: (newPan: { x: number; y: number }) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const DiagramMinimap: React.FC<DiagramMinimapProps> = ({
  schema,
  pan,
  zoom,
  containerWidth,
  containerHeight,
  onPanChange,
  isOpen,
  onToggle,
}) => {
  const minimapRef = useRef<HTMLDivElement>(null);

  // Virtual canvas dimensions in pixels (6000x6000px)
  const VIRTUAL_WIDTH = 3600;
  const VIRTUAL_HEIGHT = 2400;
  const MINIMAP_WIDTH = 190;
  const MINIMAP_HEIGHT = 120;

  const scaleX = MINIMAP_WIDTH / VIRTUAL_WIDTH;
  const scaleY = MINIMAP_HEIGHT / VIRTUAL_HEIGHT;

  // Viewport bounds calculation in minimap scale
  const vpX = Math.max(0, Math.min(MINIMAP_WIDTH, (-pan.x / zoom) * scaleX));
  const vpY = Math.max(0, Math.min(MINIMAP_HEIGHT, (-pan.y / zoom) * scaleY));
  const vpW = Math.max(16, Math.min(MINIMAP_WIDTH, (containerWidth / zoom) * scaleX));
  const vpH = Math.max(12, Math.min(MINIMAP_HEIGHT, (containerHeight / zoom) * scaleY));

  const handleMinimapClick = useCallback(
    (e: React.MouseEvent) => {
      const rect = minimapRef.current?.getBoundingClientRect();
      if (!rect) return;

      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      // Center viewport around clicked point
      const targetCanvasX = clickX / scaleX;
      const targetCanvasY = clickY / scaleY;

      const newPanX = -(targetCanvasX * zoom - containerWidth / 2);
      const newPanY = -(targetCanvasY * zoom - containerHeight / 2);

      onPanChange({ x: newPanX, y: newPanY });
    },
    [scaleX, scaleY, zoom, containerWidth, containerHeight, onPanChange]
  );

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="p-1.5 bg-white/95 backdrop-blur-xs border border-slate-300 rounded-lg shadow-md text-slate-600 hover:text-blue-600 hover:bg-slate-50 transition-colors flex items-center gap-1 text-[11px] font-medium"
        title="Показать мини-карту (Радар)"
      >
        <MapPin className="w-3.5 h-3.5 text-blue-600" />
        <span className="hidden sm:inline">Миникарта</span>
      </button>
    );
  }

  const shapes = schema.shapes || [];

  return (
    <div className="bg-white/95 backdrop-blur-xs border border-slate-300 rounded-xl shadow-lg p-2 flex flex-col gap-1.5 select-none animate-in fade-in zoom-in-95">
      <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold px-1">
        <div className="flex items-center gap-1">
          <MapPin className="w-3 h-3 text-blue-600" />
          <span>Радар схемы</span>
        </div>
        <button
          onClick={onToggle}
          className="hover:text-slate-800 p-0.5"
          title="Скрыть мини-карту"
        >
          <EyeOff className="w-3 h-3" />
        </button>
      </div>

      <div
        ref={minimapRef}
        onClick={handleMinimapClick}
        style={{
          width: `${MINIMAP_WIDTH}px`,
          height: `${MINIMAP_HEIGHT}px`,
        }}
        className="relative bg-slate-100/90 rounded-lg border border-slate-200 overflow-hidden cursor-crosshair shadow-inner"
      >
        {/* Render scaled tables */}
        {schema.tables.map((table) => {
          const x = table.x * scaleX;
          const y = table.y * scaleY;
          const w = Math.max(14, 280 * scaleX);
          const h = Math.max(10, (40 + table.columns.length * 28) * scaleY);

          return (
            <div
              key={table.id}
              style={{
                left: `${x}px`,
                top: `${y}px`,
                width: `${w}px`,
                height: `${h}px`,
                backgroundColor: table.strokeColor || table.color || '#3b82f6',
              }}
              className="absolute rounded-xs opacity-80 pointer-events-none"
              title={table.name}
            />
          );
        })}

        {/* Render scaled shapes */}
        {shapes.map((shape) => {
          const x = shape.x * scaleX;
          const y = shape.y * scaleY;
          const w = Math.max(8, shape.width * scaleX);
          const h = Math.max(6, shape.height * scaleY);

          return (
            <div
              key={shape.id}
              style={{
                left: `${x}px`,
                top: `${y}px`,
                width: `${w}px`,
                height: `${h}px`,
                backgroundColor: shape.strokeColor || '#64748b',
              }}
              className="absolute rounded-xs opacity-60 pointer-events-none"
            />
          );
        })}

        {/* Viewport Box Indicator */}
        <div
          style={{
            left: `${vpX}px`,
            top: `${vpY}px`,
            width: `${vpW}px`,
            height: `${vpH}px`,
          }}
          className="absolute border-2 border-blue-600 bg-blue-500/20 rounded-xs pointer-events-none shadow-xs"
        />
      </div>

      <div className="flex items-center justify-between text-[9px] text-slate-400 px-1 font-mono">
        <span>{schema.tables.length} табл. • {shapes.length} фиг.</span>
        <span>{Math.round(zoom * 100)}%</span>
      </div>
    </div>
  );
};
