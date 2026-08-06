export type ChatMessage = {
  id: string;
  senderId: string;
  recipientId: string;
  text: string;
  createdAt: string;
};

const CHAT_STORAGE_KEY = "design-tests-chat-v1";
const CHAT_UPDATED_EVENT = "design-tests-chat-updated";

const readMessages = (): ChatMessage[] => {
  try {
    return JSON.parse(window.localStorage.getItem(CHAT_STORAGE_KEY) ?? "[]") as ChatMessage[];
  } catch {
    return [];
  }
};

const writeMessages = (messages: ChatMessage[]) => {
  window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
  window.dispatchEvent(new Event(CHAT_UPDATED_EVENT));
};

export const getConversation = (firstUserId: string, secondUserId: string) =>
  readMessages()
    .filter((message) =>
      (message.senderId === firstUserId && message.recipientId === secondUserId)
      || (message.senderId === secondUserId && message.recipientId === firstUserId))
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));

export const getLatestMessage = (firstUserId: string, secondUserId: string) =>
  getConversation(firstUserId, secondUserId).at(-1) ?? null;

export const sendMessage = (senderId: string, recipientId: string, text: string) => {
  const normalizedText = text.trim();
  if (!normalizedText) throw new Error("Сообщение не может быть пустым");
  if (normalizedText.length > 1000) throw new Error("Сообщение не должно превышать 1000 символов");
  if (senderId === recipientId) throw new Error("Нельзя отправить сообщение самому себе");

  const message: ChatMessage = {
    id: crypto.randomUUID(),
    senderId,
    recipientId,
    text: normalizedText,
    createdAt: new Date().toISOString(),
  };
  writeMessages([...readMessages(), message]);
  return message;
};

export const subscribeToMessages = (listener: () => void) => {
  const onStorage = (event: StorageEvent) => {
    if (event.key === CHAT_STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHAT_UPDATED_EVENT, listener);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHAT_UPDATED_EVENT, listener);
  };
};
