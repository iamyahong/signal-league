import { auth } from "@/lib/auth";
import { AppHeader } from "./AppHeader";
import { PublicHeader } from "./PublicHeader";

export async function SmartHeader() {
  const session = await auth();

  if (session?.user) {
    return <AppHeader />;
  }

  return <PublicHeader />;
}
