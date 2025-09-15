package com.qbrain.smartwaste.activities

import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.qbrain.smartwaste.R
import com.qbrain.smartwaste.databinding.ActivityRegisterBinding
import com.qbrain.smartwaste.network.NetworkModule
import com.qbrain.smartwaste.network.RegisterRequest
import kotlinx.coroutines.launch

class RegisterActivity : AppCompatActivity() {
    
    private lateinit var binding: ActivityRegisterBinding
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityRegisterBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        setupViews()
    }
    
    private fun setupViews() {
        binding.btnRegister.setOnClickListener {
            performRegistration()
        }
        
        binding.tvLogin.setOnClickListener {
            finish()
        }
        
        binding.toolbar.setNavigationOnClickListener {
            finish()
        }
    }
    
    private fun performRegistration() {
        val name = binding.etName.text.toString().trim()
        val email = binding.etEmail.text.toString().trim()
        val phone = binding.etPhone.text.toString().trim()
        val password = binding.etPassword.text.toString().trim()
        val confirmPassword = binding.etConfirmPassword.text.toString().trim()
        val userType = when (binding.rgUserType.checkedRadioButtonId) {
            R.id.rbDriver -> "driver"
            else -> "citizen"
        }
        
        if (name.isEmpty() || email.isEmpty() || phone.isEmpty() || password.isEmpty()) {
            Toast.makeText(this, "Please fill all fields", Toast.LENGTH_SHORT).show()
            return
        }
        
        if (password != confirmPassword) {
            Toast.makeText(this, "Passwords don't match", Toast.LENGTH_SHORT).show()
            return
        }
        
        if (password.length < 6) {
            Toast.makeText(this, "Password must be at least 6 characters", Toast.LENGTH_SHORT).show()
            return
        }
        
        binding.btnRegister.isEnabled = false
        binding.btnRegister.text = "Registering..."
        
        lifecycleScope.launch {
            try {
                val apiService = NetworkModule.provideApiService(this@RegisterActivity)
                val response = apiService.register(
                    RegisterRequest(name, email, phone, password, userType, null)
                )
                
                if (response.isSuccessful && response.body()?.success == true) {
                    Toast.makeText(this@RegisterActivity, "Registration successful! Please login.", Toast.LENGTH_LONG).show()
                    finish()
                } else {
                    Toast.makeText(this@RegisterActivity, "Registration failed", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Toast.makeText(this@RegisterActivity, "Network error: ${e.message}", Toast.LENGTH_SHORT).show()
            } finally {
                binding.btnRegister.isEnabled = true
                binding.btnRegister.text = "Register"
            }
        }
    }
}