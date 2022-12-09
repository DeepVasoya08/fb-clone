import bcrypt from "bcrypt";

const encrypt = async (password) => {
  const salt = await bcrypt.genSalt(10);
  const hashedPass = await bcrypt.hash(password, salt);

  return hashedPass;
};

const decrypt = async (password, user) => {
  const validatePass = await bcrypt.compare(password, user.password);
  return validatePass;
};

export { encrypt, decrypt };
