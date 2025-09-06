const { fetch } = require("undici");
const { parseStringPromise, Builder } = require("xml2js");

module.exports = async (req, res) => {
  try {
    let { url } = req.body;
    let fullUrl = url + "/feeds/posts/default";
    let startIndex = 1;
    const maxResults = 500;
    let allEntries = [];
    let firstFeedData;

    while (true) {
      const paginatedUrl = `${fullUrl}?start-index=${startIndex}&max-results=${maxResults}`;
      const response = await fetch(paginatedUrl, { redirect: "follow" });

      if (!response.ok) {
        console.error("Failed to fetch RSS feed:", response.statusText);
        return res
          .status(response.status)
          .json({ error: "Failed to fetch RSS feed" });
      }

      const data = await response.text();
      const parsedData = await parseStringPromise(data, {
        explicitArray: false,
      });

      if (!firstFeedData) {
        firstFeedData = { ...parsedData };
        delete firstFeedData.feed.entry; // Remove entries to be replaced with the full list
      }

      const entries = parsedData.feed.entry;
      if (entries) {
        const postEntries = (Array.isArray(entries) ? entries : [entries]).filter(
          (entry) =>
            entry.category &&
            entry.category.$.term.endsWith("#post")
        );
        allEntries = allEntries.concat(postEntries);

        if (postEntries.length < maxResults) {
          break; // Last page
        }
      } else {
        break; // No entries found
      }

      startIndex += maxResults;
    }

    if (firstFeedData) {
      firstFeedData.feed.entry = allEntries;
      const builder = new Builder();
      const xml = builder.buildObject(firstFeedData);
      res.status(200).send(xml);
    } else {
      // Handle case where the feed was empty from the start
      res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><feed/>');
    }
  } catch (error) {
    console.error("Fetch Error:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
