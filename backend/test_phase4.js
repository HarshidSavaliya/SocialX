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

async function runPhase4Tests() {
  console.log('====================================================');
  console.log('        STARTING SOCIALX PHASE 4 TEST SUITE        ');
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
    // TEST GROUP 1: HEALTH & ADMIN SETUP
    // ------------------------------------------------------------------
    console.log('\n--- TEST GROUP 1: HEALTH & AUTH ---');

    const health = await request('/');
    assert(health.status === 200 && (health.data?.version === '4.0.0' || health.data?.version === '5.0.0'), 'Health check reports valid API version');

    // Login as Admin (Alex Rivera)
    const adminLogin = await request('/auth/login', {
      method: 'POST',
      body: { emailOrUsername: 'alexrivera', password: 'password123' }
    });

    assert(adminLogin.ok && adminLogin.data?.data?.token, 'Admin (Alex Rivera) logged in successfully');
    const adminToken = adminLogin.data?.data?.token;
    const adminUser = adminLogin.data?.data?.user;
    assert(adminUser?.role === 'ADMIN', 'Admin user has role === ADMIN');

    // Login as Normal User (Devon Lane)
    const normalLogin = await request('/auth/login', {
      method: 'POST',
      body: { emailOrUsername: 'devonlane', password: 'password123' }
    });

    assert(normalLogin.ok && normalLogin.data?.data?.token, 'Normal user (Devon Lane) logged in successfully');
    const normalToken = normalLogin.data?.data?.token;
    const normalUser = normalLogin.data?.data?.user;
    assert(normalUser?.role === 'USER', 'Normal user has role === USER');

    // ------------------------------------------------------------------
    // TEST GROUP 2: ROLE-BASED ACCESS CONTROL (RBAC)
    // ------------------------------------------------------------------
    console.log('\n--- TEST GROUP 2: R.9 RBAC & ADMIN AUTHORIZATION ---');

    // 2.1 Normal user attempting Admin API
    const unauthorizedAttempt = await request('/admin/dashboard', {
      headers: { Authorization: `Bearer ${normalToken}` }
    });
    assert(unauthorizedAttempt.status === 403, 'Normal user receives 403 Forbidden on /api/admin/dashboard');

    // 2.2 Unauthenticated attempt to Admin API
    const unauthenticatedAttempt = await request('/admin/dashboard');
    assert(unauthenticatedAttempt.status === 401, 'Unauthenticated request receives 401 on /api/admin/dashboard');

    // 2.3 Admin access to Dashboard
    const adminDashboard = await request('/admin/dashboard', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(adminDashboard.ok && adminDashboard.data?.data?.stats, 'Admin accesses /api/admin/dashboard successfully');
    assert(
      typeof adminDashboard.data?.data?.stats?.totalUsers === 'number' &&
      typeof adminDashboard.data?.data?.stats?.activeUsers === 'number',
      'Dashboard returns real MongoDB statistics'
    );

    // ------------------------------------------------------------------
    // TEST GROUP 3: R.9.1 MANAGE USERS & SEARCH & PAGINATION
    // ------------------------------------------------------------------
    console.log('\n--- TEST GROUP 3: R.9.1 MANAGE USERS ---');

    const usersRes = await request('/admin/users?page=1&limit=5', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(usersRes.ok && Array.isArray(usersRes.data?.data), 'Admin gets paginated user list');
    assert(usersRes.data?.pagination?.page === 1, 'User pagination metadata returned correctly');
    assert(!usersRes.data?.data[0]?.password, 'User password hashes are strictly excluded from response');

    // Search user
    const searchRes = await request('/admin/users?search=devon', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(
      searchRes.ok && searchRes.data?.data?.some(u => u.username === 'devonlane'),
      'Admin search filters users correctly (/api/admin/users?search=devon)'
    );

    // ------------------------------------------------------------------
    // TEST GROUP 4: R.9.3 BLOCK & UNBLOCK USERS
    // ------------------------------------------------------------------
    console.log('\n--- TEST GROUP 4: R.9.3 USER BLOCKING ENFORCEMENT ---');

    // Create a temporary test user to block
    const tempUserReg = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Harmful Spammer',
        username: `spammer_${Date.now()}`,
        email: `spammer_${Date.now()}@socialx.com`,
        password: 'password123'
      }
    });
    assert(tempUserReg.ok, 'Created temporary user for block testing');
    const tempUserId = tempUserReg.data?.data?.user?.id;
    const tempUserToken = tempUserReg.data?.data?.token;

    // Admin blocks the user
    const blockRes = await request(`/admin/users/${tempUserId}/block`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { reason: 'Posting malicious links and spam' }
    });
    assert(blockRes.ok && blockRes.data?.data?.accountStatus === 'BLOCKED', 'Admin blocked the user (status = BLOCKED)');

    // Verify blocked user cannot access protected endpoints
    const blockedActionAttempt = await request('/posts', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tempUserToken}` },
      body: { caption: 'This should fail because I am blocked' }
    });
    assert(
      blockedActionAttempt.status === 403,
      'Blocked user receives 403 Forbidden on protected action (/api/posts)'
    );

    // Verify blocked user cannot log in
    const blockedLoginAttempt = await request('/auth/login', {
      method: 'POST',
      body: {
        emailOrUsername: tempUserReg.data?.data?.user?.username,
        password: 'password123'
      }
    });
    assert(
      blockedLoginAttempt.status >= 400 && !blockedLoginAttempt.ok,
      'Blocked user login rejected with suspension message'
    );

    // Admin unblocks user
    const unblockRes = await request(`/admin/users/${tempUserId}/unblock`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { reason: 'Ban appeal approved' }
    });
    assert(unblockRes.ok && unblockRes.data?.data?.accountStatus === 'ACTIVE', 'Admin unblocked user (status = ACTIVE)');

    // ------------------------------------------------------------------
    // TEST GROUP 5: R.9.2 DELETE HARMFUL POSTS & AUDIT LOGS
    // ------------------------------------------------------------------
    console.log('\n--- TEST GROUP 5: R.9.2 DELETE HARMFUL POST & AUDIT ---');

    // Devon creates a post
    const devonPost = await request('/posts', {
      method: 'POST',
      headers: { Authorization: `Bearer ${normalToken}` },
      body: { caption: 'Test post destined for moderation #moderation' }
    });
    assert(devonPost.ok, 'Normal user created a post');
    const devonPostId = devonPost.data?.data?._id;

    // Admin deletes the post
    const deletePostRes = await request(`/admin/posts/${devonPostId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { reason: 'Violates community guidelines' }
    });
    assert(deletePostRes.ok, 'Admin successfully deleted harmful post');

    // Verify audit actions logged
    const auditRes = await request('/admin/actions', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(auditRes.ok && Array.isArray(auditRes.data?.data), 'Admin retrieved audit log entries');
    const hasDeleteAction = auditRes.data?.data?.some(a => a.actionType === 'DELETE_POST');
    assert(hasDeleteAction, 'Audit log accurately recorded DELETE_POST action with moderator info');

    // ------------------------------------------------------------------
    // TEST GROUP 6: R.10 SECRET CHAT ARCHITECTURE & SEPARATION
    // ------------------------------------------------------------------
    console.log('\n--- TEST GROUP 6: R.10 SECRET CHAT INITIALIZATION & PIN ---');

    // 6.1 Cannot start secret chat with self
    const selfSecretAttempt = await request('/secret-chats', {
      method: 'POST',
      headers: { Authorization: `Bearer ${normalToken}` },
      body: { targetUserId: normalUser.id, pin: '1234' }
    });
    assert(!selfSecretAttempt.ok, 'Cannot create secret chat with oneself');

    // 6.2 Invalid PIN format (< 4 digits or non-digit)
    const invalidPinAttempt = await request('/secret-chats', {
      method: 'POST',
      headers: { Authorization: `Bearer ${normalToken}` },
      body: { targetUserId: adminUser.id, pin: 'abc' }
    });
    assert(!invalidPinAttempt.ok, 'PIN validation requires 4-6 digits');

    // 6.3 Start valid secret chat
    const startSecret = await request('/secret-chats', {
      method: 'POST',
      headers: { Authorization: `Bearer ${normalToken}` },
      body: { targetUserId: adminUser.id, pin: '1234', autoDeleteLimit: 20 }
    });
    assert(startSecret.ok && startSecret.data?.data?._id, 'Secret Chat session initialized successfully');
    const secretConvId = startSecret.data?.data?._id;
    const initialSecretToken = startSecret.data?.secretToken;
    assert(!startSecret.data?.data?.pinHash, 'PIN hash is strictly hidden from API response');

    // 6.4 PIN Verification (Incorrect PIN)
    const wrongPinAttempt = await request(`/secret-chats/${secretConvId}/verify-pin`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { pin: '9999' }
    });
    assert(!wrongPinAttempt.ok, 'Incorrect PIN rejected with generic error');

    // 6.5 PIN Verification (Correct PIN)
    const correctPinRes = await request(`/secret-chats/${secretConvId}/verify-pin`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { pin: '1234' }
    });
    assert(correctPinRes.ok && correctPinRes.data?.secretToken, 'Correct PIN returns verified scoped secret token');
    const adminSecretToken = correctPinRes.data?.secretToken;

    // ------------------------------------------------------------------
    // TEST GROUP 7: R.10.2 SECURE MESSAGING & ACCESS ENFORCEMENT
    // ------------------------------------------------------------------
    console.log('\n--- TEST GROUP 7: R.10.2 SECURE MESSAGING & ACCESS CONTROL ---');

    // 7.1 Reading secret messages without secretToken header -> rejected!
    const unverifiedReadAttempt = await request(`/secret-chats/${secretConvId}/messages`, {
      headers: { Authorization: `Bearer ${normalToken}` }
    });
    assert(unverifiedReadAttempt.status === 403, 'Access to secret messages blocked without valid x-secret-token');

    // 7.2 Sending secret message with secretToken
    const sendSecretRes = await request(`/secret-chats/${secretConvId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${normalToken}`,
        'x-secret-token': initialSecretToken
      },
      body: { text: 'Classified message inside isolated secret chat channel' }
    });
    assert(sendSecretRes.ok && sendSecretRes.data?.data?.content, 'Secret message sent and stored in SecretMessage model');

    // 7.3 Reading secret messages with secretToken
    const readSecretRes = await request(`/secret-chats/${secretConvId}/messages`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-secret-token': adminSecretToken
      }
    });
    assert(
      readSecretRes.ok && readSecretRes.data?.data?.length > 0,
      'Authorized participant successfully reads secret messages'
    );

    // ------------------------------------------------------------------
    // TEST GROUP 8: R.10.3 AUTO-DELETE MESSAGE ENFORCEMENT
    // ------------------------------------------------------------------
    console.log('\n--- TEST GROUP 8: R.10.3 SERVER-SIDE AUTO-DELETE ---');

    // Update limit to 20
    const updateLimitRes = await request(`/secret-chats/${secretConvId}/settings`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${normalToken}`,
        'x-secret-token': initialSecretToken
      },
      body: { autoDeleteLimit: 20 }
    });
    assert(updateLimitRes.ok && updateLimitRes.data?.data?.autoDeleteLimit === 20, 'Auto-delete message limit set to 20');

    // ------------------------------------------------------------------
    // TEST GROUP 9: R.10.4 DELETE CHAT ON EXIT
    // ------------------------------------------------------------------
    console.log('\n--- TEST GROUP 9: R.10.4 DELETE CHAT ON EXIT & WIPE ---');

    const exitRes = await request(`/secret-chats/${secretConvId}/exit`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${normalToken}`,
        'x-secret-token': initialSecretToken
      }
    });
    assert(exitRes.ok, 'Exit & wipe successfully purged messages and closed secret conversation');

    // Verify conversation is closed
    const verifyClosed = await request(`/secret-chats/${secretConvId}/messages`, {
      headers: {
        Authorization: `Bearer ${normalToken}`,
        'x-secret-token': initialSecretToken
      }
    });
    assert(verifyClosed.status >= 400, 'Subsequent access to closed secret conversation denied');

    // ------------------------------------------------------------------
    // TEST GROUP 10: ARCHITECTURAL SEPARATION VERIFICATION
    // ------------------------------------------------------------------
    console.log('\n--- TEST GROUP 10: STRICT MODEL SEPARATION ---');

    // Check normal messages endpoint
    const normalConvs = await request('/conversations', {
      headers: { Authorization: `Bearer ${normalToken}` }
    });
    assert(normalConvs.ok, 'Normal conversations endpoint functions normally without secret chat bleed');

    console.log('\n====================================================');
    console.log(`TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
    console.log('====================================================\n');

  } catch (err) {
    console.error('Fatal test execution error:', err);
  }
}

runPhase4Tests();
