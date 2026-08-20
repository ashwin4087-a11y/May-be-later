import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Collections from './pages/Collections';
import CollectionDetail from './pages/CollectionDetail';
import Duplicates from './pages/Duplicates';
import AllItems from './pages/AllItems';
import Favorites from './pages/Favorites';
import Unorganized from './pages/Unorganized';
import NeedsReview from './pages/NeedsReview';
import Settings from './pages/Settings';
import Search from './pages/Search';
import ProtectedRoute from './components/ProtectedRoute';
import AuthenticatedLayout from './components/AuthenticatedLayout';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <Dashboard />
              </AuthenticatedLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/collections" 
          element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <Collections />
              </AuthenticatedLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/collections/:id" 
          element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <CollectionDetail />
              </AuthenticatedLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/duplicates" 
          element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <Duplicates />
              </AuthenticatedLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/all" 
          element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <AllItems />
              </AuthenticatedLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/favorites" 
          element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <Favorites />
              </AuthenticatedLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/unorganized" 
          element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <Unorganized />
              </AuthenticatedLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/review" 
          element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <NeedsReview />
              </AuthenticatedLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/search" 
          element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <Search />
              </AuthenticatedLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/settings" 
          element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <Settings />
              </AuthenticatedLayout>
            </ProtectedRoute>
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
