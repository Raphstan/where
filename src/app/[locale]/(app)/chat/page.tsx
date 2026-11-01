import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ChatScreen } from "@/components/chat/chat-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("chat");
  return { title: t("metaTitle") };
}

/* Écran de conversation (docs/prototype.html, scrChat). */
export default function ChatPage() {
  return <ChatScreen />;
}
