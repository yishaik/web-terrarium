import { auth, currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { GardenLauncher } from "@/components/garden-launcher";
import { getOwnerGardens } from "@/lib/worker";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { userId } = await auth();
  const user = await currentUser();
  const gardens = userId ? await getOwnerGardens(userId).catch(() => []) : [];

  return (
    <main className="dashboard-page">
      <p className="eyebrow">OWNER CONSOLE</p>
      <h1>Welcome, <em>{user?.firstName ?? "gardener"}</em>.</h1>
      <p className="intro">Your account is connected. The next garden you create will be public by default, with a Private toggle under your control.</p>
      <GardenLauncher initialGardens={gardens} />
      <p className="muted">Owner identity: {userId?.slice(0, 10)}…</p><Link className="primary-link" href="/">Plant a research seed</Link>
    </main>
  );
}
