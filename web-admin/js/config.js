// Configuration file for Smart Waste Management System
const CONFIG = {
    // API Configuration
    API_BASE_URL: 'http://localhost:3000/api',
    
    // Google Maps Configuration
    GOOGLE_MAPS_API_KEY: 'YOUR_GOOGLE_MAPS_API_KEY',
    
    // Default map center (Kolkata, India)
    DEFAULT_MAP_CENTER: {
        lat: 22.5726,
        lng: 88.3639
    },
    
    // Application Settings
    APP_NAME: 'Smart Waste Management',
    APP_VERSION: '1.0.0',
    DEVELOPER: 'QBrain Team',
    
    // Refresh Intervals (in milliseconds)
    REFRESH_INTERVALS: {
        DASHBOARD: 30000,      // 30 seconds
        VEHICLES: 15000,       // 15 seconds
        BINS: 20000,          // 20 seconds
        ROUTES: 10000,        // 10 seconds
        ANALYTICS: 60000      // 1 minute
    },
    
    // Chart Colors
    CHART_COLORS: {
        PRIMARY: '#2E7D32',
        SECONDARY: '#FF9800',
        SUCCESS: '#4CAF50',
        WARNING: '#FF9800',
        ERROR: '#F44336',
        INFO: '#2196F3',
        GRADIENT: [
            '#2E7D32',
            '#4CAF50',
            '#66BB6A',
            '#81C784',
            '#A5D6A7'
        ]
    },
    
    // Status Colors
    STATUS_COLORS: {
        ACTIVE: '#4CAF50',
        IDLE: '#FF9800',
        MAINTENANCE: '#F44336',
        OFFLINE: '#9E9E9E',
        FULL: '#F44336',
        NEEDS_COLLECTION: '#FF9800',
        EMPTY: '#4CAF50',
        NORMAL: '#2196F3'
    },
    
    // Pagination
    PAGINATION: {
        DEFAULT_PAGE_SIZE: 10,
        PAGE_SIZE_OPTIONS: [10, 25, 50, 100]
    },
    
    // File Upload
    FILE_UPLOAD: {
        MAX_SIZE: 5 * 1024 * 1024, // 5MB
        ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']
    },
    
    // Notification Settings
    NOTIFICATIONS: {
        DURATION: 5000, // 5 seconds
        POSITION: 'top-right'
    },
    
    // Local Storage Keys
    STORAGE_KEYS: {
        AUTH_TOKEN: 'smart_waste_token',
        USER_DATA: 'smart_waste_user',
        PREFERENCES: 'smart_waste_preferences',
        THEME: 'smart_waste_theme'
    },
    
    // Theme Settings
    THEMES: {
        LIGHT: 'light',
        DARK: 'dark',
        AUTO: 'auto'
    },
    
    // Date Formats
    DATE_FORMATS: {
        DISPLAY: 'DD/MM/YYYY',
        DISPLAY_TIME: 'DD/MM/YYYY HH:mm',
        API: 'YYYY-MM-DD',
        API_TIME: 'YYYY-MM-DDTHH:mm:ss'
    },
    
    // Validation Rules
    VALIDATION: {
        EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        PHONE_REGEX: /^[+]?[\d\s\-\(\)]{10,}$/,
        PASSWORD_MIN_LENGTH: 6,
        VEHICLE_ID_REGEX: /^[A-Z]{2}\d{4}$/,
        BIN_ID_REGEX: /^BIN\d{3,}$/
    },
    
    // Map Settings
    MAP_SETTINGS: {
        DEFAULT_ZOOM: 12,
        MIN_ZOOM: 8,
        MAX_ZOOM: 18,
        MARKER_COLORS: {
            VEHICLE_ACTIVE: '#4CAF50',
            VEHICLE_IDLE: '#FF9800',
            VEHICLE_MAINTENANCE: '#F44336',
            BIN_EMPTY: '#4CAF50',
            BIN_NORMAL: '#2196F3',
            BIN_NEEDS_COLLECTION: '#FF9800',
            BIN_FULL: '#F44336'
        }
    },
    
    // Error Messages
    ERROR_MESSAGES: {
        NETWORK_ERROR: 'Network error. Please check your connection.',
        UNAUTHORIZED: 'Session expired. Please login again.',
        FORBIDDEN: 'You do not have permission to perform this action.',
        NOT_FOUND: 'The requested resource was not found.',
        SERVER_ERROR: 'Server error. Please try again later.',
        VALIDATION_ERROR: 'Please check your input and try again.',
        UNKNOWN_ERROR: 'An unexpected error occurred.'
    },
    
    // Success Messages
    SUCCESS_MESSAGES: {
        LOGIN: 'Login successful!',
        LOGOUT: 'Logged out successfully!',
        SAVE: 'Data saved successfully!',
        UPDATE: 'Data updated successfully!',
        DELETE: 'Data deleted successfully!',
        CREATE: 'Created successfully!',
        UPLOAD: 'File uploaded successfully!'
    },
    
    // Loading Messages
    LOADING_MESSAGES: {
        DEFAULT: 'Loading...',
        LOGIN: 'Logging in...',
        SAVING: 'Saving...',
        UPDATING: 'Updating...',
        DELETING: 'Deleting...',
        UPLOADING: 'Uploading...',
        GENERATING: 'Generating report...'
    },
    
    // Feature Flags
    FEATURES: {
        DARK_MODE: true,
        NOTIFICATIONS: true,
        REAL_TIME_UPDATES: true,
        EXPORT_DATA: true,
        ADVANCED_ANALYTICS: true,
        MOBILE_APP_INTEGRATION: true
    },
    
    // Performance Settings
    PERFORMANCE: {
        DEBOUNCE_DELAY: 300,
        THROTTLE_DELAY: 1000,
        CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
        MAX_CONCURRENT_REQUESTS: 5
    }
};

// Environment-specific overrides
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    CONFIG.API_BASE_URL = 'http://localhost:3000/api';
} else if (window.location.hostname.includes('staging')) {
    CONFIG.API_BASE_URL = 'https://staging-api.smartwaste.com/api';
} else {
    CONFIG.API_BASE_URL = 'https://api.smartwaste.com/api';
}

// Freeze the configuration to prevent modifications
Object.freeze(CONFIG);

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}