import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://crmkfsetelysptocfbtd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNybWtmc2V0ZWx5c3B0b2NmYnRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNzAyNjYsImV4cCI6MjA3OTg0NjI2Nn0.a15o0PKhyCzn8VVOC3MhlMnMsuZ32EiC2QKEQQs6Jys';

export const supabase = createClient(supabaseUrl, supabaseKey);