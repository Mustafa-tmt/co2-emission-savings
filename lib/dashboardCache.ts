import { cache } from "react";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const dashboardData = require("./dashboardData.js") as {
  getDashboardData: (options: {
    search?: string;
    page?: number;
    pageSize?: number;
  }) => Promise<unknown>;
  getJobReportPayload: (jobId: string) => Promise<unknown>;
};

/** One evaluation pass per request; primitives keep React.cache hits stable. */
export const getDashboardDataCached = cache((search: string, page: number) =>
  dashboardData.getDashboardData({ search, page })
);

export const getJobReportCached = cache((jobId: string) =>
  dashboardData.getJobReportPayload(jobId)
);
