import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Search,
  HelpCircle,
  Plus,
  Edit2,
  X,
  Star,
  ChevronLeft,
  Sparkles,
  Database
} from 'lucide-react';
import { CatalogItem, SHAPE_CATALOG } from './shapeCatalog';

interface ShapeLibrarySidebarProps {
  onAddShape: (item: CatalogItem, dropPos?: { x: number; y: number }) => void;
  onOpenAddTableModal: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const ShapeLibrarySidebar: React.FC<ShapeLibrarySidebarProps> = ({
  onAddShape,
  onOpenAddTableModal,
  isOpen,
  onToggle,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([
    'gen_rect',
    'gen_cylinder',
    'erd_entity',
    'misc_sticky',
    'uml_class',
  ]);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(true);

  // Collapsible categories state (matching draw.io screenshot)
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    general: true,
    misc: false,
    advanced: false,
    basic: false,
    arrows: false,
    flowchart: false,
    erd: true,
    uml: false,
  });

  const categories = [
    { id: 'general', title: 'Общие' },
    { id: 'misc', title: 'Прочее' },
    { id: 'advanced', title: 'Расширенные' },
    { id: 'basic', title: 'Базовые' },
    { id: 'arrows', title: 'Стрелки' },
    { id: 'flowchart', title: 'Блок-схемы' },
    { id: 'erd', title: 'Отношения сущностей' },
    { id: 'uml', title: 'UML' },
  ];

  const toggleCategory = (catId: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  const handleDragStart = (e: React.DragEvent, item: CatalogItem) => {
    e.dataTransfer.setData('application/json', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleFavoriteDrop = (e: React.DragEvent) => {
    e.preventDefault();
    try {
      const data = e.dataTransfer.getData('application/json');
      if (data) {
        const item: CatalogItem = JSON.parse(data);
        if (!favorites.includes(item.id)) {
          setFavorites((prev) => [...prev, item.id]);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const favoriteItems = SHAPE_CATALOG.filter((item) => favorites.includes(item.id));

  const filteredCatalog = SHAPE_CATALOG.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="absolute top-16 left-2 z-20 p-2 bg-white rounded-lg shadow-md border border-slate-200 text-slate-700 hover:text-blue-600 hover:bg-slate-50 transition-colors"
        title="Развернуть библиотеку фигур"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    );
  }

  return (
    <aside
      id="shape-library-sidebar"
      className="w-60 h-[calc(100vh-3.5rem)] bg-[#f1f3f4] border-r border-slate-300 flex flex-col select-none text-slate-800 z-20 shrink-0 font-sans shadow-xs"
    >
      {/* Top Search & Collapse bar */}
      <div className="p-2 border-b border-slate-300 bg-[#e8eaed] flex items-center gap-1.5">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery || ''}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск фигур..."
            className="w-full pl-7 pr-2 py-1 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-500 placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        <button
          onClick={onToggle}
          className="p-1 rounded hover:bg-slate-300 text-slate-600 transition-colors"
          title="Свернуть панель"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Database Quick Action banner */}
      <div className="p-2 bg-blue-50/70 border-b border-blue-200/60 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-blue-900 font-medium">
          <Database className="w-3.5 h-3.5 text-blue-600" />
          <span>Таблица БД</span>
        </div>
        <button
          onClick={onOpenAddTableModal}
          className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-semibold flex items-center gap-1 shadow-2xs cursor-pointer"
          title="Создать новую таблицу БД с колонками"
        >
          <Plus className="w-3 h-3" />
          <span>Добавить</span>
        </button>
      </div>

      {/* Accordion Categories List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden text-xs divide-y divide-slate-200">
        {/* Search Results (if searching) */}
        {searchQuery.trim() ? (
          <div className="p-2 space-y-2">
            <div className="text-[11px] font-semibold text-slate-500 uppercase px-1">
              Найдено ({filteredCatalog.length})
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {filteredCatalog.map((item) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item)}
                  onClick={() => onAddShape(item)}
                  title={item.name}
                  className="w-11 h-11 bg-white hover:bg-slate-100 border border-slate-300 hover:border-blue-500 rounded flex flex-col items-center justify-center p-1 cursor-grab active:cursor-grabbing transition-colors group shadow-2xs"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="w-6 h-6 text-slate-700 group-hover:text-blue-600 pointer-events-none"
                    dangerouslySetInnerHTML={{ __html: item.iconSvg }}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* ▾ Избранное (Favorites) matching Photo 1 */}
            <div className="bg-[#f1f3f4]">
              <div
                onClick={() => setIsFavoritesOpen(!isFavoritesOpen)}
                className="px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-slate-200 transition-colors font-medium text-slate-800 text-xs"
              >
                <div className="flex items-center gap-1.5">
                  {isFavoritesOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-600" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                  )}
                  <span>Избранное</span>
                </div>
                <div
                  className="flex items-center gap-1 text-slate-500"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="hover:text-slate-800 p-0.5"
                    title="Справка: перетащите любую фигуру сюда для быстрого доступа"
                  >
                    <HelpCircle className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => {
                      if (favorites.length > 0) {
                        const next = SHAPE_CATALOG.find((s) => !favorites.includes(s.id));
                        if (next) setFavorites((prev) => [...prev, next.id]);
                      }
                    }}
                    className="hover:text-slate-800 p-0.5"
                    title="Добавить в избранное"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setFavorites([])}
                    className="hover:text-rose-600 p-0.5"
                    title="Очистить избранное"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {isFavoritesOpen && (
                <div className="px-2 pb-2 space-y-1.5">
                  {favoriteItems.length > 0 ? (
                    <div className="grid grid-cols-4 gap-1.5 p-1 bg-white/70 rounded border border-slate-200">
                      {favoriteItems.map((item) => (
                        <div
                          key={`fav_${item.id}`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, item)}
                          onClick={() => onAddShape(item)}
                          title={item.name}
                          className="w-11 h-11 bg-white hover:bg-blue-50 border border-slate-300 hover:border-blue-500 rounded flex flex-col items-center justify-center p-1 cursor-grab active:cursor-grabbing transition-colors group shadow-2xs relative"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            className="w-6 h-6 text-slate-700 group-hover:text-blue-600 pointer-events-none"
                            dangerouslySetInnerHTML={{ __html: item.iconSvg }}
                          />
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {/* Dashed Drop Target: "Перетащите элементы сюда" */}
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleFavoriteDrop}
                    className="border-2 border-dashed border-slate-300 rounded-lg p-2 text-center text-[11px] text-slate-500 hover:bg-slate-200/50 hover:border-slate-400 transition-colors cursor-default"
                  >
                    Перетащите элементы сюда
                  </div>
                </div>
              )}
            </div>

            {/* Accordion Categories */}
            {categories.map((cat) => {
              const items = SHAPE_CATALOG.filter((i) => i.category === cat.id);
              const isOpenCat = Boolean(expandedCategories[cat.id]);

              return (
                <div key={cat.id} className="bg-[#f1f3f4]">
                  <div
                    onClick={() => toggleCategory(cat.id)}
                    className="px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-slate-200 transition-colors font-medium text-slate-800 text-xs"
                  >
                    <div className="flex items-center gap-1.5">
                      {isOpenCat ? (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-600" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                      )}
                      <span>{cat.title}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">({items.length})</span>
                  </div>

                  {isOpenCat && (
                    <div className="p-2 bg-[#f8f9fa] border-t border-slate-200">
                      <div className="grid grid-cols-4 gap-1.5">
                        {items.map((item) => (
                          <div
                            key={item.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, item)}
                            onClick={() => onAddShape(item)}
                            title={`${item.name} — кликните или перетащите на холст`}
                            className="w-11 h-11 bg-white hover:bg-blue-50 border border-slate-300 hover:border-blue-500 rounded flex flex-col items-center justify-center p-1 cursor-grab active:cursor-grabbing transition-colors group shadow-2xs"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              className="w-6 h-6 text-slate-700 group-hover:text-blue-600 pointer-events-none"
                              dangerouslySetInnerHTML={{ __html: item.iconSvg }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Footer helper */}
      <div className="p-2 border-t border-slate-300 text-[10px] text-slate-500 bg-[#e8eaed] text-center">
        Перетащите фигуру на холст или кликните для добавления
      </div>
    </aside>
  );
};
