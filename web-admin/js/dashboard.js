// Dashboard functionality
let dashboardCharts = {};
let dashboardMap = null;
let dashboardData = {};

// Initialize dashboard
function initializeDashboard() {
    initializeDashboardMap();
    initializeDashboardCharts();
    loadDashboardData();
    setupDashboardEventListeners();
}

// Initialize dashboard map
function initializeDashboardMap() {
    const mapContainer = document.getElementById('map');
    if (!mapContainer || typeof google === 'undefined') return;

    dashboardMap = new google.maps.Map(mapContainer, {
        center: CONFIG.DEFAULT_MAP_CENTER,
        zoom: CONFIG.MAP_SETTINGS.DEFAULT_ZOOM,
        styles: [
            {
                featureType: 'poi',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }]
            }
        ]
    });

    // Load map data
    loadMapData();
}

// Initialize dashboard charts
function initializeDashboardCharts() {
    if (typeof Chart === 'undefined') return;

    // Collection Chart
    const collectionCtx = document.getElementById('collectionChart');
    if (collectionCtx) {
        dashboardCharts.collection = new Chart(collectionCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Bins Collected',
                    data: [],
                    borderColor: CONFIG.CHART_COLORS.PRIMARY,
                    backgroundColor: CONFIG.CHART_COLORS.PRIMARY + '20',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#E0E0E0'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }
}

// Load dashboard data
async function loadDashboardData() {
    try {
        // Show loading state
        showDashboardLoading(true);

        // Load main dashboard data
        const dashboardResponse = await apiService.getDashboardAnalytics('daily');
        if (dashboardResponse) {
            dashboardData = dashboardResponse;
            updateDashboardStats(dashboardResponse);
        }

        // Load vehicle data
        const vehicleResponse = await apiService.getVehicles();
        if (vehicleResponse) {
            updateVehicleList(vehicleResponse);
        }

        // Load alerts
        await loadDashboardAlerts();

        // Update charts
        await updateDashboardCharts();

    } catch (error) {
        console.error('Failed to load dashboard data:', error);
        showNotification('Failed to load dashboard data', 'error');
    } finally {
        showDashboardLoading(false);
    }
}

// Update dashboard statistics
function updateDashboardStats(data) {
    if (!data.todayStats) return;

    const stats = data.todayStats;
    
    // Update stat cards with animation
    animateStatValue('binsCollected', stats.binsCollected);
    animateStatValue('wasteCollected', `${stats.wasteCollected} kg`);
    animateStatValue('fuelUsed', `${stats.fuelUsed.toFixed(1)} L`);
    animateStatValue('efficiency', `${stats.efficiency}%`);

    // Update alert counts
    if (data.alerts) {
        const totalAlerts = data.alerts.urgentBins + data.alerts.lowBattery + data.alerts.maintenanceNeeded;
        
        const alertCountElement = document.getElementById('alertCount');
        if (alertCountElement) {
            alertCountElement.textContent = `${totalAlerts} Alert${totalAlerts !== 1 ? 's' : ''}`;
            alertCountElement.className = `badge ${totalAlerts > 0 ? 'badge-error' : 'badge-success'}`;
        }

        const notificationBadge = document.getElementById('notificationBadge');
        if (notificationBadge) {
            notificationBadge.textContent = totalAlerts;
            notificationBadge.style.display = totalAlerts > 0 ? 'block' : 'none';
        }
    }
}

// Animate stat values
function animateStatValue(elementId, targetValue) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const currentValue = element.textContent;
    const isNumeric = !isNaN(parseFloat(targetValue));
    
    if (isNumeric) {
        const start = parseFloat(currentValue) || 0;
        const end = parseFloat(targetValue);
        const duration = 1000;
        const startTime = performance.now();

        function animate(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const current = start + (end - start) * easeOutCubic(progress);
            element.textContent = Math.round(current);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.textContent = targetValue;
            }
        }
        
        requestAnimationFrame(animate);
    } else {
        element.textContent = targetValue;
    }
}

// Easing function
function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

// Update vehicle list
function updateVehicleList(data) {
    const vehicleList = document.getElementById('vehicleList');
    if (!vehicleList || !data.vehicles) return;

    vehicleList.innerHTML = '';

    data.vehicles.forEach(vehicle => {
        const vehicleItem = document.createElement('div');
        vehicleItem.className = 'vehicle-item';
        vehicleItem.innerHTML = `
            <div class="vehicle-info">
                <div class="vehicle-icon">
                    <i class="fas fa-truck"></i>
                </div>
                <div class="vehicle-details">
                    <h4>${vehicle.vehicleId}</h4>
                    <p>${vehicle.driverName || 'No driver assigned'}</p>
                </div>
            </div>
            <div class="vehicle-status">
                <span class="status-dot ${vehicle.status}"></span>
                <span class="status-text">${vehicle.status.charAt(0).toUpperCase() + vehicle.status.slice(1)}</span>
            </div>
        `;
        
        vehicleList.appendChild(vehicleItem);
    });

    // Update active vehicle count
    const activeCount = data.vehicles.filter(v => v.status === 'collecting' || v.status === 'returning').length;
    const activeVehicleCount = document.getElementById('activeVehicleCount');
    if (activeVehicleCount) {
        activeVehicleCount.textContent = `${activeCount} Active`;
        activeVehicleCount.className = `badge ${activeCount > 0 ? 'badge-success' : 'badge-warning'}`;
    }
}

// Load dashboard alerts
async function loadDashboardAlerts() {
    const alertList = document.getElementById('alertList');
    if (!alertList) return;

    // Mock alert data - replace with actual API call
    const alerts = [
        {
            id: 1,
            type: 'urgent',
            title: 'Bin BIN001 Full',
            message: 'Bin at Park Street requires immediate collection',
            time: '5 minutes ago'
        },
        {
            id: 2,
            type: 'warning',
            title: 'Low Battery',
            message: 'Bin BIN045 battery level at 15%',
            time: '12 minutes ago'
        },
        {
            id: 3,
            type: 'info',
            title: 'Route Completed',
            message: 'Vehicle VH003 completed Route RT012',
            time: '25 minutes ago'
        }
    ];

    alertList.innerHTML = '';

    alerts.forEach(alert => {
        const alertItem = document.createElement('div');
        alertItem.className = 'alert-item';
        alertItem.innerHTML = `
            <div class="alert-icon ${alert.type}">
                <i class="fas fa-${getAlertIcon(alert.type)}"></i>
            </div>
            <div class="alert-content">
                <h4>${alert.title}</h4>
                <p>${alert.message}</p>
                <span class="alert-time">${alert.time}</span>
            </div>
        `;
        
        alertList.appendChild(alertItem);
    });
}

// Get alert icon
function getAlertIcon(type) {
    switch (type) {
        case 'urgent': return 'exclamation-triangle';
        case 'warning': return 'exclamation-circle';
        case 'info': return 'info-circle';
        default: return 'bell';
    }
}

// Update dashboard charts
async function updateDashboardCharts() {
    try {
        // Generate sample data for charts
        const last7Days = [];
        const collectionData = [];
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            last7Days.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
            collectionData.push(Math.floor(Math.random() * 50) + 20);
        }

        // Update collection chart
        if (dashboardCharts.collection) {
            dashboardCharts.collection.data.labels = last7Days;
            dashboardCharts.collection.data.datasets[0].data = collectionData;
            dashboardCharts.collection.update('active');
        }

    } catch (error) {
        console.error('Failed to update dashboard charts:', error);
    }
}

// Load map data
async function loadMapData() {
    if (!dashboardMap) return;

    

    try {
        // Load vehicle locations
        const vehicleResponse = await apiService.getVehicles();
        if (vehicleResponse && vehicleResponse.vehicles) {
            addVehicleMarkers(vehicleResponse.vehicles);
        }

        // Load bin locations
        const binResponse = await apiService.getBins();
        if (binResponse && binResponse.urgentBins) {
            addBinMarkers(binResponse.urgentBins);
        }

    } catch (error) {
        console.error('Failed to load map data:', error);
    }
}

// Add vehicle markers to map
function addVehicleMarkers(vehicles) {
    vehicles.forEach(vehicle => {
        if (vehicle.location) {
            const marker = new google.maps.Marker({
                position: { lat: vehicle.location.lat, lng: vehicle.location.lng },
                map: dashboardMap,
                title: `Vehicle ${vehicle.vehicleId}`,
                icon: {
                    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(createVehicleIcon(vehicle.status))}`,
                    scaledSize: new google.maps.Size(30, 30)
                }
            });

            const infoWindow = new google.maps.InfoWindow({
                content: `
                    <div class="map-info-window">
                        <h4>Vehicle ${vehicle.vehicleId}</h4>
                        <p><strong>Driver:</strong> ${vehicle.driverName}</p>
                        <p><strong>Status:</strong> ${vehicle.status}</p>
                    </div>
                `
            });

            marker.addListener('click', () => {
                infoWindow.open(dashboardMap, marker);
            });
        }
    });
}

// Add bin markers to map
function addBinMarkers(bins) {
    bins.forEach(bin => {
        if (bin.location) {
            const marker = new google.maps.Marker({
                position: { lat: bin.location.lat, lng: bin.location.lng },
                map: dashboardMap,
                title: `Bin ${bin.binId}`,
                icon: {
                    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(createBinIcon(bin.status))}`,
                    scaledSize: new google.maps.Size(25, 25)
                }
            });

            const infoWindow = new google.maps.InfoWindow({
                content: `
                    <div class="map-info-window">
                        <h4>Bin ${bin.binId}</h4>
                        <p><strong>Fill Level:</strong> ${bin.fillPercentage}%</p>
                        <p><strong>Status:</strong> ${bin.status}</p>
                    </div>
                `
            });

            marker.addListener('click', () => {
                infoWindow.open(dashboardMap, marker);
            });
        }
    });
}

// Create vehicle icon SVG
function createVehicleIcon(status) {
    const color = CONFIG.STATUS_COLORS[status.toUpperCase()] || CONFIG.STATUS_COLORS.NORMAL;
    return `
        <svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
            <circle cx="15" cy="15" r="12" fill="${color}" stroke="white" stroke-width="2"/>
            <text x="15" y="20" text-anchor="middle" fill="white" font-size="12" font-family="Arial">🚛</text>
        </svg>
    `;
}

// Create bin icon SVG
function createBinIcon(status) {
    const color = CONFIG.STATUS_COLORS[status.toUpperCase()] || CONFIG.STATUS_COLORS.NORMAL;
    return `
        <svg width="25" height="25" viewBox="0 0 25 25" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12.5" cy="12.5" r="10" fill="${color}" stroke="white" stroke-width="2"/>
            <text x="12.5" y="17" text-anchor="middle" fill="white" font-size="10" font-family="Arial">🗑️</text>
        </svg>
    `;
}

// Setup dashboard event listeners
function setupDashboardEventListeners() {
    // Analytics filter
    const analyticsFilter = document.getElementById('analyticsFilter');
    if (analyticsFilter) {
        analyticsFilter.addEventListener('change', (e) => {
            loadDashboardData();
        });
    }

    // Refresh button (if exists)
    const refreshBtn = document.querySelector('[data-action="refresh-dashboard"]');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadDashboardData();
        });
    }
}

// Show/hide dashboard loading state
function showDashboardLoading(show) {
    const loadingElements = document.querySelectorAll('.dashboard-loading');
    loadingElements.forEach(element => {
        element.style.display = show ? 'block' : 'none';
    });
}

// Refresh dashboard data (called by main app)
async function refreshDashboardData() {
    if (window.smartWasteApp && window.smartWasteApp.currentPage === 'dashboard') {
        await loadDashboardData();
    }
}

// Export functions for use by main app
window.initializeDashboard = initializeDashboard;
window.refreshDashboardData = refreshDashboardData;