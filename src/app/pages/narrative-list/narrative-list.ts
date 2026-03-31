import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { NarrativeService, Narrative } from '../../services/narrative.service';

@Component({
  selector: 'app-narrative-list',
  templateUrl: './narrative-list.html',
  styleUrls: ['./narrative-list.scss'],
})
export class NarrativeListComponent implements OnInit {
  @Input() projectId!: number;
  @Output() selected = new EventEmitter<Narrative>();

  narratives: Narrative[] = [];

  constructor(private service: NarrativeService) {}

  ngOnInit(): void {
    this.load();
  }

  load() {
    this.service.list(this.projectId).subscribe((res) => {
      this.narratives = res;
    });
  }

  create() {
    const title = prompt('Chapter Title');
    if (!title) return;

    this.service.create(this.projectId, title).subscribe(() => {
      this.load();
    });
  }

  select(c: Narrative) {
    this.selected.emit(c);
  }
}
