export interface Wiki {
  id: number;
  title: string;
  slug: string;
}

export interface WikiPage {
  content: Wiki[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
}
