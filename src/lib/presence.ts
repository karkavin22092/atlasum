export const getPresence = (lastSeenAt?: string | null) => {
  if (!lastSeenAt) return { online: false, label: "Последняя активность неизвестна" };
  const timestamp = new Date(lastSeenAt).getTime();
  if (!Number.isFinite(timestamp)) return { online: false, label: "Последняя активность неизвестна" };

  const elapsed = Math.max(0, Date.now() - timestamp);
  if (elapsed < 90_000) return { online: true, label: "Сейчас онлайн" };

  const minutes = Math.max(1, Math.floor(elapsed / 60_000));
  if (minutes < 60) return { online: false, label: `Был(а) в сети ${minutes} мин. назад` };

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return { online: false, label: `Был(а) в сети ${hours} ч. назад` };

  const formatted = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
  return { online: false, label: `Был(а) в сети ${formatted}` };
};
