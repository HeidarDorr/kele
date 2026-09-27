export function LoadingSkeleton({ className }: Readonly<{ className?: string }>) {
  return <span className={className ? `skeleton ${className}` : 'skeleton'} aria-hidden="true" />;
}
