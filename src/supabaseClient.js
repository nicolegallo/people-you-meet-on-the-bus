import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://irvfzqzmhybmqgqnlnxx.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlydmZ6cXptaHlibXFncW5sbnh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwOTg2NTMsImV4cCI6MjA5ODY3NDY1M30.aFepTruegpyV-RWQPFKUuMIXOfE3W8XjXmMYZp1e9lU'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)