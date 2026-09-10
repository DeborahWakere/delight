export type JobStatus = "PENDING" | "SUCCESS" | "ERROR" | "ENQUEUED";

export interface DelightItem {
  id: string;
  label?: string;
  value: string;
  meta?: string;
}

export interface DelightSource {
  title: string;
  url: string;
  snippet?: string;
}

export interface DelightResult {
  title: string;
  summary: string;
  answer: string;
  items: DelightItem[];
  notes: string[];
  sources: DelightSource[];
}

export interface CreateJobResponse {
  jobId: string;
  status: JobStatus;
}
