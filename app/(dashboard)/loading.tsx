import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto" />
        <p className="text-slate-400 mt-4">Loading...</p>
      </div>
    </div>
  );
}
