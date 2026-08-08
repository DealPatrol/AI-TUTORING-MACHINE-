import "./globals.css";

export const metadata = {
  title: "AI Tutor Machine - Dashboard",
  description: "Monitor and run the AI Tutor Machine growth engine.",
};

export default function RootLayout({ children }) {
  return <html lang="en" className="bg-background"><body>{children}</body></html>;
}
