import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NarrativeService, Narrative } from '../../services/narrative.service';
import { NarrativeVersionService, NarrativeVersion } from '../../services/narrative-version.service';
import { NarrativeAssociationsService, NarrativeAssociations } from '../../services/narrative-associations.service';
import { CharactersService } from '../../services/characters.service';
import { WikiService } from '../../services/wiki.service';
import { ProjectsService } from '../../services/projects.service';
import { ToastService } from '../../services/toast.service';
import { NarrativeListComponent } from '../narrative-list/narrative-list';
import { StoryCharacter } from '../../models/story-character.model';
import { Wiki } from '../../models/wiki.model';
import { QuillEditorComponent } from 'ngx-quill';

@Component({
  selector: 'app-editor',
  templateUrl: './editor.html',
  styleUrls: ['./editor.scss'],
  imports: [NarrativeListComponent, QuillEditorComponent, FormsModule, DatePipe],
})
export class EditorComponent implements OnInit {
  private service = inject(NarrativeService);
  private versionService = inject(NarrativeVersionService);
  private assocService = inject(NarrativeAssociationsService);
  private charactersService = inject(CharactersService);
  private wikiService = inject(WikiService);
  private projectsService = inject(ProjectsService);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  projectId = Number(this.route.snapshot.paramMap.get('projectId'));
  projectName = '';
  selected?: Narrative;
  content: any = '';
  title = '';
  isSaving = false;
  isCreatingVersion = false;
  isRestoring = false;
  showRestoreConfirm = false;
  versions: NarrativeVersion[] = [];
  selectedVersion?: NarrativeVersion;
  selectedVersionNum = 0;
  viewedContent: any = null;

  // ── Associations state ────────────────────────────────────────────────────
  associations: NarrativeAssociations | null = null;
  availableCharacters: StoryCharacter[] = [];
  availableWikis: Wiki[] = [];
  isAssocPanelOpen = false;
  isAssocEditMode = false;
  isAssocSaving = false;
  assocError = '';
  selectedCharIds = new Set<number>();
  selectedWikiIds = new Set<number>();

  private quillInstance: any = null;
  private pendingSearchTerm: string | null = null;

  ngOnInit() {
    this.projectsService.getProjectById(this.projectId).subscribe({
      next: (p) => {
        this.projectName = p.title;
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  onEditorReady(quill: any): void {
    this.quillInstance = quill;
  }

  onSearchNavigated(term: string): void {
    this.pendingSearchTerm = term;
  }

  onSelected(c: Narrative) {
    this.selected = c;
    this.title = c.title;
    this.selectedVersion = undefined;
    this.viewedContent = null;
    this.associations = null;
    this.isAssocPanelOpen = false;
    this.isAssocEditMode = false;
    this.isAssocSaving = false;
    this.assocError = '';
    try {
      this.content = c.content ? JSON.parse(c.content) : '';
    } catch {
      this.content = '';
    }
    this.loadVersions();
    if (this.pendingSearchTerm) {
      this.scrollToSearchTerm();
    }
  }

  toggleAssocPanel(): void {
    if (!this.selected) return;
    this.isAssocPanelOpen = !this.isAssocPanelOpen;
    if (this.isAssocPanelOpen && this.associations === null) {
      this.loadAssociations();
    }
  }

  private loadAssociations(): void {
    if (!this.selected) return;
    this.assocService.getAssociations(this.selected.id, this.projectId).subscribe({
      next: (assoc) => {
        this.associations = assoc;
        this.cdr.detectChanges();
      },
      error: () => {
        this.assocError = 'Error loading associations';
        this.cdr.detectChanges();
      },
    });
    if (this.availableCharacters.length === 0) {
      this.charactersService.getCharacters(this.projectId, 0, 1000, '').subscribe({
        next: (res) => {
          this.availableCharacters = res.content;
          this.cdr.detectChanges();
        },
        error: () => {},
      });
    }
    if (this.availableWikis.length === 0) {
      this.wikiService.getProjectWikis(this.projectId).subscribe({
        next: (wikis) => {
          this.availableWikis = wikis;
          this.cdr.detectChanges();
        },
        error: () => {},
      });
    }
  }

  enterAssocEdit(): void {
    this.isAssocEditMode = true;
    this.selectedCharIds = new Set(this.associations?.characters.map((c) => c.id) ?? []);
    this.selectedWikiIds = new Set(this.associations?.places.map((p) => p.id) ?? []);
    this.assocError = '';
    this.cdr.detectChanges();
  }

  toggleAssocChar(id: number): void {
    const next = new Set(this.selectedCharIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.selectedCharIds = next;
  }

  toggleAssocWiki(id: number): void {
    const next = new Set(this.selectedWikiIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.selectedWikiIds = next;
  }

  saveAssociations(): void {
    if (!this.selected || this.isAssocSaving) return;
    this.isAssocSaving = true;
    this.assocService
      .updateAssociations(this.selected.id, {
        projectId: this.projectId,
        characterIds: [...this.selectedCharIds],
        wikiIds: [...this.selectedWikiIds],
      })
      .subscribe({
        next: (updated) => {
          this.associations = updated;
          this.isAssocSaving = false;
          this.isAssocEditMode = false;
          this.toast.show('success', 'Associations saved');
          this.cdr.detectChanges();
        },
        error: () => {
          this.isAssocSaving = false;
          this.assocError = 'Error saving associations';
          this.toast.show('error', 'Error saving associations');
          this.cdr.detectChanges();
        },
      });
  }

  cancelAssocEdit(): void {
    this.isAssocEditMode = false;
    this.assocError = '';
    this.cdr.detectChanges();
  }

  private scrollToSearchTerm(): void {
    const term = this.pendingSearchTerm;
    this.pendingSearchTerm = null;
    setTimeout(() => {
      if (!term || !this.quillInstance) return;
      const text: string = this.quillInstance.getText().toLowerCase();
      const index = text.indexOf(term.toLowerCase());
      if (index >= 0) {
        this.quillInstance.setSelection(index, term.length, 'silent');
        const bounds = this.quillInstance.getBounds(index, term.length);
        const editorEl: HTMLElement = this.quillInstance.root;
        editorEl.scrollTop = editorEl.scrollTop + bounds.top - 100;
      }
    }, 80);
  }

  selectVersion(v: NarrativeVersion, displayIndex: number) {
    try {
      this.viewedContent = v.content ? JSON.parse(v.content) : '';
    } catch {
      this.toast.show('error', 'Could not read version content');
      return;
    }
    this.selectedVersion = v;
    this.selectedVersionNum = this.versions.length - displayIndex;
    this.cdr.detectChanges();
  }

  closeVersionView() {
    this.selectedVersion = undefined;
    this.viewedContent = null;
    this.showRestoreConfirm = false;
    this.cdr.detectChanges();
  }

  restoreVersion() {
    if (!this.selected || !this.selectedVersion || this.isRestoring) return;
    this.isRestoring = true;
    this.versionService
      .restore(this.projectId, this.selected.id, this.selectedVersion.id)
      .subscribe({
        next: (updated) => {
          this.selected = updated;
          try {
            this.content = updated.content ? JSON.parse(updated.content) : '';
          } catch {
            this.content = '';
          }
          this.isRestoring = false;
          this.closeVersionView();
          this.toast.show('success', 'Version successfully restored');
          this.cdr.detectChanges();
        },
        error: () => {
          this.isRestoring = false;
          this.toast.show('error', 'Error restoring version');
          this.cdr.detectChanges();
        },
      });
  }

  save() {
    if (!this.selected || this.isSaving) return;

    this.isSaving = true;
    this.service
      .edit(this.selected.id, {
        projectId: this.projectId,
        title: this.title,
        content: JSON.stringify(this.content),
      })
      .subscribe({
        next: (updated) => {
          this.selected = updated;
          this.isSaving = false;
          this.toast.show('success', 'Chapter saved');
          this.cdr.detectChanges();
        },
        error: () => {
          this.isSaving = false;
          this.toast.show('error', 'Error saving chapter');
          this.cdr.detectChanges();
        },
      });
  }

  createVersion() {
    if (!this.selected || this.isCreatingVersion) return;

    this.isCreatingVersion = true;
    this.service
      .edit(this.selected.id, {
        projectId: this.projectId,
        title: this.title,
        content: JSON.stringify(this.content),
      })
      .subscribe({
        next: (updated) => {
          this.selected = updated;
          this.versionService.create(this.projectId, this.selected.id).subscribe({
            next: () => {
              this.isCreatingVersion = false;
              this.toast.show('success', 'Version created');
              this.loadVersions();
              this.cdr.detectChanges();
            },
            error: () => {
              this.isCreatingVersion = false;
              this.toast.show('error', 'Error creating version');
              this.cdr.detectChanges();
            },
          });
        },
        error: () => {
          this.isCreatingVersion = false;
          this.toast.show('error', 'Error saving before creating version');
          this.cdr.detectChanges();
        },
      });
  }

  private loadVersions() {
    if (!this.selected) return;
    this.versionService.list(this.projectId, this.selected.id).subscribe({
      next: (versions) => {
        this.versions = versions.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        this.cdr.detectChanges();
      },
      error: () => {
        this.versions = [];
        this.cdr.detectChanges();
      },
    });
  }
}
