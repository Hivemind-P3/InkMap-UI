import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { NarrativeService, Narrative } from '../../services/narrative.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-narrative-list',
  templateUrl: './narrative-list.html',
  styleUrls: ['./narrative-list.scss']
})
export class NarrativeListComponent implements OnInit {
  @Input() projectId!: number;
  @Output() selected = new EventEmitter<Narrative>();

  narratives: Narrative[] = [];
  private sub!: Subscription;

  constructor(private service: NarrativeService) {}

  ngOnInit(): void {
    this.sub = this.service.narratives$.subscribe((res) => {
      this.narratives = res;
    });

    this.service.list(this.projectId).subscribe();
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  create() {
    const title = prompt('Chapter Title');
    if (!title) return;

    this.service.create(this.projectId, title).subscribe();
  }

  select(c: Narrative) {
    this.selected.emit(c);
  }
}
