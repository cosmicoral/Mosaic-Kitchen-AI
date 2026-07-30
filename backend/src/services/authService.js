const bcrypt = require('bcrypt');
const userRepository = require('../repositories/userRepository');

const SALT_ROUNDS = 12;

async function signup(email, password) {
    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await userRepository.findByEmail(normalizedEmail);
    if (existingUser) {
    const error = new Error('Email already registered');
    error.code = 'EMAIL_TAKEN';
    throw error;
    }
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const newUser = await userRepository.create(normalizedEmail, passwordHash)
    return newUser
}


module.exports = { signup };