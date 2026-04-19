import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NarrativeService, Narrative } from '../../services/narrative.service';
import { NarrativeVersionService, NarrativeVersion } from '../../services/narrative-version.service';
import { ProjectsService } from '../../services/projects.service';
import { ToastService } from '../../services/toast.service';
import { NarrativeListComponent } from '../narrative-list/narrative-list';
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
  versions: NarrativeVersion[] = [];
  selectedVersion?: NarrativeVersion;
  selectedVersionNum = 0;
  viewedContent: any = null;

  ngOnInit() {
    this.projectsService.getProjectById(this.projectId).subscribe({
      next: (p) => {
        this.projectName = p.title;
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  onSelected(c: Narrative) {
    this.selected = c;
    this.title = c.title;
    this.selectedVersion = undefined;
    this.viewedContent = null;
    try {
      this.content = c.content ? JSON.parse(c.content) : '';
    } catch {
      this.content = '';
    }
    this.loadVersions();
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
    this.cdr.detectChanges();
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
          this.toast.show('success', 'Capítulo guardado');
          this.cdr.detectChanges();
        },
        error: () => {
          this.isSaving = false;
          this.toast.show('error', 'Error al guardar el capítulo');
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
              this.toast.show('success', 'Versión creada');
              this.loadVersions();
              this.cdr.detectChanges();
            },
            error: () => {
              this.isCreatingVersion = false;
              this.toast.show('error', 'Error al crear la versión');
              this.cdr.detectChanges();
            },
          });
        },
        error: () => {
          this.isCreatingVersion = false;
          this.toast.show('error', 'Error al guardar antes de crear la versión');
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
