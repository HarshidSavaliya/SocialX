import http from 'http';

const BASE_URL = 'http://localhost:5000/api';

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

async function runPhase5Tests() {
  console.log('====================================================');
  console.log('        STARTING SOCIALX PHASE 5 TEST SUITE        ');
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

  try {
    // ------------------------------------------------------------------
    // TEST GROUP 1: HEALTH CHECK & VERSION
    // ------------------------------------------------------------------
    console.log('\n--- TEST GROUP 1: HEALTH & API VERSION ---');
    const health = await request('/');
    assert(
      health.status === 200 && health.data?.version === '5.0.0',
      'API Health check reports Phase 5.0.0'
    );

    // ------------------------------------------------------------------
    // TEST GROUP 2: AUTHENTICATION FOR USERS A & B
    // ------------------------------------------------------------------
    console.log('\n--- TEST GROUP 2: AUTHENTICATING PARTICIPANTS ---');

    // User A: Devon Lane
    const userALogin = await request('/auth/login', {
      method: 'POST',
      body: { emailOrUsername: 'devonlane', password: 'password123' }
    });
    assert(userALogin.ok && userALogin.data?.data?.token, 'User A (Devon Lane) logged in');
    const tokenA = userALogin.data?.data?.token;
    const userA = userALogin.data?.data?.user;

    // User B: George Lobko
    const userBLogin = await request('/auth/login', {
      method: 'POST',
      body: { emailOrUsername: 'georgelobko', password: 'password123' }
    });
    assert(userBLogin.ok && userBLogin.data?.data?.token, 'User B (George Lobko) logged in');
    const tokenB = userBLogin.data?.data?.token;
    const userB = userBLogin.data?.data?.user;

    // User C: Jane Cooper (Unauthorized 3rd party)
    const userCLogin = await request('/auth/login', {
      method: 'POST',
      body: { emailOrUsername: 'janecooper', password: 'password123' }
    });
    assert(userCLogin.ok && userCLogin.data?.data?.token, 'User C (Jane Cooper) logged in');
    const tokenC = userCLogin.data?.data?.token;
    const userC = userCLogin.data?.data?.user;

    // ------------------------------------------------------------------
    // TEST GROUP 3: VIDEO CALL SECURITY & PERMISSIONS
    // ------------------------------------------------------------------
    console.log('\n--- TEST GROUP 3: VIDEO CALL SECURITY & PERMISSION RULES ---');

    // 3.1 Unauthenticated attempt
    const unauthCall = await request('/video-calls/initiate', {
      method: 'POST',
      body: { receiverId: userB._id || userB.id }
    });
    assert(unauthCall.status === 401, 'Unauthenticated user rejected with 401 Unauthorized');

    // 3.2 Self-call attempt
    const selfCall = await request('/video-calls/initiate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: { receiverId: userA._id || userA.id }
    });
    assert(selfCall.status === 400, 'Self-call prevented with 400 Bad Request');

    // ------------------------------------------------------------------
    // TEST GROUP 4: CALL INITIATION & AGORA TOKEN GENERATION
    // ------------------------------------------------------------------
    console.log('\n--- TEST GROUP 4: CALL INITIATION & AGORA TOKEN GENERATION ---');

    const initiateRes = await request('/video-calls/initiate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: { receiverId: userB._id || userB.id }
    });

    assert(
      initiateRes.status === 201 && initiateRes.data?.data?.callSession,
      'User A initiated call to User B (HTTP 201 Created)'
    );

    const session = initiateRes.data?.data?.callSession;
    const callerAgora = initiateRes.data?.data?.agora;

    assert(session.status === 'ringing', 'CallSession created with status === "ringing"');
    assert(
      typeof callerAgora.token === 'string' && callerAgora.token.length > 20,
      'Temporary Agora RTC token generated for Caller'
    );
    assert(
      !('AGORA_APP_CERTIFICATE' in callerAgora) && !('certificate' in callerAgora),
      'AGORA_APP_CERTIFICATE is strictly NEVER exposed to client'
    );
    assert(
      callerAgora.channelName === session.channelName,
      'Agora channelName matches CallSession channelName'
    );

    // ------------------------------------------------------------------
    // TEST GROUP 5: BUSY STATE HANDLING
    // ------------------------------------------------------------------
    console.log('\n--- TEST GROUP 5: BUSY STATE (PARALLEL CALL PREVENTION) ---');

    // Another caller (User C) tries to call User B while User B is ringing
    const busyCallAttempt = await request('/video-calls/initiate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenC}` },
      body: { receiverId: userB._id || userB.id }
    });

    assert(
      busyCallAttempt.status === 486,
      'Simultaneous call to busy user returns 486 Busy Here'
    );
    assert(
      busyCallAttempt.data?.message?.includes('another call'),
      'Busy error provides descriptive message: User is currently on another call'
    );

    // ------------------------------------------------------------------
    // TEST GROUP 6: STRICT TOKEN AUTHORIZATION
    // ------------------------------------------------------------------
    console.log('\n--- TEST GROUP 6: STRICT AGORA TOKEN AUTHORIZATION ---');

    const sessionId = session._id || session.id;

    // User C tries to fetch token for Devon & George's session
    const unauthorizedTokenRes = await request(`/video-calls/token/${sessionId}`, {
      headers: { Authorization: `Bearer ${tokenC}` }
    });

    assert(
      unauthorizedTokenRes.status === 403,
      'Non-participant rejected with 403 Forbidden on token request'
    );

    // User B (receiver) fetches their Agora token
    const receiverTokenRes = await request(`/video-calls/token/${sessionId}`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });

    assert(
      receiverTokenRes.ok && receiverTokenRes.data?.data?.token,
      'Authorized participant (User B) successfully retrieves their Agora token'
    );

    // ------------------------------------------------------------------
    // TEST GROUP 7: CALL ACCEPTANCE & ACTIVE STATE
    // ------------------------------------------------------------------
    console.log('\n--- TEST GROUP 7: CALL ACCEPTANCE & ACTIVE STATE ---');

    const acceptRes = await request('/video-calls/accept', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: { callSessionId: sessionId }
    });

    assert(acceptRes.ok, 'User B accepted the video call');
    assert(
      acceptRes.data?.data?.callSession?.status === 'active',
      'CallSession transitioned to status === "active"'
    );
    assert(
      acceptRes.data?.data?.callSession?.answeredAt !== null,
      'CallSession answeredAt timestamp recorded'
    );

    // ------------------------------------------------------------------
    // TEST GROUP 8: CALL TERMINATION (END CALL)
    // ------------------------------------------------------------------
    console.log('\n--- TEST GROUP 8: CALL TERMINATION ---');

    // Wait 1 second to allow duration calculation
    await new Promise((r) => setTimeout(r, 1100));

    const endRes = await request('/video-calls/end', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: { callSessionId: sessionId }
    });

    assert(endRes.ok, 'Call terminated successfully');
    assert(
      endRes.data?.data?.callSession?.status === 'ended',
      'CallSession marked as status === "ended"'
    );
    assert(
      endRes.data?.data?.callSession?.duration >= 1,
      `Call duration properly calculated (${endRes.data?.data?.callSession?.duration}s)`
    );

    // ------------------------------------------------------------------
    // TEST GROUP 9: MISSED CALL FLOW & PERSISTENT NOTIFICATIONS
    // ------------------------------------------------------------------
    console.log('\n--- TEST GROUP 9: MISSED CALL FLOW & NOTIFICATIONS ---');

    // Initiate fresh call
    const call2Res = await request('/video-calls/initiate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: { receiverId: userB._id || userB.id }
    });
    const session2 = call2Res.data?.data?.callSession;
    const session2Id = session2?._id || session2?.id;
    assert(session2 && session2.status === 'ringing', 'Fresh call session created for missed call test');

    // Mark as missed (timeout scenario)
    const missedRes = await request('/video-calls/missed', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: { callSessionId: session2Id }
    });

    assert(missedRes.ok, 'Missed call endpoint completed');
    assert(
      missedRes.data?.data?.callSession?.status === 'missed',
      'CallSession marked as status === "missed"'
    );

    // Verify Notification exists for User B with type MISSED_VIDEO_CALL
    const notifsRes = await request('/notifications', {
      headers: { Authorization: `Bearer ${tokenB}` }
    });

    const hasMissedCallNotif = notifsRes.data?.data?.notifications?.some(
      (n) => n.type === 'MISSED_VIDEO_CALL'
    );
    assert(hasMissedCallNotif, 'Persistent MISSED_VIDEO_CALL notification stored in MongoDB');

    // ------------------------------------------------------------------
    // TEST GROUP 10: CALL REJECTION FLOW
    // ------------------------------------------------------------------
    console.log('\n--- TEST GROUP 10: CALL REJECTION FLOW ---');

    const call3Res = await request('/video-calls/initiate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: { receiverId: userB._id || userB.id }
    });
    const session3 = call3Res.data?.data?.callSession;
    const session3Id = session3?._id || session3?.id;

    const rejectRes = await request('/video-calls/reject', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: { callSessionId: session3Id, reason: 'Busy in meeting' }
    });

    assert(rejectRes.ok, 'User B rejected the call');
    assert(
      rejectRes.data?.data?.callSession?.status === 'rejected',
      'CallSession status === "rejected"'
    );

    // ------------------------------------------------------------------
    // TEST GROUP 11: CALL HISTORY ENDPOINT
    // ------------------------------------------------------------------
    console.log('\n--- TEST GROUP 11: CALL HISTORY ENDPOINT ---');

    const historyRes = await request('/video-calls/history', {
      headers: { Authorization: `Bearer ${tokenA}` }
    });

    assert(historyRes.ok, 'User A retrieves call history');
    assert(
      Array.isArray(historyRes.data?.data?.sessions) && historyRes.data?.data?.sessions.length >= 3,
      `Call history contains real past sessions (count: ${historyRes.data?.data?.sessions?.length})`
    );

    // ------------------------------------------------------------------
    // FINAL RESULTS SUMMARY
    // ------------------------------------------------------------------
    console.log('\n====================================================');
    console.log(`TOTAL TESTS: ${passed + failed}`);
    console.log(`PASSED: ${passed}`);
    console.log(`FAILED: ${failed}`);
    console.log('====================================================\n');

    if (failed === 0) {
      console.log('>>> ALL PHASE 5 BACKEND TESTS PASSED SUCCESSFULLY! <<<');
      process.exit(0);
    } else {
      console.error('>>> SOME PHASE 5 TESTS FAILED! <<<');
      process.exit(1);
    }
  } catch (error) {
    console.error('Unexpected error in test suite:', error);
    process.exit(1);
  }
}

runPhase5Tests();
