import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.local';

export interface AssociationCharacter {
  id: number;
  name: string;
  role: string;
}

export interface AssociationPlace {
  id: number;
  title: string;
}

export interface NarrativeAssociations {
  characters: AssociationCharacter[];
  places: AssociationPlace[];
}

export interface UpdateAssociationsRequest {
  projectId: number;
  characterIds: number[];
  wikiIds: number[];
}

@Injectable({ providedIn: 'root' })
export class NarrativeAssociationsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  getAssociations(narrativeId: number, projectId: number): Observable<NarrativeAssociations> {
    return this.http.get<NarrativeAssociations>(
      `${this.baseUrl}/narratives/${narrativeId}/associations`,
      { params: { projectId: String(projectId) } },
    );
  }

  updateAssociations(
    narrativeId: number,
    body: UpdateAssociationsRequest,
  ): Observable<NarrativeAssociations> {
    return this.http.put<NarrativeAssociations>(
      `${this.baseUrl}/narratives/${narrativeId}/associations`,
      body,
    );
  }
}
