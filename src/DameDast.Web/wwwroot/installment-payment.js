export function paymentEffect(records, change) {
  if (change.kind !== "installment" || change.delete) return null;
  const old = records.find(r => r.id === change.id)?.data;
  const payment = change.data.payment || old?.payment;
  if (!payment) return null;
  const previous = records.find(r => r.id === payment.transactionId);
  return { id: payment.transactionId, kind: "transaction", version: (previous?.version || 0) + 1,
    deleted: !change.data.payment, data: change.data.payment ? {
      accountId: payment.accountId, destinationId: null, type: "expense", amount: change.data.amount,
      category: payment.category, date: payment.date, note: change.data.title,
      installmentId: change.id, projectId: change.data.projectId || null,
    } : previous?.data };
}
