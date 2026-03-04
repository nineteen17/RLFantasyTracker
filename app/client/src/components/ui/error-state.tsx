export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-900/50 bg-red-950/30 p-4">
      <p className="text-sm text-danger">{message}</p>
    </div>
  );
}
