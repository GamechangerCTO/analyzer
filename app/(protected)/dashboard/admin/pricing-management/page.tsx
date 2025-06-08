'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'

interface QuotaPackage {
  id: string
  package_key: string
  name: string
  description: string
  users_count: number
  base_price: number
  is_active: boolean
  is_popular: boolean
  sort_order: number
}

interface Discount {
  id: string
  name: string
  discount_code: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  min_package_price: number
  max_uses: number | null
  current_uses: number
  is_active: boolean
  valid_from: string
  valid_until: string | null
}

export default function PricingManagementPage() {
  const [packages, setPackages] = useState<QuotaPackage[]>([
    {
      id: '1',
      package_key: 'basic',
      name: 'BASIC',
      description: 'ניתוחי שיחות, דוחות - מחיר למשתמש לחודש',
      users_count: 1, // מחיר למשתמש יחיד
      base_price: 29, // מחיר חודשי
      is_active: true,
      is_popular: false,
      sort_order: 1
    },
    {
      id: '2',
      package_key: 'professional',
      name: 'PROFESSIONAL',
      description: 'ניתוחי שיחות, דוחות, סימולציות - מחיר למשתמש לחודש',
      users_count: 1, // מחיר למשתמש יחיד
      base_price: 89, // מחיר חודשי
      is_active: true,
      is_popular: true,
      sort_order: 2
    },
    {
      id: '3',
      package_key: 'premium',
      name: 'PREMIUM',
      description: 'ניתוחי שיחות, דוחות, סימולציות, יועץ מלווה שעה בחודש - מחיר למשתמש לחודש',
      users_count: 1, // מחיר למשתמש יחיד
      base_price: 109, // מחיר חודשי
      is_active: true,
      is_popular: false,
      sort_order: 3
    }
  ])

  const [discounts, setDiscounts] = useState<Discount[]>([
    {
      id: '1',
      name: 'הנחת השקה',
      discount_code: 'LAUNCH20',
      discount_type: 'percentage',
      discount_value: 20,
      min_package_price: 200,
      max_uses: 100,
      current_uses: 15,
      is_active: true,
      valid_from: new Date().toISOString(),
      valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    }
  ])

  const [activeTab, setActiveTab] = useState<'packages' | 'discounts'>('packages')
  const [editingPackage, setEditingPackage] = useState<QuotaPackage | null>(null)
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null)
  const [showPackageModal, setShowPackageModal] = useState(false)
  const [showDiscountModal, setShowDiscountModal] = useState(false)

  const handleSavePackage = async (packageData: Partial<QuotaPackage>) => {
    try {
      if (editingPackage) {
        setPackages(packages.map(pkg => 
          pkg.id === editingPackage.id 
            ? { ...pkg, ...packageData }
            : pkg
        ))
        alert('✅ החבילה עודכנה בהצלחה!')
      } else {
        const newPackage: QuotaPackage = {
          id: Date.now().toString(),
          package_key: packageData.package_key || '',
          name: packageData.name || '',
          description: packageData.description || '',
          users_count: packageData.users_count || 0,
          base_price: packageData.base_price || 0,
          is_active: packageData.is_active ?? true,
          is_popular: packageData.is_popular ?? false,
          sort_order: packageData.sort_order || packages.length + 1
        }
        setPackages([...packages, newPackage])
        alert('✅ החבילה נוצרה בהצלחה!')
      }
      
      setShowPackageModal(false)
      setEditingPackage(null)
    } catch (error) {
      console.error('Error saving package:', error)
      alert('❌ שגיאה בשמירת החבילה')
    }
  }

  const handleSaveDiscount = async (discountData: Partial<Discount>) => {
    try {
      if (editingDiscount) {
        setDiscounts(discounts.map(disc => 
          disc.id === editingDiscount.id 
            ? { ...disc, ...discountData }
            : disc
        ))
        alert('✅ ההנחה עודכנה בהצלחה!')
      } else {
        const newDiscount: Discount = {
          id: Date.now().toString(),
          name: discountData.name || '',
          discount_code: discountData.discount_code || '',
          discount_type: discountData.discount_type || 'percentage',
          discount_value: discountData.discount_value || 0,
          min_package_price: discountData.min_package_price || 0,
          max_uses: discountData.max_uses || null,
          current_uses: 0,
          is_active: discountData.is_active ?? true,
          valid_from: discountData.valid_from || new Date().toISOString(),
          valid_until: discountData.valid_until || null
        }
        setDiscounts([...discounts, newDiscount])
        alert('✅ ההנחה נוצרה בהצלחה!')
      }
      
      setShowDiscountModal(false)
      setEditingDiscount(null)
    } catch (error) {
      console.error('Error saving discount:', error)
      alert('❌ שגיאה בשמירת ההנחה')
    }
  }

  const calculatePricePerUser = (price: number, users: number) => {
    return (price / users).toFixed(0)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">ניהול מחירים ומכסות</h1>
          <p className="text-gray-600 mt-2">מודל תמחור חדש: מחיר למשתמש לחודש, מינימום 2 יוזרים, תמחור שנתי עם 15% הנחה</p>
        </div>
        <Link 
          href="/dashboard/admin"
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition-colors"
        >
          ← חזרה לדשבורד אדמין
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500">סה"כ חבילות</h3>
          <p className="text-2xl font-bold text-blue-600">{packages.length}</p>
          <p className="text-xs text-gray-500">פעילות: {packages.filter(p => p.is_active).length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500">סה"כ הנחות</h3>
          <p className="text-2xl font-bold text-green-600">{discounts.length}</p>
          <p className="text-xs text-gray-500">פעילות: {discounts.filter(d => d.is_active).length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500">מחיר ממוצע (חודשי)</h3>
          <p className="text-2xl font-bold text-purple-600">
            ${Math.round(packages.reduce((sum, p) => sum + p.base_price, 0) / packages.length)}
          </p>
          <p className="text-xs text-gray-500">למשתמש</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500">מחיר ממוצע (שנתי)</h3>
          <p className="text-2xl font-bold text-orange-600">
            ${Math.round(packages.reduce((sum, p) => sum + (p.base_price * 0.85), 0) / packages.length)}
          </p>
          <p className="text-xs text-gray-500">למשתמש (עם 15% הנחה)</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('packages')}
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'packages'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              📦 ניהול חבילות ({packages.length})
            </button>
            <button
              onClick={() => setActiveTab('discounts')}
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'discounts'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              🎁 ניהול הנחות ({discounts.length})
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'packages' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800">חבילות מכסה</h2>
                <button
                  onClick={() => {
                    setEditingPackage(null)
                    setShowPackageModal(true)
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  + הוסף חבילה חדשה
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">שם החבילה</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">מחיר חודשי</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">מחיר שנתי (15% הנחה)</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">תכונות</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">סטטוס</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">פעולות</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {packages.map((pkg) => (
                      <tr key={pkg.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900 flex items-center">
                              {pkg.name}
                              {pkg.is_popular && (
                                <span className="mr-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                  🔥 פופולרי
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">{pkg.description}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          ${pkg.base_price} למשתמש
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          ${Math.round(pkg.base_price * 0.85)} למשתמש
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {pkg.package_key === 'basic' && 'ניתוחי שיחות, דוחות'}
                          {pkg.package_key === 'professional' && 'ניתוחי שיחות, דוחות, סימולציות'}
                          {pkg.package_key === 'premium' && 'ניתוחי שיחות, דוחות, סימולציות, יועץ מלווה'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            pkg.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {pkg.is_active ? 'פעילה' : 'לא פעילה'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                          <button
                            onClick={() => {
                              setEditingPackage(pkg)
                              setShowPackageModal(true)
                            }}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            ✏️ עריכה
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'discounts' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800">הנחות</h2>
                <button
                  onClick={() => {
                    setEditingDiscount(null)
                    setShowDiscountModal(true)
                  }}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  + הוסף הנחה חדשה
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">שם ההנחה</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">קוד</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">סוג</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">ערך</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">שימושים</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">פעולות</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {discounts.map((discount) => (
                      <tr key={discount.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {discount.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                          {discount.discount_code}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {discount.discount_type === 'percentage' ? 'אחוז' : 'סכום קבוע'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {discount.discount_type === 'percentage' 
                            ? `${discount.discount_value}%` 
                            : `$${discount.discount_value}`
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {discount.max_uses 
                            ? `${discount.current_uses}/${discount.max_uses}` 
                            : `${discount.current_uses}/∞`
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                          <button
                            onClick={() => {
                              setEditingDiscount(discount)
                              setShowDiscountModal(true)
                            }}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            ✏️ עריכה
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {showPackageModal && (
        <PackageModal
          package={editingPackage}
          onSave={handleSavePackage}
          onCancel={() => {
            setShowPackageModal(false)
            setEditingPackage(null)
          }}
        />
      )}

      {showDiscountModal && (
        <DiscountModal
          discount={editingDiscount}
          onSave={handleSaveDiscount}
          onCancel={() => {
            setShowDiscountModal(false)
            setEditingDiscount(null)
          }}
        />
      )}
    </div>
  )
}

function PackageModal({ 
  package: pkg, 
  onSave, 
  onCancel 
}: {
  package: QuotaPackage | null
  onSave: (data: Partial<QuotaPackage>) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    name: pkg?.name || '',
    description: pkg?.description || '',
    users_count: pkg?.users_count || 0,
    base_price: pkg?.base_price || 0,
    is_active: pkg?.is_active ?? true,
    is_popular: pkg?.is_popular ?? false,
    package_key: pkg?.package_key || ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">
          {pkg ? 'עריכת חבילה' : 'הוספת חבילה חדשה'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">שם החבילה</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">תיאור</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">מספר משתמשים</label>
              <input
                type="number"
                value={formData.users_count}
                onChange={(e) => setFormData({...formData, users_count: Number(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                min="1"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">מחיר ($)</label>
              <input
                type="number"
                value={formData.base_price}
                onChange={(e) => setFormData({...formData, base_price: Number(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                min="0"
                step="0.01"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">חבילה פעילה</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_popular}
                onChange={(e) => setFormData({...formData, is_popular: e.target.checked})}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">חבילה פופולרית</span>
            </label>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              ביטול
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              שמירה
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function DiscountModal({ 
  discount, 
  onSave, 
  onCancel 
}: {
  discount: Discount | null
  onSave: (data: Partial<Discount>) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    name: discount?.name || '',
    discount_code: discount?.discount_code || '',
    discount_type: discount?.discount_type || 'percentage' as 'percentage' | 'fixed',
    discount_value: discount?.discount_value || 0,
    min_package_price: discount?.min_package_price || 0,
    max_uses: discount?.max_uses || null,
    is_active: discount?.is_active ?? true,
    valid_until: discount?.valid_until ? discount.valid_until.split('T')[0] : ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      ...formData,
      valid_until: formData.valid_until ? new Date(formData.valid_until).toISOString() : null
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">
          {discount ? 'עריכת הנחה' : 'הוספת הנחה חדשה'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">שם ההנחה</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">קוד הנחה</label>
            <input
              type="text"
              value={formData.discount_code}
              onChange={(e) => setFormData({...formData, discount_code: e.target.value.toUpperCase()})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
              placeholder="DISCOUNT20"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">סוג הנחה</label>
              <select
                value={formData.discount_type}
                onChange={(e) => setFormData({...formData, discount_type: e.target.value as 'percentage' | 'fixed'})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="percentage">אחוז</option>
                <option value="fixed">סכום קבוע</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ערך ({formData.discount_type === 'percentage' ? '%' : '$'})
              </label>
              <input
                type="number"
                value={formData.discount_value}
                onChange={(e) => setFormData({...formData, discount_value: Number(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                min="0"
                step={formData.discount_type === 'percentage' ? '1' : '0.01'}
                max={formData.discount_type === 'percentage' ? '100' : undefined}
                required
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              ביטול
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
            >
              שמירה
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 