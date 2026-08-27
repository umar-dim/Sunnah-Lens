import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import ImportanceSection from "@/components/ImportanceSection";
import DevNotice from "@/components/DevNotice";
import Footer from "@/components/Footer";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <Hero />
        <ImportanceSection />
        <DevNotice />
      </main>
      <Footer />
    </>
  );
}
