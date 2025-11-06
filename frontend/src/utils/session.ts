// Generate or retrieve session ID
export const getSessionId = (): string => {
  const SESSION_KEY = 'chat_session_id';

  let sessionId = sessionStorage.getItem(SESSION_KEY);

  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }

  return sessionId;
};

export const clearSession = (): void => {
  sessionStorage.removeItem('chat_session_id');
};
