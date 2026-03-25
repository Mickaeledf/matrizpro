import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import DashboardPage from "@/pages/DashboardPage";
import MatrizesPage from "@/pages/MatrizesPage";
import LotesPage from "@/pages/LotesPage";
import AnalisePage from "@/pages/AnalisePage";
import RelatoriosPage from "@/pages/RelatoriosPage";
import ConfiguracoesPage from "@/pages/ConfiguracoesPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <AppLayout>
                <DashboardPage />
              </AppLayout>
            }
          />
          <Route
            path="/matrizes"
            element={
              <AppLayout>
                <MatrizesPage />
              </AppLayout>
            }
          />
          <Route
            path="/lotes"
            element={
              <AppLayout>
                <LotesPage />
              </AppLayout>
            }
          />
          <Route
            path="/analise"
            element={
              <AppLayout>
                <AnalisePage />
              </AppLayout>
            }
          />
          <Route
            path="/relatorios"
            element={
              <AppLayout>
                <RelatoriosPage />
              </AppLayout>
            }
          />
          <Route
            path="/configuracoes"
            element={
              <AppLayout>
                <ConfiguracoesPage />
              </AppLayout>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
