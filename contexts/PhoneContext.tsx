
import React, { createContext, useState, useContext, useCallback, useRef } from 'react';

type CallStatus = 'idle' | 'dialing' | 'connected' | 'ended';

interface PhoneContextType {
    isDialerOpen: boolean;
    openDialer: () => void;
    closeDialer: () => void;
    toggleDialer: () => void;
    makeCall: (number: string, name?: string) => void;
    endCall: () => void;
    currentNumber: string;
    setCurrentNumber: (num: string) => void;
    currentName: string;
    callStatus: CallStatus;
    callDuration: number;
    isMuted: boolean;
    toggleMute: () => void;
}

const PhoneContext = createContext<PhoneContextType | undefined>(undefined);

export const PhoneProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isDialerOpen, setIsDialerOpen] = useState(false);
    const [currentNumber, setCurrentNumber] = useState('');
    const [currentName, setCurrentName] = useState('');
    const [callStatus, setCallStatus] = useState<CallStatus>('idle');
    const [callDuration, setCallDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    
    const timerRef = useRef<number | null>(null);

    const openDialer = () => setIsDialerOpen(true);
    const closeDialer = () => {
        if (callStatus === 'idle' || callStatus === 'ended') {
            setIsDialerOpen(false);
        }
        // If in call, maybe just minimize? For now, we enforce closing only if idle
    };
    const toggleDialer = () => setIsDialerOpen(prev => !prev);

    const startTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        setCallDuration(0);
        timerRef.current = window.setInterval(() => {
            setCallDuration(prev => prev + 1);
        }, 1000);
    };

    const stopTimer = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    const makeCall = useCallback((number: string, name?: string) => {
        setIsDialerOpen(true);
        setCurrentNumber(number);
        setCurrentName(name || 'Desconocido');
        setCallStatus('dialing');
        
        // Simulate connection delay
        setTimeout(() => {
            setCallStatus('connected');
            startTimer();
        }, 1500);
    }, []);

    const endCall = useCallback(() => {
        setCallStatus('ended');
        stopTimer();
        setTimeout(() => {
            setCallStatus('idle');
            setCallDuration(0);
        }, 2000);
    }, []);

    const toggleMute = () => setIsMuted(prev => !prev);

    return (
        <PhoneContext.Provider value={{
            isDialerOpen,
            openDialer,
            closeDialer,
            toggleDialer,
            makeCall,
            endCall,
            currentNumber,
            setCurrentNumber,
            currentName,
            callStatus,
            callDuration,
            isMuted,
            toggleMute
        }}>
            {children}
        </PhoneContext.Provider>
    );
};

export const usePhone = () => {
    const context = useContext(PhoneContext);
    if (context === undefined) {
        throw new Error('usePhone must be used within a PhoneProvider');
    }
    return context;
};
