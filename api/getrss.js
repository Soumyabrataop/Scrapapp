const { fetch } = require("undici");
const { parseStringPromise, Builder } = require("xml2js");

/**
 * Checks if a given feed entry is a blog post.
 * This is determined by the presence of a <link> tag with rel="alternate" and type="text/html".
 * @param {object} entry - The entry to check.
 * @returns {boolean} - True if the entry is a blog post, false otherwise.
 */
function isPostEntry(entry) {
  if (!entry || !entry.link) {
    return false;
  }
  const links = Array.isArray(entry.link) ? entry.link : [entry.link];
  return links.some(
    (link) => link.$ && link.$.rel === "alternate" && link.$.type === "text/html"
  );
}

module.exports = async (req, res) => {
  try {
    let { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    const fullUrl = url.endsWith("/")
      ? `${url}feeds/posts/default`
      : `${url}/feeds/posts/default`;

    let startIndex = 1;
    const maxResults = 500;
    let allPostEntries = [];
    let nonPostEntries = [];
    let firstFeedData;

    while (true) {
      const paginatedUrl = `${fullUrl}?start-index=${startIndex}&max-results=${maxResults}&alt=atom`;
      const response = await fetch(paginatedUrl, { redirect: "follow" });

      if (!response.ok) {
        console.error(`Failed to fetch RSS feed from ${paginatedUrl}. Status: ${response.status}`);
        return res
          .status(response.status)
          .json({ error: "Failed to fetch RSS feed" });
      }

      const data = await response.text();
      const parsedData = await parseStringPromise(data, {
        explicitArray: false,
      });

      if (!parsedData.feed) {
        // If the feed is empty or malformed, break.
        if (!firstFeedData) {
            // If this was the very first fetch, send back an empty feed.
            return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><feed/>');
        }
        break;
      }

      const entries = parsedData.feed.entry ? (Array.isArray(parsedData.feed.entry) ? parsedData.feed.entry : [parsedData.feed.entry]) : [];

      if (!firstFeedData) {
        // On the first fetch, we store the main feed structure.
        firstFeedData = { ...parsedData };
        // And we separate the post entries from the non-post entries.
        nonPostEntries = entries.filter(entry => !isPostEntry(entry));
        allPostEntries = entries.filter(isPostEntry);
      } else {
        // On subsequent pages, we only care about post entries.
        // Non-post entries like settings are only in the first page of a full feed.
        const postEntries = entries.filter(isPostEntry);
        allPostEntries = allPostEntries.concat(postEntries);
      }

      const nextLink = (Array.isArray(parsedData.feed.link) ? parsedData.feed.link : [parsedData.feed.link]).find(l => l && l.$ && l.$.rel === 'next');
      if (!nextLink) {
        break; // No more pages.
      }

      startIndex += maxResults;
    }

    if (firstFeedData) {
      // Reconstruct the feed with the non-post entries first, then all post entries.
      firstFeedData.feed.entry = nonPostEntries.concat(allPostEntries);

      // Update the total results count to be accurate.
      if (firstFeedData.feed["openSearch:totalResults"]) {
        firstFeedData.feed["openSearch:totalResults"]._ = allPostEntries.length.toString();
      }

      const builder = new Builder({
          renderOpts: { 'pretty': true, 'indent': '  ', 'newline': '\n' },
          xmldec: { 'version': '1.0', 'encoding': 'UTF-8' }
      });
      const xml = builder.buildObject(firstFeedData);
      res.status(200).send(xml);
    } else {
      // This case should ideally not be reached due to the check above, but as a fallback.
      res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><feed/>');
    }
  } catch (error) {
    console.error("Fetch Error:", error.message, error.stack);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
