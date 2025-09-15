const Helpers = require('../utils/helpers');
const logger = require('../utils/logger');

class RouteOptimizationService {
  static async optimizeRoute(startLocation, bins, vehicle) {
    try {
      // Simple route optimization using nearest neighbor algorithm
      // In production, use advanced algorithms like Genetic Algorithm or Simulated Annealing
      
      const optimizedSequence = [];
      const unvisitedBins = [...bins];
      let currentLocation = startLocation;
      let totalDistance = 0;
      let totalWeight = 0;

      while (unvisitedBins.length > 0 && totalWeight < vehicle.capacity) {
        let nearestBin = null;
        let nearestDistance = Infinity;
        let nearestIndex = -1;

        // Find nearest bin
        unvisitedBins.forEach((bin, index) => {
          const distance = Helpers.calculateDistance(
            currentLocation.lat,
            currentLocation.lng,
            bin.location.lat,
            bin.location.lng
          );

          if (distance < nearestDistance && (totalWeight + bin.estimatedWeight) <= vehicle.capacity) {
            nearestDistance = distance;
            nearestBin = bin;
            nearestIndex = index;
          }
        });

        if (nearestBin) {
          // Add to route
          optimizedSequence.push({
            binId: nearestBin.binId,
            estimatedWeight: nearestBin.estimatedWeight,
            travelTime: Math.round(nearestDistance * 2), // Rough estimate: 2 minutes per km
            priority: this.calculatePriority(nearestBin),
            location: nearestBin.location
          });

          totalDistance += nearestDistance;
          totalWeight += nearestBin.estimatedWeight;
          currentLocation = nearestBin.location;
          unvisitedBins.splice(nearestIndex, 1);
        } else {
          break; // No more bins can fit
        }
      }

      // Calculate return distance to depot
      const returnDistance = Helpers.calculateDistance(
        currentLocation.lat,
        currentLocation.lng,
        startLocation.lat,
        startLocation.lng
      );
      totalDistance += returnDistance;

      // Calculate fuel savings compared to random route
      const randomRouteDistance = this.estimateRandomRouteDistance(startLocation, bins);
      const fuelSaved = Math.max(0, Math.round(((randomRouteDistance - totalDistance) / randomRouteDistance) * 100));

      return {
        optimizedSequence,
        totalDistance: Math.round(totalDistance * 10) / 10,
        estimatedTime: Math.round(totalDistance * 2 + optimizedSequence.length * 10), // 2 min/km + 10 min collection per bin
        estimatedFuelSaved: fuelSaved,
        estimatedFuelConsumption: Helpers.calculateFuelConsumption(totalDistance, vehicle.vehicleType),
        totalWeight
      };

    } catch (error) {
      logger.error('Route optimization error:', error);
      throw new Error('Failed to optimize route');
    }
  }

  static calculatePriority(bin) {
    let priority = 1;
    
    // Higher priority for fuller bins
    if (bin.fillPercentage >= 90) priority += 3;
    else if (bin.fillPercentage >= 80) priority += 2;
    else if (bin.fillPercentage >= 70) priority += 1;

    // Higher priority for bins not collected recently
    if (bin.lastCollection) {
      const daysSinceCollection = (new Date() - new Date(bin.lastCollection)) / (1000 * 60 * 60 * 24);
      if (daysSinceCollection > 3) priority += 2;
      else if (daysSinceCollection > 2) priority += 1;
    }

    return priority;
  }

  static estimateRandomRouteDistance(startLocation, bins) {
    // Rough estimate of random route distance
    const avgDistanceBetweenBins = 2; // km
    return bins.length * avgDistanceBetweenBins * 1.5; // 50% inefficiency factor
  }

  static async findOptimalStartTime(routeData) {
    // Analyze traffic patterns and bin fill rates to suggest optimal start time
    // This is a simplified version
    
    const trafficMultipliers = {
      6: 0.8,   // 6 AM - low traffic
      7: 1.0,   // 7 AM - medium traffic
      8: 1.3,   // 8 AM - high traffic
      9: 1.1,   // 9 AM - medium-high traffic
      10: 0.9,  // 10 AM - low-medium traffic
      11: 0.8,  // 11 AM - low traffic
      12: 1.0   // 12 PM - medium traffic
    };

    let optimalHour = 6;
    let minTime = Infinity;

    Object.entries(trafficMultipliers).forEach(([hour, multiplier]) => {
      const estimatedTime = routeData.estimatedTime * multiplier;
      if (estimatedTime < minTime) {
        minTime = estimatedTime;
        optimalHour = parseInt(hour);
      }
    });

    return {
      optimalStartTime: `${optimalHour.toString().padStart(2, '0')}:00`,
      estimatedCompletionTime: optimalHour + Math.ceil(minTime / 60),
      trafficMultiplier: trafficMultipliers[optimalHour]
    };
  }

  // Dijkstra's algorithm for shortest path (simplified version)
  static findShortestPath(graph, startNode, endNode) {
    const distances = {};
    const previousNodes = {};
    const unvisited = new Set();

    // Initialize distances
    Object.keys(graph).forEach(node => {
      distances[node] = node === startNode ? 0 : Infinity;
      unvisited.add(node);
    });

    while (unvisited.size > 0) {
      // Find unvisited node with minimum distance
      let currentNode = null;
      let minDistance = Infinity;
      
      unvisited.forEach(node => {
        if (distances[node] < minDistance) {
          minDistance = distances[node];
          currentNode = node;
        }
      });

      if (currentNode === null) break;

      unvisited.delete(currentNode);

      // Update distances to neighbors
      if (graph[currentNode]) {
        Object.entries(graph[currentNode]).forEach(([neighbor, weight]) => {
          const tentativeDistance = distances[currentNode] + weight;
          
          if (tentativeDistance < distances[neighbor]) {
            distances[neighbor] = tentativeDistance;
            previousNodes[neighbor] = currentNode;
          }
        });
      }
    }

    // Construct shortest path
    const path = [];
    let current = endNode;
    
    while (current !== undefined) {
      path.unshift(current);
      current = previousNodes[current];
    }

    return {
      path,
      distance: distances[endNode]
    };
  }
}

module.exports = RouteOptimizationService;