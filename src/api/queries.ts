import { useInfiniteQuery, useMutation, useQueries, useQuery, useQueryClient, type InfiniteData, type UseQueryResult } from '@tanstack/react-query';
import { api, ApiError, unwrap } from './client';
import { LIVE_RECONNECTED_EVENT, useTopic } from './live';
import type {
  ChatMembershipView,
  ChatRoomView,
  ChatView,
  CompanyView,
  HistorizedListingDataView,
  ListingView,
  ListingWithTradingVolumeView,
  MessageView,
  ListingProfile,
  OrderCheck,
  OrderbookView,
  PortfolioSummary,
  PortfolioView,
  PriceSpreadView,
  SearchResult,
  SecuritiesAccountDetailsView,
  SecurityOrderLogEntryView,
  SecurityOrderWithVolumeView,
  ShareholderView,
  TradingMatrixItemView,
  UserAccountView,
  UsernameView,
} from './types';
import { useEffect } from 'react';
import type { ApiMessage } from '../lib/messages';
import { mergeTrades } from '../app/tape';
import { NOTE_TYPE, referrerOf, type NoteRequest, type UserChange } from '../me/account';
import type { AddOrderQuery } from '../orders/derive';
import type { CompanyHistograms, HistoryEntry } from '../companies/profile';
import type {
  AchievementItem,
  AllianceMembership,
  BalanceSheetView,
  BondView,
  EtfView,
  IndexView as IndexDetails,
  CashTransferLogEntry,
  CentralBankReserves,
  Employment,
  Listing,
  CompanyDevelopmentView,
  HighscoreEntry,
  HighscoreType,
  ListingShareView,
  MinerView,
  Poll,
  SecurityOrderView,
  Suggestion,
  TradeLogEntry,
  TradeSummaryView,
} from '../../vendor/bankiersgruen';
import type { Sponsorship, WriteRequest } from '../companies/derive';
import type { Sponsor, SponsoringGoal } from '../sponsoring/derive';

const LIVE = 15_000; // prices, spread, order book
const SLOW = 60_000;

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => unwrap<UserAccountView>(api.GET('/api/user')),
    staleTime: Infinity,
  });
}

export function usePortfolioSummary() {
  return useQuery({
    queryKey: ['portfolio', 'summary'],
    queryFn: () => unwrap<PortfolioSummary>(api.GET('/api/v2/my/portfolio/summary')),
    refetchInterval: SLOW,
  });
}

export function usePortfolio() {
  return useQuery({
    queryKey: ['portfolio'],
    queryFn: () => unwrap<PortfolioView>(api.GET('/api/v2/my/portfolio')),
    refetchInterval: SLOW,
  });
}

/** Companies the player runs as CEO – they can trade for them. */
export function useMyCompanies(userId: string | undefined) {
  return useQuery({
    queryKey: ['companies', 'ceo', userId],
    enabled: !!userId,
    queryFn: () =>
      unwrap<CompanyView[]>(api.GET('/api/companies/ceo/userid/{userId}', { params: { path: { userId: userId! } } })),
    staleTime: SLOW,
  });
}

export function useListingProfile(asin: string) {
  return useQuery({
    queryKey: ['listingprofile', asin],
    enabled: !!asin,
    queryFn: () =>
      unwrap<ListingProfile>(
        api.GET('/api/listingprofiles/{securityIdentifier}', { params: { path: { securityIdentifier: asin } } }),
      ),
    refetchInterval: SLOW,
  });
}

export function usePriceSpread(asin: string) {
  return useQuery({
    queryKey: ['pricespread', asin],
    enabled: !!asin,
    queryFn: () =>
      unwrap<PriceSpreadView>(
        api.GET('/api/pricespreads/{securityIdentifier}', { params: { path: { securityIdentifier: asin } } }),
      ),
    refetchInterval: LIVE,
  });
}

export function useOrderbook(asin: string) {
  return useQuery({
    queryKey: ['orderbook', asin],
    enabled: !!asin,
    queryFn: () =>
      unwrap<OrderbookView>(
        api.GET('/api/orderbook/{securityIdentifier}', { params: { path: { securityIdentifier: asin } } }),
      ),
    refetchInterval: LIVE,
  });
}

export function useShareholders(asin: string) {
  return useQuery({
    queryKey: ['shareholders', asin],
    enabled: !!asin,
    queryFn: () =>
      unwrap<ShareholderView[]>(
        api.GET('/api/shareholders/{securityIdentifier}', { params: { path: { securityIdentifier: asin } } }),
      ),
    staleTime: SLOW,
  });
}

export function useTrades(asin: string, size = 50) {
  return useQuery({
    queryKey: ['trades', asin, size],
    queryFn: async () => {
      const page = await unwrap<{ content: SecurityOrderLogEntryView[] }>(
        api.GET('/api/v2/securityorderlogs/by-asin/{asin}', {
          params: { path: { asin }, query: { pageable: { page: 0, size, sort: ['date,desc'] } } },
          querySerializer: pageableSerializer,
        }),
      );
      return page.content;
    },
    refetchInterval: LIVE,
  });
}

/** Daily candles, oldest first. */
export function useDailyHistory(asin: string) {
  return useQuery({
    queryKey: ['history', asin],
    enabled: !!asin,
    queryFn: async () => {
      const page = await unwrap<{ content: HistorizedListingDataView[] }>(
        api.GET('/api/v2/historizedlistingdata/{securityIdentifier}', {
          params: { path: { securityIdentifier: asin }, query: { pageable: { page: 0, size: 365, sort: ['date,desc'] } } },
          querySerializer: pageableSerializer,
        }),
      );
      return [...page.content].reverse();
    },
    staleTime: SLOW,
  });
}

export function useSearch(query: string) {
  const q = query.trim();
  return useQuery({
    queryKey: ['search', q],
    enabled: q.length >= 2,
    queryFn: () =>
      unwrap<SearchResult[]>(api.GET('/api/multisearch/{searchString}', { params: { path: { searchString: q } } })),
    staleTime: SLOW,
  });
}

// ---------- Organisation ----------

type Page<T> = { content: T[]; totalElements: number };
type Pageable = { page?: number; size?: number; sort?: string[] };

/** GET on a Spring-paged endpoint; the spec types it loosely, so the caller names the row type. */
function getPage<T>(path: string, query: Record<string, unknown> & { pageable?: Pageable } = {}) {
  const { pageable = { page: 0, size: 50 }, ...rest } = query;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return unwrap<Page<T>>((api.GET as any)(path, { params: { query: { ...rest, pageable } }, querySerializer: pageableSerializer }));
}

export function useSuggestions() {
  return useQuery({
    queryKey: ['suggestions'],
    queryFn: () => getPage<Suggestion>('/api/v2/suggestions', { pageable: { page: 0, size: 20 } }),
    refetchInterval: SLOW,
  });
}

/** Open orders of one securities account (without the account the API lists everybody's). */
export function useOpenOrders(securitiesAccountId: string | undefined) {
  return useQuery({
    queryKey: ['orders', securitiesAccountId],
    enabled: !!securitiesAccountId,
    queryFn: () =>
      getPage<SecurityOrderView>('/api/v2/securityorders', {
        securitiesAccountId,
        pageable: { page: 0, size: 100, sort: ['creationDate,desc'] },
      }),
    refetchInterval: LIVE,
  });
}

export function useDeleteOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) =>
      unwrap(api.DELETE('/api/securityorders/{orderId}', { params: { path: { orderId } } })),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['orders'] });
      void qc.invalidateQueries({ queryKey: ['portfolio'] });
    },
  });
}

export function useOrderLogs(securitiesAccountId: string | undefined, size = 50) {
  return useQuery({
    queryKey: ['orderlogs', securitiesAccountId, size],
    enabled: !!securitiesAccountId,
    queryFn: () =>
      getPage<TradeLogEntry>('/api/v2/securityorderlogs', {
        securitiesAccountId,
        pageable: { page: 0, size, sort: ['date,desc'] },
      }),
    refetchInterval: SLOW,
  });
}

export function useTradeSummary(securitiesAccountId: string | undefined) {
  return useQuery({
    queryKey: ['tradesummary', securitiesAccountId],
    enabled: !!securitiesAccountId,
    queryFn: () =>
      unwrap<TradeSummaryView>(
        api.GET('/api/v2/trades/stats/summary', { params: { query: { securitiesAccountId } } }),
      ),
    staleTime: SLOW,
  });
}

export function useCompanyDevelopment() {
  return useQuery({
    queryKey: ['companydevelopment'],
    queryFn: () => getPage<CompanyDevelopmentView>('/api/v2/my/companydevelopment', { pageable: { page: 0, size: 50 } }),
    staleTime: SLOW,
  });
}

export function useEmpireShares() {
  return useQuery({
    queryKey: ['empireshares'],
    queryFn: () => getPage<ListingShareView>('/api/v2/my/companiesbyempireshare', { pageable: { page: 0, size: 50 } }),
    staleTime: SLOW,
  });
}

export function useTakeovers() {
  return useQuery({
    queryKey: ['takeovers'],
    queryFn: () => getPage<ListingShareView>('/api/v2/my/takeoverpossibilities', { pageable: { page: 0, size: 20 } }),
    staleTime: SLOW,
  });
}

// ---------- Market ----------

/** GET /api/v2/minimalstats */
export interface MinimalStats {
  numberOfTrades24h: number;
  tradeVolume24h: number;
  numberOfCompanies: number;
  numberOfOnlineUsers: number;
  numberOfUsers: number;
}

export function useMinimalStats() {
  return useQuery({
    queryKey: ['minimalstats'],
    queryFn: () => unwrap<MinimalStats>(api.GET('/api/v2/minimalstats')),
    refetchInterval: SLOW,
  });
}

/** Price spread row as the market lists return it (listing + spread + last price). */
export interface MarketRow {
  listing: { name: string; securityIdentifier: string; type: string; startDate?: number; endDate?: number | null };
  bidPrice?: number | null;
  bidSize?: number | null;
  askPrice?: number | null;
  askSize?: number | null;
  lastPrice?: { value: number; date: number } | null;
  priceChangeInPercent?: number;
  count?: number;
  /** Bonds: yield per day at the ask (yield to maturity ÷ days left), see security/derive dailyYield */
  yieldPerDay?: number | null;
  /** Bonds: maturity in ms */
  maturityDate?: number;
}

/** Biggest price moves (winners, or losers with `losers`). */
export function useBigMovers(losers: boolean) {
  return useQuery({
    queryKey: ['movers', losers],
    queryFn: () =>
      getPage<MarketRow>('/api/v2/securitieswithbigpricechanges', { losersFirst: losers, pageable: { page: 0, size: 50 } }),
    refetchInterval: SLOW,
  });
}

export function useMostTraded(type?: string, size = 12) {
  return useQuery({
    queryKey: ['mosttraded', type, size],
    queryFn: () => getPage<MarketRow>('/api/v2/mostfrequentlytradedsecurities', { type, pageable: { page: 0, size } }),
    refetchInterval: SLOW,
  });
}

/** Fulltext search over names and ASINs, with spreads (GET /api/v2/pricespreads?search=). */
export function useSpreadSearch(search: string, size = 100) {
  const q = search.trim();
  return useQuery({
    queryKey: ['spreadsearch', q, size],
    enabled: q.length >= 2,
    queryFn: () => getPage<MarketRow>('/api/v2/pricespreads', { search: q, pageable: { page: 0, size } }),
    placeholderData: (prev) => prev,
    staleTime: LIVE,
  });
}

/** The latest ~1000 trades of the whole market (GET /api/securityorderlogs without filter). */
export function useMarketTrades() {
  return useQuery({
    queryKey: ['markettrades'],
    queryFn: () => unwrap<SecurityOrderLogEntryView[]>(api.GET('/api/securityorderlogs')),
    refetchInterval: LIVE,
  });
}

/**
 * Market trades for the tape: first the last two minutes, then only what came after the newest
 * known trade (GET /api/securityorderlogs?startDate=) – a few KB per poll instead of 1.000 trades.
 */
export function useRecentTrades() {
  const qc = useQueryClient();
  return useQuery({
    queryKey: ['recenttrades'],
    queryFn: async () => {
      const prev = qc.getQueryData<SecurityOrderLogEntryView[]>(['recenttrades']) ?? [];
      const since = prev[0]?.date ?? Date.now() - 120_000;
      const fresh = await unwrap<SecurityOrderLogEntryView[]>(
        api.GET('/api/securityorderlogs', { params: { query: { startDate: String(since) } } }),
      );
      return mergeTrades(fresh, prev);
    },
    refetchInterval: LIVE,
  });
}

const byAsin = (results: UseQueryResult<ListingView>[]) =>
  Object.fromEntries(results.flatMap((r) => (r.data?.securityIdentifier ? [[r.data.securityIdentifier, r.data]] : []))) as Record<string, ListingView>;

/** One listing (name, type), kept for the session – also for prefetching. */
export const listingQuery = (asin: string) => ({
  queryKey: ['listing', asin],
  queryFn: () => unwrap<ListingView>(api.GET('/api/listings/{securityIdentifier}', { params: { path: { securityIdentifier: asin } } })),
  staleTime: Infinity,
  gcTime: Infinity,
  retry: false,
});

/** Listings by ASIN (name, type), fetched one by one and kept for the session. */
export function useListings(asins: string[]) {
  return useQueries({ queries: asins.map(listingQuery), combine: byAsin });
}

// ---------- Highscores ----------

export type HighscoreKind = 'user' | 'company' | 'alliance';

export function useHighscores(kind: HighscoreKind, type: HighscoreType, page: number, search = '', size = 50) {
  const q = search.trim();
  return useQuery({
    queryKey: ['highscores', kind, type, page, q, size],
    queryFn: () =>
      getPage<HighscoreEntry>(`/api/v2/${kind}highscores`, {
        highscoreType: type,
        search: q || undefined,
        pageable: { page, size },
      }),
    placeholderData: (prev) => prev,
    staleTime: SLOW,
  });
}

export interface HighscoreHistoryEntry {
  value: number;
  date: number;
  position: number;
}

/** Position history of one player/company/alliance in one category, oldest first. */
export function useHighscoreHistory(type: HighscoreType, entityId: string | undefined, size = 90) {
  return useQuery({
    queryKey: ['highscorehistory', type, entityId, size],
    enabled: !!entityId,
    queryFn: async () => {
      const p = await getPage<HighscoreHistoryEntry>('/api/v2/highscorehistoryentries', {
        highscoreType: type,
        entityId,
        pageable: { page: 0, size, sort: ['date,desc'] },
      });
      return [...p.content].reverse();
    },
    staleTime: SLOW,
  });
}

// ---------- Notifications ----------

export interface NotificationItem {
  id: string;
  subject?: ApiMessage;
  content?: ApiMessage;
  date?: number;
  readByReceiver?: boolean;
}

export function useUnreadNotifications() {
  return useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => unwrap<number>(api.GET('/api/v2/notifications/unread/count')),
    refetchInterval: SLOW,
  });
}

export function useNotifications(enabled: boolean) {
  return useQuery({
    queryKey: ['notifications', 'list'],
    enabled,
    queryFn: () =>
      getPage<NotificationItem>('/api/v2/notifications', { pageable: { page: 0, size: 50, sort: ['date,desc'] } }),
    refetchInterval: SLOW,
  });
}

export function useNotificationActions() {
  const qc = useQueryClient();
  const done = () => qc.invalidateQueries({ queryKey: ['notifications'] });
  return {
    read: useMutation({
      mutationFn: (id: string) =>
        unwrap(api.PUT('/api/v2/notifications/{notificationId}', { params: { path: { notificationId: id }, query: { isRead: true } } })),
      onSuccess: done,
    }),
    readAll: useMutation({
      mutationFn: () => unwrap(api.PUT('/api/v2/notifications', { params: { query: { isRead: true } } })),
      onSuccess: done,
    }),
    remove: useMutation({
      mutationFn: (id: string) =>
        unwrap(api.DELETE('/api/v2/notifications/{notificationId}', { params: { path: { notificationId: id } } })),
      onSuccess: done,
    }),
  };
}

// ---------- Players ----------

/** GET /api/userprofiles/{username} (only the parts the profile shows). */
export interface UserProfile {
  user: UsernameView;
  employments: { id: string; company: { name: string; securityIdentifier?: string }; startDate?: number; dailyWage: number }[];
}

export function useUserProfile(username: string) {
  return useQuery({
    queryKey: ['userprofile', username],
    enabled: !!username,
    queryFn: () =>
      unwrap<UserProfile>(api.GET('/api/userprofiles/{username}', { params: { path: { username } } })),
    staleTime: SLOW,
  });
}

export function useCeoCompaniesByName(username: string) {
  return useQuery({
    queryKey: ['companies', 'ceo', 'name', username],
    queryFn: () =>
      unwrap<CompanyView[]>(api.GET('/api/companies/ceo/username/{username}', { params: { path: { username } } })),
    staleTime: SLOW,
  });
}

export function useUserAchievements(username: string) {
  return useQuery({
    queryKey: ['achievements', 'user', username],
    enabled: !!username,
    queryFn: async () => {
      const [done, progress] = await Promise.all([
        unwrap<AchievementItem[]>(api.GET('/api/v2/userachievements/{username}', { params: { path: { username } } })),
        unwrap<AchievementItem[]>(api.GET('/api/v2/userachievementprogress/{username}', { params: { path: { username } } })),
      ]);
      return { done, progress };
    },
    staleTime: SLOW,
  });
}

/** Alliance membership of a player (404/empty when none). */
export interface AllianceMembershipView {
  id: string;
  role: 'MEMBER' | 'PRESS_OFFICER' | 'DEPUTY' | 'OWNER';
  online?: boolean;
  alliance: { id: string; name: string; chatId?: string; index?: { securityIdentifier: string } };
}

export function useAllianceOf(username: string) {
  return useQuery({
    queryKey: ['alliancemembership', username],
    queryFn: async () => {
      try {
        return await unwrap<AllianceMembershipView | null>(
          api.GET('/api/v2/alliancememberships/username', { params: { query: { username } } }),
        );
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    },
    staleTime: SLOW,
  });
}

// ---------- Alliances ----------

export interface AllianceView {
  id: string;
  name: string;
  description?: string;
  logoUrl?: string;
  chatId?: string;
  dateCreated?: number;
  achievementCount?: number;
  achievementTotal?: number;
  numberOfMembers?: number;
  index?: { name: string; securityIdentifier: string };
}

export function useAlliance(id: string) {
  return useQuery({
    queryKey: ['alliance', id],
    queryFn: () => unwrap<AllianceView>(api.GET('/api/v2/alliances/{allianceId}', { params: { path: { allianceId: id } } })),
    staleTime: SLOW,
  });
}

export function useAllianceMembers(allianceId: string) {
  return useQuery({
    queryKey: ['alliance', allianceId, 'members'],
    queryFn: () =>
      unwrap<AllianceMembership[]>(api.GET('/api/v2/alliancememberships', { params: { query: { allianceId } } })),
    staleTime: SLOW,
  });
}

export function useAlliances() {
  return useQuery({
    queryKey: ['alliances'],
    queryFn: () => getPage<AllianceView>('/api/v2/alliances', { pageable: { page: 0, size: 100 } }),
    staleTime: SLOW,
  });
}

// ---------- News ----------

/** PostView (news, comments, board posts); content is HTML. */
export interface PostView {
  id: string;
  title: string;
  content?: string;
  locale?: string | null;
  author?: UsernameView;
  company?: { id: string; name: string; securityIdentifier?: string } | null;
  alliance?: { id: string; name: string } | null;
  listing?: { name: string; securityIdentifier: string; type?: string } | null;
  hashTags?: { tag: string }[];
  numberOfLikes?: number;
  numberOfDislikes?: number;
  numberOfComments?: number;
  dateCreated?: number;
  dateEdited?: number | null;
  parent?: string | null;
}

export function useNews(search: string, enabled = true) {
  const q = search.trim();
  return useInfiniteQuery({
    queryKey: ['news', q],
    enabled,
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      getPage<PostView>('/api/v2/news', { search: q || undefined, pageable: { page: pageParam, size: 20, sort: ['dateCreated,desc'] } }),
    getNextPageParam: (last, all) => (all.length * 20 < last.totalElements ? all.length : undefined),
    staleTime: SLOW,
  });
}

export function useHotNews(count = 10) {
  return useQuery({
    queryKey: ['news', 'hot', count],
    queryFn: () => unwrap<PostView[]>(api.GET('/api/v2/news/hot', { params: { query: { count } } })),
    staleTime: SLOW,
  });
}

export function useNewsPost(postId: string | undefined) {
  return useQuery({
    queryKey: ['news', 'post', postId],
    enabled: !!postId,
    queryFn: () => unwrap<PostView>(api.GET('/api/v2/news/{postId}', { params: { path: { postId: postId! } } })),
    staleTime: SLOW,
  });
}

export function useComments(postId: string | undefined) {
  return useQuery({
    queryKey: ['news', 'comments', postId],
    enabled: !!postId,
    queryFn: async () => {
      const r = await unwrap<PostView[] | { content: PostView[] }>(
        api.GET('/api/v2/posts/{postId}/comments', { params: { path: { postId: postId! } } }),
      );
      const list = Array.isArray(r) ? r : r.content;
      return [...list].sort((a, b) => (a.dateCreated ?? 0) - (b.dateCreated ?? 0));
    },
    staleTime: SLOW,
  });
}

export function useLikes(postId: string | undefined) {
  return useQuery({
    queryKey: ['news', 'likes', postId],
    enabled: !!postId,
    queryFn: () =>
      unwrap<{ id: string; type: 'LIKE' | 'DISLIKE'; user: UsernameView }[]>(
        api.GET('/api/v2/likes/{postId}', { params: { path: { postId: postId! } } }),
      ),
    staleTime: SLOW,
  });
}

export function useReact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, type }: { postId: string; type: 'LIKE' | 'DISLIKE' | null }) =>
      type
        ? unwrap(api.PUT('/api/v2/my/likes/{postId}', { params: { path: { postId }, query: { type } } }))
        : unwrap(api.DELETE('/api/v2/my/likes/{postId}', { params: { path: { postId } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['news'] }),
  });
}

export function useCreateComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, title, html }: { postId: string; title: string; html: string }) =>
      unwrap(
        api.POST('/api/v2/posts/{postId}/comments', {
          params: { path: { postId }, query: { title } },
          body: html,
        }),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['news'] }),
  });
}

// ---------- Miner, achievements, bank ----------

export function useMiner() {
  return useQuery({
    queryKey: ['miner'],
    queryFn: () => unwrap<MinerView>(api.GET('/api/v2/my/miner')),
    refetchInterval: SLOW,
  });
}

export function useMinerActions() {
  const qc = useQueryClient();
  const done = () => {
    void qc.invalidateQueries({ queryKey: ['miner'] });
    void qc.invalidateQueries({ queryKey: ['portfolio'] });
    void qc.invalidateQueries({ queryKey: ['suggestions'] });
  };
  return {
    transfer: useMutation({ mutationFn: () => unwrap(api.PUT('/api/v2/my/cointransfer')), onSuccess: done }),
    upgrade: useMutation({ mutationFn: () => unwrap(api.PUT('/api/v2/my/minerupgrade')), onSuccess: done }),
  };
}

export function useUnclaimedAchievements() {
  return useQuery({
    queryKey: ['achievements', 'unclaimed'],
    queryFn: () => unwrap<AchievementItem[]>(api.GET('/api/v2/my/notyetclaimeduserachievements')),
    refetchInterval: SLOW,
  });
}

export function useClaimAchievements() {
  const qc = useQueryClient();
  const done = () => {
    void qc.invalidateQueries({ queryKey: ['achievements'] });
    void qc.invalidateQueries({ queryKey: ['portfolio'] });
    void qc.invalidateQueries({ queryKey: ['suggestions'] });
  };
  return {
    one: useMutation({
      mutationFn: (achievementId: string) =>
        unwrap(api.PUT('/api/v2/my/userachievementclaim/{achievementId}', { params: { path: { achievementId } } })),
      onSuccess: done,
    }),
    all: useMutation({ mutationFn: () => unwrap(api.PUT('/api/v2/my/userachievementclaim')), onSuccess: done }),
  };
}

export function useMyBankAccounts() {
  return useQuery({
    queryKey: ['bankaccounts'],
    queryFn: () => unwrap<{ id: string; cash: number }[]>(api.GET('/api/v2/my/bankaccounts')),
    refetchInterval: SLOW,
  });
}

export function useCashLogs(bankAccountId: string | undefined) {
  return useQuery({
    queryKey: ['cashlogs', bankAccountId],
    enabled: !!bankAccountId,
    queryFn: () =>
      getPage<CashTransferLogEntry>(`/api/v2/cashtransferlogs/${bankAccountId}`, {
        pageable: { page: 0, size: 100, sort: ['date,desc'] },
      }),
    staleTime: SLOW,
  });
}

export function useBankTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (t: { senderBankAccountId: string; receiverBankAccountId: string; cashAmount: number }) =>
      unwrap(
        api.PUT('/api/v2/banktransfer/{senderBankAccountId}', {
          params: {
            path: { senderBankAccountId: t.senderBankAccountId },
            query: { receiverBankAccountId: t.receiverBankAccountId, cashAmount: String(t.cashAmount) },
          },
        }),
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['cashlogs'] });
      void qc.invalidateQueries({ queryKey: ['bankaccounts'] });
      void qc.invalidateQueries({ queryKey: ['portfolio'] });
      void qc.invalidateQueries({ queryKey: ['companies'] });
    },
  });
}

// ---------- Polls ----------

export type PollFilter = 'NOT_VOTED' | 'PARTIALLY_VOTED' | 'VOTED' | 'INITIATED';

export function useMyPolls(filter: PollFilter) {
  return useQuery({
    queryKey: ['polls', filter],
    queryFn: () =>
      getPage<Poll>('/api/v2/my/polls', {
        ...(filter === 'INITIATED' ? { selfInitiated: true, votingStatus: 'ALL' } : { votingStatus: filter }),
        pageable: { page: 0, size: 50, sort: ['startDate,desc'] },
      }),
    refetchInterval: SLOW,
  });
}

export function usePollActions() {
  const qc = useQueryClient();
  const done = () => {
    void qc.invalidateQueries({ queryKey: ['polls'] });
    void qc.invalidateQueries({ queryKey: ['suggestions'] });
  };
  return {
    vote: useMutation({
      mutationFn: ({ pollId, type, voices }: { pollId: string; type: 'YES' | 'NO'; voices: number }) =>
        unwrap(api.POST('/api/v2/polls/{pollId}', { params: { path: { pollId }, query: { voices, votingType: type } } })),
      onSuccess: done,
    }),
    voteAll: useMutation({
      mutationFn: ({ type, onlyHarmless }: { type: 'YES' | 'NO'; onlyHarmless: boolean }) =>
        unwrap(api.POST('/api/v2/polls', { params: { query: { votingType: type, onlyHarmless } } })),
      onSuccess: done,
    }),
    execute: useMutation({
      mutationFn: (pollId: string) => unwrap(api.PUT('/api/v2/polls/{pollId}', { params: { path: { pollId } } })),
      onSuccess: done,
    }),
    remove: useMutation({
      mutationFn: (pollId: string) => unwrap(api.DELETE('/api/v2/polls/{pollId}', { params: { path: { pollId } } })),
      onSuccess: done,
    }),
  };
}

// ---------- Forum ----------

export interface BoardView {
  id: string;
  name: string;
  description?: string | null;
  numberOfPosts?: number;
  numberOfSubboards?: number;
  numberOfMembers?: number;
  parent?: { id: string; name: string } | null;
  /** top board of a sub-board – memberships (and member counts) belong to it */
  root?: { id: string; name: string; publicBoard?: boolean } | null;
  latestPost?: PostView | null;
  publicBoard?: boolean;
  dateCreated?: number;
}

export function useBoards() {
  return useQuery({
    queryKey: ['forum', 'boards'],
    queryFn: () => getPage<BoardView>('/api/v2/messageboards', { pageable: { page: 0, size: 100 } }),
    staleTime: SLOW,
  });
}

export function useBoard(boardId: string) {
  return useQuery({
    queryKey: ['forum', 'board', boardId],
    queryFn: () => unwrap<BoardView>(api.GET('/api/v2/messageboards/{boardId}', { params: { path: { boardId } } })),
    staleTime: SLOW,
  });
}

export function useSubboards(boardId: string) {
  return useQuery({
    queryKey: ['forum', 'subboards', boardId],
    queryFn: () =>
      getPage<BoardView>(`/api/v2/messageboards/${boardId}/subboards`, { pageable: { page: 0, size: 100 } }),
    staleTime: SLOW,
  });
}

export function useBoardPosts(boardId: string, page: number, search = '') {
  const q = search.trim();
  return useQuery({
    queryKey: ['forum', 'posts', boardId, page, q],
    queryFn: () =>
      getPage<PostView>(`/api/v2/messageboards/${boardId}/posts`, {
        search: q || undefined,
        pageable: { page, size: 30, sort: ['dateCreated,desc'] },
      }),
    placeholderData: (prev) => prev,
    staleTime: SLOW,
  });
}

export function usePost(postId: string | undefined) {
  return useQuery({
    queryKey: ['news', 'post', 'any', postId],
    enabled: !!postId,
    queryFn: () => unwrap<PostView>(api.GET('/api/v2/posts/{postId}', { params: { path: { postId: postId! } } })),
    staleTime: SLOW,
  });
}

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ title, html, messageBoardId }: { title: string; html: string; messageBoardId?: string }) =>
      unwrap<PostView>(api.POST('/api/v2/posts', { params: { query: { title, messageBoardId } }, body: html })),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['forum'] });
      void qc.invalidateQueries({ queryKey: ['news'] });
    },
  });
}

// ---------- Companies ----------

/** GET /api/companyprofiles/{companyId} – the parts the profile shows. */
export interface CompanyProfile {
  id: string;
  name: string;
  securityIdentifier: string;
  logoUrl?: string | null;
  marketMakerPolicy?: 'OPEN' | 'CLOSED';
  achievementCount?: number;
  achievementTotal?: number;
  outstandingShares?: number;
  marketCap?: number;
  lastPrice?: { value: number; date: number } | null;
  listing?: { name: string; securityIdentifier: string; type: string; startDate?: number };
  bankAccount?: { id: string; cash: number };
  ceo?: UsernameView | null;
  ceoEmploymentAgreement?: { dailyWage?: number; startDate?: number } | null;
  companyCapabilities?: {
    bookValue?: number;
    bookValuePerShare?: number;
    netCash?: number;
    netCashPerShare?: number;
    reserves?: number;
    maxCentralBankLoans?: number;
    takenCentralBankLoans?: number;
    bank?: boolean;
    bankReady?: boolean;
  };
}

export interface CompanyHistoryPoint {
  date: string;
  bookValue: number;
  netCash: number;
  cash: number;
  cashFlow: number;
  bookValuePerShare?: number;
  fairValuePerShare?: number;
}

const companyByAsin = (asin: string) => ({
  queryKey: ['company', 'asin', asin],
  enabled: !!asin,
  queryFn: async () => {
    const c = await unwrap<CompanyView>(
      api.GET('/api/companies/securityIdentifier/{securityIdentifier}', { params: { path: { securityIdentifier: asin } } }),
    );
    return unwrap<CompanyProfile>(api.GET('/api/companyprofiles/{companyId}', { params: { path: { companyId: c.id! } } }));
  },
  staleTime: SLOW,
});

export function useCompanyByAsin(asin: string) {
  return useQuery(companyByAsin(asin));
}

/** Several company profiles at once (e.g. the largest banks), by ASIN; shared cache with useCompanyByAsin. */
export function useCompaniesByAsin(asins: string[]) {
  return useQueries({
    queries: asins.map(companyByAsin),
    combine: (results) => results.map((r) => r.data),
  });
}

export function useCompanyHistory(asin: string, days = 90) {
  return useQuery({
    queryKey: ['company', 'history', asin, days],
    queryFn: async () => {
      const p = await getPage<CompanyHistoryPoint>(`/api/v2/historizedcompanydata/${asin}`, {
        pageable: { page: 0, size: days, sort: ['date,desc'] },
      });
      return [...p.content].reverse();
    },
    staleTime: SLOW,
  });
}

export function useBalanceSheets(companyId: string | undefined) {
  return useQuery({
    queryKey: ['company', 'balancesheets', companyId],
    enabled: !!companyId,
    queryFn: () =>
      getPage<BalanceSheetView>(`/api/v2/companies/${companyId}/balancesheets`, {
        pageable: { page: 0, size: 30, sort: ['date,desc'] },
      }),
    staleTime: SLOW,
  });
}

export function useCompanyNews(companyId: string | undefined) {
  return useQuery({
    queryKey: ['company', 'news', companyId],
    enabled: !!companyId,
    queryFn: () =>
      getPage<PostView>(`/api/v2/companies/${companyId}/news`, { pageable: { page: 0, size: 20, sort: ['dateCreated,desc'] } }),
    staleTime: SLOW,
  });
}

export function useCompanyPolls(companyId: string | undefined) {
  return useQuery({
    queryKey: ['company', 'polls', companyId],
    enabled: !!companyId,
    queryFn: () => unwrap<Poll[]>(api.GET('/api/v2/companies/{companyId}/polls', { params: { path: { companyId: companyId! } } })),
    staleTime: SLOW,
  });
}

export function useCompanyAchievements(companyId: string | undefined) {
  return useQuery({
    queryKey: ['company', 'achievements', companyId],
    enabled: !!companyId,
    queryFn: () =>
      unwrap<AchievementItem[]>(api.GET('/api/v2/companyachievements/{companyId}', { params: { path: { companyId: companyId! } } })),
    staleTime: SLOW,
  });
}

/** Starts a corporate-action poll (capital increase, dividend, …). Endpoints come from DS.CORPORATE_ACTIONS. */
export function useCorporateAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ endpoint, params }: { endpoint: string; params: Record<string, string | number> }) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      unwrap((api.POST as any)(`/api${endpoint}`, { params: { query: params } })),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['company'] });
      void qc.invalidateQueries({ queryKey: ['polls'] });
    },
  });
}

export function useFoundCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (q: { name: string; cashDeposit: string; customAsin?: string; customNumberOfShares?: number }) =>
      unwrap<CompanyView>(api.POST('/api/companies', { params: { query: q } })),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['companies'] });
      void qc.invalidateQueries({ queryKey: ['portfolio'] });
    },
  });
}

// ---------- Asset classes ----------

/** Bond or system bond behind a listing (null when matured and gone). */
export function useBond(asin: string | undefined, type: string | undefined) {
  const system = type === 'SYSTEM_BOND' || type === 'SYSTEM_REPO';
  return useQuery({
    queryKey: ['bond', asin],
    enabled: !!asin,
    queryFn: async () => {
      try {
        return await unwrap<BondView>(
          system
            ? api.GET('/api/systembonds/securityidentifier/{securityIdentifier}', { params: { path: { securityIdentifier: asin! } } })
            : api.GET('/api/bonds/securityidentifier/{securityIdentifier}', { params: { path: { securityIdentifier: asin! } } }),
        );
      } catch (e) {
        if (e instanceof ApiError && e.status < 500) return null;
        throw e;
      }
    },
    staleTime: SLOW,
  });
}

/**
 * Running bonds for the market list: the 500 bonds maturing last plus all system bonds. The spread
 * search does not list bonds, and there are more than 2.000 at a time.
 */
export function useBondList(enabled: boolean) {
  return useQuery({
    queryKey: ['bonds', 'list'],
    enabled,
    queryFn: async () => {
      const [bonds, system] = await Promise.all([
        getPage<BondView>('/api/v2/bonds', { pageable: { page: 0, size: 500, sort: ['maturityDate,desc'] } }),
        unwrap<BondView[]>(api.GET('/api/systembonds')),
      ]);
      return [...(system ?? []), ...bonds.content];
    },
    staleTime: LIVE,
  });
}

/** Index with members, weights and chaining (GET /api/v2/index/{asin}). */
export function useIndexDetails(asin: string, enabled = true) {
  return useQuery({
    queryKey: ['index', asin],
    enabled: !!asin && enabled,
    queryFn: () =>
      unwrap<IndexDetails>(api.GET('/api/v2/index/{securityIdentifier}', { params: { path: { securityIdentifier: asin } } })),
    staleTime: SLOW,
  });
}

export function useEtf(asin: string, enabled = true) {
  return useQuery({
    queryKey: ['etf', asin],
    enabled: !!asin && enabled,
    queryFn: () => unwrap<EtfView>(api.GET('/api/v2/etfs/{asin}', { params: { path: { asin } } })),
    staleTime: SLOW,
  });
}

/** Subscribe (new units against cash) or redeem ETF units. */
export function useEtfUnits(asin: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ mode, units }: { mode: 'subscribe' | 'redeem'; units: number }) =>
      unwrap(
        mode === 'subscribe'
          ? api.POST('/api/v2/etfs/{asin}/subscriptions', { params: { path: { asin }, query: { units } } })
          : api.POST('/api/v2/etfs/{asin}/redemptions', { params: { path: { asin }, query: { units } } }),
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['portfolio'] });
      void qc.invalidateQueries({ queryKey: ['etf', asin] });
      void qc.invalidateQueries({ queryKey: ['listingprofile', asin] });
    },
  });
}

/** A sample of buildings of one size with their last price, for the price comparison (~11.000 per size exist). */
export function useBuildings(size: number | undefined) {
  return useQuery({
    queryKey: ['buildings', size],
    enabled: !!size,
    queryFn: () => getPage<MarketRow>('/api/v2/pricespreads', { search: `Building ${size} `, pageable: { page: 0, size: 500 } }),
    staleTime: SLOW,
  });
}

// ---------- Company management (CEO) ----------

/** Achievements of a company the player leads that are reached but not yet claimed. */
export function useUnclaimedCompanyAchievements(companyId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['company', 'achievements', companyId, 'unclaimed'],
    enabled: !!companyId && enabled,
    queryFn: () =>
      unwrap<AchievementItem[]>(api.GET('/api/v2/my/notyetclaimedcompanyachievements', { params: { query: { companyId: companyId! } } })),
    staleTime: SLOW,
  });
}

export function useClaimCompanyAchievements(companyId: string | undefined) {
  const qc = useQueryClient();
  const done = () => {
    void qc.invalidateQueries({ queryKey: ['company'] });
    void qc.invalidateQueries({ queryKey: ['portfolio'] });
  };
  return {
    one: useMutation({
      mutationFn: (achievementId: string) =>
        unwrap(api.PUT('/api/v2/my/companyachievementclaim/{achievementId}', { params: { path: { achievementId } } })),
      onSuccess: done,
    }),
    all: useMutation({
      mutationFn: () => unwrap(api.PUT('/api/v2/my/companyachievementclaim', { params: { query: { companyId: companyId! } } })),
      onSuccess: done,
    }),
  };
}

/** Main interest rate in % (value) and the rate paid on central bank reserves (reserveInterestRate). */
export function useMainInterestRate() {
  return useQuery({
    queryKey: ['maininterestrate'],
    queryFn: () => unwrap<{ value: number; reserveInterestRate?: number; date: number }>(api.GET('/api/maininterestrate/latest')),
    staleTime: SLOW,
  });
}

/** Average interest of running bonds; the API answers with a fraction (0.02 = 2 %). */
export function useAverageBondRate() {
  return useQuery({
    queryKey: ['averagebondinterestrate'],
    queryFn: () => unwrap<{ value: number; date: number }>(api.GET('/api/v2/averagebondinterestrate')),
    staleTime: SLOW,
  });
}

export interface IndexView {
  id: string;
  name: string;
  membersCount?: number;
  listing: { name: string; securityIdentifier: string };
}

export function useIndexes(enabled = true) {
  return useQuery({
    queryKey: ['indexes'],
    enabled,
    queryFn: () => getPage<IndexView>('/api/v2/indexes', { pageable: { page: 0, size: 200, sort: ['name,asc'] } }),
    staleTime: SLOW,
  });
}

export type IssueRequest =
  | { kind: 'bond'; numberOfBonds: number; faceValue: number; interestRate: number; maturityDate: number }
  | { kind: 'system'; numberOfBonds: number }
  | { kind: 'index'; name: string; members: string[]; customAsin?: string }
  | { kind: 'etf'; name: string; baseIndexAsin: string; managementFeePercent?: number }
  | { kind: 'warrant'; type: 'CALL' | 'PUT'; underlyingAsin: string; cashDeposit: number; ratio: number };

/** Issues a new security for a company: bonds, system bonds, index, ETF or warrant. Answers with the new ASIN if known. */
export function useIssue(companyId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (r: IssueRequest): Promise<string | undefined> => {
      const id = companyId!;
      switch (r.kind) {
        case 'bond':
          await unwrap(
            api.POST('/api/bonds', {
              params: {
                query: {
                  companyId: id,
                  numberOfBonds: String(r.numberOfBonds),
                  faceValue: String(r.faceValue),
                  interestRate: String(r.interestRate),
                  maturityDate: String(r.maturityDate),
                },
              },
            }),
          );
          return undefined;
        case 'system':
          await unwrap(api.POST('/api/systembonds', { params: { query: { companyId: id, numberOfBonds: String(r.numberOfBonds) } } }));
          return undefined;
        case 'index': {
          const ix = await unwrap<{ listing?: { securityIdentifier: string } }>(
            api.POST('/api/v2/indexes', { params: { query: { companyId: id, name: r.name, 'members[]': r.members, customAsin: r.customAsin } } }),
          );
          return ix?.listing?.securityIdentifier;
        }
        case 'etf': {
          const etf = await unwrap<{ listing?: { securityIdentifier: string } }>(
            api.POST('/api/v2/etfs', { params: { query: { companyId: id, name: r.name, baseIndexAsin: r.baseIndexAsin } } }),
          );
          const asin = etf?.listing?.securityIdentifier;
          if (asin && r.managementFeePercent != null) {
            await unwrap(
              api.POST('/api/v2/etfs/{asin}/management-fee', { params: { path: { asin }, query: { percent: r.managementFeePercent } } }),
            );
          }
          return asin;
        }
        case 'warrant': {
          const w = await unwrap<{ listing?: { securityIdentifier: string } }>(
            api.POST('/api/v2/warrants', {
              params: { query: { companyId: id, type: r.type, underlyingAsin: r.underlyingAsin, cashDeposit: r.cashDeposit, ratio: r.ratio } },
            }),
          );
          return w?.listing?.securityIdentifier;
        }
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['company'] });
      void qc.invalidateQueries({ queryKey: ['indexes'] });
      void qc.invalidateQueries({ queryKey: ['portfolio'] });
    },
  });
}

/** Everything the banking panel needs; reserves are only readable by the CEO of a bank. */
export function useBanking(companyId: string | undefined, enabled: boolean) {
  const on = !!companyId && enabled;
  const license = useQuery({
    queryKey: ['company', 'bankinglicense', companyId],
    enabled: on,
    queryFn: async () => {
      try {
        return await unwrap<{ id: string; startDate?: number } | null>(
          api.GET('/api/bankinglicense', { params: { query: { companyId: companyId! } } }),
        );
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    },
    staleTime: SLOW,
  });
  const reserves = useQuery({
    queryKey: ['company', 'reserves', companyId],
    enabled: on && !!license.data,
    queryFn: () => unwrap<CentralBankReserves>(api.GET('/api/centralbankreserves', { params: { query: { companyId: companyId! } } })),
    staleTime: SLOW,
  });
  const lastPayment = useReservesPayment(on);
  const tender = useInterestTender(on);
  return { license, reserves, lastPayment, tender };
}

/** Last daily interest payment on all central bank reserves, with the time of the next one. */
export function useReservesPayment(enabled = true) {
  return useQuery({
    queryKey: ['reservespayment'],
    enabled,
    queryFn: () =>
      unwrap<{ paymentDate: number; nextPaymentDate?: number; paidInterest: number }>(api.GET('/api/v2/lastcentralbankreservespayment')),
    staleTime: SLOW,
  });
}

/** The running interest tender: a 7-day bond without coupon; banks bid 98–102 %, which sets the main rate. */
export function useInterestTender(enabled = true) {
  return useQuery({
    queryKey: ['interesttender'],
    enabled,
    queryFn: async () => {
      try {
        return await unwrap<{ bondListing: Listing; endDate: number } | null>(api.GET('/api/v2/interesttenders'));
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    },
    staleTime: SLOW,
  });
}

/** All system bonds: credit of the central bank to banks, at the main rate + 1, about 6,5 days. */
export function useSystemBonds() {
  return useQuery({
    queryKey: ['systembonds'],
    queryFn: () => unwrap<BondView[]>(api.GET('/api/systembonds')),
    staleTime: SLOW,
  });
}

export interface InterestRateSnapshot {
  date: number;
  mainInterestRate?: number;
  reserveInterestRate?: number;
  systemBondInterestRate?: number;
  averageBondInterestRate?: number;
}

/** Hourly snapshots of main, reserve and system bond rate (1.000 ≈ 6 weeks). */
export function useInterestHistory(limit = 1000) {
  return useQuery({
    queryKey: ['interestratehistory', limit],
    queryFn: () => unwrap<InterestRateSnapshot[]>(api.GET('/api/v2/interestratehistory', { params: { query: { limit } } })),
    staleTime: SLOW,
  });
}

/**
 * Running bonds for comparing yields: the 500 due first and the 500 due last (there are more than
 * 2.000 at a time; the list sorts by maturity) plus the system bonds.
 */
export function useBondUniverse(enabled = true) {
  return useQuery({
    queryKey: ['bonds', 'universe'],
    enabled,
    queryFn: async () => {
      const [first, last, system] = await Promise.all([
        getPage<BondView>('/api/v2/bonds', { pageable: { page: 0, size: 500, sort: ['maturityDate,asc'] } }),
        getPage<BondView>('/api/v2/bonds', { pageable: { page: 0, size: 500, sort: ['maturityDate,desc'] } }),
        unwrap<BondView[]>(api.GET('/api/systembonds')),
      ]);
      const seen = new Set<string>();
      return [...(system ?? []), ...first.content, ...last.content].filter((b) => {
        const id = b.id ?? b.listing?.securityIdentifier ?? '';
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });
    },
    staleTime: LIVE,
  });
}

export function useBankingActions(companyId: string | undefined) {
  const qc = useQueryClient();
  const done = () => void qc.invalidateQueries({ queryKey: ['company'] });
  return {
    license: useMutation({
      mutationFn: () => unwrap(api.POST('/api/bankinglicense', { params: { query: { companyId: companyId! } } })),
      onSuccess: done,
    }),
    reserves: useMutation({
      mutationFn: (cashAmount: number) =>
        unwrap(api.PUT('/api/centralbankreserves', { params: { query: { companyId: companyId!, cashAmount: String(cashAmount) } } })),
      onSuccess: done,
    }),
    boost: useMutation({
      mutationFn: ({ reservesId, multiplier }: { reservesId: string; multiplier: number }) =>
        unwrap(
          api.PUT('/api/v2/centralbankreserves/{reservesId}', {
            params: { path: { reservesId }, query: { increaseInterestRateBoost: true, multiplier } },
          }),
        ),
      onSuccess: done,
    }),
  };
}

// ---------- Employment ----------

/** The player's employment agreements (CEO posts with daily wage). */
export function useMyEmployments() {
  return useQuery({
    queryKey: ['employments'],
    queryFn: () => getPage<Employment>('/api/v2/my/employmentagreements', { pageable: { page: 0, size: 50 } }),
    staleTime: SLOW,
  });
}

/** Salary the player could collect right now (null when nothing is due). */
export function usePossibleSalary() {
  return useQuery({
    queryKey: ['employments', 'possiblesalary'],
    queryFn: () => unwrap<{ value: number | null }>(api.GET('/api/v2/my/possibledailysalary')),
    refetchInterval: SLOW,
  });
}

export function usePaySalaries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => unwrap(api.PUT('/api/v2/my/salarypayments')),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['employments'] });
      void qc.invalidateQueries({ queryKey: ['portfolio'] });
      void qc.invalidateQueries({ queryKey: ['bank'] });
    },
  });
}

// ---------- Capital measures ----------

/** CapitalIncreaseView / CapitalReductionView: subscription phase from startDate to endDate. */
export interface CapitalMeasureView {
  id: string;
  type?: 'WITH_SUBSCRIPTION_RIGHTS' | 'WITHOUT_SUBSCRIPTION_RIGHTS';
  numberOfShares: number;
  price: number;
  cashVolume: number;
  startDate: number;
  endDate: number;
  company: { id: string; name: string; securityIdentifier: string; logoUrl?: string | null };
}

export type CapitalMeasureKind = 'increase' | 'reduction';

export function useCapitalMeasures(kind: CapitalMeasureKind) {
  return useQuery({
    queryKey: ['capitalmeasures', kind],
    queryFn: () =>
      getPage<CapitalMeasureView>(kind === 'increase' ? '/api/v2/capitalincreases' : '/api/v2/capitalreductions', {
        pageable: { page: 0, size: 200, sort: ['startDate,desc'] },
      }),
    refetchInterval: SLOW,
  });
}

// ---------- Alliance management ----------

/** The player's own alliance membership (null when in none; the API then answers with an empty message). */
export function useMyAllianceMembership() {
  return useQuery({
    queryKey: ['alliancemembership', 'me'],
    queryFn: async () => {
      const m = await unwrap<AllianceMembershipView | { code: number }>(api.GET('/api/v2/my/alliancemembership'));
      return m && 'alliance' in m ? m : null;
    },
    staleTime: SLOW,
  });
}

export function useAllianceActions() {
  const qc = useQueryClient();
  const done = () => {
    void qc.invalidateQueries({ queryKey: ['alliance'] });
    void qc.invalidateQueries({ queryKey: ['alliances'] });
    void qc.invalidateQueries({ queryKey: ['alliancemembership'] });
  };
  return {
    create: useMutation({
      mutationFn: (q: { name: string; description: string; logoUrl?: string }) =>
        unwrap<AllianceView>(api.POST('/api/v2/alliances', { params: { query: { ...q, locale: 'de' } } })),
      onSuccess: done,
    }),
    edit: useMutation({
      mutationFn: ({ allianceId, ...q }: { allianceId: string; name: string; description: string; logoUrl?: string }) =>
        unwrap(api.PUT('/api/v2/alliances/{allianceId}', { params: { path: { allianceId }, query: { ...q, locale: 'de' } } })),
      onSuccess: done,
    }),
    add: useMutation({
      mutationFn: (q: { allianceId: string; userId: string }) =>
        unwrap(api.POST('/api/v2/alliancememberships', { params: { query: { ...q, role: 'MEMBER' } } })),
      onSuccess: done,
    }),
    role: useMutation({
      mutationFn: ({ membershipId, role }: { membershipId: string; role: AllianceMembership['role'] }) =>
        unwrap(api.PUT('/api/v2/alliancememberships/{membershipId}', { params: { path: { membershipId }, query: { role } } })),
      onSuccess: done,
    }),
    remove: useMutation({
      mutationFn: (membershipId: string) =>
        unwrap(api.DELETE('/api/v2/alliancememberships/{membershipId}', { params: { path: { membershipId } } })),
      onSuccess: done,
    }),
    /** Leaves the alliance (own membership). */
    leave: useMutation({
      mutationFn: (allianceId: string) => unwrap(api.DELETE('/api/v2/alliancememberships', { params: { query: { allianceId } } })),
      onSuccess: done,
    }),
  };
}

// ---------- Chat ----------

const chatKeys = {
  list: ['chats'] as const,
  messages: (chatId: string) => ['chats', 'messages', chatId] as const,
  members: (chatId: string) => ['chats', 'members', chatId] as const,
};
/** The API answers with 50 messages per call, newest first. */
const MESSAGE_PAGE = 50;
type MessagePages = InfiniteData<MessageView[], number | undefined>;

/** All chats of the player, kept current over the live connection. */
export function useMyChats() {
  const qc = useQueryClient();
  useTopic<ChatView>('/user/topic/my/chats', (chat) => {
    qc.setQueryData<ChatView[]>(chatKeys.list, (old) => {
      if (!old) return [chat];
      if (chat.status === 'DELETED') return old.filter((c) => c.id !== chat.id);
      const i = old.findIndex((c) => c.id === chat.id);
      if (i < 0) return [chat, ...old];
      const next = [...old];
      next[i] = chat;
      return next;
    });
  });
  useRefetchOnReconnect(chatKeys.list);
  return useQuery({
    queryKey: chatKeys.list,
    queryFn: () => unwrap<ChatView[]>(api.GET('/api/v2/my/chats')),
    refetchInterval: SLOW,
  });
}

/** Number of chats with unread messages (header badge). Derived from the chat list. */
export function useUnreadChats() {
  const chats = useMyChats();
  return (chats.data ?? []).filter((c) => c.numOfUnreadMessages > 0 && !c.publicChat).length;
}

/**
 * Messages of one chat, oldest first. Pages go back in time via `beforeDate`; new messages
 * arrive over the live connection and land in the newest page.
 */
export function useChatMessages(chatId: string | undefined) {
  const qc = useQueryClient();
  useTopic<MessageView>(chatId ? `/user/topic/chatmessages/${chatId}` : null, (m) => {
    if (!chatId || m.chatId !== chatId) return;
    qc.setQueryData<MessagePages>(chatKeys.messages(chatId), (old) => (old ? upsertMessage(old, m) : old));
    qc.setQueryData<ChatView[]>(chatKeys.list, (old) => old?.map((c) => (c.id === chatId ? { ...c, lastMessage: m } : c)));
  });
  useRefetchOnReconnect(chatKeys.messages(chatId ?? ''));
  return useInfiniteQuery({
    queryKey: chatKeys.messages(chatId ?? ''),
    enabled: !!chatId,
    initialPageParam: undefined as number | undefined,
    queryFn: async ({ pageParam }) => {
      const list = await unwrap<MessageView[]>(
        api.GET('/api/v2/messages/chat/{chatId}', {
          params: { path: { chatId: chatId! }, query: pageParam ? { beforeDate: pageParam } : {} },
        }),
      );
      return [...list].sort((a, b) => (a.dateSent ?? 0) - (b.dateSent ?? 0));
    },
    getNextPageParam: (page) => (page.length < MESSAGE_PAGE ? undefined : page[0]?.dateSent),
  });
}

/** Inserts or replaces a live message in the newest page (removes it when DELETED). */
export function upsertMessage(data: MessagePages, m: MessageView): MessagePages {
  let found = false;
  const pages = data.pages.map((p) => {
    const i = p.findIndex((x) => x.id === m.id);
    if (i < 0) return p;
    found = true;
    return m.status === 'DELETED' ? p.filter((x) => x.id !== m.id) : p.map((x, j) => (j === i ? m : x));
  });
  if (!found && m.status !== 'DELETED') {
    pages[0] = [...(pages[0] ?? []), m].sort((a, b) => (a.dateSent ?? 0) - (b.dateSent ?? 0));
  }
  return { ...data, pages };
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ chatId, content }: { chatId: string; content: string }) =>
      unwrap<MessageView>(api.POST('/api/v2/messages', { params: { query: { chatId, content } } })),
    onSuccess: (m, { chatId }) => {
      if (!m?.id) return void qc.invalidateQueries({ queryKey: chatKeys.messages(chatId) });
      qc.setQueryData<MessagePages>(chatKeys.messages(chatId), (old) => (old ? upsertMessage(old, m) : old));
    },
  });
}

export function useMarkChatRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (chatId: string) => unwrap(api.PUT('/api/v2/my/chats/read', { params: { query: { chatId } } })),
    onSuccess: (_, chatId) =>
      qc.setQueryData<ChatView[]>(chatKeys.list, (old) =>
        old?.map((c) => (c.id === chatId ? { ...c, numOfUnreadMessages: 0 } : c)),
      ),
  });
}

/** All public rooms – the chat list only has the ones the player joined. */
export function useChatRooms() {
  return useQuery({
    queryKey: ['chats', 'rooms'],
    queryFn: () => unwrap<ChatRoomView[]>(api.GET('/api/chatrooms')),
    staleTime: SLOW,
  });
}

/** Joins a public room: membership for the player himself. */
export function useJoinChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ chatId, userId }: { chatId: string; userId: string }) =>
      unwrap(api.POST('/api/v2/chatmemberships', { params: { query: { chatId, userId } } })),
    onSuccess: (_, { chatId }) => {
      void qc.invalidateQueries({ queryKey: chatKeys.list });
      void qc.invalidateQueries({ queryKey: chatKeys.messages(chatId) });
    },
  });
}

export function useChatMembers(chatId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: chatKeys.members(chatId ?? ''),
    enabled: !!chatId && enabled,
    queryFn: () =>
      unwrap<ChatMembershipView[]>(
        api.GET('/api/v2/chatmemberships', { params: { query: { chatId: chatId! } } }),
      ),
    staleTime: SLOW,
  });
}

/** New chat: a direct chat has no name and one invited user; a group chat has a name. */
export function useCreateChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userIds, chatName }: { userIds: string[]; chatName?: string }) => {
      const chat = await unwrap<{ id: string }>(
        api.POST('/api/v2/chats', { params: { query: chatName ? { chatName } : {} } }),
      );
      for (const userId of userIds) {
        await unwrap(api.POST('/api/v2/chatmemberships', { params: { query: { chatId: chat.id, userId } } }));
      }
      return chat.id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: chatKeys.list }),
  });
}

export function useAddChatMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ chatId, userId }: { chatId: string; userId: string }) =>
      unwrap(api.POST('/api/v2/chatmemberships', { params: { query: { chatId, userId } } })),
    onSuccess: (_, { chatId }) => {
      void qc.invalidateQueries({ queryKey: chatKeys.members(chatId) });
      void qc.invalidateQueries({ queryKey: chatKeys.list });
    },
  });
}

export function useLeaveChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (chatId: string) =>
      unwrap(api.DELETE('/api/v2/my/chatmemberships/{chatId}', { params: { path: { chatId } } })),
    onSuccess: (_, chatId) =>
      qc.setQueryData<ChatView[]>(chatKeys.list, (old) => old?.filter((c) => c.id !== chatId)),
  });
}

export function useUserSearch(query: string) {
  const q = query.trim();
  return useQuery({
    queryKey: ['users', 'search', q],
    enabled: q.length >= 2,
    queryFn: () =>
      unwrap<UsernameView[]>(api.GET('/api/search/users/{namePart}', { params: { path: { namePart: q } } })),
    staleTime: SLOW,
  });
}

/** Messages sent while the live connection was down are only seen after a refetch. */
function useRefetchOnReconnect(queryKey: readonly unknown[]) {
  const qc = useQueryClient();
  const key = JSON.stringify(queryKey);
  useEffect(() => {
    const on = () => void qc.invalidateQueries({ queryKey: JSON.parse(key) });
    window.addEventListener(LIVE_RECONNECTED_EVENT, on);
    return () => window.removeEventListener(LIVE_RECONNECTED_EVENT, on);
  }, [qc, key]);
}

// Spring's Pageable is sent flat (?page=0&size=50&sort=date,desc), not as pageable[page]=….
function pageableSerializer(q: Record<string, unknown>) {
  const out = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) {
    if (k === 'pageable' && v && typeof v === 'object') {
      for (const [pk, pv] of Object.entries(v)) {
        for (const item of Array.isArray(pv) ? pv : [pv]) out.append(pk, String(item));
      }
    } else if (v !== undefined) {
      out.append(k, String(v));
    }
  }
  return out.toString();
}

// ---------- Market overview ----------

/** The 100 most traded securities of the last 24 h with last price and price 24 h ago (market heatmap). */
export function useTradingMatrix() {
  return useQuery({
    queryKey: ['tradingmatrix'],
    queryFn: () => unwrap<TradingMatrixItemView[]>(api.GET('/api/v2/tradingmatrix/top100')),
    refetchInterval: SLOW,
  });
}

/** Securities with the largest traded volume in 24 h, of one type (all types when empty). */
export function useBiggestTraded(type?: string, size = 10) {
  return useQuery({
    queryKey: ['biggesttraded', type ?? '', size],
    queryFn: () =>
      getPage<ListingWithTradingVolumeView>('/api/v2/biggesttradedsecurities', {
        type: type || undefined,
        pageable: { page: 0, size },
      }),
    placeholderData: (prev) => prev,
    refetchInterval: SLOW,
  });
}

// ---------- Dividends, mergers, money supply ----------

type CompactCompany = { id: string; name: string; securityIdentifier: string; logoUrl?: string | null };

/**
 * DividendPaymentView / MergerView: an accepted dividend or merger poll, due at startDate. The API
 * lists only upcoming ones; maximalCashVolume is the cap set in the poll (it may exceed the cash).
 */
export interface DividendPaymentView {
  id: string;
  maximalCashVolume: number;
  startDate: number;
  company: CompactCompany;
}

export interface MergerView extends DividendPaymentView {
  /** The company the other one merges into */
  acquiringCompany: CompactCompany;
}

export function useDividendPayments() {
  return useQuery({
    queryKey: ['dividendpayments'],
    queryFn: () => getPage<DividendPaymentView>('/api/v2/dividendpayments', { pageable: { page: 0, size: 200 } }),
    refetchInterval: SLOW,
  });
}

export function useMergers() {
  return useQuery({
    queryKey: ['mergers'],
    queryFn: () => getPage<MergerView>('/api/v2/mergers', { pageable: { page: 0, size: 500 } }),
    refetchInterval: SLOW,
  });
}

/** One step of the money supply control; appliedInterestRate is a fraction (0,02 = 2 %). */
export interface MoneySupplySnapshot {
  date: number;
  playerMoneySupply: number;
  /** Observed: the previous snapshot's playerMoneySupply × 1,001 */
  targetSupply: number;
  soldBondVolume: number;
  appliedInterestRate: number;
}

/** The last 30 snapshots, newest first (irregular, several a day). */
export function useMoneySupply() {
  return useQuery({
    queryKey: ['moneysupply'],
    queryFn: () => unwrap<{ currentBondInterestRate?: number; snapshots: MoneySupplySnapshot[] }>(api.GET('/api/moneysupply')),
    refetchInterval: SLOW,
  });
}

export interface MoneySupplyPot {
  pot: string;
  accountCount: number;
  cash: number;
}

/** Where the money is now: bank account cash plus central bank reserves (= total), split into pots. */
export function useMoneySupplyBreakdown() {
  return useQuery({
    queryKey: ['moneysupply', 'breakdown'],
    queryFn: () =>
      unwrap<{
        totalBankCash: number;
        totalReserves: number;
        total: number;
        attributedCash: number;
        unassignedCash: number;
        pots: MoneySupplyPot[];
      }>(api.GET('/api/moneysupply/breakdown')),
    refetchInterval: SLOW,
  });
}

// ---------- OTC orders ----------
// An OTC order names one counterparty securities account; only that account can execute it,
// by placing the opposite order with the offerer as counterparty (see src/orders/derive.ts).

/** Unfilled OTC orders addressed to each account (GET /api/securityorders/counterparty/{id}), in the given order. */
export function useCounterOtcOrders(securitiesAccountIds: string[]) {
  return useQueries({
    queries: securitiesAccountIds.map((id) => ({
      queryKey: ['orders', 'otc', id],
      queryFn: () =>
        unwrap<SecurityOrderWithVolumeView[]>(
          api.GET('/api/securityorders/counterparty/{securitiesAccountId}', { params: { path: { securitiesAccountId: id } } }),
        ),
      refetchInterval: LIVE,
    })),
    combine: (results) => ({
      data: results.map((r) => r.data),
      isLoading: results.some((r) => r.isLoading),
      isError: results.some((r) => r.isError),
    }),
  });
}

/** Possible OTC counterparties: private and company securities accounts by name (GET /api/v2/securitiesaccountdetails). */
export function useOtcCounterparties(search: string) {
  const q = search.trim();
  return useQuery({
    queryKey: ['securitiesaccountdetails', q],
    enabled: q.length >= 2,
    queryFn: () =>
      unwrap<SecuritiesAccountDetailsView[]>(api.GET('/api/v2/securitiesaccountdetails', { params: { query: { search: q } } })),
    placeholderData: (prev) => prev,
    staleTime: SLOW,
  });
}

/** Portfolio (cash, positions) of one of my accounts – also company accounts (GET /api/portfolios/{id}). */
export function useAccountPortfolio(securitiesAccountId: string | undefined) {
  return useQuery({
    queryKey: ['portfolio', 'account', securitiesAccountId],
    enabled: !!securitiesAccountId,
    queryFn: () =>
      unwrap<PortfolioView>(
        api.GET('/api/portfolios/{securitiesAccountId}', { params: { path: { securitiesAccountId: securitiesAccountId! } } }),
      ),
    refetchInterval: SLOW,
  });
}

/** Spreads of several listings; shares the cache with usePriceSpread. */
export function usePriceSpreads(asins: string[]) {
  return useQueries({
    queries: asins.map((asin) => ({
      queryKey: ['pricespread', asin],
      queryFn: () =>
        unwrap<PriceSpreadView>(
          api.GET('/api/pricespreads/{securityIdentifier}', { params: { path: { securityIdentifier: asin } } }),
        ),
      refetchInterval: LIVE,
    })),
    combine: (results) =>
      Object.fromEntries(asins.flatMap((a, i) => (results[i]?.data ? [[a, results[i].data]] : []))) as Record<string, PriceSpreadView>,
  });
}

/**
 * Read-only order check (GET /api/securityorders/check, deprecated but without side effects). It
 * knows no counterparty, so for OTC it only validates cash, shares and limits – not a match.
 */
export async function checkOrder(q: Omit<AddOrderQuery, 'counterparty' | 'checkOrderOnly' | 'goodAfterDate' | 'goodTillDate' | 'hourlyChange' | 'expectedPrice'>) {
  const { owner, securityIdentifier, action, type, price, numberOfShares } = q;
  return unwrap<OrderCheck>(
    api.GET('/api/securityorders/check', { params: { query: { owner, securityIdentifier, action, type, price, numberOfShares } } }),
  );
}

/**
 * POST /api/securityorders – places an order; with `counterparty` an OTC order. The opposite order
 * addressed back to an OTC offerer executes that offer. Writes to the live game.
 */
export function useAddOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (query: AddOrderQuery) => unwrap(api.POST('/api/securityorders', { params: { query } })),
    onSuccess: (_, q) => {
      void qc.invalidateQueries({ queryKey: ['orders'] });
      void qc.invalidateQueries({ queryKey: ['portfolio'] });
      void qc.invalidateQueries({ queryKey: ['orderlogs'] });
      void qc.invalidateQueries({ queryKey: ['pricespread', q.securityIdentifier] });
      void qc.invalidateQueries({ queryKey: ['orderbook', q.securityIdentifier] });
    },
  });
}

// ---------- Community (alliances, news, forum) ----------

/** Alliance achievements: reached ones and the progress of the open ones (both public). */
export function useAllianceAchievements(allianceId: string) {
  return useQuery({
    queryKey: ['alliance', allianceId, 'achievements'],
    enabled: !!allianceId,
    queryFn: async () => {
      const [done, progress] = await Promise.all([
        unwrap<AchievementItem[]>(
          api.GET('/api/v2/allianceachievements/{allianceID}', { params: { path: { allianceID: allianceId } } }),
        ),
        unwrap<AchievementItem[]>(
          api.GET('/api/v2/allianceachievementprogress/{allianceId}', { params: { path: { allianceId } } }),
        ),
      ]);
      return { done, progress };
    },
    staleTime: SLOW,
  });
}

/** Reached but unclaimed achievements of the player's own alliance (only for members). */
export function useUnclaimedAllianceAchievements(enabled: boolean) {
  return useQuery({
    queryKey: ['alliance', 'achievements', 'unclaimed'],
    enabled,
    queryFn: () => unwrap<AchievementItem[]>(api.GET('/api/v2/my/notyetclaimedallianceachievements')),
    staleTime: SLOW,
  });
}

export const claimAllianceAchievement = (achievementId: string) =>
  unwrap(api.PUT('/api/v2/my/allianceachievementclaim/{achievementId}', { params: { path: { achievementId } } }));
/** Claims all reached achievements of the player's own alliance (no parameter). */
export const claimAllAllianceAchievements = () => unwrap(api.PUT('/api/v2/my/allianceachievementclaim'));

export function useClaimAllianceAchievements() {
  const qc = useQueryClient();
  const done = () => {
    void qc.invalidateQueries({ queryKey: ['alliance'] });
    void qc.invalidateQueries({ queryKey: ['portfolio'] });
  };
  return {
    one: useMutation({ mutationFn: claimAllianceAchievement, onSuccess: done }),
    all: useMutation({ mutationFn: claimAllAllianceAchievements, onSuccess: done }),
  };
}

/** Where a filtered news feed comes from; the whole newspaper is useNews. */
export type NewsSource =
  | { kind: 'author'; userId: string }
  | { kind: 'hashtag'; tag: string }
  | { kind: 'company'; companyId: string }
  | { kind: 'alliance'; allianceId: string };

/** GET path of a news feed. */
export function newsSourcePath(s: NewsSource): string {
  switch (s.kind) {
    case 'author':
      return `/api/v2/authors/${encodeURIComponent(s.userId)}/news`;
    case 'hashtag':
      return `/api/v2/hashtags/${encodeURIComponent(s.tag)}/news`;
    case 'company':
      return `/api/v2/companies/${encodeURIComponent(s.companyId)}/news`;
    case 'alliance':
      return `/api/v2/alliances/${encodeURIComponent(s.allianceId)}/news`;
  }
}

const FEED_SIZE = 20;

/** News of one author, hashtag, company or alliance, newest first. */
export function useNewsFeed(source: NewsSource | null) {
  return useInfiniteQuery({
    queryKey: ['news', 'feed', source],
    enabled: !!source,
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      getPage<PostView>(newsSourcePath(source!), { pageable: { page: pageParam, size: FEED_SIZE, sort: ['dateCreated,desc'] } }),
    getNextPageParam: (last, all) => (all.length * FEED_SIZE < last.totalElements ? all.length : undefined),
    staleTime: SLOW,
  });
}

/**
 * Interest = a number the server keeps per player and author/company/hashtag/post (a post's parts
 * add up to `interestSum`). Never seen ones answer 200 with interest 0 and version null.
 */
export interface InterestView {
  id?: string;
  version?: number | null;
  interest: number;
}
export type FollowKind = 'authors' | 'companies' | 'hashtags';

export const interestPath = (kind: FollowKind, id: string) => `/api/v2/my/interests/${kind}/${encodeURIComponent(id)}`;

export function useInterest(kind: FollowKind, id: string | undefined) {
  return useQuery({
    queryKey: ['interest', kind, id],
    enabled: !!id,
    queryFn: () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return unwrap<InterestView>((api.GET as any)(interestPath(kind, id!), {}));
    },
    staleTime: SLOW,
  });
}

/** The parts of the player's interest in a post (GET /api/v2/my/interests/posts/{postId}). */
export type PostInterestView = Record<string, { interest?: number } | { interest?: number }[] | null>;

export function usePostInterest(postId: string | undefined) {
  return useQuery({
    queryKey: ['interest', 'post', postId],
    enabled: !!postId,
    queryFn: () =>
      unwrap<PostInterestView>(api.GET('/api/v2/my/interests/posts/{postId}', { params: { path: { postId: postId! } } })),
    staleTime: SLOW,
  });
}

/** Follow (SUBSCRIBE), hide (IGNORE) or reset (null → DELETE) the news of an author, company or hashtag. */
export function setSubscription(kind: FollowKind, id: string, action: 'SUBSCRIBE' | 'IGNORE' | null) {
  if (kind === 'authors') {
    const path = { userId: id };
    return action
      ? unwrap(api.PUT('/api/v2/my/subscriptions/authors/{userId}', { params: { path, query: { action } } }))
      : unwrap(api.DELETE('/api/v2/my/subscriptions/authors/{userId}', { params: { path } }));
  }
  if (kind === 'companies') {
    const path = { companyId: id };
    return action
      ? unwrap(api.PUT('/api/v2/my/subscriptions/companies/{companyId}', { params: { path, query: { action } } }))
      : unwrap(api.DELETE('/api/v2/my/subscriptions/companies/{companyId}', { params: { path } }));
  }
  const path = { hashtag: id };
  return action
    ? unwrap(api.PUT('/api/v2/my/subscriptions/hashtags/{hashtag}', { params: { path, query: { action } } }))
    : unwrap(api.DELETE('/api/v2/my/subscriptions/hashtags/{hashtag}', { params: { path } }));
}

export function useSubscription(kind: FollowKind, id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (action: 'SUBSCRIBE' | 'IGNORE' | null) => setSubscription(kind, id!, action),
    onSuccess: (data) => {
      const d = data as Partial<InterestView> | undefined;
      if (d && typeof d.interest === 'number') qc.setQueryData(['interest', kind, id], d);
      void qc.invalidateQueries({ queryKey: ['interest'] });
      void qc.invalidateQueries({ queryKey: ['news', 'feed'] });
    },
  });
}

/** Boards the player is a member of („Meine Foren“). */
export function useMyBoards() {
  return useQuery({
    queryKey: ['forum', 'mine'],
    queryFn: () => getPage<BoardView>('/api/v2/my/messageboards', { pageable: { page: 0, size: 100 } }),
    staleTime: SLOW,
  });
}

/**
 * „Most interesting news“ = the newest threads (not comments, not newspaper articles) of all boards
 * and sub-boards the player is a member of.
 */
export function useBoardNews() {
  return useInfiniteQuery({
    queryKey: ['forum', 'boardnews'],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      getPage<PostView & { messageBoard?: { id: string; name: string } | null }>('/api/v2/my/boardnews', {
        pageable: { page: pageParam, size: 30, sort: ['dateCreated,desc'] },
      }),
    getNextPageParam: (last, all) => (all.length * 30 < last.totalElements ? all.length : undefined),
    staleTime: SLOW,
  });
}

/** Adds the player to a board as reader. */
export const joinBoard = (userId: string, messageBoardId: string) =>
  unwrap(api.POST('/api/v2/messageboardmemberships', { params: { query: { userId, messageBoardId, role: 'READER' } } }));
/** Removes the player's own membership of a board. */
export const leaveBoard = (boardId: string) =>
  unwrap(api.DELETE('/api/v2/messageboardmemberships', { params: { query: { boardId } } }));

export function useBoardMembership() {
  const qc = useQueryClient();
  const done = () => void qc.invalidateQueries({ queryKey: ['forum'] });
  return {
    join: useMutation({ mutationFn: (v: { userId: string; boardId: string }) => joinBoard(v.userId, v.boardId), onSuccess: done }),
    leave: useMutation({ mutationFn: leaveBoard, onSuccess: done }),
  };
}

export type ComplaintType = 'COMPANY_LOGO' | 'COMPANY_NAME' | 'ALLIANCE_LOGO' | 'MESSAGE' | 'MESSAGE_BOARD' | 'POST' | 'USER_NAME';

/** Reports content to the moderators (POST /api/complaints – everything in the query, no body). */
export const createComplaint = (v: { subjectMatterId: string; subjectMatterType: ComplaintType; text?: string }) =>
  unwrap(
    api.POST('/api/complaints', {
      params: { query: { subjectMatterId: v.subjectMatterId, subjectMatterType: v.subjectMatterType, text: v.text?.trim() || undefined } },
    }),
  );

export function useComplaint() {
  return useMutation({ mutationFn: createComplaint });
}

// ---------- CEO management and sponsoring ----------

/** Designated sponsoring in the company profile (both directions; shape in src/companies/derive.ts). */
export interface CompanyProfile {
  /** listings this company quotes as designated sponsor (market maker) */
  sponsoredListings?: Sponsorship[];
  /** designated sponsors of this company's share */
  designatedSponsors?: Sponsorship[];
}

/** Sends one of the `ceoRequests` (query parameters only, no body). */
function sendWrite(r: WriteRequest) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return unwrap((api as any)[r.method](r.path, { params: r.params }));
}

/**
 * Write actions for running a company (logo, market maker policy, salary settings, resigning,
 * CEO poll, sponsorships). One instance per form so each has its own pending/error state.
 */
export function useCompanyWrite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: sendWrite,
    onSuccess: () => {
      for (const key of ['company', 'listingprofile', 'employments', 'polls', 'shareholders', 'companies'])
        void qc.invalidateQueries({ queryKey: [key] });
    },
  });
}

/** Employment agreement of a company's CEO (id, payAutomatically, last payment) – GET /api/v2/employmentagreements?companyId=. */
export function useCompanyEmployment(companyId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['employments', 'company', companyId],
    enabled: !!companyId && enabled,
    queryFn: async () =>
      (await getPage<CompanyEmployment>('/api/v2/employmentagreements', { companyId, pageable: { page: 0, size: 5 } })).content[0] ??
      null,
    staleTime: SLOW,
  });
}

export interface CompanyEmployment {
  id: string;
  startDate?: number;
  dailyWage?: number;
  payAutomatically?: boolean;
  lastPayment?: { date?: number; nextPossiblePaymentDate?: number; salaryAmount?: number } | null;
  company?: { id?: string; ceo?: UsernameView | null };
}

/** Salary a user could collect now – GET /api/v2/possibledailysalary/{userId} ({ value: null } when nothing is due). */
export function usePossibleSalaryOf(userId: string | undefined) {
  return useQuery({
    queryKey: ['employments', 'possiblesalary', userId],
    enabled: !!userId,
    queryFn: () =>
      unwrap<{ value: number | null }>(api.GET('/api/v2/possibledailysalary/{userId}', { params: { path: { userId: userId! } } })),
    refetchInterval: SLOW,
  });
}

/** Players who sponsor the game with gold hours, most hours first. */
export function useSponsors() {
  return useQuery({
    queryKey: ['sponsoring', 'sponsors'],
    queryFn: () => getPage<Sponsor>('/api/v2/sponsors', { pageable: { page: 0, size: 50 } }),
    staleTime: 10 * SLOW,
  });
}

/** All sponsoring goals (running costs per month and features); ~280, most of them past months. */
export function useSponsoringGoals() {
  return useQuery({
    queryKey: ['sponsoring', 'goals'],
    queryFn: () => getPage<SponsoringGoal>('/api/v2/sponsoringgoals', { type: 'ALL', pageable: { page: 0, size: 500 } }),
    staleTime: 10 * SLOW,
  });
}

// ---------- Account, real estate, warrants ----------

type Schemas = import('./schema').components['schemas'];
export type UserPreferenceView = Schemas['UserPreferenceView'];
export type PremiumOrderEventView = Schemas['PremiumOrderEventView'];
export type OnlineTrackingView = Schemas['OnlineTrackingView'];
export type WarrantApiView = Schemas['WarrantView'];

/** Language of the account (server texts, e-mails): GET /api/locale answers `{ message: "de-DE" }`. */
export function useMyLocale() {
  return useQuery({
    queryKey: ['account', 'locale'],
    queryFn: async () => (await unwrap<{ message?: string | null }>(api.GET('/api/locale'))).message ?? null,
    staleTime: Infinity,
  });
}

/** Online time in minutes since registration and the last activity. */
export function useOnlineTracking() {
  return useQuery({
    queryKey: ['account', 'onlinetracking'],
    queryFn: () => unwrap<OnlineTrackingView>(api.GET('/api/v2/my/onlinetracking')),
    staleTime: SLOW,
  });
}

/** Personal notes: user preferences of type NOTE – the only kind the original game writes. */
export function useNotes() {
  return useQuery({
    queryKey: ['account', 'notes'],
    queryFn: () => getPage<UserPreferenceView>('/api/v2/userpreferences', { type: NOTE_TYPE, pageable: { page: 0, size: 200 } }),
    staleTime: SLOW,
  });
}

/** Payment events of the gold access (payment provider), newest first. */
export function usePremiumOrderEvents() {
  return useQuery({
    queryKey: ['account', 'premiumorderevents'],
    queryFn: () => getPage<PremiumOrderEventView>('/api/v2/premiumorderevents', { pageable: { page: 0, size: 50 } }),
    staleTime: SLOW,
  });
}

/** Players who registered with the own referral code, newest first. */
export function useReferredUsers() {
  return useQuery({
    queryKey: ['account', 'referredusers'],
    queryFn: () => getPage<UsernameView>('/api/v2/my/referredusers', { pageable: { page: 0, size: 200 } }),
    staleTime: SLOW,
  });
}

/** Who referred the player; the API answers `{ code, message: null }` when nobody did. */
export function useReferrer() {
  return useQuery({
    queryKey: ['account', 'referrer'],
    queryFn: async () => referrerOf(await unwrap<unknown>(api.GET('/api/v2/my/referrer'))),
    staleTime: SLOW,
  });
}

/** Players that may still be entered as referrer (they must be older than the player). */
export function usePossibleReferrers(namePart: string) {
  const q = namePart.trim();
  return useQuery({
    queryKey: ['account', 'possiblereferrers', q],
    enabled: q.length >= 2,
    queryFn: () => getPage<UsernameView>(`/api/v2/my/possibleferrers/${encodeURIComponent(q)}`, { pageable: { page: 0, size: 20 } }),
    staleTime: SLOW,
  });
}

/** Checks a gold voucher code without redeeming it (GET – the original game redeems with PATCH). */
export function usePremiumLicense(code: string) {
  const c = code.trim();
  return useQuery({
    queryKey: ['account', 'premiumlicense', c],
    enabled: c.length >= 4,
    retry: false,
    queryFn: () => unwrap<Record<string, unknown>>(api.GET('/api/v2/premiumlicenses/{licCode}', { params: { path: { licCode: c } } })),
  });
}

/** Write actions of the settings page – each one sits behind an explicit confirmation in the UI. */
export function useAccountActions() {
  const qc = useQueryClient();
  const refresh = (...keys: (readonly unknown[])[]) => () => keys.forEach((queryKey) => void qc.invalidateQueries({ queryKey }));
  return {
    /** PATCH /api/v2/my/user – one field at a time (the server sends a notice by e-mail). */
    changeUser: useMutation({
      mutationFn: (query: UserChange) => unwrap(api.PATCH('/api/v2/my/user', { params: { query } })),
      onSuccess: refresh(['me']),
    }),
    setLocale: useMutation({
      mutationFn: (locale: string) => unwrap(api.PUT('/api/locale', { params: { query: { locale } } })),
      onSuccess: refresh(['account', 'locale'], ['me']),
    }),
    /** Saves a note the way the original game does: empty text deletes, a known id edits, else creates. */
    saveNote: useMutation({
      mutationFn: (r: NoteRequest) =>
        r.method === 'DELETE'
          ? unwrap(api.DELETE('/api/v2/userpreferences/{prefId}', { params: { path: { prefId: r.id } } }))
          : r.method === 'PUT'
            ? unwrap(api.PUT('/api/v2/userpreferences/{prefId}', { params: { path: { prefId: r.id }, query: r.query } }))
            : unwrap(api.POST('/api/v2/userpreferences', { params: { query: r.query } })),
      onSuccess: refresh(['account', 'notes']),
    }),
    setReferrer: useMutation({
      mutationFn: (refId: string) => unwrap(api.PATCH('/api/v2/my/referrer/{refId}', { params: { path: { refId } } })),
      onSuccess: refresh(['account', 'referrer']),
    }),
    redeemLicense: useMutation({
      mutationFn: (licCode: string) => unwrap<{ days?: number }>(api.PATCH('/api/v2/premiumlicenses/{licCode}', { params: { path: { licCode } } })),
      onSuccess: refresh(['me'], ['account', 'premiumorderevents']),
    }),
    /** Subscription management (§ 312k BGB): a code goes to the e-mail address; with it the status can be read. */
    sendSubscriptionCode: useMutation({
      mutationFn: (email: string) => unwrap(api.POST('/api/v2/subscriptions/verify-email', { body: email })),
    }),
    subscriptionStatus: useMutation({
      mutationFn: (query: { email: string; code: string }) =>
        unwrap<Record<string, unknown>>(api.GET('/api/v2/subscriptions/status', { params: { query } })),
    }),
    cancelSubscription: useMutation({
      mutationFn: (body: string) => unwrap(api.POST('/api/v2/subscriptions/cancel', { body })),
      onSuccess: refresh(['me']),
    }),
    /** Without token the server mails a confirmation link; with the token from that link it deletes the account. */
    deleteAccount: useMutation({
      mutationFn: (deletionToken?: string) =>
        unwrap(api.DELETE('/api/v2/my/user', { params: { query: deletionToken ? { deletionToken } : {} } })),
    }),
  };
}

/** Recently traded buildings of all sizes with spread and last price (~360 within about a day). */
export function useTradedBuildings(enabled = true) {
  return useQuery({
    queryKey: ['buildings', 'traded'],
    enabled,
    queryFn: () => getPage<MarketRow>('/api/v2/mostfrequentlytradedsecurities', { type: 'BUILDING', pageable: { page: 0, size: 500 } }),
    refetchInterval: SLOW,
  });
}

/**
 * Warrants on one underlying. `/api/v2/warrants` answers 500 without `underlyingAsin`, so there is
 * no list of all warrants – the market asks per underlying.
 */
function fetchWarrants(underlyingAsin: string) {
  return getPage<WarrantApiView>('/api/v2/warrants', { underlyingAsin, pageable: { page: 0, size: 100 } });
}

export function useWarrantsOn(underlyingAsin: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['warrants', 'on', underlyingAsin],
    enabled: enabled && !!underlyingAsin,
    queryFn: () => fetchWarrants(underlyingAsin!),
    staleTime: SLOW,
  });
}

/** Warrants on several underlyings at once (market view); single failures are counted, not thrown. */
export function useWarrantsOnMany(underlyingAsins: string[], enabled = true) {
  return useQueries({
    queries: underlyingAsins.map((asin) => ({
      queryKey: ['warrants', 'on', asin],
      enabled,
      queryFn: () => fetchWarrants(asin),
      staleTime: SLOW,
      retry: false,
    })),
    combine: combineWarrants,
  });
}

function combineWarrants(rs: UseQueryResult<Page<WarrantApiView>>[]) {
  return {
    pages: rs.map((r) => r.data?.content),
    isLoading: rs.some((r) => r.isLoading),
    failed: rs.filter((r) => r.isError).length,
    updatedAt: rs.reduce((m, r) => Math.max(m, r.dataUpdatedAt), 0),
  };
}

/** One warrant by its own ASIN – `?asin=` answers with the single warrant, not with a page. */
export function useWarrant(asin: string | undefined) {
  return useQuery({
    queryKey: ['warrants', 'asin', asin],
    enabled: !!asin,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queryFn: () => unwrap<WarrantApiView>((api.GET as any)('/api/v2/warrants', { params: { query: { asin } } })),
    staleTime: SLOW,
  });
}

// ---------- ETF management (owner) ----------

/** Switch the index an ETF tracks (owner only): PUT /api/v2/etfs/{asin}/base-index?baseIndexAsin= */
export const changeEtfBaseIndex = (asin: string, baseIndexAsin: string) =>
  unwrap(api.PUT('/api/v2/etfs/{asin}/base-index', { params: { path: { asin }, query: { baseIndexAsin } } }));

/** Set the management fee in % (owner only, not while frozen): POST /api/v2/etfs/{asin}/management-fee?percent= */
export const setEtfManagementFee = (asin: string, percent: number) =>
  unwrap(api.POST('/api/v2/etfs/{asin}/management-fee', { params: { path: { asin }, query: { percent } } }));

export function useEtfManagement(asin: string) {
  const qc = useQueryClient();
  const done = () => {
    void qc.invalidateQueries({ queryKey: ['etf', asin] });
    void qc.invalidateQueries({ queryKey: ['listingprofile', asin] });
  };
  return {
    baseIndex: useMutation({ mutationFn: (index: string) => changeEtfBaseIndex(asin, index), onSuccess: done }),
    fee: useMutation({ mutationFn: (percent: number) => setEtfManagementFee(asin, percent), onSuccess: done }),
  };
}

// ---------- Company ranking and history ----------

/**
 * Where a company stands among all companies: GET /api/v2/companyhistograms/{companyId} → one
 * log-binned distribution per figure with the company's value, bin and decile. (GET
 * /api/v2/companycaps/{companyId} is the `companyCapabilities` block of the profile, not needed.)
 */
export function useCompanyHistograms(companyId: string | undefined) {
  return useQuery({
    queryKey: ['company', 'histograms', companyId],
    enabled: !!companyId,
    queryFn: () =>
      unwrap<CompanyHistograms>(api.GET('/api/v2/companyhistograms/{companyId}', { params: { path: { companyId: companyId! } } })),
    staleTime: SLOW * 10,
  });
}

/** Chronicle of a company, player or alliance (founding, renames, CEO changes, capital actions …), newest first. */
export function useEntityHistory(entityId: string | undefined) {
  return useQuery({
    queryKey: ['history', 'entity', entityId],
    enabled: !!entityId,
    // historyType as filter answers 500 – always fetch everything (500 per page is accepted).
    queryFn: () => getPage<HistoryEntry>('/api/v2/history', { entityId, pageable: { page: 0, size: 500, sort: ['date,desc'] } }),
    staleTime: SLOW,
  });
}

// ---------- Portfolio performance (trade statistics, share positions) ----------

/** One closed trade of /api/v2/trades/stats/wins|losses|best|worst (losses have the same shape). */
export type TradeResultView = Schemas['TradeWinView'];
/** GET /api/v2/sharepositions – one of my positions in one security, per account. */
export type SharePositionView = Schemas['SharePositionView'];

/**
 * Realised result of one securities account (private or company), optionally since `startDate` (ms).
 * The endpoints answer for any account id, not only for one's own.
 */
export function useTradeSummarySince(securitiesAccountId: string | undefined, startDate?: number) {
  return useQuery({
    queryKey: ['tradesummary', securitiesAccountId, startDate ?? null],
    enabled: !!securitiesAccountId,
    queryFn: () =>
      unwrap<TradeSummaryView>(api.GET('/api/v2/trades/stats/summary', { params: { query: { securitiesAccountId, startDate } } })),
    staleTime: SLOW,
  });
}

/**
 * The `size` biggest winning (`wins`, by profitLoss desc) or losing trades (`losses`, asc).
 * Without sort the API lists newest first; `sort=profitLoss,…` works.
 */
export function useTradeResults(kind: 'wins' | 'losses', securitiesAccountId: string | undefined, startDate?: number, size = 5) {
  return useQuery({
    queryKey: ['traderesults', kind, securitiesAccountId, startDate ?? null, size],
    enabled: !!securitiesAccountId,
    queryFn: () =>
      getPage<TradeResultView>(`/api/v2/trades/stats/${kind}`, {
        securitiesAccountId,
        startDate,
        pageable: { page: 0, size, sort: [kind === 'wins' ? 'profitLoss,desc' : 'profitLoss,asc'] },
      }),
    staleTime: SLOW,
  });
}

/**
 * My positions in one security across all my accounts (private + companies I lead), with
 * numberOfShares and averageBuyingPrice – GET /api/v2/sharepositions?securityIdentifier= (without
 * securitiesAccountId: the whole empire; other players' accounts answer with an empty list).
 */
export function useSharePositions(asin: string | undefined) {
  return useQuery({
    queryKey: ['sharepositions', asin],
    enabled: !!asin,
    queryFn: () => unwrap<SharePositionView[]>(api.GET('/api/v2/sharepositions', { params: { query: { securityIdentifier: asin! } } })),
    staleTime: SLOW,
  });
}

// ---------- Market maker quotes and own indexes ----------

/** The company's securities account – the `owner` of its quotes. */
export interface CompanyProfile {
  securitiesAccountId?: string;
}

export type QuoteQuery = { owner: string; securityIdentifier: string; buyPrice: number; sellPrice: number; buyShares: number; sellShares: number };

/**
 * POST /api/securityorders/quote – a designated sponsor's paired buy/sell quote (two QUOTE orders).
 * `owner` is the sponsor company's securities account. Writes to the live game.
 */
export const placeQuote = (query: QuoteQuery) => unwrap(api.POST('/api/securityorders/quote', { params: { query } }));

export function usePlaceQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: placeQuote,
    onSuccess: (_, q) => {
      for (const key of ['orders', 'portfolio', 'listingprofile', 'company']) void qc.invalidateQueries({ queryKey: [key] });
      void qc.invalidateQueries({ queryKey: ['orderbook', q.securityIdentifier] });
      void qc.invalidateQueries({ queryKey: ['pricespread', q.securityIdentifier] });
    },
  });
}

/** GET /api/v2/my/indexes – indexes the player operates (IndexView; the list form carries `membersCount`). */
export type MyIndex = Schemas['IndexView'] & { membersCount?: number };

export function useMyIndexes() {
  return useQuery({
    queryKey: ['indexes', 'mine'],
    queryFn: () => unwrap<MyIndex[]>(api.GET('/api/v2/my/indexes')),
    refetchInterval: SLOW,
  });
}

/** GET /api/v2/my/funds – ETFs the player operates (which of them track an index that is about to be deleted). */
export function useMyFunds() {
  return useQuery({
    queryKey: ['etfs', 'mine'],
    queryFn: () => unwrap<Schemas['EtfView'][]>(api.GET('/api/v2/my/funds')),
    staleTime: SLOW,
  });
}

/** Daily history of several listings; shares the cache with useDailyHistory. */
export function useDailyHistories(asins: string[]) {
  return useQueries({
    queries: asins.map((asin) => ({
      queryKey: ['history', asin],
      queryFn: async () => {
        const page = await unwrap<{ content: HistorizedListingDataView[] }>(
          api.GET('/api/v2/historizedlistingdata/{securityIdentifier}', {
            params: { path: { securityIdentifier: asin }, query: { pageable: { page: 0, size: 365, sort: ['date,desc'] } } },
            querySerializer: pageableSerializer,
          }),
        );
        return [...page.content].reverse();
      },
      staleTime: SLOW,
    })),
    combine: (results) =>
      Object.fromEntries(asins.flatMap((a, i) => (results[i]?.data ? [[a, results[i].data]] : []))) as Record<string, HistorizedListingDataView[]>,
  });
}

/** DELETE /api/v2/indexes/{securityIdentifier} – dissolves an own index. Writes to the live game. */
export const deleteIndex = (securityIdentifier: string) =>
  unwrap(api.DELETE('/api/v2/indexes/{securityIdentifier}', { params: { path: { securityIdentifier } } }));

export function useDeleteIndex() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteIndex,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['indexes'] });
      void qc.invalidateQueries({ queryKey: ['etfs', 'mine'] });
    },
  });
}

// ---------- Forum search, chat management, help texts ----------

/** A hit of GET /api/v2/posts/search: forum threads and their answers (never newspaper articles). */
export interface PostSearchHit extends PostView {
  messageBoard?: { id: string; name: string; parent?: { id: string; name: string } | null } | null;
  /** answer in a thread – the thread is `root` */
  comment?: boolean;
  root?: string | null;
}

const SEARCH_PAGE = 30;

/**
 * Full-text search in the forum. Whole words only (no prefixes, no stemming), several words = all of them.
 * `boardId` limits to exactly that board (not its sub-boards); answers are included unless `comments` is false.
 */
export function usePostSearch(search: string, opts: { boardId?: string; comments?: boolean } = {}) {
  const q = search.trim();
  const comments = opts.comments ?? true;
  return useInfiniteQuery({
    queryKey: ['forum', 'search', q, opts.boardId ?? '', comments],
    enabled: q.length >= 2,
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      getPage<PostSearchHit>('/api/v2/posts/search', {
        q,
        boardId: opts.boardId || undefined,
        includeComments: String(comments),
        pageable: { page: pageParam, size: SEARCH_PAGE },
      }),
    getNextPageParam: (last, all) => (all.length * SEARCH_PAGE < last.totalElements ? all.length : undefined),
    placeholderData: (prev) => prev,
    staleTime: SLOW,
  });
}

/**
 * Rename a group chat: PUT /api/v2/chats/{chatId}?chatName=. The endpoint also takes readonly/public –
 * they are sent unchanged so a missing flag cannot reset them.
 */
export const renameChat = (chat: Pick<ChatView, 'id' | 'readonly' | 'publicChat'>, chatName: string) =>
  unwrap(
    api.PUT('/api/v2/chats/{chatId}', {
      params: { path: { chatId: chat.id }, query: { chatName, readonly: chat.readonly, public: chat.publicChat } },
    }),
  );

/** Remove a member from a chat by the id of the membership: DELETE /api/v2/chatmemberships/{membershipId}. */
export const removeChatMember = (membershipId: string) =>
  unwrap(api.DELETE('/api/v2/chatmemberships/{membershipId}', { params: { path: { membershipId } } }));

export function useChatAdmin(chatId: string) {
  const qc = useQueryClient();
  return {
    rename: useMutation({
      mutationFn: ({ chat, name }: { chat: ChatView; name: string }) => renameChat(chat, name),
      onSuccess: (_, { name }) => {
        qc.setQueryData<ChatView[]>(chatKeys.list, (old) => old?.map((c) => (c.id === chatId ? { ...c, chatName: name } : c)));
        void qc.invalidateQueries({ queryKey: chatKeys.list });
      },
    }),
    remove: useMutation({
      mutationFn: (membershipId: string) => removeChatMember(membershipId),
      onSuccess: (_, membershipId) => {
        qc.setQueryData<ChatMembershipView[]>(chatKeys.members(chatId), (old) => old?.filter((m) => m.id !== membershipId));
        void qc.invalidateQueries({ queryKey: chatKeys.members(chatId) });
        void qc.invalidateQueries({ queryKey: chatKeys.list });
      },
    }),
  };
}

/**
 * Help text of the game for a concept (GET /api/v2/helpcomments?identifier=&locale=), e.g. `spread`,
 * `mainInterestRate`. Unknown identifiers answer 200 with „Es gibt keine Hilfe für diese Kennung“.
 * Fetched only when asked for (`enabled`) and kept for the session – the server rate-limits (429).
 */
export function useHelpComment(identifier: string, enabled = true) {
  return useQuery({
    queryKey: ['help', identifier],
    enabled: enabled && !!identifier,
    queryFn: () => unwrap<{ text?: string }>(api.GET('/api/v2/helpcomments', { params: { query: { identifier, locale: 'de' } } })),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 1,
  });
}

// ---------- Chat: unread messages everywhere (header, tab title, sidebar) ----------
// (import kept here with the hooks that use it – this file is only appended to)
import { applyIncoming, unreadSummary } from '../chat/unread';

/** Unread direct and group messages (`messages`) and chats with any (`chats` = `/my/chats/unread/count`). */
export function useChatUnread() {
  return unreadSummary(useMyChats().data);
}

/**
 * Live messages of one joined chat, open or not: the list gets it as `lastMessage` and, from someone
 * else, one more unread message right away (the chat page's own subscription only covers the open chat).
 * `onFresh` gets each new message from someone else, e.g. for a notice.
 */
export function useChatInboxTopic(chatId: string, me: string, onFresh?: (m: MessageView) => void) {
  const qc = useQueryClient();
  useTopic<MessageView>(`/user/topic/chatmessages/${chatId}`, (m) => {
    if (m.chatId !== chatId) return;
    let fresh = false;
    qc.setQueryData<ChatView[]>(chatKeys.list, (old) => {
      if (!old) return old;
      const r = applyIncoming(old, m, me);
      fresh = r.fresh;
      return r.chats;
    });
    qc.setQueryData<MessagePages>(chatKeys.messages(chatId), (old) => (old ? upsertMessage(old, m) : old));
    if (fresh) onFresh?.(m);
  });
}

let chatListSync: number | undefined;
/**
 * Chat updates pushed to `/user/topic/my/chats` replace the chat in the list (useMyChats). Whether their
 * unread count is the receiver's is unconfirmed – so the list is fetched again shortly after, bundled.
 */
export function useChatListSync() {
  const qc = useQueryClient();
  useTopic<ChatView>('/user/topic/my/chats', (c) => {
    if (c.publicChat) return;
    window.clearTimeout(chatListSync);
    chatListSync = window.setTimeout(() => void qc.invalidateQueries({ queryKey: chatKeys.list, exact: true }), 1500);
  });
  useEffect(() => () => window.clearTimeout(chatListSync), []);
}

// ---------- Market screener ----------

/**
 * All listings with a price change: the big-movers list both ways, 1.000 each. Only a few hundred
 * listings move on a day, so when both lists end at 0 every other listing is unchanged (`changeLookup`).
 */
export function useAllPriceChanges(enabled = true) {
  return useQuery({
    queryKey: ['movers', 'all'],
    enabled,
    queryFn: async () => {
      const [winners, losers] = await Promise.all([
        getPage<MarketRow>('/api/v2/securitieswithbigpricechanges', { losersFirst: false, pageable: { page: 0, size: 1000 } }),
        getPage<MarketRow>('/api/v2/securitieswithbigpricechanges', { losersFirst: true, pageable: { page: 0, size: 1000 } }),
      ]);
      return { winners: winners.content, losers: losers.content };
    },
    refetchInterval: SLOW,
  });
}

/** Book values of the 1.000 largest companies (company highscore BOOK_VALUE), only when asked for. */
export function useTopBookValues(enabled: boolean) {
  return useQuery({
    queryKey: ['highscores', 'company', 'BOOK_VALUE', 'top1000'],
    enabled,
    queryFn: () =>
      getPage<HighscoreEntry>('/api/v2/companyhighscores', { highscoreType: 'BOOK_VALUE', pageable: { page: 0, size: 1000 } }),
    staleTime: SLOW,
  });
}

/**
 * The latest 1.000 bookings of a bank account for the bank page's analysis (GET
 * /api/v2/cashtransferlogs/{id}); busy company accounts reach back about a day, private ones weeks.
 * The balance (GET /api/v2/bankaccounts/{id}) is read in the same step, so the running balance
 * starts from the balance that belongs to these bookings.
 */
export function useCashLedger(bankAccountId: string | undefined) {
  return useQuery({
    queryKey: ['cashlogs', 'ledger', bankAccountId],
    enabled: !!bankAccountId,
    queryFn: async () => {
      const account = await unwrap<{ id: string; cash: number }>(
        api.GET('/api/v2/bankaccounts/{bankAccountId}', { params: { path: { bankAccountId: bankAccountId! } } }),
      );
      const page = await getPage<CashTransferLogEntry>(`/api/v2/cashtransferlogs/${bankAccountId}`, {
        pageable: { page: 0, size: 1000, sort: ['date,desc'] },
      });
      return { ...page, cash: account.cash };
    },
    refetchInterval: SLOW,
  });
}

// ---------- Money flows (/stroeme) ----------

/** All market trades of a window, newest first; `from` is where the loaded trades really start. */
export interface TradeWindow {
  trades: FlowTrade[];
  from: number;
  to: number;
  /** false when the page limit ended the loading before `from` was reached. */
  complete: boolean;
  requests: number;
}

/** At most ~200 trades a minute are loaded (the market has ~100–170): 1.000 per request. */
const windowPages = (minutes: number) => Math.ceil(minutes / 5) + 2;

const tradeLogPage = (startDate: number, endDate: number) =>
  unwrap<SecurityOrderLogEntryView[]>(
    api.GET('/api/securityorderlogs', { params: { query: { startDate: String(startDate), endDate: String(endDate) } } }),
  );

/**
 * Every market trade of the last `minutes` (GET /api/securityorderlogs, 1.000 per request, paged back
 * with `endDate`): 1 Std. ≈ 7 requests. Refreshes only add what came after the newest known trade.
 */
export function useTradeWindow(minutes: number) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: ['tradewindow', minutes],
    queryFn: async (): Promise<TradeWindow> => {
      const to = Date.now();
      const from = to - minutes * 60_000;
      const prev = qc.getQueryData<TradeWindow>(['tradewindow', minutes]);
      if (prev?.complete && prev.trades.length) {
        const fresh = await collectPages(tradeLogPage, prev.trades[0].date, to, windowPages(minutes));
        if (fresh.complete) {
          return { trades: mergeWindow(fresh.trades, prev.trades, from), from, to, complete: true, requests: fresh.requests };
        }
      }
      const res = await collectPages(tradeLogPage, from, to, windowPages(minutes), (loaded, oldest) =>
        qc.setQueryData(['tradewindow-progress', minutes], { loaded, oldest }),
      );
      return { trades: res.trades, from: res.from, to, complete: res.complete, requests: res.requests };
    },
    staleTime: 30_000,
    refetchInterval: SLOW,
  });
}

/** Trades loaded so far while `useTradeWindow` pages back (for „lädt 3.000 Trades …“). */
export function useTradeWindowProgress(minutes: number) {
  return useQuery<{ loaded: number; oldest: number } | null>({
    queryKey: ['tradewindow-progress', minutes],
    queryFn: () => null,
    enabled: false,
  });
}

// Account names one by one, at most two at a time (the server throttles bursts).
let accountActive = 0;
const accountQueue: (() => void)[] = [];
async function fewAtATime<T>(fn: () => Promise<T>, max = 2): Promise<T> {
  if (accountActive >= max) await new Promise<void>((resolve) => accountQueue.push(resolve));
  accountActive++;
  try {
    return await fn();
  } finally {
    accountActive--;
    accountQueue.shift()?.();
  }
}

/**
 * Securities accounts by id (GET /api/v2/securitiesaccountdetails/{id}): the username for private
 * accounts, „Name (ASIN) | CEO“ for company accounts. Kept for the session.
 */
export function useAccountDetails(ids: string[]) {
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: ['accountdetails', id],
      queryFn: () =>
        fewAtATime(() =>
          unwrap<SecuritiesAccountDetailsView>(
            api.GET('/api/v2/securitiesaccountdetails/{securitiesAccountId}', { params: { path: { securitiesAccountId: id } } }),
          ),
        ),
      staleTime: Infinity,
      gcTime: Infinity,
      retry: false,
    })),
    combine: (results) => {
      const out: Record<string, SecuritiesAccountDetailsView> = {};
      for (const r of results) if (r.data?.id) out[r.data.id] = r.data;
      return { data: out, pending: results.filter((r) => r.isPending).length };
    },
  });
}

import { collectPages, mergeWindow, type Trade as FlowTrade } from '../flows/derive';

// ---------- Market class overviews ----------

// Module level: a stable combine runs only when the results change, so `data` keeps its identity.
const combineEtfs = (results: { data?: EtfView; isLoading: boolean }[]) => ({
  data: results.flatMap((r) => (r.data ? [r.data] : [])),
  isLoading: results.some((r) => r.isLoading),
});

/** Details of several ETFs (base index, fee); shares the cache with useEtf. There is no ETF list endpoint. */
export function useEtfs(asins: string[]) {
  return useQueries({
    queries: asins.map((asin) => ({
      queryKey: ['etf', asin],
      queryFn: () => unwrap<EtfView>(api.GET('/api/v2/etfs/{asin}', { params: { path: { asin } } })),
      staleTime: SLOW,
    })),
    combine: combineEtfs,
  });
}

/** Like useDailyHistories (same cache), plus whether any is still loading – for the overview's skeleton. */
export function useDailyHistoriesState(asins: string[]) {
  return useQueries({
    queries: asins.map((asin) => ({
      queryKey: ['history', asin],
      queryFn: async () => {
        const page = await unwrap<{ content: HistorizedListingDataView[] }>(
          api.GET('/api/v2/historizedlistingdata/{securityIdentifier}', {
            params: { path: { securityIdentifier: asin }, query: { pageable: { page: 0, size: 365, sort: ['date,desc'] } } },
            querySerializer: pageableSerializer,
          }),
        );
        return [...page.content].reverse();
      },
      staleTime: SLOW,
    })),
    combine: (results) => ({
      data: Object.fromEntries(asins.flatMap((a, i) => (results[i]?.data ? [[a, results[i].data]] : []))) as Record<string, HistorizedListingDataView[]>,
      isLoading: results.some((r) => r.isLoading),
    }),
  });
}
