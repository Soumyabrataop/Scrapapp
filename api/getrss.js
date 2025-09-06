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
    let feedMetadata = {};
    let hasFetchedOnce = false;

    while (true) {
      const paginatedUrl = `${fullUrl}?start-index=${startIndex}&max-results=${maxResults}&alt=atom`;
      const response = await fetch(paginatedUrl, { redirect: "follow" });

      if (!response.ok) {
        console.error(`Failed to fetch RSS feed from ${paginatedUrl}. Status: ${response.status}`);
        // If the first fetch fails, we can't proceed.
        if (!hasFetchedOnce) {
            return res.status(response.status).json({ error: "Failed to fetch initial RSS feed" });
        }
        // If a subsequent fetch fails, we can just stop and proceed with what we have.
        break;
      }

      const data = await response.text();
      const parsedData = await parseStringPromise(data, {
        explicitArray: false,
      });

      if (!parsedData.feed) {
        if (!hasFetchedOnce) {
            return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><feed/>');
        }
        break;
      }

      if (!hasFetchedOnce) {
        // From the first page, store the feed-level metadata. We will reuse this.
        feedMetadata = { ...parsedData.feed };
        delete feedMetadata.entry; // We will build our own entry list.
        hasFetchedOnce = true;
      }

      const entries = parsedData.feed.entry ? (Array.isArray(parsedData.feed.entry) ? parsedData.feed.entry : [parsedData.feed.entry]) : [];
      const postEntries = entries.filter(isPostEntry);
      allPostEntries = allPostEntries.concat(postEntries);

      const nextLink = (Array.isArray(parsedData.feed.link) ? parsedData.feed.link : [parsedData.feed.link]).find(l => l && l.$ && l.$.rel === 'next');
      if (!nextLink) {
        break; // No more pages.
      }

      startIndex += maxResults;
    }

    // Now, build a new, clean feed from scratch.
    // It will contain the original feed's metadata, but only the post entries.
    const finalFeedObject = {
        feed: {
            ...feedMetadata,
            entry: allPostEntries
        }
    };

    // Update the total results count to be accurate for posts.
    if (finalFeedObject.feed["openSearch:totalResults"]) {
        finalFeedObject.feed["openSearch:totalResults"]._ = allPostEntries.length.toString();
    }

    const builder = new Builder({
        renderOpts: { 'pretty': false }, // Blogger expects a compact format.
        xmldec: { 'version': '1.0', 'encoding': 'UTF-8' },
        headless: true // To avoid a double XML declaration if the builder adds one.
    });

    let xml = builder.buildObject(finalFeedObject);

    // Add the xml-stylesheet processing instruction which the builder doesn't support.
    const stylesheet = '<?xml-stylesheet href="https://www.blogger.com/styles/atom.css" type="text/css"?>';
    // The builder might add its own XML declaration, so we ensure there's only one.
    if (xml.startsWith('<?xml')) {
        xml = xml.substring(xml.indexOf('?>') + 2);
    }
    const finalXml = `<?xml version='1.0' encoding='UTF-8'?>\n${stylesheet}\n${xml}`;

    res.status(200).send(finalXml);

  } catch (error) {
    console.error("Fetch Error:", error.message, error.stack);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
