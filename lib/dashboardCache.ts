import { cache } from "react";
import type { ReplacementScenario } from "@/lib/dashboardTypes";
import { DEFAULT_SCENARIO } from "@/lib/modelAssumptions";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const dashboardData = require("./dashboardData.js") as {
  getDashboardData: (options: {
    search?: string;
    page?: number;
    pageSize?: number;
    replacementScenario?: string;
  }) => Promise<unknown>;
  getJobReportPayload: (jobId: string, replacementScenario?: string) => Promise<unknown>;
};

/** One evaluation pass per request; primitives keep React.cache hits stable. */
export const getDashboardDataCached = cache(
  (search: string, page: number, replacementScenario: ReplacementScenario = DEFAULT_SCENARIO) =>
    dashboardData.getDashboardData({ search, page, replacementScenario })
);

export const getJobReportCached = cache((jobId: string, scenario: ReplacementScenario = DEFAULT_SCENARIO) =>
  dashboardData.getJobReportPayload(jobId, scenario)
);
