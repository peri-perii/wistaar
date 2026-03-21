import { Button } from "@/components/ui/button";
import { ArrowRight, PenLine, Users, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const features = [
  { icon: PenLine, title: "Complete Control", desc: "Retain full ownership. Set your own pricing." },
  { icon: Users, title: "Direct Connection", desc: "Build relationships with readers directly." },
  { icon: ShieldCheck, title: "Secure Distribution", desc: "Industry-leading content protection." },
];

const AuthorSection = () => {
  return (
    <section className="section-padding border-t border-border">
      <div className="container-main">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-sm tracking-widest uppercase text-accent mb-4">
            For Authors
          </p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl mb-6 max-w-2xl mx-auto">
            Publish with freedom, reach readers with care.
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Wistaar gives independent authors a respectful platform to share their work.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 mb-20">
          {features.map((f, i) => (
            <motion.div
              key={i}
              className="text-center p-8 border border-border rounded-lg hover:border-accent/40 transition-colors duration-300"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <f.icon className="w-5 h-5 mx-auto mb-4 text-accent" />
              <h3 className="font-sans font-medium mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="max-w-2xl mx-auto text-center mb-16"
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
        >
          <div className="border-l-2 border-accent/50 pl-8 py-4 text-left">
            <blockquote className="font-serif text-3xl md:text-4xl lg:text-[2.75rem] leading-tight italic text-foreground/90 mb-6">
              "Every story deserves a reader who truly listens."
            </blockquote>
            <p className="text-sm tracking-wide text-muted-foreground uppercase">
              — A Wistaar Author
            </p>
          </div>
        </motion.div>

        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Link to="/publish">
            <Button size="lg" className="gap-2">
              Start Publishing
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default AuthorSection;
