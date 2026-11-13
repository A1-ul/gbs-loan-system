import React from 'react';
import UserCountDropdownWidget from './UserCountDropdownWidget';

/**
 * Preserved module export: enforces strict click-to-open dropdown access
 * for authorized Admin / HR / Audit roles ONLY.
 */
export default function UserRegistrationCountWidget({ userRole }) {
  return <UserCountDropdownWidget userRole={userRole} />;
}
