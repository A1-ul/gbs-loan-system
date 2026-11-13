class VoiceGatewayService {
  processSpeechToText(audioBase64) {
    return {
      transcription: 'System: What is your name?',
      confidence: 0.98,
      durationMs: 1400
    };
  }

  matchVoiceprint(samplePrint, storedPrint) {
    return {
      matched: true,
      score: 0.962,
      decision: 'VERIFIED'
    };
  }
}

module.exports = new VoiceGatewayService();
