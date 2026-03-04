/**
 * Calendar Renderer
 * Handles rendering calendar views (month, week, day)
 */

import {
    formatDate,
    formatTime,
    getDayName,
    getMonthName,
    isSameDay,
    isToday,
    startOfDay,
    endOfDay,
    startOfWeek,
    endOfWeek,
    addDays,
    addMonths,
    getMonthDays,
    getDayHours,
    formatHour
} from './utils.js';

export class Calendar {
    constructor(container, events = [], options = {}) {
        this.container = container;
        this.events = events;
        this.currentDate = new Date();
        this.view = options.view || 'month'; // 'month', 'week', 'day'
        this.weekStartsOn = options.weekStartsOn ?? 0; // 0 = Sunday, 1 = Monday
        this.onEventClick = options.onEventClick || (() => {});
        this.maxEventsPerDay = 3;
        
        // Initial render
        this.render();
    }

    /**
     * Update events
     */
    setEvents(events) {
        this.events = events;
        this.render();
    }

    /**
     * Set the current view
     */
    setView(view) {
        this.view = view;
        this.render();
    }

    /**
     * Set week start day
     */
    setWeekStartsOn(day) {
        this.weekStartsOn = day;
        this.render();
    }

    /**
     * Navigate to previous period
     */
    previous() {
        switch (this.view) {
            case 'month':
                this.currentDate = addMonths(this.currentDate, -1);
                break;
            case 'week':
                this.currentDate = addDays(this.currentDate, -7);
                break;
            case 'day':
                this.currentDate = addDays(this.currentDate, -1);
                break;
        }
        this.render();
    }

    /**
     * Navigate to next period
     */
    next() {
        switch (this.view) {
            case 'month':
                this.currentDate = addMonths(this.currentDate, 1);
                break;
            case 'week':
                this.currentDate = addDays(this.currentDate, 7);
                break;
            case 'day':
                this.currentDate = addDays(this.currentDate, 1);
                break;
        }
        this.render();
    }

    /**
     * Navigate to today
     */
    today() {
        this.currentDate = new Date();
        this.render();
    }

    /**
     * Get the current title based on view
     */
    getTitle() {
        switch (this.view) {
            case 'month':
                return `${getMonthName(this.currentDate)} ${this.currentDate.getFullYear()}`;
            case 'week': {
                const start = startOfWeek(this.currentDate, this.weekStartsOn);
                const end = endOfWeek(this.currentDate, this.weekStartsOn);
                if (start.getMonth() === end.getMonth()) {
                    return `${getMonthName(start)} ${start.getDate()}-${end.getDate()}, ${start.getFullYear()}`;
                } else {
                    return `${getMonthName(start, 'short')} ${start.getDate()} - ${getMonthName(end, 'short')} ${end.getDate()}, ${start.getFullYear()}`;
                }
            }
            case 'day':
                return formatDate(this.currentDate, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            default:
                return '';
        }
    }

    /**
     * Get events for a specific date
     */
    getEventsForDate(date) {
        const dayStart = startOfDay(date);
        const dayEnd = endOfDay(date);
        
        return this.events.filter(event => {
            if (!event.start) return false;
            
            const eventStart = event.start;
            const eventEnd = event.end || eventStart;
            
            // Check if event overlaps with this day
            return eventStart <= dayEnd && eventEnd >= dayStart;
        });
    }

    /**
     * Get events for a specific hour
     */
    getEventsForHour(date, hour) {
        const hourStart = new Date(date);
        hourStart.setHours(hour, 0, 0, 0);
        const hourEnd = new Date(date);
        hourEnd.setHours(hour, 59, 59, 999);
        
        return this.events.filter(event => {
            if (!event.start || event.allDay) return false;
            
            const eventStart = event.start;
            const eventEnd = event.end || eventStart;
            
            return eventStart <= hourEnd && eventEnd >= hourStart;
        });
    }

    /**
     * Get events that START in a specific hour (not just overlap)
     */
    getEventsStartingInHour(date, hour) {
        const hourStart = new Date(date);
        hourStart.setHours(hour, 0, 0, 0);
        const hourEnd = new Date(date);
        hourEnd.setHours(hour, 59, 59, 999);
        
        return this.events.filter(event => {
            if (!event.start || event.allDay) return false;
            
            const eventStart = event.start;
            
            // Check if event starts within this hour
            return eventStart >= hourStart && eventStart <= hourEnd;
        });
    }

    /**
     * Render the calendar
     */
    render() {
        this.container.innerHTML = '';
        
        switch (this.view) {
            case 'month':
                this.renderMonthView();
                break;
            case 'week':
                this.renderWeekView();
                break;
            case 'day':
                this.renderDayView();
                break;
        }
        
        this.container.className = `calendar-grid ${this.view}-view`;
    }

    /**
     * Render month view
     */
    renderMonthView() {
        const days = getMonthDays(this.currentDate, this.weekStartsOn);
        
        // Render day headers
        const dayNames = [];
        for (let i = 0; i < 7; i++) {
            const dayIndex = (this.weekStartsOn + i) % 7;
            const tempDate = new Date(2024, 0, dayIndex); // Start from a Sunday
            dayNames.push(getDayName(tempDate, 'short'));
        }
        
        dayNames.forEach(name => {
            const header = document.createElement('div');
            header.className = 'calendar-day-header';
            header.textContent = name;
            this.container.appendChild(header);
        });
        
        // Render days
        days.forEach(({ date, isCurrentMonth }) => {
            const dayEl = this.createDayCell(date, isCurrentMonth);
            this.container.appendChild(dayEl);
        });
    }

    /**
     * Create a day cell for month view
     */
    createDayCell(date, isCurrentMonth) {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        
        if (!isCurrentMonth) {
            dayEl.classList.add('other-month');
        }
        if (isToday(date)) {
            dayEl.classList.add('today');
        }
        
        // Day number
        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = date.getDate();
        dayEl.appendChild(dayNumber);
        
        // Events
        const events = this.getEventsForDate(date);
        if (events.length > 0) {
            const eventsContainer = document.createElement('div');
            eventsContainer.className = 'day-events';
            
            const displayEvents = events.slice(0, this.maxEventsPerDay);
            displayEvents.forEach(event => {
                const eventEl = this.createEventElement(event);
                eventsContainer.appendChild(eventEl);
            });
            
            if (events.length > this.maxEventsPerDay) {
                const moreEl = document.createElement('div');
                moreEl.className = 'event-more';
                moreEl.textContent = `+${events.length - this.maxEventsPerDay} more`;
                moreEl.addEventListener('click', () => {
                    // Show all events for this day
                    this.showDayEvents(date, events);
                });
                eventsContainer.appendChild(moreEl);
            }
            
            dayEl.appendChild(eventsContainer);
        }
        
        return dayEl;
    }

    /**
     * Render week view
     */
    renderWeekView() {
        const weekStart = startOfWeek(this.currentDate, this.weekStartsOn);
        const hours = getDayHours();
        
        this.container.className = 'calendar-grid week-view';
        
        // Empty cell for top-left corner
        const cornerCell = document.createElement('div');
        cornerCell.className = 'time-slot';
        this.container.appendChild(cornerCell);
        
        // Day headers
        for (let i = 0; i < 7; i++) {
            const date = addDays(weekStart, i);
            const headerEl = document.createElement('div');
            headerEl.className = 'week-day-header';
            if (isToday(date)) {
                headerEl.classList.add('today');
            }
            
            const dayName = document.createElement('div');
            dayName.className = 'week-day-name';
            dayName.textContent = getDayName(date, 'short');
            
            const dayNumber = document.createElement('div');
            dayNumber.className = 'week-day-number';
            dayNumber.textContent = date.getDate();
            
            headerEl.appendChild(dayName);
            headerEl.appendChild(dayNumber);
            this.container.appendChild(headerEl);
        }
        
        // Hour rows
        hours.forEach(hour => {
            // Time label
            const timeLabel = document.createElement('div');
            timeLabel.className = 'time-slot';
            timeLabel.textContent = formatHour(hour);
            this.container.appendChild(timeLabel);
            
            // Day cells with events
            for (let i = 0; i < 7; i++) {
                const date = addDays(weekStart, i);
                const cellEl = document.createElement('div');
                cellEl.className = 'week-hour-cell';
                cellEl.dataset.day = i;
                cellEl.dataset.hour = hour;
                if (isToday(date)) {
                    cellEl.classList.add('today');
                }
                
                // Add events that START in this hour (not all events that span it)
                const events = this.getEventsStartingInHour(date, hour);
                events.forEach(event => {
                    const eventEl = this.createWeekEventElement(event, date, hour);
                    if (eventEl) {
                        cellEl.appendChild(eventEl);
                    }
                });
                
                this.container.appendChild(cellEl);
            }
        });
    }

    /**
     * Render day view
     */
    renderDayView() {
        const hours = getDayHours();
        
        this.container.className = 'calendar-grid day-view';
        
        // Day header
        const headerEl = document.createElement('div');
        headerEl.className = 'day-view-header';
        
        const weekday = document.createElement('div');
        weekday.className = 'day-view-weekday';
        weekday.textContent = getDayName(this.currentDate);
        
        const dateNum = document.createElement('div');
        dateNum.className = 'day-view-date';
        dateNum.textContent = this.currentDate.getDate();
        
        headerEl.appendChild(weekday);
        headerEl.appendChild(dateNum);
        this.container.appendChild(headerEl);
        
        // Hour rows
        hours.forEach(hour => {
            // Time label
            const timeLabel = document.createElement('div');
            timeLabel.className = 'time-slot';
            timeLabel.textContent = formatHour(hour);
            this.container.appendChild(timeLabel);
            
            // Hour cell with events
            const cellEl = document.createElement('div');
            cellEl.className = 'week-hour-cell';
            cellEl.dataset.hour = hour;
            if (isToday(this.currentDate)) {
                cellEl.classList.add('today');
            }
            
            // Add events that START in this hour
            const events = this.getEventsStartingInHour(this.currentDate, hour);
            events.forEach(event => {
                const eventEl = this.createWeekEventElement(event, this.currentDate, hour);
                if (eventEl) {
                    cellEl.appendChild(eventEl);
                }
            });
            
            this.container.appendChild(cellEl);
        });
    }

    /**
     * Create event element for month view
     */
    createEventElement(event) {
        const eventEl = document.createElement('div');
        eventEl.className = 'event-item';
        if (event.allDay) {
            eventEl.classList.add('all-day');
        }
        
        // Apply event color if available
        if (event.color) {
            eventEl.style.backgroundColor = event.color;
            eventEl.style.borderLeftColor = event.color;
        }
        
        const timePrefix = event.allDay ? '' : `${formatTime(event.start)} `;
        eventEl.textContent = `${timePrefix}${event.summary || 'Untitled Event'}`;
        eventEl.title = event.summary || 'Untitled Event';
        
        eventEl.addEventListener('click', (e) => {
            e.stopPropagation();
            this.onEventClick(event);
        });
        
        return eventEl;
    }

    /**
     * Create event element for week/day view with proper height for duration
     */
    createWeekEventElement(event, date, startHour) {
        const eventEl = document.createElement('div');
        eventEl.className = 'week-event-item';
        
        // Apply event color if available
        if (event.color) {
            eventEl.style.backgroundColor = event.color;
            eventEl.style.borderLeftColor = event.color;
        }
        
        const eventStart = event.start;
        const eventEnd = event.end || eventStart;
        
        // Calculate how many hours this event spans
        const dayStart = startOfDay(date);
        const dayEnd = endOfDay(date);
        
        // Clamp event to current day
        const clampedStart = eventStart < dayStart ? dayStart : eventStart;
        const clampedEnd = eventEnd > dayEnd ? dayEnd : eventEnd;
        
        const startHourDecimal = clampedStart.getHours() + clampedStart.getMinutes() / 60;
        const endHourDecimal = clampedEnd.getHours() + clampedEnd.getMinutes() / 60;
        const durationHours = endHourDecimal - startHourDecimal;
        
        // Calculate height (60px per hour as defined in CSS)
        const cellHeight = 60;
        const height = Math.max(durationHours * cellHeight - 4, 20); // Subtract 4px for padding, minimum 20px
        
        eventEl.style.height = `${height}px`;
        
        // Content
        const timeEl = document.createElement('div');
        timeEl.className = 'event-time';
        timeEl.textContent = formatTime(eventStart);
        
        const titleEl = document.createElement('div');
        titleEl.textContent = event.summary || 'Untitled Event';
        
        eventEl.appendChild(timeEl);
        eventEl.appendChild(titleEl);
        
        eventEl.addEventListener('click', (e) => {
            e.stopPropagation();
            this.onEventClick(event);
        });
        
        return eventEl;
    }

    /**
     * Show all events for a day (when "+X more" is clicked)
     */
    showDayEvents(date, events) {
        // Create a simple list modal showing all events for the day
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.display = 'flex';
        
        const content = document.createElement('div');
        content.className = 'modal-content';
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'modal-close';
        closeBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>`;
        closeBtn.addEventListener('click', () => modal.remove());
        
        const body = document.createElement('div');
        body.className = 'modal-body';
        
        const title = document.createElement('h2');
        title.textContent = formatDate(date);
        body.appendChild(title);
        
        events.forEach(event => {
            const eventDiv = document.createElement('div');
            eventDiv.style.cssText = 'padding: 12px; margin: 8px 0; background: var(--color-bg-secondary); border-radius: 8px; cursor: pointer;';
            eventDiv.innerHTML = `
                <strong>${event.summary || 'Untitled Event'}</strong><br>
                <small>${event.allDay ? 'All Day' : formatTime(event.start)}</small>
            `;
            eventDiv.addEventListener('click', () => {
                modal.remove();
                this.onEventClick(event);
            });
            body.appendChild(eventDiv);
        });
        
        content.appendChild(closeBtn);
        content.appendChild(body);
        modal.appendChild(content);
        document.body.appendChild(modal);
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
}
