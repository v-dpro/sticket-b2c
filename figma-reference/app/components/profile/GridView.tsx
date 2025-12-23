import React from 'react';
import { YearData } from './types';
import { CompactLogCard } from './CompactLogCard';

interface GridViewProps {
  data: YearData[];
}

export function GridView({ data }: GridViewProps) {
  const allLogs = data.flatMap((year) => year.logs);
  
  return (
    <div className="px-6 pb-6">
      <div className="grid grid-cols-2 gap-3">
        {allLogs.map((log) => (
          <CompactLogCard key={log.id} log={log} />
        ))}
      </div>
    </div>
  );
}
