const { fetch } = require("undici");
const { parseStringPromise, Builder } = require("xml2js");

/**
 * Checks if a given feed entry is a blog post.
 * @param {object} entry - The entry to check.
 * @returns {boolean} - True if the entry is a blog post, false otherwise.
 */
function isPostEntry(entry) {
  if (!entry || !entry.category) {
    return false;
  }

  // The category can be an object or an array if multiple categories exist.
  const categories = Array.isArray(entry.category) ? entry.category : [entry.category];

  // Check if any category has the 'term' attribute for a blog post.
  return categories.some(
    (cat) => cat.$ && cat.$.term === "http://schemas.google.com/blogger/2008/kind#post"
  );
}

module.exports = async (req, res) => {
  try {
    let { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    let fullUrl = url.endsWith('/') ? `${url}feeds/posts/default` : `${url}/feeds/posts/default`;
    let startIndex = 1;
    const maxResults = 500;
    let allPostEntries = [];
    let firstFeedData;
    let totalPostsInFeed = 0;

    while (true) {
      const paginatedUrl = `${fullUrl}?start-index=${startIndex}&max-results=${maxResults}&alt=atom`;
      const response = await fetch(paginatedUrl, { redirect: "follow" });

      if (!response.ok) {
        console.error("Failed to fetch RSS feed:", response.statusText);
        return res
          .status(response.status)
          .json({ error: "Failed to fetch RSS feed" });
      }

      const data = await response.text();
      const parsedData = await parseStringPromise(data, {
        explicitArray: false, // Important for how we handle categories
      });

      if (!firstFeedData) {
        firstFeedData = { ...parsedData };
        if (firstFeedData.feed && firstFeedData.feed.entry) {
          // Keep non-post entries from the first fetch (like settings, templates)
          allPostEntries = (Array.isArray(firstFeedData.feed.entry) ? firstFeedData.feed.entry : [firstFeedData.feed.entry]).filter(isPostEntry);
        } else {
          allPostEntries = [];
        }
        // Get total results from the feed header, if it exists
        totalPostsInFeed = parseInt(firstFeedData.feed['openSearch:totalResults']?._, 10) || 0;
      }

      const entries = parsedData.feed.entry;
      if (entries) {
        const currentEntries = Array.isArray(entries) ? entries : [entries];
        const postEntries = currentEntries.filter(isPostEntry);

        if (startIndex > 1) {
            allPostEntries = allPostEntries.concat(postEntries);
        }

        if (!totalPostsInFeed && postEntries.length < maxResults) {
            // If totalResults is not available, we stop when a page has less than maxResults
            break;
        }
      } else {
        break; // No more entries
      }

      startIndex += maxResults;
      if (totalPostsInFeed && startIndex > totalPostsInFeed) {
          // Stop if we have fetched all declared posts
          break;
      }
    }

    if (firstFeedData) {
      // Reconstruct the feed with all the post entries
      firstFeedData.feed.entry = allPostEntries;
      // Update the total results count
      if(firstFeedData.feed['openSearch:totalResults']) {
        firstFeedData.feed['openSearch:totalResults']._ = allPostEntries.length;
      }

      const builder = new Builder();
      const xml = builder.buildObject(firstFeedData);
      res.status(200).send(xml);
    } else {
      res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><feed/>');
    }
  } catch (error) {
    console.error("Fetch Error:", error.message, error.stack);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
