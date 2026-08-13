const jwt = require('jsonwebtoken');

const token = jwt.sign(
  {
    userId: '60d0fe4f5311236168a109ca', // Dummy Admin ID
    role: 'admin',
    email: 'admin@edumanager.com',
    name: 'Admin'
  },
  'super_secret_jwt_key_12345_dev',
  { expiresIn: '1h' }
);

console.log(token);
