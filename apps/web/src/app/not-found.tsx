import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-md py-xxl text-center">
      <h1 className="text-title font-bold">404</h1>
      <p className="text-body text-text-muted">Not found</p>
      <Link href="/" className="rounded-md border border-border px-md py-sm text-body hover:border-brand-dim">
        Home
      </Link>
    </div>
  );
}
