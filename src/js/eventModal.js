/**
 * Event Modal
 * Displays detailed event information in a modal dialog
 */

import { formatDate, formatTime, formatDateTime } from './utils.js';

export class EventModal {
    constructor(modalElement) {
        this.modal = modalElement;
        this.modalBody = modalElement.querySelector('#modalBody');
        this.closeBtn = modalElement.querySelector('#modalCloseBtn');
        
        this.setupEventListeners();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Close button
        this.closeBtn.addEventListener('click', () => this.close());
        
        // Click outside to close
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });
        
        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.modal.classList.contains('hidden')) {
                this.close();
            }
        });
    }

    /**
     * Show event details
     */
    show(event) {
        this.modalBody.innerHTML = this.renderEventDetails(event);
        this.modal.classList.remove('hidden');
        
        // Focus management for accessibility
        this.closeBtn.focus();
    }

    /**
     * Close the modal
     */
    close() {
        this.modal.classList.add('hidden');
    }

    /**
     * Render event details HTML
     */
    renderEventDetails(event) {
        const details = [];

        // Title
        details.push(`
            <h2 class="event-modal-title">${this.escapeHtml(event.summary || 'Untitled Event')}</h2>
        `);

        // Create details container
        details.push('<div class="event-modal-details">');

        // Date & Time
        const dateTimeHtml = this.renderDateTime(event);
        if (dateTimeHtml) {
            details.push(`
                <div class="event-detail-row">
                    <svg class="event-detail-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    <div class="event-detail-content">
                        <div class="event-detail-label">Date & Time</div>
                        <div class="event-detail-value">${dateTimeHtml}</div>
                    </div>
                </div>
            `);
        }

        // Duration
        if (event.start && event.end && !event.allDay) {
            const duration = this.calculateDuration(event.start, event.end);
            if (duration) {
                details.push(`
                    <div class="event-detail-row">
                        <svg class="event-detail-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        <div class="event-detail-content">
                            <div class="event-detail-label">Duration</div>
                            <div class="event-detail-value">${duration}</div>
                        </div>
                    </div>
                `);
            }
        }

        // Location
        if (event.location) {
            details.push(`
                <div class="event-detail-row">
                    <svg class="event-detail-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    <div class="event-detail-content">
                        <div class="event-detail-label">Location</div>
                        <div class="event-detail-value">${this.escapeHtml(event.location)}</div>
                    </div>
                </div>
            `);
        }

        // Organizer
        if (event.organizer) {
            const organizerText = event.organizer.name 
                ? `${this.escapeHtml(event.organizer.name)} (${this.escapeHtml(event.organizer.email)})`
                : this.escapeHtml(event.organizer.email);
            
            details.push(`
                <div class="event-detail-row">
                    <svg class="event-detail-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    <div class="event-detail-content">
                        <div class="event-detail-label">Organizer</div>
                        <div class="event-detail-value">${organizerText}</div>
                    </div>
                </div>
            `);
        }

        // Status
        if (event.status) {
            details.push(`
                <div class="event-detail-row">
                    <svg class="event-detail-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="9 11 12 14 22 4"></polyline>
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                    </svg>
                    <div class="event-detail-content">
                        <div class="event-detail-label">Status</div>
                        <div class="event-detail-value">${this.escapeHtml(event.status)}</div>
                    </div>
                </div>
            `);
        }

        // Categories
        if (event.categories && event.categories.length > 0) {
            details.push(`
                <div class="event-detail-row">
                    <svg class="event-detail-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                        <line x1="7" y1="7" x2="7.01" y2="7"></line>
                    </svg>
                    <div class="event-detail-content">
                        <div class="event-detail-label">Categories</div>
                        <div class="event-detail-value">${event.categories.map(c => this.escapeHtml(c)).join(', ')}</div>
                    </div>
                </div>
            `);
        }

        // URL
        if (event.url) {
            details.push(`
                <div class="event-detail-row">
                    <svg class="event-detail-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                    </svg>
                    <div class="event-detail-content">
                        <div class="event-detail-label">Link</div>
                        <div class="event-detail-value">
                            <a href="${this.escapeHtml(event.url)}" target="_blank" rel="noopener noreferrer">${this.escapeHtml(event.url)}</a>
                        </div>
                    </div>
                </div>
            `);
        }

        // Attendees
        if (event.attendees && event.attendees.length > 0) {
            const attendeesList = event.attendees.map(a => {
                const name = a.name ? this.escapeHtml(a.name) : this.escapeHtml(a.email);
                const status = a.status ? ` (${this.escapeHtml(a.status)})` : '';
                return `<div>${name}${status}</div>`;
            }).join('');

            details.push(`
                <div class="event-detail-row">
                    <svg class="event-detail-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                    <div class="event-detail-content">
                        <div class="event-detail-label">Attendees (${event.attendees.length})</div>
                        <div class="event-detail-value">${attendeesList}</div>
                    </div>
                </div>
            `);
        }

        // Description
        if (event.description) {
            details.push(`
                <div class="event-detail-row">
                    <svg class="event-detail-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                    <div class="event-detail-content">
                        <div class="event-detail-label">Description</div>
                        <div class="event-detail-value event-detail-description">${this.escapeHtml(event.description)}</div>
                    </div>
                </div>
            `);
        }

        details.push('</div>'); // Close event-modal-details

        return details.join('');
    }

    /**
     * Render date and time information
     */
    renderDateTime(event) {
        if (!event.start) return null;

        if (event.allDay) {
            if (event.end && !this.isSameDate(event.start, event.end)) {
                // Multi-day event
                return `${formatDate(event.start)} - ${formatDate(event.end)}`;
            } else {
                // Single day all-day event
                return `${formatDate(event.start)} (All Day)`;
            }
        } else {
            if (event.end) {
                if (this.isSameDate(event.start, event.end)) {
                    // Same day with different times
                    return `${formatDate(event.start)}<br>${formatTime(event.start)} - ${formatTime(event.end)}`;
                } else {
                    // Multi-day with times
                    return `${formatDateTime(event.start)}<br>to<br>${formatDateTime(event.end)}`;
                }
            } else {
                return formatDateTime(event.start);
            }
        }
    }

    /**
     * Check if two dates are the same day
     */
    isSameDate(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    }

    /**
     * Calculate duration between two dates
     */
    calculateDuration(start, end) {
        const diffMs = end - start;
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 60) {
            return `${diffMins} minutes`;
        }
        
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        
        if (hours < 24) {
            return mins > 0 ? `${hours} hours ${mins} minutes` : `${hours} hours`;
        }
        
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        
        let result = `${days} day${days > 1 ? 's' : ''}`;
        if (remainingHours > 0) {
            result += ` ${remainingHours} hour${remainingHours > 1 ? 's' : ''}`;
        }
        
        return result;
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
