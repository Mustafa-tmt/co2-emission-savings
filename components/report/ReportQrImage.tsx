import QRCode from "qrcode";

type Props = {
  url: string;
  size?: number;
  caption?: string;
};

export async function ReportQrImage({ url, size = 176, caption = "Scan for online report" }: Props) {
  const dataUrl = await QRCode.toDataURL(url, {
    width: size,
    margin: 1,
    color: { dark: "#0f172a", light: "#ffffff" },
  });

  return (
    <div className="flex flex-col items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element -- data URL from qrcode */}
      <img src={dataUrl} width={size} height={size} alt="" />
      {caption ? (
        <span className="max-w-[200px] text-center text-xs text-[var(--muted)]">{caption}</span>
      ) : null}
    </div>
  );
}
