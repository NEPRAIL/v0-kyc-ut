export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function Welcome() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Welcome to KYCut</h1>
      <p>Your account was created successfully.</p>
      <p><a href="/account">Go to your account</a></p>
    </main>
  );
}
