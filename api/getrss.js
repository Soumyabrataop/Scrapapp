const { fetch } = require("undici");

module.exports = async (req, res) => {
  try {
    let { url } = req.body;
    url += "/feeds/posts/default?alt=rss";

    const response = await fetch(url, { redirect: "follow" });
    console.log(
      "Response status:",
      response.status,
      "Response OK:",
      response.ok
    );

    if (!response.ok) {
      console.error("Failed to fetch RSS feed:", response.statusText);
      return res
        .status(response.status)
        .json({ error: "Failed to fetch RSS feed" });
    }

    const data = await response.text();
    res.status(200).send(data);
  } catch (error) {
    console.error("Fetch Error:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
