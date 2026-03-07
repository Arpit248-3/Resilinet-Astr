/**
 * TACTICAL PRIORITY ENGINE v2.0
 * Calculates a dynamic response score based on Biometrics, Geospatial Clusters, 
 * and Time Escalation logic.
 */

const calculatePriority = (alert, clusterCount = 0) => {
    // 1. Severity Base (Mapped from Triage Category)
    const severityMap = { 
        'CRITICAL': 10, // Bio-hazard or High Heart Rate
        'HIGH': 7,      // Fire / Police
        'MEDIUM': 5,    // General / Accident
        'LOW': 2        // Standard / Minor
    };
    
    // Normalize priority string for mapping
    const basePriority = (alert.priority || 'Medium').toUpperCase();
    let S = severityMap[basePriority] || 5;

    // 2. BIOMETRIC ESCALATION (New Feature)
    // If heart rate is in the "Danger Zone" (>120 BPM), force maximum severity
    if (alert.heartRate > 120) {
        S = 12; // Exceeds standard critical for immediate pulse animation on Dashboard
    }

    // 3. TIME ESCALATION (T)
    // Increases priority score by 0.5 every 10 minutes (max bonus of 5 points)
    // Ensures old alerts don't get buried by new ones.
    const minutesWaiting = (Date.now() - new Date(alert.timestamp).getTime()) / (1000 * 60);
    const T = Math.min((minutesWaiting / 10) * 0.5, 5);

    // 4. CLUSTER RISK FACTOR (C)
    // Derived from the proximity of other active SOS alerts in the area
    const C = Math.min(clusterCount, 10);

    // 5. SECTOR MULTIPLIER (New Feature)
    // Alerts in the 'Local' sector get a small priority boost to resolve them 
    // before involving Mutual Aid/External sectors.
    const sectorFactor = alert.sector === 'Local' ? 1.5 : 0;

    // --- TACTICAL SCORE CALCULATION ---
    // (Severity * 5) + (Time * 3) + (Cluster * 4) + Sector Boost
    const score = (S * 5) + (T * 3) + (C * 4) + sectorFactor;

    return parseFloat(score.toFixed(2));
};

module.exports = { calculatePriority };