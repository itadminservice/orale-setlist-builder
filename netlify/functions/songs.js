exports.handler = async () => {
  const token = process.env.NOTION_TOKEN;
  const databaseId = 'e59ac45e-8b84-4b48-9e8f-1df29c80c7ee';

  const songs = [];
  let cursor;

  do {
    const body = {
      sorts: [{ property: 'Song Title', direction: 'ascending' }],
      ...(cursor && { start_cursor: cursor }),
    };

    const res = await fetch(
      `https://api.notion.com/v1/databases/${databaseId}/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    const data = await res.json();

    if (!res.ok || !data.results) {
      return {
        statusCode: res.status || 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: data.message || data.code || 'Unknown Notion error', raw: data }),
      };
    }

    for (const page of data.results) {
      const p = page.properties;
      songs.push({
        id: page.id,
        title: p['Song Title'].title[0]?.plain_text || '',
        artist: p['Artist'].rich_text[0]?.plain_text || '',
        key: p['Key'].select?.name || '',
        feel: p['Feel'].multi_select.map((f) => f.name),
        duration: p['Duration (min)'].number || 0,
        youtube: p['YouTube Reference'].url || '',
        tempo: p['Tempo']?.rich_text[0]?.plain_text || '',
        status: p['Status'].select?.name || '',
        homework: p['HomeWork']?.checkbox || false,
        notes: p['Notes']?.rich_text[0]?.plain_text || '',
      });
    }

    cursor = data.has_more ? data.next_cursor : null;
  } while (cursor);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(songs),
  };
};
