import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import Konva from 'konva';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NodeService } from '../../services/node.service';
import { Node } from '../../models/node.model';

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

  protected projectId: string = '';
  protected mapId: string = '';

  protected showAddForm = false;
  protected newLabel = '';
  protected newDescription = '';
  protected savingNode = false;

  constructor(
    private route: ActivatedRoute,
    private nodeService: NodeService,
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
      });
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

  private drawNode(node: Node): void {
    const group = new Konva.Group({
      x: node.posX,
      y: node.posY,
      draggable: true,
      id: `node-${node.id}`,
    });

    const rect = new Konva.Rect({
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      fill: '#1e3a5f',
      stroke: '#4a9ead',
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

    group.add(rect);
    group.add(label);

    group.on('dragend', () => {
      const pos = group.position();
      this.nodeService
        .update(Number(this.projectId), Number(this.mapId), node.id, {
          label: node.label,
          description: node.description,
          posX: Math.round(pos.x),
          posY: Math.round(pos.y),
        })
        .subscribe();
    });

    this.layer.add(group);
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

  protected toggleAddForm(): void {
    this.showAddForm = !this.showAddForm;
    if (!this.showAddForm) {
      this.newLabel = '';
      this.newDescription = '';
    }
  }

  protected submitNewNode(): void {
    if (!this.newLabel.trim()) return;
    this.savingNode = true;
    const center = this.getCanvasCenter();
    this.nodeService
      .create(Number(this.projectId), Number(this.mapId), {
        label: this.newLabel.trim(),
        description: this.newDescription.trim(),
        posX: center.x,
        posY: center.y,
      })
      .subscribe({
        next: (node) => {
          this.drawNode(node);
          this.layer.draw();
          this.showAddForm = false;
          this.newLabel = '';
          this.newDescription = '';
          this.savingNode = false;
        },
        error: () => {
          this.savingNode = false;
        },
      });
  }
}