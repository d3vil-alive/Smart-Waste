const moment = require('moment');
const { v4: uuidv4 } = require('uuid');

class Helpers {
  static generateId(prefix = '') {
    return prefix ? `${prefix}${uuidv4()}` : uuidv4();
  }

  static generateVehicleId() {
    return `VH${Date.now().toString().slice(-6)}`;
  }

  static generateBinId() {
    return `BIN${Date.now().toString().slice(-6)}`;
  }

  static generateRouteId() {
    return `RT${Date.now().toString().slice(-6)}`;
  }

  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  static toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  static formatTimestamp(timestamp) {
    return moment(timestamp).format('YYYY-MM-DD HH:mm:ss');
  }

  static calculateEfficiency(actual, expected) {
    if (expected === 0) return 0;
    return Math.round((actual / expected) * 100);
  }

  static generateQRCode(data) {
    // In a real implementation, use qrcode library
    return `data:image/png;base64,${Buffer.from(data).toString('base64')}`;
  }

  static validateCoordinates(lat, lng) {
    return (
      lat >= -90 && lat <= 90 &&
      lng >= -180 && lng <= 180
    );
  }

  static calculateFuelConsumption(distance, vehicleType) {
    const fuelEfficiency = {
      truck: 6,   // km per liter
      van: 10,    // km per liter
      auto: 15    // km per liter
    };
    
    const efficiency = fuelEfficiency[vehicleType] || 8;
    return distance / efficiency;
  }

  static calculateCarbonFootprint(fuelConsumed) {
    // 2.68 kg CO2 per liter of diesel
    return fuelConsumed * 2.68;
  }

  static generateResponseObject(success, message, data = null) {
    const response = { success, message };
    if (data) response.data = data;
    return response;
  }
}

module.exports = Helpers;