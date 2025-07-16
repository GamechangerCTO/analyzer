import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;

async function loadFFmpeg() {
  if (ffmpeg) return ffmpeg;
  
  ffmpeg = new FFmpeg();
  
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.4/dist/umd';
  
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });
  
  return ffmpeg;
}

// פונקציה חדשה לחישוב משך אודיו
export async function getAudioDuration(audioFile: File | Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    try {
      // בדיקה אם אנחנו בסביבת דפדפן או שרת
      const isServer = typeof window === 'undefined';
      
      if (isServer) {
        // בסביבת שרת - השתמש רק בהערכה לפי גודל הקובץ
        const estimatedDuration = estimateDurationByFileSize(audioFile.size);
        console.log(`🕐 סביבת שרת: משתמש בהערכה לפי גודל קובץ: ${estimatedDuration} שניות`);
        resolve(estimatedDuration);
        return;
      }
      
      // בסביבת דפדפן - נסה לקבל משך מדויק
      const audio = new Audio();
      const url = URL.createObjectURL(audioFile);
      
      audio.addEventListener('loadedmetadata', () => {
        URL.revokeObjectURL(url);
        const duration = audio.duration;
        
        if (isNaN(duration) || duration === Infinity) {
          // אם לא מצליח לקבל duration, נשתמש בהערכה לפי גודל הקובץ
          const estimatedDuration = estimateDurationByFileSize(audioFile.size);
          console.log(`🕐 לא הצלחתי לקבל משך אודיו מדויק, משתמש בהערכה: ${estimatedDuration} שניות`);
          resolve(estimatedDuration);
        } else {
          console.log(`🕐 משך אודיו מדויק: ${duration} שניות`);
          resolve(duration);
        }
      });
      
      audio.addEventListener('error', () => {
        URL.revokeObjectURL(url);
        // במקרה של שגיאה, נשתמש בהערכה לפי גודל הקובץ
        const estimatedDuration = estimateDurationByFileSize(audioFile.size);
        console.log(`🕐 שגיאה בחישוב משך אודיו, משתמש בהערכה: ${estimatedDuration} שניות`);
        resolve(estimatedDuration);
      });
      
      audio.src = url;
      
      // timeout כדי למנוע המתנה אינסופית
      setTimeout(() => {
        URL.revokeObjectURL(url);
        const estimatedDuration = estimateDurationByFileSize(audioFile.size);
        console.log(`🕐 timeout בחישוב משך אודיו, משתמש בהערכה: ${estimatedDuration} שניות`);
        resolve(estimatedDuration);
      }, 10000); // 10 שניות timeout
      
    } catch (error) {
      console.error('שגיאה בחישוב משך אודיו:', error);
      const estimatedDuration = estimateDurationByFileSize(audioFile.size);
      console.log(`🕐 שגיאה בחישוב משך אודיו, משתמש בהערכה: ${estimatedDuration} שניות`);
      resolve(estimatedDuration);
    }
  });
}

// פונקציה להערכת משך אודיו לפי גודל הקובץ
function estimateDurationByFileSize(fileSizeBytes: number): number {
  // הערכה גסה: MP3 באיכות סטנדרטית (128kbps) = כ-1MB לדקה
  // M4A/AAC באיכות סטנדרטית = כ-0.7MB לדקה
  // WAV באיכות גבוהה = כ-10MB לדקה
  
  const fileSizeMB = fileSizeBytes / (1024 * 1024);
  
  // הערכה ממוצעת: 2MB לדקה (בין איכויות שונות)
  const estimatedMinutes = fileSizeMB / 2;
  const estimatedSeconds = Math.round(estimatedMinutes * 60);
  
  // גבולות סבירים: בין 10 שניות ל-30 דקות
  return Math.max(10, Math.min(1800, estimatedSeconds));
}

export async function convertAudioToMp3(audioFile: File): Promise<File> {
  const fileExtension = audioFile.name.split('.').pop()?.toLowerCase();
  
  // אם הקובץ כבר mp3 או wav, לא צריך להמיר
  if (fileExtension === 'mp3' || fileExtension === 'wav') {
    return audioFile;
  }
  
  // רק להמיר פורמטים נתמכים כולל WMA
  const supportedFormats = ['m4a', 'mp4', 'aac', 'webm', 'ogg', 'wma'];
  if (!supportedFormats.includes(fileExtension || '')) {
    throw new Error(`פורמט לא נתמך להמרה: ${fileExtension}`);
  }
  
  try {
    const ffmpeg = await loadFFmpeg();
    
    const inputName = `input.${fileExtension}`;
    const outputName = 'output.mp3';
    
    // כתיבת הקובץ לזיכרון של ffmpeg
    await ffmpeg.writeFile(inputName, await fetchFile(audioFile));
    
    // המרה ל-mp3
    await ffmpeg.exec([
      '-i', inputName,
      '-vn', // ללא וידאו
      '-ar', '44100', // sample rate
      '-ac', '2', // stereo
      '-b:a', '192k', // bitrate
      outputName
    ]);
    
    // קריאת הקובץ הממוחזר
    const data = await ffmpeg.readFile(outputName);
    
    // יצירת File object חדש
    const convertedFile = new File(
      [data], 
      audioFile.name.replace(/\.[^/.]+$/, '.mp3'), 
      { type: 'audio/mp3' }
    );
    
    return convertedFile;
    
  } catch (error) {
    console.error('שגיאה בהמרת אודיו:', error);
    throw new Error(`נכשלה המרת הקובץ מ-${fileExtension} ל-mp3: ${error}`);
  }
}

export function needsConversion(fileName: string): boolean {
  const fileExtension = fileName.split('.').pop()?.toLowerCase();
  const supportedDirectly = ['mp3', 'wav'];
  return !supportedDirectly.includes(fileExtension || '');
}

export function getSupportedFormats(): string[] {
  return ['mp3', 'wav', 'm4a', 'mp4', 'aac', 'webm', 'ogg', 'wma'];
} 