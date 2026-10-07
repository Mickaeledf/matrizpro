import { lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/matrizes" element={<MatrizesPage />} />
            <Route path="/matrizes/:id" element={<MatrizDetalhePage />} />
            <Route path="/lotes" element={<LotesPage />} />
            <Route path="/lotes/:id" element={<LoteDetalhePage />} />
            <Route path="/analise" element={<AnalisePage />} />
            <Route path="/relatorios" element={<RelatoriosPage />} />
            <Route path="/configuracoes" element={<ConfiguracoesPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
