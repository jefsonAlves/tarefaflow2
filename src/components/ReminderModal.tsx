import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Bell, Clock, RotateCcw, AlertTriangle, CalendarDays, Check } from 'lucide-react';
import { Task, ReminderConfig } from '../types';
import { cn } from '../lib/utils';

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onSave: (taskId: string, config: ReminderConfig | null) => void;
}

export function ReminderModal({ isOpen, onClose, task, onSave }: ReminderModalProps) {
  const [type, setType] = useState<ReminderConfig['type']>('once');
  const [time, setTime] = useState('08:00');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [intervalMinutes, setIntervalMinutes] = useState(60);

  useEffect(() => {
    if (task?.reminderConfig) {
      setType(task.reminderConfig.type);
      setTime(task.reminderConfig.time || '08:00');
      setDaysOfWeek(task.reminderConfig.daysOfWeek || []);
      setIntervalMinutes(task.reminderConfig.intervalMinutes || 60);
    } else {
      setType('once');
      setTime('08:00');
      setDaysOfWeek([]);
      setIntervalMinutes(60);
    }
  }, [task]);

  if (!isOpen || !task) return null;

  const handleSave = () => {
    const config: ReminderConfig = {
      type,
      intervalMinutes: type === 'nagging' ? intervalMinutes : 0,
      nextReminder: new Date().toISOString(), // Mock next reminder, actual logic would handle this
      time,
      daysOfWeek: type === 'recurring' ? daysOfWeek : [],
    };
    onSave(task.id, config);
    onClose();
  };

  const handleRemove = () => {
    onSave(task.id, null);
    onClose();
  };

  const toggleDay = (day: number) => {
    setDaysOfWeek(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day].sort()
    );
  };

  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl relative z-10"
        >
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-600" />
              Configurar Lembrete
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-500">Tarefa</p>
              <p className="font-bold text-slate-800 line-clamp-1">{task.title}</p>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold text-slate-700">Tipo de Lembrete</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setType('once')}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all",
                    type === 'once' ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-100 hover:border-slate-200 text-slate-500"
                  )}
                >
                  <Clock className="w-5 h-5 mb-1" />
                  <span className="text-xs font-bold">Único</span>
                </button>
                <button
                  onClick={() => setType('recurring')}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all",
                    type === 'recurring' ? "border-purple-600 bg-purple-50 text-purple-700" : "border-slate-100 hover:border-slate-200 text-slate-500"
                  )}
                >
                  <CalendarDays className="w-5 h-5 mb-1" />
                  <span className="text-xs font-bold">Recorrente</span>
                </button>
                <button
                  onClick={() => setType('nagging')}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all",
                    type === 'nagging' ? "border-orange-600 bg-orange-50 text-orange-700" : "border-slate-100 hover:border-slate-200 text-slate-500"
                  )}
                >
                  <AlertTriangle className="w-5 h-5 mb-1" />
                  <span className="text-xs font-bold">Insistente</span>
                </button>
              </div>
            </div>

            {/* Time Configuration */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 block">Horário</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-medium text-slate-700"
              />
            </div>

            {/* Content per type */}
            <AnimatePresence mode="wait">
              {type === 'recurring' && (
                <motion.div 
                  key="recurring"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 overflow-hidden"
                >
                  <label className="text-sm font-bold text-slate-700 block">Dias da Semana</label>
                  <div className="flex justify-between gap-1">
                    {days.map((day, ix) => (
                      <button
                        key={ix}
                        onClick={() => toggleDay(ix)}
                        className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold transition-all",
                          daysOfWeek.includes(ix) 
                            ? "bg-purple-600 text-white shadow-md shadow-purple-200" 
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        )}
                      >
                        {day[0]}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {type === 'nagging' && (
                <motion.div 
                  key="nagging"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 overflow-hidden"
                >
                  <label className="text-sm font-bold text-slate-700 block">Intervalo de Insistência (minutos)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="15"
                      max="120"
                      step="15"
                      value={intervalMinutes}
                      onChange={(e) => setIntervalMinutes(Number(e.target.value))}
                      className="w-full accent-orange-600"
                    />
                    <span className="font-bold text-orange-700 bg-orange-100 px-3 py-1 rounded-lg w-16 text-center">
                      {intervalMinutes}m
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    O aplicativo vai te notificar a cada {intervalMinutes} minutos após o horário até você marcar a tarefa como concluída.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

          </div>

          <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
            {task.reminderConfig && (
              <button
                onClick={handleRemove}
                className="px-4 py-3 text-red-600 font-bold hover:bg-red-50 rounded-xl transition-colors"
                title="Remover Lembrete"
              >
                Remover
              </button>
            )}
            <button
              onClick={handleSave}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
            >
              <Check className="w-5 h-5" />
              Salvar Lembrete
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
