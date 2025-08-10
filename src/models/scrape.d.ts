export interface ScrapeRequest {
  search: string;
  page?: number;
  size?: number;
  getAll?: boolean;
  scrapeDetails?: boolean;
}

export interface Product {
  title: string;
  price: string;
  link: string;
  image: string;
  description?: string;
}

export interface MetaPagination {
  total: number;
  page: number;
  size: number;
}

export interface ScrapeResponse {
  items: Product[];
  meta: MetaPagination;
}
