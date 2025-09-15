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
import com.google.android.gms.location.LocationServices
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.OnMapReadyCallback
import com.google.android.gms.maps.SupportMapFragment
import com.google.android.gms.maps.model.BitmapDescriptorFactory
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.MarkerOptions
import com.qbrain.smartwaste.R
import com.qbrain.smartwaste.adapters.NearbyBinsAdapter
import com.qbrain.smartwaste.databinding.ActivityCitizenDashboardBinding
import com.qbrain.smartwaste.network.NearbyBin
import com.qbrain.smartwaste.network.NetworkModule
import com.qbrain.smartwaste.utils.PreferenceManager
import kotlinx.coroutines.launch

class CitizenDashboardActivity : AppCompatActivity(), OnMapReadyCallback {
    
    private lateinit var binding: ActivityCitizenDashboardBinding
    private lateinit var preferenceManager: PreferenceManager
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var googleMap: GoogleMap
    private lateinit var nearbyBinsAdapter: NearbyBinsAdapter
    
    private var currentLocation: Location? = null
    private val nearbyBins = mutableListOf<NearbyBin>()
    
    companion object {
        private const val LOCATION_PERMISSION_REQUEST_CODE = 1001
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityCitizenDashboardBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        preferenceManager = PreferenceManager(this)
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        
        setupViews()
        setupMap()
        setupRecyclerView()
        requestLocationPermission()
    }
    
    private fun setupViews() {
        binding.tvWelcome.text = "Welcome, ${preferenceManager.getUserName()}"
        
        binding.btnRefresh.setOnClickListener {
            getCurrentLocationAndLoadBins()
        }
        
        binding.btnReportIssue.setOnClickListener {
            startActivity(Intent(this, ReportIssueActivity::class.java))
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
        nearbyBinsAdapter = NearbyBinsAdapter(nearbyBins) { bin ->
            // Show bin details
            showBinDetails(bin)
        }
        binding.rvNearbyBins.apply {
            layoutManager = LinearLayoutManager(this@CitizenDashboardActivity)
            adapter = nearbyBinsAdapter
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
            getCurrentLocationAndLoadBins()
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
            getCurrentLocationAndLoadBins()
        }
    }
    
    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == LOCATION_PERMISSION_REQUEST_CODE) {
            if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                getCurrentLocationAndLoadBins()
            } else {
                Toast.makeText(this, "Location permission required to find nearby bins", Toast.LENGTH_LONG).show()
            }
        }
    }
    
    private fun getCurrentLocationAndLoadBins() {
        if (ActivityCompat.checkSelfPermission(
                this,
                Manifest.permission.ACCESS_FINE_LOCATION
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            return
        }
        
        binding.progressBar.visibility = android.view.View.VISIBLE
        
        fusedLocationClient.lastLocation.addOnSuccessListener { location ->
            if (location != null) {
                currentLocation = location
                val latLng = LatLng(location.latitude, location.longitude)
                googleMap.moveCamera(CameraUpdateFactory.newLatLngZoom(latLng, 15f))
                loadNearbyBins(location.latitude, location.longitude)
            } else {
                binding.progressBar.visibility = android.view.View.GONE
                Toast.makeText(this, "Unable to get current location", Toast.LENGTH_SHORT).show()
            }
        }
    }
    
    private fun loadNearbyBins(lat: Double, lng: Double) {
        lifecycleScope.launch {
            try {
                val apiService = NetworkModule.provideApiService(this@CitizenDashboardActivity)
                val response = apiService.getNearbyBins(lat, lng, 1000)
                
                if (response.isSuccessful) {
                    val binsResponse = response.body()
                    if (binsResponse != null) {
                        nearbyBins.clear()
                        nearbyBins.addAll(binsResponse.nearbyBins)
                        nearbyBinsAdapter.notifyDataSetChanged()
                        
                        // Add markers to map
                        googleMap.clear()
                        binsResponse.nearbyBins.forEach { bin ->
                            val binLatLng = LatLng(bin.location.lat, bin.location.lng)
                            val markerColor = when (bin.status) {
                                "full" -> BitmapDescriptorFactory.HUE_RED
                                "needs_collection" -> BitmapDescriptorFactory.HUE_ORANGE
                                else -> BitmapDescriptorFactory.HUE_GREEN
                            }
                            
                            googleMap.addMarker(
                                MarkerOptions()
                                    .position(binLatLng)
                                    .title("Bin ${bin.binId}")
                                    .snippet("${bin.fillPercentage}% full - ${bin.distance}m away")
                                    .icon(BitmapDescriptorFactory.defaultMarker(markerColor))
                            )
                        }
                        
                        binding.tvBinCount.text = "${binsResponse.nearbyBins.size} bins nearby"
                    }
                } else {
                    Toast.makeText(this@CitizenDashboardActivity, "Failed to load nearby bins", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Toast.makeText(this@CitizenDashboardActivity, "Network error: ${e.message}", Toast.LENGTH_SHORT).show()
            } finally {
                binding.progressBar.visibility = android.view.View.GONE
            }
        }
    }
    
    private fun showBinDetails(bin: NearbyBin) {
        val intent = Intent(this, BinDetailsActivity::class.java)
        intent.putExtra("binId", bin.binId)
        intent.putExtra("fillPercentage", bin.fillPercentage)
        intent.putExtra("distance", bin.distance)
        intent.putExtra("status", bin.status)
        intent.putExtra("type", bin.type)
        startActivity(intent)
    }
    
    private fun logout() {
        preferenceManager.clearUserData()
        startActivity(Intent(this, LoginActivity::class.java))
        finish()
    }
}