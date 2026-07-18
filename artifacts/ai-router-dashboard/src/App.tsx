import { Routes, Route, Navigate } from "react-router-dom";
import { AuthPage } from "./pages/AuthPage.tsx";
import { Layout } from "./components/Layout.tsx";
import { OverviewPage } from "./pages/OverviewPage.tsx";
import { KeysPage } from "./pages/KeysPage.tsx";
import { BillingPage } from "./pages/BillingPage.tsx";
import { AliasesPage } from "./pages/AliasesPage.tsx";
import { DocsPage } from "./pages/DocsPage.tsx";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("router_token");
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/signup" element={<AuthPage mode="signup" />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Navigate to="/overview" replace />} />
        <Route path="overview" element={<OverviewPage />} />
        <Route path="keys" element={<KeysPage />} />
        <Route path="aliases" element={<AliasesPage />} />
        <Route path="billing" element={<BillingPage />} />
        <Route path="docs" element={<DocsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/overview" replace />} />
    </Routes>
  );
}
