import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.local';
import { AuthService } from './auth.service';
import { PagedStoryCharacterResponse } from '../models/paged-story-character-response.model';
import { StoryCharacter, CreateCharacterRequest } from '../models/story-character.model';

@Injectable({ providedIn: 'root' })
export class CharactersService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly baseUrl = environment.apiBaseUrl;

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getCharacters(
    projectId: number,
    page: number,
    size: number,
    search: string,
  ): Observable<PagedStoryCharacterResponse> {
    let params = new HttpParams().set('page', String(page)).set('size', String(size));
    if (search.trim()) {
      params = params.set('search', search.trim());
    }
    return this.http.get<PagedStoryCharacterResponse>(
      `${this.baseUrl}/projects/${projectId}/characters`,
      { headers: this.getHeaders(), params },
    );
  }

  createCharacter(projectId: number, data: CreateCharacterRequest): Observable<StoryCharacter> {
    return this.http.post<StoryCharacter>(
      `${this.baseUrl}/projects/${projectId}/characters`,
      data,
      { headers: this.getHeaders() },
    );
  }
}
