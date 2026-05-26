'use strict';
const { ValidationError } = require('../utils/errors');

const validate = (schema, property = 'body') => (req, res, next) => {
  const { error, value } = schema.validate(req[property], { abortEarly: false, stripUnknown: true });
  if (error) {
    const details = error.details.map((d) => ({ field: d.context?.key, message: d.message }));
    return next(new ValidationError('Validation failed', details));
  }
  req[property] = value;
  return next();
};

module.exports = { validate };
