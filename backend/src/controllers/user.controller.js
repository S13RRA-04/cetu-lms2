'use strict';
const userService = require('../services/user.service');
const authService = require('../services/auth.service');

async function list(req, res, next) {
  try {
    const result = await userService.listUsers(req.query);
    return res.json(result);
  } catch (err) { return next(err); }
}

async function getOne(req, res, next) {
  try {
    const user = await userService.getUserById(req.params.id);
    return res.json(user);
  } catch (err) { return next(err); }
}

async function create(req, res, next) {
  try {
    const user = await userService.createUser(req.body);
    return res.status(201).json(user);
  } catch (err) { return next(err); }
}

async function update(req, res, next) {
  try {
    const user = await userService.updateUser(req.params.id, req.body);
    return res.json(user);
  } catch (err) { return next(err); }
}

async function remove(req, res, next) {
  try {
    await userService.deleteUser(req.params.id);
    return res.status(204).send();
  } catch (err) { return next(err); }
}

async function changePassword(req, res, next) {
  try {
    const { current_password, new_password } = req.body;
    await authService.changePassword(req.params.id, current_password, new_password);
    return res.json({ message: 'Password updated' });
  } catch (err) { return next(err); }
}

async function resetPassword(req, res, next) {
  try {
    await authService.adminResetPassword(req.params.id, req.body.new_password);
    return res.json({ message: 'Password reset' });
  } catch (err) { return next(err); }
}

module.exports = { list, getOne, create, update, remove, changePassword, resetPassword };
