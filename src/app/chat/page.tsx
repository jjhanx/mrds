import { auth } from "@/auth";
import { Navbar } from "@/components/Navbar";
import { ChatRoom } from "@/components/chat/ChatRoom";

export default async function ChatPage() {
  const session = await auth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-stone-800 mb-6">채팅</h1>
        <ChatRoom currentUserId={session?.user?.id || ""} />
      </main>
    </div>
  );
}
