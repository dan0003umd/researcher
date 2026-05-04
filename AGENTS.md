# AGENTS.md — Researcher Platform

## Project
Researcher is an academic research collaboration platform for UMD/AIM/UMIACS.
It connects students seeking research opportunities with professors and labs.

## Stack (NON-NEGOTIABLE — never suggest alternatives)
- Next.js 15 App Router, TypeScript strict mode
- Tailwind CSS v4 + shadcn/ui components
- Supabase: Auth (Google OAuth + institutional email verify), Postgres, pgvector, Storage
- tRPC for all API calls
- Vercel AI SDK for matching features
- Resend for transactional email
- Deployed on Vercel

## Code Rules
- Every file is TypeScript — no .js files ever
- Use server components by default; client components only when needed (mark with 'use client')
- All DB queries go through tRPC routers in /server/routers/
- Supabase client lives in /lib/supabase/ — never instantiate it elsewhere
- Use Zod for all input validation on tRPC procedures
- shadcn/ui components only — never write raw HTML form elements from scratch
- Tailwind only for styling — no inline styles, no CSS modules
- Every page needs proper loading.tsx and error.tsx siblings

## Auth Rules
- Google OAuth is Layer 1 (who you are)
- Institutional email verification is Layer 2 (affiliation)
- Users cannot create profiles until Layer 2 is complete
- Role is determined by institutional email domain + self-declaration

## Done When
- TypeScript compiles with zero errors
- No console.log left in production code
- Every tRPC procedure has Zod input validation
- Every protected route checks auth session