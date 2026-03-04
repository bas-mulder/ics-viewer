/**
 * ICS Builder
 * Converts event objects to ICS (iCalendar) format per RFC 5545
 */

/**
 * Escape special characters per RFC 5545
 * Escapes: \ , ; \n
 */
function escapeICSText(text) {
    if (!text) return '';
    return String(text)
        .replace(/\\/g, '\\\\')    // Backslash first!
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n');
}

/**
 * Format Date to ICS date format (YYYYMMDD)
 */
function formatDateOnly(date) {
    const year = date.getFullYear().toString().padStart(4, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}${month}${day}`;
}

/**
 * Format Date to ICS format
 * All-day: YYYYMMDD
 * Timed: YYYYMMDDTHHMMSSZ (UTC)
 */
function formatDateTime(date, allDay = false) {
    if (allDay) {
        return formatDateOnly(date);
    }
    
    // Convert to UTC for consistency
    const year = date.getUTCFullYear().toString().padStart(4, '0');
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = date.getUTCDate().toString().padStart(2, '0');
    const hour = date.getUTCHours().toString().padStart(2, '0');
    const minute = date.getUTCMinutes().toString().padStart(2, '0');
    const second = date.getUTCSeconds().toString().padStart(2, '0');
    
    return `${year}${month}${day}T${hour}${minute}${second}Z`;
}

/**
 * Fold lines to 75 characters per RFC 5545
 * Continuation lines start with space
 */
function foldLine(line) {
    if (line.length <= 75) return line;
    
    const result = [];
    let pos = 0;
    
    // First line: 75 chars
    result.push(line.substring(0, 75));
    pos = 75;
    
    // Continuation lines: 74 chars (because of leading space)
    while (pos < line.length) {
        result.push(' ' + line.substring(pos, pos + 74));
        pos += 74;
    }
    
    return result.join('\r\n');
}

/**
 * Build a single VEVENT from event object
 */
function buildVEvent(event) {
    const lines = ['BEGIN:VEVENT'];
    
    // Validate and convert dates if needed
    const start = event.start instanceof Date ? event.start : new Date(event.start);
    const end = event.end instanceof Date ? event.end : (event.end ? new Date(event.end) : null);
    
    // Required fields
    lines.push(`UID:${event.uid}`);
    lines.push(`DTSTAMP:${formatDateTime(new Date())}`); // Current time
    
    // Start date/time
    if (event.allDay) {
        lines.push(`DTSTART;VALUE=DATE:${formatDateTime(start, true)}`);
        if (end) {
            lines.push(`DTEND;VALUE=DATE:${formatDateTime(end, true)}`);
        }
    } else {
        lines.push(`DTSTART:${formatDateTime(start)}`);
        if (end) {
            lines.push(`DTEND:${formatDateTime(end)}`);
        }
    }
    
    // Optional fields
    if (event.summary) {
        lines.push(`SUMMARY:${escapeICSText(event.summary)}`);
    }
    
    if (event.description) {
        lines.push(`DESCRIPTION:${escapeICSText(event.description)}`);
    }
    
    if (event.location) {
        lines.push(`LOCATION:${escapeICSText(event.location)}`);
    }
    
    if (event.status) {
        lines.push(`STATUS:${event.status}`);
    }
    
    if (event.organizer) {
        const cn = event.organizer.name ? `;CN=${escapeICSText(event.organizer.name)}` : '';
        lines.push(`ORGANIZER${cn}:mailto:${event.organizer.email}`);
    }
    
    if (event.attendees && event.attendees.length > 0) {
        event.attendees.forEach(attendee => {
            const cn = attendee.name ? `;CN=${escapeICSText(attendee.name)}` : '';
            const role = attendee.role ? `;ROLE=${attendee.role}` : '';
            const status = attendee.status ? `;PARTSTAT=${attendee.status}` : '';
            lines.push(`ATTENDEE${cn}${role}${status}:mailto:${attendee.email}`);
        });
    }
    
    if (event.categories && event.categories.length > 0) {
        lines.push(`CATEGORIES:${event.categories.join(',')}`);
    }
    
    if (event.url) {
        lines.push(`URL:${event.url}`);
    }
    
    lines.push('END:VEVENT');
    
    // Fold long lines
    return lines.map(foldLine).join('\r\n');
}

/**
 * Build complete VCALENDAR from events array
 * @param {Array<Object>} events - Array of event objects
 * @param {string} calendarName - Calendar name
 * @returns {string} Complete ICS file content
 */
export function eventsToICS(events, calendarName = 'Calendar') {
    // Ensure events is an array
    if (!Array.isArray(events)) {
        events = [];
    }
    
    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//TimeView Random Generator//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        `X-WR-CALNAME:${escapeICSText(calendarName)}`,
        'X-WR-TIMEZONE:UTC'
    ];
    
    // Add all events
    events.forEach(event => {
        lines.push(buildVEvent(event));
    });
    
    lines.push('END:VCALENDAR');
    
    return lines.join('\r\n');
}
