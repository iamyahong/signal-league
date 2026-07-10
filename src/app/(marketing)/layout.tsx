import { SmartHeader } from "@/components/layout/SmartHeader";
import { Footer } from "@/components/layout/Footer";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <SmartHeader />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
