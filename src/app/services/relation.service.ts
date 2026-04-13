import { Injectable } from '@angular/core';
import { BaseService } from './base.service';
import { Observable } from 'rxjs';
import { NodeRelation, CreateRelationRequest } from '../models/relation.model';

@Injectable({ providedIn: 'root' })
export class RelationService extends BaseService {
  getAll(projectId: number, nodeMapId: number): Observable<NodeRelation[]> {
    return this.http.get<NodeRelation[]>(
      `${this.baseUrl}/projects/${projectId}/node-maps/${nodeMapId}/relations`,
    );
  }

  create(
    projectId: number,
    nodeMapId: number,
    data: CreateRelationRequest,
  ): Observable<NodeRelation> {
    return this.http.post<NodeRelation>(
      `${this.baseUrl}/projects/${projectId}/node-maps/${nodeMapId}/relations`,
      data,
    );
  }
}
