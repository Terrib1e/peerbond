/**
 * Maya Interface - Redesigned therapeutic interface
 * Simplified, user-friendly design based on UX feedback
 */

import React from 'react';
import MayaInterfaceRedesigned from './MayaInterfaceRedesigned';

interface MayaInterfaceProps {
  memberId: string;
  className?: string;
  compact?: boolean;
  hideHeader?: boolean;
}

export default function MayaInterface({ memberId, className, compact, hideHeader }: MayaInterfaceProps) {
  // For compact mode, we can add a simplified version later
  // For now, always use the full redesigned interface
  
  return (
    <MayaInterfaceRedesigned 
      memberId={memberId} 
      className={className}
      hideHeader={hideHeader}
      onCrisisAlert={() => {
        // Could trigger app-wide crisis protocols here
        console.log('Crisis alert triggered for member:', memberId);
      }}
    />
  );
}