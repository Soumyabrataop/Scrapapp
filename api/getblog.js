import { request } from "undici";

export default async function handler(req, res) {
  try {
    const databaseId = process.env.DATABASE_ID;
    const notionApiKey = process.env.NOTION_API_KEY;

    const notionResponse = await request(
      `https://api.notion.com/v1/databases/${databaseId}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${notionApiKey}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
      }
    );

    const { statusCode, body } = notionResponse;
    if (statusCode !== 200) {
      return res.status(statusCode).json({ error: "Failed to fetch data" });
    }

    const data = await body.json();

    const blogs = data.results.map((page) => ({
      title: page.properties.Name.title[0]?.plain_text || "Untitled",
      url: page.url,
    }));

    return res.status(200).json(blogs);
  } catch (error) {
    console.error("Error fetching blogs:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
