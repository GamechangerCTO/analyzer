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
          label: 'הושלם'
        };
      case 'error':
        return {
          bg: 'bg-red-100',
          text: 'text-red-800',
          label: 'שגיאה'
        };
      case 'pending':
        return {
          bg: 'bg-yellow-100',
          text: 'text-yellow-800',
          label: 'ממתין'
        };
      case 'transcribing':
        return {
          bg: 'bg-blue-100',
          text: 'text-blue-800',
          label: 'מתמלל'
        };
      case 'analyzing_tone':
        return {
          bg: 'bg-purple-100',
          text: 'text-purple-800',
          label: 'מנתח טונציה'
        };
      case 'analyzing_content':
        return {
          bg: 'bg-indigo-100',
          text: 'text-indigo-800',
          label: 'מנתח תוכן'
        };
      default:
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-800',
          label: 'לא ידוע'
        };
    }
  };

  const { bg, text, label } = getStatusStyles();

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}>
      {label}
    </span>
  );
} 