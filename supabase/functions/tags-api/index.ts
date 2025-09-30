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

    // GET /tags-api or /tags-api?id=xxx or /tags-api?with_count=true
    if (method === 'GET') {
      const id = url.searchParams.get('id');
      const withCount = url.searchParams.get('with_count') === 'true';
      
      if (id) {
        const result = await query(
          'SELECT * FROM tags WHERE id = ? AND user_id = ?',
          [id, userId]
        );
        return new Response(
          JSON.stringify(result.rows && result.rows.length > 0 ? result.rows[0] : null),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (withCount) {
        const result = await query(
          `SELECT t.*, COUNT(mt.meeting_id) as meetingCount 
           FROM tags t 
           LEFT JOIN meeting_tags mt ON t.id = mt.tag_id 
           WHERE t.user_id = ? 
           GROUP BY t.id 
           ORDER BY t.created_at DESC`,
          [userId]
        );
        return new Response(
          JSON.stringify(result.rows || []),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const result = await query(
        'SELECT * FROM tags WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
      );
      return new Response(
        JSON.stringify(result.rows || []),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /tags-api
    if (method === 'POST') {
      const body = await req.json();
      const id = crypto.randomUUID();
      
      await query(
        'INSERT INTO tags (id, name, color, user_id) VALUES (?, ?, ?, ?)',
        [id, body.name, body.color || null, userId]
      );

      const result = await query('SELECT * FROM tags WHERE id = ?', [id]);
      return new Response(
        JSON.stringify(result.rows[0]),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PUT /tags-api?id=xxx
    if (method === 'PUT') {
      const id = url.searchParams.get('id');
      if (!id) {
        return new Response(
          JSON.stringify({ error: 'Tag ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body = await req.json();
      const updates = [];
      const params = [];

      if (body.name !== undefined) {
        updates.push('name = ?');
        params.push(body.name);
      }
      if (body.color !== undefined) {
        updates.push('color = ?');
        params.push(body.color);
      }

      updates.push('updated_at = NOW()');
      params.push(id, userId);

      await query(
        `UPDATE tags SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
        params
      );

      const result = await query('SELECT * FROM tags WHERE id = ?', [id]);
      return new Response(
        JSON.stringify(result.rows[0]),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE /tags-api?id=xxx
    if (method === 'DELETE') {
      const id = url.searchParams.get('id');
      if (!id) {
        return new Response(
          JSON.stringify({ error: 'Tag ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await query('DELETE FROM tags WHERE id = ? AND user_id = ?', [id, userId]);
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
