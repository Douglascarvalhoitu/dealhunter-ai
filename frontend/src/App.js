import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./lib/auth";
import { Toaster } from "sonner";

import Home from "./pages/Home";
import DealsPage from "./pages/DealsPage";
import SearchResults from "./pages/SearchResults";
import CategoryPage from "./pages/CategoryPage";
import ProductDetail from "./pages/ProductDetail";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminProducts from "./pages/AdminProducts";
import AdminAIControl from "./pages/AdminAIControl";
import AdminAIContent from "./pages/AdminAIContent";
import AdminNetworks from "./pages/AdminNetworks";
import AdminReports from "./pages/AdminReports";
import AdminImport from "./pages/AdminImport";
import AdminSettings from "./pages/AdminSettings";
import FavoritesPage from "./pages/FavoritesPage";
import ComparePage from "./pages/ComparePage";
import { BlogList, BlogPost } from "./pages/BlogPages";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <Toaster position="top-right" richColors />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/deals" element={<DealsPage />} />
            <Route path="/search" element={<SearchResults />} />
            <Route path="/category/:slug" element={<CategoryPage />} />
            <Route path="/product/:slug" element={<ProductDetail />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/blog" element={<BlogList />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/products" element={<AdminProducts />} />
            <Route path="/admin/ai-control" element={<AdminAIControl />} />
            <Route path="/admin/ai-content" element={<AdminAIContent />} />
            <Route path="/admin/networks" element={<AdminNetworks />} />
            <Route path="/admin/import" element={<AdminImport />} />
            <Route path="/admin/reports" element={<AdminReports />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
