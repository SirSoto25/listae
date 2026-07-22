/* eslint-disable @next/next/no-img-element */

type WorkCoverProps = {
  src?: string | null;
  alt: string;
  className?: string;
};

export function WorkCover({ src, alt, className = "" }: WorkCoverProps) {
  return (
    <div
      className={`relative overflow-hidden bg-[linear-gradient(145deg,#e7e5e4,#d6d3d1)] ${className}`}
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
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
            Listae
          </span>
        </div>
      )}
    </div>
  );
}
