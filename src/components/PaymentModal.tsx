import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Copy, CheckCircle2 } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAlreadyPaid: (plan: 'monthly' | 'yearly') => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, onAlreadyPaid }) => {
  const { t } = useTranslation();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);

  if (!isOpen) return null;

  const pixKey = "Jefson.ti@gmail.com";
  const amount = selectedPlan === 'monthly' ? "15.00" : "100.00";

  const handleCopy = (text: string, type: 'key' | 'amount') => {
    navigator.clipboard.writeText(text);
    if (type === 'key') {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else {
      setCopiedAmount(true);
      setTimeout(() => setCopiedAmount(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('payment.subscribeNow')}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="flex gap-4">
            <button
              onClick={() => setSelectedPlan('monthly')}
              className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                selectedPlan === 'monthly' 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
              }`}
            >
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Mensal</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">R$ 15</div>
            </button>
            <button
              onClick={() => setSelectedPlan('yearly')}
              className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                selectedPlan === 'yearly' 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
              }`}
            >
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Anual</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">R$ 100</div>
            </button>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                {t('payment.pixKey')}
              </label>
              <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded border dark:border-gray-700">
                <span className="font-mono text-sm text-gray-900 dark:text-white">{pixKey}</span>
                <button 
                  onClick={() => handleCopy(pixKey, 'key')}
                  className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm font-medium"
                >
                  {copiedKey ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  {copiedKey ? t('payment.copied') : t('payment.copy')}
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                Valor
              </label>
              <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded border dark:border-gray-700">
                <span className="font-mono text-sm text-gray-900 dark:text-white">R$ {amount}</span>
                <button 
                  onClick={() => handleCopy(amount, 'amount')}
                  className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm font-medium"
                >
                  {copiedAmount ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  {copiedAmount ? t('payment.copied') : t('payment.copy')}
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={() => onAlreadyPaid(selectedPlan)}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            {t('payment.iAlreadyPaid')}
          </button>
        </div>
      </div>
    </div>
  );
};
