import React, { useState, memo, useRef } from 'react';
import { 
  MousePointer2, Hand, PenTool, Type, Square, Circle, Triangle, 
  Minus, ArrowRight, Undo, Redo, ZoomIn, ZoomOut, 
  Trash2, Home, TrendingUp, ChevronDown, Menu, X
} from 'lucide-react';

export type Tool = 'select' | 'pan' | 'pen' | 'text' | 'shape' | 'function';
export type ShapeType = 'rectangle' | 'circle' | 'triangle' | 'line' | 'arrow';

interface ToolbarProps {
  tool: Tool;
  setTool: (tool: Tool) => void;
  selectedShape: ShapeType;
  setSelectedShape: (shape: ShapeType) => void;
  color: string;
  setColor: (color: string) => void;
  lineWidth: number;
  setLineWidth: (width: number) => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  fillShape: boolean;
  setFillShape: (fill: boolean) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onResetView: () => void;
  onGenerateFunction?: (expression: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  splitSize?: number;
  onToggleView?: () => void;
}

const ZoomControlsComponent = ({ 
  zoom, 
  onZoomIn, 
  onZoomOut,
  onResetView
}: { 
  zoom: number; 
  onZoomIn: () => void; 
  onZoomOut: () => void;
  onResetView: () => void;
}) => {
  return (
    <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg border border-gray-200 z-10 pointer-events-auto">
      <div className="flex items-center gap-1 p-1.5">
        <button
          onClick={onResetView}
          className="p-1.5 text-gray-700 hover:bg-gray-100 rounded transition-colors border-r border-gray-200"
          title="Wróć do początku (Home)"
        >
          <Home className="w-4 h-4" />
        </button>
        
        <button
          onClick={onZoomOut}
          className="p-1.5 text-gray-700 hover:bg-gray-100 rounded transition-colors"
          title="Oddal"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        
        <span className="text-xs font-medium text-gray-700 min-w-[45px] text-center px-1">
          {Math.round(zoom * 100)}%
        </span>
        
        <button
          onClick={onZoomIn}
          className="p-1.5 text-gray-700 hover:bg-gray-100 rounded transition-colors"
          title="Przybliż"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// 🔥 Custom comparison - ZoomControls re-renderuje się TYLKO gdy zmienia się zoom
const areZoomPropsEqual = (
  prevProps: { zoom: number; onZoomIn: () => void; onZoomOut: () => void; onResetView: () => void },
  nextProps: { zoom: number; onZoomIn: () => void; onZoomOut: () => void; onResetView: () => void }
) => {
  // Sprawdź tylko zoom - funkcje mają stabilne referencje
  return prevProps.zoom === nextProps.zoom;
};

export const ZoomControls = memo(ZoomControlsComponent, areZoomPropsEqual);
ZoomControls.displayName = 'ZoomControls';

function Toolbar({
  tool,
  setTool,
  selectedShape,
  setSelectedShape,
  color,
  setColor,
  lineWidth,
  setLineWidth,
  fontSize,
  setFontSize,
  fillShape,
  setFillShape,
  onUndo,
  onRedo,
  onClear,
  onResetView,
  onGenerateFunction,
  canUndo,
  canRedo,
  splitSize = 50,
  onToggleView
}: ToolbarProps) {
  const [functionExpression, setFunctionExpression] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPropertiesModalOpen, setIsPropertiesModalOpen] = useState(false);

  const ToolButton = ({ 
    icon: Icon, 
    active, 
    onClick, 
    title,
    disabled = false,
  }: { 
    icon: React.ComponentType<{ className?: string }>; 
    active: boolean; 
    onClick: () => void; 
    title: string;
    disabled?: boolean;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        relative p-1 rounded transition-colors group
        ${active 
          ? 'bg-blue-500 text-white' 
          : 'text-gray-700 hover:bg-gray-100'
        }
        ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <Icon className="w-3.5 h-3.5" />
      <span className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
        {title}
      </span>
    </button>
  );

  const Divider = () => (
    <div className="w-px h-4 bg-gray-200 mx-0.5" />
  );

  const getShapeIcon = () => {
    switch(selectedShape) {
      case 'circle': return Circle;
      case 'triangle': return Triangle;
      case 'line': return Minus;
      case 'arrow': return ArrowRight;
      default: return Square;
    }
  };

  const hasProperties = tool !== 'select' && tool !== 'pan';
  // 🔥 Hamburger mode TYLKO gdy egzamin jest widoczny (splitSize > 60)
  // Gdy splitSize = 0 (fullscreen whiteboard) lub 100 (fullscreen egzamin) - pełny toolbar
  const isHamburgerMode = splitSize > 60 && splitSize < 100;

  return (
    <div className="absolute top-4 left-4 right-4 z-10 pointer-events-auto flex flex-col items-start gap-1">
      {/* WIELKOŚĆ TOOLBARU - ZDEFINIOWANA TUTAJ */}
      {/* absolute top-4 left-4 right-4 = pozycjonowanie absolutne, 16px od góry/lewej/prawej */}
      {/* flex flex-col = toolbar w kolumnie (główny toolbar + zoom controls) */}
      {/* gap-1 = odstęp 4px między głównym toolbar a zoom controls */}
      
      {/* MOBILE: Hamburger Menu Button - tylko gdy egzamin widoczny */}
      <div className={`${isHamburgerMode ? '' : 'md:hidden'}`}>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="bg-white rounded-lg shadow-lg border border-gray-200 p-1.5 hover:bg-gray-50 transition-colors"
          title="Menu narzędzi"
        >
          <Menu className="w-4 h-4 text-gray-700" />
        </button>
      </div>
      
      {/* DESKTOP: GŁÓWNY TOOLBAR - HORIZONTAL */}
      {/* Pokaż gdy splitSize = 0 (fullscreen whiteboard) LUB splitSize 30-60 (normalny widok) */}
      {/* bg-white rounded-lg shadow-lg border border-gray-200 = wygląd białego prostokąta */}
      <div className={`${splitSize === 0 || (splitSize >= 30 && splitSize <= 60) ? 'block' : 'hidden md:hidden'} bg-white rounded-lg shadow-lg border border-gray-200`}>
        <div className="flex items-center gap-0.5 p-0.5">
          {/* Main Tools */}
          <ToolButton
            icon={MousePointer2}
            active={tool === 'select'}
            onClick={() => setTool('select')}
            title="Zaznacz (Ctrl+V)"
          />
          
          <ToolButton
            icon={Hand}
            active={tool === 'pan'}
            onClick={() => setTool('pan')}
            title="Przesuń widok (Ctrl+H)"
          />
          
          <Divider />
          
          <ToolButton
            icon={PenTool}
            active={tool === 'pen'}
            onClick={() => setTool('pen')}
            title="Rysuj (Ctrl+P)"
          />
          
     <ToolButton
        icon={getShapeIcon()}
        active={tool === 'shape'}
        onClick={() => setTool('shape')}
        title="Kształty (Ctrl+S)"
      />
          
          <ToolButton
            icon={Type}
            active={tool === 'text'}
            onClick={() => setTool('text')}
            title="Tekst (Ctrl+T)"
          />
          
          <ToolButton
            icon={TrendingUp}
            active={tool === 'function'}
            onClick={() => setTool('function')}
            title="Funkcja (Ctrl+F)"
          />
          
          <Divider />
          
          <ToolButton
            icon={Undo}
            active={false}
            onClick={onUndo}
            disabled={!canUndo}
            title="Cofnij (Ctrl+Z)"
          />
          
          <ToolButton
            icon={Redo}
            active={false}
            onClick={onRedo}
            disabled={!canRedo}
            title="Ponów (Ctrl+Y)"
          />
          
          <Divider />
          
          <ToolButton
            icon={Trash2}
            active={false}
            onClick={onClear}
            title="Wyczyść tablicę"
          />
        </div>
      </div>

      {/* MOBILE: Dropdown Menu */}
      {isMobileMenuOpen && (
        <div className={`${isHamburgerMode ? '' : 'md:hidden'} bg-white rounded-lg shadow-lg border border-gray-200 p-2 max-w-xs`}>
          <div className="grid grid-cols-4 gap-1">
            {/* Main Tools */}
            <ToolButton
              icon={MousePointer2}
              active={tool === 'select'}
              onClick={() => { setTool('select'); setIsMobileMenuOpen(false); }}
              title="Zaznacz"
            />
            
            <ToolButton
              icon={Hand}
              active={tool === 'pan'}
              onClick={() => { setTool('pan'); setIsMobileMenuOpen(false); }}
              title="Przesuń"
            />
            
            <ToolButton
              icon={PenTool}
              active={tool === 'pen'}
              onClick={() => { setTool('pen'); setIsMobileMenuOpen(false); }}
              title="Rysuj"
            />
            
            <ToolButton
              icon={getShapeIcon()}
              active={tool === 'shape'}
              onClick={() => { setTool('shape'); setIsMobileMenuOpen(false); }}
              title="Kształty"
            />
            
            <ToolButton
              icon={Type}
              active={tool === 'text'}
              onClick={() => { setTool('text'); setIsMobileMenuOpen(false); }}
              title="Tekst"
            />
            
            <ToolButton
              icon={TrendingUp}
              active={tool === 'function'}
              onClick={() => { setTool('function'); setIsMobileMenuOpen(false); }}
              title="Funkcja"
            />
            
            <ToolButton
              icon={Undo}
              active={false}
              onClick={() => { onUndo(); setIsMobileMenuOpen(false); }}
              disabled={!canUndo}
              title="Cofnij"
            />
            
            <ToolButton
              icon={Redo}
              active={false}
              onClick={() => { onRedo(); setIsMobileMenuOpen(false); }}
              disabled={!canRedo}
              title="Ponów"
            />
            
            {/* Clear button - full width */}
            <div className="col-span-4 mt-1 pt-1 border-t border-gray-200">
              <ToolButton
                icon={Trash2}
                active={false}
                onClick={() => { onClear(); setIsMobileMenuOpen(false); }}
                title="Wyczyść"
              />
            </div>
            
            {/* Properties button - full width */}
            <div className="col-span-4 mt-1 pt-1 border-t border-gray-200">
              <button
                onClick={() => { setIsPropertiesModalOpen(true); setIsMobileMenuOpen(false); }}
                className="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm font-medium"
                title="Właściwości"
              >
                ⚙️ Właściwości
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE PROPERTIES MODAL */}
      {isPropertiesModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">Właściwości</h3>
              <button
                onClick={() => setIsPropertiesModalOpen(false)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4">
              {/* PEN */}
              {tool === 'pen' && (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <label className="text-sm font-medium text-gray-600 min-w-[60px]">Kolor:</label>
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-10 h-10 rounded border-2 border-gray-300 cursor-pointer hover:border-blue-400 transition-colors"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2 mb-4">
                    <label className="text-sm font-medium text-gray-600 min-w-[60px]">Grubość:</label>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      value={lineWidth}
                      onChange={(e) => setLineWidth(Number(e.target.value))}
                      className="flex-1 h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <span className="text-sm text-gray-700 font-semibold w-10 text-right">{lineWidth}px</span>
                  </div>
                </>
              )}

              {/* SHAPE */}
              {tool === 'shape' && (
                <>
                  <div className="mb-4">
                    <label className="text-sm font-medium text-gray-600 mb-2 block">Kształt:</label>
                    <div className="grid grid-cols-5 gap-1">
                      <button
                        onClick={() => setSelectedShape('rectangle')}
                        className={`p-1.5 rounded border border-gray-300 transition-all ${
                          selectedShape === 'rectangle' 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        title="Prostokąt"
                      >
                        <Square className="w-6 h-6" />
                      </button>
                      <button
                        onClick={() => setSelectedShape('circle')}
                        className={`p-2 rounded transition-all ${
                          selectedShape === 'circle' 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        title="Koło"
                      >
                        <Circle className="w-6 h-6" />
                      </button>
                      <button
                        onClick={() => setSelectedShape('triangle')}
                        className={`p-2 rounded transition-all ${
                          selectedShape === 'triangle' 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        title="Trójkąt"
                      >
                        <Triangle className="w-6 h-6" />
                      </button>
                      <button
                        onClick={() => setSelectedShape('line')}
                        className={`p-2 rounded transition-all ${
                          selectedShape === 'line' 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        title="Linia"
                      >
                        <Minus className="w-6 h-6" />
                      </button>
                      <button
                        onClick={() => setSelectedShape('arrow')}
                        className={`p-2 rounded transition-all ${
                          selectedShape === 'arrow' 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        title="Strzałka"
                      >
                        <ArrowRight className="w-6 h-6" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    <label className="text-sm font-medium text-gray-600 min-w-[60px]">Kolor:</label>
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-10 h-10 rounded border-2 border-gray-300 cursor-pointer hover:border-blue-400 transition-colors"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2 mb-4">
                    <label className="text-sm font-medium text-gray-600 min-w-[60px]">Grubość:</label>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      value={lineWidth}
                      onChange={(e) => setLineWidth(Number(e.target.value))}
                      className="flex-1 h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <span className="text-sm text-gray-700 font-semibold w-10 text-right">{lineWidth}px</span>
                  </div>

                  {selectedShape !== 'line' && selectedShape !== 'arrow' && (
                    <div className="flex items-center justify-center">
                      <button
                        onClick={() => setFillShape(!fillShape)}
                        className={`px-4 py-2 rounded text-sm font-medium transition-all ${
                          fillShape 
                            ? 'bg-blue-500 text-white hover:bg-blue-600' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {fillShape ? 'Wypełniony' : 'Kontur'}
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* TEXT */}
              {tool === 'text' && (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <label className="text-sm font-medium text-gray-600 min-w-[60px]">Kolor:</label>
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-10 h-10 rounded border-2 border-gray-300 cursor-pointer hover:border-blue-400 transition-colors"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2 mb-4">
                    <label className="text-sm font-medium text-gray-600 min-w-[60px]">Rozmiar:</label>
                    <input
                      type="range"
                      min="12"
                      max="120"
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      className="flex-1 h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <span className="text-sm text-gray-700 font-semibold w-10 text-right">{fontSize}px</span>
                  </div>
                </>
              )}

              {/* FUNCTION */}
              {tool === 'function' && (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <label className="text-sm font-medium text-gray-600 min-w-[60px]">Kolor:</label>
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-10 h-10 rounded border-2 border-gray-300 cursor-pointer hover:border-blue-400 transition-colors"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2 mb-4">
                    <label className="text-sm font-medium text-gray-600 min-w-[60px]">Grubość:</label>
                    <input
                      type="range"
                      min="1"
                      max="8"
                      value={lineWidth}
                      onChange={(e) => setLineWidth(Number(e.target.value))}
                      className="flex-1 h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <span className="text-sm text-gray-700 font-semibold w-10 text-right">{lineWidth}px</span>
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    <label className="text-sm font-medium text-gray-600">f(x) =</label>
                    <input
                      type="text"
                      value={functionExpression}
                      onChange={(e) => setFunctionExpression(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && functionExpression.trim()) {
                          onGenerateFunction?.(functionExpression);
                          setFunctionExpression('');
                        }
                      }}
                      placeholder="np. sin(x)"
                      className="text-black flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200 focus:outline-none font-mono transition-all"
                      style={{ minWidth: '120px' }}
                    />
                  </div>

                  <div className="flex justify-center">
                    <button
                      onClick={() => {
                        if (functionExpression.trim()) {
                          onGenerateFunction?.(functionExpression);
                          setFunctionExpression('');
                        }
                      }}
                      disabled={!functionExpression.trim()}
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      Rysuj
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DESKTOP: PANEL WŁAŚCIWOŚCI - ROZWIJA SIĘ W DÓŁ */}
      {!isHamburgerMode && (
        <div 
          className={`
            bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden
            transition-all duration-300 ease-in-out
            ${hasProperties ? 'max-h-[120px] opacity-100' : 'max-h-0 opacity-0'}
            min-w-max max-w-max
          `}
        >
          <div className="p-0.5 flex flex-col md:flex-row md:items-center gap-0.5 md:gap-1">
            {/* PEN */}
            {tool === 'pen' && (
              <>
                <div className="flex items-center gap-1">
                  <label className="text-xs font-medium text-gray-600">Kolor:</label>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-8 h-8 rounded border-2 border-gray-300 cursor-pointer hover:border-blue-400 transition-colors"
                  />
                </div>
                
                <div className="flex items-center gap-1 min-w-[80px] md:min-w-[100px]">
                  <label className="text-xs font-medium text-gray-600">Grubość:</label>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={lineWidth}
                    onChange={(e) => setLineWidth(Number(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <span className="text-xs text-gray-700 font-semibold w-8 text-right">{lineWidth}px</span>
                </div>
              </>
            )}

            {/* SHAPE */}
              {tool === 'shape' && (
                <>
                  {/* SIATKA KSZTAŁTÓW - NAJPIERW */}
                  <div className="flex items-center gap-1 pb-1 border-b border-gray-200 min-h-0 w-full">
                    <div className="grid grid-cols-5 gap-0.5 w-full">
                      <button
                        onClick={() => setSelectedShape('rectangle')}
                        className={`p-1 rounded transition-all ${
                          selectedShape === 'rectangle' 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        title="Prostokąt"
                      >
                        <Square className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setSelectedShape('circle')}
                        className={`p-1 rounded transition-all ${
                          selectedShape === 'circle' 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        title="Koło"
                      >
                        <Circle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setSelectedShape('triangle')}
                        className={`p-1 rounded transition-all ${
                          selectedShape === 'triangle' 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        title="Trójkąt"
                      >
                        <Triangle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setSelectedShape('line')}
                        className={`p-1 rounded transition-all ${
                          selectedShape === 'line' 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        title="Linia"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setSelectedShape('arrow')}
                        className={`p-1 rounded transition-all ${
                          selectedShape === 'arrow' 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        title="Strzałka"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* KOLOR, GRUBOŚĆ, WYPEŁNIENIE - POD SIATKĄ */}
                  <div className="flex items-center gap-1 pt-0.5 min-h-0">
                    <div className="flex items-center gap-1">
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="w-8 h-8 rounded border-2 border-gray-300 cursor-pointer hover:border-blue-400 transition-colors"
                      />
                    </div>
                    <div className="flex items-center gap-1 min-w-[80px] md:min-w-[100px]">
                      <input
                        type="range"
                        min="1"
                        max="20"
                        value={lineWidth}
                        onChange={(e) => setLineWidth(Number(e.target.value))}
                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                      <span className="text-[10px] text-gray-700 font-semibold w-6 text-right">{lineWidth}px</span>
                    </div>
                    {selectedShape !== 'line' && selectedShape !== 'arrow' && (
                      <button
                        onClick={() => setFillShape(!fillShape)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-all ${
                          fillShape 
                            ? 'bg-blue-500 text-white hover:bg-blue-600' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {fillShape ? 'Wypełniony' : 'Kontur'}
                      </button>
                    )}
                  </div>
                </>
              )}

            {/* TEXT */}
            {tool === 'text' && (
              <>
                <div className="flex items-center gap-1">
                  <label className="text-xs font-medium text-gray-600">Kolor:</label>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-8 h-8 rounded border-2 border-gray-300 cursor-pointer hover:border-blue-400 transition-colors"
                  />
                </div>
                
                <div className="flex items-center gap-1 min-w-[80px] md:min-w-[100px]">
                  <label className="text-xs font-medium text-gray-600">Rozmiar:</label>
                  <input
                    type="range"
                    min="12"
                    max="120"
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <span className="text-xs text-gray-700 font-semibold w-8 text-right">{fontSize}px</span>
                </div>
              </>
            )}

            {/* FUNCTION */}
            {tool === 'function' && (
              <>
                <div className="flex items-center gap-1">
                  <label className="text-xs font-medium text-gray-600">Kolor:</label>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-8 h-8 rounded border-2 border-gray-300 cursor-pointer hover:border-blue-400 transition-colors"
                  />
                </div>
                
                <div className="flex items-center gap-1 min-w-[60px] md:min-w-[80px]">
                  <label className="text-xs font-medium text-gray-600">Grubość:</label>
                  <input
                    type="range"
                    min="1"
                    max="8"
                    value={lineWidth}
                    onChange={(e) => setLineWidth(Number(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <span className="text-xs text-gray-700 font-semibold w-8 text-right">{lineWidth}px</span>
                </div>

                <div className="flex items-center gap-1 flex-1">
                  <label className="text-xs font-medium text-gray-600">f(x) =</label>
                  <input
                    type="text"
                    value={functionExpression}
                    onChange={(e) => setFunctionExpression(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && functionExpression.trim()) {
                        onGenerateFunction?.(functionExpression);
                        setFunctionExpression('');
                      }
                    }}
                    placeholder="np. sin(x)"
                    className="text-black flex-1 px-1 py-0.5 border border-gray-300 rounded text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-200 focus:outline-none font-mono transition-all"
                    style={{ maxWidth: '180px', minWidth: '100px' }}
                  />
                  <button
                    onClick={() => {
                      if (functionExpression.trim()) {
                        onGenerateFunction?.(functionExpression);
                        setFunctionExpression('');
                      }
                    }}
                    disabled={!functionExpression.trim()}
                    className="px-1.5 py-0.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium"
                  >
                    Rysuj
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// 🔥 Custom comparison - Toolbar re-renderuje się TYLKO gdy zmienia się coś istotnego
const arePropsEqual = (prevProps: ToolbarProps, nextProps: ToolbarProps) => {
  return (
    prevProps.tool === nextProps.tool &&
    prevProps.selectedShape === nextProps.selectedShape &&
    prevProps.color === nextProps.color &&
    prevProps.lineWidth === nextProps.lineWidth &&
    prevProps.fontSize === nextProps.fontSize &&
    prevProps.fillShape === nextProps.fillShape &&
    prevProps.canUndo === nextProps.canUndo &&
    prevProps.canRedo === nextProps.canRedo &&
    prevProps.splitSize === nextProps.splitSize
    // ⚠️ Celowo IGNORUJEMY funkcje - mają stabilne referencje dzięki useCallback
  );
};

const MemoizedToolbar = memo(Toolbar, arePropsEqual);
MemoizedToolbar.displayName = 'Toolbar';
export default MemoizedToolbar;