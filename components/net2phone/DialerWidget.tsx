
import React, { useEffect, useRef } from 'react';
import { usePhone } from '../../contexts/PhoneContext';
import Draggable from 'react-draggable'; // Assuming we might want drag later, but sticking to fixed for now

const KeypadButton: React.FC<{ value: string; sub?: string; onClick: (val: string) => void }> = ({ value, sub, onClick }) => (
    <button 
        onClick={() => onClick(value)}
        className="w-16 h-16 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 flex flex-col items-center justify-center transition-colors active:bg-slate-200 dark:active:bg-slate-600"
    >
        <span className="text-2xl font-medium text-slate-800 dark:text-slate-200">{value}</span>
        {sub && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{sub}</span>}
    </button>
);

const DialerWidget: React.FC = () => {
    const { 
        isDialerOpen, closeDialer, 
        currentNumber, setCurrentNumber, currentName,
        callStatus, makeCall, endCall, 
        callDuration, isMuted, toggleMute 
    } = usePhone();

    // Helper to format seconds to MM:SS
    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    };

    const handleDigitClick = (digit: string) => {
        if (callStatus === 'idle') {
            setCurrentNumber(currentNumber + digit);
        }
        // Send DTMF if in call (mock logic)
    };

    const handleBackspace = () => {
        if (callStatus === 'idle') {
            setCurrentNumber(currentNumber.slice(0, -1));
        }
    };
    
    const handleCallAction = () => {
        if (callStatus === 'idle') {
            if (currentNumber) makeCall(currentNumber);
        } else {
            endCall();
        }
    };

    if (!isDialerOpen) return null;

    return (
        <div className="fixed bottom-24 right-6 z-[60] w-80 bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col transition-all animate-slide-in-up">
            {/* Header */}
            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 flex justify-between items-center border-b border-slate-100 dark:border-slate-700 cursor-move">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Net2Phone</span>
                </div>
                <button onClick={closeDialer} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                    <span className="material-symbols-outlined text-lg">close</span>
                </button>
            </div>

            {/* Screen Area */}
            <div className="flex-1 p-6 flex flex-col items-center justify-center min-h-[180px] bg-white dark:bg-slate-800">
                {callStatus === 'idle' ? (
                     <input 
                        type="text" 
                        value={currentNumber}
                        readOnly
                        className="text-3xl font-light text-center bg-transparent border-none focus:ring-0 text-slate-800 dark:text-slate-100 w-full mb-2"
                        placeholder="Marcar..."
                     />
                ) : (
                    <div className="text-center animate-fade-in">
                        <div className="w-20 h-20 bg-indigo-100 dark:bg-slate-700 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                            {currentName.charAt(0).toUpperCase()}
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">{currentName}</h3>
                        <p className="text-sm text-slate-500 mb-2">{currentNumber}</p>
                        <p className={`text-sm font-mono ${callStatus === 'connected' ? 'text-green-500' : 'text-amber-500'}`}>
                            {callStatus === 'dialing' ? 'Llamando...' : callStatus === 'ended' ? 'Llamada Finalizada' : formatDuration(callDuration)}
                        </p>
                    </div>
                )}
            </div>

            {/* Controls / Keypad */}
            <div className="bg-slate-50 dark:bg-slate-900/30 p-4">
                {callStatus === 'idle' ? (
                    <div className="grid grid-cols-3 gap-y-2 place-items-center mb-4">
                        <KeypadButton value="1" onClick={handleDigitClick} />
                        <KeypadButton value="2" sub="ABC" onClick={handleDigitClick} />
                        <KeypadButton value="3" sub="DEF" onClick={handleDigitClick} />
                        <KeypadButton value="4" sub="GHI" onClick={handleDigitClick} />
                        <KeypadButton value="5" sub="JKL" onClick={handleDigitClick} />
                        <KeypadButton value="6" sub="MNO" onClick={handleDigitClick} />
                        <KeypadButton value="7" sub="PQRS" onClick={handleDigitClick} />
                        <KeypadButton value="8" sub="TUV" onClick={handleDigitClick} />
                        <KeypadButton value="9" sub="WXYZ" onClick={handleDigitClick} />
                        <KeypadButton value="*" onClick={handleDigitClick} />
                        <KeypadButton value="0" sub="+" onClick={handleDigitClick} />
                        <KeypadButton value="#" onClick={handleDigitClick} />
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-4 mb-8 px-4">
                        <button onClick={toggleMute} className={`flex flex-col items-center gap-1 ${isMuted ? 'text-red-500' : 'text-slate-500'}`}>
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center border transition-colors ${isMuted ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200 dark:bg-slate-700 dark:border-slate-600'}`}>
                                <span className="material-symbols-outlined text-xl">{isMuted ? 'mic_off' : 'mic'}</span>
                            </div>
                            <span className="text-xs">Mute</span>
                        </button>
                        <button className="flex flex-col items-center gap-1 text-slate-500">
                             <div className="w-12 h-12 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center">
                                <span className="material-symbols-outlined text-xl">keypad</span>
                            </div>
                            <span className="text-xs">Teclado</span>
                        </button>
                        <button className="flex flex-col items-center gap-1 text-slate-500">
                             <div className="w-12 h-12 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center">
                                <span className="material-symbols-outlined text-xl">pause</span>
                            </div>
                            <span className="text-xs">Hold</span>
                        </button>
                    </div>
                )}

                {/* Main Action Button */}
                <div className="flex justify-center items-center gap-6 pb-2">
                    {callStatus === 'idle' && currentNumber.length > 0 && (
                        <button onClick={handleBackspace} className="text-slate-400 hover:text-slate-600">
                            <span className="material-symbols-outlined">backspace</span>
                        </button>
                    )}
                    
                    <button 
                        onClick={handleCallAction}
                        className={`w-16 h-16 rounded-full shadow-lg flex items-center justify-center text-white transition-transform hover:scale-105 active:scale-95 ${callStatus === 'idle' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}
                    >
                        <span className="material-symbols-outlined text-3xl">
                            {callStatus === 'idle' ? 'call' : 'call_end'}
                        </span>
                    </button>
                    
                    {callStatus === 'idle' && <div className="w-6"></div>} 
                </div>
            </div>
        </div>
    );
};

export default DialerWidget;
