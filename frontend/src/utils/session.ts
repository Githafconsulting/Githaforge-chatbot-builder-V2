// Generate new session ID on every page load (fresh conversation)
export const getSessionId = (): string => {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  return sessionId;
};

export const clearSession = (): void => {
  sessionStorage.removeItem('chat_session_id');
};
