import React from 'react';
import { useUniCharge } from '../context/UniChargeContext';
import { X, Printer, CheckCircle, Zap, ShieldCheck } from 'lucide-react';

export const ReceiptModal: React.FC = () => {
  const { receiptModalData, setReceiptModalData, currentUser } = useUniCharge();

  if (!receiptModalData) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-md rounded-2xl bg-white border border-[#E5E7EB] shadow-2xl overflow-hidden text-slate-900 transition-colors">
        
        {/* Header */}
        <div className="p-4 border-b border-[#E5E7EB] bg-slate-50 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Official Electronic Receipt
          </span>
          <button
            onClick={() => setReceiptModalData(null)}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Content */}
        <div id="printable-receipt" className="p-6 space-y-5 bg-white text-slate-900 font-mono text-xs">
          
          {/* USTP Official Header */}
          <div className="text-center space-y-1 pb-4 border-b border-dashed border-slate-300">
            <h4 className="font-bold text-sm tracking-tight font-sans text-[#1B1448]">
              UNIVERSITY OF SCIENCE & TECHNOLOGY OF SOUTHERN PHILIPPINES
            </h4>
            <p className="text-[10px] text-slate-600">
              Claveria - CDO Campus · Alubijid · Panaon · Jasaan
            </p>
            <p className="text-[11px] font-bold text-[#1B1448] pt-1">
              UNICHARGE SMART CAMPUS LOCKER SYSTEM
            </p>
            <span className="text-[10px] text-slate-500">
              Tax Exempt Educational Utility Facility
            </span>
          </div>

          {/* Transaction Metadata */}
          <div className="space-y-1.5 text-[11px] border-b border-dashed border-slate-300 pb-3">
            <div className="flex justify-between">
              <span className="text-slate-500">Receipt Ref:</span>
              <span className="font-bold">{receiptModalData.receiptRef}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Date & Time:</span>
              <span>{receiptModalData.timestamp}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Student Name:</span>
              <span>{currentUser.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Student ID:</span>
              <span>{currentUser.studentId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Station:</span>
              <span>{receiptModalData.stationName}</span>
            </div>
            {receiptModalData.compartmentNumber > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">Compartment:</span>
                <span className="font-bold">Locker #{receiptModalData.compartmentNumber}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Payment Gateway:</span>
              <span className="uppercase font-bold">{receiptModalData.paymentMethod}</span>
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-2 py-1 border-b border-dashed border-slate-300">
            <div className="flex justify-between text-xs">
              <span>
                Smart Locker Power & Storage ({receiptModalData.durationMinutes || 60} mins)
              </span>
              <span className="font-bold tabular-nums">
                ₱{receiptModalData.amount.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>Included: USB-PD 65W + Surge Relay</span>
              <span>₱0.00</span>
            </div>
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>Student Educational Subsidy Discount</span>
              <span>-₱5.00 (Applied)</span>
            </div>
          </div>

          {/* Total */}
          <div className="flex justify-between items-baseline text-sm font-bold pt-1">
            <span>TOTAL PAID</span>
            <span className="text-base font-bold text-[#1B1448] tabular-nums">
              ₱{receiptModalData.amount.toFixed(2)}
            </span>
          </div>

          {/* Footer note */}
          <div className="text-center text-[10px] text-slate-500 pt-3 border-t border-dashed border-slate-300 space-y-1">
            <p>Thank you for using USTP UniCharge.</p>
            <p>Report issues to IT Infrastructure Helpdesk (CITC Rm 204).</p>
          </div>

        </div>

        {/* Modal Actions */}
        <div className="p-4 border-t border-[#E5E7EB] bg-slate-50 flex items-center justify-between">
          <button
            onClick={() => setReceiptModalData(null)}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 text-xs font-bold text-[#1B1448] bg-[#FBB03B] hover:bg-[#FBB03B]/90 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save PDF</span>
          </button>
        </div>

      </div>
    </div>
  );
};
