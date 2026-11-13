const salaryGroupingService = require('../services/salaryGrouping.service');
const logger = require('../../../utils/logger');

async function getSalaryProfile(req, res, next) {
  try {
    const { staffId } = req.params;
    const profile = await salaryGroupingService.getSalaryProfileByStaffId(staffId);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Salary profile not found for the given staff ID',
      });
    }

    return res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    logger.error('Error fetching salary profile:', error);
    next(error);
  }
}

async function upsertSalaryProfile(req, res, next) {
  try {
    const { staffId } = req.params;
    const approvedById = req.user?.id || null;

    const updatedProfile = await salaryGroupingService.updateOrCreateSalaryProfile(
      staffId,
      req.body,
      approvedById
    );

    return res.status(200).json({
      success: true,
      message: 'Salary profile updated successfully',
      data: updatedProfile,
    });
  } catch (error) {
    logger.error('Error updating salary profile:', error);
    next(error);
  }
}

async function seedDefaults(req, res, next) {
  try {
    await salaryGroupingService.seedSalaryDefaults();
    return res.status(200).json({
      success: true,
      message: 'Salary grouping default lookup tables seeded successfully',
    });
  } catch (error) {
    logger.error('Error seeding salary defaults:', error);
    next(error);
  }
}

module.exports = {
  getSalaryProfile,
  upsertSalaryProfile,
  seedDefaults,
};
