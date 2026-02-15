import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { FileText, Upload, CheckCircle, Briefcase, GraduationCap } from 'lucide-react';
import { getCurrentUser, getUserResume } from '@/lib/supabase/server';
import { ResumeUploadForm } from '@/components/resume/resume-upload-form';
import { format } from 'date-fns';

export const metadata: Metadata = {
  title: 'Resume',
  description: 'Upload and manage your resume for personalized interview questions.',
};

export default async function ResumePage(): Promise<React.JSX.Element> {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const resume = await getUserResume();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Your Resume</h1>
        <p className="text-slate-400 mt-1">
          Upload your resume for personalized interview questions
        </p>
      </div>

      {/* Info Card */}
      <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-blue-500/20 p-2">
            <FileText className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <h3 className="font-medium text-white">Why upload your resume?</h3>
            <p className="text-sm text-slate-300 mt-1">
              Interviewers will ask questions specific to your experience: 
              &ldquo;Tell me about that project at {'{'}Company X{'}'}&rdquo; or 
              &ldquo;How did you use {'{'}Skill Y{'}'} in your role?&rdquo;
            </p>
          </div>
        </div>
      </div>

      {resume ? (
        /* Resume Exists - Show Details */
        <div className="space-y-6">
          {/* Status Card */}
          <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium text-white">Resume uploaded</p>
                <p className="text-sm text-slate-400">
                  Last updated {format(new Date(resume.uploaded_at), 'MMMM d, yyyy')}
                </p>
              </div>
            </div>
          </div>

          {/* Parsed Data Preview */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
            <div className="p-5 border-b border-slate-800">
              <h2 className="text-lg font-semibold text-white">Extracted Information</h2>
              <p className="text-sm text-slate-400 mt-1">
                This is what interviewers will use to personalize questions
              </p>
            </div>

            <div className="p-5 space-y-6">
              {/* Target Info */}
              {(resume.target_role != null || resume.experience_years != null) && (
                <div>
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Target</h3>
                  <div className="flex flex-wrap gap-2">
                    {resume.target_role && (
                      <span className="rounded-full bg-orange-500/20 px-3 py-1 text-sm text-orange-400">
                        {resume.target_role}
                      </span>
                    )}
                    {resume.experience_years && (
                      <span className="rounded-full bg-slate-700 px-3 py-1 text-sm text-slate-300">
                        {resume.experience_years} years experience
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Skills */}
              {resume.skills && resume.skills.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {resume.skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Experience */}
              {resume.parsed_data?.experience && resume.parsed_data.experience.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Experience
                  </h3>
                  <div className="space-y-3">
                    {resume.parsed_data.experience.slice(0, 3).map((exp) => (
                      <div key={`${exp.title}-${exp.company}`} className="rounded-lg bg-slate-800/50 p-3">
                        <p className="font-medium text-white">{exp.title}</p>
                        <p className="text-sm text-slate-400">{exp.company}</p>
                        {exp.start_date && (
                          <p className="text-xs text-slate-500 mt-1">
                            {exp.start_date} — {exp.end_date ?? 'Present'}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Education */}
              {resume.parsed_data?.education && resume.parsed_data.education.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />
                    Education
                  </h3>
                  <div className="space-y-3">
                    {resume.parsed_data.education.map((edu) => (
                      <div key={`${edu.degree}-${edu.institution}`} className="rounded-lg bg-slate-800/50 p-3">
                        <p className="font-medium text-white">{edu.degree} in {edu.field}</p>
                        <p className="text-sm text-slate-400">{edu.institution}</p>
                        {edu.graduation_date && (
                          <p className="text-xs text-slate-500 mt-1">{edu.graduation_date}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Replace Resume */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
            <h3 className="font-medium text-white mb-3">Update Resume</h3>
            <ResumeUploadForm existingResumeId={resume.id} />
          </div>
        </div>
      ) : (
        /* No Resume - Show Upload Form */
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center rounded-full bg-slate-800 p-4 mb-4">
              <Upload className="h-8 w-8 text-slate-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Upload Your Resume</h2>
            <p className="text-slate-400 mt-1">
              PDF or text file, max 5MB
            </p>
          </div>
          <ResumeUploadForm />
        </div>
      )}
    </div>
  );
}
