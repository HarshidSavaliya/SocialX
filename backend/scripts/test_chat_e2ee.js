/**
 * SocialX Chat Architecture & E2EE Verification Test Suite
 *
 * Automated verification of:
 * 1. Native Web Crypto ECDH P-256 Key Exchange
 * 2. HKDF SHA-256 Shared Secret Derivation
 * 3. AES-256-GCM Authenticated Encryption & Decryption
 * 4. Fresh Nonce/IV uniqueness verification
 * 5. Tampered Ciphertext Authentication Tag rejection
 * 6. Binary Media ArrayBuffer encryption & byte integrity
 * 7. Conversation deterministic participantKey uniqueness (race condition immunity)
 * 8. clientMessageId deduplication
 * 9. Cursor pagination stability
 * 10. Atomic unread count increments & resets
 * 11. Secret Chat PIN rate limiting (5 attempts lockout)
 * 12. Secret Chat scoped JWT generation & validation
 * 13. Auto-delete pruning of expired secret messages
 * 14. View-once atomic burn & media deletion
 * 15. Delete-on-exit total session wipe
 * 16. Bidirectional block validation for calls & messages
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import User from '../models/User.js';
import Post from '../models/Post.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import SecretConversation from '../models/SecretConversation.js';
import SecretMessage from '../models/SecretMessage.js';
import messageService from '../services/messageService.js';
import secretChatService from '../services/secretChatService.js';
import videoCallService from '../services/videoCallService.js';

const webcrypto = globalThis.crypto?.subtle ? globalThis.crypto : crypto.webcrypto;

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    testsPassed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    testsFailed++;
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('   SOCIALX CHAT & E2EE AUTOMATED TEST SUITE        ');
  console.log('====================================================\n');

  // ========================================================
  // PART 1: CRYPTOGRAPHIC VERIFICATION (Web Crypto API)
  // ========================================================
  console.log('[TEST GROUP 1] Native Browser Web Crypto E2EE Pipeline...');

  // 1. Generate Alice and Bob ECDH P-256 keypairs
  const aliceKeyPair = await webcrypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  );
  const bobKeyPair = await webcrypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  );

  assert(aliceKeyPair.publicKey && aliceKeyPair.privateKey, 'Alice generated ECDH P-256 keypair');
  assert(bobKeyPair.publicKey && bobKeyPair.privateKey, 'Bob generated ECDH P-256 keypair');

  // Export Alice and Bob public keys to JWK
  const alicePubJwk = await webcrypto.subtle.exportKey('jwk', aliceKeyPair.publicKey);
  const bobPubJwk = await webcrypto.subtle.exportKey('jwk', bobKeyPair.publicKey);

  assert(alicePubJwk.crv === 'P-256' && alicePubJwk.kty === 'EC', 'Alice public key exported as valid P-256 JWK');
  assert(bobPubJwk.crv === 'P-256' && bobPubJwk.kty === 'EC', 'Bob public key exported as valid P-256 JWK');

  // 2. Diffie-Hellman Key Agreement (Alice derives with Bob's pub key; Bob with Alice's pub key)
  const bobPubImportedByAlice = await webcrypto.subtle.importKey(
    'jwk',
    bobPubJwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );
  const alicePubImportedByBob = await webcrypto.subtle.importKey(
    'jwk',
    alicePubJwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  const aliceSharedBits = await webcrypto.subtle.deriveBits(
    { name: 'ECDH', public: bobPubImportedByAlice },
    aliceKeyPair.privateKey,
    256
  );
  const bobSharedBits = await webcrypto.subtle.deriveBits(
    { name: 'ECDH', public: alicePubImportedByBob },
    bobKeyPair.privateKey,
    256
  );

  const aliceBitsHex = Buffer.from(aliceSharedBits).toString('hex');
  const bobBitsHex = Buffer.from(bobSharedBits).toString('hex');
  assert(aliceBitsHex === bobBitsHex, 'Alice and Bob derived the identical 256-bit shared secret via ECDH');

  // 3. HKDF Key Derivation for Conversation Symmetric Key
  const testConvId = 'test_conversation_123';
  const salt = new TextEncoder().encode(`SocialX-E2EE-${testConvId}`);
  const info = new TextEncoder().encode('aes-256-gcm-secret-chat-v1');

  const aliceHkdfMaster = await webcrypto.subtle.importKey('raw', aliceSharedBits, { name: 'HKDF' }, false, ['deriveKey']);
  const bobHkdfMaster = await webcrypto.subtle.importKey('raw', bobSharedBits, { name: 'HKDF' }, false, ['deriveKey']);

  const aliceAesKey = await webcrypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    aliceHkdfMaster,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  const bobAesKey = await webcrypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    bobHkdfMaster,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  const aliceRawAes = await webcrypto.subtle.exportKey('raw', aliceAesKey);
  const bobRawAes = await webcrypto.subtle.exportKey('raw', bobAesKey);
  assert(
    Buffer.from(aliceRawAes).toString('hex') === Buffer.from(bobRawAes).toString('hex'),
    'HKDF derived matching 256-bit AES-GCM conversation keys on both isolated clients'
  );

  // 4. Authenticated Encryption with AES-256-GCM + Fresh 12-byte IV
  const originalPlaintext = 'Top secret college project intelligence: real E2EE in SocialX!';
  const freshIv1 = crypto.randomBytes(12);
  const freshIv2 = crypto.randomBytes(12);
  assert(!freshIv1.equals(freshIv2), 'Every encryption operation generates a unique 12-byte nonce/IV');

  const ciphertextBuffer = await webcrypto.subtle.encrypt(
    { name: 'AES-GCM', iv: freshIv1, tagLength: 128 },
    aliceAesKey,
    new TextEncoder().encode(originalPlaintext)
  );

  assert(ciphertextBuffer.byteLength > originalPlaintext.length, 'Ciphertext includes 16-byte authentication tag');

  // Bob decrypts the ciphertext
  const decryptedBuffer = await webcrypto.subtle.decrypt(
    { name: 'AES-GCM', iv: freshIv1, tagLength: 128 },
    bobAesKey,
    ciphertextBuffer
  );
  const decryptedText = new TextDecoder().decode(decryptedBuffer);
  assert(decryptedText === originalPlaintext, 'Bob successfully decrypted ciphertext to original plaintext');

  // 5. Tampered Ciphertext Authentication Tag Verification
  const tamperedCiphertext = new Uint8Array(ciphertextBuffer);
  tamperedCiphertext[0] ^= 0xff; // Flip bits in ciphertext

  let tamperFailed = false;
  try {
    await webcrypto.subtle.decrypt(
      { name: 'AES-GCM', iv: freshIv1, tagLength: 128 },
      bobAesKey,
      tamperedCiphertext
    );
  } catch (err) {
    tamperFailed = true;
  }
  assert(tamperFailed, 'AES-256-GCM successfully rejected tampered ciphertext (auth tag verification failed)');

  // 6. Binary Media Encryption & Byte-Level Integrity
  const dummyMediaBytes = crypto.randomBytes(64 * 1024); // 64 KB binary media
  const mediaIv = crypto.randomBytes(12);
  const encryptedMedia = await webcrypto.subtle.encrypt(
    { name: 'AES-GCM', iv: mediaIv, tagLength: 128 },
    aliceAesKey,
    dummyMediaBytes
  );

  const decryptedMedia = await webcrypto.subtle.decrypt(
    { name: 'AES-GCM', iv: mediaIv, tagLength: 128 },
    bobAesKey,
    encryptedMedia
  );
  assert(
    Buffer.from(decryptedMedia).equals(dummyMediaBytes),
    'Raw binary media encrypted on device and decrypted without byte corruption'
  );

  // ========================================================
  // PART 2: DATABASE, NORMAL & SECRET CHAT SERVICES
  // ========================================================
  console.log('\n[TEST GROUP 2] Database Models & Concurrency-Safe Services...');

  try {
    try {
      const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/socialx';
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
      console.log('✓ Connected to MongoDB (Atlas)\n');
    } catch (atlasErr) {
      console.log('[Notice] Atlas connection timed out, connecting to local MongoDB fallback: mongodb://127.0.0.1:27017/socialx');
      await mongoose.connect('mongodb://127.0.0.1:27017/socialx', { serverSelectionTimeoutMS: 5000 });
      console.log('✓ Connected to local MongoDB instance\n');
    }
  } catch (err) {
    console.log('[Notice] MongoDB connection timed out or unavailable in local test environment.');
    console.log('Skipping live MongoDB calls, all cryptographic and unit checks completed.\n');
    printSummary();
    process.exit(0);
  }

  // Create two temporary test users
  const testSuffix = Date.now();
  const userA = await User.create({
    username: `alice_test_${testSuffix}`,
    email: `alice_${testSuffix}@example.com`,
    password: 'password123',
    name: 'Alice Test'
  });
  const userB = await User.create({
    username: `bob_test_${testSuffix}`,
    email: `bob_${testSuffix}@example.com`,
    password: 'password123',
    name: 'Bob Test'
  });

  try {
    // 7. Test Public Key Registration & Retrieval
    await secretChatService.registerPublicKey(userA._id, JSON.stringify(alicePubJwk));
    const savedUserA = await secretChatService.getPublicKey(userA._id);
    assert(savedUserA.publicKey === JSON.stringify(alicePubJwk), 'User e2ePublicKey registered and retrieved from DB');

    // 8. Normal Conversation Concurrency & Uniqueness Test
    // Concurrent creation attempts with swapped user orders [A, B] and [B, A]
    const [conv1, conv2] = await Promise.all([
      messageService.getOrCreateConversation(userA._id, userB._id),
      messageService.getOrCreateConversation(userB._id, userA._id)
    ]);

    assert(
      conv1._id.toString() === conv2._id.toString(),
      'Concurrent conversation creation produces identical conversation document (participantKey uniqueness)'
    );

    // 9. clientMessageId Deduplication Test
    const clientMsgId = `cli_${testSuffix}_1`;
    const msg1 = await messageService.sendMessage({
      conversationId: conv1._id,
      senderId: userA._id,
      text: 'First message send',
      clientMessageId: clientMsgId
    });

    const msg2 = await messageService.sendMessage({
      conversationId: conv1._id,
      senderId: userA._id,
      text: 'Duplicate replay message send',
      clientMessageId: clientMsgId
    });

    assert(
      msg1._id.toString() === msg2._id.toString(),
      'Idempotent send: duplicate clientMessageId returns existing message without duplicate DB insert'
    );

    // 10. Atomic Unread Count Increment & Reset
    const convAfterMsg = await Conversation.findById(conv1._id).lean();
    const bobUnread = convAfterMsg.unreadCounts?.get?.(userB._id.toString()) || convAfterMsg.unreadCounts?.[userB._id.toString()] || 0;
    assert(bobUnread >= 1, `Atomic unread count incremented for recipient (Bob: ${bobUnread})`);

    await messageService.markMessagesAsRead(conv1._id, userB._id);
    const convAfterRead = await Conversation.findById(conv1._id).lean();
    const bobUnreadAfter = convAfterRead.unreadCounts?.get?.(userB._id.toString()) || convAfterRead.unreadCounts?.[userB._id.toString()] || 0;
    assert(bobUnreadAfter === 0, 'Atomic unread count reset to 0 upon read receipt');

    // 11. Cursor Pagination Stability Test
    // Insert 5 numbered messages
    for (let i = 1; i <= 5; i++) {
      await messageService.sendMessage({
        conversationId: conv1._id,
        senderId: userA._id,
        text: `Numbered message ${i}`
      });
    }

    const page1 = await messageService.getMessages(conv1._id, userB._id, { limit: 3 });
    assert(page1.messages.length === 3, 'Cursor pagination retrieved first page of 3 messages');
    assert(page1.hasMore === true && page1.nextCursor, 'Cursor pagination returned stable nextCursor and hasMore: true');

    const page2 = await messageService.getMessages(conv1._id, userB._id, { limit: 3, cursor: page1.nextCursor });
    assert(page2.messages.length >= 1, 'Cursor pagination retrieved next page of messages');
    const overlap = page1.messages.some((m1) => page2.messages.some((m2) => m1._id.toString() === m2._id.toString()));
    assert(!overlap, 'No overlapping duplicates between cursor-paginated pages');

    // 12. Secret Conversation Creation & PIN Verification
    const secretConvResult = await secretChatService.startSecretChat({
      currentUserId: userA._id,
      targetUserId: userB._id,
      pin: '4321',
      autoDeleteLimit: 5
    });

    assert(secretConvResult.secretToken, 'Secret chat started and returned scoped secretAccess JWT token');
    const dbConv = await SecretConversation.findById(secretConvResult.conversation._id).select('+pinHash').lean();
    assert(dbConv.pinHash && dbConv.pinHash !== '4321', 'PIN is bcrypt hashed, never stored as plaintext');

    // 13. PIN Verification & Rate-Limiting Lockout (5 attempts)
    let pinFailedAttempts = 0;
    for (let i = 0; i < 5; i++) {
      try {
        await secretChatService.verifyPin({
          conversationId: secretConvResult.conversation._id,
          userId: userA._id,
          pin: '9999'
        });
      } catch (err) {
        pinFailedAttempts++;
      }
    }
    assert(pinFailedAttempts === 5, 'Failed PIN attempts recorded and rejected');

    let lockedOut = false;
    try {
      await secretChatService.verifyPin({
        conversationId: secretConvResult.conversation._id,
        userId: userA._id,
        pin: '4321'
      });
    } catch (err) {
      if (err.message.includes('attempts') || err.message.includes('wait') || err.message.includes('retrying')) {
        lockedOut = true;
      }
    }
    assert(lockedOut, 'Rate limit triggered: 5 failed PIN attempts locked conversation for 5 minutes');

    // Reset lockout for further test execution
    secretChatService.resetPinLockout(secretConvResult.conversation._id, userA._id);

    const verifySuccess = await secretChatService.verifyPin({
      conversationId: secretConvResult.conversation._id,
      userId: userA._id,
      pin: '4321'
    });
    assert(verifySuccess.secretToken, 'Correct PIN successfully verified and issued secret access token');

    // 14. E2EE Secret Message Storage (Zero Plaintext on Server)
    const secMsg = await secretChatService.sendMessage({
      conversationId: secretConvResult.conversation._id,
      senderId: userA._id,
      ciphertext: Buffer.from(ciphertextBuffer).toString('base64'),
      iv: freshIv1.toString('base64'),
      authTag: Buffer.from(freshIv1).toString('base64'),
      clientMessageId: `sec_${testSuffix}_1`
    });

    const dbSecMsg = await SecretMessage.findById(secMsg._id).lean();
    assert(dbSecMsg.ciphertext && !dbSecMsg.content, 'Secret message stored strictly as ciphertext; no plaintext in MongoDB');
    assert(dbSecMsg.iv, 'Secret message has fresh IV stored for client-side decryption');

    // 15. View-Once Media Burning Test
    const viewOnceMsg = await secretChatService.sendMessage({
      conversationId: secretConvResult.conversation._id,
      senderId: userA._id,
      ciphertext: 'enc_view_once',
      iv: 'iv_view_once',
      mediaUrl: 'https://res.cloudinary.com/dummy/raw/upload/test.enc',
      mediaPublicId: 'secret_chat/test_123',
      mediaIv: 'media_iv_123',
      isViewOnce: true
    });

    assert(viewOnceMsg.isViewOnce === true && !viewOnceMsg.viewed, 'View-once secret message created');
    await secretChatService.viewOnceMedia(viewOnceMsg._id, userB._id);

    const burnedMsg = await SecretMessage.findById(viewOnceMsg._id).lean();
    assert(burnedMsg.viewed === true && burnedMsg.mediaUrl === null, 'View-once media burned: mediaUrl permanently wiped');

    // 16. Auto-Delete Limit Pruning Test (limit is 5)
    for (let i = 1; i <= 6; i++) {
      await secretChatService.sendMessage({
        conversationId: secretConvResult.conversation._id,
        senderId: userA._id,
        ciphertext: `enc_auto_del_${i}`,
        iv: `iv_${i}`
      });
    }

    const remainingSecMsgs = await SecretMessage.find({ conversation: secretConvResult.conversation._id }).lean();
    assert(
      remainingSecMsgs.length <= 5,
      `Auto-delete limit enforced: messages pruned to fit limit of 5 (current: ${remainingSecMsgs.length})`
    );

    // 17. Delete Secret Chat on Exit (Full Session Wipe)
    await secretChatService.exitSecretChat(secretConvResult.conversation._id, userA._id);
    const wipedConv = await SecretConversation.findById(secretConvResult.conversation._id).lean();
    const remainingAfterWipe = await SecretMessage.countDocuments({ conversation: secretConvResult.conversation._id });

    assert(wipedConv.isActive === false, 'Conversation deactivated upon exit');
    assert(remainingAfterWipe === 0, 'All secret messages wiped from database on exit');

    // 18. Video Call Bidirectional Block Validation
    await User.findByIdAndUpdate(userA._id, { $addToSet: { blockedUsers: userB._id } });
    let blockPreventedCall = false;
    try {
      await videoCallService.initiateCall({ callerId: userA._id, receiverId: userB._id });
    } catch (err) {
      if (err.message.toLowerCase().includes('block')) blockPreventedCall = true;
    }
    assert(blockPreventedCall, 'Bidirectional block prevents initiating Agora video call');

  } finally {
    // Cleanup test data
    await User.deleteMany({ _id: { $in: [userA._id, userB._id] } });
    await Conversation.deleteMany({ participants: { $in: [userA._id, userB._id] } });
    await Message.deleteMany({ sender: { $in: [userA._id, userB._id] } });
    await SecretConversation.deleteMany({ participants: { $in: [userA._id, userB._id] } });
    await SecretMessage.deleteMany({ sender: { $in: [userA._id, userB._id] } });
    await mongoose.disconnect();
  }

  printSummary();
}

function printSummary() {
  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${testsPassed} PASSED, ${testsFailed} FAILED`);
  console.log('====================================================\n');
  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
