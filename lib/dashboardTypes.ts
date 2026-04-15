/** Serializable shapes produced by `lib/dashboardData.js` for UI layers. */

export type RepairEvaluationStatus = "ok" | "partial" | "failed" | "skipped";

export type Co2ImpactIcon = "tree" | "lifestyle" | "tech";

export type Co2ImpactCard = {
  icon: Co2ImpactIcon;
  title: string;
  body: string;
};

export type Co2Equivalents = {
  co2Kg: number;
  totalSaved: string;
  headline: string;
  impacts: Co2ImpactCard[];
  footer: string;
} | null;

export type JobSummary = {
  jobId: string;
  repairJobPk: number;
  imei: string;
  model: string;
  modelCode: string;
  make: string;
  status: RepairEvaluationStatus;
  savedLifecycleKg: number;
  deviceLabel: string | null;
  matchTier: string | null;
  failReason: string | null;
  defectLabel: string;
};

export type TopModelRow = { label: string; savedKg: number; jobCount: number };

export type JobPipelineRow = {
  key: string;
  label: string;
  hint: string;
  count: number;
  color: string;
};

export type DefectSavingRow = { label: string; savedKg: number; jobCount: number };

export type DashboardCharts = {
  jobPipeline: JobPipelineRow[];
  defectSavings: DefectSavingRow[];
};

/** One row per distinct model name; how many distinct model numbers (SKUs) appear for that name. */
export type AttentionModelRow = {
  modelName: string;
  modelNumberCount: number;
};

export type DashboardPayload = {
  summaries: JobSummary[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasPrev: boolean;
    hasNext: boolean;
  };
  totals: {
    jobs: number;
    okCount: number;
    partialCount: number;
    failedCount: number;
    skippedCount: number;
    totalSavedKg: number;
  };
  equivalents: Co2Equivalents;
  topModels: TopModelRow[];
  attentionModels: AttentionModelRow[];
  charts: DashboardCharts;
  search: string;
};

export type JobReportPayload = {
  jobId: string;
  repairJobPk: number;
  imei: string;
  sn: string;
  make: string;
  model: string;
  modelCode: string;
  repairStatus: string;
  repairDescription: string;
  evaluationStatus: RepairEvaluationStatus;
  jobLabel: string;
  defect: {
    type: string | null;
    jobDescription: string | null;
    catalogDescription: string | null;
  } | null;
  deviceResolution: {
    matchedAs: string;
    matchTier: string;
    device: {
      model_code: string;
      model_name: string;
      manufacturing_co2: number;
      distribution_co2: number;
      use_co2: number;
      disposal_co2: number;
    } | null;
  } | null;
  analysis: {
    lifecycleBaseline: number;
    partsCo2: number;
    approxAvoidedLifecycle: number;
    lines: Array<{
      slot: number;
      sku: string;
      desc: string;
      /** `part_descp.description` from DB when SKU exists in catalogue (app job UI only). */
      partDescp: string;
      qty: number;
      componentName: string | null;
      co2PerUnit: number | null;
      lineCo2: number | null;
      mapReason: string;
    }>;
  } | null;
  equivalents: Co2Equivalents;
  warnings: string[];
  message: string | null;
};
