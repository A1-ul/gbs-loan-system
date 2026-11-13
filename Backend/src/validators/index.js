const Joi = require('joi');

const authSchemas = {
  register: Joi.object({
    email: Joi.string().email().required(),
    phone: Joi.string().pattern(/^\+?[0-9]{9,15}$/).required(),
    password: Joi.string().min(6).required(),
    firstName: Joi.string().min(2).required(),
    lastName: Joi.string().min(2).required(),
    role: Joi.string().optional().default('MEMBER_PORTAL'),
    tenantId: Joi.string().optional().allow('', null),
    tenantCode: Joi.string().optional().allow('', null),
    deviceFingerprint: Joi.string().optional().allow('', null),
  }),
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
    totpToken: Joi.string().length(6).optional().allow('', null),
    role: Joi.string().optional(),
    deviceFingerprint: Joi.string().optional().allow('', null),
  }),
  verifyOtp: Joi.object({
    phone: Joi.string().required(),
    otp: Joi.string().length(6).required(),
  }),
  resendOtp: Joi.object({
    phone: Joi.string().required(),
  }),
  refreshToken: Joi.object({
    refreshToken: Joi.string().required(),
  }),
  enable2FA: Joi.object({
    totpToken: Joi.string().length(6).required(),
  }),
};

const memberSchemas = {
  create: Joi.object({
    email: Joi.string().email().optional().allow('', null),
    phone: Joi.string().optional().allow('', null),
    password: Joi.string().min(6).optional().allow('', null),
    firstName: Joi.string().optional().allow('', null),
    lastName: Joi.string().optional().allow('', null),
    name: Joi.string().optional().allow('', null),
    ghanaCardNumber: Joi.string().optional().allow('', null),
    idNum: Joi.string().optional().allow('', null),
    idType: Joi.string().optional().allow('', null),
    dateOfBirth: Joi.date().optional().allow(null),
    occupation: Joi.string().optional().allow('', null),
    employer: Joi.string().optional().allow('', null),
    monthlyIncome: Joi.number().positive().optional().allow(null),
    address: Joi.string().optional().allow('', null),
    gpsLatitude: Joi.number().optional().allow(null),
    gpsLongitude: Joi.number().optional().allow(null),
  }),
  update: Joi.object({
    occupation: Joi.string().optional(),
    employer: Joi.string().optional(),
    monthlyIncome: Joi.number().positive().optional(),
    address: Joi.string().optional(),
    emergencyContact: Joi.string().optional(),
    emergencyPhone: Joi.string().optional(),
  }),
};

const loanSchemas = {
  apply: Joi.object({
    memberId: Joi.string().uuid().optional().allow('', null),
    loanProductId: Joi.string().uuid().optional().allow('', null),
    principalAmount: Joi.number().positive().required(),
    interestRate: Joi.number().positive().optional(),
    termMonths: Joi.number().integer().min(1).max(60).required(),
    purpose: Joi.string().optional().allow('', null),
    guarantorIds: Joi.array().items(Joi.string().uuid()).optional().default([]),
  }),
  review: Joi.object({
    action: Joi.string().valid('approve', 'reject').required(),
    notes: Joi.string().optional(),
    rejectionReason: Joi.string().when('action', { is: 'reject', then: Joi.required() }),
  }),
  disburse: Joi.object({
    notes: Joi.string().optional(),
  }),
};

const paymentSchemas = {
  create: Joi.object({
    loanId: Joi.string().uuid().required(),
    amount: Joi.number().positive().required(),
    method: Joi.string().valid('MOMO', 'BANK_TRANSFER', 'CASH').required(),
    momoPhone: Joi.string().when('method', { is: 'MOMO', then: Joi.required() }),
    bankReference: Joi.string().when('method', { is: 'BANK_TRANSFER', then: Joi.optional() }),
    notes: Joi.string().optional(),
  }),
  approveCash: Joi.object({
    paymentId: Joi.string().uuid().required(),
    approved: Joi.boolean().required(),
    notes: Joi.string().optional(),
  }),
};

const gpsSchemas = {
  updateLocation: Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
    speed: Joi.number().min(0).optional(),
    status: Joi.string().valid('ONLINE', 'OFFLINE', 'ON_ROUTE', 'AT_LOCATION', 'IDLE').optional(),
    accuracy: Joi.number().optional(),
    recordedAt: Joi.date().optional(),
    isOfflineSync: Joi.boolean().default(false),
  }),
  batchSync: Joi.object({
    locations: Joi.array().items(
      Joi.object({
        latitude: Joi.number().required(),
        longitude: Joi.number().required(),
        speed: Joi.number().optional(),
        status: Joi.string().optional(),
        recordedAt: Joi.date().required(),
      })
    ).min(1).required(),
  }),
};

const salarySchemas = {
  create: Joi.object({
    staffId: Joi.string().uuid().required(),
    month: Joi.number().integer().min(1).max(12).required(),
    year: Joi.number().integer().min(2020).required(),
    baseAmount: Joi.number().positive().required(),
    bonuses: Joi.number().min(0).default(0),
    deductions: Joi.number().min(0).default(0),
  }),
  pay: Joi.object({
    salaryId: Joi.string().uuid().required(),
    notes: Joi.string().optional(),
  }),
};

const meetingSchemas = {
  create: Joi.object({
    topic: Joi.string().required(),
    startTime: Joi.date().iso().required(),
    duration: Joi.number().integer().min(15).max(480).required(),
    password: Joi.string().optional(),
  }),
};

const reportSchemas = {
  generate: Joi.object({
    reportType: Joi.string().valid('loan', 'payment', 'collection', 'staff', 'guarantor', 'outstanding').required(),
    startDate: Joi.date().required(),
    endDate: Joi.date().required(),
    format: Joi.string().valid('json', 'csv', 'pdf').default('json'),
  }),
};

module.exports = {
  authSchemas,
  memberSchemas,
  loanSchemas,
  paymentSchemas,
  gpsSchemas,
  salarySchemas,
  meetingSchemas,
  reportSchemas,
};
