const secret = process.env.JWT_SECRET;
const refreshSecret = process.env.JWT_REFRESH_SECRET;

if (!secret) {
  throw new Error("JWT_SECRET must be defined in .env file");
}

if (!refreshSecret) {
  throw new Error("JWT_REFRESH_SECRET must be defined in .env file");
}

export default {
  secret,
  expiresIn: "15m",
  refreshSecret,
  refreshExpiresIn: "7d"
};
