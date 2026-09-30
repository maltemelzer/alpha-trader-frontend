import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { ApiError } from './api/client';
import { AuthProvider } from './auth/AuthProvider';
import { RequireAuth } from './auth/RequireAuth';
import { AppShell } from './app/AppShell';
import { LoginPage } from './pages/LoginPage';
import { ImpressumPage } from './legal/ImpressumPage';
import { DatenschutzPage } from './legal/DatenschutzPage';
import { MarketPage } from './market/MarketPage';
import { ExperimentsPage } from './experiments/ExperimentsPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { SecurityPage } from './security/SecurityPage';
import { ChatPage } from './chat/ChatPage';
import { OrganisationPage } from './organisation/OrganisationPage';
import { OrdersPage } from './orders/OrdersPage';
import { HighscoresPage } from './highscores/HighscoresPage';
import { PlayerPage } from './players/PlayerPage';
import { AlliancePage } from './alliances/AlliancePage';
import { AlliancesPage } from './alliances/AlliancesPage';
import { NewsPage } from './news/NewsPage';
import { MinerPage } from './me/MinerPage';
import { AchievementsPage } from './me/AchievementsPage';
import { BankPage } from './me/BankPage';
import { SettingsPage } from './me/SettingsPage';
import { PollsPage } from './polls/PollsPage';
import { ForumPage } from './forum/ForumPage';
import { CompanyRedirect } from './companies/CompanyRedirect';
import { CompaniesPage } from './companies/CompaniesPage';
import { CapitalPage } from './capital/CapitalPage';
import { CentralBankPage } from './centralbank/CentralBankPage';
import { FlowsPage } from './flows/FlowsPage';
import { SponsoringPage } from './sponsoring/SponsoringPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (n, err) => !(err instanceof ApiError && err.status < 500) && n < 2,
      refetchOnWindowFocus: true,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/anmelden" element={<LoginPage />} />
            {/* reachable without login */}
            <Route path="/impressum" element={<ImpressumPage />} />
            <Route path="/datenschutz" element={<DatenschutzPage />} />
            <Route
              element={
                <RequireAuth>
                  <AppShell />
                </RequireAuth>
              }
            >
              <Route index element={<Navigate to="/markt" replace />} />
              <Route path="markt" element={<MarketPage />} />
              <Route path="experimente" element={<ExperimentsPage />} />
              <Route path="wertpapier/:asin" element={<SecurityPage />} />
              <Route path="organisation" element={<OrganisationPage />} />
              <Route path="portfolio" element={<Navigate to="/organisation" replace />} />
              <Route path="unternehmen" element={<CompaniesPage />} />
              <Route path="unternehmen/gruenden" element={<Navigate to="/unternehmen?gruenden=1" replace />} />
              <Route path="unternehmen/:asin" element={<CompanyRedirect />} />
              <Route path="kapitalmassnahmen" element={<CapitalPage />} />
              <Route path="zentralbank" element={<CentralBankPage />} />
              <Route path="stroeme" element={<FlowsPage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="highscores" element={<HighscoresPage />} />
              <Route path="spieler/:username" element={<PlayerPage />} />
              <Route path="allianzen" element={<AlliancesPage />} />
              <Route path="allianz/:id" element={<AlliancePage />} />
              <Route path="forum/:boardId?/:postId?" element={<ForumPage />} />
              <Route path="abstimmungen" element={<PollsPage />} />
              <Route path="miner" element={<MinerPage />} />
              <Route path="erfolge" element={<AchievementsPage />} />
              <Route path="bank" element={<BankPage />} />
              <Route path="nachrichten/:chatId?" element={<ChatPage />} />
              <Route path="zeitung/:postId?" element={<NewsPage />} />
              <Route path="einstellungen" element={<SettingsPage />} />
              <Route path="sponsoring" element={<SponsoringPage />} />
              <Route path="*" element={<PlaceholderPage title="Seite nicht gefunden" />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
