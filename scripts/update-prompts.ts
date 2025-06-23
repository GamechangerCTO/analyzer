import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// Map of call types to their prompt files
const promptFiles: { [key: string]: string } = {
  'appointment_setting': 'appointment_setting_prompt.md',
  'sales_call': 'sales_call_prompt.md',
  'follow_up': 'follow_up_prompt.md',
  'service_call': 'service_call_prompt.md',
  'onboarding': 'onboarding_prompt.md',
  'renewal': 'renewal_prompt.md',
  'follow_up_after_offer': 'follow_up_after_proposal_prompt.md'
};

async function updatePrompts() {
  console.log('עידכון פרומפטים במסד הנתונים...');
  
  for (const [callType, fileName] of Object.entries(promptFiles)) {
    try {
      const filePath = path.join(process.cwd(), 'memory-bank', 'prompts', fileName);
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Extract system prompt content (everything after the title)
      const systemPrompt = content.replace(/^# System Prompt: .+\n\n/, '');
      
      console.log(`מעדכן ${callType}...`);
      
      const { error } = await supabase
        .from('prompts')
        .upsert({
          call_type: callType,
          system_prompt: systemPrompt,
          is_active: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'call_type'
        });
      
      if (error) {
        console.error(`שגיאה בעדכון ${callType}:`, error);
      } else {
        console.log(`✅ ${callType} עודכן בהצלחה`);
      }
    } catch (error) {
      console.error(`שגיאה בקריאת קובץ ${fileName}:`, error);
    }
  }
  
  console.log('סיום עדכון פרומפטים!');
}

updatePrompts(); 