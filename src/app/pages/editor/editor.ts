import { Component } from '@angular/core';
import { NarrativeService, Narrative } from '../../services/narrative.service';
import { NarrativeListComponent } from '../narrative-list/narrative-list';
import { QuillEditorComponent } from 'ngx-quill';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-editor',
  templateUrl: './editor.html',
  styleUrls: ['./editor.scss'],
  imports: [NarrativeListComponent, QuillEditorComponent, FormsModule],
})
export class EditorComponent {
  projectId: number;
  constructor(
    private service: NarrativeService,
    private route: ActivatedRoute,
  ) {
    this.projectId = Number(this.route.snapshot.paramMap.get('projectId'));
  }
  selected?: Narrative;

  content: any = '';
  title: string = '';

  onSelected(c: Narrative) {
    this.selected = c;
    this.title = c.title;
    this.content = JSON.parse(c.content || '{}');
  }

  save() {
    if (!this.selected) return;

    this.service
      .edit(this.selected.id, {
        projectId: this.projectId,
        title: this.title,
        content: JSON.stringify(this.content),
      })
      .subscribe((updated) => {
        this.selected = updated;
        this.service.list(this.projectId).subscribe();
        alert('Saved');
      });
  }
}
