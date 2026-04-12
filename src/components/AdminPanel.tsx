import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UserProfile } from '../types';
import { Check, X, Pause, Play } from 'lucide-react';

interface PaymentRequest {
  id: string;
  userId: string;
  userEmail: string;
  plan: 'monthly' | 'yearly';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

interface AdminPanelProps {
  users: UserProfile[];
  paymentRequests: PaymentRequest[];
  onApprovePayment: (requestId: string, userId: string) => void;
  onRejectPayment: (requestId: string, userId: string) => void;
  onReleaseAccess: (userId: string) => void;
  onPauseAccess: (userId: string) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  users,
  paymentRequests,
  onApprovePayment,
  onRejectPayment,
  onReleaseAccess,
  onPauseAccess
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'payments' | 'plans' | 'features'>('dashboard');

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-4 px-6 overflow-x-auto" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'dashboard'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'users'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            {t('admin.users')}
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'payments'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            {t('admin.payments')}
            {paymentRequests.filter(r => r.status === 'pending').length > 0 && (
              <span className="ml-2 bg-red-100 text-red-600 py-0.5 px-2 rounded-full text-xs">
                {paymentRequests.filter(r => r.status === 'pending').length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('plans')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'plans'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Planos
          </button>
          <button
            onClick={() => setActiveTab('features')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'features'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Recursos
          </button>
        </nav>
      </div>

      <div className="p-6">
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
              <p className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-1">Total Usuários</p>
              <p className="text-3xl font-black text-blue-900">{users.length}</p>
            </div>
            <div className="bg-green-50 p-6 rounded-2xl border border-green-100">
              <p className="text-sm font-bold text-green-600 uppercase tracking-wider mb-1">Ativos</p>
              <p className="text-3xl font-black text-green-900">{users.filter(u => u.subscriptionStatus === 'active').length}</p>
            </div>
            <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100">
              <p className="text-sm font-bold text-amber-600 uppercase tracking-wider mb-1">Pendentes</p>
              <p className="text-3xl font-black text-amber-900">{paymentRequests.filter(r => r.status === 'pending').length}</p>
            </div>
            <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100">
              <p className="text-sm font-bold text-purple-600 uppercase tracking-wider mb-1">Receita Est.</p>
              <p className="text-3xl font-black text-purple-900">R$ {(users.filter(u => u.subscriptionStatus === 'active').length * 29.9).toFixed(2)}</p>
            </div>
          </div>
        )}
        {activeTab === 'users' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Usuário</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Plano</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {users.map(user => (
                  <tr key={user.uid}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{user.displayName}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.subscriptionStatus === 'active' ? 'bg-green-100 text-green-800' :
                        user.subscriptionStatus === 'trialing' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {user.subscriptionStatus || 'trialing'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {user.billingCycle === 'yearly' ? 'Anual' : 'Mensal'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {user.subscriptionStatus === 'active' || user.isReleased ? (
                        <button
                          onClick={() => onPauseAccess(user.uid)}
                          className="text-orange-600 hover:text-orange-900 flex items-center gap-1 justify-end w-full"
                        >
                          <Pause className="w-4 h-4" /> {t('admin.pause')}
                        </button>
                      ) : (
                        <button
                          onClick={() => onReleaseAccess(user.uid)}
                          className="text-green-600 hover:text-green-900 flex items-center gap-1 justify-end w-full"
                        >
                          <Play className="w-4 h-4" /> {t('admin.release')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {activeTab === 'payments' && (
          <div className="space-y-4">
            {paymentRequests.filter(r => r.status === 'pending').length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhuma solicitação pendente.</p>
            ) : (
              paymentRequests.filter(r => r.status === 'pending').map(request => (
                <div key={request.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{request.userEmail}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Plano: {request.plan === 'monthly' ? 'Mensal' : 'Anual'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onApprovePayment(request.id, request.userId)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 hover:bg-green-200 rounded-md text-sm font-medium transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      {t('admin.approve')}
                    </button>
                    <button
                      onClick={() => onRejectPayment(request.id, request.userId)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-md text-sm font-medium transition-colors"
                    >
                      <X className="w-4 h-4" />
                      {t('admin.reject')}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        {activeTab === 'plans' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-4">Plano Mensal</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Preço (R$)</label>
                    <input type="number" defaultValue="29.90" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrição</label>
                    <textarea defaultValue="Acesso total mensal com todas as integrações." className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 outline-none resize-none" rows={3} />
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-4">Plano Anual</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Preço (R$)</label>
                    <input type="number" defaultValue="299.90" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrição</label>
                    <textarea defaultValue="Economize 2 meses com o plano anual." className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 outline-none resize-none" rows={3} />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <button className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">
                Salvar Alterações
              </button>
            </div>
          </div>
        )}
        {activeTab === 'features' && (
          <div className="space-y-6">
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <h3 className="font-bold text-slate-800 mb-4">Controle de Recursos Globais</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100">
                  <div>
                    <p className="font-bold text-slate-700">Sincronização Classroom</p>
                    <p className="text-xs text-slate-500">Habilitar/Desabilitar integração para todos os usuários</p>
                  </div>
                  <div className="w-12 h-6 bg-green-500 rounded-full relative cursor-pointer">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100">
                  <div>
                    <p className="font-bold text-slate-700">Inteligência Artificial (Gemini)</p>
                    <p className="text-xs text-slate-500">Controle de uso de créditos de IA</p>
                  </div>
                  <div className="w-12 h-6 bg-green-500 rounded-full relative cursor-pointer">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100">
                  <div>
                    <p className="font-bold text-slate-700">Notificações Push</p>
                    <p className="text-xs text-slate-500">Serviço de alertas em tempo real</p>
                  </div>
                  <div className="w-12 h-6 bg-slate-300 rounded-full relative cursor-pointer">
                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
