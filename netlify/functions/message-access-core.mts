import { getStore } from "@netlify/blobs";

export type MessageAccessState = "pending" | "accepted" | "declined";
export type MessageAccessRecord = {
  userIds: [string, string];
  requests: Record<string, MessageAccessState>;
  blockedBy: string[];
  updatedAt: string;
};

export const accessStore = () => getStore({ name: "design-tests-message-access", consistency: "strong" });
export const cleanAccessUserId = (value: unknown) => String(value ?? "").trim().toLowerCase().replace(/[^a-zа-я0-9-]+/giu, "-").slice(0, 80);
export const accessKey = (first: string, second: string) => [first, second].sort((left, right) => left.localeCompare(right)).join("--");
export const loadAccess = async (first: string, second: string) => accessStore().get(accessKey(first, second), { type: "json", consistency: "strong" }) as Promise<MessageAccessRecord | null>;
export const saveAccess = (record: MessageAccessRecord) => accessStore().setJSON(accessKey(record.userIds[0], record.userIds[1]), record);
export const makeAccess = (first: string, second: string): MessageAccessRecord => ({
  userIds: [first, second].sort((left, right) => left.localeCompare(right)) as [string, string],
  requests: {},
  blockedBy: [],
  updatedAt: new Date().toISOString(),
});
