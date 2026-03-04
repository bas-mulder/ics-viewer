/**
 * Utility Functions
 * Helper functions used throughout the application
 */

/**
 * Format a date to a readable string
 * @param {Date} date - The date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export function formatDate(date, options = {}) {
    const defaultOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    return new Intl.DateTimeFormat('en-US', { ...defaultOptions, ...options }).format(date);
}

/**
 * Format a time to a readable string
 * @param {Date} date - The date to format
 * @returns {string} Formatted time string
 */
export function formatTime(date) {
    return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    }).format(date);
}

/**
 * Format a date and time to a readable string
 * @param {Date} date - The date to format
 * @returns {string} Formatted date and time string
 */
export function formatDateTime(date) {
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    }).format(date);
}

/**
 * Get the day name from a date
 * @param {Date} date - The date
 * @param {string} format - 'long' or 'short'
 * @returns {string} Day name
 */
export function getDayName(date, format = 'long') {
    return new Intl.DateTimeFormat('en-US', { weekday: format }).format(date);
}

/**
 * Get the month name from a date
 * @param {Date} date - The date
 * @param {string} format - 'long' or 'short'
 * @returns {string} Month name
 */
export function getMonthName(date, format = 'long') {
    return new Intl.DateTimeFormat('en-US', { month: format }).format(date);
}

/**
 * Check if two dates are the same day
 * @param {Date} date1 - First date
 * @param {Date} date2 - Second date
 * @returns {boolean} True if same day
 */
export function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

/**
 * Check if a date is today
 * @param {Date} date - The date to check
 * @returns {boolean} True if today
 */
export function isToday(date) {
    return isSameDay(date, new Date());
}

/**
 * Get the start of a day
 * @param {Date} date - The date
 * @returns {Date} Start of day
 */
export function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

/**
 * Get the end of a day
 * @param {Date} date - The date
 * @returns {Date} End of day
 */
export function endOfDay(date) {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
}

/**
 * Get the start of a week
 * @param {Date} date - The date
 * @param {number} weekStartsOn - 0 (Sunday) or 1 (Monday)
 * @returns {Date} Start of week
 */
export function startOfWeek(date, weekStartsOn = 0) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

/**
 * Get the end of a week
 * @param {Date} date - The date
 * @param {number} weekStartsOn - 0 (Sunday) or 1 (Monday)
 * @returns {Date} End of week
 */
export function endOfWeek(date, weekStartsOn = 0) {
    const d = startOfWeek(date, weekStartsOn);
    d.setDate(d.getDate() + 6);
    d.setHours(23, 59, 59, 999);
    return d;
}

/**
 * Get the start of a month
 * @param {Date} date - The date
 * @returns {Date} Start of month
 */
export function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Get the end of a month
 * @param {Date} date - The date
 * @returns {Date} End of month
 */
export function endOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

/**
 * Add days to a date
 * @param {Date} date - The date
 * @param {number} days - Number of days to add
 * @returns {Date} New date
 */
export function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

/**
 * Add months to a date
 * @param {Date} date - The date
 * @param {number} months - Number of months to add
 * @returns {Date} New date
 */
export function addMonths(date, months) {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
}

/**
 * Get the number of days in a month
 * @param {Date} date - The date
 * @returns {number} Number of days
 */
export function getDaysInMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

/**
 * Get all days in a month (including padding for calendar grid)
 * @param {Date} date - The date in the month
 * @param {number} weekStartsOn - 0 (Sunday) or 1 (Monday)
 * @returns {Array<{date: Date, isCurrentMonth: boolean}>} Array of day objects
 */
export function getMonthDays(date, weekStartsOn = 0) {
    const firstDay = startOfMonth(date);
    const lastDay = endOfMonth(date);
    const days = [];

    // Add previous month days to fill the first week
    const firstDayOfWeek = firstDay.getDay();
    const daysFromPrevMonth = (firstDayOfWeek - weekStartsOn + 7) % 7;
    
    for (let i = daysFromPrevMonth; i > 0; i--) {
        const d = addDays(firstDay, -i);
        days.push({ date: d, isCurrentMonth: false });
    }

    // Add current month days
    const daysInMonth = getDaysInMonth(date);
    for (let i = 0; i < daysInMonth; i++) {
        days.push({ date: addDays(firstDay, i), isCurrentMonth: true });
    }

    // Add next month days to fill the last week
    const remainingDays = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remainingDays; i++) {
        days.push({ date: addDays(lastDay, i), isCurrentMonth: false });
    }

    return days;
}

/**
 * Get hours for a day view (0-23)
 * @returns {Array<number>} Array of hours
 */
export function getDayHours() {
    return Array.from({ length: 24 }, (_, i) => i);
}

/**
 * Format hour for display
 * @param {number} hour - Hour (0-23)
 * @returns {string} Formatted hour
 */
export function formatHour(hour) {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:00 ${period}`;
}

/**
 * Get the week start day based on locale
 * @returns {number} 0 (Sunday) or 1 (Monday)
 */
export function getLocaleWeekStart() {
    // Try to detect from user's locale
    try {
        const locale = new Intl.Locale(navigator.language);
        // Use the weekInfo if available (newer browsers)
        if (locale.weekInfo?.firstDay !== undefined) {
            // weekInfo.firstDay is 1-7 (Monday-Sunday), convert to 0-6
            return locale.weekInfo.firstDay === 7 ? 0 : locale.weekInfo.firstDay;
        }
    } catch (e) {
        // Fallback logic
    }
    
    // Fallback: Use a map of common locales
    const locale = navigator.language.toLowerCase();
    const sundayLocales = ['en-us', 'en-ca', 'ja-jp', 'ko-kr', 'zh-tw'];
    return sundayLocales.some(l => locale.startsWith(l)) ? 0 : 1;
}

/**
 * Save to localStorage
 * @param {string} key - Storage key
 * @param {any} value - Value to store
 */
export function saveToStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.error('Error saving to localStorage:', e);
    }
}

/**
 * Load from localStorage
 * @param {string} key - Storage key
 * @param {any} defaultValue - Default value if not found
 * @returns {any} Stored value or default
 */
export function loadFromStorage(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
        console.error('Error loading from localStorage:', e);
        return defaultValue;
    }
}

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Generate a unique ID
 * @returns {string} Unique ID
 */
export function generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
