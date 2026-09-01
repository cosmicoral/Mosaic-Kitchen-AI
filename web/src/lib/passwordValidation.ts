export interface PasswordRequirement {
  label: string;
  met: boolean;
}

export function passwordRequirements(password: string): PasswordRequirement[] {
  return [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'One uppercase and one lowercase letter', met: /[A-Z]/.test(password) && /[a-z]/.test(password) },
    { label: 'One number', met: /\d/.test(password) },
    { label: 'One special character', met: /[^A-Za-z0-9\s]/.test(password) },
  ];
}

export function isStrongPassword(password: string): boolean {
  return password.length <= 200 && passwordRequirements(password).every(({ met }) => met);
}
