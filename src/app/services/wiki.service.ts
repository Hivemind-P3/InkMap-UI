import { Injectable } from '@angular/core';
import { BaseService } from './base.service';
import { Observable } from 'rxjs';
import { Wiki, WikiPage } from '../models/wiki.model';
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
