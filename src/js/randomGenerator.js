/**
 * Random Calendar Event Generator
 * Generates realistic calendar events with seeded randomness
 */

// Global data storage
let eventTemplates = null;
let personNames = null;
let placeholders = null;
let timePatterns = null;

/**
 * Load JSON data files
 */
async function loadDataFiles() {
    if (eventTemplates) return; // Already loaded
    
    try {
        const [templates, names, holders, patterns] = await Promise.all([
            fetch('data/event-templates.json').then(r => r.json()),
            fetch('data/person-names.json').then(r => r.json()),
            fetch('data/placeholders.json').then(r => r.json()),
            fetch('data/time-patterns.json').then(r => r.json())
        ]);
        
        eventTemplates = templates;
        personNames = names;
        placeholders = holders;
        timePatterns = patterns;
    } catch (error) {
        throw new Error(`Failed to load event data: ${error.message}`);
    }
}

/**
 * Seeded Random Number Generator (LCG algorithm)
 */
class SeededRandom {
    constructor(seed) {
        this.seed = seed % 2147483647;
        if (this.seed <= 0) this.seed += 2147483646;
    }
    
    /**
     * Get next random number between 0 and 1
     */
    next() {
        this.seed = (this.seed * 16807) % 2147483647;
        return (this.seed - 1) / 2147483646;
    }
    
    /**
     * Get random integer between min (inclusive) and max (inclusive)
     */
    nextInt(min, max) {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }
    
    /**
     * Choose random item from array
     */
    choice(array) {
        if (!array || array.length === 0) return null;
        return array[Math.floor(this.next() * array.length)];
    }
    
    /**
     * Shuffle array (Fisher-Yates)
     */
    shuffle(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(this.next() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }
}

/**
 * Generate a random person name
 */
function generatePersonName(rng) {
    const firstName = rng.choice(personNames.firstNames);
    const lastName = rng.choice(personNames.lastNames);
    return `${firstName} ${lastName}`;
}

/**
 * Generate a random email from name
 */
function generateEmail(name, rng) {
    const domain = rng.choice(personNames.emailDomains);
    const cleanName = name.toLowerCase().replace(/\s+/g, '.');
    return `${cleanName}@${domain}`;
}

/**
 * Replace placeholders in text
 */
function replacePlaceholders(text, rng) {
    return text
        .replace(/\{person\}/g, () => generatePersonName(rng))
        .replace(/\{topic\}/g, () => rng.choice(placeholders.topics))
        .replace(/\{project\}/g, () => rng.choice(placeholders.projects))
        .replace(/\{city\}/g, () => rng.choice(placeholders.cities));
}

/**
 * Pick item based on weight property
 */
function pickWeighted(rng, items) {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    let random = rng.next() * totalWeight;
    
    for (const item of items) {
        random -= item.weight;
        if (random <= 0) return item;
    }
    
    return items[items.length - 1];
}

/**
 * Round time to nearest interval (default 15 minutes)
 */
function roundTime(date, minutes = 15) {
    const ms = 1000 * 60 * minutes;
    return new Date(Math.round(date.getTime() / ms) * ms);
}

/**
 * Generate random date/time with weighted distribution
 */
function generateWeightedTime(rng, startDate, endDate, businessHoursWeighted = true) {
    // Generate random date in range
    const timeRange = endDate.getTime() - startDate.getTime();
    const randomTime = startDate.getTime() + rng.next() * timeRange;
    const date = new Date(randomTime);
    
    // Weekend reduction
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    if (isWeekend && rng.next() > timePatterns.weekendReduction) {
        return null; // Skip this time slot, retry
    }
    
    if (!businessHoursWeighted) {
        // Random time of day
        date.setHours(rng.nextInt(6, 22), rng.nextInt(0, 59), 0, 0);
        return roundTime(date, timePatterns.timeRounding);
    }
    
    // Weighted time distribution
    const rand = rng.next();
    let hour;
    
    if (rand < timePatterns.businessHours.weight) {
        // Business hours (9am-5pm)
        hour = rng.nextInt(timePatterns.businessHours.startHour, timePatterns.businessHours.endHour - 1);
    } else if (rand < timePatterns.businessHours.weight + timePatterns.earlyLate.weight) {
        // Early morning or late evening
        const ranges = timePatterns.earlyLate.ranges;
        const range = rng.choice(ranges);
        hour = rng.nextInt(range.startHour, range.endHour - 1);
    } else {
        // Other times
        const ranges = timePatterns.other.ranges;
        const range = rng.choice(ranges);
        hour = rng.nextInt(range.startHour, range.endHour - 1);
    }
    
    date.setHours(hour, rng.nextInt(0, 3) * 15, 0, 0); // Round to 0, 15, 30, 45 minutes
    return roundTime(date, timePatterns.timeRounding);
}

/**
 * Generate unique UID for event
 */
function generateUID(seed, index) {
    return `random-${seed}-${index}@timeview-calendar`;
}

/**
 * Generate meeting event
 */
function generateMeeting(rng, startDate, endDate, index, seed) {
    const template = eventTemplates.meetings;
    
    // Pick title and replace placeholders
    const title = replacePlaceholders(rng.choice(template.titles), rng);
    
    // Generate start time (weighted toward business hours)
    let start = generateWeightedTime(rng, startDate, endDate, true);
    let attempts = 0;
    while (!start && attempts < 10) {
        start = generateWeightedTime(rng, startDate, endDate, true);
        attempts++;
    }
    if (!start) start = new Date(startDate.getTime() + rng.next() * (endDate.getTime() - startDate.getTime()));
    
    // Pick duration based on weights
    const duration = pickWeighted(rng, template.durations);
    const end = new Date(start.getTime() + duration.minutes * 60000);
    
    // Generate organizer
    const organizerName = generatePersonName(rng);
    const organizer = {
        name: organizerName,
        email: generateEmail(organizerName, rng)
    };
    
    // Generate attendees (2-5)
    const attendeeCount = rng.nextInt(2, 5);
    const attendees = [];
    for (let i = 0; i < attendeeCount; i++) {
        const name = generatePersonName(rng);
        attendees.push({
            name,
            email: generateEmail(name, rng),
            role: 'REQ-PARTICIPANT',
            status: 'ACCEPTED'
        });
    }
    
    return {
        uid: generateUID(seed, index),
        summary: title,
        description: replacePlaceholders(rng.choice(template.descriptions), rng),
        location: rng.choice(template.locations),
        start,
        end,
        allDay: false,
        organizer,
        attendees,
        status: rng.next() < 0.8 ? 'CONFIRMED' : 'TENTATIVE',
        raw: {}
    };
}

/**
 * Generate appointment event
 */
function generateAppointment(rng, startDate, endDate, index, seed) {
    const template = eventTemplates.appointments;
    
    // Pick title and replace placeholders
    const title = replacePlaceholders(rng.choice(template.titles), rng);
    
    // Generate start time (not as heavily weighted to business hours)
    let start = generateWeightedTime(rng, startDate, endDate, false);
    let attempts = 0;
    while (!start && attempts < 10) {
        start = generateWeightedTime(rng, startDate, endDate, false);
        attempts++;
    }
    if (!start) start = new Date(startDate.getTime() + rng.next() * (endDate.getTime() - startDate.getTime()));
    
    // Pick duration based on weights
    const duration = pickWeighted(rng, template.durations);
    const end = new Date(start.getTime() + duration.minutes * 60000);
    
    // Sometimes include an attendee (50% chance)
    const attendees = [];
    if (rng.next() < 0.5) {
        const name = generatePersonName(rng);
        attendees.push({
            name,
            email: generateEmail(name, rng),
            role: 'REQ-PARTICIPANT',
            status: 'ACCEPTED'
        });
    }
    
    return {
        uid: generateUID(seed, index),
        summary: title,
        description: replacePlaceholders(rng.choice(template.descriptions), rng),
        location: rng.choice(template.locations),
        start,
        end,
        allDay: false,
        attendees: attendees.length > 0 ? attendees : undefined,
        status: rng.next() < 0.9 ? 'CONFIRMED' : 'TENTATIVE',
        raw: {}
    };
}

/**
 * Generate all-day event
 */
function generateAllDayEvent(rng, startDate, endDate, index, seed) {
    const template = eventTemplates.allDay;
    
    // Pick title and replace placeholders
    const title = replacePlaceholders(rng.choice(template.titles), rng);
    
    // Generate random date in range
    const timeRange = endDate.getTime() - startDate.getTime();
    const randomTime = startDate.getTime() + rng.next() * timeRange;
    const date = new Date(randomTime);
    
    // Set to start of day
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000); // Next day
    
    return {
        uid: generateUID(seed, index),
        summary: title,
        description: rng.choice(template.descriptions),
        location: '',
        start,
        end,
        allDay: true,
        status: 'CONFIRMED',
        raw: {}
    };
}

/**
 * Generate multi-day event
 */
function generateMultiDayEvent(rng, startDate, endDate, index, seed) {
    const template = eventTemplates.multiDay;
    
    // Pick title and replace placeholders
    const title = replacePlaceholders(rng.choice(template.titles), rng);
    
    // Generate random date in range
    const timeRange = endDate.getTime() - startDate.getTime();
    const randomTime = startDate.getTime() + rng.next() * timeRange;
    const date = new Date(randomTime);
    
    // Set to start of day
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    // Pick duration based on weights
    const duration = pickWeighted(rng, template.durations);
    const end = new Date(start.getTime() + duration.days * 24 * 60 * 60 * 1000);
    
    return {
        uid: generateUID(seed, index),
        summary: title,
        description: replacePlaceholders(rng.choice(template.descriptions), rng),
        location: rng.choice(template.locations),
        start,
        end,
        allDay: true,
        status: 'CONFIRMED',
        raw: {}
    };
}

/**
 * Calculate type distribution based on requested types
 */
function calculateTypeWeights(types) {
    // Default weights when all types are included
    const defaultWeights = {
        meeting: 0.40,
        appointment: 0.30,
        allday: 0.20,
        multiday: 0.10
    };
    
    // Filter to only requested types
    const weights = {};
    let total = 0;
    
    for (const type of types) {
        if (defaultWeights[type]) {
            weights[type] = defaultWeights[type];
            total += defaultWeights[type];
        }
    }
    
    // Normalize to sum to 1.0
    if (total > 0) {
        for (const type in weights) {
            weights[type] /= total;
        }
    }
    
    return weights;
}

/**
 * Select event type based on weights
 */
function selectType(rng, typeWeights) {
    let random = rng.next();
    
    for (const [type, weight] of Object.entries(typeWeights)) {
        random -= weight;
        if (random <= 0) return type;
    }
    
    // Fallback
    return Object.keys(typeWeights)[0];
}

/**
 * Main export: Generate random events
 */
export async function generateRandomEvents(config) {
    // Load data files if not already loaded
    await loadDataFiles();
    
    const {
        seed = Date.now(),
        count = 20,
        daysBefore = 30,
        daysAfter = 30,
        types = ['meeting', 'appointment', 'allday', 'multiday'],
        name = 'Random Calendar'
    } = config;
    
    // Validate inputs
    const validCount = Math.min(200, Math.max(1, count));
    const validDaysBefore = Math.max(0, daysBefore);
    const validDaysAfter = Math.max(0, daysAfter);
    
    // Initialize RNG
    const rng = new SeededRandom(seed);
    
    // Calculate date range
    const now = new Date();
    const startDate = new Date(now.getTime() - validDaysBefore * 24 * 60 * 60 * 1000);
    const endDate = new Date(now.getTime() + validDaysAfter * 24 * 60 * 60 * 1000);
    
    // Determine type distribution
    const typeWeights = calculateTypeWeights(types);
    
    // Generate events
    const events = [];
    for (let i = 0; i < validCount; i++) {
        const type = selectType(rng, typeWeights);
        let event;
        
        try {
            switch(type) {
                case 'meeting':
                    event = generateMeeting(rng, startDate, endDate, i, seed);
                    break;
                case 'appointment':
                    event = generateAppointment(rng, startDate, endDate, i, seed);
                    break;
                case 'allday':
                    event = generateAllDayEvent(rng, startDate, endDate, i, seed);
                    break;
                case 'multiday':
                    event = generateMultiDayEvent(rng, startDate, endDate, i, seed);
                    break;
                default:
                    event = generateMeeting(rng, startDate, endDate, i, seed);
            }
            
            events.push(event);
        } catch (error) {
            console.warn(`Failed to generate event ${i}:`, error);
        }
    }
    
    // Sort by start date
    events.sort((a, b) => a.start - b.start);
    
    return events;
}
