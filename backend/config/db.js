import dns from 'dns';
import mongoose from 'mongoose';
import User from '../models/User.js';

export const connectDB = async () => {
    try {
        let conn;
        try {
            conn = await mongoose.connect(process.env.MONGO_URI);
        } catch (initialErr) {
            if (initialErr.message && initialErr.message.includes('querySrv') && process.env.MONGO_URI?.startsWith('mongodb+srv://')) {
                dns.setServers(['8.8.8.8', '1.1.1.1']);
                conn = await mongoose.connect(process.env.MONGO_URI);
            } else {
                throw initialErr;
            }
        }
        console.log(`MongoDB Connected: ${conn.connection.host}`);

        // Ensure at least one admin account exists for Phase 4 Admin Module
        const adminCount = await User.countDocuments({ role: 'ADMIN' });
        if (adminCount === 0) {
            const alex = await User.findOne({ username: 'alexrivera' });
            if (alex) {
                alex.role = 'ADMIN';
                await alex.save();
                console.log('Phase 4: Granted ADMIN role to default demo user @alexrivera');
            } else {
                const firstUser = await User.findOne();
                if (firstUser) {
                    firstUser.role = 'ADMIN';
                    await firstUser.save();
                    console.log(`Phase 4: Granted ADMIN role to user @${firstUser.username}`);
                }
            }
        }
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1); // Exit process with failure
    }
};