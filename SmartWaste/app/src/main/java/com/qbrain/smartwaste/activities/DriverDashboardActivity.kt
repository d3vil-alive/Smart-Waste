package com.qbrain.smartwaste.activities

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Location
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.OnMapReadyCallback
import com.google.android.gms.maps.SupportMapFragment
import com.google.android.gms.maps.model.BitmapDescriptorFactory
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.MarkerOptions
import com.google.android.gms.maps.model.PolylineOptions
import com.qbrain.smartwaste.R
import com.qbrain.smartwaste.adapters.RouteStopsAdapter
import com.qbrain.smartwaste.databinding.ActivityDriverDashboardBinding
import com.qbrain.smartwaste.network.NetworkModule
import com.qbrain.smartwaste.network.VehicleStatusRequest
import com.qbrain.smartwaste.utils.PreferenceManager
import kotlinx.coroutines.launch

class DriverDashboardActivity : AppCompatActivity(), OnMapReadyCallback {
    
    private lateinit var binding: ActivityDriverDashboardBinding
    private lateinit var preferenceManager: PreferenceManager
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var googleMap: GoogleMap
    private lateinit var routeStopsAdapter: RouteStopsAdapter
    
    private var currentLocation: Location? = null
    private var locationCallback: LocationCallback? = null
    private val routeStops = mutableListOf<String>()
    
    companion object {
        private const val LOCATION_PERMISSION_REQUEST_CODE = 1001
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityDriverDashboardBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        preferenceManager = PreferenceManager(this)
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        
        setupViews()
        setupMap()
        setupRecyclerView()
        requestLocationPermission()
        loadVehicleRoute()
    }
    
    private fun setupViews() {
        binding.tvDriverName.text = "Driver: ${preferenceManager.getUserName()}"
        binding.tvVehicleId.text = "Vehicle: ${preferenceManager.getVehicleId() ?: "Not Assigned"}"
        
        binding.btnStartRoute.setOnClickListener {
            startRoute()
        }
        
        binding.btnCompleteCollection.setOnClickListener {
            completeCurrentCollection()
        }
        
        binding.btnProfile.setOnClickListener {
            startActivity(Intent(this, ProfileActivity::class.java))
        }
        
        binding.btnLogout.setOnClickListener {
            logout()
        }
    }
    
    private fun setupMap() {
        val mapFragment = supportFragmentManager.findFragmentById(R.id.mapFragment) as SupportMapFragment
        mapFragment.getMapAsync(this)
    }
    
    private fun setupRecyclerView() {
        routeStopsAdapter = RouteStopsAdapter(routeStops) { binId ->
            navigateToBin(binId)
        }
        binding.rvRouteStops.apply {
            layoutManager = LinearLayoutManager(this@DriverDashboardActivity)
            adapter = routeStopsAdapter
        }
    }
    
    override fun onMapReady(map: GoogleMap) {
        googleMap = map
        googleMap.uiSettings.isZoomControlsEnabled = true
        
        if (ActivityCompat.checkSelfPermission(
                this,
                Manifest.permission.ACCESS_FINE_LOCATION
            ) == PackageManager.PERMISSION_GRANTED
        ) {
            googleMap.isMyLocationEnabled = true
            startLocationUpdates()
        }
    }
    
    private fun requestLocationPermission() {
        if (ActivityCompat.checkSelfPermission(
                this,
                Manifest.permission.ACCESS_FINE_LOCATION
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            ActivityCompat.requestPermissions(
                this,
                arrayOf(Manifest.permission.ACCESS_FINE_LOCATION),
                LOCATION_PERMISSION_REQUEST_CODE
            )
        } else {
            startLocationUpdates()
        }
    }
    
    private fun startLocationUpdates() {
        if (ActivityCompat.checkSelfPermission(
                this,
                Manifest.permission.ACCESS_FINE_LOCATION
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            return
        }
        
        val locationRequest = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 30000)
            .setWaitForAccurateLocation(false)
            .setMinUpdateIntervalMillis(15000)
            .build()
        
        locationCallback = object : LocationCallback() {
            override fun onLocationResult(locationResult: LocationResult) {
                locationResult.lastLocation?.let { location ->
                    currentLocation = location
                    updateLocationOnServer(location)
                    
                    val latLng = LatLng(location.latitude, location.longitude)
                    if (::googleMap.isInitialized) {
                        googleMap.moveCamera(CameraUpdateFactory.newLatLngZoom(latLng, 15f))
                    }
                }
            }
        }
        
        fusedLocationClient.requestLocationUpdates(locationRequest, locationCallback!!, mainLooper)
    }
    
    private fun updateLocationOnServer(location: Location) {
        val vehicleId = preferenceManager.getVehicleId() ?: return
        
        lifecycleScope.launch {
            try {
                val apiService = NetworkModule.provideApiService(this@DriverDashboardActivity)
                val locationData = com.qbrain.smartwaste.network.Location(
                    location.latitude,
                    location.longitude
                )
                
                val request = VehicleStatusRequest(
                    location = locationData,
                    fuelLevel = null,
                    currentWeight = null,
                    status = "collecting",
                    odometer = null,
                    speed = if (location.hasSpeed()) location.speed.toInt() else null,
                    heading = if (location.hasBearing()) location.bearing.toInt() else null
                )
                
                apiService.updateVehicleStatus(vehicleId, request)
            } catch (e: Exception) {
                // Handle silently for location updates
            }
        }
    }
    
    private fun loadVehicleRoute() {
        val vehicleId = preferenceManager.getVehicleId() ?: return
        
        lifecycleScope.launch {
            try {
                val apiService = NetworkModule.provideApiService(this@DriverDashboardActivity)
                val response = apiService.getVehicleRoute(vehicleId)
                
                if (response.isSuccessful) {
                    val routeResponse = response.body()
                    if (routeResponse?.routeId != null) {
                        routeStops.clear()
                        routeStops.addAll(routeResponse.assignedBins)
                        routeStopsAdapter.notifyDataSetChanged()
                        
                        binding.tvRouteInfo.text = "Route: ${routeResponse.routeId}"
                        binding.tvEstimatedTime.text = "Est. Time: ${routeResponse.estimatedTime} min"
                        binding.tvEstimatedDistance.text = "Distance: ${String.format("%.1f", routeResponse.estimatedDistance)} km"
                        
                        binding.btnStartRoute.isEnabled = routeResponse.status == "planned"
                        binding.btnCompleteCollection.isEnabled = routeResponse.status == "in_progress"
                    } else {
                        binding.tvRouteInfo.text = "No route assigned"
                        binding.btnStartRoute.isEnabled = false
                        binding.btnCompleteCollection.isEnabled = false
                    }
                }
            } catch (e: Exception) {
                Toast.makeText(this@DriverDashboardActivity, "Failed to load route", Toast.LENGTH_SHORT).show()
            }
        }
    }
    
    private fun startRoute() {
        binding.btnStartRoute.isEnabled = false
        binding.btnCompleteCollection.isEnabled = true
        Toast.makeText(this, "Route started!", Toast.LENGTH_SHORT).show()
    }
    
    private fun completeCurrentCollection() {
        // Navigate to collection completion activity
        startActivity(Intent(this, CollectionActivity::class.java))
    }
    
    private fun navigateToBin(binId: String) {
        // Open navigation to specific bin
        Toast.makeText(this, "Navigating to bin $binId", Toast.LENGTH_SHORT).show()
    }
    
    private fun logout() {
        locationCallback?.let {
            fusedLocationClient.removeLocationUpdates(it)
        }
        preferenceManager.clearUserData()
        startActivity(Intent(this, LoginActivity::class.java))
        finish()
    }
    
    override fun onDestroy() {
        super.onDestroy()
        locationCallback?.let {
            fusedLocationClient.removeLocationUpdates(it)
        }
    }
}