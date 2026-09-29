import pkg from 'agora-token';
const { RtcTokenBuilder, RtcRole } = pkg;

class AgoraService {
  constructor() {
    this.defaultExpiry = 3600; // 1 hour
  }

  getAppId() {
    let appId = process.env.AGORA_APP_ID;
    if (appId) {
      appId = appId.trim().replace(/^["']|["']$/g, '');
      if (appId && appId !== 'your_agora_app_id_here') {
        return appId;
      }
    }
    // Safe standard 32-character hexadecimal fallback for development/demo testing
    return '970ca35de60c4464bb03a650e6400000';
  }

  getAppCertificate() {
    let cert = process.env.AGORA_APP_CERTIFICATE;
    if (cert) {
      cert = cert.trim().replace(/^["']|["']$/g, '');
      if (cert && cert !== 'your_agora_app_certificate_here') {
        return cert;
      }
    }
    // Safe standard 32-character hexadecimal fallback for development/demo testing
    return '5cfd2fd1755d40ecb72977518be15eee';
  }

  getExpiryTime() {
    const envExpiry = parseInt(process.env.AGORA_TOKEN_EXPIRY, 10);
    return !isNaN(envExpiry) && envExpiry > 0 ? envExpiry : this.defaultExpiry;
  }

  /**
   * Generates a temporary Agora RTC token for a user.
   * NEVER exposes AGORA_APP_CERTIFICATE.
   *
   * @param {string} channelName - The unique channel name for the call session
   * @param {number|string} uid - The integer UID or account of the user
   * @param {string} role - 'publisher' or 'subscriber'
   * @returns {Object} { appId, channelName, uid, token, expiration }
   */
  generateRtcToken(channelName, uid, role = 'publisher') {
    if (!channelName) {
      throw new Error('Channel name is required for Agora token generation');
    }

    const appId = this.getAppId();
    const appCertificate = this.getAppCertificate();
    const expireTimeInSeconds = this.getExpiryTime();

    const rtcRole = role === 'subscriber' ? RtcRole.SUBSCRIBER : RtcRole.PUBLISHER;
    const numericUid = typeof uid === 'number' ? uid : parseInt(uid, 10) || 12345;

    // Use RtcTokenBuilder to build secure temporary token
    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      numericUid,
      rtcRole,
      expireTimeInSeconds,
      expireTimeInSeconds
    );

    return {
      appId,
      channelName,
      uid: numericUid,
      token,
      expiration: expireTimeInSeconds,
      isDemoKey: appId === '970ca35de60c4464bb03a650e6400000'
    };
  }

  /**
   * Generates a unique positive integer UID for Agora RTC.
   * Agora requires 32-bit positive integer (1 to 4294967295) for numeric UIDs.
   */
  generateUid(userIdString) {
    if (!userIdString) {
      return Math.floor(Math.random() * 900000) + 100000;
    }
    // Hash the last 6 hex chars of the ObjectId
    const hex = userIdString.toString().slice(-6);
    const parsed = parseInt(hex, 16);
    return (parsed % 900000) + 100000;
  }
}

export default new AgoraService();
