package com.qbrain.smartwaste.activities

import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.qbrain.smartwaste.R
import com.qbrain.smartwaste.databinding.ActivityLoginBinding
import com.qbrain.smartwaste.network.LoginRequest
import com.qbrain.smartwaste.network.NetworkModule
import com.qbrain.smartwaste.utils.PreferenceManager
import kotlinx.coroutines.launch

class LoginActivity : AppCompatActivity() {
    
    private lateinit var binding: ActivityLoginBinding
    private lateinit var preferenceManager: PreferenceManager
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityLoginBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        preferenceManager = PreferenceManager(this)
        
        // Check if user is already logged in
        if (preferenceManager.isLoggedIn()) {
            navigateToMainActivity()
            return
        }
        
        setupViews()
    }
    
    private fun setupViews() {
        binding.btnLogin.setOnClickListener {
            performLogin()
        }
        
        binding.tvRegister.setOnClickListener {
            startActivity(Intent(this, RegisterActivity::class.java))
        }
    }
    
    private fun performLogin() {
        val email = binding.etEmail.text.toString().trim()
        val password = binding.etPassword.text.toString().trim()
        val userType = when (binding.rgUserType.checkedRadioButtonId) {
            R.id.rbAdmin -> "admin"
            R.id.rbDriver -> "driver"
            else -> "citizen"
        }
        
        if (email.isEmpty() || password.isEmpty()) {
            Toast.makeText(this, "Please fill all fields", Toast.LENGTH_SHORT).show()
            return
        }
        
        binding.btnLogin.isEnabled = false
        binding.btnLogin.text = "Logging in..."
        
        lifecycleScope.launch {
            try {
                val apiService = NetworkModule.provideApiService(this@LoginActivity)
                val response = apiService.login(LoginRequest(email, password, userType))
                
                if (response.isSuccessful && response.body()?.success == true) {
                    val loginResponse = response.body()!!
                    
                    // Save user data
                    preferenceManager.saveAuthToken(loginResponse.token)
                    preferenceManager.saveUserData(loginResponse.user)
                    
                    Toast.makeText(this@LoginActivity, "Login successful", Toast.LENGTH_SHORT).show()
                    navigateToMainActivity()
                } else {
                    Toast.makeText(this@LoginActivity, "Login failed", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Toast.makeText(this@LoginActivity, "Network error: ${e.message}", Toast.LENGTH_SHORT).show()
            } finally {
                binding.btnLogin.isEnabled = true
                binding.btnLogin.text = "Login"
            }
        }
    }
    
    private fun navigateToMainActivity() {
        val userType = preferenceManager.getUserType()
        val intent = when (userType) {
            "admin" -> Intent(this, AdminDashboardActivity::class.java)
            "driver" -> Intent(this, DriverDashboardActivity::class.java)
            else -> Intent(this, CitizenDashboardActivity::class.java)
        }
        startActivity(intent)
        finish()
    }
}