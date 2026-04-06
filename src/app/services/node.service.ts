import { Injectable } from '@angular/core';
import { BaseService } from './base.service';
import { Observable } from 'rxjs';
import { Node, NodePage, CreateNodeRequest, UpdateNodeRequest } from '../models/node.model';

@Injectable({ providedIn: 'root' })
export class NodeService extends BaseService {
  getAll(projectId: number, nodeMapId: number): Observable<NodePage> {
    return this.http.get<NodePage>(
      `${this.baseUrl}/projects/${projectId}/node-maps/${nodeMapId}/nodes`,
    );
  }

  create(projectId: number, nodeMapId: number, data: CreateNodeRequest): Observable<Node> {
    return this.http.post<Node>(
      `${this.baseUrl}/projects/${projectId}/node-maps/${nodeMapId}/nodes`,
      data,
    );
  }

  update(
    projectId: number,
    nodeMapId: number,
    nodeId: number,
    data: UpdateNodeRequest,
  ): Observable<Node> {
    return this.http.put<Node>(
      `${this.baseUrl}/projects/${projectId}/node-maps/${nodeMapId}/nodes/${nodeId}`,
      data,
    );
  }
}