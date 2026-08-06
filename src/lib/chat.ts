export type ChatMessage = {
  id: string;
  senderId: string;
  recipientId: string;
  text: string;
  createdAt: string;
};

const CHAT_STORAGE_KEY = "design-tests-chat-v1";

const readMessages = (): ChatMessage[] => {
  try {
    return JSON.parse(window.localStorage.getItem(CHAT_STORAGE_KEY) ?? "[]") as ChatMessage[];
  } catch {
    return [];
  }
};

const writeMessages = (messages: ChatMessage[]) => {
  window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
};

const isConversationMessage = (message: ChatMessage, firstUserId: string, secondUserId: string) =>
  (message.senderId === firstUserId && message.recipientId === secondUserId)
  || (message.senderId === secondUserId && message.recipientId === firstUserId);

const getLocalConversation = (firstUserId: string, secondUserId: string) =>
  readMessages()
    .filter((message) => isConversationMessage(message, firstUserId, secondUserId))
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));

const replaceLocalConversation = (firstUserId: string, secondUserId: string, messages: ChatMessage[]) => {
  const otherMessages = readMessages().filter((message) => !isConversationMessage(message, firstUserId, secondUserId));
  writeMessages([...otherMessages, ...messages]);
};

export const getConversation = async (firstUserId: string, secondUserId: string) => {
  try {
    const query = new URLSearchParams({ firstUserId, secondUserId });
    const response = await fetch(`/.netlify/functions/messages?${query.toString()}`);
    if (!response.ok) throw new Error(await response.text());
    const messages = await response.json() as ChatMessage[];
    replaceLocalConversation(firstUserId, secondUserId, messages);
    return messages;
  } catch (error) {
    if (!import.meta.env.PROD) return getLocalConversation(firstUserId, secondUserId);
    throw new Error("Не удалось получить сообщения. Обновите страницу через несколько секунд.", { cause: error });
  }
};

export const getLatestMessage = (firstUserId: string, secondUserId: string) =>
  getLocalConversation(firstUserId, secondUserId).at(-1) ?? null;

export const sendMessage = async (senderId: string, recipientId: string, text: string) => {
  const normalizedText = text.trim();
  if (!normalizedText) throw new Error("Сообщение не может быть пустым");
  if (normalizedText.length > 1000) throw new Error("Сообщение не должно превышать 1000 символов");
  if (senderId === recipientId) throw new Error("Нельзя отправить сообщение самому себе");

  const localMessage: ChatMessage = {
    id: crypto.randomUUID(),
    senderId,
    recipientId,
    text: normalizedText,
    createdAt: new Date().toISOString(),
  };
  try {
    const response = await fetch("/.netlify/functions/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(localMessage),
    });
    if (!response.ok) throw new Error(await response.text());
    const message = await response.json() as ChatMessage;
    writeMessages([...readMessages().filter((item) => item.id !== message.id), message]);
    return message;
  } catch (error) {
    if (import.meta.env.PROD) {
      throw new Error("Сообщение не отправлено. Убедитесь, что оба аккаунта появились в рейтинге.", { cause: error });
    }
    writeMessages([...readMessages(), localMessage]);
    return localMessage;
  }
};
