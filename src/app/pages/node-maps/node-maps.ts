import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NodeMap } from '../../models/node-map.model';
import { NodeMapService } from '../../services/node-map.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-node-maps',
  imports: [FormsModule, DatePipe],
  templateUrl: './node-maps.html',
  styleUrl: './node-maps.scss',
})
export class NodeMaps implements OnInit {
  private nodeMapService = inject(NodeMapService);
  private toastService = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  protected projectId: string = '';
  protected maps: NodeMap[] = [];
  protected isLoading = true;
  protected currentPage = 0;
  protected totalPages = 0;

  protected showCreateForm = false;
  protected newMapName = '';
  protected isCreating = false;
  protected showNameError = false;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('id') ?? '';
    this.loadMaps();
  }

  loadMaps(): void {
    this.isLoading = true;
    this.nodeMapService.getAllByProjectId(parseInt(this.projectId), this.currentPage).subscribe({
      next: (res) => {
        this.maps = res.content;
        this.totalPages = res.totalPages;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        this.toastService.show('error', err.error?.message || 'Error loading node maps');
        this.cdr.detectChanges();
      },
    });
  }

  openCreateForm(): void {
    this.newMapName = '';
    this.showNameError = false;
    this.showCreateForm = true;
  }

  cancelCreate(): void {
    this.showCreateForm = false;
    this.newMapName = '';
    this.showNameError = false;
  }

  onNameInput(): void {
    if (this.showNameError && this.newMapName.trim()) {
      this.showNameError = false;
    }
  }

  createMap(): void {
    const name = this.newMapName.trim();
    if (!name) {
      this.showNameError = true;
      return;
    }

    this.isCreating = true;
    this.nodeMapService.create(parseInt(this.projectId), { name }).subscribe({
      next: () => {
        this.isCreating = false;
        this.showCreateForm = false;
        this.newMapName = '';
        this.currentPage = 0;
        this.loadMaps();
      },
      error: (err) => {
        this.isCreating = false;
        this.toastService.show('error', err.error?.message || 'Error creating node map');
        this.cdr.detectChanges();
      },
    });
  }

  openEditor(mapId: number): void {
    window.location.href = `/app/node-map-editor/${this.projectId}/${mapId}`;
  }

  goBack(): void {
    window.location.href = '/app/project/' + this.projectId;
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadMaps();
    }
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadMaps();
    }
  }
}
