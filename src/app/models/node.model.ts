export interface NodePage {
  content: Node[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface Node {
  id: number;
  label: string;
  description: string;
  posX: number;
  posY: number;
  nodeMapId: number;
}

export interface CreateNodeRequest {
  label: string;
  description: string;
  posX: number;
  posY: number;
}

export interface UpdateNodeRequest {
  label: string;
  description: string;
  posX: number;
  posY: number;
}