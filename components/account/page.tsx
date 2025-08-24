// app/account/page.tsx  (or app/shop/page.tsx)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth-server';
import { getDb } from '@/lib/db';
import { users } from '@/db/schema'; // adjust to your path
import { eq } from 'drizzle-orm';

export default async function AccountPage() {
  const r = await requireAuth();
  if (!r.ok) redirect('/login');

  const db = getDb();
  try {
    const rows = await db
      .select({ id: users.id, username: users.username, email: users.email })
      .from(users)
      .where(eq(users.id, r.userId))
      .limit(1);

    const user = rows[0];
    if (!user) {
      console.warn('[account] no user row for', r.userId);
      redirect('/login');
    }

    return (
      <main style={{padding:16}}>
        <h1>Welcome, {user.username}</h1>
        <p>{user.email}</p>
      </main>
    );
  } catch (e) {
    console.error('[account] db error', e);
    // Fail soft instead of throwing a server render error
    redirect('/login');
  }
}
