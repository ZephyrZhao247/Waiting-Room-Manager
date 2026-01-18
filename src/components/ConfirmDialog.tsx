import React from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  participants?: Array<{ name: string; email?: string }>;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  participants = [],
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
        </div>
        
        <div className="p-6 overflow-auto flex-1">
          <p className="text-gray-700 mb-4">{message}</p>
          
          {participants.length > 0 && (
            <div className="mt-4">
              <h4 className="font-semibold text-gray-900 mb-2">
                Participants ({participants.length}):
              </h4>
              <div className="max-h-64 overflow-y-auto border border-gray-200 rounded">
                <ul className="divide-y divide-gray-200">
                  {participants.map((p, idx) => (
                    <li key={idx} className="px-3 py-2 hover:bg-gray-50">
                      <div className="font-medium text-sm text-gray-900">{p.name}</div>
                      {p.email && (
                        <div className="text-xs text-gray-600">{p.email}</div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
        
        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="btn btn-secondary"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="btn btn-danger"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
