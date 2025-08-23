const { parseStringPromise } = require("xml2js");
const settings = require("../settings.json");
const xmlFormatter = require("xml-formatter");
const emojiRegex = require("emoji-regex");

module.exports = async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    const { rssData } = req.body;
    if (!rssData) {
      return res.status(400).json({ error: "No RSS data provided" });
    }

    const extractedXml = await extractRssInfo(rssData);
    const today = new Date();

    const month = String(today.getMonth() + 1).padStart(2, "0"); // Months are 0-indexed, so add 1
    const day = String(today.getDate()).padStart(2, "0");
    const year = today.getFullYear();

    const filename = `blog-${month}-${day}-${year}.xml`;

    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/xml");
    res.status(200).send(extractedXml);
  } catch (error) {
    console.error("RSS to XML Error:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

async function extractRssInfo(rssData) {
  try {
    const parsedData = await parseStringPromise(rssData, {
      explicitArray: false,
    });

    const channel = parsedData.rss.channel || {};
    const blogid = channel["atom:id"] || channel["id"] || "";
    const blogTitle = channel.title || "Unknown Blog";
    const generator = channel.generator || "Blogger";

    const newid = blogid.includes("blog-")
      ? blogid.split("blog-")[1]
      : "UnknownID";

    const authorTag = `<author>
        <name>Admin</name>
        <uri>https://www.blogger.com/profile/09614081293183296077</uri>
        <email>noreply@blogger.com</email>
        <gd:image rel="http://schemas.google.com/g/2005#thumbnail" width="35" height="35" src="//www.blogger.com/img/blogger_logo_round_35.png" />
      </author>`;

    let entries = `<entry>
      <id>${blogid}.template</id>
      <published>2025-03-03T08:53:16.921-08:00</published>
      <updated>2025-03-07T00:15:23.437-08:00</updated>
      <category scheme="http://schemas.google.com/g/2005#kind" term="http://schemas.google.com/blogger/2008/kind#settings" />
      <title type="text">Template: ${blogTitle}</title>
      <content type="text">&lt;?xml version="1.0" encoding="UTF-8" ?&gt;
      &lt;!DOCTYPE html&gt;
      &lt;html b:css='false' b:defaultwidgetversion='2' b:layoutsVersion='3' b:responsive='true' b:templateUrl='clean-install.xml' b:templateVersion='0.0.1' xmlns='http://www.w3.org/1999/xhtml' xmlns:b='http://www.google.com/2005/gml/b' xmlns:data='http://www.google.com/2005/gml/data' xmlns:expr='http://www.google.com/2005/gml/expr'&gt;&lt;b:attr name='xmlns' value=''/&gt;&lt;b:attr name='xmlns:b' value=''/&gt;&lt;b:attr name='xmlns:expr' value=''/&gt;&lt;b:attr name='xmlns:data' value=''/&gt;&lt;head&gt;&lt;b:if cond='false'&gt;&lt;b:skin&gt;&lt;![CDATA[]]&gt;&lt;/b:skin&gt;&lt;/b:if&gt;&lt;/head&gt;&lt;body&gt;&lt;b:section id='_' maxwidgets='1' showaddelement='false'/&gt;&lt;/body&gt;&lt;/html&gt;</content>
      <link rel="edit" type="application/atom+xml" href="https://www.blogger.com/feeds/${newid}/template/default" />
      <link rel="self" type="application/atom+xml" href="https://www.blogger.com/feeds/${newid}/template/default" />
      <link rel="alternate" type="text/html" href="https://www.blogger.com/feeds/${newid}/template/default" />
      ${authorTag}
    </entry>`;

    const settingsEntries = Object.entries(settings)
      .map(
        ([key, value]) => `<entry>
        <id>${blogid}.settings.${key}</id>
        <published>2025-03-03T08:53:16.921-08:00</published>
        <updated>2025-03-07T00:15:23.437-08:00</updated>
        <category scheme="http://schemas.google.com/g/2005#kind" term="http://schemas.google.com/blogger/2008/kind#settings" />
        <title type="text">${key}</title>
        <content type="text">${value}</content>
        <link rel="edit" type="application/atom+xml" href="https://www.blogger.com/feeds/${newid}/settings/${key}" />
        <link rel="self" type="application/atom+xml" href="https://www.blogger.com/feeds/${newid}/settings/${key}" />
        ${authorTag}
      </entry>`
      )
      .join("\n");

    entries += settingsEntries;

    const items = parsedData.rss.channel.item;

    if (!items) return [];

    const itemsArray = Array.isArray(items) ? items : [items];

    const atomEntries = itemsArray.slice(0, 5).map((item) => {
      const guid = typeof item.guid === "object" ? item.guid._ : item.guid;
      const postId = guid.split(".post-")[1];
      let description = item.description;

      if (typeof description === "object" && description._) {
        description = description._;
      }

      var char2entity = {
        "'": "&#39;",
        '"': "&quot;",
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
      };

      function escape_entities(str) {
        var rv = "";
        for (var i = 0; i < str.length; i++) {
          var ch = str.charAt(i);
          rv += char2entity[ch] || ch;
        }
        return rv;
      }

      // Function to convert emojis to their Unicode HTML entities
      function convertEmojis(str) {
        const regex = emojiRegex();
        return str.replace(regex, (match) => {
          // Convert emoji to Unicode code point and then to HTML entity
          const codePoints = [...match].map((char) => char.codePointAt(0));
          return codePoints.map((cp) => `&#${cp};`).join("");
        });
      }

      return `<entry>
        <id>${guid}</id>
        <published>2025-03-03T08:54:00.000-08:00</published>
        <updated>${item["atom:updated"]}</updated>
        <category scheme="http://schemas.google.com/g/2005#kind" term="http://schemas.google.com/blogger/2008/kind#post" />
        <title type="text">${convertEmojis(item.title)}</title>
        <content type="html">${escape_entities(
          convertEmojis(description)
        )}</content>
        <link rel="replies" type="application/atom+xml" href="https://utest108.blogspot.com/feeds/${postId}/comments/default" title="Post Comments" />
        <link rel="replies" type="text/html" href="${
          item.link
        }#comment-form" title="${item["thr:total"]} Comments" />
        <link rel="edit" type="application/atom+xml" href="https://www.blogger.com/feeds/2504213420472834725/posts/default/${postId}" />
        <link rel="self" type="application/atom+xml" href="https://www.blogger.com/feeds/2504213420472834725/posts/default/${postId}" />
        <link rel="alternate" type="text/html" href="${
          item.link
        }" title="${convertEmojis(item.title)}" />
        ${authorTag}
        <thr:total>${item["thr:total"] || 0}</thr:total>
      </entry>`;
    });

    entries += atomEntries.join("\n");

    return xmlFormatter(
      `<?xml version="1.0" encoding="UTF-8"?>
      <?xml-stylesheet href="https://www.blogger.com/styles/atom.css" type="text/css"?>
      <feed xmlns="http://www.w3.org/2005/Atom" xmlns:gd="http://schemas.google.com/g/2005" xmlns:georss="http://www.georss.org/georss" xmlns:openSearch="http://a9.com/-/spec/opensearchrss/1.0/" xmlns:thr="http://purl.org/syndication/thread/1.0">
         <id>${blogid}.archive</id>
         <updated>2025-03-07T00:15:23.437-08:00</updated>
         <title type="text">${blogTitle}</title>
         ${authorTag}
        <generator version="7.00" uri="https://www.blogger.com">${generator}</generator>
         ${entries}
      </feed>`,
      { indentation: "  ", collapseContent: true }
    );
  } catch (error) {
    console.error("Error parsing RSS XML:", error.message);
    return `<?xml version="1.0" encoding="UTF-8"?><error>Failed to process RSS feed</error>`;
  }
}
