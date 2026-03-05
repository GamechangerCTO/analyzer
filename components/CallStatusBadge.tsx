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
          bg: 'bg-brand-info-light',
          text: 'text-brand-primary-dark',
          label: '📝 מתמלל',
          border: 'border-brand-info-light'
        };
      case 'analyzing_tone':
        return {
          bg: 'bg-brand-accent-light',
          text: 'text-brand-info-dark',
          label: '🎭 מנתח טונציה',
          border: 'border-brand-accent-light'
        };
      case 'analyzing_content':
        return {
          bg: 'bg-brand-info-light',
          text: 'text-brand-primary-dark',
          label: '📊 מנתח תוכן',
          border: 'border-brand-info-light'
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