import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, inject, NgZone, ViewChild } from '@angular/core';
import Konva from 'konva';
import { ActivatedRoute } from "@angular/router";
import { MapLayer } from '../../models/mapLayer.model';
import { ColorPickerDirective } from 'ngx-color-picker';
import { MapStamp } from '../../models/mapStamp.model';
import { TitleCasePipe } from '@angular/common';
import { MapSaveData } from '../../models/map-save-data.model';
import { GeographicMapService } from '../../services/geographic-map.service';
import { WikiService } from '../../services/wiki.service';
import { Wiki } from '../../models/wiki.model';
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
  private selectedText: Konva.Text | null = null;
  private isEditingText = false;
  private selectionRect!: Konva.Rect;
  private selectionLayer!: Konva.Layer;
  private selectionStart: { x: number, y: number } | null = null;
  private selectedNodes: Konva.Node[] = [];
  private lastOverlayRedraw = 0;
  protected mapLayers: MapLayer[] = [];
  protected activeLayerId: string | null = null;
  protected draggedLayerId: string | null = null;
  protected dragOverLayerId: string | null = null;
  protected showGrid = false;

  protected textFontSize: number = 24;
  protected textColor: string = '#2c1810';
  protected textFontFamily: string = 'MedievalSharp, Georgia, serif';

  protected textFontFamilies = [
    { label: 'Serif', value: 'Georgia, serif' },
    { label: 'Medieval', value: 'MedievalSharp, Georgia, serif' },
    { label: 'Cursive', value: 'Palatino Linotype, cursive' },
    { label: 'Sans', value: 'Arial, sans-serif' }
  ];

  protected activeStamp: MapStamp | null = null;
  protected stampsSize: number = 60;
  protected activeStampCategory: string = 'structure';
  protected stampCategories = ['structure', 'nature', 'settlement'];
  private selectedStamp: Konva.Image | null = null;
  private selectedPoiCircle: Konva.Circle | null = null;

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
  
  private poiLayer!: Konva.Layer;
  private cursorLayer!: Konva.Layer;
  private cursorCircle!: Konva.Circle;

  protected selectedPoiId: number | null = null;
  protected currentPoiWikis: Wiki[] = [];
  protected showWikiPicker = false;
  protected wikiSearch = '';
  protected wikiSearchResults: Wiki[] = [];

  constructor(
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private geographicMapService: GeographicMapService,
    private wikiService: WikiService,
    private zone: NgZone,
  ) {}

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
      if(document.activeElement?.tagName === 'TEXTAREA') return;

      if (e.code === 'Delete') {
        if (this.selectedNodes.length > 0) {
          this.selectedNodes.forEach(node => node.destroy());
          this.selectedNodes = [];
          this.mapLayers.forEach(l => l.konvaLayer.batchDraw());
        } else {
          if (this.selectedStamp) this.deleteSelectedStamp();
          if (this.selectedText) {
            this.selectedText.destroy();
            this.selectedText = null;
            this.activeLayer?.konvaLayer.batchDraw();
          }
        }
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

    this.stage.scale({ x: this.initialScale, y: this.initialScale });

    this.stage.position({
      x: (container.offsetWidth - this.rectWidth * this.initialScale) / 2,
      y: (container.offsetHeight - this.rectHeight * this.initialScale) / 2
    })

    this.backgroundLayer = new Konva.Layer();
    this.stage.add(this.backgroundLayer);

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

    this.initGrid(this.rectWidth, this.rectHeight);
    this.addLayer();
    this.cdr.detectChanges();
    this.setupBrushEvents(container);

    this.stampsLayer = new Konva.Layer();
    this.stage.add(this.stampsLayer);

    this.poiLayer = new Konva.Layer();
    this.stage.add(this.poiLayer);

    this.selectionLayer = new Konva.Layer();
    this.stage.add(this.selectionLayer);

    this.selectionRect = new Konva.Rect({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      stroke: '#60a3a5',
      dash: [4, 4],
      fill: 'rgba(96, 163, 165, 0.1)',
      visible: false,
      listening: false
    });
    this.selectionLayer.add(this.selectionRect);

    this.setupStampEvents();
    this.setupPOIEvents();

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
      this.loadPOIs();
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
    this.stage.on('mousedown', (e) => {
      if (this.isSpaceDown) return;
      if (this.activeTool === 'brush') {
        this.isDrawing = true;
        this.paintAtPointer();
      } else if (this.activeTool === 'paint') {
        this.isDrawing = true;
        this.paintOverlayAtPointer();
      } else if (this.activeTool === 'eraser') {
        this.isDrawing = true;
        this.eraseAtPointer();
      } else if (this.activeTool === 'select') {
        const clickedNode = e.target as unknown as Konva.Node;

        if (this.selectedNodes.includes(clickedNode)) return;

        this.clearSelection();

        const clickedOnNode = (e.target as any).getAttr('type') === 'text' 
          || (e.target as any).getAttr('stampId')
          || (e.target as any).getAttr('poiId');
        if (clickedOnNode) return;

        const pos = this.stage.getRelativePointerPosition();
        if (!pos) return;
        this.selectionStart = pos;
        this.selectionRect.setAttrs({ x: pos.x, y: pos.y, width: 0, height: 0, visible: true });
        this.selectionLayer.batchDraw();
      }
    });

    this.stage.on('mousemove', () => {
      if (!this.isSpaceDown && !this.stage.isDragging() && this.isDrawing) {
        if (this.activeTool === 'brush') this.paintAtPointer();
        else if (this.activeTool === 'paint') this.paintOverlayAtPointer();
        else if (this.activeTool === 'eraser') this.eraseAtPointer()
      }

      if (this.activeTool === 'select' && this.selectionStart) {
        const pos = this.stage.getRelativePointerPosition();
        if (!pos) return;
        this.selectionRect.setAttrs({
          x: Math.min(pos.x, this.selectionStart.x),
          y: Math.min(pos.y, this.selectionStart.y),
          width: Math.abs(pos.x - this.selectionStart.x),
          height: Math.abs(pos.y - this.selectionStart.y)
        });
        this.selectionLayer.batchDraw();
      }

      this.updateCursorPreview();
    });

    this.stage.on('mouseleave', () => {
      this.cursorCircle.visible(false);
      this.cursorLayer.batchDraw();
    });

    this.stage.on('mouseup', () => {
      this.isDrawing = false;

      if (this.activeTool === 'select' && this.selectionStart) {
        const box = this.selectionRect.getClientRect({ relativeTo: this.stage });

        if (box.width > 5 && box.height > 5) {
          this.clearSelection();

          this.mapLayers.forEach(layer => {
            layer.konvaLayer.getChildren().forEach((child: Konva.Node) => {
              if (!child.getAttr('type') && !child.getAttr('stampId')) return;

              const nodeBox = child.getClientRect({ relativeTo: this.stage });
              const intersects =
                box.x < nodeBox.x + nodeBox.width &&
                box.x + box.width > nodeBox.x &&
                box.y < nodeBox.y + nodeBox.height &&
                box.y + box.height > nodeBox.y;

              if (intersects) {
                (child as Konva.Shape).stroke('#60a3a5');
                (child as Konva.Shape).strokeWidth(child.getAttr('type') === 'text' ? 1 : 2);
                this.selectedNodes.push(child);
              }
            });
          });

          this.selectedNodes.forEach(node => {
            node.off('dragstart dragmove');

            let lastPos = { x: 0, y: 0 };

            node.on('dragstart', () => {
              lastPos = { x: node.x(), y: node.y() };
            });

            node.on('dragmove', () => {
              const dx = node.x() - lastPos.x;
              const dy = node.y() - lastPos.y;
              lastPos = { x: node.x(), y: node.y() };

              this.selectedNodes.forEach(other => {
                if (other === node) return;

                const isText = other.getAttr('type') === 'text';
                const w = isText ? 0 : (other as Konva.Shape).width();
                const h = isText ? 0 : (other as Konva.Shape).height();

                other.x(Math.max(0, Math.min(other.x() + dx, this.rectWidth - w)));
                other.y(Math.max(0, Math.min(other.y() + dy, this.rectHeight - h)));
              });

              const isText = node.getAttr('type') === 'text';
              const w = isText ? 0 : (node as Konva.Shape).width();
              const h = isText ? 0 : (node as Konva.Shape).height();
              node.x(Math.max(0, Math.min(node.x(), this.rectWidth - w)));
              node.y(Math.max(0, Math.min(node.y(), this.rectHeight - h)));

              this.mapLayers.forEach(l => l.konvaLayer.batchDraw());
            });
          });
        }

        this.selectionStart = null;
        this.selectionRect.visible(false);
        this.selectionLayer.batchDraw();
      }
    });

    this.stage.on('mouseover', () => {
      if (this.activeTool === 'brush' || this.activeTool === 'paint') {
        container.style.cursor = 'none';
      }
    });

    this.stage.on('click', (e) => {
      if (this.isSpaceDown) return;
      if (this.activeTool !== 'text') return;
      if (this.isEditingText) return;
      if ((e.target as any).getAttr('type') === 'text') return;
      if ((e.target as any).getAttr('stampId')) return;

      const pos = this.stage.getRelativePointerPosition();
      if (!pos) return;

      if (pos.x < 0 || pos.y < 0 || pos.x > this.rectWidth || pos.y > this.rectHeight) return;

      this.addTextAtPosition(pos);
    });
  }

  private addTextAtPosition(pos: { x: number, y: number }): void {
    const layer = this.activeLayer;
    if(!layer) return;

    const text = new Konva.Text({
      x: pos.x,
      y: pos.y,
      text: 'Double click to edit',
      fontSize: this.textFontSize,
      fontFamily: this.textFontFamily,
      fill: this.textColor,
      draggable: true,
    });

    text.setAttr('type', 'text');
    layer.konvaLayer.add(text);
    layer.konvaLayer.batchDraw();

    text.on('click', (e) => {
      e.cancelBubble = true;
      this.selectText(text);
    });

    text.on('dblclick', () => {
      this.editTextInLine(text, layer);
    });

    text.on('dragmove', () => {
      text.x(Math.max(0, Math.min(text.x(), this.rectWidth - text.width())));
      text.y(Math.max(0, Math.min(text.y(), this.rectHeight - text.height())));
    });

    this.selectText(text);
  }

  private selectText(text: Konva.Text): void {
    this.clearSelection();

    if(this.selectedText) {
      this.selectedText.stroke('');
      this.selectedText.strokeWidth(0);
    }

    this.selectedText = text;
    text.stroke('#60a3a5');
    text.strokeWidth(1);

    this.activeLayer?.konvaLayer.batchDraw();
  }

  private editTextInLine(text: Konva.Text, layer: MapLayer): void {
    const scale = this.stage.scaleX();
    const stagePos = this.stage.position();
    const stageBox = this.stage.container().getBoundingClientRect();

    const textArea = document.createElement('textarea');
    this.isEditingText = true;
    text.visible(false);
    layer.konvaLayer.batchDraw();

    textArea.value = text.text();
    textArea.style.position = 'absolute';
    textArea.style.fontSize = (text.fontSize() * scale) + 'px';
    textArea.style.fontFamily = text.fontFamily();
    textArea.style.color = text.fill() as string;
    textArea.style.border = '1px solid #60a3a5';
    textArea.style.borderRadius = '4px';
    textArea.style.background = 'rgba(0,0,0,0.4)';
    textArea.style.outline = 'none';
    textArea.style.resize = 'none';
    textArea.style.overflow = 'hidden';
    textArea.style.padding = '2px 4px';
    textArea.style.minWidth = '100px';
    textArea.style.zIndex = '9999';

    document.body.appendChild(textArea);

    const x = stageBox.left + text.x() * scale + stagePos.x;
    const y = stageBox.top + text.y() * scale + stagePos.y - textArea.offsetHeight - 4;
    textArea.style.left = x + 'px';
    textArea.style.top = y + 'px';

    textArea.focus();
    textArea.select();

    const finish = () => {
      if (!document.body.contains(textArea)) return;
      text.text(textArea.value || 'Text');
      text.visible(true);
      layer.konvaLayer.batchDraw();
      document.body.removeChild(textArea);
      document.removeEventListener('mousedown', onMouseDown, true);
      setTimeout(() => this.isEditingText = false, 50);
    };

    const onMouseDown = (e: MouseEvent) => {
      if (e.target !== textArea) {
        e.stopPropagation();
        e.preventDefault();
        finish();
      }
    };

    document.addEventListener('mousedown', onMouseDown, true);

    textArea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        finish();
      }
      if (e.key === 'Escape') finish();
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

    ctx.shadowColor = 'rgba(100, 70, 20, 0.3)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

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

    if (!layer.landShape || !layer.landShape.getParent()) {
      layer.landShape = new Konva.Image({
        x: 0,
        y: 0,
        image: layer.offscreen,
        width: this.rectWidth,
        height: this.rectHeight
      } as any);
      layer.konvaLayer.add(layer.landShape);
      layer.landShape.moveToBottom();

      const originalDestroy = layer.landShape.destroy.bind(layer.landShape);
      (layer.landShape as any).destroy = () => {
        console.trace('landShape destroyed here');
        originalDestroy();
      };

    } else {
      layer.landShape.clearCache();
      layer.landShape.image(layer.offscreen);
      layer.landShape.moveToBottom();
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
      this.poiLayer.moveToTop();
      this.selectionLayer.moveToTop();
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

    const now = Date.now();
    if (now - this.lastOverlayRedraw > 32) {
      this.lastOverlayRedraw = now;
      this.redrawOverlay(layer);
    }
  }

  private eraseAtPointer(): void {
    const pos = this.stage.getRelativePointerPosition();
    if (!pos) return;

    const cx = Math.floor(pos.x / this.gridSize);
    const cy = Math.floor(pos.y / this.gridSize);

    const layer = this.activeLayer;
    if (!layer) return;

    let landChanged = false;

    for (let dy = -this.brushRadius; dy <= this.brushRadius; dy++) {
      for (let dx = -this.brushRadius; dx <= this.brushRadius; dx++) {
        if (dx * dx + dy * dy <= this.brushRadius * this.brushRadius) {
          const nx = cx + dx;
          const ny = cy + dy;

          if (nx >= 0 && nx < this.gridCols && ny >= 0 && ny < this.gridRows) {
            if (layer.grid[ny][nx]) {
              layer.grid[ny][nx] = false;
              landChanged = true;
            }
            if (layer.overlayGrid[ny][nx].color) {
              layer.overlayGrid[ny][nx].color = null;
              landChanged = true;
            }
          }
        }
      }
    }

    if (landChanged) {
      const filledCells = layer.grid.flat().filter(Boolean).length;

      layer.maskCanvas = undefined;
      layer.colorCtx!.clearRect(0, 0, layer.colorCanvas!.width, layer.colorCanvas!.height);
      this.redrawLand(layer);
      this.rebuildColorCanvas(layer);
      this.redrawOverlay(layer);
    }

    const eraserRadiusPx = this.brushRadius * this.gridSize * this.stage.scaleX();
    const children = [...layer.konvaLayer.getChildren()];

    children.forEach((child: Konva.Node) => {
      if (child === layer.landShape) return;
      if (child === layer.overlayShape) return;

      if (!child.getAttr('type') && !child.getAttr('stampId')) return;

      const nodeBox = child.getClientRect({ relativeTo: this.stage });
      const stagePosX = pos.x * this.stage.scaleX() + this.stage.x();
      const stagePosY = pos.y * this.stage.scaleY() + this.stage.y();

      const nodeCenterX = nodeBox.x + nodeBox.width / 2;
      const nodeCenterY = nodeBox.y + nodeBox.height / 2;

      const dist = Math.sqrt(
        Math.pow(stagePosX - nodeCenterX, 2) +
        Math.pow(stagePosY - nodeCenterY, 2)
      );

      if (dist < eraserRadiusPx) {
        if (child === this.selectedStamp) this.selectedStamp = null;
        if (child === this.selectedText) this.selectedText = null;
        this.selectedNodes = this.selectedNodes.filter(n => n !== child);
        child.destroy();
      }
    });

    layer.konvaLayer.batchDraw();
  }

  private redrawOverlay(layer: MapLayer): void {
    const ctx = layer.overlayOffscreenCtx;
    const w = layer.overlayOffscreen.width;
    const h = layer.overlayOffscreen.height;

    ctx.clearRect(0, 0, w, h);

    ctx.filter = 'blur(12px)';
    ctx.drawImage(layer.colorCanvas!, 0, 0);
    ctx.filter = 'none';

    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(this.buildMask(layer), 0, 0);
    ctx.globalCompositeOperation = 'source-over';

    if (!layer.resultCanvas) {
      layer.resultCanvas = document.createElement('canvas');
      layer.resultCanvas.width = w;
      layer.resultCanvas.height = h;
      layer.resultCtx = layer.resultCanvas.getContext('2d')!;
    }

    layer.resultCtx!.clearRect(0, 0, w, h);
    layer.resultCtx!.globalAlpha = 0.6;
    layer.resultCtx!.drawImage(layer.overlayOffscreen, 0, 0);
    layer.resultCtx!.globalAlpha = 1;

    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(layer.resultCanvas, 0, 0);

    if (!layer.overlayShape || !layer.overlayShape.getParent()) {
      layer.overlayShape = new Konva.Image({
        x: 0, y: 0,
        image: layer.overlayOffscreen,
        width: this.rectWidth,
        height: this.rectHeight
      } as any);
      layer.konvaLayer.add(layer.overlayShape);
      layer.overlayShape.moveToTop();
    } else {
      layer.overlayShape.clearCache();
      layer.overlayShape.image(layer.overlayOffscreen);
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

    if(this.cursorLayer) {
      this.selectionLayer.moveToTop();
      this.cursorLayer.moveToTop();
    } 

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

    if (tool === 'brush' || tool === 'paint' || tool === 'eraser') {
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
    if(show) {
      this.selectionLayer.moveToTop();
      this.cursorLayer.moveToTop();
    }
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

    if ((this.activeTool !== 'brush' && this.activeTool !== 'paint' && this.activeTool !== 'eraser') || this.isSpaceDown) {
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
        layer.konvaLayer.add(stamp);
        layer.konvaLayer.batchDraw();

        stamp.on('click', (e) => {
          e.cancelBubble = true;
          this.selectStamp(stamp);
        });

        stamp.on('dragmove', () => {
          stamp.x(Math.max(0, Math.min(stamp.x(), this.rectWidth - stamp.width())));
          stamp.y(Math.max(0, Math.min(stamp.y(), this.rectHeight - stamp.height())));
        });
      };
    });
  }

  private setupPOIEvents(): void {
    this.stage.on('click', (e) => {
      if (this.activeTool !== 'poi' || this.isSpaceDown) return;
      if (!this.mapId || !this.projectId) return;

      const pos = this.stage.getRelativePointerPosition();
      if (!pos) return;
      if (pos.x < 0 || pos.y < 0 || pos.x > this.rectWidth || pos.y > this.rectHeight) return;

      this.geographicMapService.createPOI(this.projectId!, this.mapId!, pos.x, pos.y)
        .subscribe({
          next: (poi) => this.renderPOI(poi),
          error: (e) => this.toast.show('error', 'Error creating POI: ' + e.message)
        });
    });
  }

  private renderPOI(poi: { id: number; posX: number; posY: number }): void {
    const circle = new Konva.Circle({
      x: poi.posX,
      y: poi.posY,
      radius: 8,
      fill: '#e74c3c',
      stroke: '#ffffff',
      strokeWidth: 2,
    });
    circle.setAttr('poiId', poi.id);

    circle.on('click', (e) => {
      e.cancelBubble = true;
      this.selectPOI(poi.id, circle);
    });

    this.poiLayer.add(circle);
    this.poiLayer.batchDraw();
  }

  private selectPOI(poiId: number, circle: Konva.Circle): void {
    this.clearSelection();
    
    if (this.selectedPoiCircle) {
      this.selectedPoiCircle.stroke('#ffffff');
      this.selectedPoiCircle.strokeWidth(2);
      this.poiLayer.batchDraw();
    }

    this.selectedPoiId = poiId;
    this.selectedPoiCircle = circle;
    circle.stroke('#60a3a5');
    circle.strokeWidth(3);
    this.poiLayer.batchDraw();

    this.closeWikiPicker();
    this.currentPoiWikis = [];
    this.loadPoiWikis();
    this.cdr.detectChanges();
  }

  protected clearPoiSelection(): void {
    if (this.selectedPoiCircle) {
      this.selectedPoiCircle.stroke('#ffffff');
      this.selectedPoiCircle.strokeWidth(2);
      this.poiLayer.batchDraw();
    }
    this.selectedPoiId = null;
    this.selectedPoiCircle = null;
    this.currentPoiWikis = [];
    this.closeWikiPicker();
    this.cdr.detectChanges();
  }

  private loadPoiWikis(): void {
    if (!this.selectedPoiId || !this.mapId || !this.projectId) return;
    this.geographicMapService.getPoiWikis(this.projectId, this.mapId, this.selectedPoiId)
      .subscribe({
        next: (wikis) => {
          this.zone.run(() => {
            this.currentPoiWikis = wikis;
            this.cdr.detectChanges();
          });
        },
        error: () => {},
      });
  }

  private searchProjectWikis(): void {
    const q = this.wikiSearch.trim() || undefined;
    this.wikiService.getProjectWikis(Number(this.projectId), q).subscribe({
      next: (wikis) => {
        const associatedIds = new Set(this.currentPoiWikis.map((w) => w.id));
        this.wikiSearchResults = wikis.filter((w) => !associatedIds.has(w.id));
        this.cdr.detectChanges();
      },
      error: () => {
        this.wikiSearchResults = [];
        this.cdr.detectChanges();
      },
    });
  }

  protected openWikiPicker(): void {
    this.wikiSearch = '';
    this.wikiSearchResults = [];
    this.showWikiPicker = true;
    this.searchProjectWikis();
  }

  protected closeWikiPicker(): void {
    this.showWikiPicker = false;
    this.wikiSearch = '';
    this.wikiSearchResults = [];
  }

  protected onWikiSearchInput(): void {
    this.searchProjectWikis();
  }

  protected associateWiki(wiki: Wiki): void {
    if (!this.selectedPoiId || !this.mapId || !this.projectId) return;
    this.geographicMapService.associatePoiWiki(this.projectId, this.mapId, this.selectedPoiId, wiki.id)
      .subscribe({
        next: () => {
          this.zone.run(() => {
            this.loadPoiWikis();
            this.searchProjectWikis();
          });
        },
        error: () => {},
      });
  }

  protected removeWiki(wiki: Wiki): void {
    if (!this.selectedPoiId || !this.mapId || !this.projectId) return;
    this.geographicMapService.removePoiWiki(this.projectId, this.mapId, this.selectedPoiId, wiki.id)
      .subscribe({
        next: () => {
          this.zone.run(() => {
            this.loadPoiWikis();
          });
        },
        error: () => {},
      });
  }

  protected navigateToWiki(wiki: Wiki): void {
    window.open(`/app/projects/${this.projectId}/wikis/${wiki.id}`, '_blank');
  }

  private loadPOIs(): void {
    if (!this.mapId || !this.projectId) return;
    this.geographicMapService.getPOIs(this.projectId, this.mapId)
      .subscribe({
        next: (pois) => pois.forEach(poi => this.renderPOI(poi)),
        error: (e) => this.toast.show('error', 'Error loading POIs: ' + e.message)
      });
  }

  private selectStamp(stamp: Konva.Image): void {
    this.clearSelection();

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

  private clearSelection(): void {
    this.selectedNodes.forEach(node => {
      (node as Konva.Shape).stroke('');
      (node as Konva.Shape).strokeWidth(0);
      node.off('dragstart dragmove');
    });
    this.selectedNodes = [];

    if (this.selectedStamp) {
      this.selectedStamp.stroke('');
      this.selectedStamp.strokeWidth(0);
      this.selectedStamp = null;
    }

    if (this.selectedText) {
      this.selectedText.stroke('');
      this.selectedText.strokeWidth(0);
      this.selectedText = null;
    }

    if (this.selectedPoiCircle) {
      this.selectedPoiCircle.stroke('#ffffff');
      this.selectedPoiCircle.strokeWidth(2);
      this.poiLayer?.batchDraw();
      this.selectedPoiCircle = null;
      this.selectedPoiId = null;
    }

    this.mapLayers.forEach(l => l.konvaLayer.batchDraw());
  }

  save(): void {
    this.clearSelection();
    if(this.selectedText) {
      this.selectedText.stroke('');
      this.selectedText.strokeWidth(0);
      this.selectedText = null;
    }
    if(this.selectedStamp) {
      this.selectedStamp.stroke('');
      this.selectedStamp.strokeWidth(0);
      this.selectedStamp = null;
    }

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
        overlayGrid: l.overlayGrid,
        texts: (() => {
          const children = Array.from(l.konvaLayer.getChildren());
          children.forEach((node: any, i: number) => {
          });
          const filtered = children.filter((node: any) => node.attrs?.type === 'text');
          return filtered.map((node: any) => ({
            x: node.x(),
            y: node.y(),
            text: node.text(),
            fontSize: node.fontSize(),
            fontFamily: node.fontFamily(),
            fill: node.attrs?.fill
          }));
        })()
      })),
      stamps: this.mapLayers.flatMap(l =>
        Array.from(l.konvaLayer.getChildren())
          .filter((node: any) => node.attrs?.stampId)
          .map((node: any) => ({
            layerId: l.id,
            stampId: node.attrs?.stampId,
            icon: node.attrs?.src,
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

      savedLayer.texts?.forEach(t => {
        const text = new Konva.Text({
          x: t.x,
          y: t.y,
          text: t.text,
          fontSize: t.fontSize,
          fontFamily: t.fontFamily,
          fill: t.fill,
          draggable: true
        });

        text.setAttr('type', 'text');
        layer.konvaLayer.add(text);

        text.on('click', (e) => {
          e.cancelBubble = true;
          this.selectText(text);
        });

        text.on('dragmove', () => {
          text.x(Math.max(0, Math.min(text.x(), this.rectWidth - text.width())));
          text.y(Math.max(0, Math.min(text.y(), this.rectHeight - text.height())));
        });

        text.on('dblclick', () => {
          this.editTextInLine(text, layer);
        });

        layer.konvaLayer.batchDraw();
      });
    });

    const topLayer = this.mapLayers[this.mapLayers.length - 1];
    if (topLayer) this.activeLayerId = topLayer.id;

    data.stamps?.forEach(s => {
      const targetLayer = this.mapLayers.find(l => l.id === s.layerId);
      const img = new Image();
      img.src = s.icon;
      img.onload = () => {
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

        stamp.on('dragmove', () => {
          stamp.x(Math.max(0, Math.min(stamp.x(), this.rectWidth - stamp.width())));
          stamp.y(Math.max(0, Math.min(stamp.y(), this.rectHeight - stamp.height())));
        });

        targetLayer.konvaLayer.batchDraw();
      };
      img.onerror = () => {
        console.error('Image failed to load:', s.icon);
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