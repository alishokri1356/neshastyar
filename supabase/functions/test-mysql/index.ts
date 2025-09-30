import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { query } from '../_shared/mysql.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Testing MySQL connection...');
    
    // Test simple query
    const result = await query('SELECT 1 as test');
    
    console.log('MySQL connection successful:', result);
    
    // Test tables exist
    const tables = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'modiryar'
    `);
    
    console.log('Available tables:', tables);

    return new Response(
      JSON.stringify({
        status: 'success',
        message: 'MySQL connection working',
        test: result.rows,
        tables: tables.rows
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('MySQL connection error:', error);
    return new Response(
      JSON.stringify({
        status: 'error',
        message: error.message,
        stack: error.stack
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
