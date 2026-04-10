/* eslint-disable jsx-a11y/alt-text -- @react-pdf/rendered Image is PDF output, not DOM */
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { JobReportPayload } from "@/lib/dashboardTypes";
import { modelAssumptionLinesForPdf } from "@/lib/modelAssumptions";

const styles = StyleSheet.create({
  page: {
    paddingTop: 0,
    paddingBottom: 44,
    paddingHorizontal: 0,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#0f172a",
    backgroundColor: "#f8fafc",
  },
  hero: {
    backgroundColor: "#0f766e",
    paddingTop: 24,
    paddingBottom: 22,
    paddingHorizontal: 44,
    marginBottom: 20,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  heroTextBlock: { flex: 1, paddingRight: 16 },
  heroLogo: { width: 300, height: 72, objectFit: "contain" as const },
  heroKicker: { fontSize: 8, color: "#99f6e4", marginBottom: 4, letterSpacing: 0.5 },
  heroTitle: { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#ffffff", marginBottom: 4 },
  heroJob: { fontSize: 11, color: "#ccfbf1", fontFamily: "Helvetica-Bold" },
  body: { paddingHorizontal: 44 },
  h1: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 6, color: "#0f172a" },
  muted: { fontSize: 8, color: "#64748b", marginBottom: 12, lineHeight: 1.4 },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginTop: 12,
    marginBottom: 8,
    color: "#0f766e",
    borderBottomWidth: 1,
    borderBottomColor: "#ccfbf1",
    paddingBottom: 4,
  },
  row: { flexDirection: "row", marginBottom: 5 },
  label: { width: "36%", color: "#64748b", fontSize: 8 },
  value: { width: "64%", fontSize: 9, fontFamily: "Helvetica" },
  box: {
    marginTop: 6,
    padding: 12,
    backgroundColor: "#ffffff",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  warn: {
    marginTop: 8,
    padding: 10,
    backgroundColor: "#fffbeb",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#fcd34d",
    fontSize: 8,
    color: "#78350f",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#0f766e",
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginTop: 10,
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
  },
  tableRow: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingVertical: 5,
    paddingHorizontal: 8,
    fontSize: 7,
  },
  colSlot: { width: "6%" },
  colSku: { width: "28%" },
  colComp: { width: "46%" },
  colCo2: { width: "20%", textAlign: "right" },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 44,
    right: 44,
    fontSize: 7,
    color: "#94a3b8",
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 8,
  },
  qrCard: {
    marginTop: 14,
    padding: 12,
    backgroundColor: "#ffffff",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    flexDirection: "row",
    alignItems: "flex-start",
  },
  qrImg: { width: 88, height: 88 },
  assumeBullet: {
    fontSize: 7,
    color: "#475569",
    marginBottom: 5,
    lineHeight: 1.35,
    paddingLeft: 8,
  },
});

function formatKg(n: number | null | undefined, decimals = 3) {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  return `${Number(n).toFixed(decimals)} kg CO2e`;
}

type Props = {
  report: JobReportPayload;
  reportUrl: string;
  qrDataUrl: string;
  /** Base64 data URL (PNG) — same strapline as web `TmtLogo` onDark. */
  logoDataUrl: string;
};

export function RepairPdfDocument({ report, reportUrl, qrDataUrl, logoDataUrl }: Props) {
  const skippedOrFailed =
    report.evaluationStatus === "skipped" || report.evaluationStatus === "failed";

  return (
    <Document title={`CO₂ repair report — job ${report.jobId}`} author="TMT">
      <Page size="A4" style={styles.page}>
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.heroTextBlock}>
              <Text style={styles.heroKicker}>SUSTAINABILITY · REPAIR CO₂E</Text>
              <Text style={styles.heroTitle}>Repair impact report</Text>
              <Text style={styles.heroJob}>Job {report.jobId}</Text>
            </View>
            <Image src={logoDataUrl} style={styles.heroLogo} />
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.muted}>
            Units: kg CO2e (CO₂-equivalent). Figures use your LCA device and component tables.
            Illustrative equivalents are order-of-magnitude only.
          </Text>

          <Text style={styles.sectionTitle}>Assumptions & limitations</Text>
          {modelAssumptionLinesForPdf().map((line) => (
            <Text key={line} style={styles.assumeBullet}>
              • {line}
            </Text>
          ))}

          <Text style={styles.sectionTitle}>Job details</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Job ID</Text>
          <Text style={styles.value}>{report.jobId}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Listed model / code</Text>
          <Text style={styles.value}>
            {report.make} {report.model}
            {report.modelCode ? ` · ${report.modelCode}` : ""}
          </Text>
        </View>
        {report.imei ? (
          <View style={styles.row}>
            <Text style={styles.label}>IMEI</Text>
            <Text style={styles.value}>{report.imei}</Text>
          </View>
        ) : null}
        <View style={styles.row}>
          <Text style={styles.label}>Repair status</Text>
          <Text style={styles.value}>{report.repairStatus || "—"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Evaluation</Text>
          <Text style={styles.value}>{report.evaluationStatus}</Text>
        </View>

        {report.message ? (
          <View style={styles.warn}>
            <Text>{report.message}</Text>
          </View>
        ) : null}

        {!skippedOrFailed && report.deviceResolution?.device ? (
          <>
            <Text style={styles.sectionTitle}>Matched device (LCA)</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Model code</Text>
              <Text style={styles.value}>{report.deviceResolution.device.model_code}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Model name</Text>
              <Text style={styles.value}>{report.deviceResolution.device.model_name}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Match key / tier</Text>
              <Text style={styles.value}>
                {report.deviceResolution.matchedAs} · {report.deviceResolution.matchTier}
              </Text>
            </View>

            {report.defect ? (
              <>
                <Text style={styles.sectionTitle}>Defect</Text>
                <View style={styles.row}>
                  <Text style={styles.label}>Type</Text>
                  <Text style={styles.value}>{report.defect.type ?? "—"}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Catalogue</Text>
                  <Text style={styles.value}>{report.defect.catalogDescription ?? "—"}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Job notes</Text>
                  <Text style={styles.value}>{report.defect.jobDescription ?? "—"}</Text>
                </View>
              </>
            ) : null}

            {report.analysis ? (
              <>
                <Text style={styles.sectionTitle}>CO₂e summary</Text>
                <View style={styles.box}>
                  <View style={styles.row}>
                    <Text style={styles.label}>Full lifecycle (ref.)</Text>
                    <Text style={styles.value}>{formatKg(report.analysis.lifecycleBaseline)}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>Parts (this repair)</Text>
                    <Text style={styles.value}>{formatKg(report.analysis.partsCo2)}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>Avoided vs full lifecycle</Text>
                    <Text style={[styles.value, { fontFamily: "Helvetica-Bold" }]}>
                      {formatKg(report.analysis.approxAvoidedLifecycle)}
                    </Text>
                  </View>
                </View>
              </>
            ) : null}

            {report.equivalents ? (
              <View style={styles.box}>
                <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", marginBottom: 3 }}>
                  {report.equivalents.totalSaved} (illustrative)
                </Text>
                <Text style={{ fontSize: 7, lineHeight: 1.35, marginBottom: 4 }}>
                  {report.equivalents.headline}
                </Text>
                {report.equivalents.impacts.map((card) => (
                  <View key={card.title} style={{ marginBottom: 4 }}>
                    <Text style={{ fontSize: 7, fontFamily: "Helvetica-Bold", marginBottom: 2 }}>
                      {card.title}
                    </Text>
                    <Text style={{ fontSize: 7, lineHeight: 1.35 }}>{card.body}</Text>
                  </View>
                ))}
                <Text
                  style={{
                    fontSize: 7,
                    fontFamily: "Helvetica-Oblique",
                    marginTop: 4,
                    textAlign: "center",
                    color: "#0f766e",
                  }}
                >
                  {report.equivalents.footer}
                </Text>
              </View>
            ) : null}

            {report.warnings.length > 0 ? (
              <View style={styles.warn}>
                <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 4 }}>Warnings</Text>
                {report.warnings.map((w) => (
                  <Text key={w} style={{ marginBottom: 2 }}>
                    • {w}
                  </Text>
                ))}
              </View>
            ) : null}

            <View style={styles.qrCard}>
              <Image src={qrDataUrl} style={styles.qrImg} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", marginBottom: 4 }}>
                  Online report
                </Text>
                <Text style={{ fontSize: 7, color: "#64748b" }}>{reportUrl}</Text>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.qrCard}>
            <Image src={qrDataUrl} style={styles.qrImg} />
            <Text style={{ fontSize: 8, flex: 1, marginLeft: 12 }}>
              Scan to open the online report for this job.
            </Text>
          </View>
        )}

        </View>

        <Text style={styles.footer} fixed>
          TMT · Avoided CO₂e = reference new-device footprint minus mapped spare parts (from your LCA
          data). Not a full shop or logistics LCA.
        </Text>
      </Page>

      {!skippedOrFailed && report.analysis?.lines && report.analysis.lines.length > 0 ? (
        <Page size="A4" style={styles.page}>
          <View style={styles.hero}>
            <View style={styles.heroTop}>
              <View style={styles.heroTextBlock}>
                <Text style={styles.heroKicker}>PARTS · LINE ITEMS</Text>
                <Text style={styles.heroTitle}>Mapped components</Text>
                <Text style={styles.heroJob}>Job {report.jobId}</Text>
              </View>
              <Image src={logoDataUrl} style={styles.heroLogo} />
            </View>
          </View>
          <View style={styles.body}>
            <View style={styles.tableHeader}>
              <Text style={styles.colSlot}>#</Text>
              <Text style={styles.colSku}>SKU</Text>
              <Text style={styles.colComp}>Component / mapping</Text>
              <Text style={styles.colCo2}>CO₂e</Text>
            </View>
            {report.analysis.lines.map((ln) => (
              <View key={ln.slot} style={styles.tableRow}>
                <Text style={styles.colSlot}>{ln.slot}</Text>
                <Text style={styles.colSku}>{ln.sku}</Text>
                <Text style={styles.colComp}>
                  {ln.componentName ?? `Not mapped (${ln.mapReason})`}
                </Text>
                <Text style={styles.colCo2}>
                  {ln.lineCo2 != null && Number.isFinite(ln.lineCo2) ? formatKg(ln.lineCo2, 4) : "—"}
                </Text>
              </View>
            ))}
            <View style={styles.qrCard}>
              <Image src={qrDataUrl} style={styles.qrImg} />
              <Text style={{ fontSize: 7, color: "#64748b", flex: 1, marginLeft: 12 }}>{reportUrl}</Text>
            </View>
          </View>
          <Text style={styles.footer} fixed>
            Job {report.jobId} · TMT · CO₂ repair report
          </Text>
        </Page>
      ) : null}
    </Document>
  );
}
