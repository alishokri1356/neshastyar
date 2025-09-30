import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { query } from '../_shared/mysql.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const verifySession = async (token: string) => {
  const result = await query(
    'SELECT user_id FROM sessions WHERE id = ? AND expires_at > NOW()',
    [token]
  );
  return result.rows && result.rows.length > 0 ? result.rows[0].user_id : null;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const userId = await verifySession(token);

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Invalid session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const method = req.method;

    // GET /meetings-api or /meetings-api?id=xxx
    if (method === 'GET') {
      const id = url.searchParams.get('id');
      const status = url.searchParams.get('status');
      
      if (id) {
        const result = await query(
          'SELECT * FROM meetings WHERE id = ? AND user_id = ?',
          [id, userId]
        );
        return new Response(
          JSON.stringify(result.rows && result.rows.length > 0 ? result.rows[0] : null),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let sql = 'SELECT * FROM meetings WHERE user_id = ?';
      const params = [userId];
      
      if (status) {
        sql += ' AND status = ?';
        params.push(status);
      }
      
      sql += ' ORDER BY created_at DESC';
      
      const result = await query(sql, params);
      return new Response(
        JSON.stringify(result.rows || []),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /meetings-api
    if (method === 'POST') {
      const body = await req.json();
      const id = crypto.randomUUID();
      
      await query(
        `INSERT INTO meetings (id, audio_file_name, meeting_date, status, summary, user_id) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          id,
          body.audio_file_name || null,
          body.meeting_date || new Date(),
          body.status || 'pending',
          body.summary || null,
          userId
        ]
      );

      const result = await query('SELECT * FROM meetings WHERE id = ?', [id]);
      return new Response(
        JSON.stringify(result.rows[0]),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PUT /meetings-api?id=xxx
    if (method === 'PUT') {
      const id = url.searchParams.get('id');
      if (!id) {
        return new Response(
          JSON.stringify({ error: 'Meeting ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body = await req.json();
      const updates = [];
      const params = [];

      if (body.audio_file_name !== undefined) {
        updates.push('audio_file_name = ?');
        params.push(body.audio_file_name);
      }
      if (body.meeting_date !== undefined) {
        updates.push('meeting_date = ?');
        params.push(body.meeting_date);
      }
      if (body.status !== undefined) {
        updates.push('status = ?');
        params.push(body.status);
      }
      if (body.summary !== undefined) {
        updates.push('summary = ?');
        params.push(body.summary);
      }

      updates.push('updated_at = NOW()');
      params.push(id, userId);

      await query(
        `UPDATE meetings SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
        params
      );

      const result = await query('SELECT * FROM meetings WHERE id = ?', [id]);
      return new Response(
        JSON.stringify(result.rows[0]),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE /meetings-api?id=xxx
    if (method === 'DELETE') {
      const id = url.searchParams.get('id');
      if (!id) {
        return new Response(
          JSON.stringify({ error: 'Meeting ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await query('DELETE FROM meetings WHERE id = ? AND user_id = ?', [id, userId]);
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
