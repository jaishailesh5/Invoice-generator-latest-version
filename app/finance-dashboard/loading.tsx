export default function Loading() {
  return (
    <div className="container mx-auto p-6">
      <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-6"></div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="h-6 w-36 bg-gray-200 rounded animate-pulse mb-2"></div>
        <div className="h-4 w-64 bg-gray-200 rounded animate-pulse mb-4"></div>

        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        </div>

        <div className="mt-6">
          <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    </div>
  )
}
