import type { Metadata } from 'next';
import Link from 'next/link';
import { Flame, ChevronRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'FAQ',
  description:
    'Answers to common questions about UnderFireAI — interview types, plans, voice mode, data privacy, and more.',
};

interface FaqItem {
  q: string;
  a: string;
}

interface FaqSection {
  title: string;
  items: FaqItem[];
}

const sections: FaqSection[] = [
  {
    title: 'Getting Started',
    items: [
      {
        q: 'What is UnderFireAI?',
        a: 'UnderFireAI is an AI-powered interview coaching platform. You practice mock interviews with AI interviewers that have unique, hidden personalities — skeptical, warm, detail-obsessed, big-picture — so every session feels different. After each interview you receive a detailed score breakdown, coaching feedback, and a full replay.',
      },
      {
        q: 'How is this different from practicing with ChatGPT?',
        a: 'UnderFireAI is purpose-built for interview prep. ChatGPT cannot offer hidden interviewer personalities that force adaptive thinking, real-time STAR method analysis, voice mode with natural conversation flow, performance tracking over time, or resume-aware question generation. It is the difference between a generic chatbot and a specialized training tool.',
      },
      {
        q: 'Do I need a credit card to sign up?',
        a: 'No. The Free plan requires no credit card. You get 3 full mock interviews at no cost. You only need a payment method when upgrading to Pro or Premium.',
      },
      {
        q: 'What do I get on the Free plan?',
        a: '3 mock interviews per month, all interview types (behavioral, technical, phone screen, HR, case study, panel), full session replay, and your score breakdown after each interview. No credit card required.',
      },
    ],
  },
  {
    title: 'Interview Types & Features',
    items: [
      {
        q: 'What interview types are supported?',
        a: 'Behavioral (STAR method), Technical (system design and conceptual), Coding Challenge (live code execution in 7 languages), Case Study, HR Screen, Panel (multiple interviewers simultaneously), and Phone Screen. All types are available on every plan.',
      },
      {
        q: 'What are hidden personalities and why do they matter?',
        a: "Each AI interviewer has a unique personality — skeptical, warm, detail-obsessed, big-picture — that you discover through the conversation, just like a real interview. This stops you from memorizing answers and forces you to actually listen, read cues, and adapt your communication style in real time. The personality is revealed in the post-session analysis.",
      },
      {
        q: 'How does voice mode work?',
        a: 'Speak naturally into your microphone and the AI interviewer responds in real time using speech synthesis, creating a conversational flow that simulates the pressure of a real phone or video interview. Voice mode is available on Pro and Premium plans.',
      },
      {
        q: 'How does the coding challenge work?',
        a: 'A coding problem is presented with example inputs and outputs. You write your solution in a live code editor, then run it against visible test cases. When you submit, your solution is evaluated against all test cases — including hidden ones — using Judge0 sandboxed execution. Supported languages: JavaScript, TypeScript, Python, Java, Go, Rust, and C++.',
      },
      {
        q: 'What is the Panel interview type?',
        a: 'Panel mode places you in front of multiple AI interviewers simultaneously — typically a technical interviewer, an HR representative, and a senior stakeholder. Each panelist has a distinct personality and area of focus. They take turns asking questions and reacting to your answers, closely simulating a real panel interview format.',
      },
      {
        q: 'What is the Salary Negotiation Simulator?',
        a: "A Premium feature where you practice negotiating a job offer against an AI recruiter who pushes back realistically. You are scored on confidence, framing, strategy, and composure — and you see what offer your technique would have likely closed. Available exclusively on the Premium plan.",
      },
    ],
  },
  {
    title: 'Resume & Job Targeting',
    items: [
      {
        q: 'What does uploading a resume do?',
        a: 'When you upload a resume, the AI interviewer uses it to ask targeted questions based on your actual experience — referencing specific roles, skills, and projects rather than asking generic questions. It also enables resume gap analysis and alignment scoring when you add a job description.',
      },
      {
        q: 'Can I prepare for a specific company?',
        a: 'Yes. Select your target company style — FAANG, startup, consulting, enterprise, finance, or government — and the AI adjusts its interview style, question types, and evaluation criteria to match. On Pro and Premium plans you can also upload a specific job description for gap analysis and alignment scoring.',
      },
      {
        q: 'What is Job Analysis and Gap Analysis?',
        a: 'Upload a job description and UnderFireAI compares it against your uploaded resume to identify skill gaps, highlight strong matches, and generate a targeted practice plan. This feature is available on Pro and Premium plans.',
      },
      {
        q: 'What resume file formats are supported?',
        a: 'PDF, DOCX, and TXT files are supported. Your resume is parsed and stored securely. You can upload a new resume at any time and it will be used for all future sessions.',
      },
    ],
  },
  {
    title: 'Plans & Billing',
    items: [
      {
        q: 'What are the plan differences?',
        a: 'Free gives you 3 interviews per month with full scoring and replay. Pro ($19/month) adds unlimited interviews, voice mode, resume targeting, job analysis, and custom interviewer creation. Premium ($39/month) adds everything in Pro plus the Salary Negotiation Simulator, panel interviews, priority processing, and advanced analytics.',
      },
      {
        q: 'Can I cancel my subscription at any time?',
        a: 'Yes. You can cancel at any time from your account settings. Your plan remains active until the end of the current billing period. After cancellation you revert to the Free plan — your interview history and data are retained.',
      },
      {
        q: 'Do you offer refunds?',
        a: 'Refunds are evaluated on a case-by-case basis. If you have a billing issue or believe you were charged in error, contact us at support@underfireai.com and we will review your situation promptly.',
      },
      {
        q: 'Is there a discount for annual billing?',
        a: 'Annual billing options are coming soon. If you are interested in an annual plan or have questions about pricing for teams, contact us at support@underfireai.com.',
      },
    ],
  },
  {
    title: 'Privacy & Data',
    items: [
      {
        q: 'Is my data secure?',
        a: 'Yes. All data is encrypted in transit and at rest. Row-level security policies ensure your interview data, resume, and personal information are isolated and cannot be accessed by other users. We do not sell or share your personal data with third parties.',
      },
      {
        q: 'Who can see my interview transcripts?',
        a: 'Only you. Interview transcripts, scores, and replay data are private to your account. We do not use your interview content to train AI models without explicit consent.',
      },
      {
        q: 'Can I delete my account and data?',
        a: 'Yes. You can permanently delete your account and all associated data from your account settings at any time. Deletion is immediate and irreversible.',
      },
      {
        q: 'Where is data stored?',
        a: 'Data is stored in the United States using Supabase (PostgreSQL) infrastructure. For more details, see our Privacy Policy.',
      },
    ],
  },
  {
    title: 'Technical',
    items: [
      {
        q: 'What browsers are supported?',
        a: 'UnderFireAI works in all modern browsers — Chrome, Firefox, Safari, and Edge. Voice mode requires microphone access and is supported in Chrome and Edge. For the best experience, use the latest version of Chrome.',
      },
      {
        q: 'Does voice mode work on mobile?',
        a: 'Voice mode is currently optimized for desktop browsers. The text-based interview experience works fully on mobile devices.',
      },
      {
        q: 'What happens if my connection drops mid-interview?',
        a: 'Interview sessions are saved continuously. If your connection drops, you can return to the session and resume from where you left off, or end the session and view the results for the messages that were completed.',
      },
    ],
  },
];

export default function FaqPage(): React.JSX.Element {
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
          <Link
            href="/#pricing"
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#8B5A2B] to-[#5D3A1A] text-white text-sm font-semibold hover:from-[#9A6B3C] hover:to-[#6B4420] transition-all"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Header */}
      <header className="px-6 py-20 text-center">
        <div className="max-w-2xl mx-auto">
          <p className="text-[#8B5A2B] font-bold tracking-widest text-sm mb-4 uppercase">
            Help Center
          </p>
          <h1 className="text-4xl lg:text-5xl font-bold text-[#3D3229] mb-5">
            Frequently Asked Questions
          </h1>
          <p className="text-lg text-[#6B5744] leading-relaxed">
            Everything you need to know about UnderFireAI. Can&apos;t find your answer?{' '}
            <a
              href="mailto:support@underfireai.com"
              className="text-[#8B5A2B] font-semibold hover:underline"
            >
              Email us
            </a>
            .
          </p>
        </div>
      </header>

      {/* FAQ Sections */}
      <main className="px-6 pb-28">
        <div className="max-w-3xl mx-auto space-y-16">
          {sections.map((section) => (
            <div key={section.title}>
              <h2 className="text-xl font-bold text-[#3D3229] mb-6 pb-3 border-b border-[#3D3229]/10">
                {section.title}
              </h2>
              <div className="space-y-4">
                {section.items.map((item) => (
                  <div
                    key={item.q}
                    className="p-6 rounded-xl bg-white border border-[#3D3229]/8 hover:border-[#8B5A2B]/25 transition-all"
                  >
                    <h3 className="font-bold text-base text-[#3D3229] mb-2">{item.q}</h3>
                    <p className="text-base text-[#6B5744] leading-relaxed">{item.a}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* CTA */}
      <section className="px-6 pb-24">
        <div className="max-w-3xl mx-auto text-center p-12 rounded-2xl bg-white border border-[#3D3229]/10 shadow-sm">
          <h2 className="text-2xl font-bold text-[#3D3229] mb-3">Ready to start practicing?</h2>
          <p className="text-[#6B5744] mb-8">
            3 free interviews — no credit card required.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-[#8B5A2B] to-[#5D3A1A] text-white font-bold hover:from-[#9A6B3C] hover:to-[#6B4420] transition-all shadow-lg shadow-[#8B5A2B]/20"
          >
            Start Free
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-10 border-t border-[#3D3229]/10 bg-white">
        <div className="max-w-3xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-[#8B7355]">
          <p>&copy; {new Date().getFullYear()} UnderFireAI. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/" className="hover:text-[#8B5A2B] transition-colors">Home</Link>
            <Link href="/privacy" className="hover:text-[#8B5A2B] transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-[#8B5A2B] transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
