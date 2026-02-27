export function validateLogin({ mobile, password }) {
  if (!mobile?.trim()) return 'Mobile number is required';
  if (!password) return 'Password is required';
  return '';
}
