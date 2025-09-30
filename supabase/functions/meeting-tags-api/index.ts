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

    // GET /meeting-tags-api?meeting_id=xxx or ?tag_id=xxx
    if (method === 'GET') {
      const meetingId = url.searchParams.get('meeting_id');
      const tagId = url.searchParams.get('tag_id');
      
      if (meetingId) {
        // Get all tags for a meeting
        const result = await query(
          `SELECT t.* FROM tags t
           INNER JOIN meeting_tags mt ON t.id = mt.tag_id
           INNER JOIN meetings m ON mt.meeting_id = m.id
           WHERE mt.meeting_id = ? AND m.user_id = ?`,
          [meetingId, userId]
        );
        return new Response(
          JSON.stringify(result.rows || []),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (tagId) {
        // Get all meetings for a tag
        const result = await query(
          `SELECT m.* FROM meetings m
           INNER JOIN meeting_tags mt ON m.id = mt.meeting_id
           WHERE mt.tag_id = ? AND m.user_id = ?
           ORDER BY m.created_at DESC`,
          [tagId, userId]
        );
        return new Response(
          JSON.stringify(result.rows || []),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get untagged meetings
      const result = await query(
        `SELECT m.* FROM meetings m
         LEFT JOIN meeting_tags mt ON m.id = mt.meeting_id
         WHERE m.user_id = ? AND mt.id IS NULL
         ORDER BY m.created_at DESC`,
        [userId]
      );
      return new Response(
        JSON.stringify(result.rows || []),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /meeting-tags-api
    if (method === 'POST') {
      const body = await req.json();
      const { meeting_id, tag_id } = body;

      if (!meeting_id || !tag_id) {
        return new Response(
          JSON.stringify({ error: 'meeting_id and tag_id required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify ownership
      const ownerCheck = await query(
        `SELECT m.id FROM meetings m
         INNER JOIN tags t ON t.user_id = m.user_id
         WHERE m.id = ? AND t.id = ? AND m.user_id = ?`,
        [meeting_id, tag_id, userId]
      );

      if (!ownerCheck.rows || ownerCheck.rows.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Invalid meeting or tag' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const id = crypto.randomUUID();
      await query(
        'INSERT INTO meeting_tags (id, meeting_id, tag_id) VALUES (?, ?, ?)',
        [id, meeting_id, tag_id]
      );

      return new Response(
        JSON.stringify({ id, meeting_id, tag_id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE /meeting-tags-api?meeting_id=xxx&tag_id=xxx
    if (method === 'DELETE') {
      const meetingId = url.searchParams.get('meeting_id');
      const tagId = url.searchParams.get('tag_id');

      if (!meetingId || !tagId) {
        return new Response(
          JSON.stringify({ error: 'meeting_id and tag_id required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify ownership before deleting
      await query(
        `DELETE mt FROM meeting_tags mt
         INNER JOIN meetings m ON mt.meeting_id = m.id
         WHERE mt.meeting_id = ? AND mt.tag_id = ? AND m.user_id = ?`,
        [meetingId, tagId, userId]
      );

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
