/**
 * Centralized meeting-status styling so badges look consistent across pages.
 * Handles both the English status keys and the Persian processing label.
 */
export const getStatusBadgeClass = (status?: string): string => {
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
