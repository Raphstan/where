import type { Metadata } from "next";
import { ChatScreen } from "@/components/chat/chat-screen";

export const metadata: Metadata = { title: "Conversation" };

/* Écran de conversation (docs/prototype.html, scrChat). */
export default function ChatPage() {
  return <ChatScreen />;
}
