package com.qbrain.smartwaste.activities

import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.GridLayoutManager
import com.qbrain.smartwaste.adapters.AdminMenuAdapter
import com.qbrain.smartwaste.databinding.ActivityAdminDashboardBinding
import com.qbrain.smartwaste.models.AdminMenuItem
import com.qbrain.smartwaste.network.NetworkModule
import com.qbrain.smartwaste.utils.PreferenceManager
import kotlinx.coroutines.launch
import com.qbrain.smartwaste.R

class AdminDashboardActivity : AppCompatActivity() {
    
    private lateinit var binding: ActivityAdminDashboardBinding
    private lateinit var preferenceManager: PreferenceManager
    private lateinit var adminMenuAdapter: AdminMenuAdapter
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityAdminDashboardBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        preferenceManager = PreferenceManager(this)
        
        setupViews()
        setupMenuGrid()
        loadDashboardData()
    }
    
    private fun setupViews() {
        binding.tvWelcome.text = "Welcome, ${preferenceManager.getUserName()}"
        
        binding.btnProfile.setOnClickListener {
            startActivity(Intent(this, ProfileActivity::class.java))
        }
        
        binding.btnLogout.setOnClickListener {
            logout()
        }
    }
    
    private fun setupMenuGrid() {
        val menuItems = listOf(
            AdminMenuItem("Vehicle Management", R.drawable.ic_truck, "vehicles"),
            AdminMenuItem("Bin Management", R.drawable.ic_delete, "bins"),
            AdminMenuItem("Route Optimization", R.drawable.ic_route, "routes"),
            AdminMenuItem("Analytics", R.drawable.ic_analytics, "analytics"),
            AdminMenuItem("User Management", R.drawable.ic_people, "users"),
            AdminMenuItem("Reports", R.drawable.ic_report, "reports"),
            AdminMenuItem("Settings", R.drawable.ic_settings, "settings"),
            AdminMenuItem("Maintenance", R.drawable.ic_build, "maintenance")
        )
        
        adminMenuAdapter = AdminMenuAdapter(menuItems) { menuItem ->
            handleMenuClick(menuItem)
        }
        
        binding.rvAdminMenu.apply {
            layoutManager = GridLayoutManager(this@AdminDashboardActivity, 2)
            adapter = adminMenuAdapter
        }
    }
    
    private fun handleMenuClick(menuItem: AdminMenuItem) {
        when (menuItem.action) {
            "vehicles" -> startActivity(Intent(this, VehicleManagementActivity::class.java))
            "bins" -> startActivity(Intent(this, BinManagementActivity::class.java))
            "routes" -> startActivity(Intent(this, RouteManagementActivity::class.java))
            "analytics" -> startActivity(Intent(this, AnalyticsActivity::class.java))
            "users" -> startActivity(Intent(this, UserManagementActivity::class.java))
            "reports" -> startActivity(Intent(this, ReportsActivity::class.java))
            "settings" -> startActivity(Intent(this, SettingsActivity::class.java))
            "maintenance" -> startActivity(Intent(this, MaintenanceActivity::class.java))
        }
    }
    
    private fun loadDashboardData() {
        lifecycleScope.launch {
            try {
                val apiService = NetworkModule.provideApiService(this@AdminDashboardActivity)
                val response = apiService.getDashboardAnalytics("daily")
                
                if (response.isSuccessful) {
                    val dashboard = response.body()
                    dashboard?.let {
                        binding.apply {
                            tvBinsCollected.text = it.todayStats.binsCollected.toString()
                            tvWasteCollected.text = "${it.todayStats.wasteCollected} kg"
                            tvFuelUsed.text = "${String.format("%.1f", it.todayStats.fuelUsed)} L"
                            tvRoutesCompleted.text = it.todayStats.routesCompleted.toString()
                            tvEfficiency.text = "${it.todayStats.efficiency}%"
                            
                            tvUrgentBins.text = it.alerts.urgentBins.toString()
                            tvLowBattery.text = it.alerts.lowBattery.toString()
                            tvMaintenanceNeeded.text = it.alerts.maintenanceNeeded.toString()
                        }
                    }
                }
            } catch (e: Exception) {
                Toast.makeText(this@AdminDashboardActivity, "Failed to load dashboard data", Toast.LENGTH_SHORT).show()
            }
        }
    }
    
    private fun logout() {
        preferenceManager.clearUserData()
        startActivity(Intent(this, LoginActivity::class.java))
        finish()
    }
}