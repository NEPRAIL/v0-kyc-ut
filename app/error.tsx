'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error('[app] render error', error, error.digest);
  return (
    <html>
      <body style={{padding:16,fontFamily:'system-ui'}}>
        <h1>Something went wrong</h1>
        <p>Ref ID: <code>{error.digest}</code></p>
        <button onClick={() => reset()}>Try again</button>
      </body>
    </html>
  );
}
