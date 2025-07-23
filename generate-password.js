import bcrypt from 'bcryptjs';

async function generatePassword() {
  const password = 'admin123';

  console.log('Generating hash for password:', password);

  const hash = await bcrypt.hash(password, 10);
  console.log('Generated hash:', hash);

  // Test the hash
  const isValid = await bcrypt.compare(password, hash);
  console.log('Hash verification:', isValid);
}

generatePassword();