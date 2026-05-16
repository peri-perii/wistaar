import Navigation from "@/components/Navigation";
import HeroSection from "@/components/HeroSection";
import FreeReadingSection from "@/components/FreeReadingSection";
import PremiumSection from "@/components/PremiumSection";
import AuthorSection from "@/components/AuthorSection";
import ReadingExperienceSection from "@/components/ReadingExperienceSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main>
        <HeroSection />
        <FreeReadingSection />
        <PremiumSection />
        <AuthorSection />
        <ReadingExperienceSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
