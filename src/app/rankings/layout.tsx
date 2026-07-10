import { Footer } from "@/components/layout/Footer";

export default function RankingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Footer />
    </>
  );
}
