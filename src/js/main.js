/**
 * Main Application Controller
 * Orchestrates the ICS Calendar Viewer application
 */

import { loadICSFromFile, loadICSFromURL, validateICS } from './icsParser.js';
import { Calendar } from './calendar.js';
import { EventModal } from './eventModal.js';
import { getLocaleWeekStart, loadFromStorage, saveToStorage } from './utils.js';

class ICSViewerApp {
    constructor() {
        this.calendar = null;
        this.events = [];
        this.weekStartsOn = this.loadWeekStartPreference();
        this.currentTheme = this.loadThemePreference();
        
        this.initializeTheme();
        this.initializeElements();
        this.setupEventListeners();
        this.initializeModals();
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
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.todayBtn = document.getElementById('todayBtn');
        this.loadNewBtn = document.getElementById('loadNewBtn');
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
            const events = await loadICSFromFile(file);
            
            if (events.length === 0) {
                throw new Error('No events found in the calendar file');
            }
            
            this.events = events;
            this.showCalendar();
            this.hideLoading();
        } catch (error) {
            this.hideLoading();
            this.showError(error.message);
        }
    }

    /**
     * Load ICS from URL
     */
    async loadURL(url) {
        this.showLoading();
        
        try {
            // First try without CORS proxy
            let events;
            try {
                events = await loadICSFromURL(url, false);
            } catch (error) {
                // If CORS error, retry with proxy
                if (error.message === 'CORS_ERROR') {
                    console.log('CORS detected, retrying with proxy...');
                    events = await loadICSFromURL(url, true);
                } else {
                    throw error;
                }
            }
            
            if (events.length === 0) {
                throw new Error('No events found in the calendar');
            }
            
            this.events = events;
            this.showCalendar();
            this.hideLoading();
        } catch (error) {
            this.hideLoading();
            this.showError(error.message);
        }
    }

    /**
     * Show calendar section
     */
    showCalendar() {
        this.uploadSection.classList.add('hidden');
        this.calendarSection.classList.remove('hidden');
        
        // Initialize or update calendar
        if (!this.calendar) {
            this.calendar = new Calendar(this.calendarGrid, this.events, {
                view: 'month',
                weekStartsOn: this.weekStartsOn,
                onEventClick: (event) => this.eventModal.show(event)
            });
        } else {
            this.calendar.setEvents(this.events);
        }
        
        this.updateCalendarTitle();
    }

    /**
     * Show upload section
     */
    showUploadSection() {
        this.calendarSection.classList.add('hidden');
        this.uploadSection.classList.remove('hidden');
        
        // Reset inputs
        this.fileInput.value = '';
        this.urlInput.value = '';
    }

    /**
     * Navigate to previous period
     */
    navigatePrevious() {
        if (this.calendar) {
            this.calendar.previous();
            this.updateCalendarTitle();
        }
    }

    /**
     * Navigate to next period
     */
    navigateNext() {
        if (this.calendar) {
            this.calendar.next();
            this.updateCalendarTitle();
        }
    }

    /**
     * Navigate to today
     */
    navigateToday() {
        if (this.calendar) {
            this.calendar.today();
            this.updateCalendarTitle();
        }
    }

    /**
     * Switch calendar view
     */
    switchView(view) {
        if (this.calendar) {
            this.calendar.setView(view);
            this.updateCalendarTitle();
            
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
     * Update calendar title
     */
    updateCalendarTitle() {
        if (this.calendar) {
            this.calendarTitle.textContent = this.calendar.getTitle();
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
