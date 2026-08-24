const MIN_AGE = 18
const MIN_PASSWORD_LENGTH = 8

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function isAdult(dateString) {
  if (!dateString) return false

  const birthDate = new Date(dateString)

  if (Number.isNaN(birthDate.getTime())) return false

  const today = new Date()

  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1
  }

  return age >= MIN_AGE
}

export function validateSignup({
  fullName,
  email,
  dui,
  dateOfBirth,
  password,
  confirmPassword,
  agreedToTerms,
}) {
  const errors = {}

  if (!fullName.trim()) {
    errors.fullName = 'Full name is required.'
  }

  if (!email.trim()) {
    errors.email = 'Email address is required.'
  } else if (!isValidEmail(email)) {
    errors.email = 'Enter a valid email address.'
  }

  if (!/^\d{8}-\d{1}$/.test(dui)) {
    errors.dui = 'Enter a valid DUI in the format 12345678-9.'
  }

  if (!dateOfBirth) {
    errors.dateOfBirth = 'Date of birth is required.'
  } else if (!isAdult(dateOfBirth)) {
    errors.dateOfBirth = 'You must be at least 18 years old.'
  }

  if (!password) {
    errors.password = 'Password is required.'
  } else if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = 'Password must be at least 8 characters.'
  }

  if (!confirmPassword) {
    errors.confirmPassword = 'Please confirm your password.'
  } else if (password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.'
  }

  if (!agreedToTerms) {
    errors.agreedToTerms =
      'You need to accept the Terms of Service and Privacy Policy.'
  }

  return errors
}