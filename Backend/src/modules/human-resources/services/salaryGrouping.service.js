const { prisma } = require('../../../config/database');
const logger = require('../../../utils/logger');

/**
 * Service Band Mapping Rule:
 * 0–2 years: Band A
 * 3–5 years: Band B
 * 6–10 years: Band C
 * 11–15 years: Band D
 * 16–20 years: Band E
 * 21+ years: Executive Long Service
 */
function getServiceBandName(years) {
  if (years <= 2) return 'Band A';
  if (years <= 5) return 'Band B';
  if (years <= 10) return 'Band C';
  if (years <= 15) return 'Band D';
  if (years <= 20) return 'Band E';
  return 'Executive Long Service';
}

/**
 * Seed default Qualification Levels, Salary Grades, Steps, and Service Bands if empty
 */
async function seedSalaryDefaults() {
  try {
    const qualCount = await prisma.qualificationLevel.count();
    if (qualCount === 0) {
      await prisma.qualificationLevel.createMany({
        data: [
          { code: 'WASSCE', name: 'WASSCE / SHS Certificate', baseAllowance: 200.00 },
          { code: 'DIPLOMA', name: 'HND / Diploma', baseAllowance: 400.00 },
          { code: 'BACHELOR', name: 'BSc / BA Degree', baseAllowance: 800.00 },
          { code: 'MASTER', name: 'MSc / MBA Degree', baseAllowance: 1500.00 },
          { code: 'DOCTORATE', name: 'PhD / Doctorate', baseAllowance: 2500.00 },
        ],
      });
    }

    const bandCount = await prisma.serviceBand.count();
    if (bandCount === 0) {
      await prisma.serviceBand.createMany({
        data: [
          { bandName: 'Band A', minYears: 0, maxYears: 2, allowance: 100.00 },
          { bandName: 'Band B', minYears: 3, maxYears: 5, allowance: 300.00 },
          { bandName: 'Band C', minYears: 6, maxYears: 10, allowance: 600.00 },
          { bandName: 'Band D', minYears: 11, maxYears: 15, allowance: 1000.00 },
          { bandName: 'Band E', minYears: 16, maxYears: 20, allowance: 1500.00 },
          { bandName: 'Executive Long Service', minYears: 21, maxYears: 99, allowance: 2500.00 },
        ],
      });
    }

    const gradeCount = await prisma.salaryGrade.count();
    if (gradeCount === 0) {
      const grade1 = await prisma.salaryGrade.create({
        data: { gradeCode: 'GRADE-1', name: 'Entry Level Staff' },
      });
      const grade2 = await prisma.salaryGrade.create({
        data: { gradeCode: 'GRADE-2', name: 'Senior Staff / Officer' },
      });
      const grade3 = await prisma.salaryGrade.create({
        data: { gradeCode: 'GRADE-3', name: 'Management / Executive' },
      });

      await prisma.salaryStep.createMany({
        data: [
          { salaryGradeId: grade1.id, stepNumber: 1, amount: 2000.00 },
          { salaryGradeId: grade1.id, stepNumber: 2, amount: 2300.00 },
          { salaryGradeId: grade2.id, stepNumber: 1, amount: 3500.00 },
          { salaryGradeId: grade2.id, stepNumber: 2, amount: 4000.00 },
          { salaryGradeId: grade3.id, stepNumber: 1, amount: 6000.00 },
          { salaryGradeId: grade3.id, stepNumber: 2, amount: 7500.00 },
        ],
      });
    }

    logger.info('HR Salary Grouping defaults seeded successfully.');
  } catch (error) {
    logger.error('Error seeding salary defaults:', error);
  }
}

async function calculateYearsOfService(hireDate) {
  if (!hireDate) return 0;
  const diffMs = Date.now() - new Date(hireDate).getTime();
  const ageDate = new Date(diffMs);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
}

async function getSalaryProfileByStaffId(staffId) {
  return await prisma.employeeSalaryProfile.findUnique({
    where: { staffId },
    include: {
      staff: { include: { user: true } },
      qualificationLevel: true,
      salaryGrade: true,
      salaryStep: true,
      serviceBand: true,
      incrementHistory: { orderBy: { effectiveDate: 'desc' } },
    },
  });
}

async function updateOrCreateSalaryProfile(staffId, data, approvedById = null) {
  const staff = await prisma.staff.findUnique({ where: { id: staffId } });
  if (!staff) {
    throw new Error(`Staff record not found for ID: ${staffId}`);
  }

  const yearsOfService = await calculateYearsOfService(staff.hireDate);
  const bandName = getServiceBandName(yearsOfService);

  let serviceBand = await prisma.serviceBand.findUnique({ where: { bandName } });
  if (!serviceBand) {
    await seedSalaryDefaults();
    serviceBand = await prisma.serviceBand.findUnique({ where: { bandName } });
  }

  const qualification = data.qualificationLevelId
    ? await prisma.qualificationLevel.findUnique({ where: { id: data.qualificationLevelId } })
    : null;

  const step = data.salaryStepId
    ? await prisma.salaryStep.findUnique({ where: { id: data.salaryStepId }, include: { salaryGrade: true } })
    : null;

  const baseStepAmount = step ? Number(step.amount) : Number(staff.baseSalary || 0);
  const qualAllowance = qualification ? Number(qualification.baseAllowance) : 0;
  const bandAllowance = serviceBand ? Number(serviceBand.allowance) : 0;
  const branchAllowance = Number(data.branchAllowance || 0);
  const respAllowance = Number(data.responsibilityAllowance || 0);
  const houseTransAllowance = Number(data.housingTransportAllowance || 0);
  const perfBonus = Number(data.performanceBonus || 0);

  const totalComputed =
    baseStepAmount +
    qualAllowance +
    bandAllowance +
    branchAllowance +
    respAllowance +
    houseTransAllowance +
    perfBonus;

  const existingProfile = await prisma.employeeSalaryProfile.findUnique({ where: { staffId } });

  let profile;
  if (existingProfile) {
    profile = await prisma.employeeSalaryProfile.update({
      where: { staffId },
      data: {
        qualificationLevelId: data.qualificationLevelId || existingProfile.qualificationLevelId,
        salaryGradeId: step?.salaryGradeId || existingProfile.salaryGradeId,
        salaryStepId: data.salaryStepId || existingProfile.salaryStepId,
        serviceBandId: serviceBand?.id || existingProfile.serviceBandId,
        yearsOfService,
        branchAllowance,
        responsibilityAllowance: respAllowance,
        housingTransportAllowance: houseTransAllowance,
        performanceBonus: perfBonus,
        totalComputedSalary: totalComputed,
      },
      include: { qualificationLevel: true, salaryGrade: true, salaryStep: true, serviceBand: true },
    });

    if (existingProfile.totalComputedSalary !== totalComputed) {
      await prisma.salaryIncrementHistory.create({
        data: {
          employeeSalaryProfileId: profile.id,
          previousSalary: existingProfile.totalComputedSalary,
          newSalary: totalComputed,
          previousGrade: existingProfile.salaryGradeId,
          newGrade: profile.salaryGradeId,
          previousStep: existingProfile.salaryStepId ? 1 : 0,
          newStep: profile.salaryStepId ? 1 : 0,
          reason: data.reason || 'Annual salary progression review',
          approvedById,
        },
      });
    }
  } else {
    profile = await prisma.employeeSalaryProfile.create({
      data: {
        staffId,
        qualificationLevelId: data.qualificationLevelId,
        salaryGradeId: step?.salaryGradeId,
        salaryStepId: data.salaryStepId,
        serviceBandId: serviceBand?.id,
        yearsOfService,
        branchAllowance,
        responsibilityAllowance: respAllowance,
        housingTransportAllowance: houseTransAllowance,
        performanceBonus: perfBonus,
        totalComputedSalary: totalComputed,
      },
      include: { qualificationLevel: true, salaryGrade: true, salaryStep: true, serviceBand: true },
    });
  }

  return profile;
}

module.exports = {
  seedSalaryDefaults,
  getServiceBandName,
  getSalaryProfileByStaffId,
  updateOrCreateSalaryProfile,
};
