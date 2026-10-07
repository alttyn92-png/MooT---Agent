export function discoverMessages(state, messages, now = Date.now()) {
  const seen = new Set(state.seen || []);
  let boundary = -1;
  messages.forEach((message, index) => { if (seen.has(message.id)) boundary = index; });
  // History was virtualized/replaced: rebase instead of replying to old messages.
  const resync = seen.size > 0 && messages.length > 0 && boundary < 0;
  const warmup = now < state.warmupUntil;
  const candidates = (resync || warmup ? [] : messages.slice(boundary + 1)).filter(message =>
    !seen.has(message.id) && !message.outgoing && message.text &&
    !(state.echoes || []).some(e => e.until > now && e.text.trim() === message.text.trim())
  );
  const fresh = candidates.slice(0, Math.max(0, 100 - (state.queue || []).length));
  const deferred = candidates[fresh.length];
  const checkpoint = deferred ? messages.slice(0, messages.findIndex(m => m.id === deferred.id)) : messages;
  return {
    seen: [...new Set([...(state.seen || []), ...checkpoint.map(m => m.id)])].slice(-1000),
    queue: [...(state.queue || []), ...fresh].slice(0, 100), resync,
  };
}

export function parseMonitorPlan(text, allowActions) {
  const plan = JSON.parse(String(text).replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
  if (!plan || !['wait', 'reply', 'action'].includes(plan.type)) throw new Error('Некорректный ответ модели мониторинга.');
  if (plan.type === 'reply' && (typeof plan.text !== 'string' || !plan.text.trim() || plan.text.length > 12000)) throw new Error('Некорректный текст ответа.');
  if (plan.type === 'action' && (!allowActions || !['click', 'type', 'scroll', 'focus'].includes(plan.action?.type))) throw new Error('Модель запросила недопустимое действие.');
  return plan;
}
