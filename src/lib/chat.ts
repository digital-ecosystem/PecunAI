import { Role } from "@/types"
import { prisma } from "./prisma"


// ✅ Save user/assistant message
export async function saveChatMessage(
  role: Role,
  content: string,
  threadId: string,
  index: number = 0
) {
  try {
    // Find session first (to get session's primary key ID)
    const message = await prisma.message.create({
      data: {
        threadId: threadId,
        role,
        content,
        index,
      }
    })

    return message
  } catch (error) {
    console.error('Error saving message:', error)
    throw error
  }
}

// ✅ Get all messages by thread ID
export async function getChatMessages(threadId: string) {
  try {
    return await prisma.message.findMany({
      where: { threadId: threadId },
      orderBy: [{ index: 'asc' }, { createdAt: 'asc' }],
    })
  } catch (error) {
    console.error('Error fetching messages:', error)
    throw error
  }
}
