package com.qbrain.smartwaste.utils

import android.content.Context
import android.content.SharedPreferences

class PreferenceManager(context: Context) {
    
    private val sharedPreferences: SharedPreferences = 
        context.getSharedPreferences("smart_waste_prefs", Context.MODE_PRIVATE)
    
    companion object {
        private const val KEY_AUTH_TOKEN = "auth_token"
        private const val KEY_USER_ID = "user_id"
        private const val KEY_USER_NAME = "user_name"
        private const val KEY_USER_EMAIL = "user_email"
        private const val KEY_USER_TYPE = "user_type"
        private const val KEY_IS_LOGGED_IN = "is_logged_in"
        private const val KEY_VEHICLE_ID = "vehicle_id"
    }
    
    fun saveAuthToken(token: String) {
        sharedPreferences.edit().putString(KEY_AUTH_TOKEN, token).apply()
    }
    
    fun getAuthToken(): String? {
        return sharedPreferences.getString(KEY_AUTH_TOKEN, null)
    }
    
    fun saveUserData(user: User) {
        sharedPreferences.edit().apply {
            putString(KEY_USER_ID, user.userId)
            putString(KEY_USER_NAME, user.name)
            putString(KEY_USER_EMAIL, user.email)
            putString(KEY_USER_TYPE, user.userType)
            putBoolean(KEY_IS_LOGGED_IN, true)
            apply()
        }
    }
    
    fun getUserId(): String? = sharedPreferences.getString(KEY_USER_ID, null)
    fun getUserName(): String? = sharedPreferences.getString(KEY_USER_NAME, null)
    fun getUserEmail(): String? = sharedPreferences.getString(KEY_USER_EMAIL, null)
    fun getUserType(): String? = sharedPreferences.getString(KEY_USER_TYPE, null)
    fun isLoggedIn(): Boolean = sharedPreferences.getBoolean(KEY_IS_LOGGED_IN, false)
    
    fun saveVehicleId(vehicleId: String) {
        sharedPreferences.edit().putString(KEY_VEHICLE_ID, vehicleId).apply()
    }
    
    fun getVehicleId(): String? = sharedPreferences.getString(KEY_VEHICLE_ID, null)
    
    fun clearUserData() {
        sharedPreferences.edit().clear().apply()
    }
}