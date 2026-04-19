import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { environment } from '../../environments/environment.local';
import { AuthService } from './auth.service';

export interface Narrative {
  id: number;
  title: string;
  content: string;
  order: number;
}

export interface CreateNarrativeRequest {
  projectId: number;
  title: string;
}

export interface UpdateNarrativeRequest {
  projectId: number;
  title: string;
  content: string;
}

export interface ReorderNarrativesRequest {
  orderedIds: number[];
}

@Injectable({
  providedIn: 'root',
})
export class NarrativeService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly baseUrl = environment.apiBaseUrl;

  private narrativesSubject = new BehaviorSubject<Narrative[]>([]);
  narratives$ = this.narrativesSubject.asObservable();

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
  }

  create(projectId: number, title: string): Observable<Narrative> {
    const body: CreateNarrativeRequest = { projectId, title };
    return this.http
      .post<Narrative>(`${this.baseUrl}/narratives`, body, {
        headers: this.getHeaders(),
      })
      .pipe(
        tap((created) => {
          const current = this.narrativesSubject.value;
          queueMicrotask(() => {
            this.narrativesSubject.next([...current, created]);
          });
        })
      );
  }

  list(projectId: number): Observable<Narrative[]> {
    return this.http
      .get<Narrative[]>(`${this.baseUrl}/narratives/projects/${projectId}`, {
        headers: this.getHeaders(),
      })
      .pipe(tap((res) => this.narrativesSubject.next(res)));
  }

  edit(id: number, data: UpdateNarrativeRequest): Observable<Narrative> {
    return this.http
      .put<Narrative>(`${this.baseUrl}/narratives/${id}`, data, {
        headers: this.getHeaders(),
      })
      .pipe(
        tap((updated) => {
          const current = this.narrativesSubject.value;
          const updatedList = current.map((n) => (n.id === id ? updated : n));
          queueMicrotask(() => {
            this.narrativesSubject.next(updatedList);
          });
        })
      );
  }

  reorder(projectId: number, data: ReorderNarrativesRequest): Observable<Narrative[]> {
    return this.http.put<Narrative[]>(
      `${this.baseUrl}/narratives/order`,
      {
        projectId,
        orderedIds: data.orderedIds,
      },
      { headers: this.getHeaders() },
    );
  }
}
