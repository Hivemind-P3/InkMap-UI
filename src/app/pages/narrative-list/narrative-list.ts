import { ChangeDetectorRef, Component, inject, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NarrativeService, Narrative, NarrativeSearchResult } from '../../services/narrative.service';
import { ToastService } from '../../services/toast.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-narrative-list',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './narrative-list.html',
  styleUrls: ['./narrative-list.scss'],
})
export class NarrativeListComponent implements OnInit, OnDestroy {
  @Input() projectId!: number;
  @Output() selected = new EventEmitter<Narrative>();
  @Output() searchNavigated = new EventEmitter<string>();

  narratives: Narrative[] = [];
  selectedId?: number;

  isCreating = false;
  newTitle = '';
  isReordering = false;

  searchQuery = '';
  isSearching = false;
  searchResults: NarrativeSearchResult[] | null = null;
  searchError = '';

  private sub!: Subscription;
  private cdr = inject(ChangeDetectorRef);
  private toast = inject(ToastService);

  constructor(private service: NarrativeService) {}

  ngOnInit(): void {
    this.sub = this.service.narratives$.subscribe((res) => {
      this.narratives = [...res].sort((a, b) => a.order - b.order);
      this.cdr.detectChanges();
    });
    this.service.list(this.projectId).subscribe();
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  toggleForm() {
    this.isCreating = !this.isCreating;
    this.newTitle = '';
  }

  submitCreate() {
    const title = this.newTitle.trim();
    if (!title) return;

    this.service.create(this.projectId, title).subscribe(() => {
      this.isCreating = false;
      this.newTitle = '';
    });
  }

  cancelCreate() {
    this.isCreating = false;
    this.newTitle = '';
  }

  select(c: Narrative) {
    this.selectedId = c.id;
    this.selected.emit(c);
  }

  executeSearch(): void {
    if (this.searchQuery.trim().length < 3) return;
    this.isSearching = true;
    this.searchError = '';
    this.searchResults = [];
    this.service.search(this.projectId, this.searchQuery.trim()).subscribe({
      next: (results) => {
        this.searchResults = results;
        this.isSearching = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isSearching = false;
        const raw = err?.error?.message ?? err?.error ?? '';
        this.searchError = typeof raw === 'string' && raw ? raw : 'Search failed. Please try again.';
        this.cdr.detectChanges();
      },
    });
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchResults = null;
    this.searchError = '';
    this.cdr.detectChanges();
  }

  selectResult(r: NarrativeSearchResult): void {
    const narrative = this.narratives.find((n) => n.id === r.narrativeId);
    if (narrative) {
      const term = this.searchQuery.trim();
      this.searchNavigated.emit(term);
      this.clearSearch();
      this.select(narrative);
    }
  }

  move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= this.narratives.length || this.isReordering) return;

    // Optimistic swap: exchange positions and order values so the sort stays stable
    const snapshot = [...this.narratives];
    const list = [...this.narratives];
    [list[index], list[target]] = [list[target], list[index]];
    const tempOrder = list[index].order;
    list[index] = { ...list[index], order: list[target].order };
    list[target] = { ...list[target], order: tempOrder };

    this.narratives = list;
    this.isReordering = true;
    this.cdr.detectChanges();

    this.service.reorder(this.projectId, { orderedIds: list.map((n) => n.id) }).subscribe({
      next: () => {
        this.isReordering = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.narratives = snapshot;
        this.isReordering = false;
        this.toast.show('error', 'Error al reordenar capítulos');
        this.cdr.detectChanges();
      },
    });
  }
}
