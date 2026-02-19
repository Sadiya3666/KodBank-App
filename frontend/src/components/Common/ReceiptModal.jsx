import React, { useRef } from 'react';
import '../Dashboard/Dashboard.css';

const ReceiptModal = ({ isOpen, receipt, onClose }) => {
    const receiptRef = useRef();

    if (!isOpen || !receipt) return null;

    const handlePrint = () => {
        const printContent = receiptRef.current.innerHTML;
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
      <html>
        <head>
          <title>KodBank Transaction Receipt</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; }
            .receipt-container { max-width: 500px; margin: 0 auto; border: 1px solid #eee; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.05); }
            .header { text-align: center; border-bottom: 2px solid #6366f1; padding-bottom: 20px; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: bold; color: #6366f1; margin-bottom: 5px; }
            .receipt-id { font-size: 12px; color: #888; text-transform: uppercase; }
            .row { display: flex; justify-content: space-between; margin-bottom: 15px; border-bottom: 1px dashed #eee; padding-bottom: 8px; }
            .label { font-weight: 600; color: #555; }
            .value { font-weight: 500; }
            .amount { font-size: 24px; font-weight: bold; color: #10b981; margin: 20px 0; text-align: center; }
            .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
            .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
            .status.completed { background: #dcfce7; color: #166534; }
            @media print {
              .no-print { display: none; }
              body { padding: 0; }
              .receipt-container { border: none; box-shadow: none; width: 100%; max-width: 100%; }
            }
          </style>
        </head>
        <body>
          <div class="receipt-container">${printContent}</div>
          <script>window.print(); window.close();</script>
        </body>
      </html>
    `);
        printWindow.document.close();
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content receipt-card">
                <div ref={receiptRef}>
                    <div className="header">
                        <div className="logo">KodBank</div>
                        <div className="receipt-id">Receipt ID: {receipt.receipt_id}</div>
                    </div>

                    <div className="amount">
                        {formatCurrency(receipt.transaction_details.amount)}
                    </div>

                    <div className="receipt-body">
                        <div className="row">
                            <span className="label">Date:</span>
                            <span className="value">{new Date(receipt.transaction_date).toLocaleString()}</span>
                        </div>
                        <div className="row">
                            <span className="label">Type:</span>
                            <span className="value" style={{ textTransform: 'capitalize' }}>{receipt.transaction_details.type}</span>
                        </div>
                        <div className="row">
                            <span className="label">Status:</span>
                            <span className={`status ${receipt.transaction_details.status}`}>{receipt.transaction_details.status}</span>
                        </div>
                        <div className="row">
                            <span className="label">From:</span>
                            <span className="value">{receipt.party_info.from_customer || 'Account Root'}</span>
                        </div>
                        {receipt.party_info.to_customer && (
                            <div className="row">
                                <span className="label">To:</span>
                                <span className="value">{receipt.party_info.to_customer}</span>
                            </div>
                        )}
                        <div className="row">
                            <span className="label">Description:</span>
                            <span className="value">{receipt.transaction_details.description}</span>
                        </div>
                    </div>

                    <div className="footer">
                        <p>Thank you for banking with KodBank</p>
                        <p>Generated at: {new Date(receipt.generated_at).toLocaleString()}</p>
                    </div>
                </div>

                <div className="modal-footer no-print">
                    <button onClick={onClose} className="btn-cancel">Close</button>
                    <button onClick={handlePrint} className="btn-confirm">Print/Download PDF</button>
                </div>
            </div>
        </div>
    );
};

export default ReceiptModal;
