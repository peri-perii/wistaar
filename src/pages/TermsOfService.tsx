import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pt-24 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="mb-10">
            <p className="text-sm text-muted-foreground mb-2">Last updated: April 2026</p>
            <h1 className="font-serif text-4xl text-foreground mb-4">Terms of Service</h1>
            <p className="text-muted-foreground">
              Please read these terms carefully before using Wistaar. By accessing or using our platform, you agree to be bound by these terms.
            </p>
          </div>

          <div className="space-y-10 text-sm text-muted-foreground leading-relaxed">

            <section>
              <h2 className="font-serif text-xl text-foreground mb-3">1. About Wistaar</h2>
              <p>Wistaar is a digital reading platform that allows independent authors to publish their work and readers to discover and enjoy books. We are based in India and our services are primarily offered in Indian Rupees (₹).</p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-foreground mb-3">2. Accounts & Registration</h2>
              <ul className="list-disc list-inside space-y-2">
                <li>You must be at least 13 years old to create an account.</li>
                <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
                <li>You must provide accurate, current, and complete information during registration.</li>
                <li>You are solely responsible for all activity that occurs under your account.</li>
                <li>We reserve the right to suspend or terminate accounts that violate these terms.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif text-xl text-foreground mb-3">3. Author Submissions & Content</h2>
              <ul className="list-disc list-inside space-y-2">
                <li>Authors retain full ownership of the intellectual property rights to content they submit.</li>
                <li>By submitting content, you grant Wistaar a non-exclusive, royalty-free license to host, display, and distribute your work on the platform.</li>
                <li>You represent and warrant that you own or have the necessary rights to submit the content, and that it does not infringe any third-party rights.</li>
                <li>All submissions are subject to review and approval by our admin team before publication.</li>
                <li>Wistaar reserves the right to reject or remove any content that violates these terms, applicable law, or our content guidelines.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif text-xl text-foreground mb-3">4. Prohibited Content</h2>
              <p className="mb-2">The following content is strictly prohibited on Wistaar:</p>
              <ul className="list-disc list-inside space-y-2">
                <li>Content that infringes any copyright, trademark, or other intellectual property rights.</li>
                <li>Content that is defamatory, obscene, harassing, abusive, or hateful.</li>
                <li>Content that promotes illegal activity.</li>
                <li>Content that contains malware, viruses, or harmful code.</li>
                <li>Unauthorized reproduction or distribution of copyrighted works.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif text-xl text-foreground mb-3">5. Purchases & Payments</h2>
              <ul className="list-disc list-inside space-y-2">
                <li>All purchases are final. Please review the free preview chapters before purchasing a premium book.</li>
                <li>Payment processing is handled by PayU. By making a purchase, you also agree to PayU's terms of service.</li>
                <li>Prices are listed in Indian Rupees (₹) and include applicable taxes.</li>
                <li>We reserve the right to change prices at any time. Price changes will not affect purchases already made.</li>
                <li>In case of a technical failure resulting in an incorrect charge, please contact us at <a href="mailto:support@wistaar.com" className="text-foreground underline">support@wistaar.com</a>.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif text-xl text-foreground mb-3">6. Refund Policy</h2>
              <p className="mb-2">Due to the digital nature of our products:</p>
              <ul className="list-disc list-inside space-y-2">
                <li>All sales of digital books are final and non-refundable once access has been granted.</li>
                <li>If you experience a technical issue that prevents you from accessing a purchased book, contact us within 7 days at <a href="mailto:support@wistaar.com" className="text-foreground underline">support@wistaar.com</a> and we will resolve the issue or issue a refund at our discretion.</li>
                <li>Duplicate purchases made in error may be refunded within 48 hours of the purchase.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif text-xl text-foreground mb-3">7. Platform Access & Availability</h2>
              <ul className="list-disc list-inside space-y-2">
                <li>We strive to maintain platform availability but do not guarantee uninterrupted access.</li>
                <li>We reserve the right to modify, suspend, or discontinue the platform at any time with reasonable notice.</li>
                <li>We are not liable for any loss or damage resulting from platform downtime or disruptions.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif text-xl text-foreground mb-3">8. Limitation of Liability</h2>
              <p>To the maximum extent permitted by Indian law, Wistaar shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the platform or any content accessed through it. Our total liability to you shall not exceed the amount you paid to us in the three months preceding the claim.</p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-foreground mb-3">9. Changes to These Terms</h2>
              <p>We may update these terms from time to time. We will notify registered users of significant changes via email or an in-app notification. Continued use of the platform after changes constitutes acceptance of the new terms.</p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-foreground mb-3">10. Governing Law</h2>
              <p>These terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts of India.</p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-foreground mb-3">11. Contact Us</h2>
              <p>If you have any questions about these Terms of Service, please contact us at:</p>
              <div className="mt-3 bg-muted/40 rounded-lg p-4 text-foreground">
                <p className="font-medium">Wistaar</p>
                <p>Email: <a href="mailto:support@wistaar.com" className="underline">support@wistaar.com</a></p>
              </div>
            </section>

          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
