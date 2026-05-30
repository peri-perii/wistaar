import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, RefreshCw, Clock } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { useSEO } from '@/hooks/useSEO';

const faqs = [
  {
    q: 'What are Wisties?',
    a: 'Wisties are our internal store credit system. 1 Wistie is equivalent to ₹1. They are used exclusively on the Wistaar platform to purchase any digital book available.',
  },
  {
    q: 'How long do I have to request a refund?',
    a: 'You have exactly 24 hours from the time of purchase to request a refund. Once 24 hours have passed, the "Request refund" option will no longer be available.',
  },
  {
    q: 'How do I request a refund?',
    a: 'Go to your Library, find the purchased book, and click the "Request Refund" button. A modal will open with instructions to email our support team at support@wistaar.com. Your email must include screenshots showing how much of the book you have read, along with your registered email, username, and the book\'s price. Our team will review and credit your Wisties balance.',
  },
  {
    q: 'Can I get a cash refund to my bank account or credit card?',
    a: 'No. All refunds are strictly processed as Wisties store credit. We do not support cash refunds back to original payment methods.',
  },
  {
    q: 'Do my Wisties expire?',
    a: "No! Your Wisties balance will never expire. You can hold onto your credits as long as you'd like before making your next purchase.",
  },
];

export default function RefundPolicy() {
  useSEO({
    title: 'Wisties Refund Policy',
    description:
      'Learn about Wistaar\'s refund policy. Get store credit (Wisties) within 24 hours of purchase. 1 Wistie = ₹1, never expire.',
    canonicalPath: '/refund-policy',
  });

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* ── Hero ────────────────────────────────────────────────── */}
      <div className="border-b border-border bg-secondary/30">
        <div className="container-main pt-28 pb-14">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 group"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            Back to Wistaar
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-foreground/5 border border-border mt-1">
                <RefreshCw className="w-5 h-5 text-foreground/60" />
              </div>
              <div>
                <p className="text-xs font-sans font-medium text-accent uppercase tracking-widest mb-2">
                  Legal
                </p>
                <h1 className="font-serif text-4xl md:text-5xl text-foreground leading-tight mb-3">
                  Wisties Refund Policy
                </h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground font-sans">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Last updated: May 2026</span>
                  <span className="mx-1 text-border">·</span>
                  <span>~2 min read</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────── */}
      <div className="container-main py-16 max-w-3xl">

        {/* Summary card */}
        <div className="rounded-xl border border-border bg-secondary/40 p-6 mb-14">
          <p className="text-xs font-sans font-medium text-accent uppercase tracking-widest mb-3">
            Summary
          </p>
          <p className="font-sans text-sm text-foreground leading-relaxed">
            Wistaar offers store credit refunds called{' '}
            <strong className="font-semibold">Wisties</strong> — 1 Wistie = ₹1. Within{' '}
            <strong className="font-semibold">24 hours</strong> of purchase, you can request a
            full refund and the amount is credited to your Wisties balance instantly. Wisties
            never expire and can be used to buy any book on Wistaar.{' '}
            <span className="text-muted-foreground">We do not offer cash refunds.</span>
          </p>
        </div>

        {/* How it works */}
        <section className="mb-14">
          <h2 className="font-serif text-2xl text-foreground mb-6">How It Works</h2>
          <div className="space-y-0">
            {[
              { step: '1', title: 'Purchase a book', body: 'Buy any premium book on Wistaar using your preferred payment method or existing Wisties balance.' },
              { step: '2', title: 'Request within 24 hours', body: 'Go to your Library, find the book, and click "Request Refund". The option disappears after 24 hours.' },
              { step: '3', title: 'Email our support team', body: 'Send an email to support@wistaar.com with screenshots of your reading progress, your registered email, username, and the book\'s price.' },
              { step: '4', title: 'Wisties credited instantly', body: 'Our team reviews your request and credits the full amount to your Wisties balance — ready to use on your next purchase.' },
            ].map((item, i, arr) => (
              <div key={item.step} className="flex gap-5">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-sans font-medium flex-shrink-0">
                    {item.step}
                  </div>
                  {i < arr.length - 1 && (
                    <div className="w-px flex-1 bg-border my-2" />
                  )}
                </div>
                <div className={`pb-8 ${i === arr.length - 1 ? '' : ''}`}>
                  <p className="font-sans font-medium text-sm text-foreground mb-1">{item.title}</p>
                  <p className="font-sans text-sm text-muted-foreground leading-relaxed">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="border-t border-border/60 mb-14" />

        {/* FAQ */}
        <section>
          <h2 className="font-serif text-2xl text-foreground mb-8">Frequently Asked Questions</h2>
          <div className="space-y-8">
            {faqs.map((faq, i) => (
              <div key={i}>
                <h3 className="font-serif text-lg text-foreground mb-2">{faq.q}</h3>
                <p className="font-sans text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                {i < faqs.length - 1 && <div className="border-t border-border/40 mt-8" />}
              </div>
            ))}
          </div>
        </section>

        <div className="border-t border-border/60 mt-14 mb-8" />

        {/* Contact */}
        <div className="rounded-xl border border-border bg-secondary/40 p-5 space-y-1">
          <p className="font-sans font-semibold text-foreground text-sm">Questions?</p>
          <p className="font-sans text-sm text-muted-foreground">
            Email us at{' '}
            <a
              href="mailto:support@wistaar.com"
              className="text-foreground underline underline-offset-2 hover:text-accent transition-colors"
            >
              support@wistaar.com
            </a>{' '}
            and our team will get back to you within 24 hours.
          </p>
        </div>

        {/* Bottom links */}
        <div className="mt-10 flex flex-wrap gap-4 text-xs font-sans text-muted-foreground">
          <span>Also see:</span>
          <Link to="/terms" className="text-foreground underline underline-offset-2 hover:text-accent transition-colors">Terms of Service</Link>
          <Link to="/privacy" className="text-foreground underline underline-offset-2 hover:text-accent transition-colors">Privacy Policy</Link>
          <Link to="/copyright" className="text-foreground underline underline-offset-2 hover:text-accent transition-colors">Copyright &amp; DMCA</Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
