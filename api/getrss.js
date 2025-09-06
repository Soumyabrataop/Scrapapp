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

  // The 'link' property can be an object or an array if multiple link tags exist.
  const links = Array.isArray(entry.link) ? entry.link : [entry.link];

  // A post entry will always have a link to the public HTML page.
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
    const maxResults = 500; // Fetch max allowed to minimize requests
    let allPostEntries = [];
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

      const entries = parsedData.feed && parsedData.feed.entry ? (Array.isArray(parsedData.feed.entry) ? parsedData.feed.entry : [parsedData.feed.entry]) : [];

      if (!firstFeedData) {
        // On the first fetch, we store the main feed structure.
        firstFeedData = { ...parsedData };
        // We also grab the posts from this first page.
        allPostEntries = entries.filter(isPostEntry);
      } else {
        // On subsequent pages, we only care about the post entries.
        const postEntries = entries.filter(isPostEntry);
        allPostEntries = allPostEntries.concat(postEntries);
      }

      // Determine if we should stop paginating.
      // The 'next' link is the most reliable way to know if there's a next page.
      const nextLink = parsedData.feed.link && (Array.isArray(parsedData.feed.link) ? parsedData.feed.link : [parsedData.feed.link]).find(l => l.$.rel === 'next');
      if (!nextLink) {
        break;
      }

      startIndex += maxResults;
    }

    if (firstFeedData) {
      // Replace the entries in our stored feed structure with the complete list of posts.
      firstFeedData.feed.entry = allPostEntries;

      // Update the total results count to be accurate.
      if (firstFeedData.feed["openSearch:totalResults"]) {
        firstFeedData.feed["openSearch:totalResults"] = allPostEntries.length.toString();
      }

      const builder = new Builder();
      const xml = builder.buildObject(firstFeedData);
      res.status(200).send(xml);
    } else {
      // This case handles if the initial fetch fails or the feed is completely empty.
      const builder = new Builder();
      const emptyFeedXml = builder.buildObject({ feed: {} });
      res.status(200).send(emptyFeedXml);
    }
  } catch (error) {
    console.error("Fetch Error:", error.message, error.stack);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
