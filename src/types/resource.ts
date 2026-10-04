export type ResourceType =
  | 'training'
  | 'company_profile'
  | 'product_sheet'
  | 'account_profile'
  | 'data_table'
  | 'memo'
  | 'policy'
  | 'file'
  | 'image';

export type ResourceBody =
  | { kind: 'markdown'; markdown: string }
  | {
      kind: 'table';
      columns: string[];
      rows: Array<Array<string | number>>;
      note?: string;
    }
  | { kind: 'file'; url: string; mimeType: string; description?: string };

export type ResourceDefinition = {
  key: string;
  title: string;
  description: string;
  resourceType: ResourceType;
  body: ResourceBody;
  /** `scenario` = Data Room for this scenario; `step` = surfaced in-step only. */
  visibility: 'scenario' | 'step';
  sortOrder: number;
  /** Shown on the card so a resource reads like a real file, e.g. "PDF · 12 pages". */
  fileMeta?: { format: 'PDF' | 'XLSX' | 'DOC' | 'WEB'; detail: string };
  /** Optional illustration shown when the resource is opened. */
  image?: { src: string; alt: string };
};
