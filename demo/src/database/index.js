export { supabase } from './supabaseClient.js';
export { login, logout, getCurrentUser, getOperatorProfile, onAuthStateChange } from './auth.js';
export { createSubject, listSubjects, getSubject, deactivateSubject } from './subjects.js';
export { createSession, listSessionsForSubject } from './sessions.js';
export { uploadPlaythrough } from './uploadSession.js';
export { transformGameResult } from './metricsTransform.js';
