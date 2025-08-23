# Scrap App

![Scrap App Banner](https://i.pinimg.com/originals/fc/68/f8/fc68f86873c9c661e84ad442cf8fb6cf.gif)

## Overview

Scrap App is a web application that allows users to extract and convert Blogger RSS feeds into XML format. The application provides a simple interface to input Blogger URLs and download the processed blog content as formatted XML files, making it easy to migrate or backup blog content.

## Features

- **RSS Feed Extraction**: Automatically fetches RSS feeds from Blogger websites
- **XML Conversion**: Converts RSS data into properly formatted XML files
- **Emoji Support**: Handles emojis in blog content by converting them to HTML entities
- **Date-based Naming**: Generated files are named with current date (e.g., `blog-MM-DD-YYYY.xml`)
- **Blog Management**: Integration with Notion API for blog listing and management
- **Responsive Design**: Clean, modern UI that works on all devices
- **Error Handling**: Comprehensive error handling with user-friendly alerts

## Tech Stack

- **Frontend**: HTML, CSS, Vanilla JavaScript
- **Backend**: Node.js with serverless functions
- **Dependencies**:
  - `undici` - HTTP client for making requests
  - `xml2js` - XML parsing and manipulation
  - `xml-formatter` - XML formatting and beautification
  - `emoji-regex` - Emoji detection and conversion

## Project Structure

```
scrapapp/
├── api/
│   ├── getblog.js      # Notion API integration for blog management
│   ├── getrss.js       # RSS feed fetching from Blogger
│   └── rsstoxml.js     # RSS to XML conversion with emoji support
├── blog.html           # Blog listing page
├── download.js         # Frontend logic for RSS processing
├── index.html          # Main application page
├── style.css           # Application styling
├── settings.json       # XML template settings
└── package.json        # Project dependencies
```

## Installation

1. Clone the repository:
```bash
git clone https://github.com/Soumyabrataop/Scrapapp.git
cd Scrapapp
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables (for blog management feature):
```bash
# Create a .env file in the root directory
DATABASE_ID=your_notion_database_id
NOTION_API_KEY=your_notion_api_key
```

## Usage

### Web Interface

1. Open the application in your browser
2. Enter a Blogger URL (must end with `.blogspot.com` and use HTTPS)
3. Click "Submit" to process the RSS feed
4. The XML file will be automatically downloaded with a date-based filename

### API Endpoints

#### GET RSS Feed
```
POST /api/getrss
Content-Type: application/json

{
  "url": "https://yourblog.blogspot.com"
}
```

#### Convert RSS to XML
```
POST /api/rsstoxml
Content-Type: application/json

{
  "rssData": "<rss>...</rss>"
}
```

#### Get Blog List (Notion Integration)
```
GET /api/getblog
```

## Features in Detail

### RSS Processing
- Validates Blogger URLs for proper format
- Fetches RSS feeds from Blogger's standard endpoint (`/feeds/posts/default?alt=rss`)
- Processes multiple blog posts (limited to 5 most recent)

### XML Generation
- Creates properly formatted Atom feed XML
- Includes blog metadata, settings, and post content
- Handles HTML entities and special characters
- Converts emojis to Unicode HTML entities for XML compatibility

### Emoji Handling
The application includes sophisticated emoji processing:
- Detects emojis using comprehensive regex patterns
- Converts emojis to Unicode code points
- Transforms code points to HTML entities (e.g., `😀` becomes `&#128512;`)
- Supports complex emojis with multiple code points

## Deployment

This application is deployed on Vercel and can be accessed at your Vercel deployment URL.

### Deploy to Vercel

1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard (if using Notion integration)
3. Deploy automatically on push to main branch

### Manual Deployment

```bash
# Build and deploy
vercel --prod
```

## Configuration

### Settings.json
The `settings.json` file contains default blog settings that are included in the generated XML:

```json
{
  "BLOG_1_DESCRIPTION": "Blog description",
  "BLOG_ADMIN_EMAIL": "admin@example.com",
  "BLOG_TITLE": "Blog Title"
}
```

## Error Handling

The application includes comprehensive error handling:
- URL validation (HTTPS and .blogspot.com requirements)
- Network request error handling
- XML parsing error recovery
- User-friendly error messages with alert system

## Browser Compatibility

- Modern browsers with ES6+ support
- Chrome, Firefox, Safari, Edge
- Mobile browsers supported

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is open source. All responsibilities related to this site and its content lie with the respective users. The application encourages users to only scrape content from Blogger sites that belong to them.

## Credits

- GIF animation credit goes to the original designer
- Built with modern web technologies
- Deployed on Vercel platform

## Support

For issues, questions, or contributions, please visit the GitHub repository or contact the maintainers.

---

**Note**: This tool is designed for legitimate use cases such as backing up your own blog content or migrating between platforms. Please respect copyright and terms of service when using this application.
