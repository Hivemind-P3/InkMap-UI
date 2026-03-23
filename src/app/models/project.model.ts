export interface Project {
  id: number;
  title: string;
  medium?: string;
  tags?: string[];
  description?: string;
  createdAt?: string;
}

export interface CreateProjectRequest {
  title: string;
  description: string;
  medium: string;
  tags: string[];
}

export interface ProjectPage {
  content: Project[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}
