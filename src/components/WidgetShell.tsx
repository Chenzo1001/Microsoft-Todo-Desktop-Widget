import type { CSSProperties, ReactNode } from "react";

type Props = {
  opacity: number;
  fontFamily: string;
  fontScale: number;
  children: ReactNode;
};

export function WidgetShell({ opacity, fontFamily, fontScale, children }: Props) {
  return (
    <main
      className="widget-shell"
      data-font={fontFamily}
      style={
        {
          "--widget-opacity": opacity,
          "--font-scale": fontScale,
        } as CSSProperties
      }
    >
      {children}
    </main>
  );
}
