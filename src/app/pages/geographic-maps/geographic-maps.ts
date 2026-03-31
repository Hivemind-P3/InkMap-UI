import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { GeographicMap } from '../../models/geographic-map.model';
import { GeographicMapService } from '../../services/geographic-map.service';
import { BaseService } from '../../services/base.service';
import { Project } from '../../models/project.model';
import { ProjectsService } from '../../services/projects.service';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-geographic-maps',
  imports: [],
  templateUrl: './geographic-maps.html',
  styleUrl: './geographic-maps.scss',
})
export class GeographicMaps implements OnInit {
  private geographicMapService = inject(GeographicMapService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  protected maps: GeographicMap[] = [];
  protected currentPage = 0;
  protected pageSize = 10;
  protected totalPages = 0;
  protected user = this.authService.getUser();
  protected projectId: string = '';
  protected project: Project = {} as Project;
  protected isLoading: boolean = true;

  constructor(private route: ActivatedRoute) {}
  
  ngOnInit(): void {
    this.loadMaps();
  }
  
  loadMaps(): void {
    this.projectId = this.route.snapshot.paramMap.get('id') ?? '';
    this.geographicMapService.getAllMapsByProjectId(parseInt(this.projectId), this.currentPage, this.pageSize)
      .subscribe(response => {
        this.maps = response.content;
        this.totalPages = response.totalPages;
        this.isLoading = false;
        this.cdr.detectChanges();
      });
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadMaps;
    }
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadMaps();
    }
  }
}
