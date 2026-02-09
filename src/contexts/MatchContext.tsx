import { createContext, useContext } from 'react';

export interface MatchContextValue {
  homeTeamColor: string;
  awayTeamColor: string;
}

const MatchContext = createContext<MatchContextValue | null>(null);

export function useMatchContext(): MatchContextValue | null {
  return useContext(MatchContext);
}

export { MatchContext };
