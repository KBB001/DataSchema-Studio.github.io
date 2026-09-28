import React, { useState, useRef } from 'react';
import { DiagramShape, CanvasSettings } from '../../types';
import { ArrowUp, ArrowRight, ArrowDown, ArrowLeft } from 'lucide-react';

interface DiagramShapeNodeProps {
  shape: DiagramShape;
  isSelected: boolean;
  onSelect: (shapeId: string) => void;
  onStartDrag: (e: React.MouseEvent, shapeId: string) => void;
  onUpdateShape: (shapeId: string, updates: Partial<DiagramShape>) => void;
  onStartConnect?: (shapeId: string, anchor: 'top' | 'right' | 'bottom' | 'left') => void;
  canvasSettings: CanvasSettings;
  zoom?: number;
}

export const DiagramShapeNode: React.FC<DiagramShapeNodeProps> = ({
  shape,
  isSelected,
  onSelect,
  onStartDrag,
  onUpdateShape,
  onStartConnect,
  canvasSettings,
  zoom = 1,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(shape.label || '');
  const [isHovered, setIsHovered] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  React.useEffect(() => {
    if (!isEditing) {
      setEditText(shape.label || '');
    }
  }, [shape.label, isEditing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditText(shape.label || '');
  };

  const handleBlur = () => {
    setIsEditing(false);
    onUpdateShape(shape.id, { label: editText || '' });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleBlur();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditText(shape.label || '');
    }
  };

  const isRounded = shape.isRounded ?? canvasSettings.roundedCorners;
  const hasShadow = shape.hasShadow ?? canvasSettings.dropShadow;
  const isSketch = shape.isSketch ?? canvasSettings.sketchMode;

  const strokeDash =
    shape.strokeStyle === 'dashed' ? '4 4' : shape.strokeStyle === 'dotted' ? '2 2' : undefined;

  // Render SVG or HTML based on shape type
  const renderShapeBody = () => {
    const w = shape.width;
    const h = shape.height;
    const fill = shape.fillColor || '#ffffff';
    const stroke = shape.strokeColor || '#334155';
    const strokeWidth = shape.strokeWidth || 1.5;

    switch (shape.type) {
      case 'circle':
      case 'ellipse':
      case 'erd_attribute': {
        const isMulti = shape.extraData?.isMultiValued;
        const isDerived = shape.extraData?.isDerived;
        return (
          <svg width={w} height={h} className="overflow-visible">
            <ellipse
              cx={w / 2}
              cy={h / 2}
              rx={w / 2 - 2}
              ry={h / 2 - 2}
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeDasharray={isDerived ? '4 3' : strokeDash}
            />
            {isMulti && (
              <ellipse
                cx={w / 2}
                cy={h / 2}
                rx={w / 2 - 6}
                ry={h / 2 - 6}
                fill="none"
                stroke={stroke}
                strokeWidth={strokeWidth}
              />
            )}
          </svg>
        );
      }

      case 'diamond':
      case 'erd_relationship': {
        const pts = `${w / 2},2 ${w - 2},${h / 2} ${w / 2},${h - 2} 2,${h / 2}`;
        return (
          <svg width={w} height={h} className="overflow-visible">
            <polygon
              points={pts}
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDash}
            />
          </svg>
        );
      }

      case 'cylinder': {
        const ry = Math.min(16, h * 0.2);
        return (
          <svg width={w} height={h} className="overflow-visible">
            <ellipse
              cx={w / 2}
              cy={ry + 2}
              rx={w / 2 - 2}
              ry={ry}
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
            />
            <path
              d={`M 2,${ry + 2} v ${h - 2 * ry - 4} a ${w / 2 - 2},${ry} 0 0,0 ${w - 4},0 v -${
                h - 2 * ry - 4
              }`}
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
            />
          </svg>
        );
      }

      case 'cloud': {
        return (
          <svg width={w} height={h} viewBox="0 0 100 60" preserveAspectRatio="none">
            <path
              d="M20,45 a15,15 0 0,1 -5,-25 a20,20 0 0,1 35,-8 a22,22 0 0,1 32,10 a16,16 0 0,1 3,23 z"
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
            />
          </svg>
        );
      }

      case 'document': {
        return (
          <svg width={w} height={h} viewBox="0 0 100 70" preserveAspectRatio="none">
            <path
              d="M4,4 h92 v50 q-23,-10 -46,0 q-23,10 -46,0 z"
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
            />
          </svg>
        );
      }

      case 'actor': {
        return (
          <svg width={w} height={h} viewBox="0 0 60 100" preserveAspectRatio="none">
            <circle cx="30" cy="16" r="10" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
            <line x1="30" y1="26" x2="30" y2="65" stroke={stroke} strokeWidth={strokeWidth} />
            <line x1="5" y1="40" x2="55" y2="40" stroke={stroke} strokeWidth={strokeWidth} />
            <line x1="30" y1="65" x2="10" y2="95" stroke={stroke} strokeWidth={strokeWidth} />
            <line x1="30" y1="65" x2="50" y2="95" stroke={stroke} strokeWidth={strokeWidth} />
          </svg>
        );
      }

      case 'sticky_note': {
        return (
          <div
            className="w-full h-full relative p-2 shadow-sm rounded-xs flex flex-col justify-start"
            style={{
              backgroundColor: fill || '#fef08a',
              border: `1px solid ${stroke || '#ca8a04'}`,
            }}
          >
            {/* Folded corner */}
            <div
              className="absolute top-0 right-0 w-4 h-4"
              style={{
                borderStyle: 'solid',
                borderWidth: '0 16px 16px 0',
                borderColor: `transparent #eab308 transparent transparent`,
              }}
            />
            <div className="font-sans text-xs text-amber-950 font-medium whitespace-pre-wrap leading-tight">
              {shape.label}
            </div>
          </div>
        );
      }

      case 'uml_class': {
        const attrs = shape.extraData?.attributes || ['- id: UUID', '- name: string'];
        const methods = shape.extraData?.methods || ['+ execute(): void'];
        return (
          <div
            className="w-full h-full bg-white flex flex-col font-mono text-[11px] overflow-hidden"
            style={{
              border: `${strokeWidth}px solid ${stroke}`,
              borderRadius: isRounded ? '6px' : '0px',
            }}
          >
            {/* Class Name Header */}
            <div
              className="px-2 py-1.5 text-center font-bold border-b text-slate-900 truncate"
              style={{ backgroundColor: fill, borderColor: stroke }}
            >
              {shape.label}
            </div>
            {/* Attributes compartment */}
            <div className="p-1.5 border-b space-y-0.5 text-slate-700 bg-white" style={{ borderColor: stroke }}>
              {attrs.map((a, i) => (
                <div key={i} className="truncate">
                  {a}
                </div>
              ))}
            </div>
            {/* Methods compartment */}
            <div className="p-1.5 space-y-0.5 text-slate-700 bg-white flex-1">
              {methods.map((m, i) => (
                <div key={i} className="truncate">
                  {m}
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 'uml_interface': {
        const methods = shape.extraData?.methods || ['+ query(): Result'];
        return (
          <div
            className="w-full h-full bg-white flex flex-col font-mono text-[11px] overflow-hidden"
            style={{
              border: `${strokeWidth}px solid ${stroke}`,
              borderRadius: isRounded ? '6px' : '0px',
            }}
          >
            <div
              className="px-2 py-1.5 text-center border-b text-slate-900"
              style={{ backgroundColor: fill, borderColor: stroke }}
            >
              <div className="text-[10px] text-slate-500 font-sans italic">«interface»</div>
              <div className="font-bold truncate">{shape.label}</div>
            </div>
            <div className="p-1.5 space-y-0.5 text-slate-700 bg-white flex-1">
              {methods.map((m, i) => (
                <div key={i} className="truncate">
                  {m}
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 'uml_package': {
        return (
          <div
            className="w-full h-full flex flex-col relative"
            style={{
              border: `${strokeWidth}px solid ${stroke}`,
              backgroundColor: fill,
              borderRadius: isRounded ? '6px' : '0px',
            }}
          >
            <div
              className="absolute -top-5 left-0 px-2 py-0.5 text-[10px] font-mono border-t border-x border-slate-700 bg-white"
              style={{ borderColor: stroke }}
            >
              Пакет
            </div>
            <div className="p-2 font-bold text-xs text-slate-800">{shape.label}</div>
          </div>
        );
      }

      case 'erd_weak_entity': {
        return (
          <div
            className="w-full h-full p-1 flex items-center justify-center"
            style={{
              border: `${strokeWidth}px solid ${stroke}`,
              backgroundColor: fill,
            }}
          >
            <div
              className="w-full h-full flex items-center justify-center p-2 font-semibold text-xs text-center"
              style={{ border: `1px solid ${stroke}` }}
            >
              {shape.label}
            </div>
          </div>
        );
      }

      case 'table_grid': {
        return (
          <div
            className="w-full h-full grid grid-cols-3 grid-rows-3 text-[10px] text-slate-600 bg-white font-sans text-center"
            style={{
              border: `${strokeWidth}px solid ${stroke}`,
              backgroundColor: fill,
            }}
          >
            <div className="border-r border-b p-1 font-bold bg-slate-100 truncate">Колонка 1</div>
            <div className="border-r border-b p-1 font-bold bg-slate-100 truncate">Колонка 2</div>
            <div className="border-b p-1 font-bold bg-slate-100 truncate">Колонка 3</div>
            <div className="border-r border-b p-1">Данные 1</div>
            <div className="border-r border-b p-1">Данные 2</div>
            <div className="border-b p-1">Данные 3</div>
            <div className="border-r p-1">Данные 4</div>
            <div className="border-r p-1">Данные 5</div>
            <div className="p-1">Данные 6</div>
          </div>
        );
      }

      case 'cube_3d': {
        return (
          <svg width={w} height={h} viewBox="0 0 100 100" preserveAspectRatio="none">
            <path
              d="M50,10 L90,32 L50,54 L10,32 Z"
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
            />
            <path
              d="M10,32 L50,54 L50,90 L10,68 Z"
              fill={fill}
              fillOpacity="0.8"
              stroke={stroke}
              strokeWidth={strokeWidth}
            />
            <path
              d="M90,32 L50,54 L50,90 L90,68 Z"
              fill={fill}
              fillOpacity="0.6"
              stroke={stroke}
              strokeWidth={strokeWidth}
            />
          </svg>
        );
      }

      case 'parallelogram': {
        const offset = Math.min(20, w * 0.2);
        const pts = `${offset},2 ${w - 2},2 ${w - offset},${h - 2} 2,${h - 2}`;
        return (
          <svg width={w} height={h} className="overflow-visible">
            <polygon
              points={pts}
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDash}
            />
          </svg>
        );
      }

      case 'hexagon': {
        const offset = Math.min(18, w * 0.18);
        const pts = `${offset},2 ${w - offset},2 ${w - 2},${h / 2} ${w - offset},${h - 2} ${offset},${h - 2} 2,${h / 2}`;
        return (
          <svg width={w} height={h} className="overflow-visible">
            <polygon
              points={pts}
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDash}
            />
          </svg>
        );
      }

      case 'triangle': {
        const pts = `${w / 2},2 ${w - 2},${h - 2} 2,${h - 2}`;
        return (
          <svg width={w} height={h} className="overflow-visible">
            <polygon
              points={pts}
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDash}
            />
          </svg>
        );
      }

      // Default: Rectangle / Rounded / Process
      default: {
        return (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              backgroundColor: shape.type === 'text' || shape.type === 'heading' ? 'transparent' : fill,
              border:
                shape.type === 'text' || shape.type === 'heading'
                  ? 'none'
                  : `${strokeWidth}px ${shape.strokeStyle || 'solid'} ${stroke}`,
              borderRadius: isRounded ? '8px' : '0px',
            }}
          />
        );
      }
    }
  };

  const isSpecialContainer =
    shape.type === 'uml_class' ||
    shape.type === 'uml_interface' ||
    shape.type === 'sticky_note' ||
    shape.type === 'table_grid';

  return (
    <div
      id={`shape-node-${shape.id}`}
      style={{
        transform: `translate(${shape.x}px, ${shape.y}px)`,
        width: `${shape.width}px`,
        height: `${shape.height}px`,
        opacity: shape.opacity ?? 1,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(shape.id);
      }}
      onDoubleClick={handleDoubleClick}
      className={`absolute select-none cursor-grab active:cursor-grabbing group transition-shadow ${
        hasShadow ? 'shadow-md' : ''
      } ${isSketch ? 'rotate-[0.5deg]' : ''} ${
        isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''
      }`}
    >
      {/* Draggable backdrop hitbox */}
      <div
        onMouseDown={(e) => onStartDrag(e, shape.id)}
        className="w-full h-full absolute inset-0 z-0"
      >
        {renderShapeBody()}
      </div>

      {/* Center Label (if not a multi-compartment container) */}
      {!isSpecialContainer && (
        <div
          onMouseDown={(e) => onStartDrag(e, shape.id)}
          className="absolute inset-0 z-1 flex items-center justify-center p-2 text-center pointer-events-auto"
        >
          {isEditing ? (
            <textarea
              ref={inputRef as any}
              value={editText ?? ''}
              onChange={(e) => setEditText(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              autoFocus
              className="w-full h-full bg-white/95 border border-blue-500 rounded p-1 text-xs text-center resize-none shadow-md z-30 focus:outline-none"
              style={{
                fontSize: `${shape.fontSize || 12}px`,
                color: shape.textColor || '#0f172a',
              }}
            />
          ) : (
            <span
              className={`truncate max-w-full leading-tight select-none ${
                shape.type === 'heading' ? 'font-bold underline' : 'font-medium'
              } ${shape.extraData?.isPk ? 'underline' : ''}`}
              style={{
                fontSize: `${shape.fontSize || 12}px`,
                color: shape.textColor || '#0f172a',
              }}
            >
              {shape.label}
            </span>
          )}
        </div>
      )}

      {/* Resize Handle at Bottom-Right */}
      {isSelected && (
        <div
          onMouseDown={(e) => {
            e.stopPropagation();
            const startX = e.clientX;
            const startY = e.clientY;
            const startW = shape.width;
            const startH = shape.height;

            const onMouseMove = (moveE: MouseEvent) => {
              const dx = (moveE.clientX - startX) / (zoom || 1);
              const dy = (moveE.clientY - startY) / (zoom || 1);
              onUpdateShape(shape.id, {
                width: Math.max(50, startW + dx),
                height: Math.max(30, startH + dy),
              });
            };

            const onMouseUp = () => {
              window.removeEventListener('mousemove', onMouseMove);
              window.removeEventListener('mouseup', onMouseUp);
            };

            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
          }}
          className="w-3 h-3 bg-blue-600 rounded-xs border border-white absolute -bottom-1.5 -right-1.5 cursor-nwse-resize z-20 shadow-xs"
        />
      )}

      {/* Connection Anchor Points (Magnetic dots) matching Photo 6 */}
      {(canvasSettings.showConnectionPoints && (isHovered || isSelected)) && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStartConnect?.(shape.id, 'top');
            }}
            className="w-2.5 h-2.5 bg-blue-500 hover:bg-blue-600 rounded-full border border-white absolute -top-1 left-1/2 -translate-x-1/2 z-20 shadow-xs cursor-crosshair"
            title="Точка соединения (Сверху)"
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStartConnect?.(shape.id, 'right');
            }}
            className="w-2.5 h-2.5 bg-blue-500 hover:bg-blue-600 rounded-full border border-white absolute top-1/2 -right-1 -translate-y-1/2 z-20 shadow-xs cursor-crosshair"
            title="Точка соединения (Справа)"
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStartConnect?.(shape.id, 'bottom');
            }}
            className="w-2.5 h-2.5 bg-blue-500 hover:bg-blue-600 rounded-full border border-white absolute -bottom-1 left-1/2 -translate-x-1/2 z-20 shadow-xs cursor-crosshair"
            title="Точка соединения (Снизу)"
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStartConnect?.(shape.id, 'left');
            }}
            className="w-2.5 h-2.5 bg-blue-500 hover:bg-blue-600 rounded-full border border-white absolute top-1/2 -left-1 -translate-y-1/2 z-20 shadow-xs cursor-crosshair"
            title="Точка соединения (Слева)"
          />
        </>
      )}

      {/* Connection Directional Arrows matching Photo 6 */}
      {(canvasSettings.showConnectionArrows && isHovered) && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStartConnect?.(shape.id, 'top');
            }}
            className="p-0.5 bg-blue-600 text-white rounded-full absolute -top-5 left-1/2 -translate-x-1/2 z-20 shadow-md hover:scale-125 transition-transform"
            title="Создать стрелку вверх"
          >
            <ArrowUp className="w-2.5 h-2.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStartConnect?.(shape.id, 'right');
            }}
            className="p-0.5 bg-blue-600 text-white rounded-full absolute top-1/2 -right-5 -translate-y-1/2 z-20 shadow-md hover:scale-125 transition-transform"
            title="Создать стрелку вправо"
          >
            <ArrowRight className="w-2.5 h-2.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStartConnect?.(shape.id, 'bottom');
            }}
            className="p-0.5 bg-blue-600 text-white rounded-full absolute -bottom-5 left-1/2 -translate-x-1/2 z-20 shadow-md hover:scale-125 transition-transform"
            title="Создать стрелку вниз"
          >
            <ArrowDown className="w-2.5 h-2.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStartConnect?.(shape.id, 'left');
            }}
            className="p-0.5 bg-blue-600 text-white rounded-full absolute top-1/2 -left-5 -translate-y-1/2 z-20 shadow-md hover:scale-125 transition-transform"
            title="Создать стрелку влево"
          >
            <ArrowLeft className="w-2.5 h-2.5" />
          </button>
        </>
      )}
    </div>
  );
};
