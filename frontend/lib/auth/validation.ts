export function validateEmail(value: string): string | null {
  if (!value.trim()) {
    return "Email is required.";
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(value.trim())) {
    return "Enter a valid email address.";
  }

  return null;
}

export function validatePassword(value: string): string | null {
  if (!value) {
    return "Password is required.";
  }
  if (value.length < 8) {
    return "Password must be at least 8 characters.";
  }
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) {
    return "Password must include at least one letter and one number.";
  }
  return null;
}

export function validateFullName(value: string): string | null {
  if (!value.trim()) {
    return "Full name is required.";
  }
  if (value.trim().length < 2) {
    return "Full name is too short.";
  }
  return null;
}

export function mapAuthErrorMessage(rawMessage: string): string {
  const normalized = rawMessage.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return "Invalid email or password.";
  }
  if (normalized.includes("email not confirmed")) {
    return "Please confirm your email before logging in.";
  }
  if (normalized.includes("already registered")) {
    return "This email is already registered. Please log in.";
  }
  if (normalized.includes("password should be at least")) {
    return "Password must be at least 8 characters.";
  }
  if (normalized.includes("database error saving new user")) {
    return "Signup reached Supabase, but a database trigger/profile insert failed. Check your Supabase SQL trigger/policies for new users.";
  }

  return rawMessage;
}
