export function StarIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={`${className} text-yellow-500`} fill="currentColor" viewBox="0 0 20 20">
      <path d="M10 2l2.5 5 5 .5-3.5 3.5 1 5-5-2.5-5 2.5 1-5L2.5 7.5 7.5 7 10 2z" />
    </svg>
  );
}
