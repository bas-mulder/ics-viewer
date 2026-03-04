/**
 * Main Application Controller
 * Orchestrates the ICS Calendar Viewer application
 */

import { loadICSFromFile, loadICSFromURL, parseICS } from './icsParser.js';
import { Calendar } from './calendar.js';
import { EventModal } from './eventModal.js';
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
            this.loadFromURLParameter();
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
     * Save currently viewed random calendar to localStorage
     */
    addRandomCalendarToCollection() {
        if (!this.randomCalendar) return;
        
        const { config, events, icsData } = this.randomCalendar;
        
        // Clear random view mode
        this.isRandomCalendarView = false;
        this.randomCalendar = null;
        
        // Load existing calendars from storage
        this.calendars = [];
        this.loadCalendarsFromStorage();
        
        // Add this calendar (set source to null = saved calendar)
        this.addCalendar(config.name, events, null, icsData);
        
        // Clear URL parameters
        const url = new URL(window.location);
        url.searchParams.delete('random');
        url.searchParams.delete('seed');
        url.searchParams.delete('count');
        url.searchParams.delete('daysBefore');
        url.searchParams.delete('daysAfter');
        url.searchParams.delete('types');
        url.searchParams.delete('name');
        url.searchParams.delete('merge');
        window.history.replaceState({}, '', url);
        
        this.showCalendar();
        
        // Show success message
        this.showSuccess('Calendar added to your collection!');
    }

    /**
     * Download visible calendar(s) as ICS file
     */
    downloadCalendar() {
        const visibleCalendars = this.calendars.filter(c => c.visible);
        
        if (visibleCalendars.length === 0) {
            this.showError('No calendars to download');
            return;
        }
        
        // Combine events from all visible calendars
        const allEvents = visibleCalendars.flatMap(c => c.events);
        
        // Generate calendar name
        const calendarName = visibleCalendars.length === 1
            ? visibleCalendars[0].name
            : 'Combined Calendar';
        
        // Generate ICS
        const icsContent = eventsToICS(allEvents, calendarName);
        
        // Trigger download
        this.triggerICSDownload(icsContent, calendarName);
    }

    /**
     * Show success toast message
     */
    showSuccess(message) {
        if (!this.successToast) return;
        
        const messageEl = this.successToast.querySelector('span');
        if (messageEl) {
            messageEl.textContent = message;
        }
        
        this.successToast.classList.remove('hidden');
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            this.successToast.classList.add('hidden');
        }, 3000);
    }

    /**
     * Handle file selection
     */
    async handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            await this.loadFile(file);
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
     * Handle file drop
     */
    async handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        this.fileDropZone.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            await this.loadFile(files[0]);
        }
    }

    /**
     * Handle URL load
     */
    async handleURLLoad() {
        const url = this.urlInput.value.trim();
        if (!url) {
            this.showError('Please enter a URL');
            return;
        }
        
        // Basic URL validation
        try {
            new URL(url);
        } catch (e) {
            this.showError('Please enter a valid URL');
            return;
        }
        
        await this.loadURL(url);
    }

    /**
     * Load ICS from file
     */
    async loadFile(file) {
        this.showLoading();
        
        try {
            // Read file content
            const icsData = await this.readFileAsText(file);
            const events = await loadICSFromFile(file);
            
            if (events.length === 0) {
                throw new Error('No events found in the calendar file');
            }
            
            this.addCalendar(file.name, events, null, icsData);
            this.showCalendar();
            this.hideLoading();
        } catch (error) {
            this.hideLoading();
            this.showError(error.message);
        }
    }

    /**
     * Read file as text
     */
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    /**
     * Load ICS from URL
     */
    async loadURL(url) {
        this.showLoading();
        
        try {
            // First try without CORS proxy
            let events, icsData;
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                icsData = await response.text();
                events = await loadICSFromURL(url, false);
            } catch (error) {
                // If CORS error, retry with proxy
                if (error.message === 'CORS_ERROR' || error.name === 'TypeError') {
                    console.log('CORS detected, retrying with proxy...');
                    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
                    const response = await fetch(proxyUrl);
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    icsData = await response.text();
                    events = await loadICSFromURL(url, true);
                } else {
                    throw error;
                }
            }
            
            if (events.length === 0) {
                throw new Error('No events found in the calendar');
            }
            
            // Extract calendar name from URL
            const calendarName = this.getCalendarNameFromURL(url);
            this.addCalendar(calendarName, events, url, icsData);
            this.updateURLParameter(url);
            this.showCalendar();
            this.hideLoading();
        } catch (error) {
            this.hideLoading();
            this.showError(error.message);
        }
    }

    /**
     * Extract calendar name from URL
     */
    getCalendarNameFromURL(url) {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            const filename = pathname.split('/').pop();
            return filename.replace('.ics', '') || 'Calendar';
        } catch {
            return 'Calendar';
        }
    }

    /**
     * Add a calendar to the list
     */
    addCalendar(name, events, source, icsData) {
        const color = this.generateRandomColor();
        
        const calendar = {
            id: this.nextCalendarId++,
            name,
            events,
            color,
            visible: true,
            source, // null for file, URL string for URL
            icsData // Store raw ICS data for persistence
        };
        
        // Add color property to each event
        events.forEach(event => {
            event.calendarId = calendar.id;
            event.color = color;
        });
        
        this.calendars.push(calendar);
        this.updateCalendarList();
        this.saveCalendarsToStorage();
    }

    /**
     * Remove a calendar from the list
     */
    removeCalendar(calendarId) {
        const index = this.calendars.findIndex(c => c.id === calendarId);
        if (index !== -1) {
            this.calendars.splice(index, 1);
            this.updateCalendarList();
            this.saveCalendarsToStorage();
            
            if (this.calendars.length === 0) {
                this.showUploadSection();
            } else {
                this.updateCalendarView();
            }
        }
    }

    /**
     * Toggle calendar visibility
     */
    toggleCalendarVisibility(calendarId) {
        const calendar = this.calendars.find(c => c.id === calendarId);
        if (calendar) {
            calendar.visible = !calendar.visible;
            this.updateCalendarList();
            this.saveCalendarsToStorage();
            this.updateCalendarView();
        }
    }

    /**
     * Start renaming a calendar
     */
    startRenameCalendar(calendarId, nameElement) {
        const calendar = this.calendars.find(c => c.id === calendarId);
        if (!calendar) return;
        
        const currentName = calendar.name;
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'calendar-name-input';
        input.value = currentName;
        
        // Replace the span with an input
        nameElement.replaceWith(input);
        input.focus();
        input.select();
        
        // Save on blur or Enter key
        const save = () => {
            const newName = input.value.trim();
            if (newName && newName !== currentName) {
                calendar.name = newName;
                this.saveCalendarsToStorage();
            }
            this.updateCalendarList();
        };
        
        input.addEventListener('blur', save);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                save();
            } else if (e.key === 'Escape') {
                this.updateCalendarList(); // Cancel and restore original
            }
        });
    }

    /**
     * Save calendars to localStorage
     */
    saveCalendarsToStorage() {
        // Don't save if in random-only view (not merged)
        if (this.isRandomCalendarView && !this.parseRandomParams()?.merge) {
            return;
        }
        
        try {
            const calendarsToSave = this.calendars.map(cal => ({
                id: cal.id,
                name: cal.name,
                color: cal.color,
                visible: cal.visible,
                source: cal.source,
                icsData: cal.icsData
            }));
            
            saveToStorage('calendars', JSON.stringify(calendarsToSave));
            saveToStorage('nextCalendarId', this.nextCalendarId.toString());
        } catch (error) {
            console.error('Failed to save calendars to storage:', error);
        }
    }

    /**
     * Load calendars from localStorage
     */
    loadCalendarsFromStorage() {
        try {
            const savedCalendars = loadFromStorage('calendars', null);
            const savedNextId = loadFromStorage('nextCalendarId', '1');
            
            if (savedCalendars) {
                const calendarsData = JSON.parse(savedCalendars);
                this.nextCalendarId = parseInt(savedNextId, 10);
                
                calendarsData.forEach(cal => {
                    // Re-parse events from ICS data
                    const events = parseICS(cal.icsData);
                    
                    // Add color to events
                    events.forEach(event => {
                        event.calendarId = cal.id;
                        event.color = cal.color;
                    });
                    
                    this.calendars.push({
                        id: cal.id,
                        name: cal.name,
                        events,
                        color: cal.color,
                        visible: cal.visible,
                        source: cal.source,
                        icsData: cal.icsData
                    });
                });
                
                if (this.calendars.length > 0) {
                    this.updateCalendarList();
                    this.showCalendar();
                }
            }
        } catch (error) {
            console.error('Failed to load calendars from storage:', error);
        }
    }

    /**
     * Update calendar list UI
     */
    updateCalendarList() {
        if (!this.calendarList) return;
        
        this.calendarList.innerHTML = '';
        
        this.calendars.forEach(cal => {
            const item = document.createElement('div');
            item.className = 'calendar-list-item';
            item.innerHTML = `
                <div class="calendar-color-indicator" style="background-color: ${cal.color}"></div>
                <div class="calendar-info">
                    <span class="calendar-name" data-id="${cal.id}">${this.escapeHtml(cal.name)}</span>
                    <span class="calendar-event-count">${cal.events.length} events</span>
                </div>
                <div class="calendar-actions">
                    <button class="calendar-rename-btn" data-id="${cal.id}" aria-label="Rename calendar">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="calendar-toggle-btn" data-id="${cal.id}" aria-label="${cal.visible ? 'Hide' : 'Show'} calendar">
                        ${cal.visible ? 
                            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>' :
                            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>'
                        }
                    </button>
                    <button class="calendar-remove-btn" data-id="${cal.id}" aria-label="Remove calendar">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            `;
            
            // Rename calendar
            const nameElement = item.querySelector('.calendar-name');
            const renameBtn = item.querySelector('.calendar-rename-btn');
            
            renameBtn.addEventListener('click', () => {
                this.startRenameCalendar(cal.id, nameElement);
            });
            
            // Toggle visibility
            item.querySelector('.calendar-toggle-btn').addEventListener('click', () => {
                this.toggleCalendarVisibility(cal.id);
            });
            
            // Remove calendar
            item.querySelector('.calendar-remove-btn').addEventListener('click', () => {
                this.removeCalendar(cal.id);
            });
            
            this.calendarList.appendChild(item);
        });
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
        
        this.updateCalendarView();
    }

    /**
     * Update calendar view with all visible events
     */
    updateCalendarView() {
        // Get all visible events from all calendars
        const allEvents = this.calendars
            .filter(cal => cal.visible)
            .flatMap(cal => cal.events);
        
        // Initialize or update calendar
        if (!this.calendar) {
            // Load saved navigation state
            const savedView = loadFromStorage('calendarView', 'month');
            const savedDate = loadFromStorage('calendarDate');
            
            this.calendar = new Calendar(this.calendarGrid, allEvents, {
                view: savedView,
                weekStartsOn: this.weekStartsOn,
                onEventClick: (event) => this.eventModal.show(event)
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
