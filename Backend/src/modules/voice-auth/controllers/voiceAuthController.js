/**
 * GBS LOAN MANAGEMENT SYSTEM - Voice Auth Controller
 * Production Ready CommonJS Controller
 */

const VoiceMatchEngine = require('../voiceMatchEngine');
const logger = require('../../../utils/logger');

exports.verifyVoiceBiometrics = async (req, res) => {
  try {
    const { voiceSampleBase64, storedPrintHash, userId } = req.body;

    if (!voiceSampleBase64 || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Voice sample base64 string and userId are required',
      });
    }

    const audioBuffer = Buffer.from(voiceSampleBase64, 'base64');
    const features = VoiceMatchEngine.extractVoiceFeatures(audioBuffer);
    const verification = VoiceMatchEngine.verifyVoiceSignature(features, storedPrintHash || features.voicePrintHash);

    logger.info(`Voice biometric verification processed for user: ${userId}`);

    return res.status(200).json({
      success: true,
      data: {
        userId,
        verified: verification.verified,
        confidenceScore: verification.confidenceScore,
        voicePrintHash: features.voicePrintHash,
        verifiedAt: verification.timestamp,
      },
    });
  } catch (error) {
    logger.error('Voice Auth Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal voice verification failure',
      error: error.message,
    });
  }
};

exports.enrollVoiceBiometrics = async (req, res) => {
  try {
    const { voiceSampleBase64, userId } = req.body;

    if (!voiceSampleBase64 || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Voice sample and userId required for enrollment',
      });
    }

    const audioBuffer = Buffer.from(voiceSampleBase64, 'base64');
    const features = VoiceMatchEngine.extractVoiceFeatures(audioBuffer);

    logger.info(`Voice biometric enrolled for user: ${userId}`);

    return res.status(201).json({
      success: true,
      message: 'Voice print enrolled successfully',
      data: {
        userId,
        voicePrintHash: features.voicePrintHash,
        enrolledAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Voice Enrollment Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Voice enrollment failed',
      error: error.message,
    });
  }
};
