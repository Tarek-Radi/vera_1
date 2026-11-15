export default function Loading() {
  return (
    <div
      className="page-shell loading-grid"
      aria-label="Loading collection"
      aria-busy="true"
    >
      {[0, 1, 2, 3].map((i) => (
        <div className="skeleton" key={i} />
      ))}
    </div>
  );
}
