const authService = require('../services/authService');

async function signup(req, res) {
    const { email, password } = req.body;
    if (typeof email !== 'string'|| typeof password !=='string'){
    return res.status(400).json({ error: 'email and password are required' });
    }
    try{
      const user = await authService.signup(email, password);
      return res.status(201).json({ user });}
      catch(error){if (error.code === 'EMAIL_TAKEN'){ 
      return res.status(409).json({ error: 'email already registered' });}
      console.error('Signup error:', error); 
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

module.exports = { signup };