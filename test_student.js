const jwt = require('jsonwebtoken');
const token = jwt.sign(
  { userId: '656565656565656565656565', role: 'Student', email: 'student@edumanager.com', name: 'Student' },
  'super_secret_jwt_key_12345_dev',
  { expiresIn: '1h' }
);
console.log(token);
