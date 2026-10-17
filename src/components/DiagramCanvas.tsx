import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid,
  Sparkles,
  Layers,
  Trash2,
  Info,
  Compass,
  ArrowRight,
  FileText,
  Sliders,
  Plus,
  FileCode,
  Download,
  Undo2,
  Redo2,
  MousePointer,
  Hand,
  StickyNote,
  Type,
  Search,
  FileDown,
  X,
  ChevronDown,
  Check,
  RotateCcw,
  CheckCircle2,
  Network,
  Database
} from 'lucide-react';
import { CanvasSettings, DiagramShape, Relationship, Schema, Table, ThemePreset } from '../types';
import { TableCard } from './TableCard';
import { ShapeLibrarySidebar } from './diagram/ShapeLibrarySidebar';
import { DiagramInspector } from './diagram/DiagramInspector';
import { DiagramShapeNode } from './diagram/DiagramShapeNode';
import { EditDataModal } from './diagram/EditDataModal';
import { DiagramMinimap } from './diagram/DiagramMinimap';
import { CatalogItem } from './diagram/shapeCatalog';
import { THEME_PRESETS_PAGE_1 } from './diagram/themePresets';
import {
  exportDiagramAsPng,
  exportDiagramAsSvg,
  exportSchemaAsSqlFile,
  exportSchemaAsJsonFile,
} from '../utils/diagramExport';
import {
  loadCanvasSettingsFromStorage,
  saveCanvasSettingsToStorage,
} from '../utils/diagramStorage';

interface DiagramCanvasProps {
  schema: Schema;
  setSchema: React.Dispatch<React.SetStateAction<Schema>>;
  onEditTable: (table: Table) => void;
  onDeleteTable: (tableId: string) => void;
  onAddColumn: (tableId: string) => void;
  onOpenAddTableModal: () => void;
  onRecordChange: (title: string, description: string, type: any) => void;
  onSelectRelationship: (rel: Relationship) => void;
  onClearCanvas?: () => void;
  onResetToDemo?: () => void;
  isSaving?: boolean;
  lastSavedTime?: string | null;
}

const DEFAULT_SETTINGS: CanvasSettings = {
  showGrid: true,
  gridSize: 10,
  gridColor: '#cbd5e1',
  showPageView: true,
  paperSize: 'A4',
  paperOrientation: 'portrait',
  hasCustomBg: false,
  bgColor: '#ffffff',
  showConnectionArrows: true,
  showConnectionPoints: true,
  snapGuides: true,
  roundedCorners: true,
  sketchMode: false,
  dropShadow: true,
  selectedThemeIndex: 0,
};

type ToolMode = 'select' | 'hand' | 'note' | 'text' | 'table';

interface ActiveConnectingWireProps {
  srcPt: { startX: number; startY: number } | null;
  mousePos: { x: number; y: number };
}

const ActiveConnectingWire: React.FC<ActiveConnectingWireProps> = ({ srcPt, mousePos }) => {
  if (!srcPt) return null;

  const dx = Math.abs(mousePos.x - srcPt.startX);
  const curvature = Math.max(dx * 0.5, 40);
  const isSrcLeft = srcPt.startX < mousePos.x;
  const c1X = isSrcLeft ? srcPt.startX + curvature : srcPt.startX - curvature;
  const c2X = isSrcLeft ? mousePos.x - curvature : mousePos.x + curvature;

  const pathD = `M ${srcPt.startX} ${srcPt.startY} C ${c1X} ${srcPt.startY}, ${c2X} ${mousePos.y}, ${mousePos.x} ${mousePos.y}`;

  return (
    <g>
      <path
        d={pathD}
        fill="none"
        stroke="#8b5cf6"
        strokeWidth="2.5"
        strokeDasharray="6 4"
        markerEnd="url(#rel-arrow)"
        className="animate-pulse"
      />
      <circle
        cx={srcPt.startX}
        cy={srcPt.startY}
        r={5}
        fill="#8b5cf6"
        stroke="#ffffff"
        strokeWidth={2}
      />
      <circle
        cx={mousePos.x}
        cy={mousePos.y}
        r={6}
        fill="#a855f7"
        stroke="#ffffff"
        strokeWidth={2}
      />
    </g>
  );
};

export const DiagramCanvas: React.FC<DiagramCanvasProps> = ({
  schema,
  setSchema,
  onEditTable,
  onDeleteTable,
  onAddColumn,
  onOpenAddTableModal,
  onRecordChange,
  onSelectRelationship,
  onClearCanvas,
  onResetToDemo,
  isSaving,
  lastSavedTime,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Settings & Panels (persisted in browser storage)
  const [canvasSettings, setCanvasSettings] = useState<CanvasSettings>(() => {
    const saved = loadCanvasSettingsFromStorage();
    if (saved) return saved;
    return schema.canvasSettings || DEFAULT_SETTINGS;
  });

  // Auto-save canvas settings changes to browser storage
  useEffect(() => {
    saveCanvasSettingsToStorage(canvasSettings);
  }, [canvasSettings]);

  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isRightInspectorOpen, setIsRightInspectorOpen] = useState(true);
  const [isEditDataModalOpen, setIsEditDataModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isMinimapOpen, setIsMinimapOpen] = useState(true);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [tableSearchQuery, setTableSearchQuery] = useState('');
  const [isTableSearchOpen, setIsTableSearchOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Active Tool Mode (Select, Hand, Sticky note, Text, Table)
  const [toolMode, setToolMode] = useState<ToolMode>('select');
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Undo / Redo History Stack
  const [history, setHistory] = useState<Schema[]>([schema]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const isUndoable = historyIndex > 0;
  const isRedoable = historyIndex < history.length - 1;

  const pushHistory = useCallback((newSchema: Schema) => {
    setHistory((prev) => {
      const trimmed = prev.slice(0, historyIndex + 1);
      if (trimmed.length > 30) trimmed.shift();
      return [...trimmed, newSchema];
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 30));
  }, [historyIndex]);

  const handleUndo = useCallback(() => {
    if (!isUndoable) return;
    const target = history[historyIndex - 1];
    setHistoryIndex((prev) => prev - 1);
    setSchema(target);
    onRecordChange('Отмена действия (Undo)', 'Восстановлено предыдущее состояние схемы', 'table_updated');
  }, [history, historyIndex, isUndoable, setSchema, onRecordChange]);

  const handleRedo = useCallback(() => {
    if (!isRedoable) return;
    const target = history[historyIndex + 1];
    setHistoryIndex((prev) => prev + 1);
    setSchema(target);
    onRecordChange('Повтор действия (Redo)', 'Повторено отмененное действие', 'table_updated');
  }, [history, historyIndex, isRedoable, setSchema, onRecordChange]);

  // Zoom and Pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 260, y: 50 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Selection state
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);

  // Dragging state
  const [draggingEntity, setDraggingEntity] = useState<{
    type: 'table' | 'shape';
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  // Connection linking state
  const [connectingSource, setConnectingSource] = useState<{
    tableId: string;
    columnId: string;
  } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Hovered connector
  const [hoveredRelId, setHoveredRelId] = useState<string | null>(null);

  // Snap guide lines
  const [snapLines, setSnapLines] = useState<{ x?: number; y?: number }>({});

  // Ensure shapes array exists in schema
  const shapes: DiagramShape[] = schema.shapes || [];

  // Currently selected items
  const selectedTable = schema.tables.find((t) => t.id === selectedTableId) || null;
  const selectedShape = shapes.find((s) => s.id === selectedShapeId) || null;

  // Sync canvasSettings with schema changes
  useEffect(() => {
    setSchema((prev) => ({
      ...prev,
      canvasSettings,
    }));
  }, [canvasSettings, setSchema]);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Space for panning
      if (e.code === 'Space' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        setIsSpacePressed(true);
      }

      // Undo: Ctrl+Z / Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }

      // Redo: Ctrl+Y / Cmd+Y or Ctrl+Shift+Z
      if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        handleRedo();
      }

      // Delete or Backspace
      if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)
      ) {
        if (selectedTableId || selectedShapeId) {
          e.preventDefault();
          handleDeleteSelected();
        }
      }

      // Escape cancels connection
      if (e.key === 'Escape') {
        if (connectingSource) {
          setConnectingSource(null);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleUndo, handleRedo, selectedTableId, selectedShapeId, connectingSource]);

  // Handle Dragging of a Table
  const handleStartDragTable = (e: React.MouseEvent, tableId: string) => {
    e.stopPropagation();
    if (toolMode === 'hand' || isSpacePressed) return;
    setSelectedTableId(tableId);
    setSelectedShapeId(null);
    const table = schema.tables.find((t) => t.id === tableId);
    if (!table) return;

    setDraggingEntity({
      type: 'table',
      id: tableId,
      offsetX: e.clientX / zoom - table.x,
      offsetY: e.clientY / zoom - table.y,
    });
  };

  // Handle Dragging of a Custom Shape
  const handleStartDragShape = (e: React.MouseEvent, shapeId: string) => {
    e.stopPropagation();
    if (toolMode === 'hand' || isSpacePressed) return;
    setSelectedShapeId(shapeId);
    setSelectedTableId(null);
    const shape = shapes.find((s) => s.id === shapeId);
    if (!shape) return;

    setDraggingEntity({
      type: 'shape',
      id: shapeId,
      offsetX: e.clientX / zoom - shape.x,
      offsetY: e.clientY / zoom - shape.y,
    });
  };

  // Duplicate Table
  const handleDuplicateTable = (table: Table) => {
    const newId = `tbl_${Date.now()}`;
    const duplicatedTable: Table = {
      ...table,
      id: newId,
      name: `${table.name}_copy`,
      x: table.x + 40,
      y: table.y + 40,
      columns: table.columns.map((c) => ({
        ...c,
        id: `col_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      })),
    };

    const updated: Schema = {
      ...schema,
      tables: [...schema.tables, duplicatedTable],
    };

    setSchema(updated);
    pushHistory(updated);
    setSelectedTableId(newId);
    onRecordChange('Дублирована таблица', `Создана копия "${table.name}"`, 'table_created');
  };

  // Add Shape to Canvas (from library click or drop)
  const handleAddShape = (item: CatalogItem, dropPos?: { x: number; y: number }) => {
    const nextX = dropPos ? dropPos.x : Math.round((-pan.x + 380 + Math.random() * 80) / 10) * 10;
    const nextY = dropPos ? dropPos.y : Math.round((-pan.y + 180 + Math.random() * 80) / 10) * 10;

    const newShape: DiagramShape = {
      id: `shape_${item.type}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      type: item.type,
      label: item.defaultLabel,
      x: Math.max(20, nextX),
      y: Math.max(20, nextY),
      width: item.defaultWidth,
      height: item.defaultHeight,
      fillColor: item.fillColor || (canvasSettings.bgColor === '#0f172a' ? '#1e293b' : '#ffffff'),
      strokeColor: item.strokeColor || '#334155',
      strokeWidth: 1.5,
      strokeStyle: 'solid',
      textColor: canvasSettings.bgColor === '#0f172a' ? '#f8fafc' : '#0f172a',
      fontSize: 12,
      isRounded: item.isRounded ?? canvasSettings.roundedCorners,
      hasShadow: canvasSettings.dropShadow,
      isSketch: canvasSettings.sketchMode,
      extraData: item.extraData,
    };

    const updated = {
      ...schema,
      shapes: [...shapes, newShape],
    };

    setSchema(updated);
    pushHistory(updated);
    setSelectedShapeId(newShape.id);
    setSelectedTableId(null);

    onRecordChange(
      'Добавлена фигура на диаграмму',
      `Добавлен элемент "${item.name}"`,
      'table_created'
    );
  };

  // Drag-and-Drop from Shape Library onto Canvas
  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    try {
      const data = e.dataTransfer.getData('application/json');
      if (!data) return;
      const item: CatalogItem = JSON.parse(data);

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const dropCanvasX = (e.clientX - rect.left - pan.x) / zoom;
      const dropCanvasY = (e.clientY - rect.top - pan.y) / zoom;

      const snappedX = Math.round(dropCanvasX / canvasSettings.gridSize) * canvasSettings.gridSize;
      const snappedY = Math.round(dropCanvasY / canvasSettings.gridSize) * canvasSettings.gridSize;

      handleAddShape(item, { x: snappedX, y: snappedY });
    } catch (err) {
      console.error('Failed to parse dropped shape:', err);
    }
  };

  // Canvas Mouse Move (Panning, Dragging entity, Smart Guides)
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const canvasX = (e.clientX - rect.left - pan.x) / zoom;
      const canvasY = (e.clientY - rect.top - pan.y) / zoom;
      setMousePos({ x: canvasX, y: canvasY });

      // Handle Pan
      if (isPanning) {
        setPan({
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y,
        });
        return;
      }

      // Handle Entity Drag
      if (draggingEntity) {
        const rawX = e.clientX / zoom - draggingEntity.offsetX;
        const rawY = e.clientY / zoom - draggingEntity.offsetY;

        let newX = Math.round(rawX / canvasSettings.gridSize) * canvasSettings.gridSize;
        let newY = Math.round(rawY / canvasSettings.gridSize) * canvasSettings.gridSize;

        // Smart snap guides calculation
        if (canvasSettings.snapGuides) {
          const snapDistance = 8;
          let snapX: number | undefined;
          let snapY: number | undefined;

          // Check alignment with other tables
          schema.tables.forEach((t) => {
            if (draggingEntity.type === 'table' && t.id === draggingEntity.id) return;
            if (Math.abs(t.x - newX) < snapDistance) {
              newX = t.x;
              snapX = t.x;
            }
            if (Math.abs(t.y - newY) < snapDistance) {
              newY = t.y;
              snapY = t.y;
            }
          });

          // Check alignment with other shapes
          shapes.forEach((s) => {
            if (draggingEntity.type === 'shape' && s.id === draggingEntity.id) return;
            if (Math.abs(s.x - newX) < snapDistance) {
              newX = s.x;
              snapX = s.x;
            }
            if (Math.abs(s.y - newY) < snapDistance) {
              newY = s.y;
              snapY = s.y;
            }
          });

          setSnapLines({ x: snapX, y: snapY });
        }

        if (draggingEntity.type === 'table') {
          setSchema((prev) => ({
            ...prev,
            tables: prev.tables.map((t) =>
              t.id === draggingEntity.id ? { ...t, x: Math.max(10, newX), y: Math.max(10, newY) } : t
            ),
          }));
        } else if (draggingEntity.type === 'shape') {
          setSchema((prev) => ({
            ...prev,
            shapes: (prev.shapes || []).map((s) =>
              s.id === draggingEntity.id ? { ...s, x: Math.max(10, newX), y: Math.max(10, newY) } : s
            ),
          }));
        }
      }
    },
    [
      isPanning,
      panStart,
      draggingEntity,
      zoom,
      pan,
      setSchema,
      canvasSettings.gridSize,
      canvasSettings.snapGuides,
      schema.tables,
      shapes,
    ]
  );

  const handleMouseUp = () => {
    if (draggingEntity) {
      setDraggingEntity(null);
      setSnapLines({});
      pushHistory(schema);
    }
    if (isPanning) {
      setIsPanning(false);
    }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // If in note or text tool mode, place shape directly on click
    if (toolMode === 'note') {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const dropCanvasX = (e.clientX - rect.left - pan.x) / zoom;
        const dropCanvasY = (e.clientY - rect.top - pan.y) / zoom;
        const noteItem = {
          id: 'misc_sticky',
          name: 'Стикер',
          category: 'misc' as const,
          type: 'sticky_note' as const,
          defaultWidth: 140,
          defaultHeight: 120,
          defaultLabel: 'Новая заметка...',
          fillColor: '#fef08a',
          strokeColor: '#ca8a04',
          iconSvg: '',
        };
        handleAddShape(noteItem, { x: Math.round(dropCanvasX), y: Math.round(dropCanvasY) });
        setToolMode('select');
      }
      return;
    }

    if (toolMode === 'text') {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const dropCanvasX = (e.clientX - rect.left - pan.x) / zoom;
        const dropCanvasY = (e.clientY - rect.top - pan.y) / zoom;
        const textItem = {
          id: 'gen_text',
          name: 'Текст',
          category: 'general' as const,
          type: 'text' as const,
          defaultWidth: 120,
          defaultHeight: 36,
          defaultLabel: 'Текстовый блок',
          fillColor: 'transparent',
          strokeColor: 'transparent',
          iconSvg: '',
        };
        handleAddShape(textItem, { x: Math.round(dropCanvasX), y: Math.round(dropCanvasY) });
        setToolMode('select');
      }
      return;
    }

    if (toolMode === 'table') {
      onOpenAddTableModal();
      setToolMode('select');
      return;
    }

    // Left click on empty canvas starts panning or deselects
    if (
      (e.button === 0 && (e.target === containerRef.current || (e.target as HTMLElement).id === 'canvas-grid-stage')) ||
      toolMode === 'hand' ||
      isSpacePressed
    ) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      setSelectedTableId(null);
      setSelectedShapeId(null);
      if (connectingSource) {
        setConnectingSource(null);
      }
    }
  };

  // Zoom Controls
  const handleZoom = (delta: number) => {
    setZoom((prev) => Math.min(2.5, Math.max(0.2, Number((prev + delta).toFixed(2)))));
  };

  // Zoom to Fit (Fit All Objects on Screen)
  const handleFitToScreen = () => {
    const allTables = schema.tables;
    if (allTables.length === 0 && shapes.length === 0) {
      setZoom(1);
      setPan({ x: 260, y: 50 });
      return;
    }

    const rect = containerRef.current?.getBoundingClientRect();
    const containerW = rect?.width || 1200;
    const containerH = rect?.height || 800;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    allTables.forEach((t) => {
      minX = Math.min(minX, t.x);
      minY = Math.min(minY, t.y);
      maxX = Math.max(maxX, t.x + 280);
      maxY = Math.max(maxY, t.y + 200 + t.columns.length * 30);
    });

    shapes.forEach((s) => {
      minX = Math.min(minX, s.x);
      minY = Math.min(minY, s.y);
      maxX = Math.max(maxX, s.x + s.width);
      maxY = Math.max(maxY, s.y + s.height);
    });

    const contentW = maxX - minX + 120;
    const contentH = maxY - minY + 120;

    const scaleX = (containerW - 80) / contentW;
    const scaleY = (containerH - 80) / contentH;
    const optimalZoom = Math.min(1.4, Math.max(0.35, Math.min(scaleX, scaleY)));

    const centerX = minX + contentW / 2;
    const centerY = minY + contentH / 2;

    const newPanX = containerW / 2 - centerX * optimalZoom;
    const newPanY = containerH / 2 - centerY * optimalZoom;

    setZoom(Number(optimalZoom.toFixed(2)));
    setPan({ x: Math.round(newPanX), y: Math.round(newPanY) });
  };

  // Interactive Wheel Zoom & Two-Finger Pan
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) {
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const canvasX = (mouseX - pan.x) / zoom;
      const canvasY = (mouseY - pan.y) / zoom;

      const zoomDelta = e.deltaY < 0 ? 0.08 : -0.08;
      const newZoom = Math.min(2.5, Math.max(0.2, Number((zoom + zoomDelta).toFixed(2))));

      const newPanX = mouseX - canvasX * newZoom;
      const newPanY = mouseY - canvasY * newZoom;

      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
    } else {
      setPan((prev) => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }));
    }
  };

  // Topological / Hierarchical Auto-layout based on Foreign Keys
  const handleHierarchicalLayout = () => {
    const tables = [...schema.tables];
    if (tables.length === 0) return;

    // Calculate in-degree (how many tables reference this table) and out-degree (how many tables this table references)
    const inDegree: Record<string, number> = {};
    const outDegree: Record<string, number> = {};
    tables.forEach((t) => {
      inDegree[t.id] = 0;
      outDegree[t.id] = 0;
    });

    schema.relationships.forEach((rel) => {
      if (inDegree[rel.targetTableId] !== undefined) inDegree[rel.targetTableId]++;
      if (outDegree[rel.sourceTableId] !== undefined) outDegree[rel.sourceTableId]++;
    });

    // Tier 0: Root tables (referenced by others, but don't reference or reference few)
    // Tier 1: Intermediate tables
    // Tier 2: Leaf junction tables
    const tiers: Table[][] = [[], [], []];

    tables.forEach((t) => {
      const outgoing = outDegree[t.id] || 0;
      const incoming = inDegree[t.id] || 0;
      if (outgoing === 0) {
        tiers[0].push(t);
      } else if (incoming === 0) {
        tiers[2].push(t);
      } else {
        tiers[1].push(t);
      }
    });

    // If tiers are uneven, balance them
    if (tiers[0].length === 0 && tables.length > 0) {
      tiers[0] = tables.slice(0, Math.ceil(tables.length / 3));
      tiers[1] = tables.slice(Math.ceil(tables.length / 3), Math.ceil((tables.length * 2) / 3));
      tiers[2] = tables.slice(Math.ceil((tables.length * 2) / 3));
    }

    const startX = 80;
    const colSpacing = 380;
    const rowSpacing = 320;

    tiers.forEach((colTables, colIndex) => {
      colTables.forEach((t, rowIndex) => {
        t.x = startX + colIndex * colSpacing;
        t.y = 80 + rowIndex * rowSpacing;
      });
    });

    const updated = {
      ...schema,
      tables,
    };

    setSchema(updated);
    pushHistory(updated);
    handleFitToScreen();

    onRecordChange(
      'Иерархическое выравнивание',
      'Таблицы упорядочены по цепочке внешних ключей (DAG)',
      'table_updated'
    );
  };

  // Compact Grid Auto-layout
  const handleGridLayout = () => {
    const arrangedTables = schema.tables.map((t) => ({ ...t }));
    const startX = 60;
    const startY = 80;
    const colWidth = 340;
    const rowHeight = 360;
    const maxCols = Math.max(2, Math.min(4, Math.ceil(Math.sqrt(arrangedTables.length))));

    arrangedTables.forEach((table, index) => {
      const col = index % maxCols;
      const row = Math.floor(index / maxCols);
      table.x = startX + col * colWidth;
      table.y = startY + row * rowHeight;
    });

    const updated = {
      ...schema,
      tables: arrangedTables,
    };

    setSchema(updated);
    pushHistory(updated);
    handleFitToScreen();

    onRecordChange(
      'Выравнивание по сетке',
      'Таблицы упорядочены по компактной матрице',
      'table_updated'
    );
  };

  // Interactive connector handler: start or complete relation
  const handleStartConnect = (tableId: string, columnId: string) => {
    if (!connectingSource) {
      setConnectingSource({ tableId, columnId });
      return;
    }

    if (connectingSource.tableId === tableId && connectingSource.columnId === columnId) {
      setConnectingSource(null);
      return;
    }

    const srcTable = schema.tables.find((t) => t.id === connectingSource.tableId);
    const tgtTable = schema.tables.find((t) => t.id === tableId);
    const srcCol = srcTable?.columns.find((c) => c.id === connectingSource.columnId);
    const tgtCol = tgtTable?.columns.find((c) => c.id === columnId);

    if (srcTable && tgtTable && srcCol && tgtCol) {
      const newRel: Relationship = {
        id: `rel_${srcTable.name}_${tgtTable.name}_${Date.now()}`,
        sourceTableId: srcTable.id,
        sourceColumnId: srcCol.id,
        targetTableId: tgtTable.id,
        targetColumnId: tgtCol.id,
        type: '1:N',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        name: `fk_${srcTable.name}_${srcCol.name}`,
      };

      const updatedTables = schema.tables.map((t) => {
        if (t.id === srcTable.id) {
          return {
            ...t,
            columns: t.columns.map((c) => (c.id === srcCol.id ? { ...c, isFk: true } : c)),
          };
        }
        return t;
      });

      const updated = {
        ...schema,
        tables: updatedTables,
        relationships: [...schema.relationships, newRel],
      };

      setSchema(updated);
      pushHistory(updated);

      onRecordChange(
        'Создана связь',
        `Связь: ${srcTable.name}.${srcCol.name} → ${tgtTable.name}.${tgtCol.name} (1:N)`,
        'relation_created'
      );
    }

    setConnectingSource(null);
  };

  // Quick-cycle cardinality directly on canvas
  const handleCycleCardinality = (e: React.MouseEvent, rel: Relationship) => {
    e.stopPropagation();
    const cycleMap: Record<string, Relationship['type']> = {
      '1:1': '1:N',
      '1:N': 'N:M',
      'N:M': '1:1',
    };
    const nextType = cycleMap[rel.type] || '1:N';
    const updated = {
      ...schema,
      relationships: schema.relationships.map((r) =>
        r.id === rel.id ? { ...r, type: nextType } : r
      ),
    };
    setSchema(updated);
    pushHistory(updated);
    onRecordChange('Изменена кардинальность', `Связь ${rel.name || rel.id} изменена на ${nextType}`, 'relation_created');
  };

  // Delete Relationship
  const handleDeleteRelationship = (relId: string) => {
    const updated = {
      ...schema,
      relationships: schema.relationships.filter((r) => r.id !== relId),
    };
    setSchema(updated);
    pushHistory(updated);
    onRecordChange('Удалена связь', 'Связь между таблицами удалена', 'relation_deleted');
  };

  // Delete selected entity (Table or Shape)
  const handleDeleteSelected = () => {
    if (selectedTableId) {
      onDeleteTable(selectedTableId);
      setSelectedTableId(null);
    } else if (selectedShapeId) {
      const updated = {
        ...schema,
        shapes: shapes.filter((s) => s.id !== selectedShapeId),
      };
      setSchema(updated);
      pushHistory(updated);
      setSelectedShapeId(null);
      onRecordChange('Удалена фигура', 'Элемент удален с холста', 'table_deleted');
    }
  };

  // Duplicate Selected Entity
  const handleDuplicateSelected = () => {
    if (selectedTable) {
      handleDuplicateTable(selectedTable);
    } else if (selectedShape) {
      const newShape: DiagramShape = {
        ...selectedShape,
        id: `shape_${selectedShape.type}_${Date.now()}`,
        x: selectedShape.x + 30,
        y: selectedShape.y + 30,
      };
      const updated = {
        ...schema,
        shapes: [...shapes, newShape],
      };
      setSchema(updated);
      pushHistory(updated);
      setSelectedShapeId(newShape.id);
      onRecordChange('Дублирована фигура', 'Создан дубликат элемента', 'table_created');
    }
  };

  // Update Shape
  const handleUpdateShape = (shapeId: string, updates: Partial<DiagramShape>) => {
    setSchema((prev) => ({
      ...prev,
      shapes: (prev.shapes || []).map((s) => (s.id === shapeId ? { ...s, ...updates } : s)),
    }));
  };

  // Update Table Style
  const handleUpdateTableStyle = (tableId: string, updates: Partial<Table>) => {
    setSchema((prev) => ({
      ...prev,
      tables: prev.tables.map((t) => (t.id === tableId ? { ...t, ...updates } : t)),
    }));
  };

  // Apply Theme Preset
  const handleApplyThemePreset = (preset: ThemePreset) => {
    let updated: Schema;
    if (selectedShape) {
      updated = {
        ...schema,
        shapes: (schema.shapes || []).map((s) =>
          s.id === selectedShape.id
            ? {
                ...s,
                fillColor: preset.fill,
                strokeColor: preset.stroke,
                textColor: preset.text,
              }
            : s
        ),
      };
    } else if (selectedTable) {
      updated = {
        ...schema,
        tables: schema.tables.map((t) =>
          t.id === selectedTable.id
            ? {
                ...t,
                fillColor: preset.fill,
                strokeColor: preset.stroke,
                textColor: preset.text,
                color: preset.stroke,
              }
            : t
        ),
      };
    } else {
      updated = {
        ...schema,
        tables: schema.tables.map((t) => ({
          ...t,
          fillColor: preset.fill,
          strokeColor: preset.stroke,
          textColor: preset.text,
          color: preset.stroke,
        })),
        shapes: (schema.shapes || []).map((s) => ({
          ...s,
          fillColor: preset.fill,
          strokeColor: preset.stroke,
          textColor: preset.text,
        })),
        relationships: schema.relationships.map((r) => ({
          ...r,
          color: preset.connector,
        })),
      };
    }

    setSchema(updated);
    pushHistory(updated);

    onRecordChange(
      'Применен стиль оформления',
      `Применена цветовая тема "${preset.name}"`,
      'table_updated'
    );
  };

  const handleResetDefaultStyle = () => {
    setCanvasSettings(DEFAULT_SETTINGS);
    const classic = THEME_PRESETS_PAGE_1[0];
    handleApplyThemePreset(classic);
  };

  // Jump to table by search
  const handleJumpToTable = (table: Table) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const targetX = -(table.x * zoom - rect.width / 2 + 140 * zoom);
    const targetY = -(table.y * zoom - rect.height / 2 + 100 * zoom);

    setPan({ x: targetX, y: targetY });
    setSelectedTableId(table.id);
    setSelectedShapeId(null);
    setIsTableSearchOpen(false);
    setTableSearchQuery('');
  };

  // Calculate coordinates for relationship lines
  const getRelationPoints = (rel: Relationship) => {
    const srcTable = schema.tables.find((t) => t.id === rel.sourceTableId);
    const tgtTable = schema.tables.find((t) => t.id === rel.targetTableId);
    if (!srcTable || !tgtTable) return null;

    const srcColIndex = srcTable.columns.findIndex((c) => c.id === rel.sourceColumnId);
    const tgtColIndex = tgtTable.columns.findIndex((c) => c.id === rel.targetColumnId);

    const cardWidth = 280;
    const headerHeight = 40;
    const rowHeight = 30;

    const srcY = srcTable.y + headerHeight + (srcColIndex >= 0 ? srcColIndex * rowHeight + 15 : 20);
    const tgtY = tgtTable.y + headerHeight + (tgtColIndex >= 0 ? tgtColIndex * rowHeight + 15 : 20);

    const isSrcLeftOfTgt = srcTable.x + cardWidth / 2 < tgtTable.x + cardWidth / 2;

    const startX = isSrcLeftOfTgt ? srcTable.x + cardWidth : srcTable.x;
    const endX = isSrcLeftOfTgt ? tgtTable.x : tgtTable.x + cardWidth;

    return {
      startX,
      startY: srcY,
      endX,
      endY: tgtY,
      isSrcLeftOfTgt,
    };
  };

  // Calculate start coordinates for the active connecting link (adapts left or right)
  const getActiveConnectingSourcePoint = () => {
    if (!connectingSource) return null;
    const srcTable = schema.tables.find((t) => t.id === connectingSource.tableId);
    if (!srcTable) return null;
    const srcColIndex = srcTable.columns.findIndex((c) => c.id === connectingSource.columnId);

    const isMouseToRight = mousePos.x >= srcTable.x + 140;
    const startX = isMouseToRight ? srcTable.x + 280 : srcTable.x;
    const startY = srcTable.y + 40 + (srcColIndex >= 0 ? srcColIndex * 30 + 15 : 20);
    return { startX, startY };
  };

  const canvasBg = canvasSettings.hasCustomBg ? canvasSettings.bgColor : '#f8fafc';

  return (
    <div className="relative w-full h-[calc(100vh-3.5rem)] overflow-hidden flex select-none font-sans">
      {/* 1. Left Accordion Sidebar for Shapes (draw.io style) */}
      <ShapeLibrarySidebar
        isOpen={isLeftSidebarOpen}
        onToggle={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
        onAddShape={handleAddShape}
        onOpenAddTableModal={onOpenAddTableModal}
      />

      {/* 2. Center Diagram Canvas */}
      <div
        id="diagram-canvas-container"
        ref={containerRef}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onDragOver={handleCanvasDragOver}
        onDrop={handleCanvasDrop}
        style={{
          backgroundColor: canvasBg,
        }}
        className={`flex-1 relative h-full overflow-hidden ${
          isPanning || isSpacePressed || toolMode === 'hand'
            ? 'cursor-grabbing'
            : toolMode === 'note' || toolMode === 'text' || toolMode === 'table'
            ? 'cursor-crosshair'
            : 'cursor-default'
        }`}
      >
        {/* Top Floating Studio Toolbar */}
        <div className="absolute top-3 left-3 right-3 sm:right-auto z-30 flex flex-wrap items-center gap-1.5 bg-white/95 backdrop-blur-xs p-1.5 rounded-xl shadow-md border border-slate-300">
          {/* Tool Modes (Select, Hand, Note, Text, Table) */}
          <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setToolMode('select')}
              className={`p-1.5 rounded-md transition-colors ${
                toolMode === 'select'
                  ? 'bg-white text-blue-600 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Инструмент выбора (V)"
            >
              <MousePointer className="w-4 h-4" />
            </button>
            <button
              onClick={() => setToolMode('hand')}
              className={`p-1.5 rounded-md transition-colors ${
                toolMode === 'hand'
                  ? 'bg-white text-blue-600 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Инструмент руки / панорамирования (H / Пробел)"
            >
              <Hand className="w-4 h-4" />
            </button>
            <button
              onClick={() => setToolMode('note')}
              className={`p-1.5 rounded-md transition-colors ${
                toolMode === 'note'
                  ? 'bg-white text-amber-600 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Добавить стикер на холст (N)"
            >
              <StickyNote className="w-4 h-4" />
            </button>
            <button
              onClick={() => setToolMode('text')}
              className={`p-1.5 rounded-md transition-colors ${
                toolMode === 'text'
                  ? 'bg-white text-blue-600 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Добавить текстовый блок (T)"
            >
              <Type className="w-4 h-4" />
            </button>
          </div>

          <div className="w-px h-5 bg-slate-300 mx-0.5" />

          {/* Undo / Redo */}
          <button
            onClick={handleUndo}
            disabled={!isUndoable}
            className="p-1.5 hover:bg-slate-100 text-slate-700 disabled:opacity-30 rounded-lg transition-colors cursor-pointer"
            title="Отменить действие (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={!isRedoable}
            className="p-1.5 hover:bg-slate-100 text-slate-700 disabled:opacity-30 rounded-lg transition-colors cursor-pointer"
            title="Повторить действие (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-slate-300 mx-0.5" />

          {/* Zoom Controls */}
          <button
            onClick={() => handleZoom(0.1)}
            className="p-1.5 hover:bg-slate-100 text-slate-700 rounded-lg transition-colors cursor-pointer"
            title="Приблизить (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono text-slate-700 px-1 font-semibold min-w-10 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => handleZoom(-0.1)}
            className="p-1.5 hover:bg-slate-100 text-slate-700 rounded-lg transition-colors cursor-pointer"
            title="Отдалить (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleFitToScreen}
            className="p-1.5 hover:bg-slate-100 text-slate-700 rounded-lg transition-colors cursor-pointer"
            title="По размеру экрана (Все объекты)"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-slate-300 mx-0.5" />

          {/* Smart Auto-Layout Dropdown (DAG vs Grid) */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleHierarchicalLayout}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer border border-blue-200"
              title="Иерархическое выравнивание по цепочке Foreign Keys"
            >
              <Network className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden md:inline">Связи (DAG)</span>
            </button>
            <button
              onClick={handleGridLayout}
              className="flex items-center gap-1.5 px-2 py-1.5 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer border border-slate-200"
              title="Выровнять компактной сеткой"
            >
              <Grid className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden md:inline">Сетка</span>
            </button>
          </div>

          {/* Delete Selected (Visible when table or shape selected) */}
          {(selectedTableId || selectedShapeId) && (
            <button
              onClick={handleDeleteSelected}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer border border-rose-200 shadow-2xs animate-in fade-in"
              title="Удалить выбранную таблицу или фигуру (Delete/Backspace)"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Удалить</span>
            </button>
          )}

          {/* Clear Canvas Action */}
          <button
            onClick={() => setIsClearModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 hover:bg-slate-100 text-slate-600 hover:text-rose-600 text-xs font-medium rounded-lg transition-colors cursor-pointer"
            title="Очистить холст (удалить все таблицы и фигуры)"
          >
            <Trash2 className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden xl:inline">Очистить холст</span>
          </button>

          <div className="w-px h-5 bg-slate-300 mx-0.5" />

          {/* Quick Find Table Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsTableSearchOpen(!isTableSearchOpen)}
              className="p-1.5 hover:bg-slate-100 text-slate-700 rounded-lg transition-colors flex items-center gap-1 text-xs cursor-pointer"
              title="Поиск и быстрый переход к таблице"
            >
              <Search className="w-4 h-4 text-slate-500" />
              <span className="hidden lg:inline text-slate-600">Найти таблицу</span>
            </button>

            {isTableSearchOpen && (
              <div className="absolute top-full mt-1.5 left-0 w-64 bg-white rounded-xl shadow-xl border border-slate-300 p-2 z-50 flex flex-col gap-1.5">
                <input
                  type="text"
                  value={tableSearchQuery || ''}
                  onChange={(e) => setTableSearchQuery(e.target.value)}
                  placeholder="Имя таблицы..."
                  autoFocus
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:border-blue-500"
                />
                <div className="max-h-48 overflow-y-auto space-y-0.5">
                  {schema.tables
                    .filter((t) => t.name.toLowerCase().includes(tableSearchQuery.toLowerCase()))
                    .map((t) => (
                      <button
                        key={t.id}
                        onClick={() => handleJumpToTable(t)}
                        className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-blue-50 hover:text-blue-700 flex items-center justify-between transition-colors"
                      >
                        <span className="font-semibold">{t.name}</span>
                        <span className="text-[10px] text-slate-400">({t.columns.length} кол.)</span>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

          <div className="w-px h-5 bg-slate-300 mx-0.5" />

          {/* Database info badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs">
            <Database className="w-3.5 h-3.5 text-blue-600" />
            <span className="font-bold text-slate-800 font-mono">{schema.name}</span>
            <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 text-[10px] font-bold rounded">
              {schema.dialect}
            </span>
            {schema.triggers && schema.triggers.length > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[10px] font-semibold rounded" title={`${schema.triggers.length} триггеров`}>
                ⚡ {schema.triggers.length} триггера
              </span>
            )}
            {schema.routines && schema.routines.length > 0 && (
              <span className="px-1.5 py-0.2 bg-indigo-100 text-indigo-800 text-[10px] font-semibold rounded" title={`${schema.routines.length} процедур`}>
                ⚙️ {schema.routines.length} проц.
              </span>
            )}
          </div>

          <div className="w-px h-5 bg-slate-300 mx-0.5" />

          {/* Export Dropdown (PNG, SVG, SQL, JSON) */}
          <div className="relative">
            <button
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              disabled={isExporting}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Экспорт диаграммы в PNG, SVG, SQL или JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Экспорт</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isExportMenuOpen && (
              <div className="absolute top-full mt-1.5 right-0 w-56 bg-white rounded-xl shadow-xl border border-slate-300 py-1 z-50 divide-y divide-slate-100 text-xs">
                <div className="p-1">
                  <button
                    onClick={async () => {
                      setIsExporting(true);
                      setIsExportMenuOpen(false);
                      await exportDiagramAsPng(schema);
                      setIsExporting(false);
                      onRecordChange('Экспорт диаграммы', 'Диаграмма сохранена в высоком разрешении (PNG)', 'table_updated');
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 font-medium cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-blue-600" />
                    <div>
                      <div>Скачать PNG изображение</div>
                      <div className="text-[10px] text-slate-400 font-normal">Растровый снимок 2x Retina</div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setIsExportMenuOpen(false);
                      exportDiagramAsSvg(schema);
                      onRecordChange('Экспорт диаграммы', 'Диаграмма сохранена в векторном формате SVG', 'table_updated');
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 font-medium cursor-pointer"
                  >
                    <FileDown className="w-4 h-4 text-purple-600" />
                    <div>
                      <div>Скачать SVG вектор</div>
                      <div className="text-[10px] text-slate-400 font-normal">Бесконечно масштабируемый файл</div>
                    </div>
                  </button>
                </div>

                <div className="p-1">
                  <button
                    onClick={() => {
                      setIsExportMenuOpen(false);
                      exportSchemaAsSqlFile(schema);
                      onRecordChange('Экспорт схемы', `Сгенерирован DDL файл (${schema.dialect})`, 'table_updated');
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 flex items-center gap-2 text-slate-700 font-medium cursor-pointer"
                  >
                    <FileCode className="w-4 h-4 text-emerald-600" />
                    <div>
                      <div>Экспорт SQL скрипта ({schema.dialect})</div>
                      <div className="text-[10px] text-slate-400 font-normal">CREATE TABLE и связи</div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setIsExportMenuOpen(false);
                      exportSchemaAsJsonFile(schema);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 flex items-center gap-2 text-slate-700 font-medium cursor-pointer"
                  >
                    <Sliders className="w-4 h-4 text-amber-600" />
                    <div>
                      <div>Экспорт схемы в JSON</div>
                      <div className="text-[10px] text-slate-400 font-normal">Полная структура для импорта</div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Interactive Connecting Banner */}
        {connectingSource && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-purple-600 text-white px-5 py-2.5 rounded-full shadow-xl text-xs font-medium animate-pulse border border-purple-400">
            <span>Кликните по целевой колонке таблицы для завершения связи</span>
            <button
              onClick={() => setConnectingSource(null)}
              className="px-2.5 py-1 bg-purple-800 hover:bg-purple-900 rounded-full text-[11px] font-semibold transition-colors cursor-pointer"
            >
              Отмена (Esc)
            </button>
          </div>
        )}

        {/* Transformable Canvas Stage */}
        <div
          id="canvas-grid-stage"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            width: '6000px',
            height: '6000px',
            backgroundImage: canvasSettings.showGrid
              ? `radial-gradient(circle, ${canvasSettings.gridColor} 1px, transparent 1px)`
              : 'none',
            backgroundSize: `${canvasSettings.gridSize * 2}px ${canvasSettings.gridSize * 2}px`,
          }}
          className="absolute top-0 left-0 pointer-events-auto"
        >
          {/* Page View (Лист бумаги А4 с тенью, как в draw.io) */}
          {canvasSettings.showPageView && (
            <div
              style={{
                position: 'absolute',
                left: '200px',
                top: '60px',
                width:
                  canvasSettings.paperOrientation === 'landscape'
                    ? canvasSettings.paperSize === 'A3'
                      ? '1587px'
                      : '1123px'
                    : canvasSettings.paperSize === 'A3'
                    ? '1123px'
                    : '794px',
                height:
                  canvasSettings.paperOrientation === 'landscape'
                    ? canvasSettings.paperSize === 'A3'
                      ? '1123px'
                      : '794px'
                    : canvasSettings.paperSize === 'A3'
                    ? '1587px'
                    : '1123px',
                backgroundColor: '#ffffff',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05)',
                border: '1px solid #cbd5e1',
                pointerEvents: 'none',
                zIndex: 0,
              }}
            >
              <div className="p-3 text-[10px] text-slate-400 font-mono flex items-center justify-between border-b border-slate-100">
                <span>{schema.name} • {canvasSettings.paperSize}</span>
                <span>Вид страницы (draw.io)</span>
              </div>
            </div>
          )}

          {/* Snap Guide Lines (Dotted blue alignment crosshairs) */}
          {snapLines.x !== undefined && (
            <div
              style={{
                position: 'absolute',
                left: `${snapLines.x}px`,
                top: '0px',
                width: '1px',
                height: '5000px',
                borderLeft: '1px dashed #3b82f6',
                pointerEvents: 'none',
                zIndex: 30,
              }}
            />
          )}
          {snapLines.y !== undefined && (
            <div
              style={{
                position: 'absolute',
                left: '0px',
                top: `${snapLines.y}px`,
                width: '5000px',
                height: '1px',
                borderTop: '1px dashed #3b82f6',
                pointerEvents: 'none',
                zIndex: 30,
              }}
            />
          )}

          {/* SVG Connectors Overlay */}
          <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-10">
            <defs>
              <marker
                id="rel-arrow"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 8 5 L 0 9 z" fill="#8b5cf6" />
              </marker>
              <marker
                id="rel-arrow-hover"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 8 5 L 0 9 z" fill="#7c3aed" />
              </marker>
            </defs>

            {/* Existing Database Relationships */}
            {schema.relationships.map((rel) => {
              const pts = getRelationPoints(rel);
              if (!pts) return null;

              const isHovered = hoveredRelId === rel.id;
              const dx = Math.abs(pts.endX - pts.startX);
              const curvature = Math.max(dx * 0.5, 45);

              const c1X = pts.isSrcLeftOfTgt ? pts.startX + curvature : pts.startX - curvature;
              const c2X = pts.isSrcLeftOfTgt ? pts.endX - curvature : pts.endX + curvature;

              const pathD = `M ${pts.startX} ${pts.startY} C ${c1X} ${pts.startY}, ${c2X} ${pts.endY}, ${pts.endX} ${pts.endY}`;
              const midX = (pts.startX + pts.endX) / 2;
              const midY = (pts.startY + pts.endY) / 2;

              const relColor = rel.color || (isHovered ? '#7c3aed' : '#64748b');

              return (
                <g
                  key={rel.id}
                  className="cursor-pointer pointer-events-auto"
                  onMouseEnter={() => setHoveredRelId(rel.id)}
                  onMouseLeave={() => setHoveredRelId(null)}
                >
                  <path
                    d={pathD}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="22"
                    onClick={() => onSelectRelationship(rel)}
                  />
                  <path
                    d={pathD}
                    fill="none"
                    stroke={relColor}
                    strokeWidth={isHovered ? '3' : '2'}
                    strokeDasharray={rel.style === 'dashed' || rel.type === '1:1' ? '4 2' : undefined}
                    markerEnd={isHovered ? 'url(#rel-arrow-hover)' : 'url(#rel-arrow)'}
                    className="transition-colors"
                    onClick={() => onSelectRelationship(rel)}
                  />

                  {/* Cardinality Badge (Click to cycle 1:1 -> 1:N -> N:M) */}
                  <g onClick={(e) => handleCycleCardinality(e, rel)}>
                    <title>Кликните для смены кардинальности (1:1, 1:N, N:M)</title>
                    <rect
                      x={midX - 18}
                      y={midY - 10}
                      width="36"
                      height="20"
                      rx="4"
                      fill={isHovered ? '#7c3aed' : '#ffffff'}
                      stroke={isHovered ? '#6d28d9' : '#cbd5e1'}
                      strokeWidth="1.5"
                      className="shadow-2xs"
                    />
                    <text
                      x={midX}
                      y={midY + 4}
                      textAnchor="middle"
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight="bold"
                      fill={isHovered ? '#ffffff' : '#334155'}
                    >
                      {rel.type}
                    </text>
                  </g>

                  {/* Delete Button on Hover */}
                  {isHovered && (
                    <g
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRelationship(rel.id);
                      }}
                    >
                      <title>Удалить связь</title>
                      <circle cx={midX + 28} cy={midY} r="8.5" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
                      <text
                        x={midX + 28}
                        y={midY + 3.5}
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="bold"
                        fill="#ffffff"
                      >
                        ×
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Active Link Path (Interactive wire while connecting) */}
            {connectingSource && (
              <ActiveConnectingWire
                srcPt={getActiveConnectingSourcePoint()}
                mousePos={mousePos}
              />
            )}
          </svg>

          {/* Database Tables Layer */}
          {schema.tables.map((table) => (
            <TableCard
              key={table.id}
              table={table}
              isSelected={selectedTableId === table.id}
              onSelect={(id) => {
                setSelectedTableId(id);
                setSelectedShapeId(null);
              }}
              onStartDrag={handleStartDragTable}
              onEditTable={onEditTable}
              onDeleteTable={onDeleteTable}
              onAddColumn={onAddColumn}
              onStartConnect={handleStartConnect}
              onDuplicateTable={handleDuplicateTable}
              isConnecting={Boolean(connectingSource)}
              connectingSource={connectingSource}
              canvasSettings={canvasSettings}
            />
          ))}

          {/* Custom Diagram Shapes & Notes Layer */}
          {shapes.map((shape) => (
            <DiagramShapeNode
              key={shape.id}
              shape={shape}
              isSelected={selectedShapeId === shape.id}
              onSelect={(id) => {
                setSelectedShapeId(id);
                setSelectedTableId(null);
              }}
              onStartDrag={handleStartDragShape}
              onUpdateShape={handleUpdateShape}
              onStartConnect={(shapeId, anchor) => {
                console.log('Connect anchor', shapeId, anchor);
              }}
              canvasSettings={canvasSettings}
              zoom={zoom}
            />
          ))}
        </div>

        {/* Bottom Helper Bar & Schema Metrics */}
        <div className="absolute bottom-3 left-3 z-30 flex items-center gap-2 bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-slate-300 text-[11px] text-slate-600 shadow-xs">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="font-semibold text-slate-900">{schema.tables.length} таблиц</span>
          <span className="text-slate-300">•</span>
          <span>{schema.relationships.length} связей FK</span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-500">
            {toolMode === 'note'
              ? 'Кликните на холст для создания стикера'
              : toolMode === 'text'
              ? 'Кликните на холст для добавления текста'
              : 'Пробел + зажатие мыши для перемещения • Ctrl+Z / Ctrl+Y'}
          </span>
        </div>

        {/* Bottom-Right Interactive Minimap (Radar) */}
        <div className="absolute bottom-3 right-3 z-30">
          <DiagramMinimap
            schema={schema}
            pan={pan}
            zoom={zoom}
            containerWidth={containerRef.current?.clientWidth || 1000}
            containerHeight={containerRef.current?.clientHeight || 700}
            onPanChange={setPan}
            isOpen={isMinimapOpen}
            onToggle={() => setIsMinimapOpen(!isMinimapOpen)}
          />
        </div>
      </div>

      {/* 3. Right Inspector Panel for Diagram & Style (draw.io style) */}
      <DiagramInspector
        isOpen={isRightInspectorOpen}
        onToggle={() => setIsRightInspectorOpen(!isRightInspectorOpen)}
        canvasSettings={canvasSettings}
        setCanvasSettings={setCanvasSettings}
        selectedTable={selectedTable}
        selectedShape={selectedShape}
        onUpdateTableStyle={handleUpdateTableStyle}
        onUpdateShapeStyle={handleUpdateShape}
        onDeleteSelected={handleDeleteSelected}
        onDuplicateSelected={handleDuplicateSelected}
        onOpenEditDataModal={() => setIsEditDataModalOpen(true)}
        onResetDefaultStyle={handleResetDefaultStyle}
        onApplyThemePreset={handleApplyThemePreset}
      />

      {/* 4. Raw JSON & Data Editor Modal */}
      <EditDataModal
        isOpen={isEditDataModalOpen}
        onClose={() => setIsEditDataModalOpen(false)}
        schema={schema}
        onSaveSchema={(updated) => {
          setSchema(updated);
          pushHistory(updated);
          onRecordChange(
            'Данные схемы обновлены',
            'Схема и диаграмма синхронизированы через редактор данных',
            'table_updated'
          );
        }}
      />

      {/* 5. Clear Canvas & Reset Confirmation Modal */}
      {isClearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 overflow-hidden">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Управление холстом и данными</h3>
                <p className="text-xs text-slate-500">Автосохранение сохраняет все ваши действия в браузере</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-5 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
              Выберите действие. Очистка удалит все таблицы и связи для построения новой архитектуры с нуля. Сброс вернет демонстрационный шаблон Ecommerce_Core_DB.
            </p>

            <div className="space-y-2">
              <button
                onClick={() => {
                  setIsClearModalOpen(false);
                  if (onClearCanvas) onClearCanvas();
                }}
                className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Очистить холст (удалить все таблицы и связи)</span>
              </button>

              <button
                onClick={() => {
                  setIsClearModalOpen(false);
                  if (onResetToDemo) onResetToDemo();
                }}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span>Сбросить к исходному демо-шаблону</span>
              </button>

              <button
                onClick={() => setIsClearModalOpen(false)}
                className="w-full py-2 px-4 text-slate-500 hover:text-slate-800 text-xs font-medium transition-colors cursor-pointer"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
