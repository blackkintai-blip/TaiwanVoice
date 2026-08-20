export type SrsState = {
  due: string; // YYYY-MM-DD
  interval: number; // days
  ease: number;
  reps: number;
  lapses: number;
};

export type Example = {
  hanzi: string;
  zhuyin: string;
  zhuyinEdited: boolean;
  meaning: string;
};

export type Card = {
  id: string;
  hanzi: string;
  zhuyin: string;
  zhuyinEdited: boolean;
  meaning: string;
  tags: string[];
  note: string;
  examples: Example[];
  srs: SrsState;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
};
