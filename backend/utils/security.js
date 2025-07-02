import * as bcrypt from 'bcrypt';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';

// Configuración de rate limiting
export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10, // 5 intentos
    message: { 
        message: "Demasiados intentos de inicio de sesión. Por favor, intente nuevamente en 15 minutos.",
        success: false
    }
});

// Hash de contraseña
export const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
};

// Verificar contraseña
export const verifyPassword = async (password, hashedPassword) => {
    return bcrypt.compare(password, hashedPassword);
};

// Validaciones
export const registerValidation = [
    body('username')
        .trim()
        .isLength({ min: 3, max: 30 })
        .withMessage('El nombre de usuario debe tener entre 3 y 30 caracteres')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('El nombre de usuario solo puede contener letras, números y guiones bajos'),
    body('email')
        .isEmail()
        .withMessage('Correo electrónico inválido')
        .normalizeEmail(),
    body('password')
        .isLength({ min: 6 })
        .withMessage('La contraseña debe tener al menos 6 caracteres')
        .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).*$/)
        .withMessage('La contraseña debe contener al menos una mayúscula, una minúscula y un número'),
    body('id')
        .isInt({ min: 1 })
        .withMessage('El ID debe ser un número entero positivo')
];

export const loginValidation = [
    body('username')
        .trim()
        .notEmpty()
        .withMessage('El nombre de usuario es requerido'),
    body('password')
        .notEmpty()
        .withMessage('La contraseña es requerida')
];

// Middleware de validación
export const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            message: errors.array()[0].msg,
            success: false,
            errors: errors.array()
        });
    }
    next();
};
