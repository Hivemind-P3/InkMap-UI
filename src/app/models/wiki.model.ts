export interface Wiki {
  id: number;
  title: string;
  slug: string;
  content?: string;
}

export interface WikiPage {
  content: Wiki[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
}

export interface CreateWikiRequest {
  title: string;
  content?: string;
}
