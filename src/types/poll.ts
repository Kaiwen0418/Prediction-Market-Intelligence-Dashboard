export type PollPoint = {
  timestamp: string;
  pollAverage: number;
  sampleSize: number;
  source: string;
  sourceUrl?: string;
  fieldDateLabel?: string;
  methodology?: string;
  candidate?: string;
  moe?: number;
};
