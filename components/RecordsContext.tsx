'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { ChatRecord } from '@/types';

const RecordsContext = createContext<ChatRecord[]>([]);

/** 記録は画面のあちこち（サイドバー・繋がるシート）から読むので context で配る。 */
export function RecordsProvider({ records, children }: { records: ChatRecord[]; children: ReactNode }) {
  return <RecordsContext.Provider value={records}>{children}</RecordsContext.Provider>;
}

export function useRecords(): ChatRecord[] {
  return useContext(RecordsContext);
}
