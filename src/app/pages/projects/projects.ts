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

  // ── List state ────────────────────────────────────────────────────────────
  readonly projects = signal<Project[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');

  // ── Modal state ───────────────────────────────────────────────────────────
  readonly showModal = signal(false);
  readonly isSubmitting = signal(false);
  readonly submitError = signal('');

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
    this.projectsService.getMyProjects().subscribe({
      next: (data) => {
        this.projects.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Could not load your projects. Please try again.');
        this.isLoading.set(false);
      },
    });
  }

  openModal(): void {
    this.resetForm();
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  cancelModal(): void {
    const hasData =
      this.formTitle.trim() ||
      this.formDescription.trim() ||
      this.formMedium ||
      this.formTags.length > 0;

    if (!hasData || confirm('Discard this project draft?\nYour changes will be lost.')) {
      this.closeModal();
    }
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

    this.projectsService
      .createProject({
        title: this.formTitle.trim(),
        description: this.formDescription.trim(),
        medium: this.formMedium,
        tags: this.formTags,
      })
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.closeModal();
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

  logout(): void {
    this.authService.logout();
  }
}
