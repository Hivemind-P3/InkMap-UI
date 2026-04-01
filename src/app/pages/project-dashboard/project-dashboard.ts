import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ProjectsService } from '../../services/projects.service';
import { Project } from '../../models/project.model';
import { ToastService } from '../../services/toast.service';
import { TitleCasePipe } from '@angular/common';
import { ProjectSectionCard } from "../../components/project-section-card/project-section-card";

@Component({
  selector: 'app-project-dashboard',
  imports: [TitleCasePipe, ProjectSectionCard],
  templateUrl: './project-dashboard.html',
  styleUrl: './project-dashboard.scss',
})
export class ProjectDashboard implements OnInit{
  private projectService = inject(ProjectsService);
  private toastService = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);
  protected projectId: string = '';
  protected project!: Project;
  protected isLoading = true;
  
  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('id') ?? '';
    this.projectService.getProjectById(parseInt(this.projectId)).subscribe({
      next: (res) => {
        this.project = res;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        this.cdr.detectChanges();
        this.toastService.show('error', err.error?.message || err.message || 'Something went wrong');
      }
    })
  }
}