"use client";

import { useUser, UserButton } from "@clerk/nextjs";

function ConnectedControls() {
  const { isLoaded, isSignedIn } = useUser();
  if (!isLoaded) return null;
  if (!isSignedIn) return <a className="account-link" href="/sign-in">Sign in</a>;
  return (
    <>
      <a className="account-link" href="/dashboard">My garden</a>
      <UserButton appearance={{ elements: { avatarBox: "clerk-avatar" } }} />
    </>
  );
}

export function AccountControls() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return <span className="account-link muted">Auth setup required</span>;
  }
  return <ConnectedControls />;
}
