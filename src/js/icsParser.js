/**
 * ICS Parser
 * Parses ICS (iCalendar) files according to RFC 5545
 */

/**
 * Parse ICS content into calendar events
 * @param {string} icsContent - Raw ICS file content
 * @returns {Array<Object>} Array of parsed events
 */
export function parseICS(icsContent) {
    // Validate input
    if (!icsContent || typeof icsContent !== 'string') {
        console.error('Invalid ICS content provided to parseICS. Type:', typeof icsContent, 'Value:', icsContent);
        return [];
    }
    
    const events = [];
    const lines = unfoldLines(icsContent);
    
    let currentEvent = null;
    let inEvent = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (!line) continue;

        if (line === 'BEGIN:VEVENT') {
            inEvent = true;
            currentEvent = {
                uid: '',
                summary: '',
                description: '',
                location: '',
                start: null,
                end: null,
                allDay: false,
                raw: {}
            };
        } else if (line === 'END:VEVENT') {
            if (currentEvent && currentEvent.start) {
                events.push(currentEvent);
            }
            inEvent = false;
            currentEvent = null;
        } else if (inEvent && currentEvent) {
            parseEventProperty(line, currentEvent);
        }
    }

    console.log(`Successfully parsed ${events.length} events from ICS content`);
    return events;
}

/**
 * Unfold lines according to ICS specification
 * Lines can be folded by starting the next line with a space or tab
 * @param {string} content - ICS content
 * @returns {Array<string>} Array of unfolded lines
 */
function unfoldLines(content) {
    const lines = content.split(/\r\n|\n|\r/);
    const unfolded = [];
    let currentLine = '';

    for (const line of lines) {
        if (line.startsWith(' ') || line.startsWith('\t')) {
            // Continuation of previous line
            currentLine += line.substring(1);
        } else {
            if (currentLine) {
                unfolded.push(currentLine);
            }
            currentLine = line;
        }
    }

    if (currentLine) {
        unfolded.push(currentLine);
    }

    return unfolded;
}

/**
 * Parse a single event property line
 * @param {string} line - Property line
 * @param {Object} event - Event object to populate
 */
function parseEventProperty(line, event) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) return;

    const fullKey = line.substring(0, colonIndex);
    const value = line.substring(colonIndex + 1);

    // Parse the property name and parameters
    const { property, params } = parsePropertyName(fullKey);

    // Store raw property
    event.raw[property] = value;

    switch (property) {
        case 'UID':
            event.uid = value;
            break;
        case 'SUMMARY':
            event.summary = unescapeText(value);
            break;
        case 'DESCRIPTION':
            event.description = unescapeText(value);
            break;
        case 'LOCATION':
            event.location = unescapeText(value);
            break;
        case 'DTSTART':
            event.start = parseDateTime(value, params);
            event.allDay = params.VALUE === 'DATE';
            break;
        case 'DTEND':
            event.end = parseDateTime(value, params);
            break;
        case 'DURATION':
            if (event.start && !event.end) {
                event.end = parseDuration(event.start, value);
            }
            break;
        case 'ORGANIZER':
            event.organizer = parseOrganizer(value, params);
            break;
        case 'ATTENDEE':
            if (!event.attendees) event.attendees = [];
            event.attendees.push(parseAttendee(value, params));
            break;
        case 'STATUS':
            event.status = value;
            break;
        case 'CATEGORIES':
            event.categories = value.split(',').map(c => c.trim());
            break;
        case 'URL':
            event.url = value;
            break;
    }
}

/**
 * Parse property name and parameters
 * Example: "DTSTART;TZID=America/New_York" -> {property: "DTSTART", params: {TZID: "America/New_York"}}
 * @param {string} fullKey - Full property string with parameters
 * @returns {Object} Object with property name and parameters
 */
function parsePropertyName(fullKey) {
    const parts = fullKey.split(';');
    const property = parts[0];
    const params = {};

    for (let i = 1; i < parts.length; i++) {
        const [key, value] = parts[i].split('=');
        if (key && value) {
            params[key] = value;
        }
    }

    return { property, params };
}

/**
 * Parse ICS date/time string to JavaScript Date
 * Formats: 
 *   - YYYYMMDD (date only)
 *   - YYYYMMDDTHHMMSS (local time)
 *   - YYYYMMDDTHHMMSSZ (UTC time)
 * @param {string} dateString - ICS date string
 * @param {Object} params - Property parameters
 * @returns {Date} JavaScript Date object
 */
function parseDateTime(dateString, params = {}) {
    if (!dateString) return null;

    // Remove any timezone ID for now (basic implementation)
    const cleanDate = dateString.replace(/TZID=[^:]+:/, '');

    // Date only format: YYYYMMDD
    if (cleanDate.length === 8) {
        const year = parseInt(cleanDate.substring(0, 4), 10);
        const month = parseInt(cleanDate.substring(4, 6), 10) - 1;
        const day = parseInt(cleanDate.substring(6, 8), 10);
        return new Date(year, month, day, 0, 0, 0);
    }

    // DateTime format: YYYYMMDDTHHMMSS or YYYYMMDDTHHMMSSZ
    const isUTC = cleanDate.endsWith('Z');
    const dateTimeParts = cleanDate.replace('Z', '').split('T');
    
    if (dateTimeParts.length !== 2) return null;

    const datePart = dateTimeParts[0];
    const timePart = dateTimeParts[1];

    const year = parseInt(datePart.substring(0, 4), 10);
    const month = parseInt(datePart.substring(4, 6), 10) - 1;
    const day = parseInt(datePart.substring(6, 8), 10);
    const hour = parseInt(timePart.substring(0, 2), 10);
    const minute = parseInt(timePart.substring(2, 4), 10);
    const second = parseInt(timePart.substring(4, 6), 10) || 0;

    if (isUTC) {
        return new Date(Date.UTC(year, month, day, hour, minute, second));
    } else {
        return new Date(year, month, day, hour, minute, second);
    }
}

/**
 * Parse duration and add to start date
 * Format: P[n]D (days), PT[n]H[n]M[n]S (time)
 * @param {Date} startDate - Start date
 * @param {string} duration - Duration string
 * @returns {Date} End date
 */
function parseDuration(startDate, duration) {
    const endDate = new Date(startDate);
    
    // Simple duration parsing (basic implementation)
    const dayMatch = duration.match(/P(\d+)D/);
    const hourMatch = duration.match(/(\d+)H/);
    const minuteMatch = duration.match(/(\d+)M/);
    
    if (dayMatch) {
        endDate.setDate(endDate.getDate() + parseInt(dayMatch[1], 10));
    }
    if (hourMatch) {
        endDate.setHours(endDate.getHours() + parseInt(hourMatch[1], 10));
    }
    if (minuteMatch) {
        endDate.setMinutes(endDate.getMinutes() + parseInt(minuteMatch[1], 10));
    }
    
    return endDate;
}

/**
 * Parse organizer information
 * @param {string} value - Organizer value
 * @param {Object} params - Parameters
 * @returns {Object} Organizer object
 */
function parseOrganizer(value, params) {
    return {
        email: value.replace('mailto:', ''),
        name: params.CN || null
    };
}

/**
 * Parse attendee information
 * @param {string} value - Attendee value
 * @param {Object} params - Parameters
 * @returns {Object} Attendee object
 */
function parseAttendee(value, params) {
    return {
        email: value.replace('mailto:', ''),
        name: params.CN || null,
        role: params.ROLE || null,
        status: params.PARTSTAT || null
    };
}

/**
 * Unescape text according to ICS specification
 * @param {string} text - Escaped text
 * @returns {string} Unescaped text
 */
function unescapeText(text) {
    return text
        .replace(/\\n/g, '\n')
        .replace(/\\,/g, ',')
        .replace(/\\;/g, ';')
        .replace(/\\\\/g, '\\');
}

/**
 * Load ICS from a file
 * @param {File} file - File object
 * @returns {Promise<Array<Object>>} Promise resolving to array of events
 */
/**
 * Load ICS from a file
 * @param {File} file - File object from input
 * @returns {Promise<string>} Promise resolving to raw ICS content
 */
export async function loadICSFromFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const content = e.target.result;
                resolve(content);
            } catch (error) {
                reject(new Error(`Failed to read ICS file: ${error.message}`));
            }
        };
        
        reader.onerror = () => {
            reject(new Error('Failed to read file'));
        };
        
        reader.readAsText(file);
    });
}

/**
 * Load ICS from a URL
 * @param {string} url - URL to ICS file
 * @param {boolean} useCorsProxy - Whether to use a CORS proxy (default: false)
 * @returns {Promise<string>} Promise resolving to raw ICS content
 */
export async function loadICSFromURL(url, useCorsProxy = false) {
    try {
        // If CORS proxy is requested, prepend the proxy URL
        const fetchUrl = useCorsProxy 
            ? `https://corsproxy.io/?${encodeURIComponent(url)}`
            : url;
        
        const response = await fetch(fetchUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const content = await response.text();
        return content;
    } catch (error) {
        if (error.message.includes('CORS') || error.name === 'TypeError') {
            // If not already using proxy, suggest trying with proxy
            if (!useCorsProxy) {
                throw new Error('CORS_ERROR'); // Special error code for retry with proxy
            }
            throw new Error('Failed to load calendar: CORS policy prevents loading from this URL. Try uploading the file instead.');
        }
        throw new Error(`Failed to load calendar from URL: ${error.message}`);
    }
}

/**
 * Validate ICS content
 * @param {string} content - ICS content
 * @returns {boolean} True if valid
 */
export function validateICS(content) {
    if (!content || typeof content !== 'string') {
        return false;
    }
    
    // Basic validation: must contain VCALENDAR
    return content.includes('BEGIN:VCALENDAR') && 
           content.includes('END:VCALENDAR');
}
