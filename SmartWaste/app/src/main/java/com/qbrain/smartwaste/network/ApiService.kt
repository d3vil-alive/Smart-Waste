package com.qbrain.smartwaste.network

import retrofit2.Response
import retrofit2.http.*

interface ApiService {
    
    // Authentication
    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>
    
    @POST("auth/register")
    suspend fun register(@Body request: RegisterRequest): Response<RegisterResponse>
    
    @GET("auth/profile")
    suspend fun getProfile(): Response<UserProfile>
    
    // Bins
    @GET("bins/nearby")
    suspend fun getNearbyBins(
        @Query("lat") lat: Double,
        @Query("lng") lng: Double,
        @Query("radius") radius: Int = 500
    ): Response<NearbyBinsResponse>
    
    @POST("bins/{binId}/maintenance")
    suspend fun reportMaintenance(
        @Path("binId") binId: String,
        @Body request: MaintenanceRequest
    ): Response<MaintenanceResponse>
    
    @POST("bins/{binId}/collect")
    suspend fun collectBin(
        @Path("binId") binId: String,
        @Body request: CollectBinRequest
    ): Response<CollectBinResponse>
    
    // Vehicles
    @GET("vehicles/{vehicleId}/route")
    suspend fun getVehicleRoute(@Path("vehicleId") vehicleId: String): Response<VehicleRouteResponse>
    
    @PUT("vehicles/{vehicleId}/status")
    suspend fun updateVehicleStatus(
        @Path("vehicleId") vehicleId: String,
        @Body request: VehicleStatusRequest
    ): Response<VehicleStatusResponse>
    
    // Routes
    @GET("routes/active")
    suspend fun getActiveRoutes(): Response<ActiveRoutesResponse>
    
    @PUT("routes/{routeId}/progress")
    suspend fun updateRouteProgress(
        @Path("routeId") routeId: String,
        @Body request: RouteProgressRequest
    ): Response<RouteProgressResponse>
    
    // Analytics
    @GET("analytics/dashboard")
    suspend fun getDashboardAnalytics(@Query("period") period: String): Response<DashboardResponse>
}

// Data classes
data class LoginRequest(
    val email: String,
    val password: String,
    val userType: String
)

data class LoginResponse(
    val success: Boolean,
    val token: String,
    val user: User
)

data class RegisterRequest(
    val name: String,
    val email: String,
    val phone: String,
    val password: String,
    val userType: String,
    val location: Location?
)

data class RegisterResponse(
    val success: Boolean,
    val userId: String
)

data class User(
    val userId: String,
    val name: String,
    val email: String,
    val userType: String,
    val permissions: List<String>
)

data class UserProfile(
    val userId: String,
    val name: String,
    val email: String,
    val phone: String,
    val userType: String,
    val location: Location?,
    val preferences: UserPreferences
)

data class UserPreferences(
    val notifications: Boolean,
    val language: String,
    val collectionReminders: Boolean
)

data class Location(
    val lat: Double,
    val lng: Double,
    val address: String? = null
)

data class NearbyBinsResponse(
    val nearbyBins: List<NearbyBin>
)

data class NearbyBin(
    val binId: String,
    val distance: Int,
    val fillPercentage: Int,
    val status: String,
    val location: Location,
    val type: String
)

data class MaintenanceRequest(
    val issueType: String,
    val description: String,
    val reportedBy: String,
    val priority: String = "medium"
)

data class MaintenanceResponse(
    val success: Boolean,
    val ticketId: String
)

data class CollectBinRequest(
    val vehicleId: String,
    val collectedWeight: Double,
    val collectionTime: String,
    val driverId: String
)

data class CollectBinResponse(
    val success: Boolean,
    val collectionId: String,
    val updatedStatus: String
)

data class VehicleRouteResponse(
    val routeId: String?,
    val assignedBins: List<String>,
    val estimatedTime: Int,
    val estimatedDistance: Double,
    val status: String
)

data class VehicleStatusRequest(
    val location: Location,
    val fuelLevel: Int?,
    val currentWeight: Int?,
    val status: String,
    val odometer: Int?,
    val speed: Int?,
    val heading: Int?
)

data class VehicleStatusResponse(
    val success: Boolean,
    val updated: Boolean
)

data class ActiveRoutesResponse(
    val activeRoutes: List<ActiveRoute>
)

data class ActiveRoute(
    val routeId: String,
    val vehicleId: String,
    val progress: Int,
    val currentBin: String?,
    val estimatedCompletion: String,
    val binsRemaining: Int,
    val totalBins: Int,
    val status: String
)

data class RouteProgressRequest(
    val completedBinId: String,
    val completionTime: String,
    val collectedWeight: Double,
    val nextBinId: String?
)

data class RouteProgressResponse(
    val success: Boolean,
    val routeProgress: Int,
    val nextBinDetails: NextBinDetails?,
    val routeCompleted: Boolean
)

data class NextBinDetails(
    val binId: String,
    val location: Location,
    val fillPercentage: Int,
    val estimatedWeight: Int
)

data class DashboardResponse(
    val todayStats: TodayStats,
    val alerts: Alerts,
    val trends: Trends
)

data class TodayStats(
    val binsCollected: Int,
    val wasteCollected: Int,
    val fuelUsed: Double,
    val routesCompleted: Int,
    val efficiency: Int
)

data class Alerts(
    val urgentBins: Int,
    val lowBattery: Int,
    val maintenanceNeeded: Int
)

data class Trends(
    val efficiencyTrend: String,
    val wasteGeneration: String
)