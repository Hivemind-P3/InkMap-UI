import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { WikiService } from '../../services/wiki.service';
import { ToastService } from '../../services/toast.service';
import { Wiki } from '../../models/wiki.model';

@Component({
  selector: 'app-wiki-detail',
  imports: [],
  templateUrl: './wiki-detail.html',
  styleUrl: './wiki-detail.scss',
})
export class WikiDetail implements OnInit {
  private wikiService = inject(WikiService);
  private toastService = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  protected projectId = '';
  protected wikiId = '';
  protected wiki: Wiki | null = null;
  protected isLoading = true;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('projectId') ?? '';
    this.wikiId = this.route.snapshot.paramMap.get('wikiId') ?? '';
    this.wikiService.getWikiById(parseInt(this.projectId), parseInt(this.wikiId)).subscribe({
      next: (wiki) => {
        this.wiki = wiki;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        this.toastService.show('error', err.error?.message || 'Error loading wiki');
        this.cdr.detectChanges();
      },
    });
  }

  goBack(): void {
    window.location.href = `/app/projects/${this.projectId}/wikis`;
  }
}
