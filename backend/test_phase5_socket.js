import { io } from 'socket.io-client';

const BASE_URL = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

async function request(url, options = {}) {
  const fullUrl = `${BASE_URL}${url}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const config = {
    method: options.method || 'GET',
    headers
  };

  if (options.body) {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(fullUrl, config);
  const data = await response.json().catch(() => null);

  return { status: response.status, data, ok: response.ok };
}

async function runSocketVideoTests() {
  console.log('====================================================');
  console.log('     SOCIALX PHASE 5 REAL-TIME SOCKET VIDEO TEST    ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, testName, details = '') => {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} ${details ? '- ' + details : ''}`);
      failed++;
    }
  };

  let socketA = null;
  let socketB = null;

  try {
    // 1. Authenticate User A (Devon Lane)
    const userALogin = await request('/auth/login', {
      method: 'POST',
      body: { emailOrUsername: 'devonlane', password: 'password123' }
    });
    const tokenA = userALogin.data?.data?.token;
    const userA = userALogin.data?.data?.user;
    assert(tokenA, 'User A authenticated');

    // 2. Authenticate User B (George Lobko)
    const userBLogin = await request('/auth/login', {
      method: 'POST',
      body: { emailOrUsername: 'georgelobko', password: 'password123' }
    });
    const tokenB = userBLogin.data?.data?.token;
    const userB = userBLogin.data?.data?.user;
    assert(tokenB, 'User B authenticated');

    // 3. Connect User A Socket
    socketA = io(SOCKET_URL, {
      auth: { token: tokenA },
      transports: ['websocket']
    });

    await new Promise((resolve, reject) => {
      socketA.on('connect', resolve);
      socketA.on('connect_error', reject);
    });
    assert(socketA.connected, 'User A Socket.IO connection established');

    // 4. Connect User B Socket
    socketB = io(SOCKET_URL, {
      auth: { token: tokenB },
      transports: ['websocket']
    });

    await new Promise((resolve, reject) => {
      socketB.on('connect', resolve);
      socketB.on('connect_error', reject);
    });
    assert(socketB.connected, 'User B Socket.IO connection established');

    // 5. Setup Promise for User B receiving call:invite
    const invitePromise = new Promise((resolve) => {
      socketB.on('call:invite', (inviteData) => {
        resolve(inviteData);
      });
    });

    // 6. User A initiates video call to User B
    const initiateRes = await request('/video-calls/initiate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: { receiverId: userB._id || userB.id }
    });
    assert(initiateRes.ok, 'User A called User B via REST API');

    const session = initiateRes.data?.data?.callSession;
    const sessionId = session._id || session.id;

    // 7. Await User B socket receiving the invite
    const receivedInvite = await Promise.race([
      invitePromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Invite timeout')), 5000))
    ]);

    assert(
      receivedInvite && receivedInvite.callSessionId.toString() === sessionId.toString(),
      'User B received real-time call:invite event over Socket.IO'
    );
    assert(
      receivedInvite.caller?.username === userA.username,
      'call:invite event contains populated caller details'
    );

    // 8. Setup Promise for User A receiving call:accept
    const acceptPromise = new Promise((resolve) => {
      socketA.on('call:accept', (acceptData) => {
        resolve(acceptData);
      });
    });

    // 9. User B accepts the call
    const acceptRes = await request('/video-calls/accept', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: { callSessionId: sessionId }
    });
    assert(acceptRes.ok, 'User B accepted call via REST API');

    const receivedAccept = await Promise.race([
      acceptPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Accept timeout')), 5000))
    ]);
    assert(
      receivedAccept && receivedAccept.callSessionId.toString() === sessionId.toString(),
      'User A received real-time call:accept event over Socket.IO'
    );

    // 10. User A toggles microphone mute -> emits call:media-state
    const mediaStatePromise1 = new Promise((resolve) => {
      socketB.on('call:media-state', (state) => {
        if (state.isAudioMuted === true) resolve(state);
      });
    });

    socketA.emit('call:media-state', {
      targetUserId: userB._id || userB.id,
      isAudioMuted: true,
      isVideoMuted: false
    });

    const receivedMedia1 = await Promise.race([
      mediaStatePromise1,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Media state 1 timeout')), 4000))
    ]);
    assert(
      receivedMedia1 && receivedMedia1.isAudioMuted === true,
      'User B received peer microphone muted state over Socket.IO'
    );

    // 11. User A toggles camera disable -> emits call:media-state
    const mediaStatePromise2 = new Promise((resolve) => {
      socketB.on('call:media-state', (state) => {
        if (state.isVideoMuted === true) resolve(state);
      });
    });

    socketA.emit('call:media-state', {
      targetUserId: userB._id || userB.id,
      isAudioMuted: true,
      isVideoMuted: true
    });

    const receivedMedia2 = await Promise.race([
      mediaStatePromise2,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Media state 2 timeout')), 4000))
    ]);
    assert(
      receivedMedia2 && receivedMedia2.isVideoMuted === true,
      'User B received peer camera disabled state over Socket.IO'
    );

    // 12. User B ends the call -> User A receives call:end
    const endPromise = new Promise((resolve) => {
      socketA.on('call:end', (endData) => {
        resolve(endData);
      });
    });

    const endRes = await request('/video-calls/end', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: { callSessionId: sessionId, reason: 'Completed call' }
    });
    assert(endRes.ok, 'User B ended call via REST API');

    const receivedEnd = await Promise.race([
      endPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('End timeout')), 4000))
    ]);
    assert(
      receivedEnd && receivedEnd.callSessionId.toString() === sessionId.toString(),
      'User A received real-time call:end event over Socket.IO'
    );

    // 13. Verify CallSession record in database
    const sessionRes = await request(`/video-calls/${sessionId}`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert(
      sessionRes.data?.data?.callSession?.status === 'ended',
      'Database CallSession record verified with status === "ended"'
    );

    console.log('\n====================================================');
    console.log(`TOTAL REAL-TIME SOCKET TESTS: ${passed + failed}`);
    console.log(`PASSED: ${passed}`);
    console.log(`FAILED: ${failed}`);
    console.log('====================================================\n');

    if (failed === 0) {
      console.log('>>> REAL-TIME AGORA VIDEO CALL SIGNALING FULLY VERIFIED! <<<');
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error('Socket video test error:', err);
    process.exit(1);
  } finally {
    if (socketA) socketA.disconnect();
    if (socketB) socketB.disconnect();
  }
}

runSocketVideoTests();
