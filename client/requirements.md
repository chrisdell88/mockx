## Packages
framer-motion | Page transitions, list animations, and micro-interactions
recharts | Beautiful data visualization for ADP and Odds trend lines
date-fns | Date formatting and manipulation for charts
clsx | Utility for constructing className strings conditionally
tailwind-merge | Utility to efficiently merge Tailwind CSS classes

## Notes
- App uses a dark-mode first "financial terminal" aesthetic
- Data uses tabular numbers for stock-exchange feel
- Wouter is used for routing (Links do not wrap <a> tags)
- TanStack query endpoints fetch from /api/players, /api/players/:id/trends, and /api/mock-drafts
- Recharts is used with two Y-axes (one for ADP which is inverted since a lower draft pick is better, one for Odds)
