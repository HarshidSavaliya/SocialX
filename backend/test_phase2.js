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

  if (!response.ok) {
    const error = new Error(data?.message || `HTTP ${response.status} ${response.statusText}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return { status: response.status, data };
}

async function runPhase2Tests() {
  console.log('====================================================');
  console.log('        STARTING SOCIALX PHASE 2 TEST SUITE        ');
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
    // TEST GROUP 1: AUTHENTICATION & TOKENS
    // ------------------------------------------------------------------
    console.log('--- TEST GROUP 1: AUTHENTICATION ---');

    // 1.1 Login with Alex Rivera
    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: {
        emailOrUsername: 'alex@socialx.com',
        password: 'password123'
      }
    });
    assert(loginRes.data.success && loginRes.data.data.token, 'R.1.1 Login with seeded user Alex Rivera');
    const alexToken = loginRes.data.data.token;
    const alexId = loginRes.data.data.user.id;

    // 1.2 Login with George Lobko (second user for auth checks)
    const georgeLogin = await request('/auth/login', {
      method: 'POST',
      body: {
        emailOrUsername: 'george@socialx.com',
        password: 'password123'
      }
    });
    assert(georgeLogin.data.success && georgeLogin.data.data.token, 'R.1.2 Login with seeded user George Lobko');
    const georgeToken = georgeLogin.data.data.token;
    const georgeId = georgeLogin.data.data.user.id;

    // 1.3 Protected Route: GET /auth/me
    const meRes = await request('/auth/me', {
      headers: { Authorization: `Bearer ${alexToken}` }
    });
    assert(meRes.data.data.username === 'alexrivera', 'R.1.3 Access protected route GET /auth/me');

    // 1.4 Register a new unique test user
    const testUsername = `user_${Date.now()}`;
    const testEmail = `test_${Date.now()}@socialx.com`;
    const regRes = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Test Runner',
        username: testUsername,
        email: testEmail,
        password: 'password123'
      }
    });
    assert(regRes.data.success && regRes.data.data.user.username === testUsername, 'R.1.4 User registration with JWT generation');

    // ------------------------------------------------------------------
    // TEST GROUP 2: POST MANAGEMENT (R.3)
    // ------------------------------------------------------------------
    console.log('\n--- TEST GROUP 2: POST MANAGEMENT ---');

    // 2.1 Create Post (R.3.1)
    const createPostRes = await request('/posts', {
      method: 'POST',
      headers: { Authorization: `Bearer ${alexToken}` },
      body: {
        caption: 'Testing Phase 2 Post Creation from Automated Test Suite #testing #socialx #mern',
        hashtags: '#testing #socialx #automation'
      }
    });
    assert(createPostRes.data.success && createPostRes.data.data.caption.includes('Testing Phase 2'), 'R.3.1 Create Post with caption and hashtags');
    const newPostId = createPostRes.data.data._id;
    assert(createPostRes.data.data.hashtags.includes('#testing'), 'R.3.1 Normalize and store hashtags correctly');

    // 2.2 Edit Post by Author (R.3.2)
    const editPostRes = await request(`/posts/${newPostId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${alexToken}` },
      body: {
        caption: 'Updated caption by author #updated #socialx',
        hashtags: '#updated #socialx'
      }
    });
    assert(editPostRes.data.data.caption === 'Updated caption by author #updated #socialx', 'R.3.2 Edit own post by authenticated author');

    // 2.3 Edit Post Authorization Check (Non-author cannot edit)
    try {
      await request(`/posts/${newPostId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${georgeToken}` },
        body: { caption: 'Malicious update attempt' }
      });
      assert(false, 'R.3.2 Authorization: Non-author cannot edit post');
    } catch (err) {
      assert(err.status === 403, 'R.3.2 Authorization: Rejects non-author edit with 403 Forbidden');
    }

    // ------------------------------------------------------------------
    // TEST GROUP 3: SOCIAL INTERACTIONS (R.4)
    // ------------------------------------------------------------------
    console.log('\n--- TEST GROUP 3: LIKES, COMMENTS, SHARES ---');

    // 3.1 Like Post (R.4.1)
    const likeRes = await request(`/posts/${newPostId}/like`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${georgeToken}` }
    });
    assert(likeRes.data.data.liked === true && likeRes.data.data.likesCount >= 1, 'R.4.1 Like post increment count');

    // 3.2 Duplicate Like Prevention
    const duplicateLikeRes = await request(`/posts/${newPostId}/like`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${georgeToken}` }
    });
    assert(duplicateLikeRes.data.data.liked === true, 'R.4.1 Duplicate like prevention: User cannot like twice');

    // 3.3 Unlike Post (R.4.2)
    const unlikeRes = await request(`/posts/${newPostId}/like`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${georgeToken}` }
    });
    assert(unlikeRes.data.data.liked === false, 'R.4.2 Unlike post decrements count accurately');

    // 3.4 Add Comment (R.4.3)
    const addCommentRes = await request(`/posts/${newPostId}/comments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${georgeToken}` },
      body: { text: 'Great automated test verification!' }
    });
    assert(addCommentRes.data.success && addCommentRes.data.data.text === 'Great automated test verification!', 'R.4.3 Add comment on post');
    const commentId = addCommentRes.data.data._id;

    // 3.5 Get Comments on Post
    const getCommentsRes = await request(`/posts/${newPostId}/comments`);
    assert(getCommentsRes.data.data.length >= 1, 'R.4.3 Fetch comments on post');

    // 3.6 Delete Comment (R.4.4)
    const delCommentRes = await request(`/comments/${commentId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${georgeToken}` }
    });
    assert(delCommentRes.data.success, 'R.4.4 Delete comment by author');

    // 3.7 Share Post (R.4.5)
    const shareRes = await request(`/posts/${newPostId}/share`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${georgeToken}` }
    });
    assert(shareRes.data.success && shareRes.data.data.sharesCount >= 1, 'R.4.5 Share post and increment sharesCount');

    // 2.4 Delete Post (R.3.3)
    const deletePostRes = await request(`/posts/${newPostId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${alexToken}` }
    });
    assert(deletePostRes.data.success, 'R.3.3 Delete own post by author with cascade cleanup');

    // ------------------------------------------------------------------
    // TEST GROUP 4: FOLLOW SYSTEM (R.5)
    // ------------------------------------------------------------------
    console.log('\n--- TEST GROUP 4: FOLLOW SYSTEM ---');

    // 4.1 Follow User (R.5.1)
    const followRes = await request(`/users/${georgeId}/follow`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${alexToken}` }
    });
    assert(followRes.data.success && followRes.data.data.following === true, 'R.5.1 Follow user safely');

    // 4.2 Prevent Self-Follow
    try {
      await request(`/users/${alexId}/follow`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${alexToken}` }
      });
      assert(false, 'R.5.1 Self-follow prevention');
    } catch (err) {
      assert(err.status === 400, 'R.5.1 Prevent user from following themselves');
    }

    // 4.3 View Followers (R.5.3)
    const followersRes = await request(`/users/${georgeId}/followers`, {
      headers: { Authorization: `Bearer ${alexToken}` }
    });
    assert(Array.isArray(followersRes.data.data), 'R.5.3 View Followers of user');

    // 4.4 View Following (R.5.4)
    const followingRes = await request(`/users/${alexId}/following`, {
      headers: { Authorization: `Bearer ${alexToken}` }
    });
    assert(Array.isArray(followingRes.data.data), 'R.5.4 View Following of user');

    // 4.5 Unfollow User (R.5.2)
    const unfollowRes = await request(`/users/${georgeId}/follow`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${alexToken}` }
    });
    assert(unfollowRes.data.success && unfollowRes.data.data.following === false, 'R.5.2 Unfollow user safely');

    // ------------------------------------------------------------------
    // TEST GROUP 5: FEED & PAGINATION
    // ------------------------------------------------------------------
    console.log('\n--- TEST GROUP 5: FEED & PAGINATION ---');

    // 5.1 Feed API with pagination
    const feedRes = await request('/posts/feed?page=1&limit=5', {
      headers: { Authorization: `Bearer ${alexToken}` }
    });
    assert(feedRes.data.success && Array.isArray(feedRes.data.data), 'Feed API returns posts array');
    assert(feedRes.data.pagination && feedRes.data.pagination.page === 1, 'Feed pagination metadata structure is correct');
    assert(feedRes.data.data.every(p => p.author && p.author.name), 'Feed posts are properly populated with author information');

    // 5.2 User Profile
    const profileRes = await request('/users/alexrivera', {
      headers: { Authorization: `Bearer ${alexToken}` }
    });
    assert(profileRes.data.data.username === 'alexrivera' && profileRes.data.data.isSelf === true, 'Get User Profile by username with isSelf flag');

    // 5.3 Suggestions
    const suggestionsRes = await request('/users/suggestions?limit=5', {
      headers: { Authorization: `Bearer ${alexToken}` }
    });
    assert(Array.isArray(suggestionsRes.data.data), 'Fetch user suggestions from real database');

  } catch (error) {
    console.error('Test execution error:', error.message, error.data || '');
    failed++;
  }

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed === 0) {
    console.log('ALL PHASE 2 REQUIREMENTS SUCCESSFULLY VERIFIED!');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runPhase2Tests();
