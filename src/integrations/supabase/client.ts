// MySQL client wrapper
import { mysqlClient } from '@/lib/mysql-client';

// Export mysql client as supabase for compatibility
export const supabase = mysqlClient as any;