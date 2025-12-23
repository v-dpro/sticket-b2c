import React from 'react';
import { YearData } from './types';
import { YearHeaderCard } from './YearHeaderCard';
import { FeaturedLogCard } from './FeaturedLogCard';
import { CompactLogCard } from './CompactLogCard';
import { MilestoneCard } from './MilestoneCard';

interface TimelineViewProps {
  data: YearData[];
}

export function TimelineView({ data }: TimelineViewProps) {
  return (
    <div className="px-6 pb-6 space-y-8">
      {data.map((yearData) => (
        <div key={yearData.year}>
          {/* Year Header Card */}
          <YearHeaderCard yearData={yearData} />

          {/* Logs */}
          <div className="space-y-4">
            {yearData.logs.map((log, index) => {
              // Check for milestone after this log
              const milestone = yearData.milestones?.find(
                (m) => m.insertAfterLogId === log.id
              );

              return (
                <React.Fragment key={log.id}>
                  {/* Featured or Compact Card */}
                  {log.isFeatured ? (
                    <FeaturedLogCard log={log} />
                  ) : index % 2 === 0 && yearData.logs[index + 1] && !yearData.logs[index + 1].isFeatured ? (
                    <div className="grid grid-cols-2 gap-3">
                      <CompactLogCard log={log} />
                      {yearData.logs[index + 1] && (
                        <CompactLogCard log={yearData.logs[index + 1]} />
                      )}
                    </div>
                  ) : !log.isFeatured && (index === 0 || yearData.logs[index - 1].isFeatured || (index - 1) % 2 !== 0) ? (
                    <CompactLogCard log={log} />
                  ) : null}

                  {/* Milestone Card */}
                  {milestone && <MilestoneCard milestone={milestone} />}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
