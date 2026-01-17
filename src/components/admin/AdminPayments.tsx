import React, { useState, useEffect } from 'react';
import {
    CreditCard,
    Filter,
    Download,
    Search,
    Eye,
    RefreshCw,
    FileText,
    CheckCircle,
    XCircle,
    Clock,
    RotateCcw,
    TrendingUp,
    DollarSign,
} from 'lucide-react';
import { supabase } from '../../utils/supabase/client';
import { toast } from 'sonner';

interface Payment {
    id: string;
    user_id: string;
    user_name?: string;
    user_phone?: string;
    amount: number;
    currency: string;
    status: 'success' | 'failed' | 'pending' | 'refunded';
    payment_method?: string;
    provider_payment_id: string;
    provider_order_id: string;
    plan_id: string;
    plan_name?: string;
    metadata: any;
    created_at: string;
    updated_at: string;
}

export function AdminPayments() {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    // Stats
    const [stats, setStats] = useState({
        totalRevenue: 0,
        successRate: 0,
        totalTransactions: 0,
        pendingCount: 0,
    });

    useEffect(() => {
        loadPayments();
    }, []);

    const loadPayments = async () => {
        try {
            setLoading(true);

            // Fetch payments with user details
            const { data: paymentsData, error } = await supabase
                .from('payments')
                .select(`
          *,
          users:user_id (
            full_name,
            phone
          )
        `)
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) throw error;

            // Transform data
            const transformedPayments = paymentsData?.map((p: any) => ({
                ...p,
                user_name: p.users?.full_name || 'Unknown',
                user_phone: p.users?.phone || 'N/A',
                plan_name: p.metadata?.plan_name || 'Gugan Plan',
            })) || [];

            setPayments(transformedPayments);

            // Calculate stats
            const totalRev = transformedPayments
                .filter((p: Payment) => p.status === 'success')
                .reduce((sum: number, p: Payment) => sum + p.amount, 0);

            const successCount = transformedPayments.filter((p: Payment) => p.status === 'success').length;
            const pendingCount = transformedPayments.filter((p: Payment) => p.status === 'pending').length;

            setStats({
                totalRevenue: totalRev,
                successRate: transformedPayments.length > 0
                    ? (successCount / transformedPayments.length) * 100
                    : 0,
                totalTransactions: transformedPayments.length,
                pendingCount,
            });

        } catch (error: any) {
            console.error('Error loading payments:', error);
            toast.error('Failed to load payments');
        } finally {
            setLoading(false);
        }
    };

    // Filtered payments
    const filteredPayments = payments.filter((payment) => {
        const matchesSearch =
            payment.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            payment.user_phone?.includes(searchQuery) ||
            payment.provider_order_id?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const getStatusBadge = (status: string) => {
        const styles = {
            success: 'bg-green-100 text-green-700',
            failed: 'bg-red-100 text-red-700',
            pending: 'bg-yellow-100 text-yellow-700',
            refunded: 'bg-gray-100 text-gray-700',
        };

        const icons = {
            success: <CheckCircle className="w-3 h-3" />,
            failed: <XCircle className="w-3 h-3" />,
            pending: <Clock className="w-3 h-3" />,
            refunded: <RotateCcw className="w-3 h-3" />,
        };

        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || styles.pending}`}>
                {icons[status as keyof typeof icons]}
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short',
        });
    };

    const exportToCSV = () => {
        const csvContent = [
            ['ID', 'User', 'Phone', 'Amount', 'Status', 'Plan', 'Date'].join(','),
            ...filteredPayments.map(p => [
                p.id,
                p.user_name,
                p.user_phone,
                p.amount,
                p.status,
                p.plan_name,
                p.created_at,
            ].join(',')),
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `payments_${new Date().toISOString()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Exported to CSV');
    };

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-6">
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-gray-500 text-sm">Total Revenue</p>
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-green-600" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-gray-800">₹{stats.totalRevenue.toLocaleString()}</p>
                    <p className="text-sm text-gray-500 mt-1">From successful payments</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-gray-500 text-sm">Success Rate</p>
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-blue-600" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-gray-800">{stats.successRate.toFixed(1)}%</p>
                    <p className="text-sm text-gray-500 mt-1">Payment success rate</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-gray-500 text-sm">Total Transactions</p>
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <CreditCard className="w-5 h-5 text-purple-600" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-gray-800">{stats.totalTransactions}</p>
                    <p className="text-sm text-gray-500 mt-1">All payment attempts</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-gray-500 text-sm">Pending</p>
                        <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                            <Clock className="w-5 h-5 text-yellow-600" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-gray-800">{stats.pendingCount}</p>
                    <p className="text-sm text-gray-500 mt-1">Awaiting confirmation</p>
                </div>
            </div>

            {/* Filters and Actions */}
            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
                <div className="flex items-center gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by user name, phone, or transaction ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                    </div>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                        <option value="all">All Status</option>
                        <option value="success">Success</option>
                        <option value="pending">Pending</option>
                        <option value="failed">Failed</option>
                        <option value="refunded">Refunded</option>
                    </select>

                    {/* Actions */}
                    <button
                        onClick={loadPayments}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>

                    <button
                        onClick={exportToCSV}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Payments Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Transaction ID</th>
                                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">User</th>
                                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Amount</th>
                                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Plan</th>
                                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Status</th>
                                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Date</th>
                                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                        Loading payments...
                                    </td>
                                </tr>
                            ) : filteredPayments.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                        No payments found
                                    </td>
                                </tr>
                            ) : (
                                filteredPayments.map((payment) => (
                                    <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-mono text-sm text-gray-900">{payment.provider_order_id.slice(0, 12)}...</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-medium text-gray-900">{payment.user_name}</p>
                                            <p className="text-sm text-gray-500">{payment.user_phone}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-semibold text-gray-900">₹{payment.amount}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-gray-700">{payment.plan_name}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(payment.status)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-gray-700">{formatDate(payment.created_at)}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => {
                                                    setSelectedPayment(payment);
                                                    setShowDetailModal(true);
                                                }}
                                                className="text-green-600 hover:text-green-700 font-medium text-sm flex items-center gap-1"
                                            >
                                                <Eye className="w-4 h-4" />
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Payment Detail Modal */}
            {showDetailModal && selectedPayment && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200">
                            <h3 className="text-xl font-bold text-gray-900">Payment Details</h3>
                            <button
                                onClick={() => setShowDetailModal(false)}
                                className="absolute top-6 right-6 text-gray-400 hover:text-gray-600"
                            >
                                ×
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* User Info */}
                            <div>
                                <h4 className="font-semibold text-gray-900 mb-3">User Information</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-500">Name</p>
                                        <p className="font-medium text-gray-900">{selectedPayment.user_name}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Phone</p>
                                        <p className="font-medium text-gray-900">{selectedPayment.user_phone}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Payment Info */}
                            <div>
                                <h4 className="font-semibold text-gray-900 mb-3">Payment Information</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-500">Amount</p>
                                        <p className="font-bold text-gray-900">₹{selectedPayment.amount}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Status</p>
                                        {getStatusBadge(selectedPayment.status)}
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Order ID</p>
                                        <p className="font-mono text-sm text-gray-900">{selectedPayment.provider_order_id}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Payment ID</p>
                                        <p className="font-mono text-sm text-gray-900">{selectedPayment.provider_payment_id || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Plan</p>
                                        <p className="font-medium text-gray-900">{selectedPayment.plan_name}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Date</p>
                                        <p className="text-sm text-gray-900">{formatDate(selectedPayment.created_at)}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Metadata */}
                            {selectedPayment.metadata && Object.keys(selectedPayment.metadata).length > 0 && (
                                <div>
                                    <h4 className="font-semibold text-gray-900 mb-3">Additional Details</h4>
                                    <pre className="bg-gray-50 p-4 rounded-lg text-xs overflow-x-auto">
                                        {JSON.stringify(selectedPayment.metadata, null, 2)}
                                    </pre>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3">
                                <button className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    Download Invoice
                                </button>
                                {selectedPayment.status === 'success' && (
                                    <button className="flex-1 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-2">
                                        <RotateCcw className="w-4 h-4" />
                                        Process Refund
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
