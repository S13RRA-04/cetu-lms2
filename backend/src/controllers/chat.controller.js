'use strict';
const { Op } = require('sequelize');
const { Enrollment, Cohort, Squad, User } = require('../models');
const { NotFoundError, AppError } = require('../utils/errors');
const chatService = require('../services/chat.service');

async function _getMyEnrollment(userId, courseId) {
  return Enrollment.findOne({
    where: { user_id: userId, course_id: courseId },
    include: [
      { model: Cohort, as: 'cohort', attributes: ['id', 'name'] },
      { model: Squad,  as: 'squad',  attributes: ['id', 'number', 'name'] },
    ],
  });
}

async function getToken(req, res, next) {
  try {
    const enrollment = await _getMyEnrollment(req.user.id, req.params.id);
    if (!enrollment) throw new NotFoundError('Enrollment');

    const credentials = await chatService.getCredentials(req.user, enrollment);
    return res.json(credentials);
  } catch (err) { return next(err); }
}

/* Cohort-mates the caller can start a direct message with — same cohort,
   excluding themselves. Scoped to cohort rather than the whole course so
   students only see people they actually share a training run with. */
async function listUsers(req, res, next) {
  try {
    const enrollment = await _getMyEnrollment(req.user.id, req.params.id);
    if (!enrollment) throw new NotFoundError('Enrollment');
    if (!enrollment.cohort_id) return res.json([]);

    const peers = await Enrollment.findAll({
      where: { course_id: req.params.id, cohort_id: enrollment.cohort_id, user_id: { [Op.ne]: req.user.id } },
      include: [{ model: User, attributes: ['id', 'first_name', 'last_name', 'role'] }],
    });

    const users = peers
      .map((e) => e.User)
      .filter(Boolean)
      .map((u) => ({ id: u.id, name: `${u.first_name} ${u.last_name}`.trim(), role: u.role }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return res.json(users);
  } catch (err) { return next(err); }
}

async function startDM(req, res, next) {
  try {
    const otherUserId = req.body.user_id;
    if (!otherUserId) throw new AppError('user_id is required', 400, 'BAD_REQUEST');

    const enrollment = await _getMyEnrollment(req.user.id, req.params.id);
    if (!enrollment) throw new NotFoundError('Enrollment');

    // Must share a cohort with the target user — same scoping as listUsers.
    const peer = await Enrollment.findOne({
      where: { course_id: req.params.id, cohort_id: enrollment.cohort_id, user_id: otherUserId },
      include: [{ model: User, attributes: ['id', 'first_name', 'last_name'] }],
    });
    if (!peer?.User) throw new NotFoundError('User');

    const result = await chatService.getOrCreateDM(req.user, otherUserId, `${peer.User.first_name} ${peer.User.last_name}`.trim());
    return res.json(result);
  } catch (err) { return next(err); }
}

module.exports = { getToken, listUsers, startDM };
