// Re-export firebase helpers and hooks from client-only modules.
// IMPORTANT: Avoid importing the Firebase JS SDK at module top-level here so
// that server-side builds (Next.js) do not accidentally bundle or execute
// Firebase SDK code. Client-only initialization happens inside the
// client-provider which dynamically imports the SDK at runtime.
export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
