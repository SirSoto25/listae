// 32 random bytes in base64, like `openssl rand -base64 32` (validateAuthEnv).
process.env.AUTH_SECRET ??= "dGVzdC1vbmx5LXNlY3JldC1rM3Z4OXFtMnA3d3k0ejE=";
