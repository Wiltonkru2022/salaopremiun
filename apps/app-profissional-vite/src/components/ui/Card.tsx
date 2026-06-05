export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-[1.4rem] border border-zinc-200 bg-white p-4 shadow-sm ${className}`}>{children}</section>;
}
