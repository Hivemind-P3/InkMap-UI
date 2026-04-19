import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { environment } from '../../environments/environment.local';

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
  private readonly baseUrl = environment.apiBaseUrl;

  private narrativesSubject = new BehaviorSubject<Narrative[]>([]);
  narratives$ = this.narrativesSubject.asObservable();

  create(projectId: number, title: string): Observable<Narrative> {
    const body: CreateNarrativeRequest = { projectId, title };
    return this.http.post<Narrative>(`${this.baseUrl}/narratives`, body).pipe(
      tap((created) => {
        this.narrativesSubject.next([...this.narrativesSubject.value, created]);
      }),
    );
  }

  list(projectId: number): Observable<Narrative[]> {
    return this.http
      .get<Narrative[]>(`${this.baseUrl}/narratives/projects/${projectId}`)
      .pipe(tap((res) => this.narrativesSubject.next(res)));
  }

  edit(id: number, data: UpdateNarrativeRequest): Observable<Narrative> {
    return this.http.put<Narrative>(`${this.baseUrl}/narratives/${id}`, data).pipe(
      tap((updated) => {
        const updatedList = this.narrativesSubject.value.map((n) => (n.id === id ? updated : n));
        this.narrativesSubject.next(updatedList);
      }),
    );
  }

  reorder(projectId: number, data: ReorderNarrativesRequest): Observable<Narrative[]> {
    return this.http
      .put<Narrative[]>(`${this.baseUrl}/narratives/order`, {
        projectId,
        orderedIds: data.orderedIds,
      })
      .pipe(tap((updated) => this.narrativesSubject.next(updated)));
  }
}
