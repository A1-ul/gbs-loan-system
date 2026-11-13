const voiceService = require('./voice.service');
const logger = require('../../utils/logger');

async function enroll(req, res, next) {
  try {
    const userId = req.user.id;
    const { audioBase64, passphraseText, spectralMetrics } = req.body;

    if (!audioBase64 && !Array.isArray(spectralMetrics)) {
      return res.status(400).json({ success: false, message: 'Audio payload (audioBase64) or acoustic spectralMetrics required.' });
    }

    const profile = await voiceService.enrollVoiceProfile(userId, audioBase64 || '', passphraseText, spectralMetrics);
    return res.status(200).json({
      success: true,
      message: 'Voice profile enrolled successfully.',
      data: profile,
    });
  } catch (error) {
    logger.error('Voice enrollment error:', error);
    next(error);
  }
}

async function verify(req, res, next) {
  try {
    const userId = req.user.id;
    const { audioBase64, actionAttempted, transcription, spectralMetrics } = req.body;
    const ipAddress = req.ip || req.connection?.remoteAddress || null;

    if (!audioBase64 && !Array.isArray(spectralMetrics)) {
      return res.status(400).json({ success: false, message: 'Audio sample required for voice identity verification.' });
    }

    const result = await voiceService.verifyVoiceAuthentication(
      userId,
      audioBase64 || '',
      actionAttempted,
      ipAddress,
      { transcription, spectralMetrics }
    );

    if (!result.passed) {
      return res.status(401).json({
        success: false,
        message: result.message,
        data: result,
      });
    }

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    logger.error('Voice verification error:', error);
    next(error);
  }
}

async function getStatus(req, res, next) {
  try {
    const userId = req.user.id;
    const status = await voiceService.getVoiceStatus(userId);
    return res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  enroll,
  verify,
  getStatus,
};
