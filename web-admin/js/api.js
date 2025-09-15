// API Service for Smart Waste Management System
class ApiService {
    constructor() {
        this.baseURL = CONFIG.API_BASE_URL;
        this.token = localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
        this.requestQueue = [];
        this.isRefreshing = false;
    }

    // Set authentication token
    setToken(token) {
        this.token = token;
        localStorage.setItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN, token);
    }

    // Remove authentication token
    removeToken() {
        this.token = null;
        localStorage.removeItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
    }

    // Get default headers
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        return headers;
    }

    // Make HTTP request
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: this.getHeaders(),
            ...options
        };

        try {
            const response = await fetch(url, config);
            
            // Handle authentication errors
            if (response.status === 401) {
                this.handleUnauthorized();
                throw new Error(CONFIG.ERROR_MESSAGES.UNAUTHORIZED);
            }

            // Handle other HTTP errors
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || this.getErrorMessage(response.status));
            }

            return await response.json();
        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    }

    // GET request
    async get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        
        return this.request(url, {
            method: 'GET'
        });
    }

    // POST request
    async post(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // PUT request
    async put(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    // DELETE request
    async delete(endpoint) {
        return this.request(endpoint, {
            method: 'DELETE'
        });
    }

    // Handle unauthorized access
    handleUnauthorized() {
        this.removeToken();
        // Redirect to login page
        if (window.location.pathname !== '/login') {
            window.location.href = '/login';
        }
    }

    // Get error message based on status code
    getErrorMessage(status) {
        switch (status) {
            case 400:
                return CONFIG.ERROR_MESSAGES.VALIDATION_ERROR;
            case 401:
                return CONFIG.ERROR_MESSAGES.UNAUTHORIZED;
            case 403:
                return CONFIG.ERROR_MESSAGES.FORBIDDEN;
            case 404:
                return CONFIG.ERROR_MESSAGES.NOT_FOUND;
            case 500:
                return CONFIG.ERROR_MESSAGES.SERVER_ERROR;
            default:
                return CONFIG.ERROR_MESSAGES.UNKNOWN_ERROR;
        }
    }

    // Authentication APIs
    async login(credentials) {
        const response = await this.post('/auth/login', credentials);
        if (response.success && response.token) {
            this.setToken(response.token);
        }
        return response;
    }

    async register(userData) {
        return this.post('/auth/register', userData);
    }

    async logout() {
        this.removeToken();
        return { success: true };
    }

    async getProfile() {
        return this.get('/auth/profile');
    }

    async updateProfile(data) {
        return this.put('/auth/profile', data);
    }

    // Vehicle APIs
    async getVehicles(filters = {}) {
        return this.get('/vehicles/overview', filters);
    }

    async getVehicle(vehicleId) {
        return this.get(`/vehicles/${vehicleId}/location`);
    }

    async registerVehicle(vehicleData) {
        return this.post('/vehicles/register', vehicleData);
    }

    async updateVehicleStatus(vehicleId, statusData) {
        return this.put(`/vehicles/${vehicleId}/status`, statusData);
    }

    async getVehicleRoute(vehicleId) {
        return this.get(`/vehicles/${vehicleId}/route`);
    }

    async getVehicleAnalytics(params = {}) {
        return this.get('/vehicles/analytics', params);
    }

    // Bin APIs
    async getBins(filters = {}) {
        return this.get('/bins/collection-priority', filters);
    }

    async getBin(binId) {
        return this.get(`/bins/${binId}/status`);
    }

    async registerBin(binData) {
        return this.post('/bins/register', binData);
    }

    async updateBinSensorData(binId, sensorData) {
        return this.put(`/bins/${binId}/sensor-data`, sensorData);
    }

    async getNearbyBins(lat, lng, radius = 500) {
        return this.get('/bins/nearby', { lat, lng, radius });
    }

    async collectBin(binId, collectionData) {
        return this.post(`/bins/${binId}/collect`, collectionData);
    }

    async reportMaintenance(binId, maintenanceData) {
        return this.post(`/bins/${binId}/maintenance`, maintenanceData);
    }

    async getBinAnalytics(params = {}) {
        return this.get('/bins/analytics', params);
    }

    // Route APIs
    async getActiveRoutes() {
        return this.get('/routes/active');
    }

    async optimizeRoute(routeData) {
        return this.post('/routes/optimize', routeData);
    }

    async updateRouteProgress(routeId, progressData) {
        return this.put(`/routes/${routeId}/progress`, progressData);
    }

    async getRouteAnalytics(params = {}) {
        return this.get('/routes/analytics', params);
    }

    // Analytics APIs
    async getDashboardAnalytics(period = 'daily') {
        return this.get('/analytics/dashboard', { period });
    }

    async getEnvironmentalImpact(period = 'monthly') {
        return this.get('/analytics/environmental-impact', { period });
    }

    async getPredictions() {
        return this.get('/analytics/predictions');
    }

    async generateReport(reportData) {
        return this.post('/analytics/reports/generate', reportData);
    }

    // User Management APIs (Admin only)
    async getUsers(filters = {}) {
        return this.get('/users', filters);
    }

    async createUser(userData) {
        return this.post('/users', userData);
    }

    async updateUser(userId, userData) {
        return this.put(`/users/${userId}`, userData);
    }

    async deleteUser(userId) {
        return this.delete(`/users/${userId}`);
    }

    // File Upload API
    async uploadFile(file, endpoint = '/upload') {
        const formData = new FormData();
        formData.append('file', file);

        return this.request(endpoint, {
            method: 'POST',
            body: formData,
            headers: {
                'Authorization': `Bearer ${this.token}`
            }
        });
    }

    // Batch operations
    async batchRequest(requests) {
        const promises = requests.map(request => {
            const { method, endpoint, data } = request;
            switch (method.toLowerCase()) {
                case 'get':
                    return this.get(endpoint, data);
                case 'post':
                    return this.post(endpoint, data);
                case 'put':
                    return this.put(endpoint, data);
                case 'delete':
                    return this.delete(endpoint);
                default:
                    throw new Error(`Unsupported method: ${method}`);
            }
        });

        return Promise.allSettled(promises);
    }

    // Health check
    async healthCheck() {
        try {
            const response = await fetch(`${this.baseURL.replace('/api', '')}/health`);
            return response.ok;
        } catch (error) {
            return false;
        }
    }
}

// Create global API service instance
const apiService = new ApiService();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ApiService;
}