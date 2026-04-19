import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.local';

export interface NarrativeVersion {
  id: number;
  narrativeId: number;
  content: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class NarrativeVersionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  create(projectId: number, narrativeId: number): Observable<NarrativeVersion> {
    return this.http.post<NarrativeVersion>(
      `${this.baseUrl}/projects/${projectId}/narratives/${narrativeId}/versions`,
      {},
    );
  }

  list(projectId: number, narrativeId: number): Observable<NarrativeVersion[]> {
    return this.http.get<NarrativeVersion[]>(
      `${this.baseUrl}/projects/${projectId}/narratives/${narrativeId}/versions`,
    );
  }
}
