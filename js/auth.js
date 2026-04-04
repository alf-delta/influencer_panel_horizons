// ============================================================
// Horizons Influencer Panel — Auth (Supabase email/password)
// ============================================================

import { getConfig } from './config.js';

let _supabase = null;

async function getClient() {
  if (_supabase) return _supabase;
  const { supabaseUrl, supabaseKey } = getConfig();
  if (!supabaseUrl || !supabaseKey) return null;
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  _supabase = createClient(supabaseUrl, supabaseKey);
  return _supabase;
}

export async function getSession() {
  const client = await getClient();
  if (!client) return null;
  const { data } = await client.auth.getSession();
  return data?.session ?? null;
}

export async function signIn(email, password) {
  const client = await getClient();
  if (!client) throw new Error('Supabase not configured');
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signUp(email, password) {
  const client = await getClient();
  if (!client) throw new Error('Supabase not configured');
  const { data, error } = await client.auth.signUp({ email, password });
  if (error) throw error;
  // Check if email confirmation is required
  if (data.user && !data.session) return { needsConfirmation: true };
  return { session: data.session };
}

export async function signOut() {
  const client = await getClient();
  if (!client) return;
  await client.auth.signOut();
}

export async function onAuthChange(callback) {
  const client = await getClient();
  if (!client) return;
  client.auth.onAuthStateChange((_event, session) => callback(session));
}
