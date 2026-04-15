import "next-auth";
import { Types } from "mongoose";

declare module "next-auth" {
  interface Session {
    user: {
      fullName?: string;
      _id: string;
      username?: string;
    } & DefaultSession["user"];
  }

  interface User {
    _id?: Types.ObjectId;
    fullName?: string;
    username?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    _id?: string;
    fullName?: string;
    username?: string;
  }
}
