import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats rate limit errors with detailed information
 * @param error - The error object from API response
 * @returns Formatted error message with page and API endpoint details
 */
export function formatRateLimitError(error: any): { title: string; description: string } {
  // Check if it's a rate limit error
  const isRateLimit = 
    error?.error === 'Too many requests' || 
    error?.error === 'Too many authentication attempts' ||
    error?.message?.includes('Too many requests') ||
    error?.message?.includes('Too many authentication attempts');

  if (!isRateLimit) {
    return {
      title: 'خطا',
      description: error?.message || error?.error || 'خطای نامشخص رخ داد'
    };
  }

  // Extract details from error
  const details = error?.details;
  const page = details?.page || 'صفحه نامشخص';
  const apiEndpoint = details?.apiEndpoint || details?.route || 'API نامشخص';

  // Format in Persian
  const title = error?.error === 'Too many authentication attempts' 
    ? 'درخواست‌های زیاد احراز هویت'
    : 'درخواست‌های زیاد از این IP';

  const description = `صفحه: ${page}\nAPI: ${apiEndpoint}\n\nلطفاً چند لحظه صبر کنید و دوباره تلاش کنید.`;

  return { title, description };
}