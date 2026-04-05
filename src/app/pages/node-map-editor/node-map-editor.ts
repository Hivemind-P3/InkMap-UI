import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import Konva from 'konva';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-node-map-editor',
  imports: [RouterLink],
  templateUrl: './node-map-editor.html',
  styleUrl: './node-map-editor.scss',
})
export class NodeMapEditor implements OnInit, AfterViewInit {
  @ViewChild('canvasContainer') canvasContainer!: ElementRef;
  private stage!: Konva.Stage;
  private layer!: Konva.Layer;

  protected projectId: string = '';
  // mapId disponible para futura carga/guardado del mapa
  protected mapId: string = '';

  constructor(private route: ActivatedRoute) {}

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

    const initialScale = 0.8;
    this.stage.scale({ x: initialScale, y: initialScale });
    this.stage.position({ x: 0, y: 0 });

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

    // Fondo temporal para confirmar que el stage renderiza correctamente
    // TODO: reemplazar con el fondo definitivo del canvas de nodos
    const background = new Konva.Rect({
      x: -5000,
      y: -5000,
      width: 10000,
      height: 10000,
      fill: '#242d3d',
    });
    this.layer.add(background);
    this.layer.draw();
  }
}