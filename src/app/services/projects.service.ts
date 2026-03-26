import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.local';
import { AuthService } from './auth.service';
import { Project, ProjectPage, CreateProjectRequest } from '../models/project.model';

@Injectable({ providedIn: 'root' })
export class ProjectsService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly baseUrl = environment.apiBaseUrl;

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getMyProjects(page: number, size: number, search: string): Observable<ProjectPage> {
    let params = new HttpParams().set('page', String(page)).set('size', String(size));
    if (search.trim()) {
      params = params.set('search', search.trim());
    }
    return this.http.get<ProjectPage>(`${this.baseUrl}/projects/me`, {
      headers: this.getHeaders(),
      params,
    });
  }

  createProject(data: CreateProjectRequest): Observable<Project> {
    return this.http.post<Project>(`${this.baseUrl}/projects`, data, { headers: this.getHeaders() });
  }

  updateProject(id: number, data: CreateProjectRequest): Observable<Project> {
    return this.http.put<Project>(`${this.baseUrl}/projects/${id}`, data, { headers: this.getHeaders() });
  }

  deleteProject(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/projects/${id}`, { headers: this.getHeaders() });
  }
}
