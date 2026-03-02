import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { prismaClient } from "@/app/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;

      try {
        await prismaClient.user.upsert({
          where: { email: user.email },
          update: {
            name: user.name,
          },
          create: {
            email: user.email,
            name: user.name,
          },
        });

        return true;
      } catch (e) {
        console.error("Database error during sign-in:", e);
        return false;
      }
    },
  },
  secret: process.env.AUTH_SECRET,
});