import { Suspense } from "react";
import { Navbar } from "@/components/Navbar";
import { SheetMusicForm } from "@/components/sheet-music/SheetMusicForm";

function FormFallback() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-10 bg-stone-100 rounded" />
      <div className="h-10 bg-stone-100 rounded" />
      <div className="h-24 bg-stone-100 rounded" />
    </div>
  );
}

export default function NewSheetMusicPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-stone-800 mb-6">악보 등록</h1>
        <Suspense fallback={<FormFallback />}>
          <SheetMusicForm />
        </Suspense>
      </main>
    </div>
  );
}
