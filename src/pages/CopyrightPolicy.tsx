import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { AlertTriangle, Mail, FileText } from 'lucide-react';

export default function CopyrightPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pt-24 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="mb-10">
            <p className="text-sm text-muted-foreground mb-2">Last updated: April 2026</p>
            <h1 className="font-serif text-4xl text-foreground mb-4">Copyright & DMCA Policy</h1>
            <p className="text-muted-foreground">
              Wistaar respects intellectual property rights and expects all users to do the same. This page explains how we handle copyright concerns and how to file a takedown notice.
            </p>
          </div>

          <div className="space-y-10 text-sm text-muted-foreground leading-relaxed">

            <section>
              <h2 className="font-serif text-xl text-foreground mb-3">Our Commitment to Copyright</h2>
              <p>All books published on Wistaar must be original works authored by the person submitting them, or content for which the submitter holds the appropriate distribution rights. Every submission undergoes manual review by our admin team before it is made available to readers.</p>
              <p className="mt-3">Despite these measures, we recognise that copyright infringement can occur. We take all legitimate claims seriously and act promptly to investigate and resolve them.</p>
            </section>

            <section>
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-5 flex gap-4">
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-foreground font-medium mb-1">Think your work has been copied?</p>
                  <p>If you believe that content on Wistaar infringes your copyright, please send a DMCA takedown notice to <a href="mailto:copyright@wistaar.com" className="text-foreground underline font-medium">copyright@wistaar.com</a>. We aim to respond within <strong className="text-foreground">48 hours</strong>.</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="font-serif text-xl text-foreground mb-3">How to File a DMCA Takedown Notice</h2>
              <p className="mb-4">To submit a valid copyright infringement notice under the Digital Millennium Copyright Act (DMCA), your email must include all of the following:</p>

              <div className="space-y-3">
                {[
                  {
                    num: '1',
                    title: 'Identification of the copyrighted work',
                    body: 'A clear description of the original work you claim has been infringed. If you are reporting multiple works, please list each one.'
                  },
                  {
                    num: '2',
                    title: 'Identification of the infringing material',
                    body: 'The URL(s) of the specific page(s) on Wistaar where the allegedly infringing content can be found. Example: https://wistaar.com/book/abc123'
                  },
                  {
                    num: '3',
                    title: 'Your contact information',
                    body: 'Your full legal name, mailing address, telephone number, and email address.'
                  },
                  {
                    num: '4',
                    title: 'A statement of good faith',
                    body: 'A statement that you have a good faith belief that the disputed use is not authorized by the copyright owner, its agent, or the law.'
                  },
                  {
                    num: '5',
                    title: 'A statement of accuracy',
                    body: 'A statement made under penalty of perjury that the information in your notice is accurate and that you are the copyright owner (or authorized to act on their behalf).'
                  },
                  {
                    num: '6',
                    title: 'Your electronic or physical signature',
                    body: 'Type your full legal name at the bottom of the email as your electronic signature.'
                  },
                ].map((item) => (
                  <div key={item.num} className="flex gap-4 p-4 rounded-lg border border-border bg-muted/20">
                    <span className="text-foreground font-bold font-serif text-lg shrink-0 w-6">{item.num}.</span>
                    <div>
                      <p className="text-foreground font-medium mb-1">{item.title}</p>
                      <p>{item.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="font-serif text-xl text-foreground mb-3">What Happens After You File</h2>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-accent/20 text-foreground text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</div>
                  <div>
                    <p className="text-foreground font-medium">Review (within 48 hours)</p>
                    <p>Our team reviews your notice to verify it contains all required elements and appears to be a genuine claim.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-accent/20 text-foreground text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</div>
                  <div>
                    <p className="text-foreground font-medium">Takedown (if notice is valid)</p>
                    <p>If the notice is valid, we will immediately suspend access to the identified content and notify the content author.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-accent/20 text-foreground text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</div>
                  <div>
                    <p className="text-foreground font-medium">Counter-notice (optional)</p>
                    <p>The accused author has the right to file a counter-notice if they believe the takedown was erroneous. You will be notified if a counter-notice is received.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-accent/20 text-foreground text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">4</div>
                  <div>
                    <p className="text-foreground font-medium">Resolution</p>
                    <p>Content remains suspended unless a valid counter-notice is received. Repeat infringers will have their accounts permanently terminated.</p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="font-serif text-xl text-foreground mb-3">Counter-Notice Procedure</h2>
              <p>If your content was removed and you believe this was a mistake, you may file a counter-notice with the following information sent to <a href="mailto:copyright@wistaar.com" className="text-foreground underline">copyright@wistaar.com</a>:</p>
              <ul className="list-disc list-inside space-y-2 mt-3">
                <li>Identification of the material that was removed and its original location.</li>
                <li>A statement under penalty of perjury that you have a good faith belief the material was removed by mistake.</li>
                <li>Your full name, address, phone number, and email.</li>
                <li>A statement consenting to the jurisdiction of the Indian courts.</li>
                <li>Your electronic signature (your full name).</li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif text-xl text-foreground mb-3">Repeat Infringer Policy</h2>
              <p>Wistaar maintains a strict repeat infringer policy. Authors whose content is found to infringe copyright on multiple occasions will have their accounts permanently terminated and will be permanently barred from the platform.</p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-foreground mb-3">False Claims Warning</h2>
              <p>Submitting a false DMCA takedown notice is a serious legal matter. Under applicable law, any person who knowingly makes material misrepresentations in a DMCA notification may be liable for damages, including costs and attorneys' fees.</p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-foreground mb-3">Contact</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <a href="mailto:copyright@wistaar.com" className="flex items-center gap-3 bg-muted/40 rounded-lg p-4 hover:bg-muted/60 transition-colors group">
                  <Mail className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  <div>
                    <p className="text-foreground font-medium text-sm">DMCA & Copyright</p>
                    <p className="text-muted-foreground text-xs">copyright@wistaar.com</p>
                  </div>
                </a>
                <a href="mailto:support@wistaar.com" className="flex items-center gap-3 bg-muted/40 rounded-lg p-4 hover:bg-muted/60 transition-colors group">
                  <FileText className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  <div>
                    <p className="text-foreground font-medium text-sm">General Support</p>
                    <p className="text-muted-foreground text-xs">support@wistaar.com</p>
                  </div>
                </a>
              </div>
            </section>

          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
