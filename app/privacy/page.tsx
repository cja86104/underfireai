import type { Metadata } from 'next';
import Link from 'next/link';
import { Flame } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for UnderFireAI — how we collect, use, and protect your data.',
};

const EFFECTIVE_DATE = 'February 26, 2026';
const CONTACT_EMAIL = 'support@underfireai.com';
const APP_URL = 'https://underfireai.com';

export default function PrivacyPage(): React.JSX.Element {
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
            <h1 className="text-4xl font-bold text-[#3D3229] mb-3">Privacy Policy</h1>
            <p className="text-[#8B7355]">Effective date: {EFFECTIVE_DATE}</p>
          </div>

          <div className="prose prose-stone max-w-none space-y-10 text-[#3D3229]">

            <section>
              <p className="text-[#6B5744] leading-relaxed">
                UnderFireAI (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) operates {APP_URL} and the UnderFireAI platform.
                This Privacy Policy explains what information we collect, how we use it, and your rights regarding that information.
                By using UnderFireAI, you agree to the practices described in this policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#3D3229] mb-4 pb-2 border-b border-[#3D3229]/10">1. Information We Collect</h2>

              <h3 className="font-bold text-[#3D3229] mb-2 mt-5">Account Information</h3>
              <p className="text-[#6B5744] leading-relaxed mb-4">
                When you register, we collect your email address and a hashed password. We do not store plaintext passwords.
                You may optionally provide your name.
              </p>

              <h3 className="font-bold text-[#3D3229] mb-2 mt-5">Resume Data</h3>
              <p className="text-[#6B5744] leading-relaxed mb-4">
                If you upload a resume, we store the file and extract structured data (skills, experience, education) to power
                resume-targeted interview features. Resume files and parsed data are associated with your account and not accessible
                to other users.
              </p>

              <h3 className="font-bold text-[#3D3229] mb-2 mt-5">Interview Data</h3>
              <p className="text-[#6B5744] leading-relaxed mb-4">
                We store the full content of your mock interview sessions, including messages, AI responses, performance scores,
                and analysis data. This data is used to power session replay, progress tracking, and coaching feedback.
              </p>

              <h3 className="font-bold text-[#3D3229] mb-2 mt-5">Job Descriptions</h3>
              <p className="text-[#6B5744] leading-relaxed mb-4">
                Job descriptions you upload for gap analysis are stored and associated with your account. They are used solely
                to generate analysis results and practice plans for you.
              </p>

              <h3 className="font-bold text-[#3D3229] mb-2 mt-5">Payment Information</h3>
              <p className="text-[#6B5744] leading-relaxed mb-4">
                We use Stripe to process payments. We do not store your credit card number, CVV, or full payment details on our
                servers. Stripe handles all payment processing and is PCI-DSS compliant. We receive and store your Stripe customer
                ID and subscription status.
              </p>

              <h3 className="font-bold text-[#3D3229] mb-2 mt-5">Usage Data</h3>
              <p className="text-[#6B5744] leading-relaxed">
                We collect basic usage data including session timestamps, interview counts, feature usage, and performance metrics.
                This data is used to improve the platform and is not sold to third parties.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#3D3229] mb-4 pb-2 border-b border-[#3D3229]/10">2. How We Use Your Information</h2>
              <ul className="space-y-2 text-[#6B5744] leading-relaxed list-none">
                {[
                  'To provide and operate the UnderFireAI platform and all its features.',
                  'To generate personalized interview questions, coaching feedback, and performance analysis.',
                  'To power session replay, progress tracking, and historical reporting.',
                  'To process subscription payments and manage your account.',
                  'To send transactional emails (account confirmation, billing receipts). We do not send marketing email without your consent.',
                  'To detect and prevent abuse, fraud, and unauthorized access.',
                  'To improve the platform based on aggregated, anonymized usage patterns.',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#8B5A2B] flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#3D3229] mb-4 pb-2 border-b border-[#3D3229]/10">3. Data Sharing</h2>
              <p className="text-[#6B5744] leading-relaxed mb-4">
                We do not sell your personal information. We do not share your interview transcripts, resume, or personal data with
                third parties for advertising or marketing purposes.
              </p>
              <p className="text-[#6B5744] leading-relaxed mb-4">
                We share data only with the following service providers who process it on our behalf:
              </p>
              <ul className="space-y-2 text-[#6B5744] leading-relaxed list-none mb-4">
                {[
                  'Supabase — database hosting and authentication (United States)',
                  'Stripe — payment processing',
                  'OpenRouter / DeepSeek — AI language model processing for interview generation and analysis',
                  'Cartesia — text-to-speech synthesis for voice mode',
                  'Judge0 (RapidAPI) — sandboxed code execution for coding challenges',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#8B5A2B] flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-[#6B5744] leading-relaxed">
                All service providers are contractually required to protect your data and use it only to provide their services.
                We may also disclose information if required by law or to protect the rights, safety, or property of UnderFireAI
                or its users.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#3D3229] mb-4 pb-2 border-b border-[#3D3229]/10">4. Data Security</h2>
              <p className="text-[#6B5744] leading-relaxed mb-4">
                All data is encrypted in transit using TLS and encrypted at rest. We use Row Level Security (RLS) policies at the
                database layer to ensure your data is isolated from other users — not just at the application level, but at the
                database level.
              </p>
              <p className="text-[#6B5744] leading-relaxed">
                No security system is perfect. If you believe your account has been compromised, contact us immediately at{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#8B5A2B] hover:underline">{CONTACT_EMAIL}</a>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#3D3229] mb-4 pb-2 border-b border-[#3D3229]/10">5. Data Retention</h2>
              <p className="text-[#6B5744] leading-relaxed mb-4">
                We retain your account data and interview history for as long as your account is active. If you delete your account,
                all associated data — interview sessions, messages, resume files, job descriptions, and account information — is
                permanently deleted within 30 days.
              </p>
              <p className="text-[#6B5744] leading-relaxed">
                Anonymized, aggregated usage statistics may be retained indefinitely for product analytics. These do not contain
                personally identifiable information.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#3D3229] mb-4 pb-2 border-b border-[#3D3229]/10">6. Your Rights</h2>
              <p className="text-[#6B5744] leading-relaxed mb-4">You have the right to:</p>
              <ul className="space-y-2 text-[#6B5744] leading-relaxed list-none mb-4">
                {[
                  'Access — request a copy of the personal data we hold about you.',
                  'Correction — request correction of inaccurate or incomplete data.',
                  'Deletion — delete your account and all associated data at any time from your account settings.',
                  'Portability — request an export of your interview history and profile data.',
                  'Objection — object to certain uses of your data as permitted by applicable law.',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#8B5A2B] flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-[#6B5744] leading-relaxed">
                To exercise any of these rights, contact us at{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#8B5A2B] hover:underline">{CONTACT_EMAIL}</a>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#3D3229] mb-4 pb-2 border-b border-[#3D3229]/10">7. Cookies</h2>
              <p className="text-[#6B5744] leading-relaxed">
                We use cookies and local storage only for authentication session management and user preferences. We do not use
                tracking cookies or third-party advertising cookies. You can clear cookies at any time through your browser settings,
                though this will sign you out.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#3D3229] mb-4 pb-2 border-b border-[#3D3229]/10">8. Children</h2>
              <p className="text-[#6B5744] leading-relaxed">
                UnderFireAI is not intended for users under 16 years of age. We do not knowingly collect personal information
                from children. If you believe a child has registered, contact us and we will delete the account immediately.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#3D3229] mb-4 pb-2 border-b border-[#3D3229]/10">9. Changes to This Policy</h2>
              <p className="text-[#6B5744] leading-relaxed">
                We may update this Privacy Policy from time to time. When we make material changes, we will update the effective
                date at the top of this page and, where appropriate, notify you by email. Continued use of UnderFireAI after
                changes are posted constitutes your acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#3D3229] mb-4 pb-2 border-b border-[#3D3229]/10">10. Contact</h2>
              <p className="text-[#6B5744] leading-relaxed">
                Questions or concerns about this Privacy Policy? Contact us at{' '}
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
            <Link href="/terms" className="hover:text-[#8B5A2B] transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
