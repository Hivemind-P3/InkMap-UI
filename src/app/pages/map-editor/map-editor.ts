import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import Konva from 'konva';
import { ActivatedRoute, RouterLink } from "@angular/router";

@Component({
  selector: 'app-map-editor',
  imports: [RouterLink],
  templateUrl: './map-editor.html',
  styleUrl: './map-editor.scss',
})
export class MapEditor implements AfterViewInit {
  @ViewChild('canvasContainer') canvasContainer!: ElementRef;
  private stage!: Konva.Stage;
  private layer!: Konva.Layer;
  private projectId: string = '';

  constructor(private route: ActivatedRoute) {}

  goBack(): void {
    this.projectId = this.route.snapshot.paramMap.get('projectId') ?? '';
    window.location.href = '/app/geographic-maps/' + this.projectId;
  }

  ngAfterViewInit(): void {
    const container = this.canvasContainer.nativeElement;
    let isSpaceDown = false;

    this.stage = new Konva.Stage({
      container: container,
      width: container.offsetWidth,
      height: container.offsetHeight,
      draggable: false
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

    const initialScale = 0.5;
    this.stage.scale({ x: initialScale, y: initialScale });
    this.stage.position({
      x: (container.offsetWidth - 1920 * initialScale) / 2,
      y: (container.offsetHeight - 1080 * initialScale) / 2
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

    this.layer = new Konva.Layer();
    this.stage.add(this.layer);

    const rect = new Konva.Rect({
      x: 50,
      y: 50,
      width: 1920,
      height: 1080,
      fill: '#d1d1d1'
    });

    this.layer.add(rect);
  }
}
