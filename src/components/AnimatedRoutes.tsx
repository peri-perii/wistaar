import { lazy, Suspense } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import PageTransition from "./PageTransition";
import ScrollToTop from "./ScrollToTop";
import { ExploreSkeleton, LibrarySkeleton, BookDetailSkeleton } from "./PageSkeletons";
import PageSkeleton from "./PageSkeleton";

// Eager-load the homepage for fast initial paint
import Index from "@/pages/Index";

// Lazy-load all other routes
const Explore = lazy(() => import("@/pages/Explore"));
const Publish = lazy(() => import("@/pages/Publish"));
const Auth = lazy(() => import("@/pages/Auth"));
const AuthorSignup = lazy(() => import("@/pages/AuthorSignup"));
const AuthorDashboard = lazy(() => import("@/pages/AuthorDashboard"));
const BookSubmit = lazy(() => import("@/pages/BookSubmit"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const BookDetail = lazy(() => import("@/pages/BookDetail"));
const Read = lazy(() => import("@/pages/Read"));
const BookReader = lazy(() => import("@/pages/BookReader"));
const Library = lazy(() => import("@/pages/Library"));
const Cart = lazy(() => import("@/pages/Cart"));
const Profile = lazy(() => import("@/pages/Profile"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const LazyFallback = () => (
  <div className="min-h-screen bg-background">
    <PageSkeleton />
  </div>
);

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<LazyFallback />}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route
              path="/"
              element={
                <PageTransition>
                  <Index />
                </PageTransition>
              }
            />
            <Route
              path="/explore"
              element={
                <PageTransition skeleton={<ExploreSkeleton />}>
                  <Explore />
                </PageTransition>
              }
            />
            <Route
              path="/publish"
              element={
                <PageTransition>
                  <Publish />
                </PageTransition>
              }
            />
            <Route
              path="/auth"
              element={
                <PageTransition>
                  <Auth />
                </PageTransition>
              }
            />
            <Route
              path="/author/signup"
              element={
                <PageTransition>
                  <AuthorSignup />
                </PageTransition>
              }
            />
            <Route
              path="/author/dashboard"
              element={
                <PageTransition>
                  <AuthorDashboard />
                </PageTransition>
              }
            />
            <Route
              path="/author/submit"
              element={
                <PageTransition>
                  <BookSubmit />
                </PageTransition>
              }
            />
            <Route
              path="/admin"
              element={
                <PageTransition>
                  <AdminDashboard />
                </PageTransition>
              }
            />
            <Route
              path="/book/:id"
              element={
                <PageTransition skeleton={<BookDetailSkeleton />}>
                  <BookDetail />
                </PageTransition>
              }
            />
            <Route
              path="/read/:id"
              element={
                <PageTransition>
                  <Read />
                </PageTransition>
              }
            />
            <Route
              path="/reader/:id"
              element={
                <PageTransition>
                  <BookReader />
                </PageTransition>
              }
            />
            <Route
              path="/library"
              element={
                <PageTransition skeleton={<LibrarySkeleton />}>
                  <Library />
                </PageTransition>
              }
            />
            <Route
              path="/cart"
              element={
                <PageTransition>
                  <Cart />
                </PageTransition>
              }
            />
            <Route
              path="/profile"
              element={
                <PageTransition>
                  <Profile />
                </PageTransition>
              }
            />
            <Route
              path="*"
              element={
                <PageTransition>
                  <NotFound />
                </PageTransition>
              }
            />
          </Routes>
        </AnimatePresence>
      </Suspense>
    </>
  );
};

export default AnimatedRoutes;
