import { Navbar } from "@/components/Navbar";
import { SheetMusicForm } from "@/components/sheet-music/SheetMusicForm";

export default function NewSheetMusicPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-stone-800 mb-6">악보 등록</h1>
        <SheetMusicForm />
      </main>
    </div>
  );
}
