import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { BookOpen, Shield, Users, TrendingUp, Zap, Globe } from "lucide-react";

const features = [
  {
    icon: BookOpen,
    title: "Full Creative Control",
    description: "Publish your work exactly as you envision it. No editorial interference, no compromises."
  },
  {
    icon: Shield,
    title: "Secure Distribution",
    description: "Your content is protected with industry-leading security. Readers access, never download."
  },
  {
    icon: Users,
    title: "Direct Reader Connection",
    description: "Build your audience directly. Engage with readers who genuinely appreciate your work."
  },
  {
    icon: TrendingUp,
    title: "Fair Revenue Share",
    description: "Earn what you deserve. Transparent pricing with the majority going to you, the creator."
  },
  {
    icon: Zap,
    title: "Simple Publishing",
    description: "Upload your manuscript, set your price, and publish. No complex processes or lengthy approvals."
  },
  {
    icon: Globe,
    title: "Global Reach",
    description: "Reach readers across India and beyond. Your stories deserve a worldwide audience."
  }
];

const steps = [
  { number: "01", title: "Create Account", description: "Sign up as an author in minutes" },
  { number: "02", title: "Upload Manuscript", description: "Add your book with cover and details" },
  { number: "03", title: "Set Your Terms", description: "Choose pricing and access options" },
  { number: "04", title: "Publish & Earn", description: "Go live and connect with readers" }
];

const Publish = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block px-4 py-1.5 bg-accent/10 text-accent rounded-full text-sm font-medium mb-6">
            For Authors
          </span>
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-foreground leading-tight mb-6">
            Your stories deserve
            <br />
            <span className="text-accent">to be read.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Wistaar empowers independent authors to publish, protect, and profit from their work. 
            No gatekeepers. No compromise. Just your words, reaching the readers who need them.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/author/signup">
              <Button size="lg">Start Publishing</Button>
            </Link>
            <Button variant="outline" size="lg">
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6 bg-secondary/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl md:text-4xl text-foreground mb-4">
              Why authors choose Wistaar
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              A platform built with respect for the craft and the creator.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="bg-background p-8 rounded-sm border border-border/50 hover:border-accent/30 transition-colors duration-300"
              >
                <feature.icon className="w-8 h-8 text-accent mb-4" strokeWidth={1.5} />
                <h3 className="font-serif text-xl text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl md:text-4xl text-foreground mb-4">
              From manuscript to published
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Four simple steps to share your work with the world.
            </p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="text-center">
                <span className="inline-block font-serif text-4xl text-accent/40 mb-4">
                  {step.number}
                </span>
                <h3 className="font-medium text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-20 px-6 bg-foreground text-background">
        <div className="max-w-3xl mx-auto text-center">
          <blockquote className="font-serif text-2xl md:text-3xl leading-relaxed mb-8">
            "Wistaar gave me something traditional publishing never could — 
            complete ownership of my work and a direct line to my readers."
          </blockquote>
          <div>
            <p className="font-medium">Priya Sharma</p>
            <p className="text-background/60 text-sm">Author of 12 published works</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-serif text-3xl md:text-4xl text-foreground mb-4">
            Ready to publish?
          </h2>
          <p className="text-muted-foreground mb-8">
            Join thousands of authors who trust Wistaar with their stories.
          </p>
          <Link to="/author/signup">
            <Button size="lg">Create Author Account</Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Publish;
