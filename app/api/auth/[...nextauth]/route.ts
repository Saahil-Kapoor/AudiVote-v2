import { prismaClient } from "@/app/lib/db";
import { PrismaClient } from "@prisma/client";
import { getPrismaClient } from "@prisma/client/runtime/library";
import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? ""
    })
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) {
        return false; // Block users without emails
      }

      try {
        await prismaClient.user.upsert({
          where: { email: user.email },
          update: {
            name: user.name, // Keep their name up to date
          },
          create: {
            email: user.email,
            name: user.name,
            // If you use the Provider enum from your schema:
            // provider: "Google", 
          },
        });
        return true; // Authorized
      } catch (e) {
        console.error("Database error during sign-in:", e);
        return false; // Deny access if DB is down
      }
    },

  }
})

export { handler as GET, handler as POST }