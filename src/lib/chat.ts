import { isDeletedAccountName } from "./deleted-accounts";

export type ChatMessage = {
  id: string;
  senderId: string;
  recipientId: string;
  text: string;
  createdAt: string;
  deliveredAt?: string;
  readAt?: string;
  clientStatus?: "sending" | "failed";
  reactions?: Record<string, string[]>;
};

export const REACTION_EMOJIS = ["👍", "❤️", "😂", "🔥", "👏", "🤔"] as const;
export const MESSAGE_EMOJIS = ["😀", "😊", "😂", "😍", "🤓", "😎", "🤔", "👍", "👏", "🔥", "❤️", "🎉", "💡", "✅", "🚀", "💯"] as const;

const CHAT_STORAGE_KEY = "design-tests-chat-v1";
const CHAT_READ_STORAGE_KEY = "design-tests-chat-read-v1";

type ReadState = Record<string, Record<string, string>>;

const readState = (): ReadState => {
  try {
    return JSON.parse(window.localStorage.getItem(CHAT_READ_STORAGE_KEY) ?? "{}") as ReadState;
  } catch {
    return {};
  }
};

const readMessages = (): ChatMessage[] => {
  try {
    const stored = JSON.parse(window.localStorage.getItem(CHAT_STORAGE_KEY) ?? "[]") as ChatMessage[];
    const messages = stored.filter((message) => !isDeletedAccountName(message.senderId) && !isDeletedAccountName(message.recipientId));
    if (messages.length !== stored.length) window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    return messages;
  } catch {
    return [];
  }
};

const writeMessages = (messages: ChatMessage[]) => {
  window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
};

const replaceLocalMessage = (message: ChatMessage) => {
  writeMessages([...readMessages().filter((item) => item.id !== message.id), message]);
};

const isConversationMessage = (message: ChatMessage, firstUserId: string, secondUserId: string) =>
  (message.senderId === firstUserId && message.recipientId === secondUserId)
  || (message.senderId === secondUserId && message.recipientId === firstUserId);

const getLocalConversation = (firstUserId: string, secondUserId: string) =>
  readMessages()
    .filter((message) => isConversationMessage(message, firstUserId, secondUserId))
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));

const replaceLocalConversation = (firstUserId: string, secondUserId: string, messages: ChatMessage[]) => {
  const storedMessages = readMessages();
  const otherMessages = storedMessages.filter((message) => !isConversationMessage(message, firstUserId, secondUserId));
  const pendingMessages = storedMessages.filter((message) =>
    isConversationMessage(message, firstUserId, secondUserId)
    && Boolean(message.clientStatus)
    && !messages.some((stored) => stored.id === message.id));
  writeMessages([...otherMessages, ...messages, ...pendingMessages]);
};

export const getConversation = async (firstUserId: string, secondUserId: string) => {
  try {
    const query = new URLSearchParams({ firstUserId, secondUserId, viewerId: firstUserId });
    const response = await fetch(`/.netlify/functions/messages?${query.toString()}`);
    if (!response.ok) throw new Error(await response.text());
    const messages = await response.json() as ChatMessage[];
    replaceLocalConversation(firstUserId, secondUserId, messages);
    return getLocalConversation(firstUserId, secondUserId);
  } catch (error) {
    if (!import.meta.env.PROD) return getLocalConversation(firstUserId, secondUserId);
    throw new Error("Не удалось получить сообщения. Обновите страницу через несколько секунд.", { cause: error });
  }
};

export const getLatestMessage = (firstUserId: string, secondUserId: string) =>
  getLocalConversation(firstUserId, secondUserId).at(-1) ?? null;

export const markConversationRead = (userId: string, contactId: string, messages: ChatMessage[]) => {
  const readAt = new Date().toISOString();
  const updatedMessages = messages.map((message) =>
    message.senderId === contactId && message.recipientId === userId && !message.readAt
      ? { ...message, readAt }
      : message);
  replaceLocalConversation(userId, contactId, updatedMessages);
  const latestIncoming = messages.filter((message) => message.senderId === contactId && message.recipientId === userId).at(-1);
  const state = readState();
  state[userId] = { ...(state[userId] ?? {}), [contactId]: latestIncoming?.createdAt ?? new Date().toISOString() };
  window.localStorage.setItem(CHAT_READ_STORAGE_KEY, JSON.stringify(state));
  return updatedMessages;
};

export const getUnreadMessageSummary = async (userId: string) => {
  try {
    let incoming: ChatMessage[];
    if (import.meta.env.PROD) {
      const query = new URLSearchParams({ userId });
      const response = await fetch(`/.netlify/functions/messages?${query.toString()}`);
      if (!response.ok) throw new Error(await response.text());
      incoming = await response.json() as ChatMessage[];
    } else {
      incoming = readMessages().filter((message) => message.recipientId === userId);
    }
    const state = readState()[userId] ?? {};
    const unread = incoming.filter((message) => message.createdAt > (state[message.senderId] ?? ""));
    return { count: unread.length, senderIds: [...new Set(unread.map((message) => message.senderId))] };
  } catch {
    return { count: 0, senderIds: [] as string[] };
  }
};

export const createPendingMessage = (senderId: string, recipientId: string, text: string): ChatMessage => {
  const message: ChatMessage = {
    id: crypto.randomUUID(),
    senderId,
    recipientId,
    text: text.trim(),
    createdAt: new Date().toISOString(),
    clientStatus: "sending",
    reactions: {},
  };
  replaceLocalMessage(message);
  return message;
};

export const sendMessage = async (senderId: string, recipientId: string, text: string, pending?: ChatMessage) => {
  const normalizedText = text.trim();
  if (!normalizedText) throw new Error("Сообщение не может быть пустым");
  if (normalizedText.length > 1000) throw new Error("Сообщение не должно превышать 1000 символов");
  if (senderId === recipientId) throw new Error("Нельзя отправить сообщение самому себе");

  const localMessage = pending ?? createPendingMessage(senderId, recipientId, normalizedText);
  replaceLocalMessage({ ...localMessage, clientStatus: "sending" });
  try {
    const response = await fetch("/.netlify/functions/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...localMessage, text: normalizedText, clientStatus: undefined }),
    });
    if (!response.ok) throw new Error(await response.text());
    const message = await response.json() as ChatMessage;
    writeMessages([...readMessages().filter((item) => item.id !== message.id), message]);
    return message;
  } catch (error) {
    if (import.meta.env.PROD) {
      replaceLocalMessage({ ...localMessage, clientStatus: "failed" });
      throw new Error("Сообщение не отправлено. Убедитесь, что оба аккаунта появились в рейтинге.", { cause: error });
    }
    const deliveredMessage = { ...localMessage, text: normalizedText, clientStatus: undefined, deliveredAt: new Date().toISOString() };
    writeMessages([...readMessages().filter((item) => item.id !== deliveredMessage.id), deliveredMessage]);
    return deliveredMessage;
  }
};

export const toggleMessageReaction = async (message: ChatMessage, userId: string, emoji: string) => {
  if (!REACTION_EMOJIS.includes(emoji as typeof REACTION_EMOJIS[number])) throw new Error("Эта реакция недоступна");
  try {
    if (import.meta.env.PROD) {
      const response = await fetch("/.netlify/functions/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...message, userId, emoji }),
      });
      if (!response.ok) throw new Error(await response.text());
      const updated = await response.json() as ChatMessage;
      replaceLocalMessage(updated);
      return updated;
    }

    const reactions = { ...(message.reactions ?? {}) };
    const users = new Set(reactions[emoji] ?? []);
    if (users.has(userId)) users.delete(userId);
    else users.add(userId);
    if (users.size) reactions[emoji] = [...users];
    else delete reactions[emoji];
    const updated = { ...message, reactions };
    replaceLocalMessage(updated);
    return updated;
  } catch (error) {
    throw new Error("Не удалось изменить реакцию. Попробуйте ещё раз.", { cause: error });
  }
};
