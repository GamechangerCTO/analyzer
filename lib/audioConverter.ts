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

export async function convertAudioToMp3(audioFile: File): Promise<File> {
  const fileExtension = audioFile.name.split('.').pop()?.toLowerCase();
  
  // אם הקובץ כבר mp3 או wav, לא צריך להמיר
  if (fileExtension === 'mp3' || fileExtension === 'wav') {
    return audioFile;
  }
  
  // רק להמיר m4a, mp4, ופורמטים נתמכים אחרים
  const supportedFormats = ['m4a', 'mp4', 'aac', 'webm', 'ogg'];
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
  return ['mp3', 'wav', 'm4a', 'mp4', 'aac', 'webm', 'ogg'];
} 