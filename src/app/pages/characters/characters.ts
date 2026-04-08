import { Component, ElementRef, inject, OnInit, signal, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { CharactersService } from '../../services/characters.service';
import { ToastService } from '../../services/toast.service';
import { StoryCharacter } from '../../models/story-character.model';

@Component({
  selector: 'app-characters',
  imports: [ DatePipe, TitleCasePipe, FormsModule],
  templateUrl: './characters.html',
  styleUrl: './characters.scss',
})
export class Characters implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly charactersService = inject(CharactersService);
  private readonly toastService = inject(ToastService);

  private readonly PAGE_SIZE = 9;

  // ── List state ────────────────────────────────────────────────────────────
  readonly projectId = signal('');
  readonly characters = signal<StoryCharacter[]>([]);
  readonly isLoading = signal(false);
  readonly currentPage = signal(0);
  readonly totalPages = signal(0);
  readonly totalElements = signal(0);
  readonly projectHasCharacters = signal<boolean | null>(null);

  // ── Search & filters ──────────────────────────────────────────────────────
  searchQuery = '';
  filterRole = '';
  filterRace = '';

  get filteredCharacters(): StoryCharacter[] {
    const role = this.filterRole.trim().toLowerCase();
    const race = this.filterRace.trim().toLowerCase();
    if (!role && !race) return this.characters();
    return this.characters().filter((c) => {
      const matchRole = !role || (c.role?.toLowerCase().includes(role) ?? false);
      const matchRace = !race || (c.race?.toLowerCase().includes(race) ?? false);
      return matchRole && matchRace;
    });
  }

  // ── Create / Edit modal state ─────────────────────────────────────────────
  readonly showModal = signal(false);
  readonly isSubmitting = signal(false);
  readonly isDeleting = signal(false);
  readonly submitError = signal('');
  modalMode: 'create' | 'edit' = 'create';
  editingCharacter: StoryCharacter | null = null;

  // ── Detail modal state ────────────────────────────────────────────────────
  readonly showDetailModal = signal(false);
  selectedCharacter: StoryCharacter | null = null;

  // ── Form fields ───────────────────────────────────────────────────────────
  formName = '';
  formRole = '';
  formDescription = '';
  formAge: number | null = null;
  formAgeUnknown = false;
  formGender = '';
  formRace = '';

  @ViewChild('ageInputRef') ageInputRef!: ElementRef<HTMLInputElement>;

  // ── Field-level errors ────────────────────────────────────────────────────
  nameError = '';
  genderError = '';
  ageError = '';

  readonly genderOptions = [
    { label: 'Male', value: 'MALE' },
    { label: 'Female', value: 'FEMALE' },
    { label: 'Other', value: 'OTHER' },
  ];

  get userName(): string {
    return this.authService.getUser()?.name ?? '';
  }

  ngOnInit(): void {
    this.projectId.set(this.route.snapshot.paramMap.get('projectId') ?? '');
    this.loadCharacters();
  }

  goBack(): void {
    window.location.href = '/app/project/' + this.projectId();
  }

  // ── List ──────────────────────────────────────────────────────────────────

  loadCharacters(): void {
    this.isLoading.set(true);
    this.charactersService
      .getCharacters(Number(this.projectId()), this.currentPage(), this.PAGE_SIZE, this.searchQuery)
      .subscribe({
        next: (page) => {
          this.characters.set(page.content);
          this.totalPages.set(page.totalPages);
          this.totalElements.set(page.totalElements);
          if (!this.searchQuery.trim()) {
            this.projectHasCharacters.set(page.totalElements > 0);
          }
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.toastService.show('error', 'Could not load characters. Please try again.');
        },
      });
  }

  applySearch(): void {
    this.currentPage.set(0);
    this.loadCharacters();
  }

  previousPage(): void {
    if (this.currentPage() > 0) {
      this.currentPage.update((p) => p - 1);
      this.loadCharacters();
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages() - 1) {
      this.currentPage.update((p) => p + 1);
      this.loadCharacters();
    }
  }

  // ── Detail modal ──────────────────────────────────────────────────────────

  openDetailModal(character: StoryCharacter): void {
    this.selectedCharacter = character;
    this.showDetailModal.set(true);
  }

  closeDetailModal(): void {
    this.showDetailModal.set(false);
    this.selectedCharacter = null;
  }

  // ── Create modal ──────────────────────────────────────────────────────────

  openModal(): void {
    this.modalMode = 'create';
    this.editingCharacter = null;
    this.resetForm();
    this.showModal.set(true);
  }

  openEditModal(character: StoryCharacter): void {
    this.modalMode = 'edit';
    this.editingCharacter = character;
    this.formName = character.name;
    this.formRole = character.role ?? '';
    this.formDescription = character.description ?? '';
    this.formGender = character.gender ?? '';
    this.formRace = character.race ?? '';
    if (character.age === null) {
      this.formAge = null;
      this.formAgeUnknown = true;
    } else {
      this.formAge = character.age ?? null;
      this.formAgeUnknown = false;
    }
    this.nameError = '';
    this.genderError = '';
    this.ageError = '';
    this.submitError.set('');
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingCharacter = null;
  }

  cancelModal(): void {
    const hasData =
      this.formName.trim() ||
      this.formRole.trim() ||
      this.formDescription.trim() ||
      this.formAge !== null ||
      this.formGender ||
      this.formRace.trim();

    if (hasData && !confirm('Discard this character draft?\nYour changes will be lost.')) {
      return;
    }
    this.closeModal();
  }

  confirmDelete(): void {
    if (!this.editingCharacter) return;
    if (!confirm('¿Quieres borrar este personaje?')) return;

    this.isDeleting.set(true);
    this.charactersService
      .deleteCharacter(Number(this.projectId()), this.editingCharacter.id)
      .subscribe({
        next: () => {
          this.isDeleting.set(false);
          this.closeModal();
          if (this.characters().length === 1 && this.currentPage() > 0) {
            this.currentPage.update((p) => p - 1);
          }
          this.loadCharacters();
          this.toastService.show('success', 'Character deleted successfully.');
        },
        error: () => {
          this.isDeleting.set(false);
          this.toastService.show('error', 'Could not delete the character. Please try again.');
        },
      });
  }

  private resetForm(): void {
    this.formName = '';
    this.formRole = '';
    this.formDescription = '';
    this.formAge = null;
    this.formAgeUnknown = false;
    this.formGender = '';
    this.formRace = '';
    this.nameError = '';
    this.genderError = '';
    this.ageError = '';
    this.submitError.set('');
  }

  private validate(): boolean {
    let valid = true;
    this.nameError = '';
    this.genderError = '';
    this.ageError = '';

    if (!this.formName.trim()) {
      this.nameError = 'Name is required.';
      valid = false;
    }
    if (!this.formGender) {
      this.genderError = 'Please select a gender.';
      valid = false;
    }
    if (!this.formAgeUnknown) {
      const nativeAge = this.ageInputRef?.nativeElement;
      if (nativeAge?.validity?.badInput) {
        this.ageError = 'Age must be a valid number.';
        valid = false;
      } else if (this.formAge !== null && this.formAge < 0) {
        this.ageError = 'Age must be a non-negative number.';
        valid = false;
      }
    }
    return valid;
  }

  submitForm(): void {
    if (!this.validate()) return;

    this.isSubmitting.set(true);
    this.submitError.set('');

    const age: number | null | undefined = this.formAgeUnknown
      ? null
      : this.formAge !== null
        ? this.formAge
        : undefined;

    const payload = {
      name: this.formName.trim(),
      ...(this.formRole.trim() && { role: this.formRole.trim() }),
      ...(this.formDescription.trim() && { description: this.formDescription.trim() }),
      age,
      gender: this.formGender,
      ...(this.formRace.trim() && { race: this.formRace.trim() }),
    };

    const projectId = Number(this.projectId());

    if (this.modalMode === 'edit' && this.editingCharacter) {
      this.charactersService.updateCharacter(projectId, this.editingCharacter.id, payload).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.closeModal();
          this.loadCharacters();
          this.toastService.show('success', 'Character updated successfully.');
        },
        error: (err) => {
          this.isSubmitting.set(false);
          if (err.status === 409) {
            this.submitError.set('A character with this name already exists in this project.');
          } else {
            this.submitError.set('Something went wrong. Please try again.');
          }
        },
      });
    } else {
      this.charactersService.createCharacter(projectId, payload).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.closeModal();
          this.currentPage.set(0);
          this.loadCharacters();
          this.toastService.show('success', 'Character created successfully.');
        },
        error: (err) => {
          this.isSubmitting.set(false);
          if (err.status === 409) {
            this.submitError.set('A character with this name already exists in this project.');
          } else {
            this.submitError.set('Something went wrong. Please try again.');
          }
        },
      });
    }
  }

  logout(): void {
    this.authService.logout();
  }
}
