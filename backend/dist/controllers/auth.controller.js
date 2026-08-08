"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const repo_service_1 = require("../services/repo.service");
const token_1 = require("../utils/token");
const email_service_1 = require("../services/email.service");
const socket_1 = require("../config/socket");
const notification_service_1 = require("../services/notification.service");
const crypto_1 = __importDefault(require("crypto"));
// Temporary reset tokens in memory
const resetTokens = new Map();
class AuthController {
    static async register(req, res, next) {
        try {
            const { name, email, password, role } = req.body;
            const cleanEmail = email.toLowerCase().trim();
            // Check if user exists
            const existingUser = await repo_service_1.RepoService.findUserByEmail(cleanEmail);
            if (existingUser) {
                return res.status(400).json({ error: 'Email already registered' });
            }
            // Hash password
            const salt = bcryptjs_1.default.genSaltSync(10);
            const passwordHash = bcryptjs_1.default.hashSync(password, salt);
            // Generate verification token
            const verificationToken = crypto_1.default.randomBytes(32).toString('hex');
            // Create User (verified by default for all roles to bypass verification blocks)
            const isVerified = true;
            const user = await repo_service_1.RepoService.createUser({
                name,
                email: cleanEmail,
                password: passwordHash,
                role,
                isVerified,
                verificationToken: isVerified ? null : verificationToken
            });
            const userId = user._id || user.id;
            // Handle role profile initialization
            if (role === 'Student') {
                const enrollmentNo = 'ENR' + Date.now().toString().slice(-8);
                await repo_service_1.RepoService.createStudent({
                    userId,
                    name,
                    email: cleanEmail,
                    enrollmentNo,
                    age: 18,
                    gender: 'Male',
                    grade: 'Freshman',
                    department: 'General Sciences',
                    semester: 1,
                    parentName: 'Not Specified',
                    parentPhone: '0000000000',
                    address: 'Not Specified'
                });
                // Send registration email notification and trigger stub alerts
                notification_service_1.NotificationService.sendStudentRegistrationNotification(cleanEmail, name, enrollmentNo).catch(err => console.error(err));
            }
            else if (role === 'Faculty') {
                await repo_service_1.RepoService.createFaculty({
                    userId,
                    name,
                    email: cleanEmail,
                    department: 'General Sciences',
                    designation: 'Assistant Professor'
                });
            }
            // Log Activity
            await repo_service_1.RepoService.createLog({
                userId,
                userName: name,
                role,
                action: 'Registration',
                details: `Registered as a new user with role: ${role}. Verification required: ${!isVerified}`
            });
            // Notify other active sockets
            (0, socket_1.emitLiveUpdate)('new_registration', { name, role, time: new Date() });
            // If Student, send verification email
            if (!isVerified) {
                const verifyLink = `http://localhost:5173/verify-email?token=${verificationToken}`;
                const emailHtml = `
          <h3>EduManager Account Verification Required</h3>
          <p>Hello ${name},</p>
          <p>Please click the link below to verify your EduManager account:</p>
          <p><a href="${verifyLink}">${verifyLink}</a></p>
          <p>Once verified, you will be able to log in to the Student Management System.</p>
        `;
                await (0, email_service_1.sendEmail)(cleanEmail, 'Verify Your EduManager Account', emailHtml);
            }
            // Generate Tokens
            const payload = { userId, email: cleanEmail, role, name };
            const accessToken = (0, token_1.generateAccessToken)(payload);
            const refreshToken = (0, token_1.generateRefreshToken)({ userId });
            await repo_service_1.RepoService.updateUser(userId, { refreshToken });
            return res.status(201).json({
                message: isVerified
                    ? 'User registered successfully!'
                    : 'Registration successful! A verification email has been simulated/sent to your inbox.',
                accessToken,
                refreshToken,
                user: { userId, name, email: cleanEmail, role, isVerified }
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async login(req, res, next) {
        try {
            const { email, password } = req.body;
            const cleanEmail = email.toLowerCase().trim();
            const user = await repo_service_1.RepoService.findUserByEmail(cleanEmail);
            if (!user) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            const passMatch = bcryptjs_1.default.compareSync(password, user.password);
            if (!passMatch) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            const userId = user._id || user.id;
            // Block soft-deleted student profiles
            if (user.role === 'Student') {
                const studentProfile = await repo_service_1.RepoService.findStudentByUserId(userId);
                if (studentProfile && studentProfile.isDeleted) {
                    return res.status(403).json({ error: 'This student account has been deactivated or deleted.' });
                }
            }
            // Block soft-deleted faculty profiles
            if (user.role === 'Faculty') {
                const facultyProfile = await repo_service_1.RepoService.findFacultyByUserId(userId);
                if (facultyProfile && facultyProfile.isDeleted) {
                    return res.status(403).json({ error: 'This faculty account has been deactivated or deleted.' });
                }
            }
            // Check email verification status (explicitly false means unverified) - bypassed
            /*
            if (user.isVerified === false) {
              return res.status(403).json({
                error: 'Please verify your email address before logging in.',
                unverified: true
              });
            }
            */
            // Generate tokens
            const payload = { userId, email: cleanEmail, role: user.role, name: user.name };
            const accessToken = (0, token_1.generateAccessToken)(payload);
            const refreshToken = (0, token_1.generateRefreshToken)({ userId });
            await repo_service_1.RepoService.updateUser(userId, { refreshToken });
            // Log Activity
            await repo_service_1.RepoService.createLog({
                userId,
                userName: user.name,
                role: user.role,
                action: 'Login',
                details: 'Logged into the system'
            });
            const profileResponse = { userId, name: user.name, email: cleanEmail, role: user.role };
            if (user.role === 'Student') {
                const studentProfile = await repo_service_1.RepoService.findStudentByUserId(userId);
                profileResponse.studentProfile = studentProfile;
            }
            else if (user.role === 'Faculty') {
                const facultyProfile = await repo_service_1.RepoService.findFacultyByUserId(userId);
                profileResponse.facultyProfile = facultyProfile;
            }
            return res.json({
                message: 'Login successful',
                accessToken,
                refreshToken,
                user: profileResponse
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async verifyEmail(req, res, next) {
        try {
            const { token } = req.body;
            const dbUsers = await repo_service_1.RepoService.findUsers();
            const user = dbUsers.find((u) => u.verificationToken === token);
            if (!user) {
                return res.status(400).json({ error: 'Invalid or expired email verification token.' });
            }
            const userId = user._id || user.id;
            await repo_service_1.RepoService.updateUser(userId, {
                isVerified: true,
                verificationToken: null
            });
            await repo_service_1.RepoService.createLog({
                userId,
                userName: user.name,
                role: user.role,
                action: 'Email Verified',
                details: `Verified email address: ${user.email}`
            });
            return res.json({ message: 'Email verified successfully! You can now log in.' });
        }
        catch (error) {
            next(error);
        }
    }
    static async refresh(req, res, next) {
        try {
            const { refreshToken } = req.body;
            const verified = (0, token_1.verifyRefreshToken)(refreshToken);
            if (!verified) {
                return res.status(401).json({ error: 'Invalid or expired refresh token' });
            }
            const user = await repo_service_1.RepoService.findUserById(verified.userId);
            if (!user || user.refreshToken !== refreshToken) {
                return res.status(401).json({ error: 'Session mismatch. Please log in again.' });
            }
            const userId = user._id || user.id;
            const payload = { userId, email: user.email, role: user.role, name: user.name };
            const newAccessToken = (0, token_1.generateAccessToken)(payload);
            const newRefreshToken = (0, token_1.generateRefreshToken)({ userId });
            await repo_service_1.RepoService.updateUser(userId, { refreshToken: newRefreshToken });
            return res.json({
                accessToken: newAccessToken,
                refreshToken: newRefreshToken
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async forgotPassword(req, res, next) {
        try {
            const { email } = req.body;
            if (!email) {
                return res.status(400).json({ error: 'Email address is required.' });
            }
            const cleanEmail = email.toLowerCase().trim();
            const user = await repo_service_1.RepoService.findUserByEmail(cleanEmail);
            if (!user) {
                return res.status(404).json({ error: 'No account found with this email address.' });
            }
            // Generate a 6-digit numeric OTP and token
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const token = crypto_1.default.randomBytes(32).toString('hex');
            const expires = Date.now() + 15 * 60 * 1000; // 15 mins expiry
            resetTokens.set(token, { email: cleanEmail, expires });
            resetTokens.set(otp, { email: cleanEmail, expires });
            const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded-radius: 12px; background-color: #ffffff;">
          <h2 style="color: #f97316; margin-bottom: 8px;">EduManager Password Reset</h2>
          <p style="color: #334155; font-size: 14px;">Hello <strong>${user.name}</strong>,</p>
          <p style="color: #475569; font-size: 14px;">We received a request to reset your EduManager password.</p>
          <div style="background-color: #fff7ed; border: 1px solid #ffedd5; padding: 16px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <p style="margin: 0; text-transform: uppercase; font-size: 12px; color: #ea580c; font-weight: bold;">Your 6-Digit OTP Code:</p>
            <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #ea580c;">${otp}</span>
          </div>
          <p style="color: #64748b; font-size: 12px;">This code and reset token will expire in <strong>15 minutes</strong>. If you did not request a password reset, please ignore this email.</p>
        </div>
      `;
            await (0, email_service_1.sendEmail)(cleanEmail, 'Your EduManager Password Reset OTP Code', emailHtml);
            return res.json({
                message: `Password reset OTP generated for ${cleanEmail}. (Demo OTP Code: ${otp})`,
                token: token,
                otp: otp
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async resetPassword(req, res, next) {
        try {
            const { token, newPassword } = req.body;
            if (!token || !newPassword) {
                return res.status(400).json({ error: 'Token/OTP and new password are required.' });
            }
            const cleanToken = token.trim();
            const requestSession = resetTokens.get(cleanToken);
            if (!requestSession || requestSession.expires < Date.now()) {
                return res.status(400).json({ error: 'Invalid or expired OTP/reset token. Please request a new one.' });
            }
            const user = await repo_service_1.RepoService.findUserByEmail(requestSession.email);
            if (!user) {
                return res.status(404).json({ error: 'User account not found.' });
            }
            const salt = bcryptjs_1.default.genSaltSync(10);
            const passwordHash = bcryptjs_1.default.hashSync(newPassword, salt);
            const userId = user._id || user.id;
            await repo_service_1.RepoService.updateUser(userId, { password: passwordHash });
            resetTokens.delete(cleanToken);
            return res.json({ message: 'Password has been successfully updated! You can now log in.' });
        }
        catch (error) {
            next(error);
        }
    }
    static async me(req, res, next) {
        try {
            const requester = req.user;
            const user = await repo_service_1.RepoService.findUserById(requester.userId);
            if (!user) {
                return res.status(404).json({ error: 'User session not found' });
            }
            const userId = user._id || user.id;
            const profileResponse = {
                userId,
                name: user.name,
                email: user.email,
                role: user.role,
                isVerified: user.isVerified,
                createdAt: user.createdAt
            };
            if (user.role === 'Student') {
                const studentProfile = await repo_service_1.RepoService.findStudentByUserId(userId);
                profileResponse.studentProfile = studentProfile;
            }
            else if (user.role === 'Faculty') {
                const facultyProfile = await repo_service_1.RepoService.findFacultyByUserId(userId);
                profileResponse.facultyProfile = facultyProfile;
            }
            return res.json({ user: profileResponse });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.AuthController = AuthController;
