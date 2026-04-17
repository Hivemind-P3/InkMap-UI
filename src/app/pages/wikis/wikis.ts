import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { WikiService } from '../../services/wiki.service';
import { ToastService } from '../../services/toast.service';
import { Wiki } from '../../models/wiki.model';

@Component({
  selector: 'app-wikis',
  imports: [FormsModule],
  templateUrl: './wikis.html',
  styleUrl: './wikis.scss',
})
export class Wikis implements OnInit {
  private wikiService = inject(WikiService);
  private toastService = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  protected projectId = '';
  protected wikis: Wiki[] = [];
  protected isLoading = true;
  protected currentPage = 0;
  protected totalPages = 0;
  protected searchQuery = '';

  protected showCreateForm = false;
  protected newTitle = '';
  protected newContent = '';
  protected isCreating = false;
  protected showTitleError = false;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('projectId') ?? '';
    this.loadWikis();
  }

  loadWikis(): void {
    this.isLoading = true;
    const search = this.searchQuery.trim() || undefined;
    this.wikiService.getWikisPaged(parseInt(this.projectId), this.currentPage, search).subscribe({
      next: (res) => {
        this.wikis = res.content;
        this.totalPages = res.totalPages;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        this.toastService.show('error', err.error?.message || 'Error loading wikis');
        this.cdr.detectChanges();
      },
    });
  }

  search(): void {
    this.currentPage = 0;
    this.loadWikis();
  }

  openCreateForm(): void {
    this.newTitle = '';
    this.newContent = '';
    this.showTitleError = false;
    this.showCreateForm = true;
  }

  cancelCreate(): void {
    this.showCreateForm = false;
    this.newTitle = '';
    this.newContent = '';
    this.showTitleError = false;
  }

  onTitleInput(): void {
    if (this.showTitleError && this.newTitle.trim()) {
      this.showTitleError = false;
    }
  }

  createWiki(): void {
    const title = this.newTitle.trim();
    if (!title) {
      this.showTitleError = true;
      return;
    }
    this.isCreating = true;
    const content = this.newContent.trim() || undefined;
    this.wikiService.createWiki(parseInt(this.projectId), { title, content }).subscribe({
      next: () => {
        this.isCreating = false;
        this.showCreateForm = false;
        this.newTitle = '';
        this.newContent = '';
        this.currentPage = 0;
        this.loadWikis();
      },
      error: (err) => {
        this.isCreating = false;
        this.toastService.show('error', err.error?.message || 'Error creating wiki');
        this.cdr.detectChanges();
      },
    });
  }

  openWiki(wikiId: number): void {
    window.location.href = `/app/projects/${this.projectId}/wikis/${wikiId}`;
  }

  goBack(): void {
    window.location.href = '/app/project/' + this.projectId;
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadWikis();
    }
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadWikis();
    }
  }
}
