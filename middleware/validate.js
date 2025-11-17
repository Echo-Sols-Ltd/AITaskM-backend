const { body, validationResult } = require('express-validator');

const validateRegistration = [
  body('name').trim().notEmpty().withMessage('Name is required.'),
  body('email').isEmail().withMessage('Valid email is required.').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
  body('role').isIn(['admin', 'manager', 'employee', 'viewer']).withMessage('Role must be admin, manager, employee, or viewer.'),
];

const validateLogin = [
  body('email').isEmail().withMessage('Valid email is required.').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required.'),
];

const validateTask = [
  body('title').trim().notEmpty().withMessage('Title is required.'),
  body('assignedTo').optional().isMongoId().withMessage('assignedTo must be a valid user ID.'),
  body('priority').optional().isIn(['low', 'medium', 'high']),
  body('deadline').optional().isISO8601().toDate(),
];

const validateKPI = [
  body('name').trim().notEmpty().withMessage('KPI name is required.'),
  body('targetValue').isNumeric().withMessage('Target value must be a number.'),
  body('assignedTo').isMongoId().withMessage('assignedTo must be a valid user ID.'),
];

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

module.exports = {
  validateRegistration,
  validateLogin,
  validateTask,
  validateKPI,
  handleValidation,
};