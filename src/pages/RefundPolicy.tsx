import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

const RefundPolicy = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl min-h-screen">
      <Link
        to="/"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Home
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="prose prose-stone max-w-none"
      >
        <h1 className="font-serif text-4xl mb-6">Wisties Refund Policy</h1>

        <div className="bg-muted/30 p-6 rounded-lg border border-muted mb-8">
          <p className="text-lg font-medium mb-0">
            Wistaar offers store credit refunds called Wisties (1 Wistie = ₹1). Within 24 hours of purchase, you can request a full refund and the amount will be credited to your Wisties balance instantly. Wisties never expire and can be used to buy any book on Wistaar. We do not offer cash refunds.
          </p>
        </div>

        <h2>Frequently Asked Questions</h2>
        
        <h3>What are Wisties?</h3>
        <p>
          Wisties are our internal store credit system. 1 Wistie is equivalent to ₹1. They are used exclusively on the Wistaar platform to purchase any digital book available.
        </p>

        <h3>How long do I have to request a refund?</h3>
        <p>
          You have exactly 24 hours from the time of purchase to request a refund. Once 24 hours have passed, the "Request refund" option will no longer be available.
        </p>

        <h3>How do I request a refund?</h3>
        <p>
          Go to your Library, find the purchased book, and click the "Request refund" button. Your Wisties balance will be credited instantly, and your access to the book will be revoked.
        </p>

        <h3>Can I get a cash refund to my bank account or credit card?</h3>
        <p>
          No, all refunds are strictly processed as Wisties store credit. We do not support cash refunds back to original payment methods.
        </p>

        <h3>Do my Wisties expire?</h3>
        <p>
          No! Your Wisties balance will never expire. You can hold onto your credits as long as you'd like before making your next purchase.
        </p>

      </motion.div>
    </div>
  );
};

export default RefundPolicy;
