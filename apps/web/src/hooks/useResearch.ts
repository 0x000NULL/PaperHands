import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import type {
  NewsItem,
  EarningsRelease,
  EconomicEvent,
  AnalystRatings,
  SecFiling,
  InsiderSummary,
  CompanyFundamentals,
} from '../types';

// Query key factory
export const researchKeys = {
  all: ['research'] as const,
  marketNews: (category?: string) =>
    [...researchKeys.all, 'market-news', category] as const,
  companyNews: (symbol: string) =>
    [...researchKeys.all, 'company-news', symbol] as const,
  earnings: (from?: string, to?: string, symbol?: string) =>
    [...researchKeys.all, 'earnings', from, to, symbol] as const,
  economic: (from?: string, to?: string) =>
    [...researchKeys.all, 'economic', from, to] as const,
  analyst: (symbol: string) =>
    [...researchKeys.all, 'analyst', symbol] as const,
  filings: (symbol: string) =>
    [...researchKeys.all, 'filings', symbol] as const,
  insider: (symbol: string) =>
    [...researchKeys.all, 'insider', symbol] as const,
  fundamentals: (symbol: string) =>
    [...researchKeys.all, 'fundamentals', symbol] as const,
};

export function useMarketNews(category?: string, limit?: number) {
  return useQuery<NewsItem[]>({
    queryKey: researchKeys.marketNews(category),
    queryFn: () => api.getMarketNews(category, limit),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCompanyNews(symbol: string | null, enabled = true) {
  return useQuery<NewsItem[]>({
    queryKey: researchKeys.companyNews(symbol || ''),
    queryFn: () => api.getCompanyNews(symbol!),
    enabled: enabled && !!symbol,
    staleTime: 5 * 60 * 1000,
  });
}

export function useEarningsCalendar(
  from?: string,
  to?: string,
  symbol?: string,
) {
  return useQuery<EarningsRelease[]>({
    queryKey: researchKeys.earnings(from, to, symbol),
    queryFn: () => api.getEarningsCalendar(from, to, symbol),
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

export function useEconomicCalendar(from?: string, to?: string) {
  return useQuery<EconomicEvent[]>({
    queryKey: researchKeys.economic(from, to),
    queryFn: () => api.getEconomicCalendar(from, to),
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

export function useAnalystRatings(symbol: string | null, enabled = true) {
  return useQuery<AnalystRatings>({
    queryKey: researchKeys.analyst(symbol || ''),
    queryFn: () => api.getAnalystRatings(symbol!),
    enabled: enabled && !!symbol,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

export function useSecFilings(symbol: string | null, enabled = true) {
  return useQuery<SecFiling[]>({
    queryKey: researchKeys.filings(symbol || ''),
    queryFn: () => api.getSecFilings(symbol!),
    enabled: enabled && !!symbol,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

export function useInsiderTransactions(symbol: string | null, enabled = true) {
  return useQuery<InsiderSummary>({
    queryKey: researchKeys.insider(symbol || ''),
    queryFn: () => api.getInsiderTransactions(symbol!),
    enabled: enabled && !!symbol,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

export function useCompanyFundamentals(symbol: string | null, enabled = true) {
  return useQuery<CompanyFundamentals>({
    queryKey: researchKeys.fundamentals(symbol || ''),
    queryFn: () => api.getCompanyFundamentals(symbol!),
    enabled: enabled && !!symbol,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}
