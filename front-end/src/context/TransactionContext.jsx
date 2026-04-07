import React, { createContext, useContext, useState, useEffect } from 'react';

const TransactionContext = createContext(undefined);

const initialTransactions = [
  { id: '1', date: '2023-10-12', description: 'Assinatura AWS Production', category: 'Infra', account: 'Itaú Corp.', status: 'Realizado', amount: 4250.00, type: 'expense' },
  { id: '2', date: '2023-10-11', description: 'Recebimento Projeto Alpha', category: 'Vendas', account: 'BTG Pactual', status: 'Previsto', amount: 15800.00, type: 'income' },
  { id: '3', date: '2023-10-10', description: 'Aluguel Escritório SP', category: 'Fixos', account: 'Itaú Corp.', status: 'Realizado', amount: 12000.00, type: 'expense' },
];

export function TransactionProvider({ children }) {
  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem('core4_transactions');
    return saved ? JSON.parse(saved) : initialTransactions;
  });

  useEffect(() => {
    localStorage.setItem('core4_transactions', JSON.stringify(transactions));
  }, [transactions]);

  const addTransaction = (transaction) => {
    const newTransaction = {
      ...transaction,
      id: Math.random().toString(36).substr(2, 9),
    };
    setTransactions(prev => [newTransaction, ...prev]);
  };

  const deleteTransaction = (id) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const balance = totalIncome - totalExpense;

  return (
    <TransactionContext.Provider value={{
      transactions,
      addTransaction,
      deleteTransaction,
      totalIncome,
      totalExpense,
      balance
    }}>
      {children}
    </TransactionContext.Provider>
  );
}

export function useTransactions() {
  const context = useContext(TransactionContext);
  if (context === undefined) {
    throw new Error('useTransactions must be used within a TransactionProvider');
  }
  return context;
}
