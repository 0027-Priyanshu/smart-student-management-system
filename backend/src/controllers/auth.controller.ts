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
import crypto from 'crypto';

// Temporary reset tokens in memory
const resetTokens = new Map<string, { email: string; expires: number }>();

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, email, password, role } = req.body;
      const cleanEmail = email.toLowerCase().trim();

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

      // Create User (verified by default if they are Admin or Faculty for simplicity, or Student needs verification)
      const isVerified = role === 'Super Admin' || role === 'Admin' || role === 'Faculty';

      const user = await RepoService.createUser({
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
      } else if (role === 'Faculty') {
        await RepoService.createFaculty({
          userId,
          name,
          email: cleanEmail,
          department: 'General Sciences',
          designation: 'Assistant Professor'
        });
      }

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

      // Check email verification status (explicitly false means unverified)
      if (user.isVerified === false) {
        return res.status(403).json({ 
          error: 'Please verify your email address before logging in.',
          unverified: true 
        });
      }

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

      return res.json({
        message: 'Login successful',
        accessToken,
        refreshToken,
        user: { userId, name: user.name, email: cleanEmail, role: user.role }
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
      const cleanEmail = email.toLowerCase().trim();
      const user = await RepoService.findUserByEmail(cleanEmail);

      if (!user) {
        // Prevent username enumeration, return generic success
        return res.json({ message: 'If the email exists, a password reset link has been sent.' });
      }

      const token = crypto.randomBytes(32).toString('hex');
      resetTokens.set(token, {
        email: cleanEmail,
        expires: Date.now() + 30 * 60 * 1000 // 30 mins
      });

      const resetLink = `http://localhost:5173/reset-password?token=${token}`;
      const emailHtml = `
        <h3>EduManager Password Reset</h3>
        <p>Hello ${user.name},</p>
        <p>You requested a password reset. Please click the link below to set a new password:</p>
        <p><a href="${resetLink}">${resetLink}</a></p>
        <p>This link expires in 30 minutes.</p>
      `;

      await sendEmail(cleanEmail, 'EduManager Password Reset Request', emailHtml);

      return res.json({ message: 'If the email exists, a password reset link has been sent.' });
    } catch (error) {
      next(error);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, newPassword } = req.body;
      const requestSession = resetTokens.get(token);
      
      if (!requestSession || requestSession.expires < Date.now()) {
        return res.status(400).json({ error: 'Invalid or expired reset token' });
      }

      const user = await RepoService.findUserByEmail(requestSession.email);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const salt = bcrypt.genSaltSync(10);
      const passwordHash = bcrypt.hashSync(newPassword, salt);

      const userId = user._id || user.id;
      await RepoService.updateUser(userId, { password: passwordHash });

      resetTokens.delete(token);

      return res.json({ message: 'Password has been successfully updated!' });
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
