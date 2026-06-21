import jwt from "jsonwebtoken";
import type { UserRole } from "@flowforge/shared";
import type { SignOptions } from "jsonwebtoken";

const secret = process.env.JWT_SECRET ?? "dev-secret";
const expiresIn = (process.env.JWT_EXPIRES_IN ?? "1d") as SignOptions["expiresIn"];

export type JwtPayload = {
  sub: string;
  email: string;
  role: UserRole;
};

export function signToken(payload: JwtPayload) {
  return jwt.sign(payload, secret, { expiresIn });
}

export function verifyToken(token: string) {
  return jwt.verify(token, secret) as JwtPayload;
}
