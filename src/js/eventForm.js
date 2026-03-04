import { generateId, formatDateForInput } from './utils.js';

/**
 * EventForm class - handles creating and editing calendar events
 */
export class EventForm {
    constructor(onSave) {
        this.onSave = onSave;
        this.modal = document.getElementById('eventFormModal');
        this.form = document.getElementById('eventForm');
        this.currentEvent = null;
        this.editMode = false;
        
        this.initializeElements();
        this.attachEventListeners();
    }

    initializeElements() {
        if (!this.modal || !this.form) {
            console.error('Event form modal or form element not found');
            return;
        }
        
        // Form inputs
        this.summaryInput = document.getElementById('eventSummary');
        this.calendarSelect = document.getElementById('eventCalendar');
        this.startDateInput = document.getElementById('eventStartDate');
        this.startTimeInput = document.getElementById('eventStartTime');
        this.endDateInput = document.getElementById('eventEndDate');
        this.endTimeInput = document.getElementById('eventEndTime');
        this.allDayCheckbox = document.getElementById('eventAllDay');
        this.locationInput = document.getElementById('eventLocation');
        this.descriptionInput = document.getElementById('eventDescription');
        this.categoriesInput = document.getElementById('eventCategories');
        
        // Time containers
        this.startTimeContainer = document.getElementById('startTimeContainer');
        this.endTimeContainer = document.getElementById('endTimeContainer');
        
        // Buttons
        this.cancelButton = document.getElementById('cancelEventBtn');
        this.saveButton = document.getElementById('saveEventBtn');
        this.closeButton = this.modal.querySelector('.close');
        
        // Modal title
        this.modalTitle = document.getElementById('eventFormTitle');
    }

    attachEventListeners() {
        if (!this.closeButton || !this.cancelButton || !this.form || !this.modal) {
            console.error('Required elements for event form not found');
            return;
        }
        
        // Close modal
        this.closeButton.addEventListener('click', () => this.close());
        this.cancelButton.addEventListener('click', () => this.close());
        
        // Click outside modal to close
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });
        
        // Form submission
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSave();
        });
        
        // All-day checkbox toggle
        this.allDayCheckbox.addEventListener('change', () => {
            this.toggleTimeInputs();
        });
        
        // Auto-populate end date/time when start changes
        this.startDateInput.addEventListener('change', () => {
            if (!this.endDateInput.value) {
                this.endDateInput.value = this.startDateInput.value;
            }
        });
        
        this.startTimeInput.addEventListener('change', () => {
            if (!this.endTimeInput.value && this.startTimeInput.value) {
                // Set end time to 1 hour after start time
                const [hours, minutes] = this.startTimeInput.value.split(':');
                const endHour = (parseInt(hours) + 1) % 24;
                this.endTimeInput.value = `${String(endHour).padStart(2, '0')}:${minutes}`;
            }
        });
    }

    toggleTimeInputs() {
        const isAllDay = this.allDayCheckbox.checked;
        this.startTimeContainer.style.display = isAllDay ? 'none' : 'block';
        this.endTimeContainer.style.display = isAllDay ? 'none' : 'block';
    }

    /**
     * Populate calendar selector dropdown
     */
    populateCalendarSelect(calendars) {
        if (!this.calendarSelect) return;
        
        // Clear existing options except the first one
        this.calendarSelect.innerHTML = '<option value="">Select a calendar</option>';
        
        // Add calendar options
        calendars.forEach(calendar => {
            const option = document.createElement('option');
            option.value = calendar.id;
            option.textContent = calendar.name;
            option.style.color = calendar.color;
            this.calendarSelect.appendChild(option);
        });
        
        // Select first calendar by default if available
        if (calendars.length > 0) {
            this.calendarSelect.value = calendars[0].id;
        }
    }

    /**
     * Open form for creating a new event
     */
    openForNew(prefilledData = {}, calendars = []) {
        this.editMode = false;
        this.currentEvent = null;
        this.modalTitle.textContent = 'Add New Event';
        this.saveButton.textContent = 'Add Event';
        
        this.resetForm();
        
        // Populate calendar selector
        this.populateCalendarSelect(calendars);
        
        // Pre-fill with provided data (e.g., clicked date/time)
        if (prefilledData.date) {
            this.startDateInput.value = prefilledData.date;
            this.endDateInput.value = prefilledData.date;
        } else {
            // Default to today
            const today = new Date();
            this.startDateInput.value = formatDateForInput(today);
            this.endDateInput.value = formatDateForInput(today);
        }
        
        if (prefilledData.time) {
            this.startTimeInput.value = prefilledData.time;
            // Set end time to 1 hour later
            const [hours, minutes] = prefilledData.time.split(':');
            const endHour = (parseInt(hours) + 1) % 24;
            this.endTimeInput.value = `${String(endHour).padStart(2, '0')}:${minutes}`;
        } else {
            // Default to current time rounded to next hour
            const now = new Date();
            const nextHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0, 0);
            this.startTimeInput.value = `${String(nextHour.getHours()).padStart(2, '0')}:00`;
            const endHour = (nextHour.getHours() + 1) % 24;
            this.endTimeInput.value = `${String(endHour).padStart(2, '0')}:00`;
        }
        
        this.toggleTimeInputs();
        this.modal.classList.remove('hidden');
        this.summaryInput.focus();
    }

    /**
     * Open form for editing an existing event
     */
    openForEdit(event) {
        this.editMode = true;
        this.currentEvent = event;
        this.modalTitle.textContent = 'Edit Event';
        this.saveButton.textContent = 'Save Changes';
        
        this.resetForm();
        this.populateForm(event);
        this.toggleTimeInputs();
        
        this.modal.classList.remove('hidden');
        this.summaryInput.focus();
    }

    populateForm(event) {
        this.summaryInput.value = event.summary || '';
        this.locationInput.value = event.location || '';
        this.descriptionInput.value = event.description || '';
        this.allDayCheckbox.checked = event.allDay || false;
        
        if (event.categories && event.categories.length > 0) {
            this.categoriesInput.value = event.categories.join(', ');
        }
        
        // Format dates
        if (event.start) {
            const start = new Date(event.start);
            this.startDateInput.value = formatDateForInput(start);
            if (!event.allDay) {
                this.startTimeInput.value = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
            }
        }
        
        if (event.end) {
            const end = new Date(event.end);
            this.endDateInput.value = formatDateForInput(end);
            if (!event.allDay) {
                this.endTimeInput.value = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
            }
        }
    }

    resetForm() {
        this.form.reset();
        this.summaryInput.value = '';
        this.locationInput.value = '';
        this.descriptionInput.value = '';
        this.categoriesInput.value = '';
        this.allDayCheckbox.checked = false;
    }

    close() {
        this.modal.classList.add('hidden');
        this.resetForm();
        this.currentEvent = null;
        this.editMode = false;
    }

    handleSave() {
        // Validate form
        if (!this.summaryInput.value.trim()) {
            alert('Please enter an event title.');
            this.summaryInput.focus();
            return;
        }
        
        if (!this.calendarSelect.value) {
            alert('Please select a calendar.');
            this.calendarSelect.focus();
            return;
        }
        
        if (!this.startDateInput.value) {
            alert('Please enter a start date.');
            this.startDateInput.focus();
            return;
        }
        
        if (!this.endDateInput.value) {
            alert('Please enter an end date.');
            this.endDateInput.focus();
            return;
        }
        
        // Build event object
        const eventData = this.buildEventData();
        
        // Validate dates
        if (eventData.end < eventData.start) {
            alert('End date/time must be after start date/time.');
            return;
        }
        
        // Call the save callback
        if (this.onSave) {
            this.onSave(eventData, this.editMode, this.currentEvent);
        }
        
        this.close();
    }

    buildEventData() {
        const isAllDay = this.allDayCheckbox.checked;
        
        // Parse start date/time
        let start;
        if (isAllDay) {
            start = new Date(this.startDateInput.value + 'T00:00:00');
        } else {
            const startTime = this.startTimeInput.value || '00:00';
            start = new Date(this.startDateInput.value + 'T' + startTime + ':00');
        }
        
        // Parse end date/time
        let end;
        if (isAllDay) {
            end = new Date(this.endDateInput.value + 'T23:59:59');
        } else {
            const endTime = this.endTimeInput.value || '23:59';
            end = new Date(this.endDateInput.value + 'T' + endTime + ':00');
        }
        
        // Parse categories
        const categoriesStr = this.categoriesInput.value.trim();
        const categories = categoriesStr ? categoriesStr.split(',').map(cat => cat.trim()).filter(cat => cat) : [];
        
        return {
            uid: this.editMode && this.currentEvent ? this.currentEvent.uid : generateId(),
            summary: this.summaryInput.value.trim(),
            description: this.descriptionInput.value.trim(),
            location: this.locationInput.value.trim(),
            start: start,
            end: end,
            allDay: isAllDay,
            categories: categories,
            status: 'CONFIRMED',
            calendarId: this.calendarSelect.value
        };
    }
}
