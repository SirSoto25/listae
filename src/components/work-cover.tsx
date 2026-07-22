/* eslint-disable @next/next/no-img-element */

type WorkCoverProps = {
  src?: string | null;
  alt: string;
  className?: string;
};

export function WorkCover({ src, alt, className = "" }: WorkCoverProps) {
  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br from-border to-surface transition duration-180 hover:scale-[1.02] motion-reduce:transform-none motion-reduce:transition-none ${className}`}
    >
      {src ? (
        <img
          className="h-full w-full object-cover"
          src={src}
          alt={alt}
          loading="lazy"
        />
      ) : (
        <div className="flex h-full items-end p-4">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
            Listae
          </span>
        </div>
      )}
    </div>
  );
}
