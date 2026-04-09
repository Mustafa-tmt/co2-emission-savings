import Image from "next/image";

type Props = {
  variant: "onLight" | "onDark";
  className?: string;
  priority?: boolean;
};

const src = {
  onLight: "/brand/tmt_logo_strapline_margin_on_white.png",
  onDark: "/brand/tmt_logo_strapline_margin_on_black.png",
} as const;

/**
 * Strapline lockups from brand assets — use onLight on pale surfaces, onDark on sidebar / dark bands.
 */
export function TmtLogo({ variant, className = "h-9 w-auto max-w-full", priority }: Props) {
  return (
    <Image
      src={src[variant]}
      alt="TMT"
      width={600}
      height={144}
      className={className}
      priority={priority}
    />
  );
}
