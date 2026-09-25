// View types used by the UI. Where the OpenAPI spec types a response, alias the generated
// schema; where it only says `object` (listing profiles, order book, portfolio), the shape
// below is taken from real responses – keep it minimal and extend when needed.
import type { components } from './schema';

type S = components['schemas'];

export type PriceSpreadView = S['PriceSpreadView'];
export type ListingView = S['ListingView'];
export type ShareholderView = S['ShareholderView'];
export type SecurityOrderLogEntryView = S['SecurityOrderLogEntryView'];
export type HistorizedListingDataView = S['HistorizedListingDataView'];
export type UserAccountView = S['UserAccountView'];
export type CompanyView = S['CompanyView'];
export type SearchResult = S['SearchResult'];
export type OrderCheck = S['OrderCheck'];
/** GET /api/securityorders/counterparty/{id} – OTC orders addressed to an account */
export type SecurityOrderWithVolumeView = S['SecurityOrderWithVolumeView'];
/** GET /api/v2/securitiesaccountdetails?search= – possible OTC counterparties */
export type SecuritiesAccountDetailsView = S['SecuritiesAccountDetailsView'];

export interface PricePoint {
  value: number;
  date: number;
}

/** GET /api/listingprofiles/{asin} */
export interface ListingProfile {
  id: string;
  name: string;
  securityIdentifier: string;
  type: NonNullable<ListingView['type']>;
  startDate: number;
  endDate: number | null;
  marketCap?: number;
  outstandingShares?: number;
  lastPrice?: PricePoint;
  /** ~500 points over the last 14 days */
  prices14d?: PricePoint[];
  currentSpread?: PriceSpreadView;
  logoUrl?: string | null;
  company?: {
    id: string;
    name: string;
    logoUrl?: string | null;
    marketMakerPolicy?: string;
    achievementCount?: number;
    achievementTotal?: number;
    ceo?: { id: string; username: string };
    ceoEmploymentAgreement?: { dailyWage?: number };
    companyCapabilities?: {
      bookValue?: number;
      bookValuePerShare?: number;
      netCash?: number;
      netCashPerShare?: number;
      bank?: boolean;
    };
  } | null;
  bond?: { faceValue?: number; interestRate?: number; maturityDate?: number } | null;
  /** SystemBondView for SYSTEM_BOND listings */
  systemBond?: import('../../vendor/bankiersgruen').BondView | null;
  /** BuildingView: type like OFFICE1200, size in m² */
  building?: { type?: string; size?: number } | null;
}

/** GET /api/orderbook/{asin} */
export interface OrderbookView {
  buyEntries: { priceLimit: number; size: number }[];
  sellEntries: { priceLimit: number; size: number }[];
  maxBuySize?: number;
  maxSellSize?: number;
}

/** GET /api/v2/my/portfolio */
export interface PortfolioView {
  securitiesAccountId: string;
  cash: number;
  committedCash: number;
  positions: {
    securityIdentifier: string;
    numberOfShares: number;
    committedShares: number;
    averageBuyingPrice: number;
    lastPrice?: PricePoint;
    volume: number;
    type?: string;
    listing: ListingView & { securityIdentifier: string; name: string };
    lastBuyingPrice?: number;
    lastPriceUpdate?: number;
    currentBidPrice?: number;
    currentBidSize?: number;
    currentAskPrice?: number;
    currentAskSize?: number;
  }[];
}

/** GET /api/v2/my/portfolio/summary */
export interface PortfolioSummary {
  securitiesAccountId: string;
  cash: number;
  committedCash: number;
  totalValue: number;
  positionCount: number;
}

/** The design system's PriceSpread wants lastPrice.value to be set; the API marks it optional. */
export function toSpread(v: PriceSpreadView | undefined) {
  if (!v) return undefined;
  const { lastPrice, ...rest } = v;
  return { ...rest, lastPrice: lastPrice?.value != null ? { value: lastPrice.value, date: lastPrice.date } : undefined };
}

export type UsernameView = S['UsernameView'];
export type MessageView = S['MessageView'];

/** GET /api/v2/my/chats – the spec's CompactChatView lacks most fields. */
export interface ChatView {
  id: string;
  chatName: string | null;
  groupChat: boolean;
  publicChat: boolean;
  readonly: boolean;
  status?: 'NEW' | 'STANDARD' | 'DELETED';
  dateCreated: number;
  numOfUnreadMessages: number;
  /** In direct chats: the other side; in lobbies only the owner. */
  participants: UsernameView[];
  owner?: UsernameView;
  lastMessage?: MessageView | null;
}

/** GET /api/v2/chatmemberships?chatId=… */
export interface ChatMembershipView {
  id: string;
  chatId: string;
  online: boolean;
  role: 'READER' | 'AUTHOR' | 'MODERATOR' | 'DEPUTY' | 'OWNER';
  member: UsernameView;
}

/** GET /api/chatrooms – public rooms, joined or not. */
export interface ChatRoomView {
  id: string;
  name: string;
  numberOfMembers: number;
  dateCreated?: number;
}
