import type { Metadata } from 'next';
import Link from 'next/link';
import { Flame } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms of Service for UnderFireAI — the rules governing your use of the platform.',
};

const EFFECTIVE_DATE = 'February 26, 2026';
const CONTACT_EMAIL = 'support@underfireai.com';

export default function TermsPage(): React.JSX.Element {
  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#3D3229] antialiased">

      {/* Nav */}
      <nav className="sticky top-0 z-50 px-6 py-4 bg-[#FAF8F5]/90 backdrop-blur-xl border-b border-[#3D3229]/8">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="p-2 rounded-lg bg-gradient-to-br from-[#8B5A2B] to-[#5D3A1A]">
              <Flame className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-lg text-[#3D3229]">UnderFireAI</span>
          </Link>
        </div>
      </nav>

      {/* Content */}
      <main className="px-6 py-16 pb-28">
        <div className="max-w-3xl mx-auto">

          <div className="mb-12">
            <h1 className="text-4xl font-bold text-[#3D3229] mb-3">Terms of Service</h1>
            <p className="text-[#8B7355]">Effective date: {EFFECTIVE_DATE}</p>
          </div>

          <div className="prose prose-stone max-w-none space-y-10 text-[#3D3229]">

            <section>
              <p className="text-[#6B5744] leading-relaxed">
                These Terms of Service (&quot;Terms&quot;) govern your access to and use of UnderFireAI and all related services
                operated by Allen Code Co (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). By creating an account or using
                UnderFireAI, you agree to these Terms. If you do not agree, do not use the service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#3D3229] mb-4 pb-2 border-b border-[#3D3229]/10">1. Use of the Service</h2>

              <h3 className="font-bold text-[#3D3229] mb-2 mt-5">Eligibility</h3>
              <p className="text-[#6B5744] leading-relaxed mb-4">
                You must be at least 16 years old to use UnderFireAI. By using the service, you represent that you meet this
                requirement and that any information you provide is accurate.
              </p>

              <h3 className="font-bold text-[#3D3229] mb-2 mt-5">Account Responsibility</h3>
              <p className="text-[#6B5744] leading-relaxed mb-4">
                You are responsible for maintaining the security of your account credentials and for all activity that occurs
                under your account. Notify us immediately at{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#8B5A2B] hover:underline">{CONTACT_EMAIL}</a>{' '}
                if you suspect unauthorized access.
              </p>

              <h3 className="font-bold text-[#3D3229] mb-2 mt-5">Acceptable Use</h3>
              <p className="text-[#6B5744] leading-relaxed mb-2">You agree not to:</p>
              <ul className="space-y-2 text-[#6B5744] leading-relaxed list-none">
                {[
                  'Use the service for any unlawful purpose or in violation of these Terms.',
                  'Attempt to access, probe, or test the vulnerability of our systems without authorization.',
                  'Reverse engineer, decompile, or otherwise attempt to extract source code from the platform.',
                  'Use automated tools to scrape, crawl, or extract data from UnderFireAI.',
                  'Impersonate any person or entity or misrepresent your affiliation with any person or entity.',
                  'Upload content that is illegal, harmful, defamatory, or that infringes intellectual property rights.',
                  'Attempt to circumvent subscription restrictions or access features not included in your plan.',
                  'Share your account with others or resell access to the platform.',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#8B5A2B] flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#3D3229] mb-4 pb-2 border-b border-[#3D3229]/10">2. Subscriptions & Billing</h2>

              <h3 className="font-bold text-[#3D3229] mb-2 mt-5">Plans</h3>
              <p className="text-[#6B5744] leading-relaxed mb-4">
                UnderFireAI offers a Free plan and paid subscription plans (Pro and Premium). Plan features and prices are listed
                on our pricing page and may change with notice. Your continued use of a paid plan after a price change constitutes
                acceptance of the new price.
              </p>

              <h3 className="font-bold text-[#3D3229] mb-2 mt-5">Billing</h3>
              <p className="text-[#6B5744] leading-relaxed mb-4">
                Paid subscriptions are billed monthly in advance. By subscribing, you authorize us to charge your payment method
                on a recurring basis. All payments are processed by Stripe. We do not store your payment card details.
              </p>

              <h3 className="font-bold text-[#3D3229] mb-2 mt-5">Cancellation</h3>
              <p className="text-[#6B5744] leading-relaxed mb-4">
                You may cancel your subscription at any time from your account settings. Cancellation takes effect at the end of
                the current billing period. You will retain access to paid features through that date. We do not prorate
                cancellations for partial billing periods.
              </p>

              <h3 className="font-bold text-[#3D3229] mb-2 mt-5">Refunds</h3>
              <p className="text-[#6B5744] leading-relaxed">
                All purchases are generally non-refundable. Refunds may be considered on a case-by-case basis for documented
                billing errors or service failures. To request a review, contact{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#8B5A2B] hover:underline">{CONTACT_EMAIL}</a>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#3D3229] mb-4 pb-2 border-b border-[#3D3229]/10">3. Your Content</h2>
              <p className="text-[#6B5744] leading-relaxed mb-4">
                You retain ownership of content you upload to UnderFireAI — including resumes, job descriptions, and interview
                responses. By uploading content, you grant us a limited license to process, store, and use that content solely
                to provide the service to you.
              </p>
              <p className="text-[#6B5744] leading-relaxed">
                You are responsible for ensuring that any content you upload does not violate the rights of third parties,
                applicable law, or these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#3D3229] mb-4 pb-2 border-b border-[#3D3229]/10">4. AI-Generated Content</h2>
              <p className="text-[#6B5744] leading-relaxed mb-4">
                UnderFireAI uses AI to generate interview questions, responses, coaching feedback, and analysis. This content is
                generated automatically and may not always be accurate, current, or applicable to your specific situation.
              </p>
              <p className="text-[#6B5744] leading-relaxed">
                AI-generated coaching feedback is for practice and educational purposes only. It is not professional career
                advice, and we make no guarantees about interview outcomes based on use of the platform.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#3D3229] mb-4 pb-2 border-b border-[#3D3229]/10">5. Intellectual Property</h2>
              <p className="text-[#6B5744] leading-relaxed mb-4">
                UnderFireAI, its design, features, algorithms, and all platform content created by us are the intellectual
                property of Allen Code Co and are protected by applicable copyright, trademark, and other laws.
              </p>
              <p className="text-[#6B5744] leading-relaxed">
                You may not copy, reproduce, distribute, or create derivative works from any part of the platform without our
                express written permission.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#3D3229] mb-4 pb-2 border-b border-[#3D3229]/10">6. Service Availability</h2>
              <p className="text-[#6B5744] leading-relaxed mb-4">
                We strive to maintain high availability but do not guarantee uninterrupted access to UnderFireAI. We may suspend
                or modify the service for maintenance, updates, or circumstances beyond our control without liability.
              </p>
              <p className="text-[#6B5744] leading-relaxed">
                We reserve the right to modify, suspend, or discontinue any feature or the entire service at any time, with
                reasonable notice where practicable.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#3D3229] mb-4 pb-2 border-b border-[#3D3229]/10">7. Account Termination</h2>
              <p className="text-[#6B5744] leading-relaxed mb-4">
                You may delete your account at any time from your account settings, which will permanently erase your data.
              </p>
              <p className="text-[#6B5744] leading-relaxed">
                We may suspend or terminate your account if we determine you have violated these Terms, engaged in fraudulent
                activity, or pose a risk to the platform or other users. In cases of serious violations, termination may be
                immediate and without refund.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#3D3229] mb-4 pb-2 border-b border-[#3D3229]/10">8. Disclaimer of Warranties</h2>
              <p className="text-[#6B5744] leading-relaxed">
                UnderFireAI is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, either express
                or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose,
                or non-infringement. We do not warrant that the service will be error-free, uninterrupted, or that defects will
                be corrected.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#3D3229] mb-4 pb-2 border-b border-[#3D3229]/10">9. Limitation of Liability</h2>
              <p className="text-[#6B5744] leading-relaxed">
                To the fullest extent permitted by law, Allen Code Co and its operators shall not be liable for any indirect,
                incidental, special, consequential, or punitive damages arising from your use of UnderFireAI, including but not
                limited to loss of data, lost profits, or any damages resulting from AI-generated content or interview outcomes.
                Our total liability to you for any claim arising out of these Terms or your use of the service shall not exceed
                the amount you paid us in the three months preceding the claim.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#3D3229] mb-4 pb-2 border-b border-[#3D3229]/10">10. Governing Law</h2>
              <p className="text-[#6B5744] leading-relaxed">
                These Terms are governed by the laws of the Commonwealth of Virginia, United States, without regard to conflict
                of law principles. Any disputes arising under these Terms will be resolved in the state or federal courts located
                in Virginia, and you consent to personal jurisdiction in those courts.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#3D3229] mb-4 pb-2 border-b border-[#3D3229]/10">11. Changes to These Terms</h2>
              <p className="text-[#6B5744] leading-relaxed">
                We may update these Terms from time to time. When we make material changes, we will update the effective date
                and notify you by email where appropriate. Continued use of UnderFireAI after updated Terms are posted constitutes
                your acceptance of the changes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#3D3229] mb-4 pb-2 border-b border-[#3D3229]/10">12. Contact</h2>
              <p className="text-[#6B5744] leading-relaxed">
                Questions about these Terms? Contact us at{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#8B5A2B] hover:underline font-semibold">{CONTACT_EMAIL}</a>.
              </p>
            </section>

          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-10 border-t border-[#3D3229]/10 bg-white">
        <div className="max-w-3xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-[#8B7355]">
          <p>&copy; {new Date().getFullYear()} UnderFireAI. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/" className="hover:text-[#8B5A2B] transition-colors">Home</Link>
            <Link href="/faq" className="hover:text-[#8B5A2B] transition-colors">FAQ</Link>
            <Link href="/privacy" className="hover:text-[#8B5A2B] transition-colors">Privacy Policy</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
