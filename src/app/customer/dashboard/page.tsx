'use client';

// pages/dashboard.tsx
import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/navigation';
import { Session, SessionStatus, User } from '@/types';
import { Ban, CheckCircle, Clock, FileText, Hourglass, LogOut } from 'lucide-react';

const Dashboard = () => {
    // const [loading, setLoading] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [user, setUser] = useState<User | null>(null);
    const [sessions, setSessions] = useState<Session[]>([]);
    const router = useRouter();
    const [loading, setLoading] = useState<boolean>(false);
    useEffect(() => {
        // Fetch login user
        const fetchUser = async () => {
            const response = await fetch('/api/auth/me');
            const user = await response.json();
            if (user?.success) {
                setUser(user.user);
            } else {
                setUser(null);
                router.push('/customer/signin')
            }
        };
        fetchUser();
    }, []);

    useEffect(() => {
        const fetchSession = async () => {
            // setLoading('fetching');
            const response = await fetch('/api/dashboard', {
                method: 'GET',
            });
            const data = await response.json();
            console.log("🚀 ~ fetchSession ~ data:", data)
            // setLoading(null);
            if (data?.success) {
                setSessions(data.sessions);
            } else {
                setSessions([]);
            }
        }
        fetchSession();
    }, [])

    const getStatusBadge = (status: string) => {
        const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
        switch (status) {
            case SessionStatus.APPROVED:
                return `${baseClasses} bg-green-100 text-green-800`;
            case SessionStatus.PENDING:
                return `${baseClasses} bg-yellow-100 text-yellow-800`;
            case SessionStatus.REJECTED:
                return `${baseClasses} bg-red-100 text-red-800`;
            default:
                return `${baseClasses} bg-gray-100 text-gray-800`;
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const filteredSessions = sessions.filter(session => {
        const matchesSearch = session.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            session.user?.email?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || session.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const handleLogout = async () => {
        try {
            const response = await fetch('/api/auth/logout', {
                method: 'POST'
            });
            const res = await response.json();
            if (res?.success) {
                router.push('/customer/signin')
            } else {
                setUser(null);
            }
        } catch (error) {
            console.log('error : ', error)
        }
    }

    const handleStartNow = async () => {
        // start loading
        if (!user) {
            console.log('User not found');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/qa-session/create/', {
                method: 'POST',
                body: JSON.stringify({ userId: user?.id }),
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const res = await response.json();
            if (res?.success) {
                console.log("🚀 ~ handleStartNow ~ res:", res.session.id)
                router.push('/customer/stepper?session_id=' + res.session.id);
                // router.push('/customer/phase/' + res.session.id);
                // customer/stepper
            } else {
                console.log('Failed to create session:', res.message);
            }
        } catch (error) {
            console.log('error : ', error)
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            {
                loading && (
                    <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-75 z-50">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-blue-500"></div>
                    </div>
                )
            }
            <Head>
                <title>Dashboard</title>
                <meta name="description" content="Your sessions dashboard" />
            </Head>

            <div className="min-h-screen bg-gray-50">
                {/* Header */}
                <div className="bg-white shadow-sm border-b border-gray-200">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="py-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900">
                                        Dashboard
                                    </h1>
                                    <p className="mt-1 text-sm text-gray-600">
                                        Welcome back, {user?.name || ''}!
                                    </p>
                                </div>
                                <div className="flex items-center space-x-4">
                                    {/* <button
                                        // onClick={() => router.push(`/customer/phase`)}
                                        onClick={handleStartNow}
                                        className={`px-4 py-2 rounded-lg transition-colors cursor-pointer bg-blue-600 text-white hover:bg-blue-700`}
                                        // disabled={!(user && user.sessionStatus === SessionStatus.DRAFT)}
                                    >
                                        Start Now
                                    </button> */}
                                    <div className="flex items-center space-x-2">
                                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                                            <span className="text-white font-medium text-sm">
                                                {user?.email.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                        <span className="text-sm text-gray-700">{user?.email || ''}</span>
                                    </div>
                                    <button
                                        onClick={handleLogout}
                                        className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 hover:text-red-700 transition-colors text-sm font-medium shadow-sm"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        Logout
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
                        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                            <div className="flex items-center">
                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                                    <FileText className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Total Sessions</p>
                                    <p className="text-2xl font-bold text-gray-900">{sessions.length}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                            <div className="flex items-center">
                                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Approved</p>
                                    <p className="text-2xl font-bold text-gray-900">{sessions.filter(s => s.status === SessionStatus.APPROVED).length}</p>
                                </div>
                            </div>
                        </div>



                        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                            <div className="flex items-center">
                                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mr-4">
                                    <Ban className="w-5 h-5 text-red-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Rejected</p>
                                    <p className="text-2xl font-bold text-gray-900">{sessions.filter(s => s.status === SessionStatus.REJECTED).length}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                            <div className="flex items-center">
                                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-4">
                                    <Hourglass className="w-5 h-5 text-orange-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Pending</p>
                                    <p className="text-2xl font-bold text-gray-900">{sessions.filter(s => s.status === SessionStatus.PENDING).length}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                            <div className="flex items-center">
                                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mr-4">
                                    <Clock className="w-5 h-5 text-yellow-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Draft</p>
                                    <p className="text-2xl font-bold text-gray-900">{sessions.filter(s => s.status === SessionStatus.DRAFT).length}</p>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Filters and Search */}
                    <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                        <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search sessions..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="block w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="all">All Status</option>
                                <option value="DRAFT">{SessionStatus.DRAFT}</option>
                                <option value="PENDING">{SessionStatus.PENDING}</option>
                                <option value="REJECTED">{SessionStatus.REJECTED}</option>
                                <option value="APPROVED">{SessionStatus.APPROVED}</option>
                            </select>
                        </div>
                        <div className="text-sm text-gray-600">
                            {filteredSessions.length} of {sessions.length} sessions
                        </div>
                    </div>

                    {/* Sessions Table */}
                    <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
                        {filteredSessions.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="text-gray-400 text-6xl mb-4">📚</div>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    {sessions.length === 0 ? 'No sessions yet' : 'No sessions found'}
                                </h3>
                                <p className="text-gray-600">
                                    {sessions.length === 0
                                        ? 'Your sessions will appear here once they\'re created.'
                                        : 'Try adjusting your search or filter criteria.'
                                    }
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Session
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Created
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredSessions.map((session) => (
                                            <tr key={session.id} className="hover:bg-gray-50 transition-colors" onClick={() => router.push(`/customer/stepper?session_id=${session.id}`)}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 h-10 w-10">
                                                            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                                                <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                </svg>
                                                            </div>
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-medium text-gray-900">
                                                                {session?.personalInfo?.firstName} {session?.personalInfo?.lastName}
                                                            </div>
                                                            <div className="text-sm text-gray-500 max-w-xs truncate">
                                                                {session.user.email}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={getStatusBadge(session.status)}>
                                                        {session.status.replace('_', ' ')}
                                                    </span>
                                                </td>

                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {formatDate(session.createdAt)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                </div>
                {/* Floating Action Button */}
                {
                    // sessions.filter(s => s.status === SessionStatus.DRAFT).length === 0 && (
                    <div className="fixed bottom-6 right-6 z-50">
                        <button
                            onClick={handleStartNow}
                            className={
                                'px-4 py-2 rounded-full shadow-lg transition-colors ' +
                                (sessions.filter(s => s.status === SessionStatus.DRAFT).length === 0
                                    ? 'cursor-pointer bg-blue-600 text-white hover:bg-blue-700'
                                    : 'bg-blue-300 text-white cursor-not-allowed')
                            }
                            disabled={sessions.filter(s => s.status === SessionStatus.DRAFT).length !== 0}
                        >
                            Start Now
                        </button>
                    </div>
                    // )
                }
            </div>
        </>
    );
};

// export const getServerSideProps: GetServerSideProps = async (context) => {
//   const session = await getSession(context);

//   if (!session) {
//     return {
//       redirect: {
//         destination: '/login',
//         permanent: false,
//       },
//     };
//   }

//   try {
//     // eslint-disable-next-line @typescript-eslint/no-require-imports
//     const { Pool } = require('pg');
//     const pool = new Pool({
//       connectionString: process.env.DATABASE_URL,
//     });

//     const result = await pool.query(
//       `SELECT 
//         *
//       FROM sessions s
//       WHERE s.user_id = $1
//       ORDER BY s.created_at DESC`,
//       [session.user?.email as string]
//     );

//     const sessions = result.rows.map((row: any) => ({
//       ...row,
//       created_at: row.created_at.toISOString(),
//       updated_at: row.updated_at.toISOString(),
//     }));

//     return {
//       props: {
//         sessions,
//         user: {
//           id: session.user.id,
//           name: session.user.name,
//           email: session.user.email,
//         },
//       },
//     };
//   } catch (error) {
//     console.error('Database error:', error);
//     return {
//       props: {
//         sessions: [],
//         user: {
//           id: session.user.id,
//           name: session.user.name,
//           email: session.user.email,
//         },
//       },
//     };
//   }
// };

export default Dashboard;