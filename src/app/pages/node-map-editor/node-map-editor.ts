import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, NgZone, OnInit, ViewChild } from '@angular/core';
import Konva from 'konva';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NodeService } from '../../services/node.service';
import { RelationService } from '../../services/relation.service';
import { WikiService } from '../../services/wiki.service';
import { Node, NodeType, NODE_TYPES } from '../../models/node.model';
import { NodeRelation } from '../../models/relation.model';
import { Wiki } from '../../models/wiki.model';

const NODE_WIDTH = 200;
const NODE_HEIGHT = 88;

@Component({
  selector: 'app-node-map-editor',
  imports: [FormsModule],
  templateUrl: './node-map-editor.html',
  styleUrl: './node-map-editor.scss',
})
export class NodeMapEditor implements OnInit, AfterViewInit {
  @ViewChild('canvasContainer') canvasContainer!: ElementRef;
  private stage!: Konva.Stage;
  private layer!: Konva.Layer;
  private nodeGroups = new Map<number, Konva.Group>();
  private relationsLayer!: Konva.Layer;

  // Relaciones: viven en memoria mientras el editor esté abierto
  private relations: NodeRelation[] = [];
  private relationLines = new Map<number, Konva.Line>(); // relationId → line
  private relationSet = new Set<string>(); // "minId-maxId" para dedup visual

  // Estado de la línea de conexión en curso
  private tempLine: Konva.Line | null = null;
  private connectingFromNodeId: number | null = null;

  protected projectId: string = '';
  protected mapId: string = '';

  protected showAddForm = false;
  protected formSubmitted = false;
  protected newLabel = '';
  protected newDescription = '';
  protected newType: NodeType | '' = '';
  protected newColor = '#4a9ead';
  protected savingNode = false;

  protected contextMenuVisible = false;
  protected contextMenuX = 0;
  protected contextMenuY = 0;
  private pendingPos: { x: number; y: number } | null = null;

  protected selectedNode: Node | null = null;
  protected isEditing = false;
  protected editSubmitted = false;
  protected editLabel = '';
  protected editDescription = '';
  protected editType: NodeType | '' = '';
  protected editColor = '';
  protected savingEdit = false;
  protected showDeleteConfirm = false;
  protected deletingNode = false;

  protected readonly nodeTypes = NODE_TYPES;

  // --- Wiki state ---
  protected currentNodeWikis: Wiki[] = [];
  protected showWikiPicker = false;
  protected wikiSearch = '';
  protected wikiSearchResults: Wiki[] = [];
  protected previewWiki: Wiki | null = null;

  constructor(
    private route: ActivatedRoute,
    private nodeService: NodeService,
    private relationService: RelationService,
    private wikiService: WikiService,
    private zone: NgZone,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('projectId') ?? '';
    this.mapId = this.route.snapshot.paramMap.get('mapId') ?? '';
  }

  goBack(): void {
    window.location.href = '/app/node-maps/' + this.projectId;
  }

  ngAfterViewInit(): void {
    const container = this.canvasContainer.nativeElement;
    let isSpaceDown = false;

    this.stage = new Konva.Stage({
      container: container,
      width: container.offsetWidth,
      height: container.offsetHeight,
      draggable: false,
    });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        isSpaceDown = true;
        container.style.cursor = 'grab';
        this.stage.draggable(true);
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        isSpaceDown = false;
        container.style.cursor = 'default';
        this.stage.draggable(false);
      }
    });

    this.stage.on('dragstart', () => {
      if (isSpaceDown) container.style.cursor = 'grabbing';
    });

    this.stage.on('dragend', () => {
      container.style.cursor = isSpaceDown ? 'grab' : 'default';
    });

    this.stage.on('wheel', (e) => {
      e.evt.preventDefault();

      const scaleBy = 1.05;
      const oldScale = this.stage.scaleX();
      const pointer = this.stage.getPointerPosition();

      const mousePointTo = {
        x: (pointer!.x - this.stage.x()) / oldScale,
        y: (pointer!.y - this.stage.y()) / oldScale,
      };

      const direction = e.evt.deltaY > 0 ? -1 : 1;
      const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;

      this.stage.scale({ x: newScale, y: newScale });

      const newPos = {
        x: pointer!.x - mousePointTo.x * newScale,
        y: pointer!.y - mousePointTo.y * newScale,
      };

      this.stage.position(newPos);
    });

    this.stage.on('click', (e) => {
      if (e.target === this.stage) {
        if (this.connectingFromNodeId !== null) return;
        this.zone.run(() => this.clearSelection());
      }
    });

    this.stage.on('mousemove', () => {
      if (this.connectingFromNodeId === null || !this.tempLine) return;
      const pos = this.stage.getPointerPosition();
      if (!pos) return;
      const scale = this.stage.scaleX();
      const sp = this.stage.position();
      const worldX = (pos.x - sp.x) / scale;
      const worldY = (pos.y - sp.y) / scale;
      const from = this.getNodeCenter(this.connectingFromNodeId);
      this.tempLine.points([from.x, from.y, worldX, worldY]);
      this.relationsLayer.batchDraw();
    });

    this.stage.on('mouseup', () => {
      if (this.connectingFromNodeId === null) return;
      const toNodeId = this.getNodeIdAtPointer();
      if (toNodeId !== null && toNodeId !== this.connectingFromNodeId) {
        this.finishConnect(toNodeId);
      } else {
        this.cancelConnect();
      }
    });

    // relationsLayer va primero → se renderiza detrás de los nodos
    this.relationsLayer = new Konva.Layer();
    this.stage.add(this.relationsLayer);
    this.layer = new Konva.Layer();
    this.stage.add(this.layer);
    this.layer.draw();

    if (this.projectId && this.mapId) {
      this.loadNodes();
    }
  }

  private loadNodes(): void {
    this.nodeService
      .getAll(Number(this.projectId), Number(this.mapId))
      .subscribe((page) => {
        page.content.forEach((node) => this.drawNode(node));
        this.fitToNodes(page.content);
        this.layer.draw();
        this.loadRelations();
      });
  }

  private loadRelations(): void {
    this.relationService
      .getAll(Number(this.projectId), Number(this.mapId))
      .subscribe({
        next: (rels) => {
          rels.forEach((rel) => {
            const key = this.relationKey(rel.sourceNodeId, rel.targetNodeId);
            if (this.relationSet.has(key)) return;
            this.relations.push(rel);
            this.relationSet.add(key);
            this.drawRelationLine(rel);
          });
          this.relationsLayer.batchDraw();
        },
        error: () => {}, // no romper el editor si falla la carga
      });
  }

  private relationKey(a: number, b: number): string {
    return `${Math.min(a, b)}-${Math.max(a, b)}`;
  }

  private drawRelationLine(rel: NodeRelation): void {
    if (!this.nodeGroups.has(rel.sourceNodeId) || !this.nodeGroups.has(rel.targetNodeId)) return;
    const a = this.getNodeCenter(rel.sourceNodeId);
    const b = this.getNodeCenter(rel.targetNodeId);
    const line = new Konva.Line({
      points: [a.x, a.y, b.x, b.y],
      stroke: 'rgba(74, 158, 173, 0.4)',
      strokeWidth: 1.5,
      listening: false,
    });
    this.relationLines.set(rel.id, line);
    this.relationsLayer.add(line);
  }

  private getNodeCenter(nodeId: number): { x: number; y: number } {
    const group = this.nodeGroups.get(nodeId);
    if (!group) return { x: 0, y: 0 };
    return { x: group.x() + NODE_WIDTH / 2, y: group.y() + NODE_HEIGHT / 2 };
  }

  private updateLinesForNode(nodeId: number): void {
    const center = this.getNodeCenter(nodeId);
    for (const rel of this.relations) {
      if (rel.sourceNodeId !== nodeId && rel.targetNodeId !== nodeId) continue;
      const line = this.relationLines.get(rel.id);
      if (!line) continue;
      const otherId = rel.sourceNodeId === nodeId ? rel.targetNodeId : rel.sourceNodeId;
      const other = this.getNodeCenter(otherId);
      line.points([center.x, center.y, other.x, other.y]);
    }
    this.relationsLayer.batchDraw();
  }

  private getNodeIdAtPointer(): number | null {
    const pos = this.stage.getPointerPosition();
    if (!pos) return null;
    const shape = this.stage.getIntersection(pos);
    if (!shape) return null;
    let current: Konva.Node = shape;
    while (current && !(current instanceof Konva.Stage)) {
      if (current instanceof Konva.Group) {
        const gid = current.id();
        if (gid.startsWith('node-')) return parseInt(gid.slice(5), 10);
      }
      if (!current.parent) break;
      current = current.parent as Konva.Node;
    }
    return null;
  }

  private startConnect(fromNodeId: number): void {
    this.connectingFromNodeId = fromNodeId;
    const center = this.getNodeCenter(fromNodeId);
    this.tempLine = new Konva.Line({
      points: [center.x, center.y, center.x, center.y],
      stroke: '#60a3a5',
      strokeWidth: 1.5,
      dash: [6, 4],
      listening: false,
    });
    this.relationsLayer.add(this.tempLine);
    this.relationsLayer.batchDraw();
    this.canvasContainer.nativeElement.style.cursor = 'crosshair';
  }

  private finishConnect(toNodeId: number): void {
    const fromNodeId = this.connectingFromNodeId!;
    this.cancelConnect();
    const key = this.relationKey(fromNodeId, toNodeId);
    if (this.relationSet.has(key)) return; // ya existe visualmente
    this.relationService
      .create(Number(this.projectId), Number(this.mapId), {
        sourceNodeId: fromNodeId,
        targetNodeId: toNodeId,
      })
      .subscribe({
        next: (rel) => {
          this.zone.run(() => {
            const rkey = this.relationKey(rel.sourceNodeId, rel.targetNodeId);
            if (this.relationSet.has(rkey)) return;
            this.relations.push(rel);
            this.relationSet.add(rkey);
            this.drawRelationLine(rel);
            this.relationsLayer.batchDraw();
          });
        },
        error: () => {}, // backend rechaza duplicado u otros errores → ignorar silenciosamente
      });
  }

  private cancelConnect(): void {
    this.tempLine?.destroy();
    this.tempLine = null;
    this.connectingFromNodeId = null;
    this.relationsLayer.batchDraw();
    this.canvasContainer.nativeElement.style.cursor = 'default';
  }

  private fitToNodes(nodes: Node[]): void {
    const stageW = this.stage.width();
    const stageH = this.stage.height();

    if (nodes.length === 0) {
      this.stage.scale({ x: 1, y: 1 });
      this.stage.position({ x: stageW / 2, y: stageH / 2 });
      return;
    }

    const padding = 120;
    const minX = Math.min(...nodes.map((n) => n.posX));
    const minY = Math.min(...nodes.map((n) => n.posY));
    const maxX = Math.max(...nodes.map((n) => n.posX + NODE_WIDTH));
    const maxY = Math.max(...nodes.map((n) => n.posY + NODE_HEIGHT));

    const contentW = maxX - minX || NODE_WIDTH;
    const contentH = maxY - minY || NODE_HEIGHT;

    const scaleX = (stageW - padding * 2) / contentW;
    const scaleY = (stageH - padding * 2) / contentH;
    const scale = Math.min(scaleX, scaleY, 1.2);

    const centerX = minX + contentW / 2;
    const centerY = minY + contentH / 2;

    this.stage.scale({ x: scale, y: scale });
    this.stage.position({
      x: stageW / 2 - centerX * scale,
      y: stageH / 2 - centerY * scale,
    });
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  private drawNode(node: Node): void {
    const group = new Konva.Group({
      x: node.posX,
      y: node.posY,
      draggable: true,
      id: `node-${node.id}`,
    });

    group.setAttr('origColor', node.color);

    // Anillo de hover: enmarca el nodo con trazo punteado al pasar el cursor
    const ring = new Konva.Rect({
      x: -3,
      y: -3,
      width: NODE_WIDTH + 6,
      height: NODE_HEIGHT + 6,
      fill: 'transparent',
      stroke: 'rgba(74, 158, 173, 0.7)',
      strokeWidth: 1.5,
      cornerRadius: 8,
      dash: [5, 3],
      visible: false,
      listening: false,
    });

    const rect = new Konva.Rect({
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      fill: this.hexToRgba(node.color, 0.18),
      stroke: node.color,
      strokeWidth: 1.5,
      cornerRadius: 6,
    });

    const label = new Konva.Text({
      text: node.label,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      align: 'center',
      verticalAlign: 'middle',
      fontSize: 15,
      fill: '#e0e8f0',
      padding: 8,
    });

    // Handle de conexión: punto en el borde derecho del nodo
    const handle = new Konva.Circle({
      x: NODE_WIDTH,
      y: NODE_HEIGHT / 2,
      radius: 7,
      fill: 'rgba(74, 158, 173, 0.85)',
      stroke: '#1e2530',
      strokeWidth: 1.5,
      visible: false,
    });

    group.add(ring);
    group.add(rect);
    group.add(label);
    group.add(handle);

    group.on('mouseenter', () => {
      if (this.connectingFromNodeId !== null) return;
      ring.visible(true);
      handle.visible(true);
      this.layer.batchDraw();
    });

    group.on('mouseleave', () => {
      ring.visible(false);
      handle.visible(false);
      this.layer.batchDraw();
    });

    handle.on('mousedown', (e) => {
      e.cancelBubble = true; // evita que el grupo inicie drag
      ring.visible(false);
      handle.visible(false);
      this.layer.batchDraw();
      this.startConnect(node.id);
    });

    let wasDragged = false;
    group.on('dragstart', () => { wasDragged = true; });

    group.on('dragmove', () => {
      this.updateLinesForNode(node.id);
    });

    group.on('dragend', () => {
      const pos = group.position();
      node.posX = Math.round(pos.x);
      node.posY = Math.round(pos.y);
      this.nodeService
        .update(Number(this.projectId), Number(this.mapId), node.id, {
          label: node.label,
          description: node.description,
          type: node.type,
          color: node.color,
          posX: node.posX,
          posY: node.posY,
        })
        .subscribe();
      setTimeout(() => { wasDragged = false; }, 0);
    });

    group.on('click', () => {
      if (wasDragged) return;
      if (this.connectingFromNodeId !== null) return;
      this.zone.run(() => this.selectNode(node));
    });

    this.nodeGroups.set(node.id, group);
    this.layer.add(group);
  }

  protected selectNode(node: Node): void {
    if (this.selectedNode?.id === node.id) return;
    this.isEditing = false;
    this.editSubmitted = false;
    this.showDeleteConfirm = false;
    this.closeWikiPicker();
    this.currentNodeWikis = [];
    this.applySelectionStyle(this.selectedNode, false);
    this.selectedNode = node;
    this.applySelectionStyle(node, true);
    this.showAddForm = false;
    this.layer.draw();
    this.loadNodeWikis();
  }

  protected clearSelection(): void {
    if (!this.selectedNode) return;
    this.isEditing = false;
    this.editSubmitted = false;
    this.showDeleteConfirm = false;
    this.closeWikiPicker();
    this.applySelectionStyle(this.selectedNode, false);
    this.selectedNode = null;
    this.currentNodeWikis = [];
    this.layer.draw();
  }

  private applySelectionStyle(node: Node | null, selected: boolean): void {
    if (!node) return;
    const group = this.nodeGroups.get(node.id);
    if (!group) return;
    const rect = group.findOne('Rect') as Konva.Rect;
    rect.stroke(selected ? '#ffffff' : group.getAttr('origColor'));
    rect.strokeWidth(selected ? 2.5 : 1.5);
  }

  private updateNodeVisuals(node: Node): void {
    const group = this.nodeGroups.get(node.id);
    if (!group) return;
    group.setAttr('origColor', node.color);
    (group.findOne('Rect') as Konva.Rect).fill(this.hexToRgba(node.color, 0.18));
    // node remains selected → keep white stroke
    (group.findOne('Text') as Konva.Text).text(node.label);
    this.layer.draw();
  }

  protected openEditMode(): void {
    if (!this.selectedNode) return;
    this.editLabel = this.selectedNode.label;
    this.editDescription = this.selectedNode.description ?? '';
    this.editType = this.selectedNode.type;
    this.editColor = this.selectedNode.color;
    this.editSubmitted = false;
    this.showDeleteConfirm = false;
    this.isEditing = true;
  }

  protected cancelEdit(): void {
    this.isEditing = false;
    this.editSubmitted = false;
  }

  protected requestDelete(): void {
    this.showDeleteConfirm = true;
  }

  protected cancelDelete(): void {
    this.showDeleteConfirm = false;
  }

  protected confirmDelete(): void {
    if (!this.selectedNode) return;
    const node = this.selectedNode;
    this.deletingNode = true;
    this.nodeService
      .delete(Number(this.projectId), Number(this.mapId), node.id)
      .subscribe({
        next: () => {
          this.zone.run(() => {
            // Eliminar líneas de relación conectadas a este nodo
            const connectedRels = this.relations.filter(
              (r) => r.sourceNodeId === node.id || r.targetNodeId === node.id,
            );
            for (const rel of connectedRels) {
              this.relationLines.get(rel.id)?.destroy();
              this.relationLines.delete(rel.id);
              this.relationSet.delete(this.relationKey(rel.sourceNodeId, rel.targetNodeId));
            }
            this.relations = this.relations.filter(
              (r) => r.sourceNodeId !== node.id && r.targetNodeId !== node.id,
            );
            this.relationsLayer.batchDraw();

            const group = this.nodeGroups.get(node.id);
            group?.destroy();
            this.nodeGroups.delete(node.id);
            this.layer.draw();
            this.deletingNode = false;
            this.showDeleteConfirm = false;
            this.selectedNode = null;
            this.isEditing = false;
            this.cdr.detectChanges();
          });
        },
        error: () => {
          this.zone.run(() => {
            this.deletingNode = false;
            this.cdr.detectChanges();
          });
        },
      });
  }

  protected submitEdit(): void {
    this.editSubmitted = true;
    if (!this.editLabel.trim() || !this.editType) return;

    const node = this.selectedNode!;
    this.savingEdit = true;
    this.nodeService
      .update(Number(this.projectId), Number(this.mapId), node.id, {
        label: this.editLabel.trim(),
        description: this.editDescription.trim(),
        type: this.editType as NodeType,
        color: this.editColor,
        posX: node.posX,
        posY: node.posY,
      })
      .subscribe({
        next: (updated) => {
          this.zone.run(() => {
            node.label = updated.label;
            node.description = updated.description;
            node.type = updated.type;
            node.color = updated.color;
            this.isEditing = false;
            this.editSubmitted = false;
            this.savingEdit = false;
            this.updateNodeVisuals(node);
            this.cdr.detectChanges();
          });
        },
        error: () => {
          this.savingEdit = false;
          this.cdr.detectChanges();
        },
      });
  }

  private getCanvasCenter(): { x: number; y: number } {
    const scale = this.stage.scaleX();
    const stagePos = this.stage.position();
    const containerWidth = this.stage.width();
    const containerHeight = this.stage.height();
    return {
      x: Math.round((containerWidth / 2 - stagePos.x) / scale - NODE_WIDTH / 2),
      y: Math.round((containerHeight / 2 - stagePos.y) / scale - NODE_HEIGHT / 2),
    };
  }

  protected onCanvasContextMenu(e: MouseEvent): void {
    e.preventDefault();
    const container = this.canvasContainer.nativeElement;
    const rect = container.getBoundingClientRect();
    const scale = this.stage.scaleX();
    const stagePos = this.stage.position();
    this.pendingPos = {
      x: Math.round((e.clientX - rect.left - stagePos.x) / scale - NODE_WIDTH / 2),
      y: Math.round((e.clientY - rect.top - stagePos.y) / scale - NODE_HEIGHT / 2),
    };
    this.contextMenuX = e.clientX;
    this.contextMenuY = e.clientY;
    this.contextMenuVisible = true;
    setTimeout(() => {
      const close = () => {
        this.zone.run(() => {
          this.contextMenuVisible = false;
        });
        document.removeEventListener('click', close);
      };
      document.addEventListener('click', close);
    }, 0);
  }

  protected openFormFromContextMenu(): void {
    this.contextMenuVisible = false;
    this.showAddForm = true;
    this.formSubmitted = false;
    this.newLabel = '';
    this.newDescription = '';
    this.newType = '';
    this.newColor = '#4a9ead';
  }

  protected toggleAddForm(): void {
    this.showAddForm = !this.showAddForm;
    if (this.showAddForm) {
      this.selectedNode = null;
      this.isEditing = false;
      this.editSubmitted = false;
    } else {
      this.newLabel = '';
      this.newDescription = '';
      this.newType = '';
      this.newColor = '#4a9ead';
      this.formSubmitted = false;
      this.pendingPos = null;
    }
  }

  // --- Wiki methods ---
  private loadNodeWikis(): void {
    if (!this.selectedNode) return;
    this.wikiService
      .getNodeWikis(Number(this.projectId), Number(this.mapId), this.selectedNode.id)
      .subscribe({
        next: (wikis) => {
          this.zone.run(() => {
            this.currentNodeWikis = wikis;
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
        const associatedIds = new Set(this.currentNodeWikis.map((w) => w.id));
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
    this.previewWiki = null;
  }

  protected navigateToWiki(wiki: Wiki): void {
    window.open(`/app/projects/${this.projectId}/wikis/${wiki.id}`, '_blank');
  }

  protected onWikiSearchInput(): void {
    this.searchProjectWikis();
  }

  protected associateWiki(wiki: Wiki): void {
    if (!this.selectedNode) return;
    this.wikiService
      .associateWiki(Number(this.projectId), Number(this.mapId), this.selectedNode.id, wiki.id)
      .subscribe({
        next: () => {
          this.zone.run(() => {
            this.loadNodeWikis();
            this.searchProjectWikis();
          });
        },
        error: () => {},
      });
  }

  protected removeWiki(wiki: Wiki): void {
    if (!this.selectedNode) return;
    this.wikiService
      .removeWiki(Number(this.projectId), Number(this.mapId), this.selectedNode.id, wiki.id)
      .subscribe({
        next: () => {
          this.zone.run(() => {
            this.loadNodeWikis();
          });
        },
        error: () => {},
      });
  }

  protected submitNewNode(): void {
    this.formSubmitted = true;
    if (!this.newLabel.trim() || !this.newType) return;
    this.savingNode = true;
    const pos = this.pendingPos ?? this.getCanvasCenter();
    this.nodeService
      .create(Number(this.projectId), Number(this.mapId), {
        label: this.newLabel.trim(),
        description: this.newDescription.trim(),
        type: this.newType,
        color: this.newColor,
        posX: pos.x,
        posY: pos.y,
      })
      .subscribe({
        next: (node) => {
          this.drawNode(node);
          this.layer.draw();
          this.showAddForm = false;
          this.newLabel = '';
          this.newDescription = '';
          this.newType = '';
          this.newColor = '#4a9ead';
          this.formSubmitted = false;
          this.pendingPos = null;
          this.savingNode = false;
        },
        error: () => {
          this.savingNode = false;
        },
      });
  }
}
