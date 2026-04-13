export interface NodeRelation {
  id: number;
  sourceNodeId: number;
  targetNodeId: number;
  nodeMapId: number;
}

export interface CreateRelationRequest {
  sourceNodeId: number;
  targetNodeId: number;
}
