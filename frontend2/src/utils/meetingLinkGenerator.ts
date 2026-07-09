/**
 * Meeting Link Generation Utilities
 * Generates meeting links for different providers with validation
 */

export interface MeetingDetails {
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  duration: number; // minutes
  provider: 'jitsi' | 'google_meet' | 'zoom' | 'teams';
  description?: string;
  timezone?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validate meeting inputs before generation
 */
export function validateMeetingInputs(details: MeetingDetails): ValidationError[] {
  const errors: ValidationError[] = [];

  // Title validation
  if (!details.title || details.title.trim().length === 0) {
    errors.push({ field: 'title', message: 'Meeting title is required' });
  } else if (details.title.length > 200) {
    errors.push({ field: 'title', message: 'Meeting title must be less than 200 characters' });
  }

  // Date validation
  if (!details.date) {
    errors.push({ field: 'date', message: 'Meeting date is required' });
  }

  // Time validation
  if (!details.time) {
    errors.push({ field: 'time', message: 'Meeting time is required' });
  }

  // Combined datetime validation (past check)
  if (details.date && details.time) {
    const meetingDateTime = new Date(`${details.date}T${details.time}`);
    const now = new Date();
    
    if (meetingDateTime < now) {
      errors.push({ 
        field: 'datetime', 
        message: 'Meeting must be scheduled for a future date and time' 
      });
    }
  }

  // Duration validation
  if (!details.duration || details.duration < 15 || details.duration > 180) {
    errors.push({ 
      field: 'duration', 
      message: 'Duration must be between 15 and 180 minutes' 
    });
  }

  // Provider validation
  const validProviders = ['jitsi', 'google_meet', 'zoom', 'teams'];
  if (!details.provider || !validProviders.includes(details.provider)) {
    errors.push({ 
      field: 'provider', 
      message: 'Please select a valid meeting provider' 
    });
  }

  return errors;
}

/**
 * Generate a safe slug from text
 */
function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 50);
}

/**
 * Generate a unique room name for Jitsi
 */
function generateJitsiRoomName(title: string, date: string, time: string): string {
  const slug = generateSlug(title);
  const dateSlug = date.replace(/-/g, '');
  const timeSlug = time.replace(/:/g, '');
  const random = Math.random().toString(36).substring(2, 8);
  
  return `${slug}-${dateSlug}-${timeSlug}-${random}`;
}

/**
 * Format date for Google Calendar
 */
function formatGoogleCalendarDate(date: string, time: string, duration: number): string {
  const startDateTime = new Date(`${date}T${time}`);
  const endDateTime = new Date(startDateTime.getTime() + duration * 60000);
  
  const formatDateTime = (dt: Date) => {
    return dt.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };
  
  return `${formatDateTime(startDateTime)}/${formatDateTime(endDateTime)}`;
}

/**
 * Generate meeting link based on provider
 */
export function generateMeetingLink(details: MeetingDetails): string {
  const { title, date, time, duration, provider, description } = details;

  switch (provider) {
    case 'jitsi': {
      const roomName = generateJitsiRoomName(title, date, time);
      return `https://meet.jit.si/${roomName}`;
    }

    case 'google_meet': {
      // Generate a pre-filled Google Calendar event URL
      const encodedTitle = encodeURIComponent(title);
      const encodedDescription = encodeURIComponent(description || `Scheduled meeting: ${title}`);
      const dates = formatGoogleCalendarDate(date, time, duration);
      
      return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodedTitle}&dates=${dates}&details=${encodedDescription}&sf=true&output=xml`;
    }

    case 'zoom': {
      // For Zoom, we'd typically need API integration
      // For now, return a placeholder indicating backend generation needed
      return 'ZOOM_LINK_REQUIRES_API';
    }

    case 'teams': {
      // For Teams, we'd typically need API integration
      // For now, return a placeholder indicating backend generation needed
      return 'TEAMS_LINK_REQUIRES_API';
    }

    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

/**
 * Get provider display name
 */
export function getProviderDisplayName(provider: string): string {
  const names: Record<string, string> = {
    'jitsi': 'Jitsi Meet',
    'google_meet': 'Google Calendar Event',
    'zoom': 'Zoom Meeting',
    'teams': 'Microsoft Teams'
  };
  return names[provider] || provider;
}

/**
 * Check if provider requires backend API
 */
export function requiresBackendAPI(provider: string): boolean {
  return ['zoom', 'teams'].includes(provider);
}

/**
 * Format duration for display
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}
