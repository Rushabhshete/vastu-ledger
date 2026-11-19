import "./loadEnv.js";

const security = {
  jwt: {
    accessSecret:    process.env.JWT_ACCESS_SECRET    || "dev-access-secret-change-me!!",
    refreshSecret:   process.env.JWT_REFRESH_SECRET   || "dev-refresh-secret-change-me!!",
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
    refreshExpiresIn:process.env.JWT_REFRESH_EXPIRES_IN|| "7d",
  },
  encryption: {
    // 64-hex-char = 32 bytes for AES-256
    key: Buffer.from(
      process.env.ENCRYPTION_KEY ||
        "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      "hex"
    ),
    algorithm: "aes-256-gcm",
  },
};

export default security;
