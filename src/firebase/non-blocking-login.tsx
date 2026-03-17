'use client';
import type { Auth } from 'firebase/auth';

/** Initiate anonymous sign-in (non-blocking). */
export function initiateAnonymousSignIn(authInstance: Auth): void {
  // Dynamically import the auth method to avoid pulling firebase/auth into
  // server bundles during build.
  void import('firebase/auth').then((m) => m.signInAnonymously(authInstance)).catch(() => {});
}

/** Initiate email/password sign-up (non-blocking). */
export function initiateEmailSignUp(authInstance: Auth, email: string, password: string): void {
  void import('firebase/auth')
    .then((m) => m.createUserWithEmailAndPassword(authInstance, email, password))
    .catch(() => {});
}

/** Initiate email/password sign-in (non-blocking). */
export function initiateEmailSignIn(authInstance: Auth, email: string, password: string): void {
  void import('firebase/auth')
    .then((m) => m.signInWithEmailAndPassword(authInstance, email, password))
    .catch(() => {});
}
