"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Toast de la maquette (.toast) : un message bref, effacé au bout de 2,2 s. */
export function useToast() {
  const [text, setText] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  const show = useCallback((t: string) => {
    setText(t);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setText(null), 2200);
  }, []);
  const node = text ? (
    <div
      role="status"
      className="fixed bottom-[92px] left-1/2 z-50 max-w-[90%] -translate-x-1/2 animate-pop truncate rounded-full bg-ink px-4 py-2.5 text-[13px] font-semibold whitespace-nowrap text-cream lg:bottom-7"
    >
      {text}
    </div>
  ) : null;
  return { show, node };
}
