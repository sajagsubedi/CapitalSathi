import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import DashboardSideBar from "@/components/DashboardSidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/signin");

  return (
    <>
      <DashboardSideBar />
      <main className="lg:pl-72 sm:pl-14">{children}</main>
    </>
  );
}
