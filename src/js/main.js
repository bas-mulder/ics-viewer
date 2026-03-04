/**
 * Main Application Controller
 * Orchestrates the ICS Calendar Viewer application
 */

import { loadICSFromFile, loadICSFromURL, parseICS } from './icsParser.js';
import { Calendar } from './calendar.js';
import { EventModal } from './eventModal.js';
import { EventForm } from './eventForm.js';
import { getLocaleWeekStart, loadFromStorage, saveToStorage } from './utils.js';
import { generateRandomEvents } from './randomGenerator.js';
import { eventsToICS } from './icsBuilder.js';

class ICSViewerApp {
    constructor() {
        this.calendar = null;
        this.calendars = []; // Array of { id, name, events, color, visible, source, icsData }
        this.nextCalendarId = 1;
        this.weekStartsOn = this.loadWeekStartPreference();
        this.currentTheme = this.loadThemePreference();
        this.randomCalendar = null; // Stores random calendar config if viewing one
        this.isRandomCalendarView = false; // Flag for random calendar mode
        
        this.initializeTheme();
        this.initializeElements();
        this.setupEventListeners();
        this.initializeModals();
        this.loadCalendarListState(); // Load calendar list collapsed state
        
        // Check for random calendar first
        this.handleRandomCalendarInit();
    }

    /**
     * Generate a random color
     */
    generateRandomColor() {
        // Generate a vibrant color with good saturation and lightness
        const hue = Math.floor(Math.random() * 360);
        const saturation = 65 + Math.floor(Math.random() * 20); // 65-85%
        const lightness = 45 + Math.floor(Math.random() * 15); // 45-60%
        
        // Convert HSL to hex
        const h = hue / 360;
        const s = saturation / 100;
        const l = lightness / 100;
        
        const hslToRgb = (h, s, l) => {
            let r, g, b;
            
            if (s === 0) {
                r = g = b = l;
            } else {
                const hue2rgb = (p, q, t) => {
                    if (t < 0) t += 1;
                    if (t > 1) t -= 1;
                    if (t < 1/6) return p + (q - p) * 6 * t;
                    if (t < 1/2) return q;
                    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                    return p;
                };
                
                const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                const p = 2 * l - q;
                r = hue2rgb(p, q, h + 1/3);
                g = hue2rgb(p, q, h);
                b = hue2rgb(p, q, h - 1/3);
            }
            
            return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
        };
        
        const [r, g, b] = hslToRgb(h, s, l);
        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }

    /**
     * Initialize DOM element references
     */
    initializeElements() {
        // Sections
        this.uploadSection = document.getElementById('uploadSection');
        this.calendarSection = document.getElementById('calendarSection');
        
        // Upload controls
        this.fileInput = document.getElementById('fileInput');
        this.fileSelectBtn = document.getElementById('fileSelectBtn');
        this.fileDropZone = document.getElementById('fileDropZone');
        this.urlInput = document.getElementById('urlInput');
        this.urlLoadBtn = document.getElementById('urlLoadBtn');
        
        // Calendar controls
        this.calendarGrid = document.getElementById('calendarGrid');
        this.calendarTitle = document.getElementById('calendarTitle');
        this.calendarList = document.getElementById('calendarList');
        this.calendarListContainer = document.querySelector('.calendar-list-container');
        this.calendarListToggle = document.getElementById('calendarListToggle');
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.todayBtn = document.getElementById('todayBtn');
        this.loadNewBtn = document.getElementById('loadNewBtn');
        this.addCalendarBtn = document.getElementById('addCalendarBtn');
        this.addEventBtn = document.getElementById('addEventBtn');
        this.viewBtns = document.querySelectorAll('.view-btn');
        
        // Settings
        this.settingsBtn = document.getElementById('settingsBtn');
        this.settingsModal = document.getElementById('settingsModal');
        this.settingsCloseBtn = document.getElementById('settingsCloseBtn');
        this.weekStartSelect = document.getElementById('weekStartSelect');
        
        // Theme toggle
        this.themeToggleBtn = document.getElementById('themeToggleBtn');
        
        // UI feedback
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.errorToast = document.getElementById('errorToast');
        this.errorMessage = document.getElementById('errorMessage');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.successToast = document.getElementById('successToast');
        
        // Context menu
        this.contextMenu = document.getElementById('contextMenu');
        this.contextAddEvent = document.getElementById('contextAddEvent');
        this.contextEditEvent = document.getElementById('contextEditEvent');
        this.contextDeleteEvent = document.getElementById('contextDeleteEvent');
        this.contextMenuData = null; // Stores date/time data for context menu
        this.contextMenuEvent = null; // Stores event data for context menu
        
        // Random calendar modal
        this.generateRandomBtn = document.getElementById('generateRandomBtn');
        this.randomCalendarModal = document.getElementById('randomCalendarModal');
        this.randomModalCloseBtn = document.getElementById('randomModalCloseBtn');
        this.randomConfigForm = document.getElementById('randomConfigForm');
        this.generatePreviewBtn = document.getElementById('generatePreviewBtn');
        this.randomPreview = document.getElementById('randomPreview');
        this.regenerateBtn = document.getElementById('regenerateBtn');
        this.addRandomCalendarBtn = document.getElementById('addRandomCalendarBtn');
        this.previewEvents = document.getElementById('previewEvents');
        
        // Random calendar form inputs
        this.randomCalendarName = document.getElementById('randomCalendarName');
        this.randomEventCount = document.getElementById('randomEventCount');
        this.randomSeed = document.getElementById('randomSeed');
        this.randomDaysBefore = document.getElementById('randomDaysBefore');
        this.randomDaysAfter = document.getElementById('randomDaysAfter');
        this.typeMeeting = document.getElementById('typeMeeting');
        this.typeAppointment = document.getElementById('typeAppointment');
        this.typeAllday = document.getElementById('typeAllday');
        this.typeMultiday = document.getElementById('typeMultiday');
        
        // Store generated events for preview
        this.generatedEvents = null;
        this.generatedConfig = null;
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // File upload
        this.fileSelectBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent event bubbling to drop zone
            this.fileInput.click();
        });
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        // Drag and drop
        this.fileDropZone.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.fileDropZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.fileDropZone.addEventListener('drop', (e) => this.handleDrop(e));
        this.fileDropZone.addEventListener('click', (e) => {
            // Only trigger file input if not clicking on a button
            if (!e.target.closest('button')) {
                this.fileInput.click();
            }
        });
        
        // URL input
        this.urlLoadBtn.addEventListener('click', () => this.handleURLLoad());
        this.urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleURLLoad();
            }
        });
        
        // Calendar navigation
        this.prevBtn.addEventListener('click', () => this.navigatePrevious());
        this.nextBtn.addEventListener('click', () => this.navigateNext());
        this.todayBtn.addEventListener('click', () => this.navigateToday());
        this.loadNewBtn.addEventListener('click', () => this.showUploadSection());
        this.addCalendarBtn.addEventListener('click', () => {
            if (this.isRandomCalendarView) {
                this.addRandomCalendarToCollection();
            } else {
                this.showUploadSection();
            }
        });
        
        // Add event button
        if (this.addEventBtn) {
            this.addEventBtn.addEventListener('click', () => this.openAddEventForm());
        }
        
        // Download button
        if (this.downloadBtn) {
            this.downloadBtn.addEventListener('click', () => this.downloadCalendar());
        }
        
        // Calendar list toggle
        this.calendarListToggle.addEventListener('click', () => this.toggleCalendarList());
        
        // View switcher
        this.viewBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.switchView(e.target.dataset.view));
        });
        
        // Settings
        this.settingsBtn.addEventListener('click', () => this.showSettings());
        this.settingsCloseBtn.addEventListener('click', () => this.hideSettings());
        this.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.settingsModal) {
                this.hideSettings();
            }
        });
        this.weekStartSelect.addEventListener('change', (e) => this.handleWeekStartChange(e));
        
        // Theme toggle
        this.themeToggleBtn.addEventListener('click', () => this.toggleTheme());
        
        // Random calendar modal
        this.generateRandomBtn.addEventListener('click', () => this.showRandomCalendarModal());
        this.randomModalCloseBtn.addEventListener('click', () => this.hideRandomCalendarModal());
        this.randomCalendarModal.addEventListener('click', (e) => {
            if (e.target === this.randomCalendarModal) {
                this.hideRandomCalendarModal();
            }
        });
        this.generatePreviewBtn.addEventListener('click', () => this.generateRandomPreview());
        this.regenerateBtn.addEventListener('click', () => this.generateRandomPreview());
        this.addRandomCalendarBtn.addEventListener('click', () => this.addGeneratedCalendar());
        
        // Context menu
        if (this.contextAddEvent) {
            this.contextAddEvent.addEventListener('click', () => this.handleContextAddEvent());
        }
        if (this.contextEditEvent) {
            this.contextEditEvent.addEventListener('click', () => this.handleContextEditEvent());
        }
        if (this.contextDeleteEvent) {
            this.contextDeleteEvent.addEventListener('click', () => this.handleContextDeleteEvent());
        }
        document.addEventListener('click', () => this.hideContextMenu());
        document.addEventListener('contextmenu', (e) => this.handleRightClick(e));
        
        // Handle browser back/forward navigation
        window.addEventListener('popstate', (e) => this.handlePopState(e));
        
        // Initialize week start select
        this.updateWeekStartSelect();
    }

    /**
     * Initialize modals
     */
    initializeModals() {
        const eventModalEl = document.getElementById('eventModal');
        this.eventModal = new EventModal(eventModalEl);
        
        // Initialize event form
        this.eventForm = new EventForm((eventData, isEdit, originalEvent) => {
            this.handleEventSave(eventData, isEdit, originalEvent);
        });
    }

    /**
     * Initialize theme on app start
     */
    initializeTheme() {
        document.documentElement.setAttribute('data-theme', this.currentTheme);
    }

    /**
     * Load theme preference
     */
    loadThemePreference() {
        return loadFromStorage('theme', 'light');
    }

    /**
     * Toggle theme between light and dark
     */
    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        saveToStorage('theme', this.currentTheme);
    }

    /**
     * Load week start preference
     */
    loadWeekStartPreference() {
        const saved = loadFromStorage('weekStartsOn', 'auto');
        if (saved === 'auto') {
            return getLocaleWeekStart();
        }
        return parseInt(saved, 10);
    }

    /**
     * Update week start select to reflect current setting
     */
    updateWeekStartSelect() {
        const saved = loadFromStorage('weekStartsOn', 'auto');
        this.weekStartSelect.value = saved;
    }

    /**
     * Handle week start day change
     */
    handleWeekStartChange(e) {
        const value = e.target.value;
        saveToStorage('weekStartsOn', value);
        
        if (value === 'auto') {
            this.weekStartsOn = getLocaleWeekStart();
        } else {
            this.weekStartsOn = parseInt(value, 10);
        }
        
        if (this.calendar) {
            this.calendar.setWeekStartsOn(this.weekStartsOn);
            this.updateCalendarTitle();
        }
    }

    /**
     * Initialize and handle random calendar from URL params
     */
    async handleRandomCalendarInit() {
        const randomConfig = this.parseRandomParams();
        if (randomConfig) {
            await this.handleRandomCalendar(randomConfig);
        } else {
            // Normal flow: load saved calendars and URL parameter
            this.loadCalendarsFromStorage();
            
            // Check if there's a URL parameter calendar to load
            const urlParams = new URLSearchParams(window.location.search);
            const calendarURL = urlParams.get('calendar');
            
            if (calendarURL) {
                // Load calendar from URL parameter
                await this.loadFromURLParameter();
            } else if (this.calendars.length > 0) {
                // If there are saved calendars and no URL parameter, show calendar view
                this.showCalendar();
            }
            // Otherwise, stay on upload section (default)
        }
    }

    /**
     * Parse random calendar generation parameters from URL
     */
    parseRandomParams() {
        const params = new URLSearchParams(window.location.search);
        
        if (params.get('random') !== 'true') {
            return null;
        }
        
        // Parse and validate parameters
        const seed = parseInt(params.get('seed')) || Date.now();
        const count = Math.min(200, Math.max(1, parseInt(params.get('count')) || 20));
        const daysBefore = Math.max(0, parseInt(params.get('daysBefore')) || 30);
        const daysAfter = Math.max(0, parseInt(params.get('daysAfter')) || 30);
        const name = params.get('name') || 'Random Calendar';
        
        // Parse event types
        const typesParam = params.get('types');
        const validTypes = ['meeting', 'appointment', 'allday', 'multiday'];
        let types = validTypes; // Default: all types
        
        if (typesParam) {
            const requestedTypes = typesParam.split(',').map(t => t.trim().toLowerCase());
            types = requestedTypes.filter(t => validTypes.includes(t));
            if (types.length === 0) types = validTypes; // Fallback if all invalid
        }
        
        // Check for special modes
        const download = params.get('download') === 'true';
        const preview = params.get('preview') === 'ics';
        const merge = params.get('merge') === 'true';
        
        return {
            seed,
            count,
            daysBefore,
            daysAfter,
            types,
            name,
            download,
            preview,
            merge
        };
    }

    /**
     * Handle random calendar generation based on URL parameters
     */
    async handleRandomCalendar(config) {
        this.showLoading();
        
        try {
            // Generate events
            const events = await generateRandomEvents(config);
            const icsData = eventsToICS(events, config.name);
            
            // Handle different modes
            if (config.download) {
                // Trigger download, then redirect to viewer
                this.triggerICSDownload(icsData, config.name);
                
                // Wait a moment, then redirect to viewer (without download param)
                setTimeout(() => {
                    const url = new URL(window.location);
                    url.searchParams.delete('download');
                    window.location.href = url.toString();
                }, 500);
                return;
            }
            
            if (config.preview) {
                // Show raw ICS in page
                this.showICSPreview(icsData, config.name);
                this.hideLoading();
                return;
            }
            
            // Display mode: Show in calendar viewer
            this.isRandomCalendarView = true;
            this.randomCalendar = { config, events, icsData };
            
            if (config.merge) {
                // Merge with localStorage calendars
                this.loadCalendarsFromStorage(); // Load existing
                this.addCalendar(config.name, events, `random:${config.seed}`, icsData);
            } else {
                // Isolated mode: only show random calendar
                this.calendars = []; // Don't load from storage
                this.addCalendar(config.name, events, `random:${config.seed}`, icsData);
            }
            
            this.showCalendar();
            this.hideLoading();
            
        } catch (error) {
            console.error('Failed to generate random calendar:', error);
            this.hideLoading();
            this.showError('Failed to generate random calendar: ' + error.message);
        }
    }

    /**
     * Trigger download of ICS file
     */
    triggerICSDownload(icsContent, calendarName) {
        const blob = new Blob([icsContent], { 
            type: 'text/calendar;charset=utf-8' 
        });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        
        // Generate filename: calendar-name-timestamp.ics
        const filename = `${calendarName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${Date.now()}.ics`;
        link.download = filename;
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Cleanup
        URL.revokeObjectURL(link.href);
    }

    /**
     * Display raw ICS content as plain text
     */
    showICSPreview(icsContent, calendarName) {
        // Hide normal sections
        this.uploadSection.classList.add('hidden');
        this.calendarSection.classList.add('hidden');
        
        // Create or update preview container
        let previewContainer = document.getElementById('icsPreview');
        if (!previewContainer) {
            // Create if doesn't exist
            previewContainer = document.createElement('div');
            previewContainer.id = 'icsPreview';
            previewContainer.className = 'ics-preview-container';
            document.querySelector('.app-main').appendChild(previewContainer);
        }
        
        previewContainer.innerHTML = `
            <div class="container">
                <div class="ics-preview-header">
                    <h2>ICS Preview: ${this.escapeHtml(calendarName)}</h2>
                    <div class="ics-preview-actions">
                        <button class="btn btn-primary" id="downloadPreviewBtn">Download ICS</button>
                        <button class="btn btn-secondary" id="viewPreviewBtn">View in Calendar</button>
                    </div>
                </div>
                <pre class="ics-preview-content"><code>${this.escapeHtml(icsContent)}</code></pre>
            </div>
        `;
        
        previewContainer.classList.remove('hidden');
        
        // Add event listeners
        document.getElementById('downloadPreviewBtn').addEventListener('click', () => {
            this.triggerICSDownload(icsContent, calendarName);
        });
        
        document.getElementById('viewPreviewBtn').addEventListener('click', () => {
            const url = new URL(window.location);
            url.searchParams.delete('preview');
            window.location.href = url.toString();
        });
    }

    /**
     * Show random calendar generator modal
     */
    showRandomCalendarModal() {
        this.randomCalendarModal.classList.remove('hidden');
        this.randomPreview.classList.add('hidden');
        this.randomConfigForm.classList.remove('hidden');
        // Reset form to defaults if no generated events
        if (!this.generatedEvents) {
            this.randomSeed.value = '';
        }
    }

    /**
     * Hide random calendar generator modal
     */
    hideRandomCalendarModal() {
        this.randomCalendarModal.classList.add('hidden');
    }

    /**
     * Generate random calendar preview
     */
    async generateRandomPreview() {
        try {
            // Get form values
            const config = this.getRandomCalendarConfig();
            
            // Validate at least one event type is selected
            if (config.types.length === 0) {
                this.showError('Please select at least one event type');
                return;
            }
            
            // Generate events
            this.showLoading();
            const events = await generateRandomEvents(config);
            
            // Store for later use
            this.generatedEvents = events;
            this.generatedConfig = config;
            
            // Show preview
            this.renderRandomPreview(events, config);
            this.hideLoading();
            
            // Show preview section, hide form
            this.randomConfigForm.classList.add('hidden');
            this.randomPreview.classList.remove('hidden');
            
        } catch (error) {
            console.error('Failed to generate random calendar:', error);
            this.hideLoading();
            this.showError('Failed to generate random calendar: ' + error.message);
        }
    }

    /**
     * Get random calendar configuration from form
     */
    getRandomCalendarConfig() {
        const types = [];
        if (this.typeMeeting.checked) types.push('meeting');
        if (this.typeAppointment.checked) types.push('appointment');
        if (this.typeAllday.checked) types.push('allday');
        if (this.typeMultiday.checked) types.push('multiday');
        
        return {
            seed: this.randomSeed.value ? parseInt(this.randomSeed.value) : Date.now(),
            count: Math.min(200, Math.max(1, parseInt(this.randomEventCount.value) || 20)),
            daysBefore: Math.max(0, parseInt(this.randomDaysBefore.value) || 30),
            daysAfter: Math.max(0, parseInt(this.randomDaysAfter.value) || 60),
            name: this.randomCalendarName.value.trim() || 'Test Calendar',
            types: types
        };
    }

    /**
     * Render random calendar preview
     */
    renderRandomPreview(events, config) {
        // Update preview info
        document.getElementById('previewCalendarName').textContent = config.name;
        document.getElementById('previewEventCount').textContent = events.length;
        
        // Calculate date range
        if (events.length > 0) {
            const dates = events.map(e => new Date(e.start)).sort((a, b) => a - b);
            const minDate = dates[0];
            const maxDate = dates[dates.length - 1];
            const dateRange = `${this.formatDate(minDate)} - ${this.formatDate(maxDate)}`;
            document.getElementById('previewDateRange').textContent = dateRange;
        } else {
            document.getElementById('previewDateRange').textContent = 'No events';
        }
        
        // Render event list (first 10 events)
        const previewCount = Math.min(10, events.length);
        const sortedEvents = [...events].sort((a, b) => new Date(a.start) - new Date(b.start));
        
        let html = '<div class="preview-event-list">';
        for (let i = 0; i < previewCount; i++) {
            const event = sortedEvents[i];
            const startDate = new Date(event.start);
            const endDate = event.end ? new Date(event.end) : null;
            
            html += `
                <div class="preview-event-item">
                    <div class="preview-event-date">${this.formatEventDate(startDate, endDate)}</div>
                    <div class="preview-event-title">${this.escapeHtml(event.summary)}</div>
                    ${event.location ? `<div class="preview-event-location">${this.escapeHtml(event.location)}</div>` : ''}
                </div>
            `;
        }
        
        if (events.length > previewCount) {
            html += `<div class="preview-event-more">... and ${events.length - previewCount} more events</div>`;
        }
        
        html += '</div>';
        this.previewEvents.innerHTML = html;
    }

    /**
     * Format event date for preview
     */
    formatEventDate(startDate, endDate) {
        const options = { month: 'short', day: 'numeric', year: 'numeric' };
        const startStr = startDate.toLocaleDateString(undefined, options);
        
        if (!endDate || startDate.toDateString() === endDate.toDateString()) {
            // Same day or no end date
            const timeStr = startDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
            return `${startStr} at ${timeStr}`;
        } else {
            // Multi-day event
            const endStr = endDate.toLocaleDateString(undefined, options);
            return `${startStr} - ${endStr}`;
        }
    }

    /**
     * Format date for display
     */
    formatDate(date) {
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    }

    /**
     * Add generated random calendar to calendars collection
     */
    async addGeneratedCalendar() {
        if (!this.generatedEvents || !this.generatedConfig) {
            this.showError('No calendar generated. Please generate a preview first.');
            return;
        }
        
        try {
            // Load existing calendars from storage first to avoid overwriting
            // Only load if calendars array is empty (hasn't been loaded yet)
            if (this.calendars.length === 0) {
                this.loadCalendarsFromStorage();
            }
            
            // Convert events to ICS
            const icsData = eventsToICS(this.generatedEvents, this.generatedConfig.name);
            
            // Add to calendars
            this.addCalendar(
                this.generatedConfig.name,
                this.generatedEvents,
                `random:${this.generatedConfig.seed}`,
                icsData
            );
            
            // Save to storage
            this.saveCalendarsToStorage();
            
            // Hide modal
            this.hideRandomCalendarModal();
            
            // Show calendar section if not already shown
            if (this.uploadSection && !this.uploadSection.classList.contains('hidden')) {
                this.showCalendar();
            } else {
                // Just update the display
                this.renderCalendarList();
                this.updateVisibleEvents();
            }
            
            // Show success message
            this.showSuccess(`Calendar "${this.generatedConfig.name}" added successfully!`);
            
            // Clear generated data
            this.generatedEvents = null;
            this.generatedConfig = null;
            
        } catch (error) {
            console.error('Failed to add random calendar:', error);
            this.showError('Failed to add calendar: ' + error.message);
        }
    }

    /**
     * Add a calendar to the collection
     */
    addCalendar(name, events, source, icsData) {
        const id = this.nextCalendarId++;
        const color = this.generateRandomColor();
        
        const calendar = {
            id,
            name,
            events,
            color,
            visible: true,
            source,
            icsData
        };
        
        this.calendars.push(calendar);
        return calendar;
    }

    /**
     * Remove a calendar from the collection
     */
    removeCalendar(id) {
        const index = this.calendars.findIndex(cal => cal.id === id);
        if (index !== -1) {
            this.calendars.splice(index, 1);
            this.saveCalendarsToStorage();
            this.renderCalendarList();
            this.updateVisibleEvents();
        }
    }

    /**
     * Load calendars from localStorage
     */
    loadCalendarsFromStorage() {
        try {
            const saved = loadFromStorage('calendars', null);
            if (saved && Array.isArray(saved)) {
                // Restore calendars and convert date strings back to Date objects
                this.calendars = saved.map(cal => {
                    // Convert event date strings back to Date objects
                    if (cal.events && Array.isArray(cal.events)) {
                        cal.events = cal.events.map(event => {
                            if (event.start && typeof event.start === 'string') {
                                event.start = new Date(event.start);
                            }
                            if (event.end && typeof event.end === 'string') {
                                event.end = new Date(event.end);
                            }
                            return event;
                        });
                    }
                    return cal;
                });
                
                // Restore nextCalendarId
                if (this.calendars.length > 0) {
                    this.nextCalendarId = Math.max(...this.calendars.map(c => c.id)) + 1;
                }
            }
        } catch (error) {
            console.error('Failed to load calendars from storage:', error);
        }
    }

    /**
     * Save calendars to localStorage
     */
    saveCalendarsToStorage() {
        // Don't save if in random calendar view mode (isolated)
        if (this.isRandomCalendarView && !this.randomCalendar?.config?.merge) {
            return;
        }
        
        try {
            saveToStorage('calendars', this.calendars);
        } catch (error) {
            console.error('Failed to save calendars to storage:', error);
            this.showError('Failed to save calendars');
        }
    }

    /**
     * Render the calendar list in the sidebar
     */
    renderCalendarList() {
        if (!this.calendarList) return;
        
        if (this.calendars.length === 0) {
            this.calendarList.innerHTML = '<p class="calendar-list-empty">No calendars loaded</p>';
            return;
        }
        
        this.calendarList.innerHTML = this.calendars.map(cal => `
            <div class="calendar-list-item" data-calendar-id="${cal.id}">
                <input type="color" class="calendar-color-picker" value="${cal.color}" data-calendar-id="${cal.id}" title="Change calendar color">
                <div class="calendar-info">
                    <div class="calendar-name">${this.escapeHtml(cal.name)}</div>
                    <div class="calendar-source">${this.formatCalendarSource(cal.source)}</div>
                </div>
                <div class="calendar-actions">
                    <button class="calendar-toggle" data-action="toggle" data-calendar-id="${cal.id}" title="${cal.visible ? 'Hide' : 'Show'} calendar">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            ${cal.visible ? 
                                '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>' : 
                                '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>'
                            }
                        </svg>
                    </button>
                    <button class="calendar-remove" data-action="remove" data-calendar-id="${cal.id}" title="Remove calendar">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `).join('');
        
        // Add event listeners for color pickers
        this.calendarList.querySelectorAll('.calendar-color-picker').forEach(picker => {
            picker.addEventListener('change', (e) => {
                const id = parseInt(picker.dataset.calendarId);
                this.changeCalendarColor(id, e.target.value);
            });
        });
        
        // Add event listeners for toggle buttons
        this.calendarList.querySelectorAll('[data-action="toggle"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = parseInt(btn.dataset.calendarId);
                this.toggleCalendarVisibility(id);
            });
        });
        
        // Add event listeners for remove buttons
        this.calendarList.querySelectorAll('[data-action="remove"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = parseInt(btn.dataset.calendarId);
                if (confirm('Are you sure you want to remove this calendar?')) {
                    this.removeCalendar(id);
                }
            });
        });
    }

    /**
     * Format calendar source for display
     */
    formatCalendarSource(source) {
        if (source.startsWith('file:')) {
            return 'Uploaded file';
        } else if (source.startsWith('url:')) {
            return 'From URL';
        } else if (source.startsWith('random:')) {
            return 'Random calendar';
        }
        return 'Unknown source';
    }

    /**
     * Toggle calendar visibility
     */
    toggleCalendarVisibility(id) {
        const calendar = this.calendars.find(cal => cal.id === id);
        if (calendar) {
            calendar.visible = !calendar.visible;
            this.saveCalendarsToStorage();
            this.renderCalendarList();
            this.updateVisibleEvents();
        }
    }

    /**
     * Change calendar color
     */
    changeCalendarColor(id, newColor) {
        const calendar = this.calendars.find(cal => cal.id === id);
        if (calendar) {
            calendar.color = newColor;
            this.saveCalendarsToStorage();
            // Clear events first, then update to force a complete re-render
            this.calendar.setEvents([]);
            // Use setTimeout to ensure the clear happens before the update
            setTimeout(() => {
                this.updateVisibleEvents();
            }, 0);
        }
    }

    /**
     * Update visible events in the calendar view
     */
    updateVisibleEvents() {
        if (!this.calendar) return;
        
        // Collect all events from visible calendars
        const allEvents = [];
        this.calendars.forEach(cal => {
            if (cal.visible && cal.events) {
                // Add calendar color and id to each event
                cal.events.forEach(event => {
                    allEvents.push({
                        ...event,
                        color: cal.color,
                        calendarId: cal.id,
                        calendarName: cal.name
                    });
                });
            }
        });
        
        // Update the calendar with all visible events
        this.calendar.setEvents(allEvents);
        this.updateCalendarTitle();
    }

    /**
     * Open the event form to add a new event
     */
    openAddEventForm(prefilledData = {}) {
        if (!this.eventForm) {
            console.error('Event form not initialized');
            return;
        }
        
        // If no calendars exist, create a default one
        if (this.calendars.length === 0) {
            const defaultCalendar = this.addCalendar('My Calendar', [], 'local:', '');
            this.saveCalendarsToStorage();
            this.renderCalendarList();
        }
        
        this.eventForm.openForNew(prefilledData, this.calendars);
    }

    /**
     * Handle saving an event (create or edit)
     */
    handleEventSave(eventData, isEdit, originalEvent) {
        if (isEdit && originalEvent) {
            // Edit existing event
            this.updateEvent(originalEvent, eventData);
        } else {
            // Create new event
            this.createNewEvent(eventData);
        }
    }

    /**
     * Create a new event and add it to the specified calendar
     */
    createNewEvent(eventData) {
        // Find the target calendar by ID
        let targetCalendar = this.calendars.find(cal => cal.id === parseInt(eventData.calendarId));
        
        if (!targetCalendar) {
            // Fallback to first calendar if calendar not found
            targetCalendar = this.calendars[0];
            
            if (!targetCalendar) {
                targetCalendar = this.addCalendar('My Calendar', [], 'local:', '');
            }
        }
        
        // Remove calendarId from event data (it's not part of the event structure)
        const { calendarId, ...eventWithoutCalendarId } = eventData;
        
        // Add the new event
        targetCalendar.events.push(eventWithoutCalendarId);
        
        // Regenerate ICS data for the calendar
        targetCalendar.icsData = eventsToICS(targetCalendar.events, targetCalendar.name);
        
        // Save and update display
        this.saveCalendarsToStorage();
        this.updateVisibleEvents();
        
        this.showSuccess('Event added successfully');
    }

    /**
     * Update an existing event
     */
    updateEvent(originalEvent, newEventData) {
        // Find the source calendar containing the event
        let sourceCalendar = null;
        let eventIndex = -1;
        
        for (const calendar of this.calendars) {
            eventIndex = calendar.events.findIndex(e => e.uid === originalEvent.uid);
            if (eventIndex !== -1) {
                sourceCalendar = calendar;
                break;
            }
        }
        
        if (!sourceCalendar || eventIndex === -1) {
            this.showError('Event not found');
            return;
        }

        const targetCalendarId = Number(newEventData.calendarId);
        const targetCalendar = this.calendars.find((cal) => cal.id === targetCalendarId) || sourceCalendar;
        const { calendarId, ...eventWithoutCalendarId } = newEventData;

        // If calendar changed, move event between calendars
        if (targetCalendar.id !== sourceCalendar.id) {
            const updatedEvent = {
                ...sourceCalendar.events[eventIndex],
                ...eventWithoutCalendarId
            };

            sourceCalendar.events.splice(eventIndex, 1);
            targetCalendar.events.push(updatedEvent);

            sourceCalendar.icsData = eventsToICS(sourceCalendar.events, sourceCalendar.name);
            targetCalendar.icsData = eventsToICS(targetCalendar.events, targetCalendar.name);
        } else {
            // Update event in-place
            sourceCalendar.events[eventIndex] = {
                ...sourceCalendar.events[eventIndex],
                ...eventWithoutCalendarId
            };

            sourceCalendar.icsData = eventsToICS(sourceCalendar.events, sourceCalendar.name);
        }
        
        // Save and update display
        this.saveCalendarsToStorage();
        this.updateVisibleEvents();
        
        this.showSuccess('Event updated successfully');
    }

    /**
     * Handle right-click on calendar cells
     */
    handleRightClick(e) {
        // Check if right-click is on an event element first
        const eventEl = e.target.closest('.event-item, .week-event-item');
        if (eventEl && eventEl.__eventData) {
            if (!this.uploadSection.classList.contains('hidden')) {
                e.preventDefault();
                this.contextMenuEvent = eventEl.__eventData;
                this.contextMenuData = null;
                this.showContextMenuOptions('event');
                this.showContextMenu(e.clientX, e.clientY);
                return;
            }
        }

        // Check if right-click is on a calendar cell
        const dayCell = e.target.closest('.calendar-day, .week-hour-cell');
        
        if (dayCell && !this.uploadSection.classList.contains('hidden')) {
            e.preventDefault();
            
            // Extract date information from the cell
            const dateStr = dayCell.dataset.date;
            const timeStr = dayCell.dataset.time;
            
            if (dateStr) {
                this.contextMenuData = {
                    date: dateStr,
                    time: timeStr || null
                };
                this.contextMenuEvent = null;
                this.showContextMenuOptions('cell');
                this.showContextMenu(e.clientX, e.clientY);
            }
        } else {
            this.hideContextMenu();
        }
    }

    /**
     * Show/hide context menu options based on target type
     */
    showContextMenuOptions(type) {
        if (!this.contextAddEvent || !this.contextEditEvent || !this.contextDeleteEvent) {
            return;
        }

        if (type === 'event') {
            this.contextAddEvent.classList.add('hidden');
            this.contextEditEvent.classList.remove('hidden');
            this.contextDeleteEvent.classList.remove('hidden');
        } else {
            this.contextAddEvent.classList.remove('hidden');
            this.contextEditEvent.classList.add('hidden');
            this.contextDeleteEvent.classList.add('hidden');
        }
    }

    /**
     * Show context menu at position
     */
    showContextMenu(x, y) {
        if (!this.contextMenu) return;
        
        this.contextMenu.style.left = `${x}px`;
        this.contextMenu.style.top = `${y}px`;
        this.contextMenu.classList.remove('hidden');
        
        // Adjust position if menu goes off screen
        setTimeout(() => {
            const rect = this.contextMenu.getBoundingClientRect();
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            
            if (rect.right > windowWidth) {
                this.contextMenu.style.left = `${windowWidth - rect.width - 10}px`;
            }
            
            if (rect.bottom > windowHeight) {
                this.contextMenu.style.top = `${windowHeight - rect.height - 10}px`;
            }
        }, 0);
    }

    /**
     * Hide context menu
     */
    hideContextMenu() {
        if (this.contextMenu) {
            this.contextMenu.classList.add('hidden');
        }
        this.contextMenuData = null;
        this.contextMenuEvent = null;
    }

    /**
     * Handle context menu "Add Event" click
     */
    handleContextAddEvent() {
        if (this.contextMenuData && this.eventForm) {
            this.eventForm.openForNew(this.contextMenuData, this.calendars);
        }
        this.hideContextMenu();
    }

    /**
     * Handle context menu "Edit Event" click
     */
    handleContextEditEvent() {
        if (this.contextMenuEvent && this.eventForm) {
            const eventCalendar = this.findCalendarForEvent(this.contextMenuEvent);
            const calendarId = eventCalendar ? eventCalendar.id : null;
            this.eventForm.openForEdit(this.contextMenuEvent, this.calendars, calendarId);
        }
        this.hideContextMenu();
    }

    /**
     * Handle context menu "Delete Event" click
     */
    handleContextDeleteEvent() {
        if (!this.contextMenuEvent) {
            this.hideContextMenu();
            return;
        }

        if (!confirm('Are you sure you want to delete this event?')) {
            this.hideContextMenu();
            return;
        }

        const targetCalendar = this.findCalendarForEvent(this.contextMenuEvent);
        if (!targetCalendar) {
            this.showError('Could not find event to delete');
            this.hideContextMenu();
            return;
        }

        const eventIndex = targetCalendar.events.findIndex((e) => e.uid === this.contextMenuEvent.uid);
        if (eventIndex === -1) {
            this.showError('Could not find event to delete');
            this.hideContextMenu();
            return;
        }

        targetCalendar.events.splice(eventIndex, 1);
        targetCalendar.icsData = eventsToICS(targetCalendar.events, targetCalendar.name);
        this.saveCalendarsToStorage();
        this.updateVisibleEvents();
        this.showSuccess('Event deleted successfully');
        this.hideContextMenu();
    }

    /**
     * Find calendar containing an event
     */
    findCalendarForEvent(event) {
        if (event.calendarId) {
            const byId = this.calendars.find((cal) => cal.id === Number(event.calendarId));
            if (byId) {
                return byId;
            }
        }

        if (!event.uid) {
            return null;
        }

        return this.calendars.find((cal) => cal.events.some((e) => e.uid === event.uid)) || null;
    }

    /**
     * Handle file selection
     */
    async handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            this.showLoading();
            const icsData = await loadICSFromFile(file);
            const events = parseICS(icsData);
            
            this.addCalendar(file.name, events, `file:${file.name}`, icsData);
            this.saveCalendarsToStorage();
            this.showCalendar();
            this.hideLoading();
            
            // Reset file input
            this.fileInput.value = '';
        } catch (error) {
            console.error('Error loading calendar file:', error);
            this.hideLoading();
            this.showError('Failed to load calendar file: ' + error.message);
        }
    }

    /**
     * Handle drag over
     */
    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        this.fileDropZone.classList.add('drag-over');
    }

    /**
     * Handle drag leave
     */
    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        this.fileDropZone.classList.remove('drag-over');
    }

    /**
     * Handle drop
     */
    async handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        this.fileDropZone.classList.remove('drag-over');
        
        const file = e.dataTransfer.files[0];
        if (!file) return;
        
        // Simulate file input change
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        this.fileInput.files = dataTransfer.files;
        
        await this.handleFileSelect({ target: this.fileInput });
    }

    /**
     * Handle URL load
     */
    async handleURLLoad() {
        const url = this.urlInput.value.trim();
        if (!url) {
            this.showError('Please enter a calendar URL');
            return;
        }
        
        await this.loadURL(url);
    }

    /**
     * Load calendar from URL
     */
    async loadURL(url) {
        try {
            this.showLoading();
            const icsData = await loadICSFromURL(url);
            const events = parseICS(icsData);
            
            // Extract calendar name from URL or use domain
            const urlObj = new URL(url);
            const name = urlObj.pathname.split('/').pop() || urlObj.hostname;
            
            this.addCalendar(name, events, `url:${url}`, icsData);
            this.saveCalendarsToStorage();
            this.updateURLParameter(url);
            this.showCalendar();
            this.hideLoading();
        } catch (error) {
            console.error('Error loading calendar from URL:', error);
            this.hideLoading();
            this.showError('Failed to load calendar from URL: ' + error.message);
        }
    }

    /**
     * Download all visible calendars as ICS file
     */
    downloadCalendar() {
        // Get all visible calendars
        const visibleCalendars = this.calendars.filter(cal => cal.visible);
        
        if (visibleCalendars.length === 0) {
            this.showError('No calendars to download');
            return;
        }
        
        // Collect all events from visible calendars
        const allEvents = [];
        visibleCalendars.forEach(cal => {
            if (cal.events) {
                allEvents.push(...cal.events);
            }
        });
        
        // Generate calendar name
        const calendarName = visibleCalendars.length === 1 
            ? visibleCalendars[0].name 
            : 'Combined Calendar';
        
        // Convert to ICS
        const icsContent = eventsToICS(allEvents, calendarName);
        
        // Trigger download
        this.triggerICSDownload(icsContent, calendarName);
    }

    /**
     * Add random calendar to collection (from URL view)
     */
    addRandomCalendarToCollection() {
        if (!this.randomCalendar) return;
        
        const { config, events, icsData } = this.randomCalendar;
        
        // Load existing calendars from storage
        this.loadCalendarsFromStorage();
        
        // Add the random calendar
        this.addCalendar(config.name, events, `random:${config.seed}`, icsData);
        this.saveCalendarsToStorage();
        
        // Exit random calendar view mode
        this.isRandomCalendarView = false;
        this.randomCalendar = null;
        
        // Update UI
        this.renderCalendarList();
        this.updateVisibleEvents();
        this.showSuccess(`Calendar "${config.name}" added to your collection!`);
        
        // Update button text back to normal
        this.addCalendarBtn.querySelector('span').textContent = 'Add Calendar';
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        if (this.successToast) {
            const messageEl = this.successToast.querySelector('span');
            if (messageEl) {
                messageEl.textContent = message;
            }
            this.successToast.classList.remove('hidden');
            
            setTimeout(() => {
                this.successToast.classList.add('hidden');
            }, 3000);
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Update URL parameter with calendar URL
     */
    updateURLParameter(calendarURL) {
        if (!calendarURL) return;
        
        const url = new URL(window.location);
        url.searchParams.set('calendar', calendarURL);
        window.history.pushState({ calendarURL }, '', url);
    }

    /**
     * Load calendar from URL parameter on initial load
     */
    async loadFromURLParameter() {
        const urlParams = new URLSearchParams(window.location.search);
        const calendarURL = urlParams.get('calendar');
        
        if (calendarURL) {
            // Pre-fill the URL input
            this.urlInput.value = calendarURL;
            // Load the calendar
            await this.loadURL(calendarURL);
        }
    }

    /**
     * Handle browser back/forward navigation
     */
    async handlePopState(e) {
        if (e.state && e.state.calendarURL) {
            // User navigated back to a calendar URL
            this.urlInput.value = e.state.calendarURL;
            await this.loadURL(e.state.calendarURL);
        } else {
            // User navigated back to initial state (no calendar)
            this.showUploadSection();
            this.currentCalendarURL = null;
        }
    }

    /**
     * Show calendar section
     */
    showCalendar() {
        this.uploadSection.classList.add('hidden');
        this.calendarSection.classList.remove('hidden');
        this.loadNewBtn.classList.add('hidden'); // Hide "Load New" when viewing calendar
        this.addCalendarBtn.classList.remove('hidden'); // Show "Add Calendar" button
        
        // Show download button
        if (this.downloadBtn) {
            this.downloadBtn.classList.remove('hidden');
        }
        
        // Update button text based on random calendar mode
        if (this.isRandomCalendarView) {
            this.addCalendarBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg><span>Add to My Calendars</span>';
        } else {
            this.addCalendarBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg><span>Add Calendar</span>';
        }
        
        // Render calendar list
        this.renderCalendarList();
        
        this.updateCalendarView();
    }

    /**
     * Update calendar view with all visible events
     */
    updateCalendarView() {
        // Get all visible events from all calendars
        const allEvents = [];
        this.calendars.forEach(cal => {
            if (cal.visible && cal.events) {
                cal.events.forEach(event => {
                    allEvents.push({
                        ...event,
                        color: cal.color,
                        calendarId: cal.id,
                        calendarName: cal.name
                    });
                });
            }
        });
        
        // Initialize or update calendar
        if (!this.calendar) {
            // Load saved navigation state
            const savedView = loadFromStorage('calendarView', 'month');
            const savedDate = loadFromStorage('calendarDate');
            
            this.calendar = new Calendar(this.calendarGrid, allEvents, {
                view: savedView,
                weekStartsOn: this.weekStartsOn,
                onEventClick: (event) => this.eventModal.show(event),
                onEventRightClick: (event, e) => {
                    this.contextMenuEvent = event;
                    this.contextMenuData = null;
                    this.showContextMenuOptions('event');
                    this.showContextMenu(e.clientX, e.clientY);
                }
            });
            
            // Restore saved date if available
            if (savedDate) {
                try {
                    this.calendar.currentDate = new Date(savedDate);
                    this.calendar.render();
                } catch (e) {
                    // If date parsing fails, use current date
                    console.warn('Failed to restore saved date:', e);
                }
            }
            
            // Update view buttons to reflect saved state
            this.viewBtns.forEach(btn => {
                if (btn.dataset.view === savedView) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        } else {
            this.calendar.setEvents(allEvents);
        }
        
        this.updateCalendarTitle();
    }

    /**
     * Show upload section
     */
    showUploadSection() {
        this.calendarSection.classList.add('hidden');
        this.uploadSection.classList.remove('hidden');
        this.loadNewBtn.classList.add('hidden');
        this.addCalendarBtn.classList.add('hidden');
        
        // Hide download button
        if (this.downloadBtn) {
            this.downloadBtn.classList.add('hidden');
        }
        
        // Reset inputs
        this.fileInput.value = '';
        this.urlInput.value = '';
        
        // Clear URL parameter
        const url = new URL(window.location);
        url.searchParams.delete('calendar');
        window.history.pushState({}, '', url);
    }

    /**
     * Navigate to previous period
     */
    navigatePrevious() {
        if (this.calendar) {
            this.calendar.previous();
            this.updateCalendarTitle();
            this.saveNavigationState();
        }
    }

    /**
     * Navigate to next period
     */
    navigateNext() {
        if (this.calendar) {
            this.calendar.next();
            this.updateCalendarTitle();
            this.saveNavigationState();
        }
    }

    /**
     * Navigate to today
     */
    navigateToday() {
        if (this.calendar) {
            this.calendar.today();
            this.updateCalendarTitle();
            this.saveNavigationState();
        }
    }

    /**
     * Switch calendar view
     */
    switchView(view) {
        if (this.calendar) {
            this.calendar.setView(view);
            this.updateCalendarTitle();
            this.saveNavigationState();
            
            // Update active button
            this.viewBtns.forEach(btn => {
                if (btn.dataset.view === view) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }
    }

    /**
     * Save current navigation state to localStorage
     */
    saveNavigationState() {
        if (this.calendar) {
            saveToStorage('calendarDate', this.calendar.currentDate.toISOString());
            saveToStorage('calendarView', this.calendar.view);
        }
    }

    /**
     * Update calendar title
     */
    updateCalendarTitle() {
        if (this.calendar) {
            this.calendarTitle.textContent = this.calendar.getTitle();
        }
    }

    /**
     * Toggle calendar list collapse/expand
     */
    toggleCalendarList() {
        const isCollapsed = this.calendarListContainer.classList.toggle('collapsed');
        saveToStorage('calendarListCollapsed', isCollapsed);
    }

    /**
     * Load calendar list collapsed state
     */
    loadCalendarListState() {
        const isCollapsed = loadFromStorage('calendarListCollapsed', false);
        if (isCollapsed) {
            this.calendarListContainer.classList.add('collapsed');
        }
    }

    /**
     * Show settings modal
     */
    showSettings() {
        this.settingsModal.classList.remove('hidden');
    }

    /**
     * Hide settings modal
     */
    hideSettings() {
        this.settingsModal.classList.add('hidden');
    }

    /**
     * Show loading overlay
     */
    showLoading() {
        this.loadingOverlay.classList.remove('hidden');
    }

    /**
     * Hide loading overlay
     */
    hideLoading() {
        this.loadingOverlay.classList.add('hidden');
    }

    /**
     * Show error message
     */
    showError(message) {
        this.errorMessage.textContent = message;
        this.errorToast.classList.remove('hidden');
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            this.errorToast.classList.add('hidden');
        }, 5000);
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new ICSViewerApp();
    });
} else {
    new ICSViewerApp();
}
