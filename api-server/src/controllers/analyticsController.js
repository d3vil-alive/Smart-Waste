const { db } = require('../config/firebase');
const Helpers = require('../utils/helpers');
const logger = require('../utils/logger');
const moment = require('moment');

class AnalyticsController {
  // Dashboard overview analytics
  static async getDashboardOverview(req, res) {
    try {
      const { period = 'daily', date } = req.query;
      
      let startDate = new Date();
      let endDate = new Date();

      if (date) {
        startDate = new Date(date);
        endDate = new Date(date);
      }

      switch (period) {
        case 'daily':
          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'weekly':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'monthly':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
      }

      // Get today's collections
      const collectionsSnapshot = await db.collection('collections')
        .where('collectionTime', '>=', startDate)
        .where('collectionTime', '<=', endDate)
        .get();

      let binsCollected = 0;
      let wasteCollected = 0;
      collectionsSnapshot.forEach(doc => {
        const collection = doc.data();
        binsCollected++;
        wasteCollected += collection.collectedWeight || 0;
      });

      // Get completed routes
      const routesSnapshot = await db.collection('routes')
        .where('status', '==', 'completed')
        .where('createdAt', '>=', startDate)
        .where('createdAt', '<=', endDate)
        .get();

      let routesCompleted = routesSnapshot.size;
      let fuelUsed = 0;
      let totalEfficiency = 0;

      routesSnapshot.forEach(doc => {
        const routeData = doc.data();
        fuelUsed += routeData.estimatedFuelConsumption || 0;
        
        // Calculate route efficiency
        if (routeData.estimatedDistance && routeData.actualDistance) {
          const efficiency = (routeData.estimatedDistance / routeData.actualDistance) * 100;
          totalEfficiency += efficiency;
        }
      });

      const averageEfficiency = routesCompleted > 0 ? Math.round(totalEfficiency / routesCompleted) : 0;

      // Get alerts
      const alertsSnapshot = await db.collection('alerts')
        .where('resolved', '==', false)
        .get();

      let urgentBins = 0;
      let lowBattery = 0;
      let maintenanceNeeded = 0;

      alertsSnapshot.forEach(doc => {
        const alertData = doc.data();
        alertData.alerts.forEach(alert => {
          if (alert.includes('collection')) urgentBins++;
          if (alert.includes('battery')) lowBattery++;
          if (alert.includes('maintenance')) maintenanceNeeded++;
        });
      });

      // Calculate trends (compare with previous period)
      let previousStartDate = new Date(startDate);
      let previousEndDate = new Date(endDate);
      
      const periodDuration = endDate.getTime() - startDate.getTime();
      previousStartDate = new Date(startDate.getTime() - periodDuration);
      previousEndDate = new Date(endDate.getTime() - periodDuration);

      const previousCollectionsSnapshot = await db.collection('collections')
        .where('collectionTime', '>=', previousStartDate)
        .where('collectionTime', '<=', previousEndDate)
        .get();

      let previousWasteCollected = 0;
      previousCollectionsSnapshot.forEach(doc => {
        const collection = doc.data();
        previousWasteCollected += collection.collectedWeight || 0;
      });

      const efficiencyTrend = previousWasteCollected > 0 ? 
        Math.round(((wasteCollected - previousWasteCollected) / previousWasteCollected) * 100) : 0;
      
      const wasteGenerationTrend = previousWasteCollected > 0 ? 
        Math.round(((wasteCollected - previousWasteCollected) / previousWasteCollected) * 100) : 0;

      res.json({
        todayStats: {
          binsCollected,
          wasteCollected: Math.round(wasteCollected),
          fuelUsed: Math.round(fuelUsed * 100) / 100,
          routesCompleted,
          efficiency: averageEfficiency
        },
        alerts: {
          urgentBins,
          lowBattery,
          maintenanceNeeded
        },
        trends: {
          efficiencyTrend: `${efficiencyTrend > 0 ? '+' : ''}${efficiencyTrend}%`,
          wasteGeneration: `${wasteGenerationTrend > 0 ? '+' : ''}${wasteGenerationTrend}%`
        }
      });

    } catch (error) {
      logger.error('Dashboard analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get dashboard analytics'
      });
    }
  }

  // Environmental impact analytics
  static async getEnvironmentalImpact(req, res) {
    try {
      const { period = 'monthly' } = req.query;

      let startDate = new Date();
      switch (period) {
        case 'weekly':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'monthly':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'yearly':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
      }

      // Get completed routes in the period
      const routesSnapshot = await db.collection('routes')
        .where('status', '==', 'completed')
        .where('createdAt', '>=', startDate)
        .get();

      let totalDistance = 0;
      let estimatedDistance = 0;
      let totalFuelUsed = 0;

      routesSnapshot.forEach(doc => {
        const routeData = doc.data();
        totalDistance += routeData.actualDistance || routeData.estimatedDistance;
        estimatedDistance += routeData.estimatedDistance;
        totalFuelUsed += routeData.estimatedFuelConsumption || 0;
      });

      // Calculate savings
      const unoptimizedDistance = estimatedDistance * 1.4; // Assume 40% inefficiency without optimization
      const distanceSaved = unoptimizedDistance - totalDistance;
      const fuelSaved = Helpers.calculateFuelConsumption(distanceSaved, 'truck');
      const carbonReduced = Helpers.calculateCarbonFootprint(fuelSaved);

      // Calculate efficiency improvement
      const efficiencyImprovement = unoptimizedDistance > 0 ? 
        Math.round((distanceSaved / unoptimizedDistance) * 100) : 0;

      // Calculate cost savings (average diesel price ₹80 per liter)
      const costSavings = Math.round(fuelSaved * 80);

      // Get total waste processed
      const collectionsSnapshot = await db.collection('collections')
        .where('collectionTime', '>=', startDate)
        .get();

      let wasteProcessed = 0;
      collectionsSnapshot.forEach(doc => {
        const collection = doc.data();
        wasteProcessed += collection.collectedWeight || 0;
      });

      res.json({
        fuelSaved: Math.round(fuelSaved),
        carbonReduced: Math.round(carbonReduced),
        efficiencyImprovement,
        costSavings,
        wasteProcessed: Math.round(wasteProcessed)
      });

    } catch (error) {
      logger.error('Environmental impact analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get environmental impact data'
      });
    }
  }

  // Predictive analytics
  static async getPredictions(req, res) {
    try {
      // Get all bins for fill predictions
      const binsSnapshot = await db.collection('smartBins').get();
      const binFillPredictions = [];

      // Simple prediction based on fill rate
      binsSnapshot.forEach(doc => {
        const binData = doc.data();
        
        if (binData.fillPercentage > 0 && binData.lastUpdated) {
          // Calculate average fill rate (simplified)
          const hoursSinceLastUpdate = (new Date() - binData.lastUpdated.toDate()) / (1000 * 60 * 60);
          const fillRate = binData.fillPercentage / Math.max(hoursSinceLastUpdate, 1);
          
          const remainingCapacity = 100 - binData.fillPercentage;
          const hoursToFill = remainingCapacity / Math.max(fillRate, 1);
          
          const predictedFillTime = new Date();
          predictedFillTime.setHours(predictedFillTime.getHours() + hoursToFill);
          
          // Only include predictions for bins that will fill within next 48 hours
          if (hoursToFill <= 48 && fillRate > 0.5) {
            binFillPredictions.push({
              binId: binData.binId,
              predictedFillTime: predictedFillTime.toISOString(),
              confidence: Math.min(Math.round(fillRate * 20), 95), // Simplified confidence calculation
              currentFillLevel: binData.fillPercentage,
              estimatedHoursToFill: Math.round(hoursToFill)
            });
          }
        }
      });

      // Sort by predicted fill time
      binFillPredictions.sort((a, b) => new Date(a.predictedFillTime) - new Date(b.predictedFillTime));

      // Get vehicles for maintenance predictions
      const vehiclesSnapshot = await db.collection('vehicles').get();
      const maintenanceAlerts = [];

      vehiclesSnapshot.forEach(doc => {
        const vehicleData = doc.data();
        
        // Simple maintenance prediction based on odometer
        if (vehicleData.odometer) {
          const nextMaintenanceKm = Math.ceil((vehicleData.odometer + 5000) / 5000) * 5000;
          const kmToMaintenance = nextMaintenanceKm - vehicleData.odometer;
          
          let riskLevel = 'low';
          if (kmToMaintenance <= 500) riskLevel = 'high';
          else if (kmToMaintenance <= 1000) riskLevel = 'medium';
          
          if (kmToMaintenance <= 2000) {
            const estimatedDays = Math.round(kmToMaintenance / 50); // Assume 50km per day average
            const nextMaintenanceDate = new Date();
            nextMaintenanceDate.setDate(nextMaintenanceDate.getDate() + estimatedDays);
            
            maintenanceAlerts.push({
              vehicleId: vehicleData.vehicleId,
              nextMaintenance: nextMaintenanceDate.toISOString().split('T')[0],
              riskLevel,
              kmToMaintenance,
              estimatedDays
            });
          }
        }
      });

      res.json({
        binFillPredictions: binFillPredictions.slice(0, 10), // Top 10 urgent predictions
        maintenanceAlerts
      });

    } catch (error) {
      logger.error('Predictive analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate predictions'
      });
    }
  }

  // Generate custom reports
  static async generateReport(req, res) {
    try {
      const { reportType, dateRange, filters, format = 'json' } = req.body;

      const { startDate, endDate } = dateRange;
      const start = new Date(startDate);
      const end = new Date(endDate);

      let reportData = {};
      const reportId = Helpers.generateId('RPT');

      switch (reportType) {
        case 'waste_collection':
          reportData = await this.generateWasteCollectionReport(start, end, filters);
          break;
        case 'vehicle_performance':
          reportData = await this.generateVehiclePerformanceReport(start, end, filters);
          break;
        case 'cost_analysis':
          reportData = await this.generateCostAnalysisReport(start, end, filters);
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid report type'
          });
      }

      // In production, generate actual PDF/Excel files and upload to cloud storage
      const downloadUrl = `https://api.smartwaste.com/reports/${reportId}.${format}`;

      // Store report metadata
      const reportMetadata = {
        reportId,
        reportType,
        dateRange,
        filters,
        format,
        generatedAt: new Date(),
        downloadUrl,
        data: reportData
      };

      await db.collection('reports').doc(reportId).set(reportMetadata);

      res.json({
        reportId,
        downloadUrl,
        generatedAt: new Date().toISOString(),
        summary: this.generateReportSummary(reportData, reportType)
      });

    } catch (error) {
      logger.error('Generate report error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate report'
      });
    }
  }

  // Helper method to generate waste collection report
  static async generateWasteCollectionReport(startDate, endDate, filters) {
    let query = db.collection('collections')
      .where('collectionTime', '>=', startDate)
      .where('collectionTime', '<=', endDate);

    if (filters.vehicleIds && filters.vehicleIds.length > 0) {
      query = query.where('vehicleId', 'in', filters.vehicleIds);
    }

    const collectionsSnapshot = await query.get();
    
    const collections = [];
    let totalWeight = 0;
    let totalCollections = 0;

    collectionsSnapshot.forEach(doc => {
      const collection = doc.data();
      collections.push(collection);
      totalWeight += collection.collectedWeight || 0;
      totalCollections++;
    });

    return {
      collections,
      summary: {
        totalCollections,
        totalWeight: Math.round(totalWeight),
        averageWeight: totalCollections > 0 ? Math.round(totalWeight / totalCollections) : 0,
        period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`
      }
    };
  }

  // Helper method to generate vehicle performance report
  static async generateVehiclePerformanceReport(startDate, endDate, filters) {
    let query = db.collection('routes')
      .where('createdAt', '>=', startDate)
      .where('createdAt', '<=', endDate);

    if (filters.vehicleIds && filters.vehicleIds.length > 0) {
      query = query.where('vehicleId', 'in', filters.vehicleIds);
    }

    const routesSnapshot = await query.get();
    
    const vehiclePerformance = {};

    routesSnapshot.forEach(doc => {
      const routeData = doc.data();
      const vehicleId = routeData.vehicleId;
      
      if (!vehiclePerformance[vehicleId]) {
        vehiclePerformance[vehicleId] = {
          totalRoutes: 0,
          totalDistance: 0,
          totalFuelUsed: 0,
          averageEfficiency: 0
        };
      }
      
      vehiclePerformance[vehicleId].totalRoutes++;
      vehiclePerformance[vehicleId].totalDistance += routeData.actualDistance || routeData.estimatedDistance;
      vehiclePerformance[vehicleId].totalFuelUsed += routeData.estimatedFuelConsumption || 0;
    });

    return { vehiclePerformance };
  }

  // Helper method to generate cost analysis report
  static async generateCostAnalysisReport(startDate, endDate, filters) {
    const fuelPrice = 80; // ₹80 per liter
    const maintenanceCostPerKm = 2; // ₹2 per km

    const routesSnapshot = await db.collection('routes')
      .where('createdAt', '>=', startDate)
      .where('createdAt', '<=', endDate)
      .get();

    let totalFuelCost = 0;
    let totalMaintenanceCost = 0;
    let totalDistance = 0;

    routesSnapshot.forEach(doc => {
      const routeData = doc.data();
      const distance = routeData.actualDistance || routeData.estimatedDistance;
      const fuelUsed = routeData.estimatedFuelConsumption || 0;
      
      totalDistance += distance;
      totalFuelCost += fuelUsed * fuelPrice;
      totalMaintenanceCost += distance * maintenanceCostPerKm;
    });

    return {
      costBreakdown: {
        fuelCost: Math.round(totalFuelCost),
        maintenanceCost: Math.round(totalMaintenanceCost),
        totalOperatingCost: Math.round(totalFuelCost + totalMaintenanceCost),
        costPerKm: totalDistance > 0 ? Math.round((totalFuelCost + totalMaintenanceCost) / totalDistance) : 0
      },
      period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`
    };
  }

  // Helper method to generate report summary
  static generateReportSummary(reportData, reportType) {
    switch (reportType) {
      case 'waste_collection':
        return `Generated waste collection report with ${reportData.summary.totalCollections} collections totaling ${reportData.summary.totalWeight} kg`;
      case 'vehicle_performance':
        const vehicleCount = Object.keys(reportData.vehiclePerformance).length;
        return `Generated vehicle performance report for ${vehicleCount} vehicles`;
      case 'cost_analysis':
        return `Generated cost analysis report showing total operating cost of ₹${reportData.costBreakdown.totalOperatingCost}`;
      default:
        return 'Report generated successfully';
    }
  }
}

module.exports = AnalyticsController;