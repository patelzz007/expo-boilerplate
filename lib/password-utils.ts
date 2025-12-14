export type PasswordStrength = "weak" | "fair" | "good" | "strong";

export interface PasswordRequirements {
  minLength: boolean;
  hasUpperCase: boolean;
  hasLowerCase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}

export const checkPasswordRequirements = (password: string): PasswordRequirements => {
  return {
    minLength: password.length >= 6,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };
};

export const calculatePasswordStrength = (password: string): PasswordStrength => {
  if (!password) return "weak";

  const requirements = checkPasswordRequirements(password);
  const metRequirements = Object.values(requirements).filter(Boolean).length;

  if (metRequirements <= 1) return "weak";
  if (metRequirements <= 2) return "fair";
  if (metRequirements <= 3) return "good";
  return "strong";
};

export const getStrengthColor = (strength: PasswordStrength): string => {
  switch (strength) {
    case "weak":
      return "#ef4444"; // red
    case "fair":
      return "#f97316"; // orange
    case "good":
      return "#eab308"; // yellow
    case "strong":
      return "#22c55e"; // green
  }
};

export const getStrengthLabel = (strength: PasswordStrength): string => {
  switch (strength) {
    case "weak":
      return "Weak";
    case "fair":
      return "Fair";
    case "good":
      return "Good";
    case "strong":
      return "Strong";
  }
};
