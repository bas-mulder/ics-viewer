# ICS Calendar Viewer

A modern, lightweight web application for viewing ICS (iCalendar) files. Built with vanilla JavaScript, featuring a sleek interface and multiple calendar views.

## Features

- **Multiple Input Methods**
  - Upload local ICS files via drag-and-drop or file picker
  - Load calendars from remote URLs

- **Multiple Calendar Views**
  - Month view: Traditional calendar grid
  - Week view: 7-day view with hourly time slots
  - Day view: Single day with detailed hourly breakdown

- **Event Details**
  - Click any event to view complete details in a modal
  - Displays: title, date/time, duration, location, description, organizer, attendees, and more

- **Customization**
  - Auto-detect week start day based on user locale
  - Manual override to start weeks on Sunday or Monday
  - Settings persist across sessions via localStorage

- **Modern Design**
  - Clean, sleek interface with custom CSS
  - Fully responsive (mobile, tablet, desktop)
  - Smooth animations and transitions
  - Accessibility-friendly with keyboard navigation

- **Zero Dependencies**
  - Pure vanilla JavaScript (ES6+)
  - No external libraries or frameworks
  - Lightweight (~50KB total)

## Live Demo

Once deployed, your calendar viewer will be available at:
`https://bas-mulder.github.io/ics-viewer/`

## Deployment to GitHub Pages

This project is configured for manual deployment to GitHub Pages:

1. **Enable GitHub Pages** in your repository:
   - Go to Settings > Pages
   - Under "Source", select "GitHub Actions"

2. **Trigger Deployment**:
   - Go to Actions tab
   - Select "Deploy to GitHub Pages" workflow
   - Click "Run workflow"
   - Choose the branch (main) and click "Run workflow"

3. **Access Your App**:
   - After deployment completes, your app will be live at `https://[username].github.io/ics-viewer/`

## Local Development

To run the application locally:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/bas-mulder/ics-viewer.git
   cd ics-viewer
   ```

2. **Serve the files**:
   Since the app uses ES6 modules, you need to serve it via HTTP (not just opening the file).
   
   Using Python:
   ```bash
   # Python 3
   python -m http.server 8000 --directory src
   ```
   
   Using Node.js (with http-server):
   ```bash
   npx http-server src -p 8000
   ```
   
   Using PHP:
   ```bash
   php -S localhost:8000 -t src
   ```

3. **Open in browser**:
   Navigate to `http://localhost:8000`

## Usage

### Loading a Calendar

**Option 1: Upload a File**
1. Drag and drop an ICS file onto the upload area, or
2. Click "Choose File" to select an ICS file from your computer

**Option 2: Load from URL**
1. Paste the URL of an ICS calendar
2. Click "Load"

Note: Some URLs may have CORS restrictions. If loading fails, download the file and upload it instead.

### Navigating the Calendar

- **Previous/Next**: Navigate to the previous or next time period
- **Today**: Jump back to today's date
- **View Switcher**: Toggle between Month, Week, and Day views

### Viewing Event Details

- Click on any event to open a detailed view
- The modal displays:
  - Event title
  - Date and time
  - Duration
  - Location (if available)
  - Description (if available)
  - Organizer and attendees
  - Additional metadata

### Settings

Click the settings icon (⚙️) to customize:
- **Week Start Day**: Choose Sunday, Monday, or auto-detect from your locale

## Browser Support

This application requires a modern browser with ES6+ support:

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Technical Details

### Architecture

```
src/
├── css/
│   ├── variables.css    # CSS custom properties
│   ├── base.css         # Base styles and reset
│   ├── layout.css       # Layout and components
│   ├── calendar.css     # Calendar-specific styles
│   ├── modal.css        # Modal styles
│   └── main.css         # Main stylesheet (imports)
├── js/
│   ├── main.js          # Application controller
│   ├── icsParser.js     # ICS parsing logic
│   ├── calendar.js      # Calendar rendering engine
│   ├── eventModal.js    # Event modal component
│   └── utils.js         # Utility functions
└── index.html           # Main HTML file
```

### ICS Format Support

The parser supports the following ICS (RFC 5545) properties:

**Event Properties:**
- `SUMMARY` - Event title
- `DTSTART` / `DTEND` - Start and end date/time
- `DURATION` - Event duration
- `DESCRIPTION` - Event description
- `LOCATION` - Event location
- `UID` - Unique identifier
- `ORGANIZER` - Event organizer
- `ATTENDEE` - Event attendees
- `STATUS` - Event status
- `CATEGORIES` - Event categories
- `URL` - Related URL

**Supported Formats:**
- All-day events (DATE format)
- Timed events (DATETIME format)
- UTC and local timezones
- Multi-day events

### Known Limitations

1. **CORS Restrictions**: Loading calendars from remote URLs may fail due to CORS policies. In such cases, download the ICS file and upload it instead.

2. **Recurring Events**: Basic support for recurring events (RRULE) is not implemented. Each occurrence must be defined separately in the ICS file.

3. **Timezone Handling**: While basic timezone support is included, complex timezone conversions may not be fully accurate. Events are displayed in the browser's local timezone.

4. **Large Calendars**: Very large ICS files (1000+ events) may experience performance issues in month view.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the [MIT License](LICENSE).

## Support

For issues, questions, or feature requests, please open an issue on GitHub.

## Credits

Created by Bas Mulder

---

Built with vanilla JavaScript, CSS, and HTML. No frameworks, no build tools, just clean code.
