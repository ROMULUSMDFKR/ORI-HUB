

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
// FIX: Imported 'QuoteStatus' to use in status comparison.
import { Company, Quote, Product, ProductLot, SalesOrder, SalesOrderStatus, QuoteItem, QuoteStatus } from '../types';
import { api } from '../api/firebaseApi';
import Spinner from '../components/ui/Spinner';
import CustomSelect from '../components/ui/CustomSelect';

// Reusable UI Components
const SectionCard: React.FC<{ title: string; children: React.ReactNode; }> = ({ title, children }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-3 mb-4">{title}</h3>
        <div className="space-y-4">
            {children}
        </div>
    </div>
);

const FormRow: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className }) => (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 items-start ${className}`}>
        {children}
    </div>
);

const InputGroup: React.FC<{ label: string; children: React.ReactNode; error?: string }> = ({ label, children, error }) => (
    <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
        {children}
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
);


const NewSalesOrderPage: React.FC = () => {
    const navigate = useNavigate();

    const { data: companies, loading: cLoading } = useCollection<Company>('companies');
    const { data: quotes, loading: qLoading } = useCollection<Quote>('quotes');
    const { data: products, loading: pLoading } = useCollection<Product>('products');

    const initialState = {
        status: SalesOrderStatus.Pendiente,
        items: [],
        total: 0,
        deliveries: [],
    };

    const [salesOrder, setSalesOrder] = useState<Partial<SalesOrder>>(initialState);
    const [selectedQuoteId, setSelectedQuoteId] = useState<string>('');
    const [availableLots, setAvailableLots] = useState<{ [key: string]: ProductLot[] }>({});
    
    const loading = cLoading || qLoading || pLoading;

    const companyQuotes = useMemo(() => {
        if (!quotes || !salesOrder.companyId) return [];
        // FIX: Used the correct enum member 'QuoteStatus.AprobadaPorCliente' instead of the string 'Aprobada'.
        return quotes.filter(q => q.companyId === salesOrder.companyId && q.status === QuoteStatus.AprobadaPorCliente);
    }, [quotes, salesOrder.companyId]);

    const handleCompanyChange = (companyId: string) => {
        setSalesOrder(prev => ({
            ...initialState,
            companyId,
        }));
        setSelectedQuoteId('');
    };
    
    const handleQuoteChange = (quoteId: string) => {
        setSelectedQuoteId(quoteId);
        const selectedQuote = quotes?.find(q => q.id === quoteId);
        if (selectedQuote) {
            const total = selectedQuote.items.reduce((sum, item) => sum + item.subtotal, 0);
            setSalesOrder(prev => ({
                ...prev,
                quoteId: selectedQuote.id,
                items: selectedQuote.items,
                total: total
            }));
        } else {
             setSalesOrder(prev => ({...prev, quoteId: '', items: [], total: 0}));
        }
    };

    const handleProductChange = async (index: number, productId: string) => {
        const newItems = [...(salesOrder.items || [])];
        newItems[index] = { ...newItems[index], productId, lotId: '' }; // Reset lot
        setSalesOrder(prev => ({...prev, items: newItems as QuoteItem[]}));
        
        if (productId) {
            const lots = await api.getLotsForProduct(productId);
            setAvailableLots(prev => ({ ...prev, [productId]: lots }));
        }
    };
    
    const handleLotChange = (index: number, lotId: string) => {
        const newItems = [...(salesOrder.items || [])];
        const item = newItems[index];
        const productLots = availableLots[item.productId] || [];
        const selectedLot = productLots.find(l => l.id === lotId);
        
        item.lotId = lotId;
        item.unitPrice = selectedLot?.pricing.min || 0;
        item.subtotal = item.qty * item.unitPrice;

        setSalesOrder(prev => ({...prev, items: newItems as QuoteItem[]}));
    };

    const updateItemField = (index: number, field: keyof QuoteItem, value: any) => {
        const newItems = [...(salesOrder.items || [])];
        const item = { ...newItems[index], [field]: value };
        
        if (field === 'qty' || field === 'unitPrice') {
             item.subtotal = (item.qty || 0) * (item.unitPrice || 0);
        }

        newItems[index] = item;
        setSalesOrder(prev => ({...prev, items: newItems as QuoteItem[]}));
    };

    const addItem = () => {
        const newItem: Partial<QuoteItem> = { id: `item-${Date.now()}`, qty: 0, unit: 'ton', unitPrice: 0, subtotal: 0 };
        setSalesOrder(prev => ({...prev, items: [...(prev.items || []), newItem as QuoteItem]}));
    };

    const removeItem = (index: number) => {
        const new