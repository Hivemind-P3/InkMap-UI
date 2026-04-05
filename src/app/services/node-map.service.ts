import { Injectable } from '@angular/core';
import { BaseService } from './base.service';
import { Observable } from 'rxjs';
import { CreateNodeMapRequest, NodeMap, NodeMapPage } from '../models/node-map.model';

@Injectable({ providedIn: 'root' })
export class NodeMapService extends BaseService {
  getAllByProjectId(projectId: number, page: number = 0, size: number = 10): Observable<NodeMapPage> {
    return this.http.get<NodeMapPage>(`${this.baseUrl}/projects/${projectId}/node-maps`, {
      params: { page, size },
    });
  }

  create(projectId: number, data: CreateNodeMapRequest): Observable<NodeMap> {
    return this.http.post<NodeMap>(`${this.baseUrl}/projects/${projectId}/node-maps`, data);
  }
}
