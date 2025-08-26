'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { 
  ChevronUp, 
  ChevronDown, 
  Search, 
  Filter, 
  Download, 
  RefreshCw,
  Calendar,
  Users,
  MoreHorizontal,
  ArrowUpDown,
  X
} from 'lucide-react'

interface ColumnDef<T> {
  key: string
  title: string
  sortable?: boolean
  filterable?: boolean
  searchable?: boolean
  render?: (value: any, row: T) => React.ReactNode
  width?: string
  filterType?: 'text' | 'select' | 'date' | 'number' | 'boolean'
  filterOptions?: Array<{ value: string; label: string }>
}

interface SortConfig {
  key: string
  direction: 'asc' | 'desc'
}

interface FilterConfig {
  [key: string]: any
}

interface AdvancedDataTableProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  loading?: boolean
  title?: string
  subtitle?: string
  onRefresh?: () => void
  onExport?: () => void
  globalSearch?: boolean
  pagination?: boolean
  pageSize?: number
  className?: string
}

function AdvancedDataTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  title,
  subtitle,
  onRefresh,
  onExport,
  globalSearch = true,
  pagination = true,
  pageSize = 20,
  className = ''
}: AdvancedDataTableProps<T>) {
  
  // State
  const [globalSearchTerm, setGlobalSearchTerm] = useState('')
  const [sortConfigs, setSortConfigs] = useState<SortConfig[]>([])
  const [filters, setFilters] = useState<FilterConfig>({})
  const [currentPage, setCurrentPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedPageSize, setSelectedPageSize] = useState(pageSize)

  // Helper functions
  const getNestedValue = (obj: any, path: string) => {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  // Global search function
  const globalSearchFilter = useCallback((item: T, searchTerm: string) => {
    if (!searchTerm) return true
    
    const searchLower = searchTerm.toLowerCase()
    
    return columns.some(column => {
      if (column.searchable === false) return false
      
      const value = getNestedValue(item, column.key)
      
      if (value === null || value === undefined) return false
      
      const stringValue = String(value).toLowerCase()
      return stringValue.includes(searchLower)
    })
  }, [columns])

  // Column-specific filters
  const columnFilters = useCallback((item: T) => {
    return Object.entries(filters).every(([key, filterValue]) => {
      if (!filterValue || filterValue === '') return true
      
      const column = columns.find(col => col.key === key)
      if (!column || !column.filterable) return true
      
      const itemValue = getNestedValue(item, key)
      
      switch (column.filterType) {
        case 'text':
          return String(itemValue).toLowerCase().includes(String(filterValue).toLowerCase())
        case 'select':
          return itemValue === filterValue
        case 'date':
          if (!itemValue) return false
          const itemDate = new Date(itemValue).toISOString().split('T')[0]
          return itemDate === filterValue
        case 'number':
          return Number(itemValue) === Number(filterValue)
        case 'boolean':
          return Boolean(itemValue) === (filterValue === 'true')
        default:
          return String(itemValue).toLowerCase().includes(String(filterValue).toLowerCase())
      }
    })
  }, [filters, columns])

  // Sorting function
  const sortData = useCallback((data: T[]) => {
    if (sortConfigs.length === 0) return data
    
    return [...data].sort((a, b) => {
      for (const sortConfig of sortConfigs) {
        const aValue = getNestedValue(a, sortConfig.key)
        const bValue = getNestedValue(b, sortConfig.key)
        
        // Handle null/undefined values
        if (aValue === null || aValue === undefined) return 1
        if (bValue === null || bValue === undefined) return -1
        
        let comparison = 0
        
        // Date comparison
        if (sortConfig.key.includes('date') || sortConfig.key.includes('created_at')) {
          comparison = new Date(aValue).getTime() - new Date(bValue).getTime()
        }
        // Number comparison
        else if (typeof aValue === 'number' && typeof bValue === 'number') {
          comparison = aValue - bValue
        }
        // String comparison
        else {
          comparison = String(aValue).localeCompare(String(bValue), 'he')
        }
        
        if (comparison !== 0) {
          return sortConfig.direction === 'asc' ? comparison : -comparison
        }
      }
      return 0
    })
  }, [sortConfigs])

  // Handle sorting
  const handleSort = (columnKey: string) => {
    setSortConfigs(prev => {
      const existingIndex = prev.findIndex(config => config.key === columnKey)
      
      if (existingIndex >= 0) {
        const newConfigs = [...prev]
        if (newConfigs[existingIndex].direction === 'asc') {
          newConfigs[existingIndex].direction = 'desc'
        } else {
          newConfigs.splice(existingIndex, 1)
        }
        return newConfigs
      } else {
        return [...prev, { key: columnKey, direction: 'asc' }]
      }
    })
  }

  // Handle filter change
  const handleFilterChange = (columnKey: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [columnKey]: value
    }))
    setCurrentPage(1) // Reset to first page when filtering
  }

  // Clear all filters
  const clearAllFilters = () => {
    setFilters({})
    setGlobalSearchTerm('')
    setSortConfigs([])
    setCurrentPage(1)
  }

  // Processed data
  const processedData = useMemo(() => {
    let filtered = data
    
    // Apply global search
    if (globalSearchTerm) {
      filtered = filtered.filter(item => globalSearchFilter(item, globalSearchTerm))
    }
    
    // Apply column filters
    filtered = filtered.filter(columnFilters)
    
    // Apply sorting
    const sorted = sortData(filtered)
    
    return sorted
  }, [data, globalSearchTerm, filters, sortConfigs, globalSearchFilter, columnFilters, sortData])

  // Pagination
  const totalItems = processedData.length
  const totalPages = Math.ceil(totalItems / selectedPageSize)
  const startIndex = (currentPage - 1) * selectedPageSize
  const endIndex = startIndex + selectedPageSize
  const paginatedData = pagination ? processedData.slice(startIndex, endIndex) : processedData

  // Get sort icon for column
  const getSortIcon = (columnKey: string) => {
    const sortConfig = sortConfigs.find(config => config.key === columnKey)
    if (!sortConfig) return <ArrowUpDown className="w-4 h-4 text-gray-400" />
    
    return sortConfig.direction === 'asc' 
      ? <ChevronUp className="w-4 h-4 text-blue-600" />
      : <ChevronDown className="w-4 h-4 text-blue-600" />
  }

  // Active filters count
  const activeFiltersCount = Object.values(filters).filter(v => v && v !== '').length + 
    (globalSearchTerm ? 1 : 0)

  // Export functionality
  const handleExport = () => {
    if (onExport) {
      onExport()
      return
    }
    
    // Default CSV export
    const headers = columns.map(col => col.title).join(',')
    const rows = processedData.map(item => 
      columns.map(col => {
        const value = getNestedValue(item, col.key)
        // Escape CSV values
        return typeof value === 'string' && value.includes(',') 
          ? `"${value.replace(/"/g, '""')}"` 
          : value
      }).join(',')
    ).join('\n')
    
    const csv = `${headers}\n${rows}`
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title || 'data'}_export.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className={`bg-white rounded-2xl shadow-lg border border-gray-100 ${className}`}>
      
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            {title && <h2 className="text-xl font-bold text-gray-900">{title}</h2>}
            {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={loading}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="רענן נתונים"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            )}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg transition-colors relative ${
                showFilters || activeFiltersCount > 0
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
              title="פילטרים"
            >
              <Filter className="w-5 h-5" />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>
            <button
              onClick={handleExport}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="ייצא לקובץ"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Global Search */}
      {globalSearch && (
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={globalSearchTerm}
              onChange={(e) => {
                setGlobalSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              placeholder="חיפוש כללי בכל הנתונים..."
              className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {globalSearchTerm && (
              <button
                onClick={() => setGlobalSearchTerm('')}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Advanced Filters */}
      {showFilters && (
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-900">פילטרים מתקדמים</h3>
            <button
              onClick={clearAllFilters}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              נקה הכל
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {columns.filter(col => col.filterable !== false).map(column => (
              <div key={column.key}>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {column.title}
                </label>
                
                {column.filterType === 'select' ? (
                  <select
                    value={filters[column.key] || ''}
                    onChange={(e) => handleFilterChange(column.key, e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">הכל</option>
                    {column.filterOptions?.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : column.filterType === 'date' ? (
                  <input
                    type="date"
                    value={filters[column.key] || ''}
                    onChange={(e) => handleFilterChange(column.key, e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                ) : column.filterType === 'number' ? (
                  <input
                    type="number"
                    value={filters[column.key] || ''}
                    onChange={(e) => handleFilterChange(column.key, e.target.value)}
                    placeholder={`סנן לפי ${column.title}`}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                ) : (
                  <input
                    type="text"
                    value={filters[column.key] || ''}
                    onChange={(e) => handleFilterChange(column.key, e.target.value)}
                    placeholder={`סנן לפי ${column.title}`}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden">
        <table className="w-full table-fixed divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map(column => (
                <th
                  key={column.key}
                  className={`px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.sortable !== false ? 'cursor-pointer hover:bg-gray-100' : ''
                  } ${column.width || ''}`}
                  onClick={() => column.sortable !== false && handleSort(column.key)}
                >
                  <div className="flex items-center justify-between">
                    <span>{column.title}</span>
                    {column.sortable !== false && getSortIcon(column.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center">
                  <div className="flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                    <span className="mr-2 text-gray-600">טוען נתונים...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-gray-500">
                  {activeFiltersCount > 0 ? 'לא נמצאו תוצאות לפילטרים שנבחרו' : 'אין נתונים להצגה'}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  {columns.map(column => (
                    <td key={column.key} className={`px-4 py-4 text-sm text-gray-900 truncate ${column.width || ''}`}>
                      <div className="truncate" title={String(getNestedValue(row, column.key) || '-')}>
                        {column.render 
                          ? column.render(getNestedValue(row, column.key), row)
                          : getNestedValue(row, column.key) || '-'
                        }
                      </div>
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && totalItems > 0 && (
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">שורות בעמוד:</span>
              <select
                value={selectedPageSize}
                onChange={(e) => {
                  setSelectedPageSize(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              >
                {[10, 20, 50, 100].map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>
            <span className="text-sm text-gray-600">
              מציג {startIndex + 1} עד {Math.min(endIndex, totalItems)} מתוך {totalItems} רשומות
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              קודם
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = i + 1
                if (totalPages > 5 && currentPage > 3) {
                  pageNum = currentPage - 2 + i
                  if (pageNum > totalPages) pageNum = totalPages - 4 + i
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1 text-sm rounded ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              הבא
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdvancedDataTable 