// app/account/settings/page.tsx
import { requireAuth } from "@/lib/auth-server"; // wherever yours lives
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const auth = await requireAuth();

  if (!auth.ok) {
    // your helper likely already redirected; this is a safety net
    redirect("/login"); // or return <div>Authentication required</div>
  }

  // here TS knows auth is the ok-branch
  const userId = auth.userId;
  const session = auth.session;

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-2xl font-semibold">Account Settings</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        User ID: {String(userId)}
      </p>
      {/* ...rest of your settings UI... */}
    </div>
  );
}
