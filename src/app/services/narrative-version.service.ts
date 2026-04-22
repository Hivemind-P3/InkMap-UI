import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.local';
import { Narrative } from './narrative.service';

export interface NarrativeVersion {
  id: number;
  narrativeId: number;
  content: string;
  createdAt: string;
}

export interface CompareVersionsResult {
  versionAId: number;
  versionBId: number;
  contentA: string;
  contentB: string;
  createdAtA: string;
  createdAtB: string;
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

  restore(projectId: number, narrativeId: number, versionId: number): Observable<Narrative> {
    return this.http.post<Narrative>(
      `${this.baseUrl}/projects/${projectId}/narratives/${narrativeId}/versions/${versionId}/restore`,
      {},
    );
  }

  compare(
    projectId: number,
    narrativeId: number,
    versionAId: number,
    versionBId: number,
  ): Observable<CompareVersionsResult> {
    return this.http.get<CompareVersionsResult>(
      `${this.baseUrl}/projects/${projectId}/narratives/${narrativeId}/versions/compare`,
      { params: { versionAId: String(versionAId), versionBId: String(versionBId) } },
    );
  }
}
