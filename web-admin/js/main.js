// Main application controller
class SmartWasteApp {
    constructor() {
        this.currentUser = null;
        this.currentPage = 'dashboard';
        this.refreshIntervals = {};
        this.isInitialized = false;
        
        this.init();
    }

    async init() {
        try {
            // Show loading screen
            this.showLoading();
            
            // Check authentication
            const token = localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
            if (token) {
                await this.validateToken();
            } else {
                this.showLogin();
                return;
            }
            
            // Initialize application
            await this.initializeApp();
            
        } catch (error) {
            console.error('App initialization error:', error);
            this.showLogin();
        } finally {
            this.hideLoading();
        }
    }

    async validateToken() {
        try {
            const response = await apiService.getProfile();
            if (response && response.userId) {
                this.currentUser = response;
                this.showMainApp();
                return true;
            }
        } catch (error) {
            console.error('Token validation failed:', error);
            localStorage.removeItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
        }
        return false;
    }

    async initializeApp() {
        if (this.isInitialized) return;
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Initialize components
        this.initializeComponents();
        
        // Load initial data
        await this.loadInitialData();
        
        // Start refresh intervals
        this.startRefreshIntervals();
        
        this.isInitialized = true;
    }

    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', this.handleLogin.bind(this));
        }

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', this.handleLogout.bind(this));
        }

        // Sidebar toggle
        const sidebarToggle = document.getElementById('sidebarToggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', this.toggleSidebar.bind(this));
        }

        // Navigation links
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', this.handleNavigation.bind(this));
        });

        // Modal close buttons
        const modalCloses = document.querySelectorAll('.modal-close');
        modalCloses.forEach(close => {
            close.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) {
                    this.closeModal(modal.id);
                }
            });
        });

        // Window events
        window.addEventListener('resize', this.handleResize.bind(this));
        window.addEventListener('beforeunload', this.cleanup.bind(this));
        
        // Handle browser back/forward
        window.addEventListener('popstate', this.handlePopState.bind(this));
    }

    initializeComponents() {
        // Initialize maps
        if (typeof initializeMaps === 'function') {
            initializeMaps();
        }
        
        // Initialize charts
        if (typeof initializeCharts === 'function') {
            initializeCharts();
        }
        
        // Initialize dashboard
        if (typeof initializeDashboard === 'function') {
            initializeDashboard();
        }
    }

    async loadInitialData() {
        try {
            // Load dashboard data
            await this.loadDashboardData();
            
            // Update user info in UI
            this.updateUserInfo();
            
        } catch (error) {
            console.error('Failed to load initial data:', error);
            this.showNotification('Failed to load data', 'error');
        }
    }

    async loadDashboardData() {
        try {
            const dashboardData = await apiService.getDashboardAnalytics('daily');
            if (dashboardData) {
                this.updateDashboardStats(dashboardData);
            }
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        }
    }

    updateDashboardStats(data) {
        // Update stats cards
        const elements = {
            binsCollected: document.getElementById('binsCollected'),
            wasteCollected: document.getElementById('wasteCollected'),
            fuelUsed: document.getElementById('fuelUsed'),
            efficiency: document.getElementById('efficiency')
        };

        if (data.todayStats) {
            if (elements.binsCollected) {
                elements.binsCollected.textContent = data.todayStats.binsCollected;
            }
            if (elements.wasteCollected) {
                elements.wasteCollected.textContent = `${data.todayStats.wasteCollected} kg`;
            }
            if (elements.fuelUsed) {
                elements.fuelUsed.textContent = `${data.todayStats.fuelUsed} L`;
            }
            if (elements.efficiency) {
                elements.efficiency.textContent = `${data.todayStats.efficiency}%`;
            }
        }

        // Update alerts
        if (data.alerts) {
            const alertElements = {
                urgentBins: document.getElementById('alertCount'),
                lowBattery: document.getElementById('notificationBadge')
            };

            const totalAlerts = data.alerts.urgentBins + data.alerts.lowBattery + data.alerts.maintenanceNeeded;
            
            if (alertElements.urgentBins) {
                alertElements.urgentBins.textContent = `${totalAlerts} Alerts`;
            }
            if (alertElements.lowBattery) {
                alertElements.lowBattery.textContent = totalAlerts;
                alertElements.lowBattery.style.display = totalAlerts > 0 ? 'block' : 'none';
            }
        }
    }

    updateUserInfo() {
        if (!this.currentUser) return;

        const userNameElements = document.querySelectorAll('#userName, #headerUserName');
        const userRoleElement = document.getElementById('userRole');

        userNameElements.forEach(element => {
            if (element) {
                element.textContent = this.currentUser.name;
            }
        });

        if (userRoleElement) {
            userRoleElement.textContent = this.currentUser.userType.charAt(0).toUpperCase() + 
                                        this.currentUser.userType.slice(1);
        }
    }

    startRefreshIntervals() {
        // Dashboard refresh
        this.refreshIntervals.dashboard = setInterval(() => {
            if (this.currentPage === 'dashboard') {
                this.loadDashboardData();
            }
        }, CONFIG.REFRESH_INTERVALS.DASHBOARD);

        // Vehicle data refresh
        this.refreshIntervals.vehicles = setInterval(() => {
            if (this.currentPage === 'vehicles' && typeof refreshVehicleData === 'function') {
                refreshVehicleData();
            }
        }, CONFIG.REFRESH_INTERVALS.VEHICLES);

        // Bin data refresh
        this.refreshIntervals.bins = setInterval(() => {
            if (this.currentPage === 'bins' && typeof refreshBinData === 'function') {
                refreshBinData();
            }
        }, CONFIG.REFRESH_INTERVALS.BINS);
    }

    stopRefreshIntervals() {
        Object.values(this.refreshIntervals).forEach(interval => {
            if (interval) {
                clearInterval(interval);
            }
        });
        this.refreshIntervals = {};
    }

    async handleLogin(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const credentials = {
            email: formData.get('email'),
            password: formData.get('password'),
            userType: formData.get('userType')
        };

        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        
        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
            
            const response = await apiService.login(credentials);
            
            if (response.success) {
                this.currentUser = response.user;
                this.showNotification(CONFIG.SUCCESS_MESSAGES.LOGIN, 'success');
                this.showMainApp();
                await this.initializeApp();
            } else {
                throw new Error(response.message || 'Login failed');
            }
            
        } catch (error) {
            console.error('Login error:', error);
            this.showNotification(error.message || 'Login failed', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }

    async handleLogout() {
        try {
            await apiService.logout();
            this.cleanup();
            this.showNotification(CONFIG.SUCCESS_MESSAGES.LOGOUT, 'success');
            this.showLogin();
        } catch (error) {
            console.error('Logout error:', error);
            // Force logout even if API call fails
            this.cleanup();
            this.showLogin();
        }
    }

    handleNavigation(event) {
        event.preventDefault();
        
        const link = event.currentTarget;
        const page = link.dataset.page;
        
        if (page && page !== this.currentPage) {
            this.navigateToPage(page);
        }
    }

    navigateToPage(page) {
        // Update active nav link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        const activeLink = document.querySelector(`[data-page="${page}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        // Update page content
        document.querySelectorAll('.page').forEach(pageElement => {
            pageElement.classList.remove('active');
        });
        
        const targetPage = document.getElementById(`${page}Page`);
        if (targetPage) {
            targetPage.classList.add('active');
        }

        // Update page title
        const pageTitle = document.getElementById('pageTitle');
        if (pageTitle) {
            pageTitle.textContent = page.charAt(0).toUpperCase() + page.slice(1);
        }

        // Update URL
        history.pushState({ page }, '', `#${page}`);
        
        this.currentPage = page;
        
        // Load page-specific data
        this.loadPageData(page);
    }

    async loadPageData(page) {
        try {
            switch (page) {
                case 'vehicles':
                    if (typeof loadVehicleData === 'function') {
                        await loadVehicleData();
                    }
                    break;
                case 'bins':
                    if (typeof loadBinData === 'function') {
                        await loadBinData();
                    }
                    break;
                case 'routes':
                    if (typeof loadRouteData === 'function') {
                        await loadRouteData();
                    }
                    break;
                case 'analytics':
                    if (typeof loadAnalyticsData === 'function') {
                        await loadAnalyticsData();
                    }
                    break;
                case 'users':
                    if (typeof loadUserData === 'function') {
                        await loadUserData();
                    }
                    break;
            }
        } catch (error) {
            console.error(`Failed to load ${page} data:`, error);
            this.showNotification(`Failed to load ${page} data`, 'error');
        }
    }

    handlePopState(event) {
        if (event.state && event.state.page) {
            this.navigateToPage(event.state.page);
        }
    }

    toggleSidebar() {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.classList.toggle('open');
        }
    }

    handleResize() {
        // Handle responsive behavior
        const sidebar = document.querySelector('.sidebar');
        if (sidebar && window.innerWidth > 1024) {
            sidebar.classList.remove('open');
        }
    }

    showLoading() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.display = 'flex';
        }
    }

    hideLoading() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
    }

    showLogin() {
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('mainApp').style.display = 'none';
    }

    showMainApp() {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('mainApp').style.display = 'flex';
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            modal.style.display = 'flex';
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
        }
    }

    showNotification(message, type = 'info', duration = CONFIG.NOTIFICATIONS.DURATION) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close">&times;</button>
        `;

        // Add to container
        let container = document.querySelector('.notification-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'notification-container';
            document.body.appendChild(container);
        }

        container.appendChild(notification);

        // Add close functionality
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            this.removeNotification(notification);
        });

        // Auto remove after duration
        setTimeout(() => {
            this.removeNotification(notification);
        }, duration);

        // Add CSS if not exists
        this.addNotificationStyles();
    }

    removeNotification(notification) {
        if (notification && notification.parentNode) {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }
    }

    getNotificationIcon(type) {
        switch (type) {
            case 'success': return 'check-circle';
            case 'error': return 'exclamation-circle';
            case 'warning': return 'exclamation-triangle';
            default: return 'info-circle';
        }
    }

    addNotificationStyles() {
        if (document.querySelector('#notification-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .notification-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            
            .notification {
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                padding: 16px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                min-width: 300px;
                max-width: 400px;
                transform: translateX(100%);
                opacity: 0;
                animation: slideInNotification 0.3s ease forwards;
            }
            
            .notification-success { border-left: 4px solid #4CAF50; }
            .notification-error { border-left: 4px solid #F44336; }
            .notification-warning { border-left: 4px solid #FF9800; }
            .notification-info { border-left: 4px solid #2196F3; }
            
            .notification-content {
                display: flex;
                align-items: center;
                gap: 12px;
                flex: 1;
            }
            
            .notification-content i {
                font-size: 18px;
            }
            
            .notification-success i { color: #4CAF50; }
            .notification-error i { color: #F44336; }
            .notification-warning i { color: #FF9800; }
            .notification-info i { color: #2196F3; }
            
            .notification-close {
                background: none;
                border: none;
                font-size: 18px;
                color: #999;
                cursor: pointer;
                padding: 4px;
                border-radius: 4px;
                transition: background-color 0.2s;
            }
            
            .notification-close:hover {
                background-color: #f5f5f5;
            }
            
            @keyframes slideInNotification {
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @media (max-width: 480px) {
                .notification-container {
                    left: 10px;
                    right: 10px;
                    top: 10px;
                }
                
                .notification {
                    min-width: auto;
                    max-width: none;
                }
            }
        `;
        
        document.head.appendChild(styles);
    }

    cleanup() {
        this.stopRefreshIntervals();
        this.currentUser = null;
        this.currentPage = 'dashboard';
        this.isInitialized = false;
        
        // Clear local storage
        localStorage.removeItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.USER_DATA);
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.smartWasteApp = new SmartWasteApp();
});

// Global utility functions
window.openModal = function(modalId) {
    window.smartWasteApp.showModal(modalId);
};

window.closeModal = function(modalId) {
    window.smartWasteApp.closeModal(modalId);
};

window.showNotification = function(message, type, duration) {
    window.smartWasteApp.showNotification(message, type, duration);
};