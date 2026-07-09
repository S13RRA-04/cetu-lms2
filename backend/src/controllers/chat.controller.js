'use strict';
const { Enrollment, Cohort, Squad } = require('../models');
const { NotFoundError } = require('../utils/errors');
const chatService = require('../services/chat.service');

async function getToken(req, res, next) {
  try {
    const enrollment = await Enrollment.findOne({
      where: { user_id: req.user.id, course_id: req.params.id },
      include: [
        { model: Cohort, as: 'cohort', attributes: ['id', 'name'] },
        { model: Squad,  as: 'squad',  attributes: ['id', 'number', 'name'] },
      ],
    });
    if (!enrollment) throw new NotFoundError('Enrollment');

    const credentials = await chatService.getCredentials(req.user, enrollment);
    return res.json(credentials);
  } catch (err) { return next(err); }
}

module.exports = { getToken };
