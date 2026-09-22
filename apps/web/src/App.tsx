import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "@/routes/login";
import NewQuizPage from "@/routes/quizzes-new";
import QuizHistoryPage from "@/routes/quizzes-history";
import QuizDetailPage from "@/routes/quiz-detail";
import ProtectedRoute from "@/routes/protected-route";
import { AppShell } from "@/components/layout/compositions/app-shell";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/quizzes/new" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route path="/quizzes" element={<QuizHistoryPage />} />
          <Route path="/quizzes/new" element={<NewQuizPage />} />
          <Route path="/quizzes/:id" element={<QuizDetailPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
