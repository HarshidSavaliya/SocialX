import dns from 'dns';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { seedDefaultDataIfEmpty, seedVideoReelsIfEmpty, syncPostCounters } from './seedData.js';

// Configure DNS resolution for Node.js (uses public DNS to fix Windows querySrv ECONNREFUSED)
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
  dns.setDefaultResultOrder('ipv4first');
} catch (e) {
  // Ignored in older node versions
}

const MONGOOSE_OPTS = {
  serverSelectionTimeoutMS: 4000,
  connectTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  retryWrites: true,
  maxPoolSize: 20
};

export const connectDB = async () => {
  const localFallbackUri = process.env.LOCAL_MONGO_URI || 'mongodb://127.0.0.1:27017/socialx';
  const forceLocal = process.env.USE_LOCAL_DB === 'true';
  const primaryUri = forceLocal ? null : process.env.MONGO_URI;

  let conn = null;

  // Option A: Direct local connection if requested
  if (forceLocal) {
    try {
      console.log('[Database] Connecting to local MongoDB (USE_LOCAL_DB=true)...');
      conn = await mongoose.connect(localFallbackUri, MONGOOSE_OPTS);
      console.log(`[Database] Connected to local MongoDB: ${conn.connection.host}`);
      return conn;
    } catch (err) {
      console.error('[Database] Could not connect to local MongoDB:', err.message);
      return null;
    }
  }

  // Option B: Try connecting to primary MONGO_URI (e.g. MongoDB Atlas)
  if (primaryUri) {
    try {
      console.log('[Database] Connecting to MongoDB Atlas...');
      conn = await mongoose.connect(primaryUri, MONGOOSE_OPTS);
      console.log(`[Database] Connected successfully to host: ${conn.connection.host}`);
    } catch (primaryErr) {
      const isIpWhitelistError =
        primaryErr.message &&
        (primaryErr.message.includes('whitelist') ||
          primaryErr.message.includes('SSL alert') ||
          primaryErr.message.includes('ReplicaSetNoPrimary') ||
          primaryErr.message.includes('ECONNREFUSED'));

      console.warn(`\n[Database] MongoDB Atlas connection unsuccessful: ${primaryErr.message}`);

      if (isIpWhitelistError) {
        console.warn('========================================================================');
        console.warn('                     MONGODB ATLAS ACCESS NOTICE                        ');
        console.warn('========================================================================');
        console.warn('Your current IP is not allowed by MongoDB Atlas Network Access rules.');
        console.warn('To fix this permanently for Atlas:');
        console.warn('  1. Open https://cloud.mongodb.com -> Network Access');
        console.warn('  2. Click "Add IP Address" -> "Allow Access From Anywhere" (0.0.0.0/0)');
        console.warn('  3. Click Confirm.');
        console.warn('------------------------------------------------------------------------');
        console.warn('Alternatively, to run offline with zero delay, set in backend/.env:');
        console.warn('  USE_LOCAL_DB=true');
        console.warn('========================================================================\n');
      }

      console.log(`[Database] Connecting to local MongoDB instance: ${localFallbackUri}...`);
      try {
        conn = await mongoose.connect(localFallbackUri, {
          serverSelectionTimeoutMS: 3000,
          connectTimeoutMS: 4000
        });
        console.log(`[Database] Connected to local database: ${conn.connection.host}`);
      } catch (localErr) {
        console.error('[Database] Local MongoDB fallback was also unreachable:', localErr.message);
        console.error('[Database] Please ensure MongoDB service is running locally or whitelist your IP in Atlas.');
      }
    }
  } else {
    // No MONGO_URI in .env -> use local
    try {
      conn = await mongoose.connect(localFallbackUri, MONGOOSE_OPTS);
      console.log(`[Database] Connected to local MongoDB: ${conn.connection.host}`);
    } catch (e) {
      console.error('[Database] Could not connect to local MongoDB:', e.message);
    }
  }

  // Step 2: Ensure default demo data and admin role if connected
  if (mongoose.connection.readyState === 1) {
    try {
      // Auto-populate demo users & posts if database is fresh/empty
      await seedDefaultDataIfEmpty();
      await seedVideoReelsIfEmpty();
      await syncPostCounters();

      // Ensure at least one account has ADMIN privileges for admin module
      const adminCount = await User.countDocuments({ role: 'ADMIN' });
      if (adminCount === 0) {
        const alex = await User.findOne({ username: 'alexrivera' });
        if (alex) {
          alex.role = 'ADMIN';
          await alex.save();
          console.log('[Database] Granted ADMIN role to default demo user @alexrivera');
        } else {
          const firstUser = await User.findOne();
          if (firstUser) {
            firstUser.role = 'ADMIN';
            await firstUser.save();
            console.log(`[Database] Granted ADMIN role to user @${firstUser.username}`);
          }
        }
      }
    } catch (postConnectErr) {
      console.warn('[Database] Post-connection initialization notice:', postConnectErr.message);
    }
  }

  // Connection event handlers for resilience
  mongoose.connection.on('disconnected', () => {
    console.warn('[Database] MongoDB connection disconnected. Attempting to reconnect...');
  });

  mongoose.connection.on('reconnected', () => {
    console.log('[Database] MongoDB reconnected successfully.');
  });

  return conn;
};