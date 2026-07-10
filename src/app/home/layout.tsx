import { Footer } from "@/components/layout/Footer";

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Footer />
    </>
  );
}
