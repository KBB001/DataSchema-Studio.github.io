import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Sliders,
  Palette,
  ChevronLeft,
  Sun,
  Moon,
  Trash2,
  Copy,
  Layers,
  ArrowUpRight,
  FileCode,
  RotateCcw,
  Sparkles,
  Square,
  Circle,
  HelpCircle
} from 'lucide-react';
import { CanvasSettings, DiagramShape, Table, ThemePreset } from '../../types';
import { THEME_PRESETS_PAGE_1, THEME_PRESETS_PAGE_2 } from './themePresets';

interface DiagramInspectorProps {
  isOpen: boolean;
  onToggle: () => void;
  canvasSettings: CanvasSettings;
  setCanvasSettings: React.Dispatch<React.SetStateAction<CanvasSettings>>;
  selectedTable: Table | null;
  selectedShape: DiagramShape | null;
  onUpdateTableStyle?: (tableId: string, updates: Partial<Table>) => void;
  onUpdateShapeStyle?: (shapeId: string, updates: Partial<DiagramShape>) => void;
  onDeleteSelected?: () => void;
  onDuplicateSelected?: () => void;
  onOpenEditDataModal: () => void;
  onResetDefaultStyle: () => void;
  onApplyThemePreset: (preset: ThemePreset) => void;
}

const toHexColor = (color: string | undefined | null, fallback: string): string => {
  if (!color || color === 'transparent') return fallback;
  if (/^#[0-9A-Fa-f]{6}$/.test(color)) return color.toLowerCase();
  if (/^#[0-9A-Fa-f]{3}$/.test(color)) {
    return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`.toLowerCase();
  }
  return fallback;
};

export const DiagramInspector: React.FC<DiagramInspectorProps> = ({
  isOpen,
  onToggle,
  canvasSettings,
  setCanvasSettings,
  selectedTable,
  selectedShape,
  onUpdateTableStyle,
  onUpdateShapeStyle,
  onDeleteSelected,
  onDuplicateSelected,
  onOpenEditDataModal,
  onResetDefaultStyle,
  onApplyThemePreset,
}) => {
  const [activeTab, setActiveTab] = useState<'diagram' | 'style'>('diagram');
  const [themePage, setThemePage] = useState<1 | 2>(1);

  // Collapsible sections on Diagram tab
  const [isViewOpen, setIsViewOpen] = useState(true);
  const [isParamsOpen, setIsParamsOpen] = useState(true);
  const [isPaperOpen, setIsPaperOpen] = useState(true);

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="absolute top-16 right-2 z-20 p-2 bg-white rounded-lg shadow-md border border-slate-200 text-slate-700 hover:text-blue-600 hover:bg-slate-50 transition-colors"
        title="Развернуть панель свойств"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
    );
  }

  const currentPresets = themePage === 1 ? THEME_PRESETS_PAGE_1 : THEME_PRESETS_PAGE_2;

  const hasSelection = Boolean(selectedTable || selectedShape);
  const selectionTitle = selectedTable
    ? `Таблица: ${selectedTable.name}`
    : selectedShape
    ? `Фигура: ${selectedShape.label || selectedShape.type}`
    : null;

  return (
    <aside
      id="diagram-inspector-panel"
      className="w-64 h-[calc(100vh-3.5rem)] bg-[#f1f3f4] border-l border-slate-300 flex flex-col select-none text-slate-800 z-20 shrink-0 font-sans shadow-xs"
    >
      {/* Top Header & Tab Navigation matching Screenshots 6 & 7 */}
      <div className="flex items-center justify-between border-b border-slate-300 bg-[#e8eaed] px-2 pt-1.5 pb-0">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('diagram')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-t border-t border-x transition-colors ${
              activeTab === 'diagram'
                ? 'bg-[#f1f3f4] text-slate-900 border-slate-300 border-b-transparent -mb-px'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200'
            }`}
          >
            Диаграмма
          </button>
          <button
            onClick={() => setActiveTab('style')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-t border-t border-x transition-colors relative ${
              activeTab === 'style'
                ? 'bg-[#f1f3f4] text-slate-900 border-slate-300 border-b-transparent -mb-px'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200'
            }`}
          >
            <span>Стиль</span>
            {hasSelection && (
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full absolute top-1 right-1" />
            )}
          </button>
        </div>

        <button
          onClick={onToggle}
          className="p-1 mb-1 rounded hover:bg-slate-300 text-slate-600 transition-colors"
          title="Свернуть панель"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Main Tab Contents */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden text-xs divide-y divide-slate-300 p-3 space-y-3">
        {/* ==================== TAB 1: ДИАГРАММА ==================== */}
        {activeTab === 'diagram' && (
          <div className="space-y-4">
            {/* ▾ Вид (View) */}
            <div className="space-y-2">
              <div
                onClick={() => setIsViewOpen(!isViewOpen)}
                className="flex items-center gap-1.5 font-semibold text-slate-800 cursor-pointer hover:text-blue-600"
              >
                {isViewOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                <span>Вид</span>
              </div>

              {isViewOpen && (
                <div className="pl-4 space-y-2.5 pt-1">
                  {/* Grid control */}
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(canvasSettings?.showGrid)}
                        onChange={(e) =>
                          setCanvasSettings((prev) => ({ ...prev, showGrid: e.target.checked }))
                        }
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span>Сетка</span>
                    </label>

                    <div className="flex items-center gap-1.5">
                      <select
                        value={canvasSettings?.gridSize ?? 10}
                        onChange={(e) =>
                          setCanvasSettings((prev) => ({
                            ...prev,
                            gridSize: Number(e.target.value),
                          }))
                        }
                        className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs text-slate-700"
                      >
                        <option value="10">10 pt</option>
                        <option value="15">15 pt</option>
                        <option value="20">20 pt</option>
                        <option value="30">30 pt</option>
                      </select>

                      <input
                        type="color"
                        value={toHexColor(canvasSettings?.gridColor, '#cbd5e1')}
                        onChange={(e) =>
                          setCanvasSettings((prev) => ({ ...prev, gridColor: e.target.value }))
                        }
                        className="w-5 h-5 rounded border border-slate-300 cursor-pointer p-0 bg-transparent"
                        title="Цвет сетки"
                      />
                    </div>
                  </div>

                  {/* Page View (Вид страницы) */}
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(canvasSettings?.showPageView)}
                        onChange={(e) =>
                          setCanvasSettings((prev) => ({ ...prev, showPageView: e.target.checked }))
                        }
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span>Вид страницы</span>
                    </label>
                  </div>

                  {/* Background (Фон) */}
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(canvasSettings?.hasCustomBg)}
                        onChange={(e) =>
                          setCanvasSettings((prev) => ({ ...prev, hasCustomBg: e.target.checked }))
                        }
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span>Фон</span>
                    </label>

                    {canvasSettings?.hasCustomBg && (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={toHexColor(canvasSettings?.bgColor, '#ffffff')}
                          onChange={(e) =>
                            setCanvasSettings((prev) => ({ ...prev, bgColor: e.target.value }))
                          }
                          className="w-5 h-5 rounded border border-slate-300 cursor-pointer p-0 bg-transparent"
                          title="Выбрать цвет фона"
                        />
                        <span className="text-[10px] text-slate-500 font-mono">
                          {canvasSettings.bgColor || '#ffffff'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ▾ Параметры (Parameters) */}
            <div className="space-y-2 pt-2 border-t border-slate-300">
              <div
                onClick={() => setIsParamsOpen(!isParamsOpen)}
                className="flex items-center gap-1.5 font-semibold text-slate-800 cursor-pointer hover:text-blue-600"
              >
                {isParamsOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                <span>Параметры</span>
              </div>

              {isParamsOpen && (
                <div className="pl-4 space-y-2 pt-1">
                  {/* Connection Arrows */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(canvasSettings?.showConnectionArrows)}
                      onChange={(e) =>
                        setCanvasSettings((prev) => ({
                          ...prev,
                          showConnectionArrows: e.target.checked,
                        }))
                      }
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>Стрелки соединения</span>
                  </label>

                  {/* Connection Points */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(canvasSettings?.showConnectionPoints)}
                      onChange={(e) =>
                        setCanvasSettings((prev) => ({
                          ...prev,
                          showConnectionPoints: e.target.checked,
                        }))
                      }
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>Точки соединения</span>
                  </label>

                  {/* Smart Snap Guides */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(canvasSettings?.snapGuides)}
                      onChange={(e) =>
                        setCanvasSettings((prev) => ({
                          ...prev,
                          snapGuides: e.target.checked,
                        }))
                      }
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>Направляющие</span>
                  </label>
                </div>
              )}
            </div>

            {/* ▾ Размер бумаги (Paper size) */}
            <div className="space-y-2 pt-2 border-t border-slate-300">
              <div
                onClick={() => setIsPaperOpen(!isPaperOpen)}
                className="flex items-center gap-1.5 font-semibold text-slate-800 cursor-pointer hover:text-blue-600"
              >
                {isPaperOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                <span>Размер бумаги</span>
              </div>

              {isPaperOpen && (
                <div className="pl-4 space-y-2 pt-1">
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-500">Формат листа:</label>
                    <select
                      value={canvasSettings?.paperSize || 'A4'}
                      onChange={(e) =>
                        setCanvasSettings((prev) => ({
                          ...prev,
                          paperSize: e.target.value as any,
                        }))
                      }
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-700"
                    >
                      <option value="A4">A4 (210 × 297 мм)</option>
                      <option value="A3">A3 (297 × 420 мм)</option>
                      <option value="Letter">US Letter</option>
                      <option value="Infinite">Бесконечный холст</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() =>
                        setCanvasSettings((prev) => ({ ...prev, paperOrientation: 'portrait' }))
                      }
                      className={`flex-1 py-1 px-1.5 text-center rounded border text-xs font-medium transition-colors ${
                        canvasSettings.paperOrientation === 'portrait'
                          ? 'bg-blue-50 border-blue-400 text-blue-700'
                          : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Книжная
                    </button>
                    <button
                      onClick={() =>
                        setCanvasSettings((prev) => ({ ...prev, paperOrientation: 'landscape' }))
                      }
                      className={`flex-1 py-1 px-1.5 text-center rounded border text-xs font-medium transition-colors ${
                        canvasSettings.paperOrientation === 'landscape'
                          ? 'bg-blue-50 border-blue-400 text-blue-700'
                          : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Альбомная
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons matching Photo 6 */}
            <div className="pt-3 border-t border-slate-300 space-y-2">
              <button
                onClick={onOpenEditDataModal}
                className="w-full py-1.5 px-2 bg-white hover:bg-slate-100 border border-slate-300 rounded text-xs font-medium text-slate-700 shadow-2xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <FileCode className="w-3.5 h-3.5 text-blue-600" />
                <span>Редактировать данные...</span>
              </button>

              <button
                onClick={onResetDefaultStyle}
                className="w-full py-1.5 px-2 bg-white hover:bg-slate-100 border border-slate-300 rounded text-xs font-medium text-slate-600 shadow-2xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Сбросить оформление к стандартному</span>
              </button>
            </div>
          </div>
        )}

        {/* ==================== TAB 2: СТИЛЬ ==================== */}
        {activeTab === 'style' && (
          <div className="space-y-4">
            {/* Global Toggles matching Screenshot 7 */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(canvasSettings?.roundedCorners)}
                  onChange={(e) =>
                    setCanvasSettings((prev) => ({ ...prev, roundedCorners: e.target.checked }))
                  }
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span>Скруглённые углы</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(canvasSettings?.sketchMode)}
                  onChange={(e) =>
                    setCanvasSettings((prev) => ({ ...prev, sketchMode: e.target.checked }))
                  }
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span>Набросок... (Комикс/Скетч)</span>
              </label>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(canvasSettings?.dropShadow)}
                    onChange={(e) =>
                      setCanvasSettings((prev) => ({ ...prev, dropShadow: e.target.checked }))
                    }
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>Тень</span>
                </label>

                <button
                  onClick={() =>
                    setCanvasSettings((prev) => ({
                      ...prev,
                      bgColor: prev.bgColor === '#0f172a' ? '#ffffff' : '#0f172a',
                      hasCustomBg: true,
                    }))
                  }
                  className="p-1 rounded hover:bg-slate-200 text-slate-600"
                  title="Темная / Светлая тема холста"
                >
                  {canvasSettings?.bgColor === '#0f172a' ? (
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                  ) : (
                    <Moon className="w-3.5 h-3.5 text-slate-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Theme Presets Grid (Фигура / Соединитель) matching Photo 7 */}
            <div className="pt-2 border-t border-slate-300 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800 text-xs">Фигура / Соединитель</span>
                {/* Pagination `< ● ○ >` */}
                <div className="flex items-center gap-1 text-slate-500 text-[11px]">
                  <button
                    onClick={() => setThemePage(1)}
                    disabled={themePage === 1}
                    className="p-0.5 hover:text-slate-900 disabled:opacity-30"
                  >
                    &lt;
                  </button>
                  <span
                    onClick={() => setThemePage(1)}
                    className={`cursor-pointer ${themePage === 1 ? 'font-bold text-blue-600' : ''}`}
                  >
                    ●
                  </span>
                  <span
                    onClick={() => setThemePage(2)}
                    className={`cursor-pointer ${themePage === 2 ? 'font-bold text-blue-600' : ''}`}
                  >
                    ○
                  </span>
                  <button
                    onClick={() => setThemePage(2)}
                    disabled={themePage === 2}
                    className="p-0.5 hover:text-slate-900 disabled:opacity-30"
                  >
                    &gt;
                  </button>
                </div>
              </div>

              {/* 10 Theme preview boxes per page */}
              <div className="grid grid-cols-5 gap-1.5 bg-white/70 p-1.5 rounded border border-slate-200">
                {currentPresets.map((preset, idx) => (
                  <button
                    key={preset.id}
                    onClick={() => onApplyThemePreset(preset)}
                    title={`${preset.name} — применить стиль`}
                    className="h-10 rounded border border-slate-300 hover:scale-105 transition-transform flex flex-col items-center justify-center p-1 relative shadow-2xs hover:border-blue-500 group"
                    style={{ backgroundColor: preset.fill, borderColor: preset.stroke }}
                  >
                    {/* Inner mini shape representation */}
                    <div
                      className="w-5 h-2.5 rounded-xs border"
                      style={{ backgroundColor: preset.fill, borderColor: preset.stroke }}
                    />
                    {/* Connector line representation */}
                    <div
                      className="w-5 h-0.5 mt-1"
                      style={{ backgroundColor: preset.connector }}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Element Style Controls (When element is selected) */}
            {hasSelection ? (
              <div className="pt-2 border-t border-slate-300 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-slate-800 text-xs truncate max-w-[140px]" title={selectionTitle || ''}>
                    {selectionTitle}
                  </div>
                  <div className="flex items-center gap-1">
                    {onDuplicateSelected && (
                      <button
                        onClick={onDuplicateSelected}
                        className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-200 rounded"
                        title="Дублировать"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {onDeleteSelected && (
                      <button
                        onClick={onDeleteSelected}
                        className="p-1 text-slate-500 hover:text-rose-600 hover:bg-slate-200 rounded"
                        title="Удалить"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Fill Color */}
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-500">Заливка фона:</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={toHexColor(
                        selectedShape?.fillColor ||
                        selectedTable?.fillColor ||
                        selectedTable?.color,
                        '#ffffff'
                      )}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (selectedShape && onUpdateShapeStyle) {
                          onUpdateShapeStyle(selectedShape.id, { fillColor: val });
                        }
                        if (selectedTable && onUpdateTableStyle) {
                          onUpdateTableStyle(selectedTable.id, {
                            fillColor: val,
                            color: val,
                          });
                        }
                      }}
                      className="w-7 h-7 rounded border border-slate-300 cursor-pointer p-0 bg-transparent"
                    />
                    <div className="flex items-center gap-1 flex-1">
                      {['#ffffff', '#f8fafc', '#fee2e2', '#fef3c7', '#dcfce7', '#e0e7ff', '#ede9fe'].map(
                        (c) => (
                          <div
                            key={c}
                            onClick={() => {
                              if (selectedShape && onUpdateShapeStyle) {
                                onUpdateShapeStyle(selectedShape.id, { fillColor: c });
                              }
                              if (selectedTable && onUpdateTableStyle) {
                                onUpdateTableStyle(selectedTable.id, {
                                  fillColor: c,
                                  color: c,
                                });
                              }
                            }}
                            className="w-4 h-4 rounded border border-slate-300 cursor-pointer hover:scale-110 transition-transform"
                            style={{ backgroundColor: c }}
                          />
                        )
                      )}
                    </div>
                  </div>
                </div>

                {/* Stroke / Border Color & Width */}
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-500">Граница / Линия:</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={toHexColor(
                        selectedShape?.strokeColor || selectedTable?.strokeColor,
                        '#334155'
                      )}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (selectedShape && onUpdateShapeStyle) {
                          onUpdateShapeStyle(selectedShape.id, { strokeColor: val });
                        }
                        if (selectedTable && onUpdateTableStyle) {
                          onUpdateTableStyle(selectedTable.id, { strokeColor: val });
                        }
                      }}
                      className="w-7 h-7 rounded border border-slate-300 cursor-pointer p-0 bg-transparent"
                    />
                    <select
                      value={selectedShape?.strokeWidth ?? 1}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (selectedShape && onUpdateShapeStyle) {
                          onUpdateShapeStyle(selectedShape.id, { strokeWidth: val });
                        }
                      }}
                      className="bg-white border border-slate-300 rounded px-1.5 py-1 text-xs text-slate-700 flex-1"
                    >
                      <option value="1">1 px</option>
                      <option value="2">2 px</option>
                      <option value="3">3 px</option>
                      <option value="4">4 px</option>
                    </select>

                    <select
                      value={selectedShape?.strokeStyle || 'solid'}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        if (selectedShape && onUpdateShapeStyle) {
                          onUpdateShapeStyle(selectedShape.id, { strokeStyle: val });
                        }
                      }}
                      className="bg-white border border-slate-300 rounded px-1.5 py-1 text-xs text-slate-700 flex-1"
                    >
                      <option value="solid">Сплошная</option>
                      <option value="dashed">Пунктир</option>
                      <option value="dotted">Точки</option>
                    </select>
                  </div>
                </div>

                {/* Text Color & Size */}
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-500">Текст & Шрифт:</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={toHexColor(selectedShape?.textColor, '#0f172a')}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (selectedShape && onUpdateShapeStyle) {
                          onUpdateShapeStyle(selectedShape.id, { textColor: val });
                        }
                      }}
                      className="w-7 h-7 rounded border border-slate-300 cursor-pointer p-0 bg-transparent"
                    />
                    <select
                      value={selectedShape?.fontSize ?? 12}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (selectedShape && onUpdateShapeStyle) {
                          onUpdateShapeStyle(selectedShape.id, { fontSize: val });
                        }
                      }}
                      className="bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-700 flex-1"
                    >
                      <option value="10">10 pt</option>
                      <option value="12">12 pt</option>
                      <option value="14">14 pt</option>
                      <option value="16">16 pt</option>
                      <option value="20">20 pt</option>
                      <option value="24">24 pt</option>
                    </select>
                  </div>
                </div>

                {/* Opacity slider */}
                {selectedShape && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Непрозрачность:</span>
                      <span>{Math.round((selectedShape.opacity ?? 1) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.05"
                      value={selectedShape.opacity ?? 1}
                      onChange={(e) => {
                        if (onUpdateShapeStyle) {
                          onUpdateShapeStyle(selectedShape.id, {
                            opacity: parseFloat(e.target.value),
                          });
                        }
                      }}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="pt-3 border-t border-slate-300 text-center text-slate-500 text-[11px] p-2 bg-slate-200/50 rounded">
                Выберите таблицу или фигуру на диаграмме для настройки персональных цветов, толщины линий и шрифтов
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="p-2 border-t border-slate-300 text-[10px] text-slate-500 bg-[#e8eaed] text-center">
        Свойства и стилизация элементов в стиле draw.io
      </div>
    </aside>
  );
};
