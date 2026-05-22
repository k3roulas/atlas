import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Atlas Dashboard',
  description: 'Developer console for Atlas Location Intelligence Platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900 antialiased">
        <div className="flex min-h-screen">
          <nav className="w-64 border-r border-gray-200 bg-gray-50 p-6">
            <a href="/" className="text-xl font-bold text-gray-900">
              Atlas
            </a>
            <ul className="mt-8 space-y-2">
              <li>
                <a
                  href="/stores"
                  className="block rounded px-3 py-2 text-gray-700 hover:bg-gray-200"
                >
                  Stores
                </a>
              </li>
              <li>
                <a
                  href="/api-keys"
                  className="block rounded px-3 py-2 text-gray-700 hover:bg-gray-200"
                >
                  API Keys
                </a>
              </li>
              <li>
                <a
                  href="/map-styles"
                  className="block rounded px-3 py-2 text-gray-700 hover:bg-gray-200"
                >
                  Map Styles
                </a>
              </li>
              <li>
                <a
                  href="/usage"
                  className="block rounded px-3 py-2 text-gray-700 hover:bg-gray-200"
                >
                  Usage
                </a>
              </li>
            </ul>
          </nav>
          <main className="flex-1 p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
