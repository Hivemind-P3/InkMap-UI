import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.local';
import { AuthService } from './auth.service';
import { PagedStoryCharacterResponse } from '../models/paged-story-character-response.model';
import { StoryCharacter, CreateCharacterRequest, CharacterPreview } from '../models/story-character.model';

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

  updateCharacter(
    projectId: number,
    characterId: number,
    data: CreateCharacterRequest,
  ): Observable<StoryCharacter> {
    return this.http.put<StoryCharacter>(
      `${this.baseUrl}/projects/${projectId}/characters/${characterId}`,
      data,
      { headers: this.getHeaders() },
    );
  }

  deleteCharacter(projectId: number, characterId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/projects/${projectId}/characters/${characterId}`,
      { headers: this.getHeaders() },
    );
  }

  generateCharacter(projectId: number, instructions: string): Observable<CharacterPreview> {
    return this.http.post<CharacterPreview>(
      `${this.baseUrl}/projects/${projectId}/characters/generate`,
      { instructions },
      { headers: this.getHeaders() },
    );
  }

  getSuggestions(projectId: number, instructions?: string): Observable<CharacterPreview[]> {
    return this.http.post<CharacterPreview[]>(
      `${this.baseUrl}/projects/${projectId}/characters/suggestions`,
      { instructions: instructions ?? '' },
      { headers: this.getHeaders() },
    );
  }
}
