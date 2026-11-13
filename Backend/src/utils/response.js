const { HTTP_STATUS } = require('../constants');

function success(res, data, message = 'Success', statusCode = HTTP_STATUS.OK) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

function paginated(res, data, pagination, message = 'Success') {
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    message,
    data,
    pagination,
  });
}

function created(res, data, message = 'Created successfully') {
  return success(res, data, message, HTTP_STATUS.CREATED);
}

function noContent(res) {
  return res.status(HTTP_STATUS.NO_CONTENT).send();
}

function error(res, message, statusCode = HTTP_STATUS.INTERNAL_ERROR, code = 'ERROR', errors = null) {
  const body = { success: false, message, code };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
}

module.exports = {
  success,
  paginated,
  created,
  noContent,
  error,
};
