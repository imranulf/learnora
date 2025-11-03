import React from 'react';
import { Box, Typography, List, ListItem, ListItemText } from '@mui/material';
import type { ReassessmentSummaryData } from './types';

interface ReassessmentSummaryProps {
  data: ReassessmentSummaryData | null;
}

export default function ReassessmentSummary({ data }: ReassessmentSummaryProps) {
  if (!data || data.error) return null;

  const masteryDelta = data.mastery_delta || {};
  const entries = Object.entries(masteryDelta)
    .map(([skill, delta]) => ({ skill, delta: Number(delta) || 0 }))
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  
  const top = entries.slice(0, 3);
  const theta = data.reassessment?.theta;
  const abilityDelta = data.reassessment?.ability_delta;

  return (
    <Box>
      <Typography variant="body2" sx={{ m: 0 }}>
        {typeof abilityDelta === 'number' && typeof theta === 'number' ? (
          <>
            θ: {theta.toFixed(3)} ({abilityDelta >= 0 ? '+' : ''}
            {abilityDelta.toFixed(3)})
          </>
        ) : (
          'Reassessment completed.'
        )}
      </Typography>
      {top.length > 0 && (
        <List dense sx={{ mt: 0.5, pl: 2 }}>
          {top.map(({ skill, delta }) => (
            <ListItem key={skill} disablePadding>
              <ListItemText
                primary={`${skill}: ${delta >= 0 ? '+' : ''}${(delta * 100).toFixed(1)}%`}
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
}
