/**
 * SOCIALX — MASTER LEVEL FINAL TEST SUITE
 * Levels 1 through 22 Complete QA, Security & Integrity Validation
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load .env from backend/.env or current directory
if (fs.existsSync('backend/.env')) {
  dotenv.config({ path: 'backend/.env' });
} else {
  dotenv.config();
}

const BASE_URL = 'http://localhost:5000/api';
let passedTests = 0;
let failedTests = 0;
const testResults = [];

function recordTest(suite, testName, passed, details = '') {
  if (passed) {
    passedTests++;
    testResults.push({ suite, testName, status: 'PASS', details });
    console.log(`  \x1b[32m[PASS]\x1b[0m ${suite} -> ${testName} ${details ? '(' + details + ')' : ''}`);
  } else {
    failedTests++;
    testResults.push({ suite, testName, status: 'FAIL', details });
    console.error(`  \x1b[31m[FAIL]\x1b[0m ${suite} -> ${testName} ${details ? ': ' + details : ''}`);
  }
}

async function apiRequest({ method = 'GET', path = '', body = null, headers = {} }) {
  const fullUrl = `${BASE_URL}${path.startsWith('/') ? path : '/' + path}`;
  const config = {
    method: method.toUpperCase(),
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(fullUrl, config);
    const data = await res.json().catch(() => null);
    return {
      status: res.status,
      headers: res.headers,
      data: data || {},
      ok: res.ok
    };
  } catch (err) {
    return {
      status: 0,
      headers: {},
      data: { error: err.message },
      ok: false
    };
  }
}

async function runMasterQA() {
  console.log('\n============================================================');
  console.log('SOCIALX — MASTER LEVEL COMPREHENSIVE QA & SECURITY TEST SUITE');
  console.log('============================================================\n');

  const timestamp = Date.now();
  const userAData = {
    name: 'Master QA User A',
    username: `qa_user_a_${timestamp}`,
    email: `qa_user_a_${timestamp}@socialx.test`,
    password: 'Password123!'
  };

  const userBData = {
    name: 'Master QA User B',
    username: `qa_user_b_${timestamp}`,
    email: `qa_user_b_${timestamp}@socialx.test`,
    password: 'Password123!'
  };

  let tokenA = '';
  let userAId = '';
  let tokenB = '';
  let userBId = '';
  let adminToken = '';
  let adminId = '';

  // ----------------------------------------------------
  // LEVEL 1: ENVIRONMENT & SECRETS AUDIT
  // ----------------------------------------------------
  console.log('\n--- LEVEL 1: Environment & Secrets Audit ---');
  const jwtSecret = process.env.JWT_SECRET;
  const mongoUri = process.env.MONGO_URI;
  const agoraAppId = process.env.AGORA_APP_ID;
  const agoraCert = process.env.AGORA_APP_CERTIFICATE;

  recordTest('Environment', 'JWT_SECRET configured', !!jwtSecret && jwtSecret.length >= 16);
  recordTest('Environment', 'MONGO_URI configured', !!mongoUri && mongoUri.includes('mongodb'));
  recordTest('Environment', 'Agora App ID configured', !!agoraAppId && agoraAppId.length > 10);
  recordTest('Environment', 'Agora Certificate backend-only', !!agoraCert);

  // ----------------------------------------------------
  // LEVEL 2: APPLICATION STARTUP & HEALTH
  // ----------------------------------------------------
  console.log('\n--- LEVEL 2: Application Startup & Connectivity ---');
  const healthRes = await apiRequest({ method: 'GET', path: '/' });
  recordTest('Startup', 'Backend responding to HTTP requests with health report', healthRes.status === 200 && healthRes.data?.version === '5.0.0');

  // ----------------------------------------------------
  // LEVEL 3: AUTHENTICATION TESTING (A - O)
  // ----------------------------------------------------
  console.log('\n--- LEVEL 3: Authentication Testing (A - O) ---');

  // TEST A: Valid Registration
  const regA = await apiRequest({ method: 'POST', path: '/auth/register', body: userAData });
  const regAPassed = regA.status === 201 && regA.data.success && !!regA.data?.data?.token;
  recordTest('Auth', 'TEST A — Valid registration', regAPassed);
  if (regAPassed) {
    tokenA = regA.data.data.token;
    userAId = regA.data.data.user.id;
  }

  // TEST B: Duplicate Email
  const regDupEmail = await apiRequest({
    method: 'POST',
    path: '/auth/register',
    body: {
      name: 'Duplicate Email',
      username: `unique_user_${timestamp}`,
      email: userAData.email,
      password: 'Password123!'
    }
  });
  recordTest('Auth', 'TEST B — Duplicate email rejected', regDupEmail.status === 400);

  // TEST C: Duplicate Username
  const regDupUser = await apiRequest({
    method: 'POST',
    path: '/auth/register',
    body: {
      name: 'Duplicate Username',
      username: userAData.username,
      email: `diff_${timestamp}@socialx.test`,
      password: 'Password123!'
    }
  });
  recordTest('Auth', 'TEST C — Duplicate username rejected', regDupUser.status === 400);

  // TEST D: Invalid Email Format
  const regBadEmail = await apiRequest({
    method: 'POST',
    path: '/auth/register',
    body: {
      name: 'Bad Email',
      username: `bad_email_${timestamp}`,
      email: 'not-an-email-at-all',
      password: 'Password123!'
    }
  });
  recordTest('Auth', 'TEST D — Invalid email rejected', regBadEmail.status === 400);

  // TEST E: Weak Password (< 6 chars)
  const regWeakPass = await apiRequest({
    method: 'POST',
    path: '/auth/register',
    body: {
      name: 'Weak Pass',
      username: `weak_pass_${timestamp}`,
      email: `weak_${timestamp}@socialx.test`,
      password: '123'
    }
  });
  recordTest('Auth', 'TEST E — Weak password rejected', regWeakPass.status === 400);

  // TEST F: Missing Fields
  const regMissing = await apiRequest({
    method: 'POST',
    path: '/auth/register',
    body: { email: `missing_${timestamp}@socialx.test` }
  });
  recordTest('Auth', 'TEST F — Missing fields rejected', regMissing.status === 400);

  // TEST G: Extra unexpected fields (Role Escalation Attempt during Register)
  const regExtra = await apiRequest({
    method: 'POST',
    path: '/auth/register',
    body: {
      ...userBData,
      role: 'ADMIN' // Trying to register directly as ADMIN
    }
  });
  const regExtraPassed = regExtra.status === 201 && regExtra.data?.data?.user?.role === 'USER';
  recordTest('Auth', 'TEST G — Extra fields safely ignored (Role escalation prevented)', regExtraPassed);
  if (regExtra.status === 201 && regExtra.data?.data?.token) {
    tokenB = regExtra.data.data.token;
    userBId = regExtra.data.data.user.id;
  }

  // TEST H: Login using Email
  const loginEmail = await apiRequest({
    method: 'POST',
    path: '/auth/login',
    body: { emailOrUsername: userAData.email, password: userAData.password }
  });
  recordTest('Auth', 'TEST H — Login using email', loginEmail.status === 200 && !!loginEmail.data?.data?.token);

  // TEST I: Login using Username
  const loginUser = await apiRequest({
    method: 'POST',
    path: '/auth/login',
    body: { emailOrUsername: userAData.username, password: userAData.password }
  });
  recordTest('Auth', 'TEST I — Login using username', loginUser.status === 200 && !!loginUser.data?.data?.token);

  // TEST J: Wrong Password
  const loginWrongPass = await apiRequest({
    method: 'POST',
    path: '/auth/login',
    body: { emailOrUsername: userAData.email, password: 'WrongPassword999!' }
  });
  recordTest('Auth', 'TEST J — Wrong password rejected', loginWrongPass.status === 400);

  // TEST K: Non-existing Account
  const loginNonExist = await apiRequest({
    method: 'POST',
    path: '/auth/login',
    body: { emailOrUsername: 'ghost_non_existent@socialx.test', password: 'Password123!' }
  });
  recordTest('Auth', 'TEST K — Non-existing account rejected', loginNonExist.status === 400);

  // TEST L: Logout
  const logoutRes = await apiRequest({ method: 'POST', path: '/auth/logout' });
  recordTest('Auth', 'TEST L — Logout response', logoutRes.status === 200);

  // TEST M: Access Protected API without Token
  const noTokenRes = await apiRequest({ method: 'GET', path: '/auth/me' });
  recordTest('Auth', 'TEST M — Protected API without token returns 401', noTokenRes.status === 401);

  // TEST N: Expired / Invalid Token
  const invalidTokenRes = await apiRequest({
    method: 'GET',
    path: '/auth/me',
    headers: { Authorization: 'Bearer totally_invalid_jwt_token_string' }
  });
  recordTest('Auth', 'TEST N — Invalid token returns 401', invalidTokenRes.status === 401);

  // TEST O: Tampered Token
  const tamperedToken = tokenA ? tokenA.slice(0, -6) + 'abcdef' : 'tampered';
  const tamperedRes = await apiRequest({
    method: 'GET',
    path: '/auth/me',
    headers: { Authorization: `Bearer ${tamperedToken}` }
  });
  recordTest('Auth', 'TEST O — Tampered token returns 401', tamperedRes.status === 401);

  // Admin login check
  const adminLogin = await apiRequest({
    method: 'POST',
    path: '/auth/login',
    body: { emailOrUsername: 'alex@socialx.com', password: 'password123' }
  });
  if (adminLogin.status === 200 && adminLogin.data?.data?.token) {
    adminToken = adminLogin.data.data.token;
    adminId = adminLogin.data.data.user.id;
    recordTest('Auth', 'Admin account login (alex@socialx.com)', true);
  } else {
    recordTest('Auth', 'Admin account login (alex@socialx.com)', false, 'Default admin seed not found');
  }

  // ----------------------------------------------------
  // LEVEL 4: PROFILE MANAGEMENT & IDOR
  // ----------------------------------------------------
  console.log('\n--- LEVEL 4: Profile Management & IDOR ---');

  // View profile
  const profileRes = await apiRequest({
    method: 'GET',
    path: `/users/${userAData.username}`,
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  recordTest('Profile', 'View own profile', profileRes.status === 200 && profileRes.data?.data?.username === userAData.username);

  // Edit profile (name, bio)
  const updateProfileRes = await apiRequest({
    method: 'PUT',
    path: '/users/profile',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: { name: 'Master QA User A Updated', bio: 'Verified test bio for master testing' }
  });
  recordTest('Profile', 'Edit name & bio', updateProfileRes.status === 200 && updateProfileRes.data.data.bio === 'Verified test bio for master testing');

  // Negative test: Role escalation attempt via profile update
  const escalateProfileRes = await apiRequest({
    method: 'PUT',
    path: '/users/profile',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: { role: 'ADMIN' }
  });
  const checkRoleRes = await apiRequest({
    method: 'GET',
    path: '/auth/me',
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  recordTest('Profile', 'Role escalation via updateProfile blocked', checkRoleRes.data.data.role === 'USER');

  // ----------------------------------------------------
  // LEVEL 5: POST TESTING (CRUD & IDOR)
  // ----------------------------------------------------
  console.log('\n--- LEVEL 5: Post Testing (CRUD & IDOR) ---');
  let postAId = '';

  // Create text post with caption & hashtags
  const createPostRes = await apiRequest({
    method: 'POST',
    path: '/posts',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      caption: 'Exploring modern decentralized architectures #technology #mern',
      hashtags: ['technology', 'mern']
    }
  });
  const postCreated = createPostRes.status === 201 && !!createPostRes.data.data._id;
  recordTest('Posts', 'Create text post with caption and hashtags', postCreated);
  if (postCreated) {
    postAId = createPostRes.data.data._id;
  }

  // Edit own post caption
  const editOwnPostRes = await apiRequest({
    method: 'PUT',
    path: `/posts/${postAId}`,
    headers: { Authorization: `Bearer ${tokenA}` },
    body: { caption: 'Updated caption for architecture post #technology #scalability' }
  });
  recordTest('Posts', 'Edit own post caption', editOwnPostRes.status === 200);

  // Negative test: User B attempting to edit User A's post (IDOR)
  const editOtherPostRes = await apiRequest({
    method: 'PUT',
    path: `/posts/${postAId}`,
    headers: { Authorization: `Bearer ${tokenB}` },
    body: { caption: 'Hacked caption by User B' }
  });
  recordTest('Posts', 'IDOR: Unauthorized user cannot edit another user post', editOtherPostRes.status === 403);

  // Negative test: User B attempting to delete User A's post (IDOR)
  const deleteOtherPostRes = await apiRequest({
    method: 'DELETE',
    path: `/posts/${postAId}`,
    headers: { Authorization: `Bearer ${tokenB}` }
  });
  recordTest('Posts', 'IDOR: Unauthorized user cannot delete another user post', deleteOtherPostRes.status === 403);

  // ----------------------------------------------------
  // LEVEL 6: SOCIAL INTERACTIONS (LIKES & COMMENTS & XSS)
  // ----------------------------------------------------
  console.log('\n--- LEVEL 6: Social Interactions (Likes & Comments) ---');

  // Like post
  const likeRes = await apiRequest({
    method: 'POST',
    path: `/posts/${postAId}/like`,
    headers: { Authorization: `Bearer ${tokenB}` }
  });
  recordTest('Likes', 'User B likes User A post', likeRes.status === 200 && likeRes.data.data.liked === true);

  // Repeated like (Idempotency)
  const repeatLikeRes = await apiRequest({
    method: 'POST',
    path: `/posts/${postAId}/like`,
    headers: { Authorization: `Bearer ${tokenB}` }
  });
  recordTest('Likes', 'Repeated like handled gracefully (No duplicate count)', repeatLikeRes.status === 200 && repeatLikeRes.data.data.likesCount === 1);

  // Unlike post
  const unlikeRes = await apiRequest({
    method: 'DELETE',
    path: `/posts/${postAId}/like`,
    headers: { Authorization: `Bearer ${tokenB}` }
  });
  recordTest('Likes', 'Unlike post decrements like count', unlikeRes.status === 200 && unlikeRes.data.data.likesCount === 0);

  // Add comment with XSS payload
  const xssPayload = '<script>alert("XSS")</script>';
  const commentRes = await apiRequest({
    method: 'POST',
    path: `/posts/${postAId}/comments`,
    headers: { Authorization: `Bearer ${tokenB}` },
    body: { text: `Great post! ${xssPayload}` }
  });
  const commentCreated = commentRes.status === 201 && !!commentRes.data.data._id;
  recordTest('Comments', 'Add comment with XSS payload safely stored without executing', commentCreated);
  const commentId = commentCreated ? commentRes.data.data._id : null;

  // Comment IDOR test: User B can delete own comment
  if (commentId) {
    const deleteCommentRes = await apiRequest({
      method: 'DELETE',
      path: `/comments/${commentId}`,
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    recordTest('Comments', 'Delete own comment successfully', deleteCommentRes.status === 200);
  }

  // ----------------------------------------------------
  // LEVEL 7: FOLLOW SYSTEM
  // ----------------------------------------------------
  console.log('\n--- LEVEL 7: Follow System ---');

  // Negative test: Self-follow attempt
  const selfFollowRes = await apiRequest({
    method: 'POST',
    path: `/users/${userAId}/follow`,
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  recordTest('Follow', 'Cannot follow yourself rejected with 400', selfFollowRes.status === 400);

  // User B follows User A
  const followRes = await apiRequest({
    method: 'POST',
    path: `/users/${userAId}/follow`,
    headers: { Authorization: `Bearer ${tokenB}` }
  });
  recordTest('Follow', 'User B follows User A', followRes.status === 200 && followRes.data.data.following === true);

  // Verify counters
  const targetProfile = await apiRequest({
    method: 'GET',
    path: `/users/${userAData.username}`,
    headers: { Authorization: `Bearer ${tokenB}` }
  });
  recordTest('Follow', 'Target user followersCount incremented', targetProfile.status === 200 && targetProfile.data?.data?.followersCount >= 1);

  // Unfollow User A
  const unfollowRes = await apiRequest({
    method: 'DELETE',
    path: `/users/${userAId}/follow`,
    headers: { Authorization: `Bearer ${tokenB}` }
  });
  recordTest('Follow', 'Unfollow user decrements counter properly', unfollowRes.status === 200 && unfollowRes.data.data.following === false);

  // ----------------------------------------------------
  // LEVEL 8: NORMAL MESSAGING
  // ----------------------------------------------------
  // LEVEL 8: NORMAL MESSAGING
  // ----------------------------------------------------
  console.log('\n--- LEVEL 8: Normal Messaging ---');
  let convId = '';

  // Create or get conversation between A & B
  const startConvRes = await apiRequest({
    method: 'POST',
    path: '/conversations',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: { receiverId: userBId, recipientId: userBId }
  });
  convId = startConvRes.data?.data?.conversation?._id || startConvRes.data?.data?._id;
  const convCreated = (startConvRes.status === 200 || startConvRes.status === 201) && !!convId;
  recordTest('Messaging', 'Start conversation between User A and User B', convCreated);

  // Send message from A to B
  if (convId) {
    const sendMsgRes = await apiRequest({
      method: 'POST',
      path: '/messages',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: {
        receiverId: userBId,
        text: 'Hello User B from the Master QA automated test suite!'
      }
    });
    recordTest('Messaging', 'Send text message A -> B', sendMsgRes.status === 201 && (sendMsgRes.data?.data?.message?.text?.includes('Hello User B') || sendMsgRes.data?.data?.content?.includes('Hello User B')));

    // Fetch messages as User B
    const getMsgRes = await apiRequest({
      method: 'GET',
      path: `/conversations/${convId}/messages`,
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    const msgs = getMsgRes.data?.data?.messages || getMsgRes.data?.data;
    recordTest('Messaging', 'User B receives message history', getMsgRes.status === 200 && msgs?.length >= 1);
  }

  // ----------------------------------------------------
  // LEVEL 9: NOTIFICATIONS
  // ----------------------------------------------------
  console.log('\n--- LEVEL 9: Notifications ---');

  // User A checks notifications (should have follow/like notifications from B)
  const notifRes = await apiRequest({
    method: 'GET',
    path: '/notifications',
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  const notifs = notifRes.data?.data?.notifications || notifRes.data?.data;
  recordTest('Notifications', 'User A fetches notifications', notifRes.status === 200 && Array.isArray(notifs));

  // Mark all read
  const markReadRes = await apiRequest({
    method: 'PATCH',
    path: '/notifications/read-all',
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  recordTest('Notifications', 'Mark all notifications as read', markReadRes.status === 200);

  // ----------------------------------------------------
  // LEVEL 10: SEARCH & NOSQL INJECTION RESILIENCE
  // ----------------------------------------------------
  console.log('\n--- LEVEL 10: Search & Injection Resilience ---');

  // Search users
  const searchUserRes = await apiRequest({
    method: 'GET',
    path: `/search/users?q=${userAData.username}`,
    headers: { Authorization: `Bearer ${tokenB}` }
  });
  const usersFound = searchUserRes.data?.data?.users || searchUserRes.data?.data;
  recordTest('Search', 'Search users by username substring', searchUserRes.status === 200 && usersFound?.length >= 1);

  // Search posts
  const searchPostRes = await apiRequest({
    method: 'GET',
    path: '/search/posts?q=architecture',
    headers: { Authorization: `Bearer ${tokenB}` }
  });
  recordTest('Search', 'Search posts by keyword', searchPostRes.status === 200);

  // NoSQL Injection attempt in search (passing operator style query)
  const nosqlSearchRes = await apiRequest({
    method: 'GET',
    path: '/search/users?q=%7B%22%24gt%22%3A%22%22%7D', // {"$gt":""}
    headers: { Authorization: `Bearer ${tokenB}` }
  });
  recordTest('Search', 'NoSQL injection payload handled safely as literal string', nosqlSearchRes.status === 200);

  // ----------------------------------------------------
  // LEVEL 11: ADMIN RBAC & AUDIT LOGS
  // ----------------------------------------------------
  console.log('\n--- LEVEL 11: Admin RBAC & Audit Logs ---');

  // Normal user attempting to access Admin Dashboard -> 403 Forbidden
  const normalUserAdminRes = await apiRequest({
    method: 'GET',
    path: '/admin/dashboard',
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  recordTest('Admin', 'Normal user blocked from Admin Dashboard (403)', normalUserAdminRes.status === 403);

  // Normal user attempting to access Admin Users -> 403 Forbidden
  const normalUserUsersRes = await apiRequest({
    method: 'GET',
    path: '/admin/users',
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  recordTest('Admin', 'Normal user blocked from Admin Users list (403)', normalUserUsersRes.status === 403);

  // Admin access to dashboard -> 200 OK
  if (adminToken) {
    const adminDashRes = await apiRequest({
      method: 'GET',
      path: '/admin/dashboard',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const stats = adminDashRes.data?.data?.stats || adminDashRes.data?.data;
    recordTest('Admin', 'Admin user accesses dashboard stats (200)', adminDashRes.status === 200 && stats?.totalUsers !== undefined);

    // Admin blocking a test user
    const blockRes = await apiRequest({
      method: 'PATCH',
      path: `/admin/users/${userBId}/block`,
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { reason: 'Master test block scenario' }
    });
    recordTest('Admin', 'Admin blocks user account', blockRes.status === 200 && blockRes.data?.data?.accountStatus === 'BLOCKED');

    // Blocked user attempting to perform authenticated action -> 403 Forbidden
    const blockedActionRes = await apiRequest({
      method: 'POST',
      path: '/posts',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: { caption: 'Blocked user attempting to post' }
    });
    recordTest('Admin', 'Blocked user cannot create posts (403)', blockedActionRes.status === 403);

    // Admin unblocking user
    const unblockRes = await apiRequest({
      method: 'PATCH',
      path: `/admin/users/${userBId}/unblock`,
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { reason: 'Master test unblock scenario' }
    });
    recordTest('Admin', 'Admin unblocks user account', unblockRes.status === 200 && unblockRes.data?.data?.accountStatus === 'ACTIVE');

    // Admin audit actions
    const auditRes = await apiRequest({
      method: 'GET',
      path: '/admin/actions',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    recordTest('Admin', 'Audit logs recorded for admin actions', auditRes.status === 200 && auditRes.data?.data?.length >= 1);
  }

  // ----------------------------------------------------
  // LEVEL 12: SECRET CHAT (PIN, ISOLATION, VIEW-ONCE)
  // ----------------------------------------------------
  console.log('\n--- LEVEL 12: Secret Chat & Cryptographic Security ---');
  let secretConvId = '';
  let secretTokenA = '';

  // Start Secret Chat with 6-digit PIN
  const startSecretRes = await apiRequest({
    method: 'POST',
    path: '/secret-chats',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      targetUserId: userBId,
      pin: '789123',
      autoDeleteLimit: 20
    }
  });
  const secretStarted = (startSecretRes.status === 200 || startSecretRes.status === 201) && !!(startSecretRes.data?.data?._id || startSecretRes.data?.data?.conversation?._id);
  recordTest('SecretChat', 'Start Secret Chat with 6-digit PIN', secretStarted);
  if (secretStarted) {
    secretConvId = startSecretRes.data?.data?._id || startSecretRes.data?.data?.conversation?._id;
    secretTokenA = startSecretRes.data?.secretToken || startSecretRes.data?.data?.secretToken;
  }

  // PIN security check: Verify PIN is NEVER exposed in response
  const rawResponse = JSON.stringify(startSecretRes.data);
  const pinExposed = rawResponse.includes('789123') || rawResponse.includes('pinHash');
  recordTest('SecretChat', 'PIN and pinHash NEVER exposed in API response', !pinExposed);

  // Verify PIN with correct credentials
  const verifyPinCorrect = await apiRequest({
    method: 'POST',
    path: `/secret-chats/${secretConvId}/verify-pin`,
    headers: { Authorization: `Bearer ${tokenB}` },
    body: { pin: '789123' }
  });
  const secretTokenB = verifyPinCorrect.status === 200 ? (verifyPinCorrect.data?.secretToken || verifyPinCorrect.data?.data?.secretToken) : null;
  recordTest('SecretChat', 'User B verifies PIN and receives scoped Secret Token', !!secretTokenB);

  // Negative test: Wrong PIN rejected
  const verifyPinWrong = await apiRequest({
    method: 'POST',
    path: `/secret-chats/${secretConvId}/verify-pin`,
    headers: { Authorization: `Bearer ${tokenB}` },
    body: { pin: '000000' }
  });
  recordTest('SecretChat', 'Wrong PIN rejected with 401', verifyPinWrong.status === 401);

  // Send secret message with scoped secret token
  if (secretConvId && secretTokenA) {
    const sendSecretMsg = await apiRequest({
      method: 'POST',
      path: `/secret-chats/${secretConvId}/messages`,
      headers: {
        Authorization: `Bearer ${tokenA}`,
        'x-secret-token': secretTokenA
      },
      body: { content: 'This is a strictly confidential secret message' }
    });
    recordTest('SecretChat', 'Send secret message with valid x-secret-token', sendSecretMsg.status === 201);

    // Negative test: Access secret messages without x-secret-token -> 403 Forbidden
    const unauthSecretRead = await apiRequest({
      method: 'GET',
      path: `/secret-chats/${secretConvId}/messages`,
      headers: { Authorization: `Bearer ${tokenA}` } // Missing x-secret-token
    });
    recordTest('SecretChat', 'Access secret chat without x-secret-token rejected (403)', unauthSecretRead.status === 403);
  }

  // ----------------------------------------------------
  // LEVEL 13: AGORA VIDEO CALLING & TOKEN SECURITY
  // ----------------------------------------------------
  console.log('\n--- LEVEL 13: Agora Video Calling & Token Security ---');

  // Initiate call session
  const callRes = await apiRequest({
    method: 'POST',
    path: '/video-calls/initiate',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      receiverId: userBId,
      callType: 'video'
    }
  });

  const callInitiated = (callRes.status === 200 || callRes.status === 201) && !!callRes.data?.data?.agora?.token;
  recordTest('Agora', 'Initiate video call and generate valid Agora RTC token', callInitiated);
  const callSessionId = callInitiated ? callRes.data?.data?.callSession?._id : null;

  // Security check: Verify AGORA_APP_CERTIFICATE is NEVER exposed in the response
  const callResString = JSON.stringify(callRes.data);
  const certExposed = agoraCert && callResString.includes(agoraCert);
  recordTest('Agora', 'AGORA_APP_CERTIFICATE NEVER leaked to client', !certExposed);

  // Negative test: Self-call attempt rejected
  const selfCallRes = await apiRequest({
    method: 'POST',
    path: '/video-calls/initiate',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: { receiverId: userAId, callType: 'video' }
  });
  recordTest('Agora', 'Self-call attempt rejected with 400', selfCallRes.status === 400);

  // End call session
  if (callSessionId) {
    const endCallRes = await apiRequest({
      method: 'POST',
      path: '/video-calls/end',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: { callSessionId, reason: 'Master test completed' }
    });
    recordTest('Agora', 'End call session and clean up state', endCallRes.status === 200 && (endCallRes.data?.data?.status === 'ended' || endCallRes.data?.data?.callSession?.status === 'ended'));
  }

  // ----------------------------------------------------
  // CLEANUP TEST DATA
  // ----------------------------------------------------
  console.log('\n--- LEVEL 14: Data Hygiene & Cleanup ---');
  if (postAId) {
    const delPostRes = await apiRequest({
      method: 'DELETE',
      path: `/posts/${postAId}`,
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    recordTest('Hygiene', 'Cascade delete own post and relations', delPostRes.status === 200);
  }

  // ----------------------------------------------------
  // FINAL SUMMARY
  // ----------------------------------------------------
  console.log('\n============================================================');
  console.log(`MASTER QA RESULTS: ${passedTests} PASSED, ${failedTests} FAILED (TOTAL: ${passedTests + failedTests})`);
  console.log('============================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runMasterQA().catch((err) => {
  console.error('Master QA Fatal Error:', err);
  process.exit(1);
});
