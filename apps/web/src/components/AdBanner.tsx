"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    /** Injected by the AdSense loader script; each push renders one <ins>. */
    adsbygoogle?: unknown[];
  }
}

type Props = {
  readonly slot: string;
  readonly className?: string;
};

export function AdBanner({ slot, className }: Props) {
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle ?? []).push({});
    } catch {
      // adsbygoogle not loaded
    }
  }, []);

  return (
    <div className={className}>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="ca-pub-9817070969559871"
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
