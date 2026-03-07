const mongoose = require('mongoose');

/**
 * TACTICAL SUPPLY SCHEMA v2.0
 * Handles high-integrity supply distribution with multi-factor verification.
 */
const supplySchema = new mongoose.Schema({
  // Link to the specific SOS alert
  victimId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'SOS', 
    required: true 
  },
  // Link to the responder carrying the supplies
  responderId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Responder' 
  },
  // Verification logic for secure handover
  verificationMethod: { 
    type: String, 
    enum: ['QR', 'BIOMETRIC', 'BLE_AUTO'], 
    default: 'QR' 
  },
  handshakeId: { 
    type: String, 
    unique: true 
  }, // Cryptographic token for secure transfer
  biometricToken: { 
    type: String 
  }, // Anonymized fingerprint/face hash
  supplyType: { 
    type: String, 
    default: 'Essential Medical/Food' 
  },
  // Supply Lifecycle Status
  status: { 
    type: String, 
    enum: ['Pending', 'In-Transit', 'Delivered', 'Failed'], 
    default: 'Pending' 
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  }
}, { timestamps: true });

// Indexing for quick lookup during the verification handshake
supplySchema.index({ handshakeId: 1 });
supplySchema.index({ victimId: 1, status: 1 });

module.exports = mongoose.model('Supply', supplySchema);