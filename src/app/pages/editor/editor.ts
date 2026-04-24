import { ChangeDetectorRef, Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NarrativeService, Narrative } from '../../services/narrative.service';
import {
  NarrativeVersionService,
  NarrativeVersion,
  CompareVersionsResult,
} from '../../services/narrative-version.service';
import {
  NarrativeAssociationsService,
  NarrativeAssociations,
} from '../../services/narrative-associations.service';
import { CharactersService } from '../../services/characters.service';
import { WikiService } from '../../services/wiki.service';
import { ProjectsService } from '../../services/projects.service';
import { ToastService } from '../../services/toast.service';
import { NarrativeListComponent } from '../narrative-list/narrative-list';
import { StoryCharacter } from '../../models/story-character.model';
import { Wiki } from '../../models/wiki.model';
import { QuillEditorComponent } from 'ngx-quill';
import { VoiceService } from '../../services/voice.service';

interface ChangeBlock {
  type: 'modified' | 'added' | 'removed';
  linesA: string[];
  linesB: string[];
}

interface UnifiedLine {
  text: string;
  type: 'equal' | 'removed' | 'added' | 'separator';
}

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
  private voiceService = inject(VoiceService);

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
  compareSelectionA?: NarrativeVersion;
  compareSelectionB?: NarrativeVersion;
  compareSelectionNumA = 0;
  compareSelectionNumB = 0;
  isComparing = false;
  compareResult?: CompareVersionsResult;
  compareContentA: any = null;
  compareContentB: any = null;
  compareView: 'changes' | 'full' = 'changes';
  changeBlocks: ChangeBlock[] = [];
  unifiedLines: UnifiedLine[] = [];

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

  protected quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      [{ header: [1, 2, 3, false] }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['blockquote']
    ]
  };

  isSuggestionsOpen = false;
  suggestionsInstructions = '';
  suggestionsResult = '';
  isLoadingSuggestions = false;

  readonly isRecording = signal(false);
  readonly isTranscribing = signal(false);
  private mediaRecorder: any = null;
  private audioChunks: Blob[] = [];
  private activeStream: MediaStream | null = null;

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
    quill.root.setAttribute('spellcheck', 'true');
    quill.root.spellcheck = true;
  }

  onSearchNavigated(term: string): void {
    this.pendingSearchTerm = term;
  }

  onSelected(c: Narrative) {
    this.selected = c;
    this.title = c.title;
    this.selectedVersion = undefined;
    this.viewedContent = null;

    this.compareSelectionA = undefined;
    this.compareSelectionB = undefined;
    this.compareResult = undefined;
    this.compareContentA = null;
    this.compareContentB = null;
    this.compareView = 'changes';
    this.changeBlocks = [];
    this.unifiedLines = [];

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
    if (this.compareResult) {
      this.closeCompareView();
    }
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

  toggleCompareSelection(v: NarrativeVersion, displayIndex: number) {
    const num = this.versions.length - displayIndex;
    if (this.compareSelectionA?.id === v.id) {
      this.compareSelectionA = undefined;
    } else if (this.compareSelectionB?.id === v.id) {
      this.compareSelectionB = undefined;
    } else if (!this.compareSelectionA) {
      this.compareSelectionA = v;
      this.compareSelectionNumA = num;
    } else if (!this.compareSelectionB) {
      this.compareSelectionB = v;
      this.compareSelectionNumB = num;
    }
    this.cdr.detectChanges();
  }

  compareVersions() {
    if (!this.selected || !this.compareSelectionA || !this.compareSelectionB || this.isComparing)
      return;

    this.isComparing = true;
    this.versionService
      .compare(
        this.projectId,
        this.selected.id,
        this.compareSelectionA.id,
        this.compareSelectionB.id,
      )
      .subscribe({
        next: (result) => {
          this.compareResult = result;
          const parasA = this.extractParagraphs(result.contentA);
          const parasB = this.extractParagraphs(result.contentB);
          const linesA = parasA.flat();
          const linesB = parasB.flat();
          this.changeBlocks = this.computeChangeBlocks(linesA, linesB);
          this.unifiedLines = this.computeUnifiedLines(parasA, parasB);
          try {
            this.compareContentA = result.contentA ? JSON.parse(result.contentA) : '';
          } catch {
            this.compareContentA = '';
          }
          try {
            this.compareContentB = result.contentB ? JSON.parse(result.contentB) : '';
          } catch {
            this.compareContentB = '';
          }
          this.compareView = 'changes';
          this.selectedVersion = undefined;
          this.viewedContent = null;
          this.isComparing = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.isComparing = false;
          this.toast.show('error', 'Error comparing versions');
          this.cdr.detectChanges();
        },
      });
  }

  closeCompareView() {
    this.compareResult = undefined;
    this.compareContentA = null;
    this.compareContentB = null;
    this.compareView = 'changes';
    this.changeBlocks = [];
    this.unifiedLines = [];
    this.isComparing = false;
    this.cdr.detectChanges();
  }

  private extractParagraphs(rawContent: string): string[][] {
    let text: string;
    try {
      const delta = JSON.parse(rawContent);
      if (delta?.ops) {
        text = delta.ops
          .filter((op: any) => typeof op.insert === 'string')
          .map((op: any) => op.insert)
          .join('');
      } else {
        text = rawContent ?? '';
      }
    } catch {
      text = rawContent ?? '';
    }

    const paragraphs: string[][] = [];
    for (const para of text.split('\n')) {
      const trimmed = para.trim();
      if (trimmed === '') continue;
      const lines: string[] = [];
      if (trimmed.length <= 200) {
        lines.push(trimmed);
      } else {
        for (const sentence of trimmed.split(/(?<=[.?!])\s+/)) {
          const s = sentence.trim();
          if (s.length > 0) lines.push(s);
        }
      }
      paragraphs.push(lines);
    }

    return paragraphs.length > 0 ? paragraphs : [['']];
  }

  private extractLines(rawContent: string): string[] {
    return this.extractParagraphs(rawContent).flat();
  }

  private computeChangeBlocks(linesA: string[], linesB: string[]): ChangeBlock[] {
    const m = linesA.length;
    const n = linesB.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] =
          linesA[i - 1] === linesB[j - 1]
            ? dp[i - 1][j - 1] + 1
            : Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }

    const equalPairs: Array<[number, number]> = [];
    let i = m;
    let j = n;
    while (i > 0 && j > 0) {
      if (linesA[i - 1] === linesB[j - 1]) {
        equalPairs.unshift([i - 1, j - 1]);
        i--;
        j--;
      } else if (dp[i - 1][j] >= dp[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }

    const blocks: ChangeBlock[] = [];
    let prevI = 0;
    let prevJ = 0;

    const addBlock = (endI: number, endJ: number) => {
      const removed = linesA.slice(prevI, endI);
      const added = linesB.slice(prevJ, endJ);
      if (removed.length === 0 && added.length === 0) return;
      blocks.push({
        type:
          removed.length > 0 && added.length > 0
            ? 'modified'
            : removed.length > 0
              ? 'removed'
              : 'added',
        linesA: removed,
        linesB: added,
      });
    };

    for (const [ei, ej] of equalPairs) {
      addBlock(ei, ej);
      prevI = ei + 1;
      prevJ = ej + 1;
    }

    addBlock(m, n);
    return blocks;
  }

  private computeUnifiedLines(parasA: string[][], parasB: string[][]): UnifiedLine[] {
    const count = Math.max(parasA.length, parasB.length);
    const result: UnifiedLine[] = [];
    for (let p = 0; p < count; p++) {
      if (p > 0) result.push({ text: '', type: 'separator' });
      result.push(...this.diffParagraph(parasA[p] ?? [], parasB[p] ?? []));
    }
    return result;
  }

  private diffParagraph(linesA: string[], linesB: string[]): UnifiedLine[] {
    const m = linesA.length;
    const n = linesB.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] =
          linesA[i - 1] === linesB[j - 1]
            ? dp[i - 1][j - 1] + 1
            : Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }

    const result: UnifiedLine[] = [];
    const walk = (i: number, j: number) => {
      if (i === 0 && j === 0) return;
      if (i > 0 && j > 0 && linesA[i - 1] === linesB[j - 1]) {
        walk(i - 1, j - 1);
        result.push({ text: linesA[i - 1], type: 'equal' });
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        walk(i, j - 1);
        result.push({ text: linesB[j - 1], type: 'added' });
      } else {
        walk(i - 1, j);
        result.push({ text: linesA[i - 1], type: 'removed' });
      }
    };

    walk(m, n);
    return result;
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
          this.service.updateCached(updated);
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

  openSuggestions() { this.isSuggestionsOpen = true };

  closeSuggestions() { this.isSuggestionsOpen = false };

  fetchSuggestions() {
    if(this.isLoadingSuggestions) return;
    this.isLoadingSuggestions = true;
    this.suggestionsResult = '';

    this.service.getSuggestions(this.projectId, this.suggestionsInstructions).subscribe({
      next: (res) => {
        this.suggestionsResult = res.suggestions;
        this.isLoadingSuggestions = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.suggestionsResult = 'Error generating suggestions.';
        this.isLoadingSuggestions = false;
        this.cdr.detectChanges();
      }
    });
  }

  get isTitleReadOnly(): boolean {
    return !!this.selectedVersion || !!this.compareResult;
  }

  async startVoice(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.activeStream = stream;
      this.audioChunks = [];
      this.mediaRecorder = new (window as any).MediaRecorder(stream);
      this.mediaRecorder.ondataavailable = (e: any) => {
        if (e.data.size > 0) this.audioChunks.push(e.data);
      };
      this.mediaRecorder.onstop = () => this.handleRecordingStop();
      this.mediaRecorder.start();
      this.isRecording.set(true);
    } catch {
      this.toast.show('error', 'Microphone access denied or not available.');
    }
  }

  stopVoice(): void {
    if (!this.mediaRecorder || !this.isRecording()) return;
    this.mediaRecorder.stop();
    this.activeStream?.getTracks().forEach((t) => t.stop());
    this.activeStream = null;
    this.isRecording.set(false);
    this.isTranscribing.set(true);
  }

  private handleRecordingStop(): void {
    const blob = new Blob(this.audioChunks, { type: 'audio/webm' });
    this.voiceService.transcribe(blob).subscribe({
      next: ({ text }) => {
        this.suggestionsInstructions = text;
        this.isTranscribing.set(false);
        this.cdr.detectChanges();
      },
      error: () => {
        this.isTranscribing.set(false);
        this.toast.show('error', 'Could not transcribe audio. Please try again.');
        this.cdr.detectChanges();
      },
    });
  }

  ngOnDestroy(): void {
    if(this.isRecording()) this.mediaRecorder?.stop();
    this.activeStream?.getTracks().forEach((t) => t.stop());
  }
}
