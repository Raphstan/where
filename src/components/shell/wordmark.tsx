/** Wordmark « WHERE » avec le point corail de la maquette. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`font-display font-medium tracking-[0.14em] text-[15px] after:ml-[5px] after:inline-block after:size-1.5 after:rounded-full after:bg-coral after:align-middle after:content-[''] ${className}`}
    >
      WHERE
    </span>
  );
}
