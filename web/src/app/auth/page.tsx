import AuthView from "@/components/auth/AuthView";

type AuthPageProps = {
  searchParams: Promise<{
    next?: string | string[];
  }>;
};

// Allow this route to wait for runtime request data.
export const instant = false;

export default async function AuthPage({
  searchParams,
}: AuthPageProps) {
  const params = await searchParams;

  const nextValue = Array.isArray(params.next)
    ? params.next[0]
    : params.next;

  // Allow only local admin routes as the post-login destination.
  const safeNext =
    nextValue === "/admin" || nextValue?.startsWith("/admin/")
      ? nextValue
      : undefined;

  return <AuthView next={safeNext} />;
}

