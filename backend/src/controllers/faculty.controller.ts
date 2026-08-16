import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { RepoService } from '../services/repo.service';
import { uploadFile } from '../services/cloudinary.service';
import { emitLiveUpdate } from '../config/socket';

export class FacultyController {
  static async getFaculties(req: Request, res: Response, next: NextFunction) {
    try {
      const showDeleted = req.query.isDeleted === 'true';
      const faculties = await RepoService.findFaculties({ isDeleted: showDeleted });
      return res.json({ faculties });
    } catch (error) {
      next(error);
    }
  }

  static async getFacultyById(req: Request, res: Response, next: NextFunction) {
    try {
      const faculty = await RepoService.findFacultyById(req.params.id);
      if (!faculty) {
        return res.status(404).json({ error: 'Faculty profile not found' });
      }
      return res.json({ faculty });
    } catch (error) {
      next(error);
    }
  }

  static async createFaculty(req: Request, res: Response, next: NextFunction) {
    try {
      const requester = (req as any).user;
      const { name, email, password, department, designation, assignedCourses, avatarUrl } = req.body;

      const cleanEmail = email.toLowerCase().trim();
      const existingUser = await RepoService.findUserByEmail(cleanEmail);
      if (existingUser) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      // P1-7 & P1-8: Support custom password or auto-generate
      const effectivePassword = (password && typeof password === 'string' && password.trim().length >= 6)
        ? password.trim()
        : name.split(' ')[0].toLowerCase() + '123';

      const salt = bcrypt.genSaltSync(10);
      const passwordHash = bcrypt.hashSync(effectivePassword, salt);

      // 1. Create User account
      const user = await RepoService.createUser({
        name,
        email: cleanEmail,
        password: passwordHash,
        role: 'Faculty',
        avatarUrl: avatarUrl || '',
        isVerified: true
      });

      const userId = user._id || user.id;

      // 2. Create Faculty profile
      const faculty = await RepoService.createFaculty({
        userId,
        name,
        email: cleanEmail,
        department,
        designation,
        avatarUrl: avatarUrl || '',
        assignedCourses: assignedCourses || [],
        isDeleted: false
      });

      // 3. If assigned courses provided, link them
      if (Array.isArray(assignedCourses) && assignedCourses.length > 0) {
        for (const cId of assignedCourses) {
          try {
            await RepoService.assignCourseToFaculty(faculty._id || faculty.id, cId);
          } catch (e) {
            console.error(`Failed to assign course ${cId} to faculty:`, e);
          }
        }
      }

      // Log Activity
      await RepoService.createLog({
        userId: requester.userId,
        userName: requester.name,
        role: requester.role,
        action: 'Faculty Created',
        details: `Created new faculty member: ${name} (${designation} - ${department})`
      });

      emitLiveUpdate('dashboard_update', { action: 'faculty_added' });

      return res.status(201).json({
        message: 'Faculty created successfully',
        faculty,
        defaultPassword: effectivePassword
      });
    } catch (error) {
      next(error);
    }
  }

  static async assignCourse(req: Request, res: Response, next: NextFunction) {
    try {
      const requester = (req as any).user;
      const { facultyId, courseId } = req.body;

      const faculty = await RepoService.findFacultyById(facultyId);
      if (!faculty) {
        return res.status(404).json({ error: 'Faculty profile not found' });
      }

      const course = await RepoService.findCourseById(courseId);
      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }

      await RepoService.assignCourseToFaculty(facultyId, courseId);

      // Log Activity
      await RepoService.createLog({
        userId: requester.userId,
        userName: requester.name,
        role: requester.role,
        action: 'Faculty Assigned',
        details: `Assigned course ${course.code} to faculty ${faculty.name}`
      });

      return res.json({ message: 'Course successfully assigned to faculty!' });
    } catch (error) {
      next(error);
    }
  }

  static async getFacultyStudents(req: Request, res: Response, next: NextFunction) {
    try {
      const requester = (req as any).user;
      const faculty = await RepoService.findFacultyById(req.params.id);
      if (!faculty) {
        return res.status(404).json({ error: 'Faculty profile not found' });
      }

      // P1-9: Faculty RBAC - A faculty member can only query their own student roster
      if (requester.role === 'Faculty') {
        const facultyUserId = (faculty.userId?._id || faculty.userId?.id || faculty.userId || '').toString();
        if (facultyUserId !== requester.userId.toString()) {
          return res.status(403).json({ error: 'Access denied: You can only view student rosters for your own assigned courses.' });
        }
      } else if (requester.role === 'Student') {
        return res.status(403).json({ error: 'Access denied: Students cannot access faculty rosters.' });
      }

      const courseIds: string[] = faculty.assignedCourses?.map((c: any) => c._id?.toString() || c.id?.toString() || c.toString()) || [];

      // Find all active students who are enrolled in any of these courses
      const { students } = await RepoService.findStudents({ isDeleted: false }, 1, 1000);
      
      const assignedStudents = students.filter((s: any) => {
        const studentCourses: string[] = s.enrolledCourses?.map((c: any) => c._id?.toString() || c.id?.toString() || c.toString()) || [];
        return studentCourses.some(cid => courseIds.includes(cid));
      });

      return res.json({ students: assignedStudents });
    } catch (error) {
      next(error);
    }
  }

  static async deleteFaculty(req: Request, res: Response, next: NextFunction) {
    try {
      const requester = (req as any).user;
      const faculty = await RepoService.findFacultyById(req.params.id);
      if (!faculty) {
        return res.status(404).json({ error: 'Faculty profile not found' });
      }

      await RepoService.deleteFaculty(req.params.id);

      // Log Activity
      await RepoService.createLog({
        userId: requester.userId,
        userName: requester.name,
        role: requester.role,
        action: 'Faculty Deleted (Soft)',
        details: `Soft deleted faculty profile: ${faculty.name}`
      });

      return res.json({ message: 'Faculty profile soft-deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async restoreFaculty(req: Request, res: Response, next: NextFunction) {
    try {
      const requester = (req as any).user;
      const faculty = await RepoService.findFacultyById(req.params.id);
      if (!faculty) {
        return res.status(404).json({ error: 'Faculty profile not found' });
      }

      await RepoService.restoreFaculty(req.params.id);

      // Log Activity
      await RepoService.createLog({
        userId: requester.userId,
        userName: requester.name,
        role: requester.role,
        action: 'Faculty Restored',
        details: `Restored faculty profile: ${faculty.name}`
      });

      return res.json({ message: 'Faculty profile restored successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async updateFaculty(req: Request, res: Response, next: NextFunction) {
    try {
      const requester = (req as any).user;
      const { name, department, designation, avatarUrl, assignedCourses } = req.body;

      const faculty = await RepoService.findFacultyById(req.params.id);
      if (!faculty) {
        return res.status(404).json({ error: 'Faculty profile not found' });
      }

      const updateData: any = {};
      if (name) updateData.name = name;
      if (department) updateData.department = department;
      if (designation) updateData.designation = designation;
      if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
      if (assignedCourses !== undefined) updateData.assignedCourses = assignedCourses;

      await RepoService.updateFaculty(req.params.id, updateData);

      // Update User name/avatarUrl if changed
      const facultyUserId = faculty.userId?._id || faculty.userId?.id || faculty.userId;
      if (facultyUserId && (name || avatarUrl !== undefined)) {
        await RepoService.updateUser(facultyUserId.toString(), {
          ...(name && { name }),
          ...(avatarUrl !== undefined && { avatarUrl })
        });
      }

      // Log Activity
      await RepoService.createLog({
        userId: requester.userId,
        userName: requester.name,
        role: requester.role,
        action: 'Faculty Updated',
        details: `Updated faculty profile: ${faculty.name} (${designation || faculty.designation})`
      });

      return res.json({ message: 'Faculty profile updated successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async uploadAvatar(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Avatar image file is required' });
      }

      const allowedImageExtensions = ['jpg', 'jpeg', 'png', 'webp'];
      const fileExt = req.file.originalname.split('.').pop()?.toLowerCase();
      
      if (!req.file.mimetype.startsWith('image/') || !allowedImageExtensions.includes(fileExt || '')) {
        return res.status(400).json({ error: 'Unsupported image format. Please upload PNG, JPG, JPEG or WEBP.' });
      }

      const secureUrl = await uploadFile(req.file.path, 'avatars');

      return res.json({ url: secureUrl });
    } catch (error) {
      next(error);
    }
  }
}
