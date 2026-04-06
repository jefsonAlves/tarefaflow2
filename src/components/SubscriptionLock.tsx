import React, { useState } from 'react';
import { ShieldAlert, CreditCard, CheckCircle2, Clock } from 'lucide-react';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../types';

export function SubscriptionLock({ userProfile, onLogout }: { userProfile: UserProfile, onLogout: () => void }) {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePaymentRequest = async () => {
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'payment_requests'), {
        userId: userProfile.uid,
        userEmail: userProfile.email,
        plan: selectedPlan,
        status: 'pending',
        createdAt: Timestamp.now()
      });
      alert("Solicitação enviada! O administrador irá revisar o seu pagamento em breve.");
    } catch (error) {
      console.error("Error submitting payment request:", error);
      alert("Erro ao enviar solicitação. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (userProfile.subscriptionStatus === 'pending_approval') {
    return (
      <div className="fixed inset-0 bg-slate-50 z-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full space-y-6">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
            <Clock className="w-10 h-10 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Pagamento em Análise</h2>
          <p className="text-slate-600">
            Sua solicitação de pagamento está sendo revisada pelo administrador. Assim que aprovada, seu acesso será liberado.
          </p>
          <button onClick={onLogout} className="w-full py-3 text-slate-500 font-medium hover:bg-slate-50 rounded-xl">
            Sair
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-50 z-50 flex flex-col items-center justify-center p-6 text-center overflow-y-auto">
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full space-y-6 my-8">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
          <ShieldAlert className="w-10 h-10 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Acesso Bloqueado</h2>
        <p className="text-slate-600">
          Seu período de teste expirou ou seu acesso foi pausado. Escolha um plano para continuar usando o aplicativo.
        </p>

        <div className="space-y-4 text-left">
          <label className={`block p-4 border-2 rounded-2xl cursor-pointer transition-all ${selectedPlan === 'monthly' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-200'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <input type="radio" name="plan" checked={selectedPlan === 'monthly'} onChange={() => setSelectedPlan('monthly')} className="w-5 h-5 text-blue-600" />
                <span className="font-bold text-slate-800">Plano Mensal</span>
              </div>
              <span className="font-bold text-blue-600">R$ 15,00</span>
            </div>
          </label>

          <label className={`block p-4 border-2 rounded-2xl cursor-pointer transition-all ${selectedPlan === 'yearly' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-200'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <input type="radio" name="plan" checked={selectedPlan === 'yearly'} onChange={() => setSelectedPlan('yearly')} className="w-5 h-5 text-blue-600" />
                <span className="font-bold text-slate-800">Plano Anual</span>
              </div>
              <span className="font-bold text-blue-600">R$ 100,00</span>
            </div>
            <p className="text-xs text-green-600 font-medium mt-2 ml-8">Economize R$ 80 por ano!</p>
          </label>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl text-left space-y-2">
          <p className="text-sm font-medium text-slate-700">Instruções de Pagamento (PIX):</p>
          <p className="text-sm text-slate-600">1. Faça um PIX no valor do plano escolhido para a chave:</p>
          <div className="bg-white border border-slate-200 p-3 rounded-xl font-mono text-center font-bold text-slate-800 select-all">
            Jefson.ti@gmail.com
          </div>
          <p className="text-sm text-slate-600">2. Após o pagamento, clique no botão abaixo.</p>
        </div>

        <button 
          onClick={handlePaymentRequest}
          disabled={isSubmitting}
          className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSubmitting ? <Clock className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
          Já realizei o pagamento
        </button>

        <button onClick={onLogout} className="w-full py-3 text-slate-500 font-medium hover:bg-slate-50 rounded-xl">
          Sair da conta
        </button>
      </div>
    </div>
  );
}
