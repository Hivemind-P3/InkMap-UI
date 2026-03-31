import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface Narrative {
  id: number;
  title: string;
  content: string;
  order: number;
}

@Injectable({
  providedIn: 'root',
})
export class NarrativeService {
  private api = '/api/narratives';

  constructor(private http: HttpClient) {}

  create(projectId: number, title: string): Observable<Narrative> {
    return this.http.post<Narrative>(this.api, { projectId: projectId, titulo: title });
  }

  list(projectId: number): Observable<Narrative[]> {
    return this.http.get<Narrative[]>(`${this.api}/projects/${projectId}`);
  }

  edit(id: number, data: any): Observable<Narrative> {
    return this.http.put<Narrative>(`${this.api}/${id}`, data);
  }

  reorder(data: any): Observable<Narrative[]> {
    return this.http.put<Narrative[]>(`${this.api}/order`, data);
  }
}
