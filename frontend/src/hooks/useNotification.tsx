import { useState } from 'react';

export type NotificationSeverity = 'success' | 'error' | 'warning' | 'info';

interface Notification {
  open: boolean;
  message: string;
  severity: NotificationSeverity;
}

export const useNotification = () => {
  const [notification, setNotification] = useState<Notification>({
    open: false,
    message: '',
    severity: 'info',
  });

  const showNotification = (
    message: string,
    severity: NotificationSeverity = 'info'
  ) => {
    setNotification({ open: true, message, severity });
  };

  const hideNotification = () => {
    setNotification((prev) => ({ ...prev, open: false }));
  };

  return {
    notification,
    showNotification,
    hideNotification,
  };
};