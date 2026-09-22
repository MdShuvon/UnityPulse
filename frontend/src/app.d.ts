// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
  namespace App {
    // interface Error {}
    interface Locals {
      user: {
        id: string;
        name: string;
        email: string;
        phone: string;
        role: string;
        bio: string | null;
        profilePhoto: string | null;
        dateOfBirth: string | null;
        gender: string | null;
        address: string | null;
        occupation: string | null;
        privacySettings: unknown; // Prisma-তে exact shape না দেখা পর্যন্ত unknown নিরাপদ
        isVerified: boolean;
        createdAt: string;
      } | null;
    }
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {};