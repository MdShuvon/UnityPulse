import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12; // 12 = production standard

export const hashPassword = async (plain: string): Promise<string> => {
  return bcrypt.hash(plain, SALT_ROUNDS);
};

export const comparePassword = async (
  plain: string,
  hashed: string
): Promise<boolean> => {
  return bcrypt.compare(plain, hashed);
};