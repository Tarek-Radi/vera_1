import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { db } from "../db/client";
import { StoreError } from "../orders/validation";
export const authConfigured = () =>
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
export async function authClient() {
  if (!authConfigured())
    throw new StoreError(
      "Owner sign-in is awaiting Supabase configuration.",
      503,
      "NOT_CONFIGURED",
    );
  const jar = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      },
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (values) => {
          try {
            values.forEach(({ name, value, options }) =>
              jar.set(name, value, options),
            );
          } catch {
            /* Server components cannot write cookies. API requests refresh them. */
          }
        },
      },
    },
  );
}
export async function requireAdmin() {
  const auth = await authClient();
  const {
    data: { user },
    error,
  } = await auth.auth.getUser();
  if (error || !user)
    throw new StoreError(
      "Please sign in with your owner account.",
      401,
      "UNAUTHENTICATED",
    );
  const [admin] =
    await db()`select user_id from admin_users where user_id = ${user.id}`;
  if (!admin)
    throw new StoreError(
      "This account does not have store access.",
      403,
      "FORBIDDEN",
    );
  return user;
}
