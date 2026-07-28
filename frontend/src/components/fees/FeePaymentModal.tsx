import { useState } from 'react';
import { X, CreditCard, QrCode, Building2, CheckCircle2, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import api from '../../utils/api';
import { toast } from '../../stores/toastStore';

interface FeePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName?: string;
  enrollmentNo?: string;
  pendingDues?: number;
  onPaymentSuccess?: () => void;
}

export default function FeePaymentModal({
  isOpen,
  onClose,
  studentName = 'Priyanshu Sharma',
  enrollmentNo = 'ENR25844945',
  pendingDues = 20000,
  onPaymentSuccess
}: FeePaymentModalProps) {
  const [payAmount, setPayAmount] = useState(pendingDues > 0 ? pendingDues : 20000);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);

  // Card fields
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState(studentName);

  // Net banking field
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');

  if (!isOpen) return null;

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (payAmount <= 0) {
      toast.error('Please enter a valid payment amount.');
      return;
    }

    setIsProcessing(true);
    try {
      // Simulate gateway handshake latency for realistic UX
      await new Promise(res => setTimeout(res, 1800));

      const res = await api.post('/fees/pay', {
        amount: Number(payAmount),
        paymentMethod: paymentMethod === 'upi' ? 'UPI / GPay' : paymentMethod === 'card' ? 'Credit/Debit Card' : `Net Banking (${selectedBank})`,
        transactionRef: `TXN_${Math.floor(100000 + Math.random() * 900000)}`
      });

      setIsSuccess(true);
      setReceiptData(res.data.paymentReceipt);
      toast.success('Fee payment completed successfully!');
      if (onPaymentSuccess) onPaymentSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Payment transaction failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden relative">
        
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#f97316] rounded-xl text-white shadow-glow">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="font-title font-extrabold text-sm">EduPay Secure Payment Gateway</h3>
              <p className="text-[10px] text-slate-300 font-medium">PCI-DSS 256-Bit Encrypted Portal</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-700 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        {isSuccess ? (
          <div className="p-6 text-center space-y-4 animate-scaleUp">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 size={36} />
            </div>
            <div>
              <h4 className="font-title font-extrabold text-lg text-slate-900">Payment Successful!</h4>
              <p className="text-xs text-slate-500 font-medium mt-1">Transaction Ref: <span className="font-mono font-bold text-slate-800">{receiptData?.transactionId}</span></p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-2 text-xs text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Student Name:</span>
                <span className="font-semibold text-slate-900">{studentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Enrollment ID:</span>
                <span className="font-mono font-bold text-slate-900">{enrollmentNo}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2">
                <span className="text-slate-500 font-bold">Amount Paid:</span>
                <span className="font-extrabold text-emerald-600 text-sm">₹{Number(payAmount).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Remaining Dues:</span>
                <span className="font-bold text-slate-900">₹{Number(receiptData?.remainingDues || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>

            <button
              onClick={() => {
                setIsSuccess(false);
                onClose();
              }}
              className="w-full py-3 bg-[#f97316] hover:bg-[#ea580c] text-white font-bold rounded-xl text-xs shadow-md transition-colors cursor-pointer"
            >
              Done & Return to Dashboard
            </button>
          </div>
        ) : (
          <form onSubmit={handleProcessPayment} className="p-6 space-y-5">
            {/* Student & Dues Banner */}
            <div className="p-4 bg-orange-50/70 border border-orange-200 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Student Profile</span>
                <span className="text-xs font-extrabold text-slate-900">{studentName} ({enrollmentNo})</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Pending Dues</span>
                <span className="text-sm font-extrabold text-[#f97316]">₹{pendingDues.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Pay Amount Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Payment Amount (₹)</label>
              <input
                type="number"
                min="100"
                max={pendingDues > 0 ? pendingDues : 100000}
                value={payAmount}
                onChange={(e) => setPayAmount(Number(e.target.value))}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#f97316] rounded-xl text-sm font-extrabold text-slate-900 focus:outline-none"
              />
            </div>

            {/* Payment Method Switcher */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Select Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('upi')}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${paymentMethod === 'upi' ? 'border-[#f97316] bg-orange-50 text-[#f97316] shadow-2xs' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  <QrCode size={18} />
                  <span>UPI / QR</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${paymentMethod === 'card' ? 'border-[#f97316] bg-orange-50 text-[#f97316] shadow-2xs' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  <CreditCard size={18} />
                  <span>Card</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('netbanking')}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${paymentMethod === 'netbanking' ? 'border-[#f97316] bg-orange-50 text-[#f97316] shadow-2xs' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  <Building2 size={18} />
                  <span>Net Banking</span>
                </button>
              </div>
            </div>

            {/* Payment Details Container */}
            {paymentMethod === 'upi' && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-2">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`upi://pay?pa=edumanager@upi&pn=EduManagerCollege&am=${payAmount}&cu=INR`)}`}
                  alt="UPI QR Code"
                  className="w-32 h-32 mx-auto rounded-lg border-2 border-white shadow-sm"
                />
                <p className="text-[11px] font-mono font-bold text-slate-800">edumanager@upi</p>
                <p className="text-[10px] text-slate-500 font-medium">Scan using GPay, PhonePe, Paytm, or BHIM UPI</p>
              </div>
            )}

            {paymentMethod === 'card' && (
              <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Card Number</label>
                  <input
                    type="text"
                    maxLength={19}
                    placeholder="4532 •••• •••• 8912"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Expiry (MM/YY)</label>
                    <input
                      type="text"
                      maxLength={5}
                      placeholder="08/28"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">CVV Code</label>
                    <input
                      type="password"
                      maxLength={3}
                      placeholder="•••"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Cardholder Name</label>
                  <input
                    type="text"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {paymentMethod === 'netbanking' && (
              <div className="space-y-2 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Select Bank</label>
                <select
                  value={selectedBank}
                  onChange={(e) => setSelectedBank(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
                >
                  <option value="HDFC Bank">HDFC Bank</option>
                  <option value="State Bank of India (SBI)">State Bank of India (SBI)</option>
                  <option value="ICICI Bank">ICICI Bank</option>
                  <option value="Axis Bank">Axis Bank</option>
                  <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                </select>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isProcessing}
              className="w-full py-3.5 bg-gradient-to-r from-[#f97316] to-[#ef4444] text-white font-extrabold rounded-xl text-xs shadow-md hover:opacity-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Processing Payment Handshake...</span>
                </>
              ) : (
                <>
                  <span>Confirm & Pay ₹{Number(payAmount).toLocaleString('en-IN')}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
