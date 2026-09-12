import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Quiz Agent",
  description: "Generate and take quizzes from a Markdown source",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
