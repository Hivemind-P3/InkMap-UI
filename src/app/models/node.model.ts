export type NodeType = 'PLACE' | 'CHARACTER' | 'CULTURE' | 'SYSTEM' | 'OBJECT' | 'OTHER';

export const NODE_TYPES: NodeType[] = ['PLACE', 'CHARACTER', 'CULTURE', 'SYSTEM', 'OBJECT', 'OTHER'];

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
  type: NodeType;
  color: string;
  posX: number;
  posY: number;
  nodeMapId: number;
}

export interface CreateNodeRequest {
  label: string;
  description: string;
  type: NodeType;
  color: string;
  posX: number;
  posY: number;
}

export interface UpdateNodeRequest {
  label: string;
  description: string;
  type: NodeType;
  color: string;
  posX: number;
  posY: number;
}
