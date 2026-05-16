import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const CTASection = () => {
  return (
    <section className="section-padding border-t border-border">
      <div className="container-main text-center">
        <h2 className="text-3xl md:text-4xl lg:text-5xl mb-6">
          Begin your journey.
        </h2>
        <p className="text-lg text-muted-foreground mb-12 max-w-lg mx-auto">
          Whether you're here to discover your next favorite book or share 
          your stories, Wistaar welcomes you.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/explore">
            <Button size="lg" className="gap-2 px-8">
              Start Reading
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link to="/publish">
            <Button variant="outline" size="lg" className="px-8">
              Publish Your Book
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CTASection;