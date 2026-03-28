import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ProjectsService } from '../../services/projects.service';
import { ToastService } from '../../services/toast.service';
import { Project } from '../../models/project.model';

@Component({
  selector: 'app-projects',
  imports: [RouterLink, DatePipe, FormsModule],
  templateUrl: './projects.html',
  styleUrl: './projects.scss',
})
export class Projects implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly projectsService = inject(ProjectsService);
  private readonly toastService = inject(ToastService);

  private readonly PAGE_SIZE = 9;

  // ── List state ────────────────────────────────────────────────────────────
  readonly projects = signal<Project[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');

  // ── Search & pagination ───────────────────────────────────────────────────
  searchQuery = '';
  readonly currentPage = signal(0);
  readonly totalPages = signal(0);
  readonly totalElements = signal(0);
  // true/false once determined; null only before the very first load completes
  readonly userHasProjects = signal<boolean | null>(null);

  // ── Modal state ───────────────────────────────────────────────────────────
  readonly showModal = signal(false);
  readonly isSubmitting = signal(false);
  readonly isDeleting = signal(false);
  readonly submitError = signal('');
  modalMode: 'create' | 'edit' = 'create';
  selectedProject: Project | null = null;

  // ── Form fields ───────────────────────────────────────────────────────────
  formTitle = '';
  formDescription = '';
  formMedium = '';
  formTagInput = '';
  formTags: string[] = [];

  // ── Field-level errors ────────────────────────────────────────────────────
  titleError = '';
  descriptionError = '';
  mediumError = '';

  readonly mediumOptions = [
    'Novel',
    'Short Story',
    'Comic',
    'Graphic Novel',
    'Manga',
    'Webtoon',
    'Screenplay',
    'Game',
    'Tabletop RPG',
    'Lore / Worldbuilding',
  ];

  get userName(): string {
    return this.authService.getUser()?.name ?? '';
  }

  ngOnInit(): void {
    this.loadProjects();
  }

  loadProjects(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.projectsService.getMyProjects(this.currentPage(), this.PAGE_SIZE, this.searchQuery).subscribe({
      next: (page) => {
        this.projects.set(page.content);
        this.totalPages.set(page.totalPages);
        this.totalElements.set(page.totalElements);
        // Only update the "does this user own any projects" flag on unfiltered loads
        if (!this.searchQuery.trim()) {
          this.userHasProjects.set(page.totalElements > 0);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Could not load your projects. Please try again.');
        this.isLoading.set(false);
      },
    });
  }

  applySearch(): void {
    this.currentPage.set(0);
    this.loadProjects();
  }

  previousPage(): void {
    if (this.currentPage() > 0) {
      this.currentPage.update((p) => p - 1);
      this.loadProjects();
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages() - 1) {
      this.currentPage.update((p) => p + 1);
      this.loadProjects();
    }
  }

  // ── Modal ─────────────────────────────────────────────────────────────────

  openModal(): void {
    this.modalMode = 'create';
    this.selectedProject = null;
    this.resetForm();
    this.showModal.set(true);
  }

  openEditModal(project: Project): void {
    this.modalMode = 'edit';
    this.selectedProject = project;
    this.formTitle = project.title;
    this.formDescription = project.description ?? '';
    this.formMedium = project.medium ?? '';
    this.formTags = project.tags ? [...project.tags] : [];
    this.formTagInput = '';
    this.titleError = '';
    this.descriptionError = '';
    this.mediumError = '';
    this.submitError.set('');
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  cancelModal(): void {
    if (this.modalMode === 'create') {
      const hasData =
        this.formTitle.trim() ||
        this.formDescription.trim() ||
        this.formMedium ||
        this.formTags.length > 0;

      if (hasData && !confirm('Discard this project draft?\nYour changes will be lost.')) {
        return;
      }
    }
    this.closeModal();
  }

  private resetForm(): void {
    this.formTitle = '';
    this.formDescription = '';
    this.formMedium = '';
    this.formTagInput = '';
    this.formTags = [];
    this.titleError = '';
    this.descriptionError = '';
    this.mediumError = '';
    this.submitError.set('');
  }

  addTag(): void {
    const tag = this.formTagInput.trim();
    if (tag && !this.formTags.includes(tag)) {
      this.formTags = [...this.formTags, tag];
    }
    this.formTagInput = '';
  }

  removeTag(tag: string): void {
    this.formTags = this.formTags.filter((t) => t !== tag);
  }

  private validate(): boolean {
    let valid = true;
    this.titleError = '';
    this.descriptionError = '';
    this.mediumError = '';

    if (!this.formTitle.trim()) {
      this.titleError = 'Title is required.';
      valid = false;
    }
    if (!this.formDescription.trim()) {
      this.descriptionError = 'Description is required.';
      valid = false;
    }
    if (!this.formMedium) {
      this.mediumError = 'Please select a medium.';
      valid = false;
    }
    return valid;
  }

  submitForm(): void {
    if (!this.validate()) return;

    this.isSubmitting.set(true);
    this.submitError.set('');

    const payload = {
      title: this.formTitle.trim(),
      description: this.formDescription.trim(),
      medium: this.formMedium,
      tags: this.formTags,
    };

    if (this.modalMode === 'edit' && this.selectedProject !== null) {
      this.projectsService.updateProject(this.selectedProject.id, payload).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.closeModal();
          this.loadProjects();
          this.toastService.show('success', 'Project updated successfully.');
        },
        error: (err) => {
          this.isSubmitting.set(false);
          if (err.status === 409) {
            this.submitError.set('A project with this title already exists.');
          } else {
            this.submitError.set('Something went wrong. Please try again.');
          }
        },
      });
    } else {
      this.projectsService.createProject(payload).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.closeModal();
          this.currentPage.set(0);
          this.loadProjects();
          this.toastService.show('success', 'Project created successfully.');
        },
        error: (err) => {
          this.isSubmitting.set(false);
          if (err.status === 409) {
            this.submitError.set('A project with this title already exists.');
          } else {
            this.submitError.set('Something went wrong. Please try again.');
          }
        },
      });
    }
  }

  confirmDelete(): void {
    if (this.selectedProject === null) return;

    const { id, title } = this.selectedProject;

    if (!confirm(`¿Quieres eliminar el proyecto: ${title}?`)) return;

    this.isDeleting.set(true);
    this.projectsService.deleteProject(id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.closeModal();
        if (this.projects().length === 1 && this.currentPage() > 0) {
          this.currentPage.update((p) => p - 1);
        }
        this.loadProjects();
        this.toastService.show('success', 'Project deleted successfully.');
      },
      error: () => {
        this.isDeleting.set(false);
        this.toastService.show('error', 'Could not delete the project. Please try again.');
      },
    });
  }

  logout(): void {
    this.authService.logout();
  }
}
