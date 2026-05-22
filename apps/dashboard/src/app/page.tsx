export default function Home() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Welcome to Atlas</h1>
      <p className="mt-2 text-gray-600">Your location intelligence platform.</p>
      <div className="mt-8 grid grid-cols-2 gap-6">
        <a
          href="/stores"
          className="rounded-lg border border-gray-200 p-6 transition hover:border-blue-500 hover:shadow"
        >
          <h2 className="text-lg font-semibold">Stores</h2>
          <p className="mt-1 text-sm text-gray-500">Manage your store locations</p>
        </a>
        <a
          href="/api-keys"
          className="rounded-lg border border-gray-200 p-6 transition hover:border-blue-500 hover:shadow"
        >
          <h2 className="text-lg font-semibold">API Keys</h2>
          <p className="mt-1 text-sm text-gray-500">Manage your API credentials</p>
        </a>
        <a
          href="/map-styles"
          className="rounded-lg border border-gray-200 p-6 transition hover:border-blue-500 hover:shadow"
        >
          <h2 className="text-lg font-semibold">Map Styles</h2>
          <p className="mt-1 text-sm text-gray-500">Customize your map appearance</p>
        </a>
        <a
          href="/usage"
          className="rounded-lg border border-gray-200 p-6 transition hover:border-blue-500 hover:shadow"
        >
          <h2 className="text-lg font-semibold">Usage</h2>
          <p className="mt-1 text-sm text-gray-500">Monitor your API usage</p>
        </a>
      </div>
    </div>
  );
}
