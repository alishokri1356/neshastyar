/**
 * Centralized meeting-status styling so badges look consistent across pages.
 * Handles both the English status keys and the Persian processing label.
 */
const isErrorStatus = (status?: string): boolean => {
  const value = status?.trim() ?? '';
  if (!value) return false;
  return /^error\b/i.test(value) || /^failed\b/i.test(value) || value.includes('خطا');
};

export const getStatusBadgeClass = (status?: string): string => {
  if (isErrorStatus(status)) {
    return 'bg-destructive/15 text-destructive border-destructive/30';
  }

  switch (status) {
    case 'Done':
      return 'bg-success/15 text-success border-success/30';
    case 'Need Review':
      return 'bg-warning/15 text-warning border-warning/30';
    case 'On Process':
      return 'bg-info/15 text-info border-info/30';
    case 'ارسال درخواست پردازش':
      return 'bg-primary/15 text-primary border-primary/30';
    case 'پردازش شده':
      return 'bg-success/15 text-success border-success/30';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
};
