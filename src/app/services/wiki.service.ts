import { Injectable } from '@angular/core';
import { BaseService } from './base.service';
import { Observable } from 'rxjs';
import { Wiki, WikiPage, CreateWikiRequest } from '../models/wiki.model';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class WikiService extends BaseService {
  getProjectWikis(projectId: number, search?: string): Observable<Wiki[]> {
    const params: Record<string, string> = {};
    if (search) params['search'] = search;
    return this.http
      .get<WikiPage>(`${this.baseUrl}/projects/${projectId}/wikis`, { params })
      .pipe(map((page) => page.content));
  }

  getWikisPaged(projectId: number, page = 0, search?: string): Observable<WikiPage> {
    const params: Record<string, string> = { page: String(page) };
    if (search) params['search'] = search;
    return this.http.get<WikiPage>(`${this.baseUrl}/projects/${projectId}/wikis`, { params });
  }

  getWikiById(projectId: number, wikiId: number): Observable<Wiki> {
    return this.http.get<Wiki>(`${this.baseUrl}/projects/${projectId}/wikis/${wikiId}`);
  }

  createWiki(projectId: number, data: CreateWikiRequest): Observable<Wiki> {
    return this.http.post<Wiki>(`${this.baseUrl}/projects/${projectId}/wikis`, data);
  }

  updateWiki(projectId: number, wikiId: number, data: CreateWikiRequest): Observable<Wiki> {
    return this.http.put<Wiki>(`${this.baseUrl}/projects/${projectId}/wikis/${wikiId}`, data);
  }

  deleteWiki(projectId: number, wikiId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/projects/${projectId}/wikis/${wikiId}`);
  }

  getNodeWikis(projectId: number, nodeMapId: number, nodeId: number): Observable<Wiki[]> {
    return this.http.get<Wiki[]>(
      `${this.baseUrl}/projects/${projectId}/node-maps/${nodeMapId}/nodes/${nodeId}/wikis`,
    );
  }

  associateWiki(
    projectId: number,
    nodeMapId: number,
    nodeId: number,
    wikiId: number,
  ): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/projects/${projectId}/node-maps/${nodeMapId}/nodes/${nodeId}/wikis/${wikiId}`,
      {},
    );
  }

  removeWiki(
    projectId: number,
    nodeMapId: number,
    nodeId: number,
    wikiId: number,
  ): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/projects/${projectId}/node-maps/${nodeMapId}/nodes/${nodeId}/wikis/${wikiId}`,
    );
  }
}
