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

- **Multiple Calendars**
  - Load multiple ICS files simultaneously
  - Each calendar gets a unique random color
  - Toggle visibility of individual calendars
  - Remove calendars you no longer need
  - Automatic persistence to localStorage

- **Customization**
  - Dark/Light mode toggle with smooth transitions
  - Auto-detect week start day based on user locale
  - Manual override to start weeks on Sunday or Monday
  - Settings persist across sessions via localStorage

- **URL State Management**
  - Calendar URLs are added to the browser address bar
  - Share calendar views with others via URL
  - Browser back/forward navigation support
  - Bookmark specific calendars

- **Modern Design**
  - Clean, sleek interface with custom CSS
  - Dark mode support for comfortable viewing
  - Fully responsive design (mobile, tablet, desktop)
  - Touch-friendly 44px tap targets on mobile
  - Optimized for iOS and Android devices
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
   Since the app uses ES6 modules, you need to serve it via HTTP with correct MIME types.
   
   **Option 1: Using Node.js (Recommended)**
   ```bash
   # Using the included server with correct MIME types
   node server.js
   
   # Or using npm
   npm start
   ```
   
   **Option 2: Using npx**
   ```bash
   npx http-server src -p 8000
   ```
   
   **Option 3: Using VS Code**
   - Install "Live Server" extension
   - Right-click on `src/index.html`
   - Select "Open with Live Server"

3. **Open in browser**:
   Navigate to `http://localhost:8000`
   
**Note**: Python's `SimpleHTTPServer` may serve JavaScript files with incorrect MIME types, causing ES6 modules to fail. Use one of the recommended options above.

## Usage

### Loading a Calendar

**Option 1: Upload a File**
1. Drag and drop an ICS file onto the upload area, or
2. Click "Choose File" to select an ICS file from your computer

**Option 2: Load from URL**
1. Paste the URL of an ICS calendar
2. Click "Load"
3. The calendar URL will be added to your browser's address bar
4. You can share this URL with others or bookmark it for quick access

**Note on CORS**: Some URLs may have CORS (Cross-Origin Resource Sharing) restrictions. The app will automatically attempt to use a CORS proxy if the direct request fails. If both methods fail, you can download the file and upload it manually.

### Navigating the Calendar

- **Theme Toggle**: Click the sun/moon icon to switch between light and dark mode
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

### Theme Preference

Your theme preference (light/dark) is automatically saved and will be restored when you return to the app.

### Sharing Calendars

When you load a calendar from a URL, the calendar URL is automatically added to your browser's address bar. This means you can:
- **Share the URL** with others so they can view the same calendar
- **Bookmark the URL** for quick access to your favorite calendars
- **Use browser back/forward** buttons to navigate between different calendars
- **Reload the page** and the calendar will automatically load

Example: `https://yourdomain.com/ics-viewer/?calendar=https://example.com/events.ics`

### Mobile Usage

The application is fully optimized for mobile devices:

- **Touch-Friendly**: All buttons and interactive elements meet the 44px minimum touch target size
- **Responsive Layout**: Automatically adapts to your screen size
- **Smooth Scrolling**: Native touch scrolling for calendar views
- **Icon-Only Buttons**: On small screens, button text is hidden to save space
- **Prevents Zoom**: Input fields use 16px font size to prevent unwanted zoom on iOS
- **Optimized Views**: 
  - Month view: Compact cells with readable event text
  - Week view: Stacks days vertically on very small screens
  - Day view: Scrollable time slots with proper sizing

**Pro tip**: Use landscape orientation on phones for a better week/day view experience.

## Browser Support

This application requires a modern browser with ES6+ support:

**Desktop:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Mobile:**
- iOS Safari 14+
- Chrome for Android 90+
- Samsung Internet 14+

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
