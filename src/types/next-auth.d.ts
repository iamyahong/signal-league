import { UserStatus } from "@prisma/client";
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      status: UserStatus;
      nickname: string;
      roles: string[];
    };
  }

  interface User {
    id?: string;
    status?: UserStatus;
    nickname?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    status?: UserStatus;
    nickname?: string;
    roles?: string[];
  }
}
