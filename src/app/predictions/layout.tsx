import { Footer } from "@/components/layout/Footer";

export default function PredictionsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Footer />
    </>
  );
}
