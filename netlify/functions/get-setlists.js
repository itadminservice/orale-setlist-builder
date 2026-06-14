exports.handler = async (event) => {
  const token = process.env.NOTION_TOKEN;
  const SETLIST_DB = '0afb7176-9d6e-4f37-b18b-7c9ac8adbfa4';
  const { id } = event.queryStringParameters || {};

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  // Load a specific setlist's ordered song IDs
  if (id) {
    const res = await fetch(`https://api.notion.com/v1/pages/${id}`, {
      headers: { Authorization: `Bearer ${token}`, 'Notion-Version': '2022-06-28' },
    });
    const page = await res.json();
    if (!res.ok) return { statusCode: res.status, headers, body: JSON.stringify({ error: page.message }) };

    const raw = page.properties['Order Notes']?.rich_text[0]?.plain_text || '[]';
    let orderedIds = [];
    try { orderedIds = JSON.parse(raw); } catch {}
    return { statusCode: 200, headers, body: JSON.stringify({ orderedIds }) };
  }

  // List all setlists, newest first
  const res = await fetch(`https://api.notion.com/v1/databases/${SETLIST_DB}/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
    body: JSON.stringify({ sorts: [{ property: 'Date Used', direction: 'descending' }], page_size: 50 }),
  });
  const data = await res.json();
  if (!res.ok) return { statusCode: res.status, headers, body: JSON.stringify({ error: data.message }) };

  const setlists = data.results.map(page => ({
    id: page.id,
    name: page.properties['Setlist Name'].title[0]?.plain_text || 'Untitled',
    date: page.properties['Date Used'].date?.start || '',
    status: page.properties['Status'].select?.name || '',
  }));

  return { statusCode: 200, headers, body: JSON.stringify(setlists) };
};
