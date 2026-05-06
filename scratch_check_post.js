require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('posts')
    .select('id, title, featured_image, feature_image, category')
    .eq('id', 'sat-reading-logic-patterns')
    .single();
  
  if (error) {
    console.error('Error fetching post:', error);
  } else {
    console.log('Post data:', data);
  }
}

check();
