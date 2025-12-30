import React from 'react';
import { useLocation } from 'react-router-dom';
import { ChatWidget } from './chat/ChatWidget';

// Pages where the chatbot should NOT appear
const EXCLUDED_ROUTES = [
  '/login',
  '/signup',
  '/super-admin-login',
  '/onboarding',
  '/oauth/callback',
  '/embed',
  '/chatbot-test',
];

// Route prefixes where the chatbot should NOT appear
const EXCLUDED_PREFIXES = [
  '/admin',
  '/super-admin',
];

export const GlobalChatWidget: React.FC = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  // Check if current route is in excluded list
  const isExcludedRoute = EXCLUDED_ROUTES.includes(currentPath);

  // Check if current route starts with any excluded prefix
  const isExcludedPrefix = EXCLUDED_PREFIXES.some(prefix =>
    currentPath.startsWith(prefix)
  );

  // Don't render chatbot on excluded pages
  if (isExcludedRoute || isExcludedPrefix) {
    return null;
  }

  return <ChatWidget />;
};