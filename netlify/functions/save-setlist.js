exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const token = process.env.NOTION_TOKEN;
  const SETLIST_DB = '0afb7176-9d6e-4f37-b18b-7c9ac8adbfa4';

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const { name, songs, purpose, notes, date } = payload;

  const properties = {
    'Setlist Name': {
      title: [{ text: { content: name || 'Untitled Setlist' } }],
    },
    'Date Used': {
      date: { start: date || new Date().toISOString().split('T')[0] },
    },
    Status: { select: { name: 'Draft' } },
    Songs: {
      relation: songs.filter(s => s.type !== 'break').map((s) => ({ id: s.id })),
    },
  };

  if (purpose) properties['Purpose'] = { select: { name: purpose } };
  // Store ordered IDs with BREAK markers so Load Setlist can restore order and set breaks
  properties['Order Notes'] = { rich_text: [{ text: { content: JSON.stringify(songs.map(s => s.type === 'break' ? 'BREAK' : s.id)) } }] };

  // Write ordered song list as numbered blocks inside the Notion page
  let breakCount = 0;
  const children = songs.map((song) => {
    if (song.type === 'break') {
      breakCount++;
      return {
        object: 'block',
        type: 'heading_3',
        heading_3: { rich_text: [{ text: { content: `── Set ${breakCount + 1} ──` } }] },
      };
    }
    return {
      object: 'block',
      type: 'numbered_list_item',
      numbered_list_item: {
        rich_text: [{ text: { content: `${song.title}  —  ${song.artist}  (${song.key || '?'})${song.duration ? `  [${song.duration} min]` : ''}` } }],
      },
    };
  });

  const res = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      parent: { database_id: SETLIST_DB },
      properties,
      children,
    }),
  });

  const data = await res.json();

  return {
    statusCode: res.ok ? 200 : 500,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      ok: res.ok,
      url: data.url,
      id: data.id,
      error: res.ok ? undefined : data.message,
    }),
  };
};
