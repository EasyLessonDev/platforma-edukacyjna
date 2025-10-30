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
  xRange: number;
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
}

// Math expression evaluator
function evaluateExpression(expr: string, x: number): number {
  let processed = expr
    .replace(/\^/g, '**')
    .replace(/(\d)([a-z])/gi, '$1*$2')
    .replace(/\)(\d)/g, ')*$1')
    .replace(/(\d)\(/g, '$1*(');

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

export function WhiteboardCanvas({ className = '' }: WhiteboardCanvasProps) {
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
  
  // Refs for stable callbacks
  const elementsRef = useRef(elements);
  const saveToHistoryRef = useRef<(els: DrawingElement[]) => void>(() => {});
  
  useEffect(() => {
    elementsRef.current = elements;
  }, [elements]);

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
    
    const debouncedUpdateCanvasSize = () => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      resizeTimeout = setTimeout(updateCanvasSize, 100);
    };
    
    updateCanvasSize();
    window.addEventListener('resize', debouncedUpdateCanvasSize);
    
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
  
  // Wheel/Touchpad handling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const handleWheel = (e: WheelEvent) => {
      if (isEditingText) return;
      e.preventDefault();
      
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      // Rozróżnienie: pinch zoom (ctrlKey) vs scroll (przesuwanie)
      if (e.ctrlKey) {
        // PINCH ZOOM (dwa palce: do siebie/od siebie)
        const zoomIntensity = 0.1;
        const delta = -e.deltaY;
        const scaleChange = 1 + (delta > 0 ? zoomIntensity : -zoomIntensity);
        
        const oldScale = viewport.scale;
        const newScale = Math.min(Math.max(oldScale * scaleChange, 0.2), 5.0); // Zwiększony max zoom do 500%
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const mouseRelX = mouseX - centerX;
        const mouseRelY = mouseY - centerY;
        
        const worldX = viewport.x + mouseRelX / oldScale;
        const worldY = viewport.y + mouseRelY / oldScale;
        
        const newViewportX = worldX - mouseRelX / newScale;
        const newViewportY = worldY - mouseRelY / newScale;
        
        setViewport({
          x: newViewportX,
          y: newViewportY,
          scale: newScale
        });
      } else {
        // SCROLL/PAN (dwa palce: w lewo/prawo/góra/dół)
        const panSpeed = 1.0;
        const dx = e.deltaX * panSpeed;
        const dy = e.deltaY * panSpeed;
        
        setViewport(prev => ({
          ...prev,
          x: prev.x + dx / prev.scale,
          y: prev.y + dy / prev.scale
        }));
      }
    };
    
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [viewport, isEditingText]);

  // Constrain viewport - WYŁĄCZONE, nieskończona tablica
  const constrainViewport = (vp: ViewportTransform): ViewportTransform => {
    // Bez ograniczeń - pełna swoboda
    return vp;
  };

  // Drawing functions
  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const gridSize = 50 * viewport.scale; // 1 kratka = 50px
    
    // === NAJPIERW SIATKA (w tle) ===
    ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    
    // Oblicz zakres widocznych kratek w światowych współrzędnych
    const startX = Math.floor((viewport.x - width / (2 * viewport.scale)) / 50) * 50;
    const endX = Math.ceil((viewport.x + width / (2 * viewport.scale)) / 50) * 50;
    const startY = Math.floor((viewport.y - height / (2 * viewport.scale)) / 50) * 50;
    const endY = Math.ceil((viewport.y + height / (2 * viewport.scale)) / 50) * 50;
    
    // Rysuj pionowe linie siatki (co 50px w świecie)
    for (let worldX = startX; worldX <= endX; worldX += 50) {
      const screenPos = transformPoint({ x: worldX, y: 0 });
      ctx.moveTo(screenPos.x, 0);
      ctx.lineTo(screenPos.x, height);
    }
    
    // Rysuj poziome linie siatki (co 50px w świecie)
    for (let worldY = startY; worldY <= endY; worldY += 50) {
      const screenPos = transformPoint({ x: 0, y: worldY });
      ctx.moveTo(0, screenPos.y);
      ctx.lineTo(width, screenPos.y);
    }
    
    ctx.stroke();
    
    // === TERAZ OSIE (na wierzchu siatki, ale WBUDOWANE w kratki) ===
    const origin = transformPoint({ x: 0, y: 0 });
    
    // Oś X (czerwona) - dokładnie na kratce Y=0
    ctx.strokeStyle = 'rgba(220, 38, 38, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, origin.y);
    ctx.lineTo(width, origin.y);
    ctx.stroke();
    
    // Oś Y (niebieska) - dokładnie na kratce X=0
    ctx.strokeStyle = 'rgba(37, 99, 235, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(origin.x, 0);
    ctx.lineTo(origin.x, height);
    ctx.stroke();
    
    // === PODZIAŁKA NA OSIACH - CO 50px (co 1 kratkę!) ===
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.font = `${Math.max(10, 12 * viewport.scale)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    // Podziałka na osi X (co 50px)
    for (let worldX = startX; worldX <= endX; worldX += 50) {
      if (worldX === 0) continue; // Pomijamy (0,0)
      
      const screenPos = transformPoint({ x: worldX, y: 0 });
      
      if (screenPos.x >= 0 && screenPos.x <= width) {
        // Liczba
        ctx.fillText(worldX.toString(), screenPos.x, origin.y + 8);
        
        // Kreska na osi
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(screenPos.x, origin.y - 6);
        ctx.lineTo(screenPos.x, origin.y + 6);
        ctx.stroke();
      }
    }
    
    // Podziałka na osi Y (co 50px)
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    
    for (let worldY = startY; worldY <= endY; worldY += 50) {
      if (worldY === 0) continue; // Pomijamy (0,0)
      
      const screenPos = transformPoint({ x: 0, y: worldY });
      
      if (screenPos.y >= 0 && screenPos.y <= height) {
        // Liczba (minus bo Y w canvas idzie w dół, a my chcemy normalny układ)
        ctx.fillText((-worldY).toString(), origin.x + 10, screenPos.y);
        
        // Kreska na osi
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(origin.x - 6, screenPos.y);
        ctx.lineTo(origin.x + 6, screenPos.y);
        ctx.stroke();
      }
    }
    
    // === PUNKT (0,0) - zaznacz go wyraźnie ===
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Etykieta (0,0)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.font = `${Math.max(12, 14 * viewport.scale)}px Arial`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText('(0, 0)', origin.x + 8, origin.y - 8);
  };

  const drawPath = (ctx: CanvasRenderingContext2D, path: DrawingPath) => {
    if (path.points.length < 2) return;
    
    ctx.strokeStyle = path.color;
    ctx.lineWidth = path.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    
    const startPoint = transformPoint(path.points[0]);
    ctx.moveTo(startPoint.x, startPoint.y);
    
    for (let i = 1; i < path.points.length; i++) {
      const point = transformPoint(path.points[i]);
      ctx.lineTo(point.x, point.y);
    }
    
    ctx.stroke();
  };

  const drawShape = (ctx: CanvasRenderingContext2D, shape: Shape) => {
    const start = transformPoint({ x: shape.startX, y: shape.startY });
    const end = transformPoint({ x: shape.endX, y: shape.endY });
    
    ctx.strokeStyle = shape.color;
    ctx.fillStyle = shape.color;
    ctx.lineWidth = shape.strokeWidth;
    
    switch (shape.shapeType) {
      case 'rectangle':
        if (shape.fill) {
          ctx.fillRect(start.x, start.y, end.x - start.x, end.y - start.y);
        } else {
          ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
        }
        break;
      
      case 'circle':
        const radiusX = Math.abs(end.x - start.x) / 2;
        const radiusY = Math.abs(end.y - start.y) / 2;
        const centerX = (start.x + end.x) / 2;
        const centerY = (start.y + end.y) / 2;
        
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
        if (shape.fill) {
          ctx.fill();
        } else {
          ctx.stroke();
        }
        break;
      
      case 'triangle':
        const midX = (start.x + end.x) / 2;
        ctx.beginPath();
        ctx.moveTo(midX, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.lineTo(start.x, end.y);
        ctx.closePath();
        if (shape.fill) {
          ctx.fill();
        } else {
          ctx.stroke();
        }
        break;
      
      case 'line':
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        break;
      
      case 'arrow':
        const headlen = 15;
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(
          end.x - headlen * Math.cos(angle - Math.PI / 6),
          end.y - headlen * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(
          end.x - headlen * Math.cos(angle + Math.PI / 6),
          end.y - headlen * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
        break;
    }
  };

  const drawText = (ctx: CanvasRenderingContext2D, textEl: TextElement) => {
    const pos = transformPoint({ x: textEl.x, y: textEl.y });
    ctx.fillStyle = textEl.color;
    ctx.font = `${textEl.fontSize * viewport.scale}px Arial`;
    ctx.textBaseline = 'top';
    
    const lines = textEl.text.split('\n');
    lines.forEach((line, i) => {
      ctx.fillText(line, pos.x, pos.y + i * textEl.fontSize * viewport.scale * 1.2);
    });
  };

  const drawFunction = (ctx: CanvasRenderingContext2D, func: FunctionPlot) => {
    ctx.strokeStyle = func.color;
    ctx.lineWidth = func.strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    
    let started = false;
    const step = 2 / viewport.scale;
    
    for (let worldX = -func.xRange; worldX <= func.xRange; worldX += step) {
      try {
        const worldY = evaluateExpression(func.expression, worldX);
        
        if (!isFinite(worldY)) continue;
        if (Math.abs(worldY) > func.yRange) continue;
        
        const screenPos = transformPoint({ x: worldX, y: -worldY });
        
        if (!started) {
          ctx.moveTo(screenPos.x, screenPos.y);
          started = true;
        } else {
          ctx.lineTo(screenPos.x, screenPos.y);
        }
      } catch (e) {
        started = false;
      }
    }
    
    if (started) {
      ctx.stroke();
    }
  };

  const drawElement = (ctx: CanvasRenderingContext2D, element: DrawingElement) => {
    if (element.type === 'path') {
      drawPath(ctx, element);
    } else if (element.type === 'shape') {
      drawShape(ctx, element);
    } else if (element.type === 'text') {
      drawText(ctx, element);
    } else if (element.type === 'function') {
      drawFunction(ctx, element);
    }
  };

  const transformPoint = (point: Point): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return point;
    
    const centerX = canvas.width / (window.devicePixelRatio || 1) / 2;
    const centerY = canvas.height / (window.devicePixelRatio || 1) / 2;
    
    return {
      x: (point.x - viewport.x) * viewport.scale + centerX,
      y: (point.y - viewport.y) * viewport.scale + centerY
    };
  };

  const inverseTransformPoint = (point: Point): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return point;
    
    const centerX = canvas.width / (window.devicePixelRatio || 1) / 2;
    const centerY = canvas.height / (window.devicePixelRatio || 1) / 2;
    
    return {
      x: (point.x - centerX) / viewport.scale + viewport.x,
      y: (point.y - centerY) / viewport.scale + viewport.y
    };
  };

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);
    
    ctx.clearRect(0, 0, width, height);
    drawGrid(ctx, width, height);
    
    elements.forEach(element => drawElement(ctx, element));
    
    if (currentElement) {
      drawElement(ctx, currentElement);
    }
    
    if (isSelecting && selectionStart && selectionEnd) {
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      
      const width = selectionEnd.x - selectionStart.x;
      const height = selectionEnd.y - selectionStart.y;
      
      ctx.fillRect(selectionStart.x, selectionStart.y, width, height);
      ctx.strokeRect(selectionStart.x, selectionStart.y, width, height);
      ctx.setLineDash([]);
    }
  }, [elements, currentElement, viewport, isSelecting, selectionStart, selectionEnd]);

  useEffect(() => {
    redrawCanvasRef.current = redrawCanvas;
  }, [redrawCanvas]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // History
  const saveToHistory = useCallback((newElements: DrawingElement[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newElements);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  useEffect(() => {
    saveToHistoryRef.current = saveToHistory;
  }, [saveToHistory]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setElements(history[newIndex]);
      setSelectedElementIds(new Set());
      setSelectedElementId(null);
    }
  }, [historyIndex, history]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setElements(history[newIndex]);
      setSelectedElementIds(new Set());
      setSelectedElementId(null);
    }
  }, [historyIndex, history]);

  const clearCanvas = useCallback(() => {
    setElements([]);
    saveToHistory([]);
    setSelectedElementIds(new Set());
    setSelectedElementId(null);
  }, [saveToHistory]);

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isEditingText) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const worldPoint = inverseTransformPoint({ x: screenX, y: screenY });

    if (tool === 'pan' || e.button === 1 || (e.button === 0 && e.ctrlKey)) {
      setIsPanning(true);
      setLastPanPoint({ x: screenX, y: screenY });
      return;
    }

    if (tool === 'select') {
      setIsSelecting(true);
      setSelectionStart({ x: screenX, y: screenY });
      setSelectionEnd({ x: screenX, y: screenY });
      return;
    }

    if (tool === 'text') {
      setIsEditingText(true);
      setTextPosition({ x: screenX, y: screenY });
      setTextBoxSize({ width: 300, height: 100 });
      setTextDraft('');
      setPendingTextId(Date.now().toString());
      return;
    }

    setIsDrawing(true);

    if (tool === 'pen') {
      const newPath: DrawingPath = {
        id: Date.now().toString(),
        type: 'path',
        points: [worldPoint],
        color,
        width: lineWidth
      };
      setCurrentElement(newPath);
    } else if (tool === 'shape') {
      const newShape: Shape = {
        id: Date.now().toString(),
        type: 'shape',
        shapeType: selectedShape,
        startX: worldPoint.x,
        startY: worldPoint.y,
        endX: worldPoint.x,
        endY: worldPoint.y,
        color,
        strokeWidth: lineWidth,
        fill: fillShape
      };
      setCurrentElement(newShape);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    if (isPanning && lastPanPoint) {
      const dx = screenX - lastPanPoint.x;
      const dy = screenY - lastPanPoint.y;
      
      const newViewport = constrainViewport({
        ...viewport,
        x: viewport.x - dx / viewport.scale,
        y: viewport.y - dy / viewport.scale
      });
      
      setViewport(newViewport);
      setLastPanPoint({ x: screenX, y: screenY });
      return;
    }

    if (isSelecting && selectionStart) {
      setSelectionEnd({ x: screenX, y: screenY });
      return;
    }

    if (!isDrawing || !currentElement) return;

    const worldPoint = inverseTransformPoint({ x: screenX, y: screenY });

    if (currentElement.type === 'path') {
      setCurrentElement({
        ...currentElement,
        points: [...currentElement.points, worldPoint]
      });
    } else if (currentElement.type === 'shape') {
      setCurrentElement({
        ...currentElement,
        endX: worldPoint.x,
        endY: worldPoint.y
      });
    }
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      setLastPanPoint(null);
      return;
    }

    if (isSelecting) {
      setIsSelecting(false);
      setSelectionStart(null);
      setSelectionEnd(null);
      return;
    }

    if (isDrawing && currentElement) {
      const newElements = [...elements, currentElement];
      setElements(newElements);
      saveToHistory(newElements);
      setCurrentElement(null);
      setIsDrawing(false);
    }
  };

  const finishTextInput = () => {
    if (textDraft.trim() && pendingTextId) {
      const worldPos = inverseTransformPoint(textPosition!);
      
      const newText: TextElement = {
        id: pendingTextId,
        type: 'text',
        x: worldPos.x,
        y: worldPos.y,
        text: textDraft.trim(),
        fontSize: fontSize,
        color: color
      };
      
      const newElements = [...elements, newText];
      setElements(newElements);
      saveToHistory(newElements);
    }
    
    setIsEditingText(false);
    setTextPosition(null);
    setTextBoxSize(null);
    setTextDraft('');
    setPendingTextId(null);
    setTool('select');
  };

  // Zoom functions
  const zoomInRef = useRef(() => {
    setViewport(prev => {
      const newScale = Math.min(prev.scale * 1.2, 2.0);
      return constrainViewport({ ...prev, scale: newScale });
    });
  });

  const zoomOutRef = useRef(() => {
    setViewport(prev => {
      const newScale = Math.max(prev.scale / 1.2, 0.2);
      return constrainViewport({ ...prev, scale: newScale });
    });
  });

  const resetView = useCallback(() => {
    setViewport({ x: 0, y: 0, scale: 1 });
  }, []);

  const zoomIn = useCallback(() => zoomInRef.current(), []);
  const zoomOut = useCallback(() => zoomOutRef.current(), []);

  // Stable callbacks
  const handleToolChangeRef = useRef((newTool: Tool) => setTool(newTool));
  const handleShapeChangeRef = useRef((shape: ShapeType) => setSelectedShape(shape));
  const handleColorChangeRef = useRef((newColor: string) => setColor(newColor));
  const handleLineWidthChangeRef = useRef((width: number) => setLineWidth(width));
  const handleFontSizeChangeRef = useRef((size: number) => setFontSize(size));
  const handleFillShapeChangeRef = useRef((fill: boolean) => setFillShape(fill));
  
  useEffect(() => {
    handleToolChangeRef.current = (newTool: Tool) => setTool(newTool);
    handleShapeChangeRef.current = (shape: ShapeType) => setSelectedShape(shape);
    handleColorChangeRef.current = (newColor: string) => setColor(newColor);
    handleLineWidthChangeRef.current = (width: number) => setLineWidth(width);
    handleFontSizeChangeRef.current = (size: number) => setFontSize(size);
    handleFillShapeChangeRef.current = (fill: boolean) => setFillShape(fill);
  });
  
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
      
      const currentElements = elementsRef.current;
      const newElements = [...currentElements, newFunction];
      setElements(newElements);
      saveToHistoryRef.current(newElements);
      setTool('select');
    };
  }, [color, lineWidth]);
  
  const handleGenerateFunction = useCallback((expression: string) => {
    handleGenerateFunctionRef.current(expression);
  }, []);
  
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  
  // Touch events handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const canvas = canvasRef.current;
      if (!canvas) return;
      
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
    e.preventDefault();
    if (e.touches.length === 1) {
      const touch = e.touches[0];
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

export default WhiteboardCanvas;