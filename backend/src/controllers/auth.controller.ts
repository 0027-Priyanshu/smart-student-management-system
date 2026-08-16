import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { RepoService } from '../services/repo.service';
import { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyRefreshToken 
} from '../utils/token';
import { sendEmail } from '../services/email.service';
import { emitLiveUpdate } from '../config/socket';
import { NotificationService } from '../services/notification.service';
import crypto from 'crypto';

// Temporary reset tokens in memory
const resetTokens = new Map<string, { email: string; expires: number }>();

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, email, password, role } = req.body;
      const cleanEmail = email.toLowerCase().trim();

      // P0-2 Security: Public registration is strictly for Students only
      if (role && role !== 'Student') {
        return res.status(403).json({ 
          error: 'Public registration is restricted to students only. Faculty and Administrator accounts must be created by an Administrator.' 
        });
      }

      const assignedRole = 'Student';

      // Check if user exists
      const existingUser = await RepoService.findUserByEmail(cleanEmail);
      if (existingUser) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      // Hash password
      const salt = bcrypt.genSaltSync(10);
      const passwordHash = bcrypt.hashSync(password, salt);

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');

      // Create User (verified by default for all roles to bypass verification blocks)
      const isVerified = true;

      const user = await RepoService.createUser({
        name,
        email: cleanEmail,
        password: passwordHash,
        role: assignedRole,
        isVerified,
        verificationToken: isVerified ? null : verificationToken
      });

      const userId = user._id || user.id;

      // Handle role profile initialization
      const enrollmentNo = 'ENR' + Date.now().toString().slice(-8);
      await RepoService.createStudent({
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
      NotificationService.sendStudentRegistrationNotification(cleanEmail, name, enrollmentNo).catch(err => console.error(err));
      // Log Activity
      await RepoService.createLog({
        userId,
        userName: name,
        role,
        action: 'Registration',
        details: `Registered as a new user with role: ${role}. Verification required: ${!isVerified}`
      });

      // Notify other active sockets
      emitLiveUpdate('new_registration', { name, role, time: new Date() });

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
        await sendEmail(cleanEmail, 'Verify Your EduManager Account', emailHtml);
      }

      // Generate Tokens
      const payload = { userId, email: cleanEmail, role, name };
      const accessToken = generateAccessToken(payload);
      const refreshToken = generateRefreshToken({ userId });

      await RepoService.updateUser(userId, { refreshToken });

      return res.status(201).json({
        message: isVerified 
          ? 'User registered successfully!' 
          : 'Registration successful! A verification email has been simulated/sent to your inbox.',
        accessToken,
        refreshToken,
        user: { userId, name, email: cleanEmail, role, isVerified }
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const cleanEmail = email.toLowerCase().trim();
      const user = await RepoService.findUserByEmail(cleanEmail);

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const passMatch = bcrypt.compareSync(password, user.password);
      if (!passMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const userId = user._id || user.id;

      // Block soft-deleted student profiles
      if (user.role === 'Student') {
        const studentProfile = await RepoService.findStudentByUserId(userId);
        if (studentProfile && studentProfile.isDeleted) {
          return res.status(403).json({ error: 'This student account has been deactivated or deleted.' });
        }
      }

      // Block soft-deleted faculty profiles
      if (user.role === 'Faculty') {
        const facultyProfile = await RepoService.findFacultyByUserId(userId);
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
      const accessToken = generateAccessToken(payload);
      const refreshToken = generateRefreshToken({ userId });

      await RepoService.updateUser(userId, { refreshToken });

      // Log Activity
      await RepoService.createLog({
        userId,
        userName: user.name,
        role: user.role,
        action: 'Login',
        details: 'Logged into the system'
      });

      const profileResponse: any = { userId, name: user.name, email: cleanEmail, role: user.role };
      
      if (user.role === 'Student') {
        const studentProfile = await RepoService.findStudentByUserId(userId);
        profileResponse.studentProfile = studentProfile;
      } else if (user.role === 'Faculty') {
        const facultyProfile = await RepoService.findFacultyByUserId(userId);
        profileResponse.facultyProfile = facultyProfile;
      }

      return res.json({
        message: 'Login successful',
        accessToken,
        refreshToken,
        user: profileResponse
      });
    } catch (error) {
      next(error);
    }
  }

  static async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.body;
      const dbUsers = await RepoService.findUsers();
      const user = dbUsers.find((u: any) => u.verificationToken === token);

      if (!user) {
        return res.status(400).json({ error: 'Invalid or expired email verification token.' });
      }

      const userId = user._id || user.id;
      await RepoService.updateUser(userId, {
        isVerified: true,
        verificationToken: null
      });

      await RepoService.createLog({
        userId,
        userName: user.name,
        role: user.role,
        action: 'Email Verified',
        details: `Verified email address: ${user.email}`
      });

      return res.json({ message: 'Email verified successfully! You can now log in.' });
    } catch (error) {
      next(error);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      const verified = verifyRefreshToken(refreshToken);
      if (!verified) {
        return res.status(401).json({ error: 'Invalid or expired refresh token' });
      }

      const user = await RepoService.findUserById(verified.userId);
      if (!user || user.refreshToken !== refreshToken) {
        return res.status(401).json({ error: 'Session mismatch. Please log in again.' });
      }

      const userId = user._id || user.id;
      const payload = { userId, email: user.email, role: user.role, name: user.name };
      const newAccessToken = generateAccessToken(payload);
      const newRefreshToken = generateRefreshToken({ userId });

      await RepoService.updateUser(userId, { refreshToken: newRefreshToken });

      return res.json({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      });
    } catch (error) {
      next(error);
    }
  }

  static async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: 'Email address is required.' });
      }
      const cleanEmail = email.toLowerCase().trim();
      const user = await RepoService.findUserByEmail(cleanEmail);

      if (!user) {
        return res.status(404).json({ error: 'No account found with this email address.' });
      }

      // Generate a 6-digit numeric OTP and token
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const token = crypto.randomBytes(32).toString('hex');
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

      await sendEmail(cleanEmail, 'Your EduManager Password Reset OTP Code', emailHtml);

      return res.json({ 
        message: `Password reset OTP generated for ${cleanEmail}. (Demo OTP Code: ${otp})`,
        token: token,
        otp: otp
      });
    } catch (error) {
      next(error);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction) {
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

      const user = await RepoService.findUserByEmail(requestSession.email);
      if (!user) {
        return res.status(404).json({ error: 'User account not found.' });
      }

      const salt = bcrypt.genSaltSync(10);
      const passwordHash = bcrypt.hashSync(newPassword, salt);

      const userId = user._id || user.id;
      await RepoService.updateUser(userId, { password: passwordHash });

      resetTokens.delete(cleanToken);

      return res.json({ message: 'Password has been successfully updated! You can now log in.' });
    } catch (error) {
      next(error);
    }
  }

  static async me(req: Request, res: Response, next: NextFunction) {
    try {
      const requester = (req as any).user;
      const user = await RepoService.findUserById(requester.userId);

      if (!user) {
        return res.status(404).json({ error: 'User session not found' });
      }

      const userId = user._id || user.id;
      const profileResponse: any = {
        userId,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        createdAt: user.createdAt
      };

      if (user.role === 'Student') {
        const studentProfile = await RepoService.findStudentByUserId(userId);
        profileResponse.studentProfile = studentProfile;
      } else if (user.role === 'Faculty') {
        const facultyProfile = await RepoService.findFacultyByUserId(userId);
        profileResponse.facultyProfile = facultyProfile;
      }

      return res.json({ user: profileResponse });
    } catch (error) {
      next(error);
    }
  }
}
