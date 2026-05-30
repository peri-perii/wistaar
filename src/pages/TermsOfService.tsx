import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Scale, Clock } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { useSEO } from '@/hooks/useSEO';

const sections = [
  { id: 'about',         number: '01', title: 'About Wistaar' },
  { id: 'accounts',     number: '02', title: 'Accounts & Registration' },
  { id: 'content',      number: '03', title: 'Author Submissions & Content' },
  { id: 'prohibited',   number: '04', title: 'Prohibited Content' },
  { id: 'payments',     number: '05', title: 'Purchases & Payments' },
  { id: 'refund',       number: '06', title: 'Refund Policy' },
  { id: 'availability', number: '07', title: 'Platform Access & Availability' },
  { id: 'liability',    number: '08', title: 'Limitation of Liability' },
  { id: 'changes',      number: '09', title: 'Changes to These Terms' },
  { id: 'law',          number: '10', title: 'Governing Law' },
  { id: 'contact',      number: '11', title: 'Contact Us' },
];

function SectionBadge({ number }: { number: string }) {
  return (
    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-foreground text-background text-xs font-sans font-medium flex-shrink-0 mt-0.5">
      {number}
    </span>
  );
}

export default function TermsOfService() {
  const [activeId, setActiveId] = useState('about');

  useSEO({
    title: 'Terms of Service',
    description: 'Read the Wistaar Terms of Service — our agreement with you covering accounts, author submissions, payments, and more.',
    canonicalPath: '/terms',
  });

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        });
      },
      { rootMargin: '-20% 0px -70% 0px' }
    );
    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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
                <Scale className="w-5 h-5 text-foreground/60" />
              </div>
              <div>
                <p className="text-xs font-sans font-medium text-accent uppercase tracking-widest mb-2">
                  Legal
                </p>
                <h1 className="font-serif text-4xl md:text-5xl text-foreground leading-tight mb-3">
                  Terms of Service
                </h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground font-sans">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Last updated: May 2026</span>
                  <span className="mx-1 text-border">·</span>
                  <span>~6 min read</span>
                </div>
                <p className="mt-4 max-w-xl text-muted-foreground text-sm leading-relaxed font-sans">
                  Please read these terms carefully before using Wistaar. By accessing or using our platform, you agree to be bound by the following terms and conditions.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Body: sidebar + content ──────────────────────────────── */}
      <div className="container-main py-16">
        <div className="flex gap-16 items-start">

          {/* Sticky TOC — desktop only */}
          <aside className="hidden lg:block w-56 flex-shrink-0 sticky top-24">
            <p className="text-xs font-sans font-medium text-muted-foreground uppercase tracking-widest mb-4">
              Contents
            </p>
            <nav className="space-y-1">
              {sections.map(({ id, number, title }) => (
                <button
                  key={id}
                  onClick={() => scrollTo(id)}
                  className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-sans transition-all duration-200 ${
                    activeId === id
                      ? 'text-foreground bg-foreground/5 font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'
                  }`}
                >
                  <span className={`text-[10px] font-mono flex-shrink-0 ${activeId === id ? 'text-accent' : 'text-muted-foreground/50'}`}>
                    {number}
                  </span>
                  <span className="truncate">{title}</span>
                </button>
              ))}
            </nav>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0">
            <div className="space-y-14">

              {/* 01 */}
              <section id="about" className="scroll-mt-28">
                <div className="flex items-start gap-4 mb-4">
                  <SectionBadge number="01" />
                  <h2 className="font-serif text-2xl text-foreground leading-snug">About Wistaar</h2>
                </div>
                <div className="ml-12 text-sm font-sans text-muted-foreground leading-relaxed space-y-3">
                  <p>
                    Wistaar is a digital reading platform that allows independent authors to publish their work and readers to discover and enjoy books. We are based in India and our services are primarily offered in Indian Rupees (₹).
                  </p>
                  <p>
                    By creating an account or using the platform in any way, you confirm that you have read, understood, and agree to these Terms of Service and our <Link to="/privacy" className="text-foreground underline underline-offset-2 hover:text-accent transition-colors">Privacy Policy</Link>.
                  </p>
                </div>
              </section>

              <div className="border-t border-border/60" />

              {/* 02 */}
              <section id="accounts" className="scroll-mt-28">
                <div className="flex items-start gap-4 mb-4">
                  <SectionBadge number="02" />
                  <h2 className="font-serif text-2xl text-foreground leading-snug">Accounts &amp; Registration</h2>
                </div>
                <ul className="ml-12 text-sm font-sans text-muted-foreground leading-relaxed space-y-2.5 list-none">
                  {[
                    'You must be at least 13 years old to create an account.',
                    'You are responsible for maintaining the confidentiality of your account credentials.',
                    'You must provide accurate, current, and complete information during registration.',
                    'You are solely responsible for all activity that occurs under your account.',
                    'We reserve the right to suspend or terminate accounts that violate these terms.',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <span className="mt-1.5 w-1 h-1 rounded-full bg-accent flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>

              <div className="border-t border-border/60" />

              {/* 03 */}
              <section id="content" className="scroll-mt-28">
                <div className="flex items-start gap-4 mb-4">
                  <SectionBadge number="03" />
                  <h2 className="font-serif text-2xl text-foreground leading-snug">Author Submissions &amp; Content</h2>
                </div>
                <ul className="ml-12 text-sm font-sans text-muted-foreground leading-relaxed space-y-2.5 list-none">
                  {[
                    'Authors retain full ownership of the intellectual property rights to content they submit.',
                    'By submitting free content, you grant Wistaar a non-exclusive, royalty-free license to host, display, and distribute your work. Paid content sales are subject to a 65% royalty payout to the author, with a 35% platform share retained by Wistaar.',
                    'You represent and warrant that you own or have the necessary rights to submit the content, and that it does not infringe any third-party rights.',
                    'All submissions are subject to review and approval by our admin team before publication.',
                    'Wistaar reserves the right to reject or remove any content that violates these terms, applicable law, or our content guidelines.',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <span className="mt-1.5 w-1 h-1 rounded-full bg-accent flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>

              <div className="border-t border-border/60" />

              {/* 04 */}
              <section id="prohibited" className="scroll-mt-28">
                <div className="flex items-start gap-4 mb-4">
                  <SectionBadge number="04" />
                  <h2 className="font-serif text-2xl text-foreground leading-snug">Prohibited Content</h2>
                </div>
                <div className="ml-12 text-sm font-sans text-muted-foreground leading-relaxed">
                  <p className="mb-3">The following content is strictly prohibited on Wistaar:</p>
                  <ul className="space-y-2.5 list-none">
                    {[
                      'Content that infringes any copyright, trademark, or other intellectual property rights.',
                      'Content that is defamatory, obscene, harassing, abusive, or hateful.',
                      'Content that promotes illegal activity.',
                      'Content that contains malware, viruses, or harmful code.',
                      'Unauthorized reproduction or distribution of copyrighted works.',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2.5">
                        <span className="mt-1.5 w-1 h-1 rounded-full bg-destructive flex-shrink-0 opacity-70" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              <div className="border-t border-border/60" />

              {/* 05 */}
              <section id="payments" className="scroll-mt-28">
                <div className="flex items-start gap-4 mb-4">
                  <SectionBadge number="05" />
                  <h2 className="font-serif text-2xl text-foreground leading-snug">Purchases &amp; Payments</h2>
                </div>
                <ul className="ml-12 text-sm font-sans text-muted-foreground leading-relaxed space-y-2.5 list-none">
                  {[
                    'All purchases are final. Please review the free preview chapters before purchasing a premium book.',
                    'Payment processing is handled by PayU. By making a purchase, you also agree to PayU\'s terms of service.',
                    'Prices are listed in Indian Rupees (₹) and include applicable taxes.',
                    'We reserve the right to change prices at any time. Price changes will not affect purchases already made.',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <span className="mt-1.5 w-1 h-1 rounded-full bg-accent flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                  <li className="flex items-start gap-2.5">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-accent flex-shrink-0" />
                    <span>
                      In case of a technical failure resulting in an incorrect charge, please contact us at{' '}
                      <a href="mailto:support@wistaar.com" className="text-foreground underline underline-offset-2 hover:text-accent transition-colors">
                        support@wistaar.com
                      </a>.
                    </span>
                  </li>
                </ul>
              </section>

              <div className="border-t border-border/60" />

              {/* 06 */}
              <section id="refund" className="scroll-mt-28">
                <div className="flex items-start gap-4 mb-4">
                  <SectionBadge number="06" />
                  <h2 className="font-serif text-2xl text-foreground leading-snug">Refund Policy</h2>
                </div>
                <div className="ml-12 text-sm font-sans text-muted-foreground leading-relaxed">
                  <p className="mb-3">Due to the digital nature of our products:</p>
                  <ul className="space-y-2.5 list-none">
                    <li className="flex items-start gap-2.5">
                      <span className="mt-1.5 w-1 h-1 rounded-full bg-accent flex-shrink-0" />
                      All sales of digital books are final and non-refundable once access has been granted.
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="mt-1.5 w-1 h-1 rounded-full bg-accent flex-shrink-0" />
                      <span>
                        If you experience a technical issue that prevents you from accessing a purchased book, contact us within 7 days at{' '}
                        <a href="mailto:support@wistaar.com" className="text-foreground underline underline-offset-2 hover:text-accent transition-colors">
                          support@wistaar.com
                        </a>{' '}
                        and we will resolve the issue or issue a refund at our discretion.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="mt-1.5 w-1 h-1 rounded-full bg-accent flex-shrink-0" />
                      Duplicate purchases made in error may be refunded within 48 hours of the purchase.
                    </li>
                  </ul>
                </div>
              </section>

              <div className="border-t border-border/60" />

              {/* 07 */}
              <section id="availability" className="scroll-mt-28">
                <div className="flex items-start gap-4 mb-4">
                  <SectionBadge number="07" />
                  <h2 className="font-serif text-2xl text-foreground leading-snug">Platform Access &amp; Availability</h2>
                </div>
                <ul className="ml-12 text-sm font-sans text-muted-foreground leading-relaxed space-y-2.5 list-none">
                  {[
                    'We strive to maintain platform availability but do not guarantee uninterrupted access.',
                    'We reserve the right to modify, suspend, or discontinue the platform at any time with reasonable notice.',
                    'We are not liable for any loss or damage resulting from platform downtime or disruptions.',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <span className="mt-1.5 w-1 h-1 rounded-full bg-accent flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>

              <div className="border-t border-border/60" />

              {/* 08 */}
              <section id="liability" className="scroll-mt-28">
                <div className="flex items-start gap-4 mb-4">
                  <SectionBadge number="08" />
                  <h2 className="font-serif text-2xl text-foreground leading-snug">Limitation of Liability</h2>
                </div>
                <div className="ml-12 text-sm font-sans text-muted-foreground leading-relaxed space-y-3">
                  <p>
                    To the maximum extent permitted by Indian law, Wistaar shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the platform or any content accessed through it.
                  </p>
                  <p>
                    Our total liability to you shall not exceed the amount you paid to us in the three months preceding the claim.
                  </p>
                </div>
              </section>

              <div className="border-t border-border/60" />

              {/* 09 */}
              <section id="changes" className="scroll-mt-28">
                <div className="flex items-start gap-4 mb-4">
                  <SectionBadge number="09" />
                  <h2 className="font-serif text-2xl text-foreground leading-snug">Changes to These Terms</h2>
                </div>
                <p className="ml-12 text-sm font-sans text-muted-foreground leading-relaxed">
                  We may update these terms from time to time. We will notify registered users of significant changes via email or an in-app notification. Continued use of the platform after changes constitutes acceptance of the new terms.
                </p>
              </section>

              <div className="border-t border-border/60" />

              {/* 10 */}
              <section id="law" className="scroll-mt-28">
                <div className="flex items-start gap-4 mb-4">
                  <SectionBadge number="10" />
                  <h2 className="font-serif text-2xl text-foreground leading-snug">Governing Law</h2>
                </div>
                <p className="ml-12 text-sm font-sans text-muted-foreground leading-relaxed">
                  These terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts of India.
                </p>
              </section>

              <div className="border-t border-border/60" />

              {/* 11 */}
              <section id="contact" className="scroll-mt-28">
                <div className="flex items-start gap-4 mb-4">
                  <SectionBadge number="11" />
                  <h2 className="font-serif text-2xl text-foreground leading-snug">Contact Us</h2>
                </div>
                <div className="ml-12 text-sm font-sans text-muted-foreground leading-relaxed space-y-4">
                  <p>If you have any questions about these Terms of Service, please reach out:</p>
                  <div className="rounded-xl border border-border bg-secondary/40 p-5 space-y-1">
                    <p className="font-sans font-semibold text-foreground text-sm">Wistaar</p>
                    <p>
                      Email:{' '}
                      <a href="mailto:support@wistaar.com" className="text-foreground underline underline-offset-2 hover:text-accent transition-colors">
                        support@wistaar.com
                      </a>
                    </p>
                    <p>
                      Privacy:{' '}
                      <a href="mailto:privacy@wistaar.com" className="text-foreground underline underline-offset-2 hover:text-accent transition-colors">
                        privacy@wistaar.com
                      </a>
                    </p>
                  </div>
                </div>
              </section>

            </div>

            {/* Bottom links */}
            <div className="mt-16 pt-8 border-t border-border flex flex-wrap gap-4 text-xs font-sans text-muted-foreground">
              <span>Also see:</span>
              <Link to="/privacy" className="text-foreground underline underline-offset-2 hover:text-accent transition-colors">Privacy Policy</Link>
              <Link to="/copyright" className="text-foreground underline underline-offset-2 hover:text-accent transition-colors">Copyright &amp; DMCA</Link>
              <Link to="/refund-policy" className="text-foreground underline underline-offset-2 hover:text-accent transition-colors">Refund Policy</Link>
            </div>
          </main>

        </div>
      </div>

      <Footer />
    </div>
  );
}
