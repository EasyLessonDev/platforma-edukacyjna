'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Toolbar, { Tool, ShapeType, ZoomControls } from './Toolbar';

interface Point {
  x: number;
  y: number;
}

interface DrawingPath {
  id: string;
  type: 'path';
  points: Point[];
  color: string;
  width: number;
}

interface Shape {
  id: string;
  type: 'shape';
  shapeType: ShapeType;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  strokeWidth: number;
  fill: boolean;
}

interface TextElement {
  id: string;
  type: 'text';
  x: number;
  y: number;
  text: string;
  fontSize: number;
  color: string;
}

interface FunctionPlot {
  id: string;
  type: 'function';
  expression: string;
  color: string;
  strokeWidth: number;
  xRange: number;  // Range to plot (-xRange to +xRange)
  yRange: number;
}

type DrawingElement = DrawingPath | Shape | TextElement | FunctionPlot;

interface ViewportTransform {
  x: number;
  y: number;
  scale: number;
}

interface WhiteboardCanvasProps {
  className?: string;
  splitSize?: number;
  onToggleView?: () => void;
}

// Math expression evaluator
function evaluateExpression(expr: string, x: number): number {
  let processed = expr
    .replace(/\^/g, '**')
    .replace(/(\d)([a-z])/gi, '$1*$2')
    .replace(/\)(\d)/g, ')*$1')
    .replace(/(\d)\(/g, '$1*(');

  // Replace math functions
  const functions = ['sin', 'cos', 'tan', 'sqrt', 'abs', 'log', 'ln', 'exp', 'floor', 'ceil', 'round'];
  functions.forEach(fn => {
    const regex = new RegExp(`\\b${fn}\\b`, 'g');
    processed = processed.replace(regex, `Math.${fn}`);
  });

  processed = processed.replace(/\bpi\b/g, 'Math.PI');
  processed = processed.replace(/\be\b/g, 'Math.E');

  try {
    const func = new Function('x', `return ${processed}`);
    const result = func(x);
    
    if (typeof result !== 'number' || !isFinite(result)) {
      throw new Error('Invalid result');
    }
    
    return result;
  } catch (e) {
    throw new Error('Cannot evaluate expression');
  }
}

export default function WhiteboardCanvas({ className = '', splitSize = 50, onToggleView }: WhiteboardCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  
  const [viewport, setViewport] = useState<ViewportTransform>({ 
    x: 0,
    y: 0,
    scale: 1
  });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState<Point | null>(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<Tool>('select');
  const [selectedShape, setSelectedShape] = useState<ShapeType>('rectangle');
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(3);
  const [fontSize, setFontSize] = useState(24);
  const [fillShape, setFillShape] = useState(false);
  
  const [elements, setElements] = useState<DrawingElement[]>([]);
  const [currentElement, setCurrentElement] = useState<DrawingElement | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [selectedElementIds, setSelectedElementIds] = useState<Set<string>>(new Set());
  
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<Point | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<Point | null>(null);
  
  const [isEditingText, setIsEditingText] = useState(false);
  const [textPosition, setTextPosition] = useState<Point | null>(null);
  const [textBoxSize, setTextBoxSize] = useState<{ width: number; height: number } | null>(null);
  const [textDraft, setTextDraft] = useState('');
  const [pendingTextId, setPendingTextId] = useState<string | null>(null);
  
  const [history, setHistory] = useState<DrawingElement[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  const [isDraggingElement, setIsDraggingElement] = useState(false);
  const [dragStartPoint, setDragStartPoint] = useState<Point | null>(null);
  const [draggedElementsStart, setDraggedElementsStart] = useState<Map<string, DrawingElement>>(new Map());
  
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [resizeOriginalElement, setResizeOriginalElement] = useState<DrawingElement | null>(null);
  
  const redrawCanvasRef = useRef<() => void>(() => {});
  
  // Canvas setup
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    
    let resizeTimeout: NodeJS.Timeout | null = null;
    
    const updateCanvasSize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      const width = Math.ceil(rect.width);
      const height = Math.ceil(rect.height);
      
      // Skip if size hasn't changed significantly
      const currentWidth = canvas.width / dpr;
      const currentHeight = canvas.height / dpr;
      if (Math.abs(width - currentWidth) < 2 && Math.abs(height - currentHeight) < 2) {
        return;
      }
      
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
        redrawCanvasRef.current();
      }
    };
    
    // Debounced version for resize events
    const debouncedUpdateCanvasSize = () => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      resizeTimeout = setTimeout(updateCanvasSize, 100);
    };
    
    updateCanvasSize();
    window.addEventListener('resize', debouncedUpdateCanvasSize);
    
    // ResizeObserver to detect container size changes (e.g., when split panel is resized)
    const resizeObserver = new ResizeObserver(() => {
      debouncedUpdateCanvasSize();
    });
    resizeObserver.observe(container);
    
    return () => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      window.removeEventListener('resize', debouncedUpdateCanvasSize);
      resizeObserver.disconnect();
    };
  }, []);
  
  // Wheel zoom
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const handleWheel = (e: WheelEvent) => {
      if (isEditingText) return;
      e.preventDefault();
      
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const zoomIntensity = 0.1;
      const delta = -e.deltaY;
      const scaleChange = 1 + (delta > 0 ? zoomIntensity : -zoomIntensity);
      
      const oldScale = viewport.scale;
      const newScale = Math.min(Math.max(oldScale * scaleChange, 0.2), 2.0); // 20% do 200%
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const mouseRelX = mouseX - centerX;
      const mouseRelY = mouseY - centerY;
      
      const worldX = viewport.x + mouseRelX / oldScale;
      const worldY = viewport.y + mouseRelY / oldScale;
      
      const newViewportX = worldX - mouseRelX / newScale;
      const newViewportY = worldY - mouseRelY / newScale;
      
      const newViewport = constrainViewport({
        x: newViewportX,
        y: newViewportY,
        scale: newScale
      });
      
      setViewport(newViewport);
    };
    
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [viewport, isEditingText]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditingText) {
        if (e.key === 'Escape') {
          cancelTextInput();
        } else if (e.key === 'Enter') {
          finishTextInput();
        }
        return;
      }
      
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault();
          undo();
        } else if (e.key === 'y') {
          e.preventDefault();
          redo();
        }
        // Tool shortcuts - wymagają Ctrl/Cmd
        else if (e.key === 'v') {
          e.preventDefault();
          setTool('select');
        } else if (e.key === 'h') {
          e.preventDefault();
          setTool('pan');
        } else if (e.key === 'p') {
          e.preventDefault();
          setTool('pen');
        } else if (e.key === 's') {
          e.preventDefault();
          setTool('shape');
        } else if (e.key === 't') {
          e.preventDefault();
          setTool('text');
        } else if (e.key === 'f') {
          e.preventDefault();
          setTool('function');
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElementId || selectedElementIds.size > 0) {
          e.preventDefault();
          deleteSelectedElement();
        }
      } else if (e.key === 'Escape') {
        setTool('select');
        setSelectedElementId(null);
        setSelectedElementIds(new Set());
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementId, selectedElementIds, isEditingText, historyIndex]);
  
  const screenToCanvas = useCallback((screenX: number, screenY: number): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const vp = viewportRef.current;
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const relX = screenX - centerX;
    const relY = screenY - centerY;
    
    const worldX = vp.x + relX / vp.scale;
    const worldY = vp.y + relY / vp.scale;
    
    return { x: worldX, y: worldY };
  }, []);
  
  const canvasToScreen = useCallback((worldX: number, worldY: number): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const vp = viewportRef.current;
    const rect = canvas.getBoundingClientRect();
    const relX = (worldX - vp.x) * vp.scale;
    const relY = (worldY - vp.y) * vp.scale;
    
    const screenX = rect.width / 2 + relX;
    const screenY = rect.height / 2 + relY;
    
    return { x: screenX, y: screenY };
  }, []);
  
  const getElementBounds = (element: DrawingElement) => {
    if (element.type === 'shape') {
      return {
        minX: Math.min(element.startX, element.endX),
        maxX: Math.max(element.startX, element.endX),
        minY: Math.min(element.startY, element.endY),
        maxY: Math.max(element.startY, element.endY)
      };
    } else if (element.type === 'path') {
      return getBoundsForPath(element);
    } else if (element.type === 'text') {
      // Use canvas to measure actual text width
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.font = `${element.fontSize}px Arial`;
          const lines = element.text.split('\n');
          const maxLineWidth = Math.max(...lines.map(line => ctx.measureText(line).width), 50);
          const lineHeight = element.fontSize * 1.2;
          const height = lineHeight * lines.length;
          
          return {
            minX: element.x,
            maxX: element.x + maxLineWidth,
            minY: element.y,
            maxY: element.y + height
          };
        }
      }
      // Fallback
      const width = element.text.length * element.fontSize * 0.6;
      const height = element.fontSize * 1.2;
      return {
        minX: element.x,
        maxX: element.x + width,
        minY: element.y,
        maxY: element.y + height
      };
    } else if (element.type === 'function') {
      return {
        minX: -element.xRange,
        maxX: element.xRange,
        minY: -element.yRange,
        maxY: element.yRange
      };
    }
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  };
  

  const getGroupBounds = (elementIds: Set<string>) => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    
    elements.forEach(el => {
      if (elementIds.has(el.id)) {
        const bounds = getElementBounds(el);
        minX = Math.min(minX, bounds.minX);
        minY = Math.min(minY, bounds.minY);
        maxX = Math.max(maxX, bounds.maxX);
        maxY = Math.max(maxY, bounds.maxY);
      }
    });
    
    return { minX, minY, maxX, maxY };
  };
  
    const drawResizeHandles = (ctx: CanvasRenderingContext2D, bounds: { minX: number; minY: number; maxX: number; maxY: number }) => {
    const vp = viewportRef.current;
    const handleSize = 8 / vp.scale;
    
    // TYLKO ROGI - 4 handles
    const handles = [
      { x: bounds.minX, y: bounds.minY },
      { x: bounds.maxX, y: bounds.minY },
      { x: bounds.maxX, y: bounds.maxY },
      { x: bounds.minX, y: bounds.maxY }
    ];
    
    ctx.fillStyle = '#3b82f6';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2 / vp.scale;
    
    handles.forEach(handle => {
      ctx.fillRect(
        handle.x - handleSize / 2,
        handle.y - handleSize / 2,
        handleSize,
        handleSize
      );
      ctx.strokeRect(
        handle.x - handleSize / 2,
        handle.y - handleSize / 2,
        handleSize,
        handleSize
      );
    });
  };
  
  const getHandleAtPoint = (bounds: { minX: number; minY: number; maxX: number; maxY: number }, point: Point): string | null => {
    const vp = viewportRef.current;
    const handleSize = 8 / vp.scale;
    const threshold = handleSize;
    
    // TYLKO 4 ROGI
    const handles = [
      { name: 'tl', x: bounds.minX, y: bounds.minY },
      { name: 'tr', x: bounds.maxX, y: bounds.minY },
      { name: 'br', x: bounds.maxX, y: bounds.maxY },
      { name: 'bl', x: bounds.minX, y: bounds.maxY }
    ];
    
    for (const handle of handles) {
      const dx = point.x - handle.x;
      const dy = point.y - handle.y;
      if (Math.sqrt(dx * dx + dy * dy) <= threshold) {
        return handle.name;
      }
    }
    
    return null;
  };
  
  const constrainViewport = useCallback((newViewport: ViewportTransform): ViewportTransform => {
    const { x, y, scale } = newViewport;
    const MAX_PAN = 10000;
    
    const constrainedX = Math.min(Math.max(x, -MAX_PAN), MAX_PAN);
    const constrainedY = Math.min(Math.max(y, -MAX_PAN), MAX_PAN);
    const constrainedScale = Math.min(Math.max(scale, 0.2), 2.0); // 20% do 200%
    
    return { 
      x: constrainedX, 
      y: constrainedY, 
      scale: constrainedScale 
    };
  }, []);
  
  // 🔥 Używamy useRef aby zapobiec re-renderom przez ciągłe zmiany
  const elementsRef = useRef(elements);
  const viewportRef = useRef(viewport);
  const currentElementRef = useRef(currentElement);
  const selectedElementIdRef = useRef(selectedElementId);
  const selectedElementIdsRef = useRef(selectedElementIds);
  const isSelectingRef = useRef(isSelecting);
  const selectionStartRef = useRef(selectionStart);
  const selectionEndRef = useRef(selectionEnd);
  const isEditingTextRef = useRef(isEditingText);
  const pendingTextIdRef = useRef(pendingTextId);
  
  // Sync refs
  useEffect(() => {
    elementsRef.current = elements;
    viewportRef.current = viewport;
    currentElementRef.current = currentElement;
    selectedElementIdRef.current = selectedElementId;
    selectedElementIdsRef.current = selectedElementIds;
    isSelectingRef.current = isSelecting;
    selectionStartRef.current = selectionStart;
    selectionEndRef.current = selectionEnd;
    isEditingTextRef.current = isEditingText;
    pendingTextIdRef.current = pendingTextId;
  });
  
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, rect.width, rect.height);
    
    ctx.save();
    ctx.translate(rect.width / 2, rect.height / 2);
    ctx.scale(viewportRef.current.scale, viewportRef.current.scale);
    ctx.translate(-viewportRef.current.x, -viewportRef.current.y);
    
    drawInfiniteGrid(ctx, rect.width, rect.height);
    
    const allElements = [...elementsRef.current, ...(currentElementRef.current ? [currentElementRef.current] : [])];
    
    allElements.forEach(element => {
      const isSelected = selectedElementIdsRef.current.has(element.id) || element.id === selectedElementIdRef.current;
      const isBeingEdited = isEditingTextRef.current && element.id === pendingTextIdRef.current;
      
      if (element.type === 'path') {
        drawPath(ctx, element, isSelected);
      } else if (element.type === 'shape') {
        drawShape(ctx, element, isSelected);
      } else if (element.type === 'text') {
        if (!isBeingEdited) {
          drawText(ctx, element, isSelected);
        }
      } else if (element.type === 'function') {
        drawFunctionPlot(ctx, element, isSelected);
      }
    });
    
    // Draw group selection box if multiple elements selected
    if (selectedElementIdsRef.current.size > 1) {
      const groupBounds = getGroupBounds(selectedElementIdsRef.current);
      drawSelectionBox(ctx, groupBounds);
      drawResizeHandles(ctx, groupBounds);
    } else if (selectedElementIdRef.current) {
      // Single element selection
      const element = allElements.find(el => el.id === selectedElementIdRef.current);
      if (element) {
        const bounds = getElementBounds(element);
        drawResizeHandles(ctx, bounds);
      }
    } else if (selectedElementIdsRef.current.size === 1) {
      // Single element in set
      const id = Array.from(selectedElementIdsRef.current)[0];
      const element = allElements.find(el => el.id === id);
      if (element) {
        const bounds = getElementBounds(element);
        drawResizeHandles(ctx, bounds);
      }
    }
    
    if (isSelectingRef.current && selectionStartRef.current && selectionEndRef.current) {
      ctx.strokeStyle = '#3b82f6';
      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
      ctx.lineWidth = 1 / viewportRef.current.scale;
      ctx.setLineDash([5 / viewportRef.current.scale, 5 / viewportRef.current.scale]);
      
      const width = selectionEndRef.current.x - selectionStartRef.current.x;
      const height = selectionEndRef.current.y - selectionStartRef.current.y;
      
      ctx.fillRect(selectionStartRef.current.x, selectionStartRef.current.y, width, height);
      ctx.strokeRect(selectionStartRef.current.x, selectionStartRef.current.y, width, height);
      ctx.setLineDash([]);
    }
    
    ctx.restore();
  }, []); // 🔥 Pusta dependency array - funkcja używa refs
  
  useEffect(() => {
    redrawCanvasRef.current = redrawCanvas;
  }, [redrawCanvas]);
  
  // 🔥 Używamy requestAnimationFrame aby płynnie renderować canvas
  // bez ciągłego re-renderowania komponentu
  useEffect(() => {
    let rafId: number;
    
    const scheduleRedraw = () => {
      rafId = requestAnimationFrame(() => {
        redrawCanvasRef.current();
      });
    };
    
    scheduleRedraw();
    
    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [elements, viewport, currentElement, selectedElementId, selectedElementIds, isSelecting, selectionStart, selectionEnd, isEditingText, pendingTextId]);
  
  const drawInfiniteGrid = (ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) => {
    const gridSize = 50;
    const vp = viewportRef.current;
    
    const worldLeft = vp.x - canvasWidth / (2 * vp.scale);
    const worldRight = vp.x + canvasWidth / (2 * vp.scale);
    const worldTop = vp.y - canvasHeight / (2 * vp.scale);
    const worldBottom = vp.y + canvasHeight / (2 * vp.scale);
    
    const startX = Math.floor(worldLeft / gridSize) * gridSize;
    const endX = Math.ceil(worldRight / gridSize) * gridSize;
    const startY = Math.floor(worldTop / gridSize) * gridSize;
    const endY = Math.ceil(worldBottom / gridSize) * gridSize;
    
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1 / vp.scale;
    
    for (let x = startX; x <= endX; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
      ctx.stroke();
    }
    
    for (let y = startY; y <= endY; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
      ctx.stroke();
    }
    
    // Osie środka (0, 0) - grubsze
    ctx.strokeStyle = '#999999';
    ctx.lineWidth = 2 / vp.scale;
    
    ctx.beginPath();
    ctx.moveTo(startX, 0);
    ctx.lineTo(endX, 0);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(0, startY);
    ctx.lineTo(0, endY);
    ctx.stroke();
  };
  
  const drawPath = (ctx: CanvasRenderingContext2D, path: DrawingPath, isSelected: boolean) => {
    if (path.points.length < 2) return;
    
    ctx.strokeStyle = path.color;
    ctx.lineWidth = path.width / viewportRef.current.scale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    ctx.moveTo(path.points[0].x, path.points[0].y);
    for (let i = 1; i < path.points.length; i++) {
      ctx.lineTo(path.points[i].x, path.points[i].y);
    }
    ctx.stroke();
    
    if (isSelected) drawSelectionBox(ctx, getBoundsForPath(path));
  };
  
  const drawShape = (ctx: CanvasRenderingContext2D, shape: Shape, isSelected: boolean) => {
    ctx.strokeStyle = shape.color;
    ctx.fillStyle = shape.color;
    ctx.lineWidth = shape.strokeWidth / viewportRef.current.scale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    const width = shape.endX - shape.startX;
    const height = shape.endY - shape.startY;
    
    ctx.beginPath();
    
    if (shape.shapeType === 'rectangle') {
      ctx.rect(shape.startX, shape.startY, width, height);
    } else if (shape.shapeType === 'circle') {
      const radius = Math.sqrt(width * width + height * height) / 2;
      const centerX = shape.startX + width / 2;
      const centerY = shape.startY + height / 2;
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    } else if (shape.shapeType === 'triangle') {
      ctx.moveTo(shape.startX + width / 2, shape.startY);
      ctx.lineTo(shape.endX, shape.endY);
      ctx.lineTo(shape.startX, shape.endY);
      ctx.closePath();
    } else if (shape.shapeType === 'line') {
      ctx.moveTo(shape.startX, shape.startY);
      ctx.lineTo(shape.endX, shape.endY);
    } else if (shape.shapeType === 'arrow') {
      ctx.moveTo(shape.startX, shape.startY);
      ctx.lineTo(shape.endX, shape.endY);
      ctx.stroke();
      
      const angle = Math.atan2(shape.endY - shape.startY, shape.endX - shape.startX);
      const headLength = 15 / viewportRef.current.scale;
      
      ctx.beginPath();
      ctx.moveTo(shape.endX, shape.endY);
      ctx.lineTo(
        shape.endX - headLength * Math.cos(angle - Math.PI / 6),
        shape.endY - headLength * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        shape.endX - headLength * Math.cos(angle + Math.PI / 6),
        shape.endY - headLength * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();
      
      if (isSelected) drawSelectionBox(ctx, {
        minX: Math.min(shape.startX, shape.endX),
        minY: Math.min(shape.startY, shape.endY),
        maxX: Math.max(shape.startX, shape.endX),
        maxY: Math.max(shape.startY, shape.endY)
      });
      return;
    }
    
    if (shape.fill && shape.shapeType !== 'line') {
      ctx.globalAlpha = 0.3;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.stroke();
    
    if (isSelected) drawSelectionBox(ctx, {
      minX: Math.min(shape.startX, shape.endX),
      minY: Math.min(shape.startY, shape.endY),
      maxX: Math.max(shape.startX, shape.endX),
      maxY: Math.max(shape.startY, shape.endY)
    });
  };
  
  const drawText = (ctx: CanvasRenderingContext2D, text: TextElement, isSelected: boolean) => {
    ctx.fillStyle = text.color;
    ctx.font = `${text.fontSize}px Arial`;
    ctx.textBaseline = 'top';
    
    const lines = text.text.split('\n');
    const lineHeight = text.fontSize * 1.2;
    
    lines.forEach((line, i) => {
      ctx.fillText(line, text.x, text.y + i * lineHeight);
    });
    
    if (isSelected) {
      const maxLineWidth = Math.max(...lines.map(line => ctx.measureText(line).width));
      const width = Math.max(maxLineWidth, 50);
      const height = lineHeight * lines.length;
      
      drawSelectionBox(ctx, {
        minX: text.x,
        minY: text.y,
        maxX: text.x + width,
        maxY: text.y + height
      });
    }
  };
  
  // 🔥 RYSOWANIE FUNKCJI MATEMATYCZNEJ - POPRAWIONE
  const drawFunctionPlot = (ctx: CanvasRenderingContext2D, plot: FunctionPlot, isSelected: boolean) => {
    ctx.save();
    
    const { expression, color, strokeWidth, xRange, yRange } = plot;
    const vp = viewportRef.current;
    
    // Rysuj funkcję
    ctx.strokeStyle = color;
    ctx.lineWidth = strokeWidth / vp.scale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    let started = false;
    const samples = 1000;
    
    // Matematyczny zakres (dla funkcji typu sin, cos)
    const mathXRange = 10;  // Funkcje będą ewaluowane od -10 do +10
    const mathYScale = yRange / mathXRange; // Skalowanie Y dla widoczności
    
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      
      // World X coordinate (gdzie rysujemy)
      const worldX = -xRange + t * (xRange * 2);
      
      // Mathematical X (co przekazujemy do funkcji)
      const mathX = (worldX / xRange) * mathXRange;
      
      try {
        // Ewaluuj funkcję w mathematical space
        const mathY = evaluateExpression(expression, mathX);
        
        if (!isFinite(mathY)) {
          started = false;
          continue;
        }
        
        // Przeskaluj Y do world space
        const worldY = -mathY * mathYScale;  // Odwróć Y i przeskaluj
        
        // Clip jeśli za duże
        if (Math.abs(worldY) > yRange * 3) {
          started = false;
          continue;
        }
        
        if (!started) {
          ctx.moveTo(worldX, worldY);
          started = true;
        } else {
          ctx.lineTo(worldX, worldY);
        }
      } catch (e) {
        started = false;
      }
    }
    
    ctx.stroke();
    
    // Label funkcji
    ctx.fillStyle = color;
    ctx.font = `bold ${14}px Arial`;
    ctx.textBaseline = 'top';
    const labelPadding = 10;
    ctx.fillText(
      `f(x) = ${expression}`,
      -xRange + labelPadding,
      -yRange + labelPadding
    );
    
    // Selection box
    if (isSelected) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2 / vp.scale;
      ctx.setLineDash([5 / vp.scale, 5 / vp.scale]);
      
      const padding = 5 / vp.scale;
      ctx.strokeRect(
        -xRange - padding,
        -yRange - padding,
        xRange * 2 + padding * 2,
        yRange * 2 + padding * 2
      );
      ctx.setLineDash([]);
    }
    
    ctx.restore();
  };
  
  const drawSelectionBox = (
    ctx: CanvasRenderingContext2D,
    bounds: { minX: number; minY: number; maxX: number; maxY: number }
  ) => {
    const vp = viewportRef.current;
    const padding = 5 / vp.scale;
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2 / vp.scale;
    ctx.setLineDash([5 / vp.scale, 5 / vp.scale]);
    ctx.strokeRect(
      bounds.minX - padding,
      bounds.minY - padding,
      bounds.maxX - bounds.minX + padding * 2,
      bounds.maxY - bounds.minY + padding * 2
    );
    ctx.setLineDash([]);
  };
  
  const getBoundsForPath = (path: DrawingPath) => {
    const xs = path.points.map(p => p.x);
    const ys = path.points.map(p => p.y);
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys)
    };
  };
  
  const getCanvasPoint = (e: React.MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };
  
  const isElementInBox = (element: DrawingElement, minX: number, minY: number, maxX: number, maxY: number): boolean => {
    if (element.type === 'text') {
      return element.x >= minX && element.x <= maxX && element.y >= minY && element.y <= maxY;
    } else if (element.type === 'shape') {
      const elMinX = Math.min(element.startX, element.endX);
      const elMaxX = Math.max(element.startX, element.endX);
      const elMinY = Math.min(element.startY, element.endY);
      const elMaxY = Math.max(element.startY, element.endY);
      
      return !(elMaxX < minX || elMinX > maxX || elMaxY < minY || elMinY > maxY);
    } else if (element.type === 'path') {
      const bounds = getBoundsForPath(element);
      return !(bounds.maxX < minX || bounds.minX > maxX || bounds.maxY < minY || bounds.minY > maxY);
    } else if (element.type === 'function') {
      return !(-element.xRange > maxX || element.xRange < minX || -element.yRange > maxY || element.yRange < minY);
    }
    return false;
  };
  
  const findElementAtPoint = (canvasPoint: Point): DrawingElement | null => {
    for (let i = elements.length - 1; i >= 0; i--) {
      const element = elements[i];
      const padding = 10;
      
      if (element.type === 'text') {
        const bounds = getElementBounds(element);
        if (
          canvasPoint.x >= bounds.minX - padding &&
          canvasPoint.x <= bounds.maxX + padding &&
          canvasPoint.y >= bounds.minY - padding &&
          canvasPoint.y <= bounds.maxY + padding
        ) {
          return element;
        }
      } else if (element.type === 'shape') {
        const minX = Math.min(element.startX, element.endX);
        const maxX = Math.max(element.startX, element.endX);
        const minY = Math.min(element.startY, element.endY);
        const maxY = Math.max(element.startY, element.endY);
        
        if (
          canvasPoint.x >= minX - padding &&
          canvasPoint.x <= maxX + padding &&
          canvasPoint.y >= minY - padding &&
          canvasPoint.y <= maxY + padding
        ) {
          return element;
        }
      } else if (element.type === 'path') {
        const bounds = getBoundsForPath(element);
        if (
          canvasPoint.x >= bounds.minX - padding &&
          canvasPoint.x <= bounds.maxX + padding &&
          canvasPoint.y >= bounds.minY - padding &&
          canvasPoint.y <= bounds.maxY + padding
        ) {
          return element;
        }
      } else if (element.type === 'function') {
        if (
          canvasPoint.x >= -element.xRange - padding &&
          canvasPoint.x <= element.xRange + padding &&
          canvasPoint.y >= -element.yRange - padding &&
          canvasPoint.y <= element.yRange + padding
        ) {
          return element;
        }
      }
    }
    return null;
  };
  
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isEditingText) {
      finishTextInput();
      return;
    }
    
    const screenPoint = getCanvasPoint(e);
    const canvasPoint = screenToCanvas(screenPoint.x, screenPoint.y);
    
    // Pan mode
    if (tool === 'pan' || e.button === 1 || e.button === 2 || (e.button === 0 && (e.ctrlKey || e.metaKey))) {
      e.preventDefault();
      setIsPanning(true);
      setLastPanPoint(screenPoint);
      return;
    }
    
    // Select mode
    if (tool === 'select') {
      const element = findElementAtPoint(canvasPoint);
      
      // Check for resize handle on group or single element
      const idsToCheck: Set<string> = selectedElementIds.size > 0 ? selectedElementIds : (selectedElementId ? new Set([selectedElementId]) : new Set());
      
      if (idsToCheck.size > 0) {
        const bounds = idsToCheck.size > 1 ? getGroupBounds(idsToCheck) : getElementBounds(elements.find(el => el.id === Array.from(idsToCheck)[0])!);
        const handle = getHandleAtPoint(bounds, canvasPoint);
        
        if (handle) {
          setIsResizing(true);
          setResizeHandle(handle);
          setDragStartPoint(canvasPoint);
          
          // Store all selected elements for group resize
          const elementsToStore = new Map();
          elements.forEach(el => {
            if (idsToCheck.has(el.id)) {
              elementsToStore.set(el.id, { ...el });
            }
          });
          
          setDraggedElementsStart(elementsToStore);
          return;
        }
      }
      
      if (element && (selectedElementIds.has(element.id) || element.id === selectedElementId)) {
        // Element clicked but not on handle - prepare for drag
      }
      
      if (element) {
        if (e.ctrlKey || e.metaKey) {
          setSelectedElementIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(element.id)) {
              newSet.delete(element.id);
            } else {
              newSet.add(element.id);
            }
            return newSet;
          });
        } else if (selectedElementIds.has(element.id)) {
          const elementsToSave = new Map();
          elements.forEach(el => {
            if (selectedElementIds.has(el.id)) {
              elementsToSave.set(el.id, { ...el });
            }
          });
          setIsDraggingElement(true);
          setDragStartPoint(canvasPoint);
          setDraggedElementsStart(elementsToSave);
        } else {
          setSelectedElementIds(new Set([element.id]));
          setSelectedElementId(element.id);
          const elementsToSave = new Map();
          elementsToSave.set(element.id, { ...element });
          setIsDraggingElement(true);
          setDragStartPoint(canvasPoint);
          setDraggedElementsStart(elementsToSave);
        }
      } else {
        if (!e.ctrlKey && !e.metaKey) {
          setSelectedElementIds(new Set());
          setSelectedElementId(null);
        }
        setIsSelecting(true);
        setSelectionStart(canvasPoint);
        setSelectionEnd(canvasPoint);
      }
      return;
    }
    
    // TEXT TOOL
    if (tool === 'text') {
      const element = findElementAtPoint(canvasPoint);
      if (element && element.type === 'text') {
        const screenPos = canvasToScreen(element.x, element.y);
        startTextInput(screenPos, canvasPoint, element);
        return;
      }
      
      setIsDrawing(true);
      const textBox: Shape = {
        id: Date.now().toString(),
        type: 'shape',
        shapeType: 'rectangle',
        startX: canvasPoint.x,
        startY: canvasPoint.y,
        endX: canvasPoint.x,
        endY: canvasPoint.y,
        color: '#3b82f6',
        strokeWidth: 2,
        fill: false
      };
      setCurrentElement(textBox);
      return;
    }
    
    // FUNCTION TOOL - nie rysujemy nic, tylko toolbar obsługuje
    if (tool === 'function') {
      // Funkcja jest generowana z toolbara, więc tutaj nic nie robimy
      return;
    }
    
    // Drawing tools
    setIsDrawing(true);
    
    if (tool === 'pen') {
      const newPath: DrawingPath = {
        id: Date.now().toString(),
        type: 'path',
        points: [canvasPoint],
        color,
        width: lineWidth
      };
      setCurrentElement(newPath);
    } else if (tool === 'shape') {
      const newShape: Shape = {
        id: Date.now().toString(),
        type: 'shape',
        shapeType: selectedShape,
        startX: canvasPoint.x,
        startY: canvasPoint.y,
        endX: canvasPoint.x,
        endY: canvasPoint.y,
        color,
        strokeWidth: lineWidth,
        fill: fillShape
      };
      setCurrentElement(newShape);
    }
  };
  
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const screenPoint = getCanvasPoint(e);
    
    if (isPanning && lastPanPoint) {
      const dx = screenPoint.x - lastPanPoint.x;
      const dy = screenPoint.y - lastPanPoint.y;
      
      const worldDx = -dx / viewport.scale;
      const worldDy = -dy / viewport.scale;
      
      setViewport(prev => {
        const newViewport = {
          ...prev,
          x: prev.x + worldDx,
          y: prev.y + worldDy
        };
        return constrainViewport(newViewport);
      });
      setLastPanPoint(screenPoint);
      return;
    }
    
    const canvasPoint = screenToCanvas(screenPoint.x, screenPoint.y);
    
    if (isResizing && dragStartPoint && resizeHandle) {
      const dx = canvasPoint.x - dragStartPoint.x;
      const dy = canvasPoint.y - dragStartPoint.y;
      
      const elementsToResize = selectedElementIds.size > 0 ? selectedElementIds : new Set([selectedElementId!]);
      
      // Get original group bounds from stored elements (IMPORTANT!)
      let origMinX = Infinity;
      let origMinY = Infinity;
      let origMaxX = -Infinity;
      let origMaxY = -Infinity;
      
      draggedElementsStart.forEach((origEl, id) => {
        if (elementsToResize.has(id)) {
          const bounds = getElementBounds(origEl);
          origMinX = Math.min(origMinX, bounds.minX);
          origMinY = Math.min(origMinY, bounds.minY);
          origMaxX = Math.max(origMaxX, bounds.maxX);
          origMaxY = Math.max(origMaxY, bounds.maxY);
        }
      });
      
      const origWidth = origMaxX - origMinX;
      const origHeight = origMaxY - origMinY;
      
      // Calculate new bounds based on handle
      let newMinX = origMinX;
      let newMinY = origMinY;
      let newMaxX = origMaxX;
      let newMaxY = origMaxY;
      
      if (resizeHandle === 'tl') {
        newMinX = origMinX + dx;
        newMinY = origMinY + dy;
      } else if (resizeHandle === 'tr') {
        newMaxX = origMaxX + dx;
        newMinY = origMinY + dy;
      } else if (resizeHandle === 'br') {
        newMaxX = origMaxX + dx;
        newMaxY = origMaxY + dy;
      } else if (resizeHandle === 'bl') {
        newMinX = origMinX + dx;
        newMaxY = origMaxY + dy;
      }
      
      // Prevent negative dimensions
      if (newMaxX - newMinX < 10) {
        if (resizeHandle === 'tl' || resizeHandle === 'bl') {
          newMinX = newMaxX - 10;
        } else {
          newMaxX = newMinX + 10;
        }
      }
      if (newMaxY - newMinY < 10) {
        if (resizeHandle === 'tl' || resizeHandle === 'tr') {
          newMinY = newMaxY - 10;
        } else {
          newMaxY = newMinY + 10;
        }
      }
      
      const newWidth = newMaxX - newMinX;
      const newHeight = newMaxY - newMinY;
      const scaleX = newWidth / origWidth;
      const scaleY = newHeight / origHeight;
      
      setElements(prev => prev.map(el => {
        if (!elementsToResize.has(el.id)) return el;
        
        const origElement = draggedElementsStart.get(el.id);
        if (!origElement) return el;
        
        if (el.type === 'shape') {
          const origShape = origElement as Shape;
          
          // Map from original bounds to new bounds
          const newStartX = newMinX + (origShape.startX - origMinX) * scaleX;
          const newStartY = newMinY + (origShape.startY - origMinY) * scaleY;
          const newEndX = newMinX + (origShape.endX - origMinX) * scaleX;
          const newEndY = newMinY + (origShape.endY - origMinY) * scaleY;
          
          return {
            ...el,
            startX: newStartX,
            startY: newStartY,
            endX: newEndX,
            endY: newEndY
          };
        } else if (el.type === 'path') {
          const origPath = origElement as DrawingPath;
          
          return {
            ...el,
            points: origPath.points.map(p => ({
              x: newMinX + (p.x - origMinX) * scaleX,
              y: newMinY + (p.y - origMinY) * scaleY
            }))
          };
        } else if (el.type === 'text') {
          const origText = origElement as TextElement;
          
          // Map position from original bounds to new bounds
          const newX = newMinX + (origText.x - origMinX) * scaleX;
          const newY = newMinY + (origText.y - origMinY) * scaleY;
          
          // Scale font size
          const avgScale = (scaleX + scaleY) / 2;
          const newFontSize = Math.max(12, Math.min(500, origText.fontSize * avgScale));
          
          return {
            ...el,
            x: newX,
            y: newY,
            fontSize: newFontSize
          };
        } else if (el.type === 'function') {
          const origFunc = origElement as FunctionPlot;
          
          // For functions, just scale the ranges
          const newXRange = Math.max(100, origFunc.xRange * scaleX);
          const newYRange = Math.max(100, origFunc.yRange * scaleY);
          
          return {
            ...el,
            xRange: newXRange,
            yRange: newYRange
          };
        }
        
        return el;
      }));
      return;
    }
    
        if (isSelecting && selectionStart) {
      setSelectionEnd(canvasPoint);
      return;
    }
    
    if (isDraggingElement && dragStartPoint && draggedElementsStart.size > 0) {
      const dx = canvasPoint.x - dragStartPoint.x;
      const dy = canvasPoint.y - dragStartPoint.y;
      
      setElements(prev => prev.map(el => {
        const startEl = draggedElementsStart.get(el.id);
        if (!startEl) return el;
        
        if (el.type === 'text') {
          const textStartEl = startEl as TextElement;
          return { ...el, x: textStartEl.x + dx, y: textStartEl.y + dy };
        } else if (el.type === 'shape') {
          const shapeStartEl = startEl as Shape;
          return {
            ...el,
            startX: shapeStartEl.startX + dx,
            startY: shapeStartEl.startY + dy,
            endX: shapeStartEl.endX + dx,
            endY: shapeStartEl.endY + dy
          };
        } else if (el.type === 'path') {
          const pathStartEl = startEl as DrawingPath;
          return {
            ...el,
            points: pathStartEl.points.map((p: Point) => ({ 
              x: p.x + dx, 
              y: p.y + dy 
            }))
          };
        }
        return el;
      }));
      return;
    }
    
    if (!isDrawing || !currentElement) return;
    
    if (currentElement.type === 'path') {
      setCurrentElement(prev => ({
        ...prev!,
        points: [...(prev as DrawingPath).points, canvasPoint]
      } as DrawingPath));
    } else if (currentElement.type === 'shape') {
      setCurrentElement(prev => ({
        ...prev!,
        endX: canvasPoint.x,
        endY: canvasPoint.y
      }));
    }
  };
  
  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      setLastPanPoint(null);
      return;
    }
    
    if (isResizing) {
      setIsResizing(false);
      setResizeHandle(null);
      setDragStartPoint(null);
      setResizeOriginalElement(null);
      saveToHistory();
      return;
    }
    
    if (isSelecting && selectionStart && selectionEnd) {
      const minX = Math.min(selectionStart.x, selectionEnd.x);
      const maxX = Math.max(selectionStart.x, selectionEnd.x);
      const minY = Math.min(selectionStart.y, selectionEnd.y);
      const maxY = Math.max(selectionStart.y, selectionEnd.y);
      
      const selectedIds = new Set<string>();
      elements.forEach(element => {
        if (isElementInBox(element, minX, minY, maxX, maxY)) {
          selectedIds.add(element.id);
        }
      });
      
      setSelectedElementIds(selectedIds);
      setSelectedElementId(selectedIds.size === 1 ? Array.from(selectedIds)[0] : null);
      setIsSelecting(false);
      setSelectionStart(null);
      setSelectionEnd(null);
      return;
    }
    
    if (isDraggingElement) {
      setIsDraggingElement(false);
      setDragStartPoint(null);
      setDraggedElementsStart(new Map());
      saveToHistory();
      return;
    }
    
    if (isDrawing && currentElement) {
      if (tool === 'text' && currentElement.type === 'shape') {
        const minX = Math.min(currentElement.startX, currentElement.endX);
        const maxX = Math.max(currentElement.startX, currentElement.endX);
        const minY = Math.min(currentElement.startY, currentElement.endY);
        const maxY = Math.max(currentElement.startY, currentElement.endY);
        
        const width = maxX - minX;
        const height = maxY - minY;
        
        const finalWidth = width < 50 ? 150 : width;
        const finalHeight = height < 30 ? 40 : height;
        const finalMinX = width < 50 ? currentElement.startX : minX;
        const finalMinY = height < 30 ? currentElement.startY : minY;
        
        const screenHeight = finalHeight * viewport.scale;
        const newFontSize = Math.max(12, Math.min(screenHeight * 0.6, 500));
        setFontSize(newFontSize);
        
        const topLeft = canvasToScreen(finalMinX, finalMinY);
        
        const id = Date.now().toString();
        const newText: TextElement = {
          id,
          type: 'text',
          x: finalMinX,
          y: finalMinY,
          text: '',
          fontSize: newFontSize,
          color
        };
        setElements(prev => [...prev, newText]);
        
        setPendingTextId(id);
        setTextDraft('');
        setTextPosition({ 
          x: topLeft.x, 
          y: topLeft.y
        });
        setTextBoxSize({
          width: finalWidth * viewport.scale,
          height: finalHeight * viewport.scale
        });
        setIsEditingText(true);
        setCurrentElement(null);
        
        setTimeout(() => {
          textInputRef.current?.focus();
        }, 0);
      } else {
        const newElements = [...elements, currentElement];
        setElements(newElements);
        setCurrentElement(null);
        saveToHistory(newElements); // Przekaż nowe elements
      }
    }
    
    setIsDrawing(false);
  };
  
  const startTextInput = (screenPoint: Point, canvasPoint: Point, existingText?: TextElement) => {
    if (existingText) {
      setPendingTextId(existingText.id);
      setTextDraft(existingText.text);
      setFontSize(existingText.fontSize);
      setColor(existingText.color);
      
      const screenPos = canvasToScreen(existingText.x, existingText.y);
      setTextPosition(screenPos);
      
      const estimatedWidth = Math.max(150, existingText.text.length * existingText.fontSize * 0.6);
      const estimatedHeight = existingText.fontSize * 1.5;
      setTextBoxSize({
        width: estimatedWidth,
        height: estimatedHeight
      });
    } else {
      const id = Date.now().toString();
      setPendingTextId(id);
      setTextDraft('');
      setTextPosition(screenPoint);
      
      setTextBoxSize({
        width: 150,
        height: 40
      });
      
      const newText: TextElement = {
        id,
        type: 'text',
        x: canvasPoint.x,
        y: canvasPoint.y,
        text: '',
        fontSize,
        color
      };
      setElements(prev => [...prev, newText]);
    }
    
    setIsEditingText(true);
    
    setTimeout(() => {
      textInputRef.current?.focus();
      textInputRef.current?.select();
    }, 0);
  };
  
  const finishTextInput = () => {
    if (!pendingTextId) return;
    
    const trimmedText = textDraft.trim();
    
    if (!trimmedText) {
      setElements(prev => prev.filter(el => el.id !== pendingTextId));
      cancelTextInput();
      return;
    }
    
    const newElements = elements.map(el => 
      el.id === pendingTextId && el.type === 'text'
        ? { ...el, text: trimmedText, fontSize, color } as TextElement
        : el
    );
    setElements(newElements);
    
    saveToHistory(newElements); // Przekaż nowe elements
    cancelTextInput();
  };
  
  const cancelTextInput = () => {
    setIsEditingText(false);
    setTextPosition(null);
    setTextBoxSize(null);
    setTextDraft('');
    setPendingTextId(null);
  };
  
  const deleteSelectedElement = () => {
    if (selectedElementIds.size === 0 && !selectedElementId) return;
    
    setElements(prev => prev.filter(el => 
      !selectedElementIds.has(el.id) && el.id !== selectedElementId
    ));
    setSelectedElementIds(new Set());
    setSelectedElementId(null);
    saveToHistory();
  };
  
  // 🔥 saveToHistory - używa useRef pattern + akceptuje opcjonalnie nowe elements
  const saveToHistoryRef = useRef((newElements?: DrawingElement[]) => {
    const elementsToSave = newElements !== undefined ? newElements : elementsRef.current;
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...elementsToSave]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  });
  
  useEffect(() => {
    saveToHistoryRef.current = (newElements?: DrawingElement[]) => {
      const elementsToSave = newElements !== undefined ? newElements : elementsRef.current;
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push([...elementsToSave]);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    };
  }, [history, historyIndex]);
  
  const saveToHistory = useCallback((newElements?: DrawingElement[]) => {
    saveToHistoryRef.current(newElements);
  }, []);
  
  // 🔥 STABILNE REFS dla akcji Toolbar
  const undoRef = useRef(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setElements([...history[historyIndex - 1]]);
    }
  });
  
  const redoRef = useRef(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setElements([...history[historyIndex + 1]]);
    }
  });
  
  const clearCanvasRef = useRef(() => {
    if (confirm('Czy na pewno chcesz wyczyścić całą tablicę?')) {
      setElements([]);
      setSelectedElementId(null);
      setSelectedElementIds(new Set());
      saveToHistory();
    }
  });
  
  const resetViewRef = useRef(() => {
    setViewport({ x: 0, y: 0, scale: 1 });
  });
  
  const zoomInRef = useRef(() => {
    setViewport(prev => constrainViewport({ 
      ...prev, 
      scale: prev.scale * 1.2 
    }));
  });
  
  const zoomOutRef = useRef(() => {
    setViewport(prev => constrainViewport({ 
      ...prev, 
      scale: prev.scale / 1.2 
    }));
  });
  
  // Update refs
  useEffect(() => {
    undoRef.current = () => {
      if (historyIndex > 0) {
        setHistoryIndex(historyIndex - 1);
        setElements([...history[historyIndex - 1]]);
      }
    };
    
    redoRef.current = () => {
      if (historyIndex < history.length - 1) {
        setHistoryIndex(historyIndex + 1);
        setElements([...history[historyIndex + 1]]);
      }
    };
    
    clearCanvasRef.current = () => {
      if (confirm('Czy na pewno chcesz wyczyścić całą tablicę?')) {
        setElements([]);
        setSelectedElementId(null);
        setSelectedElementIds(new Set());
        saveToHistoryRef.current([]); // Przekaż puste elements
      }
    };
  }, [historyIndex, history]);
  
  // Stable callbacks
  const undo = useCallback(() => undoRef.current(), []);
  const redo = useCallback(() => redoRef.current(), []);
  const clearCanvas = useCallback(() => clearCanvasRef.current(), []);
  const resetView = useCallback(() => resetViewRef.current(), []);
  const zoomIn = useCallback(() => zoomInRef.current(), []);
  const zoomOut = useCallback(() => zoomOutRef.current(), []);
  
  // 🔥 STABILNE CALLBACKI - używamy useRef aby referencje NIGDY się nie zmieniały
  // To zapobiega re-renderom Toolbar przy każdym ruchu myszki/rysowaniu
  const handleToolChangeRef = useRef((newTool: Tool) => setTool(newTool));
  const handleShapeChangeRef = useRef((shape: ShapeType) => setSelectedShape(shape));
  const handleColorChangeRef = useRef((newColor: string) => setColor(newColor));
  const handleLineWidthChangeRef = useRef((width: number) => setLineWidth(width));
  const handleFontSizeChangeRef = useRef((size: number) => setFontSize(size));
  const handleFillShapeChangeRef = useRef((fill: boolean) => setFillShape(fill));
  
  // Update refs when state setters might change (never, but for safety)
  useEffect(() => {
    handleToolChangeRef.current = (newTool: Tool) => setTool(newTool);
    handleShapeChangeRef.current = (shape: ShapeType) => setSelectedShape(shape);
    handleColorChangeRef.current = (newColor: string) => setColor(newColor);
    handleLineWidthChangeRef.current = (width: number) => setLineWidth(width);
    handleFontSizeChangeRef.current = (size: number) => setFontSize(size);
    handleFillShapeChangeRef.current = (fill: boolean) => setFillShape(fill);
  });
  
  // Stable function references - NEVER change
  const handleToolChange = useCallback((newTool: Tool) => {
    handleToolChangeRef.current(newTool);
  }, []);
  
  const handleShapeChange = useCallback((shape: ShapeType) => {
    handleShapeChangeRef.current(shape);
  }, []);
  
  const handleColorChange = useCallback((newColor: string) => {
    handleColorChangeRef.current(newColor);
  }, []);
  
  const handleLineWidthChange = useCallback((width: number) => {
    handleLineWidthChangeRef.current(width);
  }, []);
  
  const handleFontSizeChange = useCallback((size: number) => {
    handleFontSizeChangeRef.current(size);
  }, []);
  
  const handleFillShapeChange = useCallback((fill: boolean) => {
    handleFillShapeChangeRef.current(fill);
  }, []);
  
  // 🔥 GENEROWANIE FUNKCJI - stable callback
  const handleGenerateFunctionRef = useRef((expression: string) => {
    const xRange = 1000;
    const yRange = 1000;
    
    const newFunction: FunctionPlot = {
      id: Date.now().toString(),
      type: 'function',
      expression,
      color,
      strokeWidth: lineWidth,
      xRange,
      yRange
    };
    
    const currentElements = elementsRef.current;
    const newElements = [...currentElements, newFunction];
    setElements(newElements);
    saveToHistoryRef.current(newElements);
    setTool('select');
  });
  
  useEffect(() => {
    handleGenerateFunctionRef.current = (expression: string) => {
      const xRange = 1000;
      const yRange = 1000;
      
      const newFunction: FunctionPlot = {
        id: Date.now().toString(),
        type: 'function',
        expression,
        color,
        strokeWidth: lineWidth,
        xRange,
        yRange
      };
      
      // Najpierw pobierz aktualne elements z ref
      const currentElements = elementsRef.current;
      const newElements = [...currentElements, newFunction];
      setElements(newElements);
      saveToHistoryRef.current(newElements); // Przekaż nowe elements
      setTool('select');
    };
  }, [color, lineWidth]);
  
  const handleGenerateFunction = useCallback((expression: string) => {
    handleGenerateFunctionRef.current(expression);
  }, []);
  
  // 🔥 Zmemoizowane wartości canUndo/canRedo - zapobiega re-renderom Toolbar
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  
  // Touch events handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault(); // Zapobiega scrollowaniu podczas rysowania
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const mouseEvent = {
        clientX: touch.clientX,
        clientY: touch.clientY,
        button: 0,
        ctrlKey: false,
        metaKey: false,
        preventDefault: () => {}
      } as unknown as React.MouseEvent<HTMLCanvasElement>;
      
      handleMouseDown(mouseEvent);
    }
  };
  
  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault(); // Zapobiega scrollowaniu podczas rysowania
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const mouseEvent = {
        clientX: touch.clientX,
        clientY: touch.clientY,
        button: 0,
        preventDefault: () => {}
      } as unknown as React.MouseEvent<HTMLCanvasElement>;
      
      handleMouseMove(mouseEvent);
    }
  };
  
  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    handleMouseUp();
  };
  
  return (
    <div className={`relative w-full h-full bg-white ${className}`}>
      <div ref={containerRef} className="absolute inset-0 overflow-hidden">
        <Toolbar
          tool={tool}
          setTool={handleToolChange}
          selectedShape={selectedShape}
          setSelectedShape={handleShapeChange}
          color={color}
          setColor={handleColorChange}
          lineWidth={lineWidth}
          setLineWidth={handleLineWidthChange}
          fontSize={fontSize}
          setFontSize={handleFontSizeChange}
          fillShape={fillShape}
          setFillShape={handleFillShapeChange}
          onUndo={undo}
          onRedo={redo}
          onClear={clearCanvas}
          onResetView={resetView}
          onGenerateFunction={handleGenerateFunction}
          canUndo={canUndo}
          canRedo={canRedo}
          splitSize={splitSize}
          onToggleView={onToggleView}
        />
        
        <ZoomControls
          zoom={viewport.scale}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onResetView={resetView}
        />
        
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onContextMenu={(e) => e.preventDefault()}
          className="absolute inset-0 w-full h-full"
          style={{
            cursor: 
              tool === 'pan' || isPanning ? 'grab' : 
              tool === 'select' ? 'default' : 
              tool === 'text' ? 'text' :
              'crosshair',
            willChange: 'auto',
            imageRendering: 'crisp-edges'
          }}
        />
        
        {isEditingText && textPosition && textBoxSize && (
          <textarea
            ref={textInputRef}
            value={textDraft}
            onChange={(e) => setTextDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                finishTextInput();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                finishTextInput();
              }
            }}
            onBlur={finishTextInput}
            placeholder=""
            className="absolute z-50 px-2 py-1 outline-none border-2 border-blue-500 bg-white/90 resize-none overflow-hidden"
            style={{
              left: `${textPosition.x}px`,
              top: `${textPosition.y}px`,
              width: `${textBoxSize.width}px`,
              height: `${textBoxSize.height}px`,
              fontSize: `${fontSize}px`,
              color: color,
              lineHeight: '1.2',
              fontFamily: 'Arial, sans-serif',
              whiteSpace: 'pre-wrap',
              boxSizing: 'border-box'
            }}
            autoFocus
          />
        )}
      </div>
    </div>
  );
}