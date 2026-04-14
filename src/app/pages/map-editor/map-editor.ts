import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, inject, ViewChild } from '@angular/core';
import Konva from 'konva';
import { ActivatedRoute } from "@angular/router";
import { MapLayer } from '../../models/mapLayer.model';
import { ColorPickerDirective } from 'ngx-color-picker';
import { MapStamp } from '../../models/mapStamp.model';
import { TitleCasePipe } from '@angular/common';
import { MapSaveData } from '../../models/map-save-data.model';
import { GeographicMapService } from '../../services/geographic-map.service';
import { ToastService } from '../../services/toast.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-map-editor',
  imports: [ColorPickerDirective, TitleCasePipe, FormsModule],
  templateUrl: './map-editor.html',
  styleUrl: './map-editor.scss',
})
export class MapEditor implements AfterViewInit {
  @ViewChild('canvasContainer') canvasContainer!: ElementRef;
  private readonly toast = inject(ToastService);
  private stage!: Konva.Stage;
  private projectId: number | null = null;
  private mapId: number | null = null;
  protected mapName: string = 'Untitled Map';
  protected activeTool: string = 'select';

  protected brushSizes = [
    { label: 'XS', value: 1, preview: 4 },
    { label: 'S', value: 2, preview: 7 },
    { label: 'M', value: 3, preview: 10 },
    { label: 'L', value: 4, preview: 14 },
    { label: 'XL', value: 8, preview: 18 }
  ];
  protected brushRadius = 3;
  protected activePaintColor: string = '#395a2b'

  private gridSize = 15;
  private isDrawing = false;
  private isSpaceDown = false;
  private rectWidth = 1500;
  private rectHeight = 1000;
  private initialScale = 0.7;
  private gridCols!: number;
  private gridRows!: number;
  private backgroundLayer!: Konva.Layer;
  private layerCounter = 0;
  private gridLayer!: Konva.Layer;
  private stampPreview!: Konva.Image;
  private stampsLayer!: Konva.Layer;
  protected mapLayers: MapLayer[] = [];
  protected activeLayerId: string | null = null;
  protected draggedLayerId: string | null = null;
  protected dragOverLayerId: string | null = null;
  protected showGrid = false;

  protected activeStamp: MapStamp | null = null;
  protected stampsSize: number = 60;
  protected activeStampCategory: string = 'structure';
  protected stampCategories = ['structure', 'nature', 'settlement'];
  private selectedStamp: Konva.Image | null = null;

  protected stamps: MapStamp[] = [
    { id: 'castle', label: 'Castle', icon: '/Cartography/Castle.png', category: 'structure' },
    { id: 'fort', label: 'Fort', icon: '/Cartography/Fort.png', category: 'structure' },
    { id: 'house', label: 'House', icon: '/Cartography/House.png', category: 'structure' },
    { id: 'ruinedFort', label: 'Ruined Fort', icon: '/Cartography/Ruined_Fort.png', category: 'structure' },
    { id: 'ruins', label: 'Ruins', icon: '/Cartography/Ruins.png', category: 'structure' },
    { id: 'tower', label: 'Tower', icon: '/Cartography/Tower.png', category: 'structure' },
    { id: 'city', label: 'City', icon: '/Cartography/City.png', category: 'settlement' },
    { id: 'town', label: 'Town', icon: '/Cartography/Town.png', category: 'settlement' },
    { id: 'forest', label: 'Forest', icon: '/Cartography/Forest.png', category: 'nature' },
    { id: 'pineForest', label: 'Pine Forest', icon: '/Cartography/Pine_Forest.png', category: 'nature' },
    { id: 'trees', label: 'Trees', icon: '/Cartography/Trees.png', category: 'nature' },
    { id: 'pines', label: 'Pines', icon: '/Cartography/Pines.png', category: 'nature' },
    { id: 'hillGroup', label: 'Hill Group', icon: '/Cartography/Hill_Group.png', category: 'nature' },
    { id: 'hill', label: 'Hill', icon: '/Cartography/Hill.png', category: 'nature' },
    { id: 'mountain', label: 'Mountain', icon: '/Cartography/Mountain.png', category: 'nature' },
  ]
  
  private cursorLayer!: Konva.Layer;
  private cursorCircle!: Konva.Circle;

  constructor(private route: ActivatedRoute, private cdr: ChangeDetectorRef, private geographicMapService: GeographicMapService) {}

  ngAfterViewInit(): void {
    const container = this.canvasContainer.nativeElement;
    const image = new Image();

    image.src = '/parchment_bg.jpg';

    this.stage = new Konva.Stage({
      container: container,
      width: container.offsetWidth,
      height: container.offsetHeight,
      draggable: false
    });

    // Key events
    window.addEventListener('keydown', (e) => {
      if(e.code === 'Delete' && this.selectedStamp) {
        this.deleteSelectedStamp();
      }
      
      if (e.code === 'Space') {
        this.isSpaceDown = true;
        container.style.cursor = 'grab';
        this.stage.draggable(true);
        this.cursorCircle.visible(false);
        this.cursorLayer.batchDraw();
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        this.isSpaceDown = false;
        this.stage.draggable(false);

        if(this.activeTool === 'brush') {
          container.style.cursor = 'none';
        } else {
          container.style.cursor = 'default';
        }
      }
    });

    this.stage.on('wheel', (e) => {
      e.evt.preventDefault();

      const scaleBy = 1.05;
      const oldScale = this.stage.scaleX();
      const pointer = this.stage.getPointerPosition();

      const mousePointTo = {
        x: (pointer!.x - this.stage.x()) / oldScale,
        y: (pointer!.y - this.stage.y()) / oldScale
      }

      const direction = e.evt.deltaY > 0 ? -1 : 1;
      const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;

      this.stage.scale({ x: newScale, y: newScale });

      const newPos = {
        x: pointer!.x - mousePointTo.x * newScale,
        y: pointer!.y - mousePointTo.y * newScale
      };

      this.stage.position(newPos);
    })

    this.stage.on('dragstart', () => {
      if (this.isSpaceDown) { 
        container.style.cursor = 'grabbing';
        this.isDrawing = false;
      }
    });

    this.stage.on('dragend', () => {
      container.style.cursor = this.isSpaceDown ? 'grab' : 'default';
    });

    // Set initial position
    this.stage.scale({ x: this.initialScale, y: this.initialScale });

    this.stage.position({
      x: (container.offsetWidth - this.rectWidth * this.initialScale) / 2,
      y: (container.offsetHeight - this.rectHeight * this.initialScale) / 2
    })

    this.backgroundLayer = new Konva.Layer();
    this.stage.add(this.backgroundLayer);

    // Background load
    image.onload = () => {
      const rect = new Konva.Rect({
        x: 0,
        y: 0,
        width: this.rectWidth,
        height: this.rectHeight, 
        fillPatternImage: image,
        fillPatternRepeat: 'repeat',
        fillPatternScale: { x: 1, y: 1 },
        shadowColor: 'black',
        shadowBlur: 20,
        shadowOpacity: 0.4,
        shadowOffsetX: 4,
        shadowOffsetY: 4,
        cornerRadius: 2
      });

      this.backgroundLayer.add(rect);
      this.backgroundLayer.draw();
    }

    // Grid and Brush
    this.initGrid(this.rectWidth, this.rectHeight);
    this.addLayer();
    this.cdr.detectChanges();
    this.setupBrushEvents(container);

    this.stampsLayer = new Konva.Layer();
    this.stage.add(this.stampsLayer);

    this.setupStampEvents();

    this.cursorLayer = new Konva.Layer();
    this.stage.add(this.cursorLayer);

    this.cursorCircle = new Konva.Circle({
      radius: 0,
      stroke: 'rgba(255,255,255,0.8)',
      strokeWidth: 1,
      fill: 'rgba(107,124,69,0.25)',
      listening: false,
      visible: false
    });
    this.cursorLayer.add(this.cursorCircle);

    const placeholderImg = document.createElement('canvas');
    placeholderImg.width = 1;
    placeholderImg.height = 1;

    this.stampPreview = new Konva.Image({
      image: placeholderImg,
      width: this.stampsSize,
      height: this.stampsSize,
      listening: false,
      visible: false,
      opacity: 0.7
    });
    this.cursorLayer.add(this.stampPreview);

    this.gridLayer = new Konva.Layer();
    this.gridLayer.visible(false);
    this.stage.add(this.gridLayer);
    this.drawGrid();

    const resizeObserver = new ResizeObserver(() => {
      this.stage.width(container.offsetWidth);
      this.stage.height(container.offsetHeight);
      this.stage.draw();
    })
    resizeObserver.observe(container);

    this.projectId = Number(this.route.snapshot.paramMap.get('projectId'));
    const mapIdParam = this.route.snapshot.paramMap.get('mapId');
    this.mapId = mapIdParam ? Number(mapIdParam) : null;

    if(this.mapId) {
      this.loadMap();
    }
  }

  private initGrid(width: number, height: number): void {
    this.gridCols = Math.ceil(width / this.gridSize);
    this.gridRows = Math.ceil(height / this.gridSize);
  }

  private drawGrid(): void {
    const cellSize = this.gridSize;

    for (let x = 0; x <= this.rectWidth; x += cellSize) {
      this.gridLayer.add(new Konva.Line({
        points: [x, 0, x, this.rectHeight],
        stroke: 'rgba(0,0,0,0.4)',
        strokeWidth: 0.5,
      }));
    }

    for (let y = 0; y <= this.rectHeight; y += cellSize) {
      this.gridLayer.add(new Konva.Line({
        points: [0, y, this.rectWidth, y],
        stroke: 'rgba(0,0,0,0.4)',
        strokeWidth: 0.5,
      }));
    }

    this.gridLayer.batchDraw();
  }

  private setupBrushEvents(container: HTMLElement): void {
    this.stage.on('mousedown', () => {
      if (this.isSpaceDown) return;
      if (this.activeTool === 'brush') {
        this.isDrawing = true;
        this.paintAtPointer();
      } else if (this.activeTool === 'paint') {
        this.isDrawing = true;
        this.paintOverlayAtPointer();
      }
    });

    this.stage.on('mousemove', () => {
      if (!this.isSpaceDown && !this.stage.isDragging() && this.isDrawing) {
        if (this.activeTool === 'brush') this.paintAtPointer();
        else if (this.activeTool === 'paint') this.paintOverlayAtPointer();
      }
      this.updateCursorPreview();
    });

    this.stage.on('mouseleave', () => {
      this.cursorCircle.visible(false);
      this.cursorLayer.batchDraw();
    });

    this.stage.on('mouseup mouseleave', () => {
      this.isDrawing = false;
    });

    this.stage.on('mouseover', () => {
      if (this.activeTool === 'brush' || this.activeTool === 'paint') {
        container.style.cursor = 'none';
      }
    });
  }

  private paintAtPointer(): void {
    const layer = this.activeLayer;
    if(!layer) return;

    const pos = this.stage.getRelativePointerPosition();
    if(!pos) return;

    const cx = Math.floor(pos.x / this.gridSize);
    const cy = Math.floor(pos.y / this.gridSize);

    for(let dy = -this.brushRadius; dy <= this.brushRadius; dy++) {
      for(let dx = -this.brushRadius; dx <= this.brushRadius; dx++) {
        if(dx * dx + dy * dy <= this.brushRadius * this.brushRadius) {
          const nx = cx + dx;
          const ny = cy + dy;

          if(nx >= 0 && nx < this.gridCols && ny >= 0 && ny < this.gridRows) {
            layer.grid[ny][nx] = true;
          }
        }
      }
    }
    this.redrawLand(layer);
  }

  private redrawLand(layer: MapLayer): void {
    layer.maskCanvas = undefined;

    const ctx = layer.offscreenCtx;
    const s = this.gridSize;

    ctx.clearRect(0, 0, layer.offscreen.width, layer.offscreen.height);

    const field = this.buildField(layer.grid);
    const threshold = 0.5;
    const rows = field.length - 1;
    const cols = field[0].length - 1;

    ctx.fillStyle = '#c4a882';
    ctx.beginPath();

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const tl = field[y][x], tr = field[y][x + 1];
        const br = field[y + 1][x + 1], bl = field[y + 1][x];
        const idx = (tl >= threshold ? 8 : 0) | (tr >= threshold ? 4 : 0) |
                    (br >= threshold ? 2 : 0) | (bl >= threshold ? 1 : 0);
        if (idx === 0) continue;

        const px = x * s, py = y * s;
        const safe = (a: number, b: number) => b === a ? 0.5 : (threshold - a) / (b - a);
        const top    = { x: px + s * safe(tl, tr), y: py };
        const right  = { x: px + s, y: py + s * safe(tr, br) };
        const bottom = { x: px + s * safe(bl, br), y: py + s };
        const left   = { x: px, y: py + s * safe(tl, bl) };
        const TL = { x: px, y: py }, TR = { x: px + s, y: py };
        const BR = { x: px + s, y: py + s }, BL = { x: px, y: py + s };

        const draw = (...pts: {x:number,y:number}[]) => {
          ctx.moveTo(pts[0].x, pts[0].y);
          pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
          ctx.closePath();
        };

        switch (idx) {
          case 1:  draw(left, BL, bottom); break;
          case 2:  draw(bottom, BR, right); break;
          case 3:  draw(left, BL, BR, right); break;
          case 4:  draw(top, TR, right); break;
          case 5:  draw(TL, top, left); draw(bottom, BR, right); break;
          case 6:  draw(top, TR, BR, bottom); break;
          case 7:  draw(left, top, TR, BR, BL); break;
          case 8:  draw(TL, top, left); break;
          case 9:  draw(TL, top, bottom, BL); break;
          case 10: draw(top, TR, right); draw(left, BL, bottom); break;
          case 11: draw(TL, top, right, BR, BL); break;
          case 12: draw(TL, TR, right, left); break;
          case 13: draw(TL, TR, right, bottom, BL); break;
          case 14: draw(TL, TR, BR, bottom, left); break;
          case 15: draw(TL, TR, BR, BL); break;
        }
      }
    }
    ctx.fill();
    ctx.shadowColor = 'rgba(100, 70, 20, 0.3)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;
    ctx.fill();
    ctx.shadowColor = 'transparent';

    ctx.strokeStyle = '#8B6914';
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const tl = field[y][x], tr = field[y][x + 1];
        const br = field[y + 1][x + 1], bl = field[y + 1][x];
        const idx = (tl >= threshold ? 8 : 0) | (tr >= threshold ? 4 : 0) |
                    (br >= threshold ? 2 : 0) | (bl >= threshold ? 1 : 0);
        if (idx === 0 || idx === 15) continue;

        const px = x * s, py = y * s;
        const safe = (a: number, b: number) => b === a ? 0.5 : (threshold - a) / (b - a);
        const top    = { x: px + s * safe(tl, tr), y: py };
        const right  = { x: px + s, y: py + s * safe(tr, br) };
        const bottom = { x: px + s * safe(bl, br), y: py + s };
        const left   = { x: px, y: py + s * safe(tl, bl) };

        switch (idx) {
          case 1: case 14: ctx.moveTo(left.x, left.y); ctx.lineTo(bottom.x, bottom.y); break;
          case 2: case 13: ctx.moveTo(bottom.x, bottom.y); ctx.lineTo(right.x, right.y); break;
          case 3: case 12: ctx.moveTo(left.x, left.y); ctx.lineTo(right.x, right.y); break;
          case 4: case 11: ctx.moveTo(top.x, top.y); ctx.lineTo(right.x, right.y); break;
          case 6: case 9:  ctx.moveTo(top.x, top.y); ctx.lineTo(bottom.x, bottom.y); break;
          case 7: case 8:  ctx.moveTo(left.x, left.y); ctx.lineTo(top.x, top.y); break;
          case 5:
            ctx.moveTo(top.x, top.y); ctx.lineTo(left.x, left.y);
            ctx.moveTo(bottom.x, bottom.y); ctx.lineTo(right.x, right.y); break;
          case 10:
            ctx.moveTo(top.x, top.y); ctx.lineTo(right.x, right.y);
            ctx.moveTo(bottom.x, bottom.y); ctx.lineTo(left.x, left.y); break;
        }
      }
    }
    ctx.stroke();

    if (!layer.landShape) {
      layer.landShape = new Konva.Image({
        x: 0,
        y: 0,
        image: layer.offscreen,
        width: this.rectWidth,
        height: this.rectHeight
      } as any);
      layer.konvaLayer.add(layer.landShape);
    }

    layer.konvaLayer.batchDraw();
  }

  private buildMask(layer: MapLayer): HTMLCanvasElement {
  if (layer.maskCanvas) return layer.maskCanvas;

  const w = layer.overlayOffscreen.width;
  const h = layer.overlayOffscreen.height;
  const s = this.gridSize;
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = w;
  maskCanvas.height = h;
  const maskCtx = maskCanvas.getContext('2d')!;

  const field = this.buildField(layer.grid);
  const threshold = 0.5;
  const rows = field.length - 1;
  const cols = field[0].length - 1;

  maskCtx.fillStyle = '#000000';
  maskCtx.beginPath();

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const tl = field[y][x], tr = field[y][x + 1];
      const br = field[y + 1][x + 1], bl = field[y + 1][x];
      const idx = (tl >= threshold ? 8 : 0) | (tr >= threshold ? 4 : 0) |
                  (br >= threshold ? 2 : 0) | (bl >= threshold ? 1 : 0);
      if (idx === 0) continue;
      
      const px = x * s, py = y * s;
      const safe = (a: number, b: number) => b === a ? 0.5 : (threshold - a) / (b - a);

      const top    = { x: px + s * safe(tl, tr), y: py };
      const right  = { x: px + s, y: py + s * safe(tr, br) };
      const bottom = { x: px + s * safe(bl, br), y: py + s };
      const left   = { x: px, y: py + s * safe(tl, bl) };
      const TL = { x: px, y: py }, TR = { x: px + s, y: py };
      const BR = { x: px + s, y: py + s }, BL = { x: px, y: py + s };

      const draw = (...pts: {x:number,y:number}[]) => {
        maskCtx.moveTo(pts[0].x, pts[0].y);
        pts.slice(1).forEach(p => maskCtx.lineTo(p.x, p.y));
        maskCtx.closePath();
      };

      switch (idx) {
        case 1:  draw(left, BL, bottom); break;
        case 2:  draw(bottom, BR, right); break;
        case 3:  draw(left, BL, BR, right); break;
        case 4:  draw(top, TR, right); break;
        case 5:  draw(TL, top, left); draw(bottom, BR, right); break;
        case 6:  draw(top, TR, BR, bottom); break;
        case 7:  draw(left, top, TR, BR, BL); break;
        case 8:  draw(TL, top, left); break;
        case 9:  draw(TL, top, bottom, BL); break;
        case 10: draw(top, TR, right); draw(left, BL, bottom); break;
        case 11: draw(TL, top, right, BR, BL); break;
        case 12: draw(TL, TR, right, left); break;
        case 13: draw(TL, TR, right, bottom, BL); break;
        case 14: draw(TL, TR, BR, bottom, left); break;
        case 15: draw(TL, TR, BR, BL); break;
      }
    }
  }

  maskCtx.fill();
  layer.maskCanvas = maskCanvas;
  return maskCanvas;
}

  private buildField(grid: boolean[][]): number[][] {
    const get = (x: number, y: number): number => 
      x >= 0 && x < this.gridCols && y >= 0 && y < this.gridRows && grid[y][x] ? 1 : 0;

    return Array.from({ length: this.gridRows + 1 }, (_, y) =>
      Array.from({ length: this.gridCols + 1 }, (_, x) =>
        (get(x - 1, y - 1) + get(x, y - 1) + get(x - 1, y) + get(x, y)) / 4
      )
    );
  }

  private createLayerId(): string {
    return 'layer_' + Date.now();
  }

  addLayer(): void {
    const id = this.createLayerId();
    const konvaLayer = new Konva.Layer();
    this.stage.add(konvaLayer);

    const offscreen = document.createElement('canvas');
    offscreen.width = this.rectWidth;
    offscreen.height = this.rectHeight;

    const overlayOffscreen = document.createElement('canvas');
    overlayOffscreen.width = this.rectWidth;
    overlayOffscreen.height = this.rectHeight;

    const colorCanvas = document.createElement('canvas');
    colorCanvas.width = this.rectWidth;
    colorCanvas.height = this.rectHeight;

    this.layerCounter++;

    const layer: MapLayer = {
      id,
      name: `Layer ${this.mapLayers.length + 1}`,
      visible: true,
      konvaLayer,
      grid: Array.from({ length: this.gridRows }, () => Array(this.gridCols).fill(false)),
      offscreen,
      offscreenCtx: offscreen.getContext('2d')!,

      overlayGrid: Array.from({ length: this.gridRows }, () => Array.from({ length: this.gridCols }, () => ({ color: null}))
      ),
      overlayOffscreen,
      overlayOffscreenCtx: overlayOffscreen.getContext('2d')!,
      maskCanvas: undefined,
      colorCanvas,
      colorCtx: colorCanvas.getContext('2d')!
    };

    this.mapLayers = [...this.mapLayers, layer];
    this.activeLayerId = id;

    if(this.cursorLayer) {
      this.cursorLayer.moveToTop();
    }
  }

  private paintOverlayAtPointer(): void {
    const layer = this.activeLayer;
    if (!layer) return;
    const pos = this.stage.getRelativePointerPosition();
    if (!pos) return;

    const cx = Math.floor(pos.x / this.gridSize);
    const cy = Math.floor(pos.y / this.gridSize);
    const s = this.gridSize;

    for (let dy = -this.brushRadius; dy <= this.brushRadius; dy++) {
      for (let dx = -this.brushRadius; dx <= this.brushRadius; dx++) {
        if (dx * dx + dy * dy <= this.brushRadius * this.brushRadius) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx >= 0 && nx < this.gridCols && ny >= 0 && ny < this.gridRows) {
            if (layer.grid[ny][nx]) {
              layer.overlayGrid[ny][nx].color = this.activePaintColor;

              // Paint directly onto cached color canvas
              const px = nx * s + s / 2;
              const py = ny * s + s / 2;
              const radius = s * 1.2;
              const gradient = layer.colorCtx!.createRadialGradient(px, py, 0, px, py, radius);
              gradient.addColorStop(0, this.activePaintColor);
              gradient.addColorStop(1, this.activePaintColor + '00');
              layer.colorCtx!.fillStyle = gradient;
              layer.colorCtx!.beginPath();
              layer.colorCtx!.arc(px, py, radius, 0, Math.PI * 2);
              layer.colorCtx!.fill();
            }
          }
        }
      }
    }
    this.redrawOverlay(layer);
  }

  private redrawOverlay(layer: MapLayer): void {
    const ctx = layer.overlayOffscreenCtx;
    const w = layer.overlayOffscreen.width;
    const h = layer.overlayOffscreen.height;

    ctx.clearRect(0, 0, w, h);

    // Blur the cached color canvas
    ctx.filter = 'blur(12px)';
    ctx.drawImage(layer.colorCanvas!, 0, 0);
    ctx.filter = 'none';

    // Clip to land mask
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(this.buildMask(layer), 0, 0);
    ctx.globalCompositeOperation = 'source-over';

    // Apply opacity
    const result = document.createElement('canvas');
    result.width = w;
    result.height = h;
    const rCtx = result.getContext('2d')!;
    rCtx.globalAlpha = 0.6;
    rCtx.drawImage(layer.overlayOffscreen, 0, 0);

    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(result, 0, 0);

    if (!layer.overlayShape) {
      layer.overlayShape = new Konva.Image({
        x: 0, y: 0,
        image: layer.overlayOffscreen,
        width: this.rectWidth,
        height: this.rectHeight
      } as any);
      layer.konvaLayer.add(layer.overlayShape);
      layer.overlayShape.zIndex(2);
    }

    layer.konvaLayer.batchDraw();
  }

  removeLayer(id: string): void {
    const index = this.mapLayers.findIndex(l => l.id === id);

    if(index === -1 || this.mapLayers.length === 1) return;

    this.mapLayers[index].konvaLayer.destroy();
    this.mapLayers.splice(index, 1);

    if(this.activeLayerId === id) {
      this.activeLayerId = this.mapLayers[this.mapLayers.length - 1].id;
    }
  }

  toggleLayerVisibility(id: string): void {
    const layer = this.mapLayers.find(l => l.id === id);

    if(!layer) return;

    layer.visible = !layer.visible;
    layer.konvaLayer.visible(layer.visible);
    layer.konvaLayer.batchDraw();
  }

  selectLayer(id: string): void {
    this.activeLayerId = id;
  }

  get activeLayer(): MapLayer | undefined {
    return this.mapLayers.find(l => l.id === this.activeLayerId);
  }

  get reversedLayers(): MapLayer[] {
    return [...this.mapLayers].reverse();
  }

  onLayerDragStart(layerId: string) {
    this.draggedLayerId = layerId;
  }

  onLayerDragOver(layerId: string) {
    if(this.draggedLayerId === layerId) return;
    this.dragOverLayerId = layerId;
  }

  onLayerDragEnd(): void {
    if(!this.draggedLayerId || !this.dragOverLayerId || this.draggedLayerId === this.dragOverLayerId) {
      this.draggedLayerId = null;
      this.dragOverLayerId = null;
      return;
    }

    const fromIndex = this.mapLayers.findIndex(l => l.id === this.draggedLayerId);
    const toIndex = this.mapLayers.findIndex(l => l.id === this.dragOverLayerId);

    const reordered = [...this.mapLayers];
    const [moved] = reordered.splice(fromIndex, 1);

    reordered.splice(toIndex, 0, moved);
    this.mapLayers = reordered;

    this.mapLayers.forEach((layer, i) => {
      layer.konvaLayer.zIndex(i + 1);
    });

    if(this.cursorLayer) this.cursorLayer.moveToTop();

    this.draggedLayerId = null;
    this.dragOverLayerId = null;
  }

  goBack(): void {
    this.projectId = Number(this.route.snapshot.paramMap.get('projectId') ?? '');
    window.location.href = '/app/geographic-maps/' + this.projectId;
  }

  setTool(tool: string): void {
    this.activeTool = tool;
    const container = this.canvasContainer.nativeElement;

    if (tool !== 'stamp' && this.stampPreview) {
      this.stampPreview.visible(false);
      this.cursorLayer.batchDraw();
    }

    if (tool === 'brush' || tool === 'paint') {
      container.style.cursor = 'none';
    } else if (tool === 'stamp') {
      container.style.cursor = 'none';
    } else {
      container.style.cursor = 'default';
      this.cursorCircle.visible(false);
      this.cursorLayer.batchDraw();
    }
  }

  setBrushSize(size: number): void {
    this.brushRadius = size;
    this.updateCursorPreview();
  }

  toggleGrid(show: boolean): void {
    this.showGrid = show;
    this.gridLayer.visible(show);
    if(show) this.cursorLayer.moveToTop();
    this.gridLayer.batchDraw();
  }

  private updateCursorPreview(): void {
    if(this.activeTool === 'stamp') {
      this.cursorCircle.visible(false);

      if(!this.activeStamp) {
        this.stampPreview.visible(false);
        this.cursorLayer.batchDraw();
        return;
      }

      const pos = this.stage.getRelativePointerPosition();
      if(!pos) return;

      this.stampPreview.width(this.stampsSize);
      this.stampPreview.height(this.stampsSize);
      this.stampPreview.position({
        x: pos.x - this.stampsSize / 2,
        y: pos.y - this.stampsSize / 2
      });

      this.stampPreview.visible(true);
      this.cursorLayer.batchDraw();
      return;
    }

    if ((this.activeTool !== 'brush' && this.activeTool !== 'paint') || this.isSpaceDown) {
      this.cursorCircle.visible(false);
      this.cursorLayer.batchDraw();
      return;
    }

    const pos = this.stage.getRelativePointerPosition();
    if (!pos) return;

    const radiusInPixels = (this.brushRadius + 0.5) * this.gridSize;
    this.cursorCircle.position({ x: pos.x, y: pos.y });
    this.cursorCircle.radius(radiusInPixels);
    this.cursorCircle.visible(true);
    this.cursorLayer.batchDraw();
  }

  private setupStampEvents(): void {
    this.stage.on('click', (e) => {
      if(this.activeTool !== 'stamp' || this.isSpaceDown || !this.activeStamp) return;

      const pos = this.stage.getRelativePointerPosition();
      if(!pos) return;

      const img = new Image();
      img.src = this.activeStamp.icon;
      img.onload = () => {
        const size = Number(this.stampsSize);
        const x = Math.min(Math.max(pos.x - size / 2, 0), this.rectWidth - size);
        const y = Math.min(Math.max(pos.y - size / 2, 0), this.rectHeight - size);

        const stamp = new Konva.Image({
          x,
          y,
          image: img,
          width: size,
          height: size,
          draggable: true,
        });

        stamp.setAttr('stampId', this.activeStamp!.id);
        stamp.setAttr('src', this.activeStamp!.icon);

        const layer = this.activeLayer;
        if (!layer) return;
        layer.konvaLayer.add(stamp); // ← map layer instead of stampsLayer
        layer.konvaLayer.batchDraw();

        stamp.on('click', (e) => {
          e.cancelBubble = true;
          this.selectStamp(stamp);
        });
      };
    });
  }

  private selectStamp(stamp: Konva.Image): void {
    if(this.selectedStamp) {
      this.selectedStamp.stroke('');
      this.selectedStamp.strokeWidth(0);
    }

    this.selectedStamp = stamp;
    stamp.stroke('#60a3a5');
    stamp.strokeWidth(2);

    this.activeLayer?.konvaLayer.batchDraw();
  }

  deleteSelectedStamp(): void {
    if(!this.selectedStamp) return;
    this.selectedStamp.destroy();
    this.selectedStamp = null;
    this.activeLayer?.konvaLayer.batchDraw();
  }

  selectStampType(stamp: MapStamp): void {
    this.activeStamp = stamp;
    const img = new Image();
    img.src = stamp.icon;
    img.onload = () => {
      this.stampPreview.image(img);
      this.cursorLayer.batchDraw();
    };
  }

  save(): void {
    const oldScale = this.stage.scaleX();
    const oldPos = this.stage.position();

    this.stage.scale({ x: 1, y: 1 });
    this.stage.position({ x: 0, y: 0 });

    const thumbnail = this.stage.toDataURL({
      pixelRatio: 0.3,
      x: 0,
      y: 0,
      width: this.rectWidth,
      height: this.rectHeight
    });

    this.stage.scale({ x: oldScale, y: oldScale });
    this.stage.position(oldPos);

    const saveData: MapSaveData = {
      name: this.mapName,
      layers: this.mapLayers.map(l => ({
        id: l.id,
        name: l.name,
        visible: l.visible,
        grid: l.grid,
        overlayGrid: l.overlayGrid
      })),
      stamps: this.mapLayers.flatMap(l =>
        l.konvaLayer.getChildren()
          .filter((node: any) => node.getAttr('stampId'))
          .map((node: any) => ({
            layerId: l.id,
            stampId: node.getAttr('stampId'),
            icon: node.getAttr('src'),
            x: node.x(),
            y: node.y(),
            width: Number(node.width()),
            height: Number(node.height())
          }))
      )
    };

    const konvaJson = JSON.stringify(saveData);

    if (this.mapId) {
      this.geographicMapService.saveMap(this.mapId, konvaJson, this.mapName, thumbnail)
        .subscribe({
          next: () => this.toast.show('success', 'Map saved.'),
          error: (e) => this.toast.show('error', 'Error saving map: ' + e.message)
        });
    } else {
      this.geographicMapService.createMap(this.projectId!, this.mapName)
        .subscribe({
          next: (newMapId) => {
            this.mapId = newMapId;
            this.geographicMapService.saveMap(this.mapId!, konvaJson, this.mapName, thumbnail)
              .subscribe({
                next: () => this.toast.show('success', 'Map saved.'),
                error: (e) => this.toast.show('error', 'Error saving map: ' + e.message)
              });
          },
          error: (e) => this.toast.show('error', 'Error saving map: ' + e.message)
        });
    }
  }

  private loadMap(): void {
    if (!this.mapId) return;

    this.geographicMapService.getMapCanvas(this.mapId)
      .subscribe({
        next: (response: any) => {
          this.mapName = response.name ?? 'Untitled Map';
          this.cdr.detectChanges();
          if (response.konvaJson) {
            const data: MapSaveData = JSON.parse(response.konvaJson);
            this.restoreMap(data);
          }
        },
        error: (e) => this.toast.show('error', 'Error loading map: ' + e.message)
      });
  }

  private restoreMap(data: MapSaveData): void {
    data.layers.forEach((savedLayer, i) => {
      if (i >= this.mapLayers.length) this.addLayer();
      const layer = this.mapLayers[i];
      layer.id = savedLayer.id;
      layer.name = savedLayer.name;
      layer.visible = savedLayer.visible;
      layer.grid = savedLayer.grid;
      layer.overlayGrid = savedLayer.overlayGrid;
      layer.konvaLayer.visible(savedLayer.visible);
      this.redrawLand(layer);
      this.rebuildColorCanvas(layer);
      this.redrawOverlay(layer);
    });

    const topLayer = this.mapLayers[this.mapLayers.length - 1];
    if(topLayer) this.activeLayerId = topLayer.id;

    data.stamps?.forEach(s => {
      console.log('Restoring stamp:', s);
      const targetLayer = this.mapLayers.find(l => l.id === s.layerId);
      console.log('Target layer found:', targetLayer);

      const img = new Image();
      img.src = s.icon;
      img.onload = () => {
        console.log('Image loaded for stamp:', s.stampId);
        const stamp = new Konva.Image({
          x: s.x,
          y: s.y,
          image: img,
          width: s.width,
          height: s.height,
          draggable: true,
        });
        stamp.setAttr('stampId', s.stampId);
        stamp.setAttr('src', s.icon);

        if (!targetLayer) {
          console.warn('No target layer found for layerId:', s.layerId);
          return;
        }

        targetLayer.konvaLayer.add(stamp);
        stamp.on('click', (e) => {
          e.cancelBubble = true;
          this.selectStamp(stamp);
        });
        targetLayer.konvaLayer.batchDraw();
      };
      img.onerror = (e) => {
        console.error('Image failed to load:', s.icon, e);
      };
    });

    this.cdr.detectChanges();
  }

  private rebuildColorCanvas(layer: MapLayer): void {
    const s = this.gridSize;
    layer.colorCtx!.clearRect(0, 0, layer.colorCanvas!.width, layer.colorCanvas!.height);

    for (let y = 0; y < this.gridRows; y++) {
      for (let x = 0; x < this.gridCols; x++) {
        const color = layer.overlayGrid[y][x].color;
        if (!color) continue;

        const cx = x * s + s / 2;
        const cy = y * s + s / 2;
        const radius = s * 1.2;
        const gradient = layer.colorCtx!.createRadialGradient(cx, cy, 0, cx, cy, radius);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, color + '00');
        layer.colorCtx!.fillStyle = gradient;
        layer.colorCtx!.beginPath();
        layer.colorCtx!.arc(cx, cy, radius, 0, Math.PI * 2);
        layer.colorCtx!.fill();
      }
    }
  }

  exportAsImage(): void {
    const oldScale = this.stage.scaleX();
    const oldPos = this.stage.position();

    this.stage.scale({ x: 1, y: 1 });
    this.stage.position({ x: 0, y:0 });

    const dataURL = this.stage.toDataURL({
      pixelRatio: 2,
      x: 0,
      y: 0,
      width: this.rectWidth,
      height: this.rectHeight
    });

    this.stage.scale({ x: oldScale, y: oldScale });
    this.stage.position(oldPos);

    const link = document.createElement('a');
    link.download = 'map.png';
    link.href = dataURL;
    link.click();
  }
}