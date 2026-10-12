import { lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import { RotaProtegida } from "@/components/RotaProtegida";
import { AuthProvider } from "@/contexts/AuthProvider";
import LoginPage from "@/pages/LoginPage";
import RedefinirSenhaPage from "@/pages/RedefinirSenhaPage";
import NotFound from "@/pages/NotFound";

// Páginas carregadas sob demanda para reduzir o bundle inicial
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const MatrizesPage = lazy(() => import("@/pages/MatrizesPage"));
const MatrizDetalhePage = lazy(() => import("@/pages/MatrizDetalhePage"));
const LotesPage = lazy(() => import("@/pages/LotesPage"));
const LoteDetalhePage = lazy(() => import("@/pages/LoteDetalhePage"));
const AnalisePage = lazy(() => import("@/pages/AnalisePage"));
const RelatoriosPage = lazy(() => import("@/pages/RelatoriosPage"));
const ConfiguracoesPage = lazy(() => import("@/pages/ConfiguracoesPage"));
const ReprodutoresPage = lazy(() => import("@/pages/ReprodutoresPage"));
const SuportePage = lazy(() => import("@/pages/SuportePage"));
const AssinantesPage = lazy(() => import("@/pages/AssinantesPage"));
const FaturamentoPage = lazy(() => import("@/pages/FaturamentoPage"));
const MensagensPage = lazy(() => import("@/pages/MensagensPage"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/redefinir-senha" element={<RedefinirSenhaPage />} />
            {/* Todas as telas do sistema exigem login */}
            <Route
              element={
                <RotaProtegida>
                  <AppLayout />
                </RotaProtegida>
              }
            >
              <Route path="/" element={<DashboardPage />} />
              <Route path="/matrizes" element={<MatrizesPage />} />
              <Route path="/matrizes/:id" element={<MatrizDetalhePage />} />
              <Route path="/lotes" element={<LotesPage />} />
              <Route path="/lotes/:id" element={<LoteDetalhePage />} />
              <Route path="/faturamento" element={<FaturamentoPage />} />
              <Route path="/mensagens" element={<MensagensPage />} />
              <Route path="/analise" element={<AnalisePage />} />
              <Route path="/relatorios" element={<RelatoriosPage />} />
              <Route path="/reprodutores" element={<ReprodutoresPage />} />
              <Route path="/suporte" element={<SuportePage />} />
              <Route path="/assinantes" element={<AssinantesPage />} />
              <Route path="/configuracoes" element={<ConfiguracoesPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
