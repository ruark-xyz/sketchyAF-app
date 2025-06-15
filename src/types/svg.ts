// Types for SVG asset management and conversion

export interface SVGAsset {
  id: string;
  name: string;
  fileName: string;
  collection: string;
  content: string;
  previewUrl: string;
  width?: number;
  height?: number;
}

export interface SVGCollection {
  id: string;
  name: string;
  displayName: string;
  assets: SVGAsset[];
  totalCount: number;
}



export interface SVGDrawerState {
  isOpen: boolean;
  selectedCollection: string | null;
  searchQuery: string;
  isLoading: boolean;
  error: string | null;
}
