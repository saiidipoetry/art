
export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors });
    }

    // GET / -> return last 200 notes
    if (request.method === 'GET') {
      const notes = await env.NOTES.get('notes', { type: 'json' }) || [];
      return new Response(JSON.stringify(notes.slice(-200).reverse()), {
        headers: { ...cors, 'Content-Type': 'application/json' }
      });
    }

    // POST / -> save a note
    if (request.method === 'POST') {
      try {
        const body = await request.json();
        const note = {
          name: (body.name || 'anon').toString().slice(0, 24),
          text: (body.text || '-').toString().slice(0, 200),
          time: Date.now()
        };

        const notes = await env.NOTES.get('notes', { type: 'json' }) || [];
        notes.push(note);

        // keep only last 500 to stay in free limits
        await env.NOTES.put('notes', JSON.stringify(notes.slice(-500)));

        return new Response('ok', { headers: cors });
      } catch (e) {
        return new Response('error', { status: 400, headers: cors });
      }
    }

    return new Response('not found', { status: 404, headers: cors });
  }
};
export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors });
    }

    // GET / -> return last 200 notes
    if (request.method === 'GET') {
      const notes = await env.NOTES.get('notes', { type: 'json' }) || [];
      return new Response(JSON.stringify(notes.slice(-200).reverse()), {
        headers: { ...cors, 'Content-Type': 'application/json' }
      });
    }

    // POST / -> save a note
    if (request.method === 'POST') {
      try {
        const body = await request.json();
        const note = {
          name: (body.name || 'anon').toString().slice(0, 24),
          text: (body.text || '-').toString().slice(0, 200),
          time: Date.now()
        };

        const notes = await env.NOTES.get('notes', { type: 'json' }) || [];
        notes.push(note);

        // keep only last 500 to stay in free limits
        await env.NOTES.put('notes', JSON.stringify(notes.slice(-500)));

        return new Response('ok', { headers: cors });
      } catch (e) {
        return new Response('error', { status: 400, headers: cors });
      }
    }

    return new Response('not found', { status: 404, headers: cors });
  }
};