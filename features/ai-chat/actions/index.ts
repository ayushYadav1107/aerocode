"use server";

import { currentUser } from "@/features/auth/actions";
import { db } from "@/lib/db";

const MAX_SAVED_MESSAGES = 10;

export type StoredChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

export const getChatHistory = async (
  playgroundId: string,
): Promise<StoredChatMessage[]> => {
  const user = await currentUser();
  if (!user?.id || !playgroundId) return [];

  try {
    const messages = await db.chatMessage.findMany({
      where: { playgroundId, userId: user.id },
      orderBy: { createdAt: "desc" },
      take: MAX_SAVED_MESSAGES,
    });

    return messages.reverse().map((message) => ({
      id: message.id,
      role: message.role as "user" | "assistant",
      content: message.content,
      timestamp: message.createdAt,
    }));
  } catch (error) {
    console.error("getChatHistory error:", error);
    return [];
  }
};

export const saveChatMessage = async (
  playgroundId: string,
  role: "user" | "assistant",
  content: string,
) => {
  const user = await currentUser();
  if (!user?.id || !playgroundId || !content.trim()) return null;

  try {
    const saved = await db.chatMessage.create({
      data: { playgroundId, userId: user.id, role, content },
    });

    const stale = await db.chatMessage.findMany({
      where: { playgroundId, userId: user.id },
      orderBy: { createdAt: "desc" },
      skip: MAX_SAVED_MESSAGES,
      select: { id: true },
    });

    if (stale.length > 0) {
      await db.chatMessage.deleteMany({
        where: { id: { in: stale.map((message) => message.id) } },
      });
    }

    return saved.id;
  } catch (error) {
    console.error("saveChatMessage error:", error);
    return null;
  }
};

export const clearChatHistory = async (playgroundId: string) => {
  const user = await currentUser();
  if (!user?.id || !playgroundId) return;

  try {
    await db.chatMessage.deleteMany({
      where: { playgroundId, userId: user.id },
    });
  } catch (error) {
    console.error("clearChatHistory error:", error);
  }
};
