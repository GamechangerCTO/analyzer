import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const promptMappings = {
  'sales_call': 'sales_call_prompt.md',
  'appointment_setting': 'appointment_setting_prompt.md',
  'customer_service': 'customer_service_prompt.md',
  'follow_up_appointment_setting': 'follow_up_appointment_setting_prompt.md',
  'follow_up_before_proposal': 'follow_up_before_proposal_prompt.md',
  'follow_up_after_proposal': 'follow_up_after_proposal_prompt.md'
};

async function updatePrompts() {
  console.log('עידכון פרומפטים במסד הנתונים...');
  
  for (const [callType, fileName] of Object.entries(promptMappings)) {
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