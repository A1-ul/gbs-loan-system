const Joi = require('joi');

const createSchema = Joi.object({}).unknown(true);
const updateSchema = Joi.object({}).unknown(true);

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }
  next();
};

module.exports = {
  createSchema,
  updateSchema,
  validate,
};
