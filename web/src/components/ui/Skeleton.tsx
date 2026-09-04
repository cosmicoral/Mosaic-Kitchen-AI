import { Card } from "./Card";

// Placeholders shaped like the content that is coming, rather than a spinner
// or the word "Loading". Two reasons: the page does not jump when the data
// lands, and a shape the eye can already parse makes the same wait feel
// shorter than a blank box does.
//
// Only used where the shape is actually known in advance. Faking a layout the
// data might not fill is a worse lie than a spinner.
export function SkeletonText({ width = "100%" }: { width?: string }) {
  return <div aria-hidden className="skeleton skeleton--text" style={{ width }} />;
}

export function SkeletonCard({ lines = 2 }: { lines?: number }) {
  return (
    <Card aria-hidden>
      <div className="skeleton skeleton--title" />
      {Array.from({ length: lines }, (_, index) => (
        <SkeletonText key={index} width={index === lines - 1 ? "70%" : "100%"} />
      ))}
    </Card>
  );
}

interface ListProps {
  count?: number;
  lines?: number;
  label: string;
}

export function SkeletonList({ count = 3, lines = 2, label }: ListProps) {
  return (
    // The whole group announces itself once. Marking every placeholder as a
    // live region would have a screen reader read "loading" three times.
    <section aria-busy="true" aria-label={label} className="form-grid">
      {Array.from({ length: count }, (_, index) => (
        <SkeletonCard key={index} lines={lines} />
      ))}
    </section>
  );
}
