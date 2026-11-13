const permissionRepository = require('../repositories/permission.repository');

class PermissionService {
  async verifyUserPermission(userId, requiredRole) {
    const user = await permissionRepository.getUserRole(userId);
    if (!user || user.status !== 'ACTIVE') return false;
    return user.role === requiredRole || user.role === 'MANAGER';
  }
}

module.exports = new PermissionService();
