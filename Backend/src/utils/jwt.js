const jwt = require('jsonwebtoken');
const config = require('../config');

function signAccessToken(payload) {
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, config.jwt.refreshSecret, { expiresIn: config.jwt.refreshExpiresIn });
}

function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.secret);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, config.jwt.refreshSecret);
}

function signDeveloperToken(payload) {
  return jwt.sign({ ...payload, portal: 'DEVELOPER_LANDLORD' }, config.jwt.developerSecret, { expiresIn: '4h' });
}

function verifyDeveloperToken(token) {
  const decoded = jwt.verify(token, config.jwt.developerSecret);
  if (decoded.portal !== 'DEVELOPER_LANDLORD') {
    throw new Error('Invalid developer authority token scope');
  }
  return decoded;
}

function signVoiceToken(payload) {
  return jwt.sign({ ...payload, scope: 'VOICE_VERIFIED' }, config.jwt.voiceSecret, { expiresIn: '2h' });
}

function verifyVoiceToken(token) {
  const decoded = jwt.verify(token, config.jwt.voiceSecret);
  if (decoded.scope !== 'VOICE_VERIFIED') {
    throw new Error('Invalid voice verification token');
  }
  return decoded;
}

function decodeToken(token) {
  return jwt.decode(token);
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  signDeveloperToken,
  verifyDeveloperToken,
  signVoiceToken,
  verifyVoiceToken,
  decodeToken,
};
