import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pt-24 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="mb-10">
            <p className="text-sm text-muted-foreground mb-2">Last updated: April 2026</p>
            <h1 className="font-serif text-4xl text-foreground mb-4">Privacy Policy</h1>
            <p className="text-muted-foreground">
              Your privacy matters to us. This policy explains what data we collect, how we use it, and the choices you have.
            </p>
          </div>

          <div className="space-y-10 text-sm text-muted-foreground leading-relaxed">

            <section>
              <h2 className="font-serif text-xl text-foreground mb-3">1. Data We Collect</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-foreground font-medium mb-2">Information you provide to us</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Email address and name when you create an account.</li>
                    <li>Profile information such as display name and bio.</li>
                    <li>Book content, titles, and descriptions submitted by authors.</li>
                    <li>Payment details (processed and stored securely by PayU — we do not store your card or bank details).</li>
                    <li>Messages you send us via email or support channels.</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-foreground font-medium mb-2">Information collected automatically</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Reading progress, bookmarks, and highlights you create.</li>
                    <li>Books you have purchased or added to your wishlist.</li>
                    <li>Basic usage data such as pages visited and features used (via anonymised analytics).</li>
                    <li>Device information and IP address for security and fraud prevention.</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="font-serif text-xl text-foreground mb-3">2. How We Use Your Data</h2>
              <ul className="list-disc list-inside space-y-2">
                <li>To provide, maintain, and improve the Wistaar platform.</li>
                <li>To process purchases and manage your access to premium content.</li>
                <li>To send you transactional emails (purchase receipts, book approval notifications).</li>
                <li>To personalise your reading recommendations.</li>
                <li>To detect and prevent fraudulent activity or abuse.</li>
                <li>To comply with legal obligations.</li>
              </ul>
              <p className="mt-3">We do <strong className="text-foreground">not</strong> sell your personal data to third parties.</p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-foreground mb-3">3. Third-Party Services</h2>
              <p className="mb-3">We use the following trusted third-party services to operate Wistaar:</p>
              <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
                {[
                  { name: 'Supabase', purpose: 'Database, authentication, and file storage', link: 'https://supabase.com/privacy' },
                  { name: 'Vercel', purpose: 'Web hosting and serverless functions', link: 'https://vercel.com/legal/privacy-policy' },
                  { name: 'PayU India', purpose: 'Payment processing', link: 'https://payu.in/privacy-policy' },
                  { name: 'Google', purpose: 'Google Sign-In (optional authentication)', link: 'https://policies.google.com/privacy' },
                ].map((service) => (
                  <div key={service.name} className="flex items-start justify-between p-3 gap-4">
                    <div>
                      <p className="text-foreground font-medium">{service.name}</p>
                      <p>{service.purpose}</p>
                    </div>
                    <a href={service.link} target="_blank" rel="noopener noreferrer" className="text-foreground underline text-xs whitespace-nowrap">Privacy Policy ↗</a>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="font-serif text-xl text-foreground mb-3">4. Data Retention</h2>
              <ul className="list-disc list-inside space-y-2">
                <li>We retain your account data for as long as your account is active.</li>
                <li>Reading progress and bookmarks are retained until you delete them or your account.</li>
                <li>Purchase records are retained for 7 years to comply with tax and legal requirements, even after account deletion.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif text-xl text-foreground mb-3">5. Your Rights</h2>
              <p className="mb-3">Under applicable Indian data protection law, you have the right to:</p>
              <ul className="list-disc list-inside space-y-2">
                <li><strong className="text-foreground">Access</strong> — Request a copy of the personal data we hold about you.</li>
                <li><strong className="text-foreground">Correction</strong> — Request correction of inaccurate data.</li>
                <li><strong className="text-foreground">Deletion</strong> — Request deletion of your account and personal data (subject to legal retention requirements).</li>
                <li><strong className="text-foreground">Portability</strong> — Request your data in a portable format.</li>
              </ul>
              <p className="mt-3">To exercise these rights, email us at <a href="mailto:privacy@wistaar.com" className="text-foreground underline">privacy@wistaar.com</a>.</p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-foreground mb-3">6. Cookies</h2>
              <p>Wistaar uses essential cookies and local storage to maintain your login session and reading preferences. We do not use tracking cookies for advertising purposes. You can clear cookies via your browser settings at any time, though this will log you out of the platform.</p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-foreground mb-3">7. Children's Privacy</h2>
              <p>Wistaar is not directed at children under 13. We do not knowingly collect personal data from children under 13. If you believe a child has provided us with personal data, please contact us immediately.</p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-foreground mb-3">8. Changes to This Policy</h2>
              <p>We may update this Privacy Policy periodically. We will notify you of significant changes via email or in-app notification. The date at the top of this page indicates when the policy was last updated.</p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-foreground mb-3">9. Contact</h2>
              <p>For any privacy-related questions or requests:</p>
              <div className="mt-3 bg-muted/40 rounded-lg p-4 text-foreground">
                <p className="font-medium">Wistaar — Privacy Team</p>
                <p>Email: <a href="mailto:privacy@wistaar.com" className="underline">privacy@wistaar.com</a></p>
              </div>
            </section>

          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
