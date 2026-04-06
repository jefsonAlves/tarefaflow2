import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Trash2, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Task } from '../types';

interface TaskActionMenuProps {
  task: Task;
  onDelete: (id: string) => void;
  onMove: (id: string, newStatus: Task['status']) => void;
}

export const TaskActionMenu: React.FC<TaskActionMenuProps> = ({ task, onDelete, onMove }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [showMoveOptions, setShowMoveOptions] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowMoveOptions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const statuses: { value: Task['status']; label: string }[] = [
    { value: 'todo', label: t('tasks.todo') },
    { value: 'in-progress', label: t('tasks.inProgress') },
    { value: 'done', label: t('tasks.done') }
  ];

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
          setShowMoveOptions(false);
        }}
        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-10 py-1">
          {!showMoveOptions ? (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMoveOptions(true);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <ArrowRight className="w-4 h-4" />
                {t('common.move')}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(task.id);
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {t('common.delete')}
              </button>
            </>
          ) : (
            <>
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b dark:border-gray-700">
                {t('common.move')} para
              </div>
              {statuses.filter(s => s.value !== task.status).map(status => (
                <button
                  key={status.value}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMove(task.id, status.value);
                    setIsOpen(false);
                    setShowMoveOptions(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {status.label}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};
