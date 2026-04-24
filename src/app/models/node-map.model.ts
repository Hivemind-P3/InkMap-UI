import { Project } from './project.model';

export interface NodeMap {
  id: number;
  name: string;
  konvaJson: string;
  project: Project;
  createdAt: Date;
  updatedAt: Date;
}

export interface NodeMapPage {
  content: NodeMap[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface CreateNodeMapRequest {
  name: string;
  description?: string;
}
