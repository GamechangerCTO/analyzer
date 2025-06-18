import React from 'react';

type CallStatusProps = {
  status: string | null;
};

/**
 * קומפוננט להצגת סטטוס שיחה
 */
export default function CallStatusBadge({ status }: CallStatusProps) {
  // קביעת סגנון ותיאור הסטטוס
  const getStatusStyles = () => {
    switch (status) {
      case 'completed':
        return {
          bg: 'bg-green-100',
          text: 'text-green-800',
          label: '✅ הושלם',
          border: 'border-green-200'
        };
      case 'error':
        return {
          bg: 'bg-red-100',
          text: 'text-red-800',
          label: '❌ שגיאה',
          border: 'border-red-200'
        };
      case 'pending':
        return {
          bg: 'bg-yellow-100',
          text: 'text-yellow-800',
          label: '⏳ ממתין',
          border: 'border-yellow-200'
        };
      case 'transcribing':
        return {
          bg: 'bg-blue-100',
          text: 'text-blue-800',
          label: '📝 מתמלל',
          border: 'border-blue-200'
        };
      case 'analyzing_tone':
        return {
          bg: 'bg-purple-100',
          text: 'text-purple-800',
          label: '🎭 מנתח טונציה',
          border: 'border-purple-200'
        };
      case 'analyzing_content':
        return {
          bg: 'bg-indigo-100',
          text: 'text-indigo-800',
          label: '📊 מנתח תוכן',
          border: 'border-indigo-200'
        };
      default:
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-800',
          label: '❓ לא ידוע',
          border: 'border-gray-200'
        };
    }
  };

  const { bg, text, label, border } = getStatusStyles();

  return (
    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border ${bg} ${text} ${border} shadow-sm`}>
      {label}
    </span>
  );
} 