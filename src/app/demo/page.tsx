import Link from 'next/link';

export default function DemoPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Celora V2 Demo Pages</h1>
      
      <p className="mb-8 text-gray-600">
        These pages demonstrate various features of the Celora V2 platform.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Network Status Demo */}
        <Link href="/demo/network-status" passHref>
          <div className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer">
            <h2 className="text-xl font-semibold mb-2">Network Status</h2>
            <p className="text-gray-600 mb-4">
              Demonstrates the network status indicators and offline handling components.
            </p>
            <span className="text-blue-500 hover:underline">View Demo &rarr;</span>
          </div>
        </Link>
        
        {/* Multi-Currency Demo */}
        <Link href="/demo/multi-currency" passHref>
          <div className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer">
            <h2 className="text-xl font-semibold mb-2">Multi-Currency</h2>
            <p className="text-gray-600 mb-4">
              Demonstrates the multi-currency components and currency conversion features.
            </p>
            <span className="text-blue-500 hover:underline">View Demo &rarr;</span>
          </div>
        </Link>
        
        {/* Feature Flags Demo */}
        <Link href="/demo/feature-flags" passHref>
          <div className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer">
            <h2 className="text-xl font-semibold mb-2">Feature Flags</h2>
            <p className="text-gray-600 mb-4">
              Demonstrates the feature flag system and targeting rules.
            </p>
            <span className="text-blue-500 hover:underline">View Demo &rarr;</span>
          </div>
        </Link>
      </div>
    </div>
  );
}