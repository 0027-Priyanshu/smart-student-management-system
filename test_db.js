const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://priyanshu200424:m9P4bC8gqRz6Dk32@cluster0.k2l5j.mongodb.net/edumanager?retryWrites=true&w=majority');
const Attendance = require('./backend/src/models/Attendance.ts');
const Student = require('./backend/src/models/Student.ts');

async function run() {
  // Use RepoService directly if possible
  const { RepoService } = require('./backend/src/services/repo.service.ts');
  const students = await RepoService.findStudents({}, 1, 10);
  console.log('Total students:', students.students.length);
  for (const s of students.students) {
    const logs = await RepoService.findAttendance({ studentId: s._id || s.id });
    const total = logs.length;
    const present = logs.filter(a => a.status === 'Present' || a.status === 'Late' || a.status === 'On Leave').length;
    const rate = total > 0 ? (present / total) * 100 : 100;
    console.log(`Student ${s.name}: Total logs=${total}, Present logs=${present}, Rate=${rate}`);
  }
  process.exit(0);
}
// since it requires ts-node, let's just write a ts script
