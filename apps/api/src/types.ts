import type { UserRole } from "@flowforge/shared";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

declare module "hono" {
  interface ContextVariableMap {
    user: AuthUser;
  }
}
