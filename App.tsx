import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { Clinic, Pet, Appointment, Prescription, ShopItem, CartItem, Address, ChatMessage } from './types';
import { MOCK_PETS, MOCK_CLINICS, MOCK_APPOINTMENTS, MOCK_PRESCRIPTIONS, NAV_ITEMS, MOCK_SHOP_ITEMS, MOCK_ADDRESSES } from './constants';
import type { NavItemName } from './constants';
import Icon from './components/Icon';
import PetImage from './components/PetImage';
import ClinicImage from './components/ClinicImage';
import { GoogleGenAI, Chat } from "@google/genai";

// Reusable Components defined outside App to prevent re-creation on re-renders

// -- Modals --

interface ModalProps {
  onClose: () => void;
  children: React.ReactNode;
  title: string;
}

const Modal: React.FC<ModalProps> = ({ onClose, children, title }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center p-4 animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md m-4 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-slate-800">{title}</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                    <Icon name="XIcon" className="w-6 h-6" />
                </button>
            </div>
            <div className="overflow-y-auto p-6">{children}</div>
        </div>
    </div>
);

// Appointment Modal
type PetReasonState = Record<number, { selected: Set<string>; custom: string }>;

const AppointmentModal: React.FC<{
    clinic: Clinic;
    pets: Pet[];
    onClose: () => void;
    onBook: (details: { clinic: Clinic; pets: Pet[]; time: string; reasons: { petId: number; reason: string }[] }) => void;
}> = ({ clinic, pets, onClose, onBook }) => {
    const [selectedPets, setSelectedPets] = useState<Pet[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [petReasons, setPetReasons] = useState<PetReasonState>({});
    const commonReasons = ["Annual Check-up", "Vaccinations", "Not Feeling Well", "Injury", "Skin Issue", "Follow-up"];
    const petColors = ['teal', 'amber', 'sky', 'rose', 'indigo'];


    const handlePetSelect = (petToToggle: Pet) => {
        const isAlreadySelected = selectedPets.some(p => p.id === petToToggle.id);
        if (isAlreadySelected) {
            setSelectedPets(current => current.filter(p => p.id !== petToToggle.id));
            setPetReasons(current => {
                const newReasons = { ...current };
                delete newReasons[petToToggle.id];
                return newReasons;
            });
        } else {
            if (selectedPets.length < 5) {
                setSelectedPets(current => [...current, petToToggle]);
                setPetReasons(current => ({
                    ...current,
                    [petToToggle.id]: { selected: new Set(), custom: '' }
                }));
            } else {
                alert("You can select a maximum of 5 pets.");
            }
        }
    };
    
    const handleReasonToggle = (petId: number, reason: string) => {
        setPetReasons(current => {
            const reasonsForPet = new Set(current[petId].selected);
            if (reasonsForPet.has(reason)) {
                reasonsForPet.delete(reason);
            } else {
                reasonsForPet.add(reason);
            }
            return { ...current, [petId]: { ...current[petId], selected: reasonsForPet }};
        });
    };

    const handleCustomReasonChange = (petId: number, text: string) => {
         setPetReasons(current => ({
            ...current,
            [petId]: { ...current[petId], custom: text }
        }));
    };

    const handleBooking = () => {
        if (!selectedSlot || selectedPets.length === 0) {
            alert('Please select a time slot and at least one pet.');
            return;
        }

        const reasonsPayload = selectedPets.map(pet => {
            const reasonData = petReasons[pet.id];
            if (!reasonData || (reasonData.selected.size === 0 && !reasonData.custom)) {
                return { petId: pet.id, reason: null }; // Flag for missing reason
            }
            const selectedReasons = Array.from(reasonData.selected).join(', ');
            let fullReason = '';
            if (selectedReasons) {
                fullReason += `Concerns: ${selectedReasons}. `;
            }
            if (reasonData.custom) {
                fullReason += `Details: ${reasonData.custom}`;
            }
            return { petId: pet.id, reason: fullReason.trim() };
        });

        if (reasonsPayload.some(r => r.reason === null)) {
            alert('Please provide a reason for each selected pet.');
            return;
        }

        onBook({ clinic, pets: selectedPets, time: selectedSlot, reasons: reasonsPayload as { petId: number; reason: string }[] });
    };

    const isBookingDisabled = !selectedSlot || selectedPets.length === 0 || selectedPets.some(p => !petReasons[p.id] || (petReasons[p.id].selected.size === 0 && petReasons[p.id].custom.trim() === ''));

    return (
        <Modal onClose={onClose} title={`Book at ${clinic.name}`}>
            <div className="space-y-6">
                {/* Time Slot Selection */}
                <div>
                    <h3 className="font-semibold text-slate-700 mb-2">1. Select Time Slot</h3>
                    <div className="grid grid-cols-3 gap-2">
                        {clinic.availableSlots.map(slot => (
                            <button
                                key={slot}
                                onClick={() => setSelectedSlot(slot)}
                                className={`p-2 rounded-lg text-sm transition ${selectedSlot === slot ? 'bg-amber-500 text-white font-bold shadow' : 'bg-amber-100 text-amber-800 hover:bg-amber-200'}`}
                            >
                                {slot}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Pet Selection */}
                <div>
                    <h3 className="font-semibold text-slate-700 mb-2">2. Select Pet(s) <span className="text-sm font-normal text-slate-500">({selectedPets.length}/5)</span></h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                        {pets.map(pet => {
                            const isSelected = selectedPets.some(sp => sp.id === pet.id);
                            return (
                                <button
                                    key={pet.id}
                                    onClick={() => handlePetSelect(pet)}
                                    className={`w-full text-left p-2 rounded-lg flex items-center space-x-3 transition border-2 ${isSelected ? 'bg-teal-50 border-teal-500' : 'bg-slate-50 border-transparent hover:bg-slate-100'}`}
                                >
                                    <PetImage petName={pet.name} petBreed={pet.breed} fallbackUrl={pet.imageUrl} className="w-10 h-10 rounded-full object-cover" />
                                    <div>
                                        <p className="font-semibold text-slate-800">{pet.name}</p>
                                        <p className="text-xs text-slate-500">{pet.breed}</p>
                                    </div>
                                    {isSelected && <div className="ml-auto text-teal-600 font-bold text-xl">✓</div>}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Reasons for Visit (Per Pet) */}
                {selectedPets.length > 0 && (
                    <div className="space-y-4 pt-2">
                         <h3 className="font-semibold text-slate-700 mb-2">3. Reason for Visit</h3>
                        {selectedPets.map((pet, index) => {
                            const colorName = petColors[index % petColors.length];
                            return (
                                <div key={pet.id} className={`p-4 rounded-lg bg-${colorName}-50 border-l-4 border-${colorName}-400`}>
                                    <h3 className="font-semibold text-slate-700 mb-2">For <span className={`font-bold text-${colorName}-600`}>{pet.name}</span></h3>
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {commonReasons.map(r => (
                                            <button 
                                                key={r} 
                                                onClick={() => handleReasonToggle(pet.id, r)} 
                                                className={`text-sm px-3 py-1 rounded-full transition ${petReasons[pet.id]?.selected.has(r) ? `bg-${colorName}-500 text-white font-semibold` : `bg-${colorName}-100 text-${colorName}-800 hover:bg-${colorName}-200`}`}
                                            >
                                                {r}
                                            </button>
                                        ))}
                                    </div>
                                    <textarea
                                        value={petReasons[pet.id]?.custom || ''}
                                        onChange={(e) => handleCustomReasonChange(pet.id, e.target.value)}
                                        className={`w-full p-3 border bg-white border-${colorName}-200 rounded-lg focus:ring-2 focus:ring-${colorName}-400 focus:border-${colorName}-400 transition`}
                                        placeholder={`Describe any other concerns for ${pet.name}...`}
                                        rows={2}
                                    ></textarea>
                                </div>
                            )
                        })}
                    </div>
                )}
                
                <button
                    onClick={handleBooking}
                    className="w-full bg-teal-500 text-white font-bold py-3 rounded-lg hover:bg-teal-600 transition shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
                    disabled={isBookingDisabled}
                >
                    Confirm Appointment{selectedPets.length > 0 ? ` for ${selectedPets.length} pet(s)`: ''}
                </button>
            </div>
        </Modal>
    );
};


// Reschedule Modal
const RescheduleModal: React.FC<{ appointment: Appointment; onClose: () => void; onConfirm: (appointmentId: number, newTime: string) => void; }> = ({ appointment, onClose, onConfirm }) => {
    const [selectedSlot, setSelectedSlot] = useState<string | null>(appointment.time);

    const handleReschedule = () => {
        if (!selectedSlot) {
            alert('Please select a new time slot.');
            return;
        }
        onConfirm(appointment.id, selectedSlot);
    };

    return (
        <Modal onClose={onClose} title={`Reschedule for ${appointment.pet.name}`}>
            <div className="space-y-4">
                <p className="text-slate-600">Select a new time for your appointment at <span className="font-semibold">{appointment.clinic.name}</span>.</p>
                <div>
                    <h3 className="font-semibold text-slate-700 mb-2">Select Time Slot</h3>
                    <div className="grid grid-cols-3 gap-2">
                        {appointment.clinic.availableSlots.map(slot => (
                            <button
                                key={slot}
                                onClick={() => setSelectedSlot(slot)}
                                className={`p-2 rounded-lg text-sm transition ${selectedSlot === slot ? 'bg-amber-500 text-white font-bold shadow' : 'bg-amber-100 text-amber-800 hover:bg-amber-200'}`}
                            >
                                {slot}
                            </button>
                        ))}
                    </div>
                </div>
                <button
                    onClick={handleReschedule}
                    className="w-full bg-teal-500 text-white font-bold py-3 rounded-lg hover:bg-teal-600 transition shadow-lg disabled:bg-gray-400"
                    disabled={!selectedSlot || selectedSlot === appointment.time}
                >
                    Confirm New Time
                </button>
            </div>
        </Modal>
    );
};

// Video Consultation Modal
const VideoConsultationModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let stream: MediaStream;
        const startCamera = async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: true });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error("Error accessing camera:", err);
                setError("Could not access camera. Please check permissions.");
            }
        };

        startCamera();

        return () => {
            stream?.getTracks().forEach(track => track.stop());
        };
    }, []);

    return (
        <Modal onClose={onClose} title="Video Consultation">
            <div className="space-y-4">
                <p className="text-slate-600 text-sm">Connecting you with the next available veterinarian...</p>
                <div className="relative bg-slate-800 rounded-lg overflow-hidden aspect-video">
                    {error ? (
                         <div className="absolute inset-0 flex items-center justify-center text-red-400 p-4">{error}</div>
                    ) : (
                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover"></video>
                    )}
                    <div className="absolute top-2 right-2 w-1/4 h-1/4 bg-slate-700 rounded-md border-2 border-slate-600 flex items-center justify-center">
                        <p className="text-white text-xs text-center">Vet's Feed</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="w-full bg-red-500 text-white font-bold py-3 rounded-lg hover:bg-red-600 transition shadow-lg"
                >
                    End Call
                </button>
            </div>
        </Modal>
    );
};

// Lost Pet Modal
const LostPetModal: React.FC<{ pet: Pet; onClose: () => void }> = ({ pet, onClose }) => {
    const [alertSent, setAlertSent] = useState(false);
    
    const sendAlert = () => {
        // Simulate sending an alert
        setAlertSent(true);
    };

    return (
        <Modal onClose={onClose} title="Lost Pet Alert">
            {!alertSent ? (
                <div className="text-center space-y-4">
                    <PetImage petName={pet.name} petBreed={pet.breed} fallbackUrl={pet.imageUrl} className="w-24 h-24 rounded-full mx-auto" />
                    <h3 className="text-lg font-bold text-slate-800">Alert community about {pet.name}?</h3>
                    <p className="text-slate-600">This will notify nearby users and your registered friends that {pet.name} is missing.</p>
                    <button
                        onClick={sendAlert}
                        className="w-full bg-amber-500 text-white font-bold py-3 rounded-lg hover:bg-amber-600 transition shadow-lg"
                    >
                        Yes, Send Alert
                    </button>
                </div>
            ) : (
                 <div className="text-center space-y-4">
                    <p className="font-semibold text-teal-600">Alert Sent!</p>
                    <p className="text-slate-600">The community is now on the lookout. We've enabled location tracking on {pet.name}'s smart collar.</p>
                    <div className="bg-gray-200 h-48 rounded-lg p-2 relative overflow-hidden">
                        {/* Fake map grid lines */}
                        <div className="absolute inset-0 grid grid-cols-6 grid-rows-4 opacity-30">
                            {[...Array(24)].map((_, i) => (
                                <div key={i} className={`border-gray-400 ${i % 6 !== 5 ? 'border-r' : ''} ${Math.floor(i / 6) !== 3 ? 'border-b' : ''}`}></div>
                            ))}
                        </div>
                        {/* Fake location marker for pet */}
                        <div className="absolute top-1/2 left-1/3" title={`${pet.name}'s last known location`}>
                            <div className="absolute w-4 h-4 bg-red-500 rounded-full animate-ping"></div>
                            <div className="absolute w-4 h-4 bg-red-500 rounded-full border-2 border-white"></div>
                        </div>
                         {/* Fake location marker for user */}
                        <div className="absolute top-1/4 left-2/3" title="Your location">
                            <div className="w-3 h-3 bg-blue-600 rounded-full border-2 border-white"></div>
                        </div>
                        <p className="absolute bottom-1 right-2 bg-white/70 px-2 py-0.5 rounded text-xs text-slate-700">Map data &copy; Fauxgle</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-full bg-slate-500 text-white font-bold py-3 rounded-lg hover:bg-slate-600 transition"
                    >
                        Close
                    </button>
                </div>
            )}
        </Modal>
    );
};

const CartModal: React.FC<{
    cart: CartItem[];
    onClose: () => void;
    onUpdateQuantity: (itemId: number, newQuantity: number) => void;
    onRemove: (itemId: number) => void;
    onCheckout: () => void;
}> = ({ cart, onClose, onUpdateQuantity, onRemove, onCheckout }) => {
    const subtotal = useMemo(() => 
        cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]);

    return (
        <Modal onClose={onClose} title="Your Shopping Cart">
            <div className="space-y-4">
                {cart.length === 0 ? (
                    <p className="text-slate-500 text-center py-8">Your cart is empty.</p>
                ) : (
                    <>
                        <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                            {cart.map(item => (
                                <div key={item.id} className="flex items-center space-x-4">
                                    <img src={item.imageUrl} alt={item.name} className="w-16 h-16 rounded-lg object-cover bg-gray-100" />
                                    <div className="flex-grow">
                                        <p className="font-semibold text-slate-800">{item.name}</p>
                                        <p className="text-sm text-slate-500">${item.price.toFixed(2)}</p>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <button onClick={() => onUpdateQuantity(item.id, item.quantity - 1)} className="p-1 rounded-full bg-slate-200 hover:bg-slate-300 transition"><Icon name="MinusIcon" className="w-4 h-4" /></button>
                                        <span className="font-bold w-5 text-center">{item.quantity}</span>
                                        <button onClick={() => onUpdateQuantity(item.id, item.quantity + 1)} className="p-1 rounded-full bg-slate-200 hover:bg-slate-300 transition"><Icon name="PlusIcon" className="w-4 h-4" /></button>
                                    </div>
                                    <button onClick={() => onRemove(item.id)} className="text-red-500 hover:text-red-700"><Icon name="TrashIcon" className="w-5 h-5" /></button>
                                </div>
                            ))}
                        </div>
                        <div className="pt-4 border-t">
                            <div className="flex justify-between font-bold text-lg">
                                <span>Subtotal</span>
                                <span>${subtotal.toFixed(2)}</span>
                            </div>
                            <button
                                onClick={onCheckout}
                                className="mt-4 w-full bg-teal-500 text-white font-bold py-3 rounded-lg hover:bg-teal-600 transition shadow-lg"
                            >
                                Proceed to Checkout
                            </button>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
};

const AddressModal: React.FC<{
    addresses: Address[];
    selectedId: number | null;
    onClose: () => void;
    onSelect: (id: number) => void;
    onAdd: (address: Omit<Address, 'id'>) => void;
    onRemove: (id: number) => void;
}> = ({ addresses, selectedId, onClose, onSelect, onAdd, onRemove }) => {
    const [label, setLabel] = useState('');
    const [isCustomLabel, setIsCustomLabel] = useState(false);
    const [addressDetails, setAddressDetails] = useState({ street: '', city: '', zip: '' });
    
    const handleAdd = () => {
        if (label && addressDetails.street && addressDetails.city && addressDetails.zip) {
            onAdd({ label, ...addressDetails });
            setLabel('');
            setIsCustomLabel(false);
            setAddressDetails({ street: '', city: '', zip: '' });
        } else {
            alert('Please fill all fields for the new address.');
        }
    };

    const handleLabelClick = (selectedLabel: string) => {
        if (selectedLabel === 'Other') {
            setIsCustomLabel(true);
            setLabel(''); // Clear label to force user input
        } else {
            setIsCustomLabel(false);
            setLabel(selectedLabel);
        }
    };

    return (
        <Modal onClose={onClose} title="Manage Addresses">
            <div className="space-y-4">
                <h3 className="font-semibold text-slate-700">Your Saved Addresses</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {addresses.map(addr => (
                        <div key={addr.id} className={`p-3 rounded-lg flex items-center justify-between transition ${selectedId === addr.id ? 'bg-teal-50 border-2 border-teal-300' : 'bg-slate-50'}`}>
                            <button onClick={() => onSelect(addr.id)} className="text-left flex-grow flex items-center space-x-3">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${selectedId === addr.id ? 'bg-teal-500' : 'border-2 border-slate-300'}`}>
                                    {selectedId === addr.id && <Icon name="CheckIcon" className="w-4 h-4 text-white" />}
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800">{addr.label}</p>
                                    <p className="text-sm text-slate-500">{`${addr.street}, ${addr.city}`}</p>
                                </div>
                            </button>
                            <button onClick={() => onRemove(addr.id)} className="text-slate-400 hover:text-red-500 ml-4"><Icon name="TrashIcon" className="w-5 h-5"/></button>
                        </div>
                    ))}
                </div>
                <div className="pt-4 border-t">
                    <h3 className="font-semibold text-slate-700 mb-2">Add New Address</h3>
                    <div className="space-y-2">
                        <div>
                            <p className="text-sm font-medium text-slate-600 mb-1">Label</p>
                            <div className="flex gap-2">
                                {['Home', 'Work', 'Other'].map(l => (
                                    <button 
                                        key={l}
                                        onClick={() => handleLabelClick(l)}
                                        className={`px-3 py-1 rounded-full text-sm font-semibold transition ${
                                            (label === l && !isCustomLabel) || (l === 'Other' && isCustomLabel)
                                            ? 'bg-teal-500 text-white' 
                                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                        }`}
                                    >
                                        {l}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {isCustomLabel && (
                            <input 
                                type="text" 
                                placeholder="Custom Label (e.g., Mom's House)" 
                                value={label}
                                onChange={e => setLabel(e.target.value)} 
                                className="w-full p-2 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition"
                            />
                        )}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                             <input type="text" placeholder="Street" value={addressDetails.street} onChange={e => setAddressDetails({...addressDetails, street: e.target.value})} className="col-span-2 p-2 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition" />
                            <input type="text" placeholder="City" value={addressDetails.city} onChange={e => setAddressDetails({...addressDetails, city: e.target.value})} className="p-2 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition" />
                            <input type="text" placeholder="ZIP Code" value={addressDetails.zip} onChange={e => setAddressDetails({...addressDetails, zip: e.target.value})} className="p-2 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition" />
                        </div>
                    </div>
                    <button onClick={handleAdd} className="mt-3 w-full bg-amber-500 text-white font-bold py-2 rounded-lg hover:bg-amber-600 transition">Add Address</button>
                </div>
            </div>
        </Modal>
    );
};

const AiAssistantModal: React.FC<{
    messages: ChatMessage[];
    onClose: () => void;
    onSendMessage: (message: string) => void;
    isLoading: boolean;
}> = ({ messages, onClose, onSendMessage, isLoading }) => {
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim()) {
            onSendMessage(input.trim());
            setInput('');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-end sm:items-center p-0 sm:p-4 animate-fade-in">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md m-0 sm:m-4 h-[85vh] sm:h-[70vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-gray-200">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center"><Icon name="ChatBubbleLeftEllipsisIcon" className="w-6 h-6 text-white"/></div>
                        <div>
                             <h2 className="text-xl font-bold text-slate-800">AI Concierge</h2>
                             <p className="text-sm text-slate-500">Your personal assistant</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><Icon name="XIcon" className="w-6 h-6" /></button>
                </div>
                <div className="flex-grow overflow-y-auto p-4 space-y-4">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.sender === 'ai' && <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0"><Icon name="SparklesIcon" className="w-4 h-4 text-slate-600"/></div>}
                            <div className={`max-w-xs md:max-w-sm px-4 py-2 rounded-2xl ${msg.sender === 'user' ? 'bg-amber-500 text-white rounded-br-none' : 'bg-slate-100 text-slate-800 rounded-bl-none'}`}>
                                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex items-end gap-2 justify-start">
                             <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0"><Icon name="SparklesIcon" className="w-4 h-4 text-slate-600"/></div>
                             <div className="max-w-xs md:max-w-sm px-4 py-2 rounded-2xl bg-slate-100 text-slate-800 rounded-bl-none">
                                <div className="flex items-center space-x-1">
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                 <form onSubmit={handleSend} className="p-4 border-t border-gray-200 flex items-center space-x-2">
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Ask me anything..."
                        className="flex-grow p-3 bg-white border border-slate-300 rounded-full focus:ring-2 focus:ring-amber-400 focus:outline-none transition"
                    />
                    <button type="submit" disabled={!input.trim() || isLoading} className="w-12 h-12 bg-amber-500 text-white rounded-full flex items-center justify-center hover:bg-amber-600 transition disabled:bg-gray-300">
                        <Icon name="PaperAirplaneIcon" className="w-6 h-6" />
                    </button>
                </form>
            </div>
        </div>
    );
};



// -- Cards --

const ClinicCard: React.FC<{ clinic: Clinic; onBook: () => void; onPinToggle: () => void; }> = ({ clinic, onBook, onPinToggle }) => {
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clinic.address)}`;
    return (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden transform hover:-translate-y-1 transition-transform duration-300 flex flex-col">
            <div className="w-full h-32 bg-gray-100 relative">
                <ClinicImage 
                    clinicName={clinic.name}
                    clinicAddress={clinic.address}
                    fallbackUrl={clinic.imageUrl}
                    className='w-full h-full object-cover'
                />
                <button onClick={onPinToggle} className="absolute top-2 right-2 bg-black/40 p-1.5 rounded-full text-white hover:bg-black/60 transition" aria-label={clinic.isPinned ? 'Unpin clinic' : 'Pin clinic'}>
                    <Icon name="BookmarkIcon" className="w-5 h-5" filled={!!clinic.isPinned} />
                </button>
            </div>
            <div className="p-4 flex-grow flex flex-col">
                <h3 className="font-bold text-lg text-slate-800">{clinic.name}</h3>
                <p className="text-sm text-slate-500 truncate">{clinic.address}</p>
                
                <div className="flex items-center text-sm text-slate-600 mt-2">
                    <Icon name="MapPinIcon" className="w-4 h-4 mr-1 text-slate-400" />
                    <span>{clinic.distance} km away</span>
                </div>

                <div className="flex items-center space-x-1 mt-2">
                    <Icon name="StarIcon" className="w-5 h-5 text-yellow-400" />
                    <span className="font-bold text-slate-700">{clinic.rating}</span>
                    <span className="text-sm text-slate-500">({clinic.reviewCount} reviews)</span>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                     <button onClick={onBook} className="bg-amber-500 text-white font-semibold px-4 py-2 rounded-lg text-sm hover:bg-amber-600 transition flex-grow">
                        Book Now
                    </button>
                    <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="ml-3 text-slate-500 hover:text-amber-600 transition p-2" aria-label={`Navigate to ${clinic.name}`}>
                        <Icon name="ArrowTopRightOnSquareIcon" className="w-6 h-6"/>
                    </a>
                </div>
            </div>
        </div>
    );
};

const PetProfileCard: React.FC<{ pet: Pet, onSelect: () => void, isSelected?: boolean }> = ({ pet, onSelect, isSelected }) => (
    <button onClick={onSelect} className={`text-left p-4 rounded-2xl flex items-center space-x-4 transition w-full ${isSelected ? 'bg-teal-100 ring-2 ring-teal-500' : 'bg-white shadow-md hover:shadow-lg'}`}>
        <PetImage petName={pet.name} petBreed={pet.breed} fallbackUrl={pet.imageUrl} className="w-16 h-16 rounded-full object-cover" />
        <div>
            <h3 className="font-bold text-lg text-slate-800">{pet.name}</h3>
            <p className="text-sm text-slate-500">{pet.breed}, {pet.age} years old</p>
        </div>
    </button>
);


// -- Screens / Views --

const HomeScreen: React.FC<{ 
    clinics: Clinic[];
    onBook: (clinic: Clinic) => void; 
    onModalOpen: (modal: string) => void;
    selectedAddress?: Address;
    onPinToggle: (clinicId: number) => void;
    upcomingAppointment?: Appointment;
    onNavigateToAppointment: (appointmentId: number) => void;
}> = ({ clinics, onBook, onModalOpen, selectedAddress, onPinToggle, upcomingAppointment, onNavigateToAppointment }) => {
    return (
        <div className="p-4 space-y-6">
            {/* Address Section */}
            {selectedAddress && (
                 <button onClick={() => onModalOpen('address')} className="w-full bg-white/50 p-2 rounded-lg hover:bg-white/80 transition flex items-center space-x-2 text-left mb-2">
                    <Icon name="MapPinIcon" className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    <div className="flex-grow overflow-hidden">
                        <p className="font-semibold text-slate-700 text-sm truncate leading-tight">{selectedAddress.label}: {selectedAddress.street}</p>
                    </div>
                    <Icon name="PencilIcon" className="w-4 h-4 text-slate-400" />
                </button>
            )}

            <div>
                <h1 className="text-3xl font-bold text-slate-800">Hello, Pet Parent!</h1>
                <p className="text-slate-600">How can we help you today?</p>
            </div>
            
            {/* Upcoming Appointment Section */}
            {upcomingAppointment && (
                <button 
                    onClick={() => onNavigateToAppointment(upcomingAppointment.id)} 
                    className="w-full text-left bg-white p-4 rounded-xl shadow-lg border border-teal-200 hover:bg-teal-50/70 transition-colors"
                    aria-label={`View details for upcoming appointment for ${upcomingAppointment.pet.name}`}
                >
                    <h2 className="text-sm font-bold text-teal-700 mb-2">UPCOMING APPOINTMENT</h2>
                    <div className="flex items-center space-x-3">
                        <PetImage petName={upcomingAppointment.pet.name} petBreed={upcomingAppointment.pet.breed} fallbackUrl={upcomingAppointment.pet.imageUrl} className="w-12 h-12 rounded-full flex-shrink-0" />
                        <div>
                            <p className="font-bold text-slate-800">{upcomingAppointment.clinic.name}</p>
                            <p className="text-sm text-slate-600">{new Date(upcomingAppointment.date).toDateString()} at {upcomingAppointment.time}</p>
                            <p className="text-sm text-slate-500">For: {upcomingAppointment.pet.name}</p>
                        </div>
                    </div>
                </button>
            )}

            {/* Emergency Section */}
            <div className="bg-red-100 border-l-4 border-red-500 p-3 rounded-lg">
                <h2 className="text-lg font-bold text-red-800 mb-3">Emergency Services</h2>
                <div className="flex space-x-3">
                    <button onClick={() => onModalOpen('video')} className="flex-1 bg-white p-3 rounded-xl shadow hover:shadow-lg transition text-center space-y-1">
                        <Icon name="VideoCameraIcon" className="w-7 h-7 mx-auto text-red-500" />
                        <p className="font-semibold text-red-700 text-sm">Video Consult</p>
                    </button>
                    <button onClick={() => alert('Ambulance requested!')} className="flex-1 bg-white p-3 rounded-xl shadow hover:shadow-lg transition text-center space-y-1">
                        <Icon name="PhoneIcon" className="w-7 h-7 mx-auto text-red-500" />
                        <p className="font-semibold text-red-700 text-sm">Book Ambulance</p>
                    </button>
                    <button onClick={() => onModalOpen('lostPet')} className="flex-1 bg-white p-3 rounded-xl shadow hover:shadow-lg transition text-center space-y-1">
                        <Icon name="SearchIcon" className="w-7 h-7 mx-auto text-red-500" />
                        <p className="font-semibold text-red-700 text-sm">Lost Pet Alert</p>
                    </button>
                </div>
            </div>

            {/* Nearby Clinics */}
            <div>
                <h2 className="text-xl font-bold text-slate-800 mb-4">Nearby Clinics</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {clinics.map(clinic => (
                        <ClinicCard key={clinic.id} clinic={clinic} onBook={() => onBook(clinic)} onPinToggle={() => onPinToggle(clinic.id)} />
                    ))}
                </div>
            </div>
        </div>
    );
};

const AppointmentsScreen: React.FC<{ 
    appointments: Appointment[];
    onAddToCart: (item: ShopItem, quantity: number) => void;
    highlightedAppointmentId: number | null;
    onHighlightDone: () => void;
}> = ({ appointments: initialAppointments, onAddToCart, highlightedAppointmentId, onHighlightDone }) => {
    const [view, setView] = useState<'upcoming' | 'past'>('upcoming');
    const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
    const [appointmentToReschedule, setAppointmentToReschedule] = useState<Appointment | null>(null);
    const [activeAppointmentId, setActiveAppointmentId] = useState<number | null>(null);
    const appointmentRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());

    useEffect(() => {
        setAppointments(initialAppointments);
    }, [initialAppointments]);

    useEffect(() => {
        if (highlightedAppointmentId) {
            const appointmentToHighlight = initialAppointments.find(a => a.id === highlightedAppointmentId);
            if (appointmentToHighlight) {
                // FIX: `appointmentToHighlight.status` can be 'cancelled', which is not a valid type for the `view` state.
                // This condition ensures we only call `setView` with 'upcoming' or 'past'.
                if (appointmentToHighlight.status !== view && (appointmentToHighlight.status === 'upcoming' || appointmentToHighlight.status === 'past')) {
                    setView(appointmentToHighlight.status);
                }
                setActiveAppointmentId(highlightedAppointmentId);
                setTimeout(() => {
                    const element = appointmentRefs.current.get(highlightedAppointmentId);
                    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 150);
            }
            onHighlightDone();
        }
    }, [highlightedAppointmentId, initialAppointments, view, onHighlightDone]);

    const handleCardClick = (appointmentId: number) => {
        setActiveAppointmentId(prevId => prevId === appointmentId ? null : appointmentId);
    };

    const handleCancel = (appointmentId: number) => {
        if(window.confirm("Are you sure you want to cancel this appointment?")) {
            setAppointments(current => 
                current.map(app => 
                    app.id === appointmentId ? { ...app, status: 'cancelled' } : app
                )
            );
        }
    };
    
    const handleRescheduleConfirm = (appointmentId: number, newTime: string) => {
        setAppointments(current => 
            current.map(app => 
                app.id === appointmentId ? { ...app, time: newTime } : app
            )
        );
        setAppointmentToReschedule(null); // Close modal
    };

    const filteredAppointments = appointments.filter(a => a.status === view);
    const prescriptions = MOCK_PRESCRIPTIONS;

    return (
        <div className="p-4 space-y-4">
            <h1 className="text-3xl font-bold text-slate-800">Appointments</h1>
            <div className="flex border-b">
                <button onClick={() => setView('upcoming')} className={`py-2 px-4 font-semibold ${view === 'upcoming' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-slate-500'}`}>Upcoming</button>
                <button onClick={() => setView('past')} className={`py-2 px-4 font-semibold ${view === 'past' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-slate-500'}`}>Past</button>
            </div>
            {filteredAppointments.length === 0 ? <p className="text-slate-500 text-center py-8">No {view} appointments.</p> : null}
            <div className="space-y-4">
                {filteredAppointments.map(app => {
                    const doctor = app.clinic.doctors.find(d => d.id === app.doctorId);
                    const appPrescriptions = prescriptions.filter(p => p.appointmentId === app.id);
                    const isExpanded = activeAppointmentId === app.id;
                    return (
                         <div 
                            key={app.id}
                            // FIX: A ref callback should not return a value. `Map.prototype.set()` returns the map instance, causing a type error.
                            // This implementation also handles cleaning up the ref map when a component unmounts.
                            ref={el => {
                                if (el) {
                                    appointmentRefs.current.set(app.id, el);
                                } else {
                                    appointmentRefs.current.delete(app.id);
                                }
                            }}
                            className={`bg-white rounded-xl overflow-hidden transition-all duration-300 ${isExpanded ? 'ring-2 ring-teal-400 ring-offset-2 shadow-lg' : 'shadow'}`}
                        >
                            <button onClick={() => handleCardClick(app.id)} className="w-full text-left p-4">
                                <div className="flex justify-between items-start">
                                    <div className='flex-grow pr-4'>
                                        <p className="font-bold text-slate-800">{app.clinic.name}</p>
                                        <p className="text-sm text-slate-600">For: <span className="font-semibold">{app.pet.name}</span> with <span className="font-semibold">{doctor?.name || 'N/A'}</span></p>
                                        <p className="text-sm text-slate-500">{new Date(app.date).toDateString()} at {app.time}</p>
                                        <div className={`mt-2 inline-flex items-center gap-2 text-xs font-semibold px-2 py-1 rounded-full ${app.type === 'video' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                                           <Icon name={app.type === 'video' ? 'VideoCameraIcon' : 'BuildingOfficeIcon'} className="w-4 h-4" />
                                           {app.type === 'video' ? 'Video Consult' : 'In-Person'}
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        <PetImage petName={app.pet.name} petBreed={app.pet.breed} fallbackUrl={app.pet.imageUrl} className="w-12 h-12 rounded-full flex-shrink-0" />
                                         <div className={`text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                                            <Icon name="ChevronDownIcon" className="w-5 h-5" />
                                        </div>
                                    </div>
                                </div>
                            </button>
                            {isExpanded && (
                                <div className="px-4 pb-4 animate-fade-in">
                                    <div className="pt-3 border-t">
                                        <p className="text-sm text-slate-500 font-semibold mb-1">Reason for visit:</p>
                                        <p className="text-sm text-slate-700 prose prose-sm">{app.reason}</p>
                                    </div>
                                    {view === 'upcoming' && (
                                        <div className="mt-4 pt-4 border-t flex gap-2">
                                            <button onClick={() => setAppointmentToReschedule(app)} className="flex-1 bg-amber-100 text-amber-800 font-semibold px-3 py-2 rounded-lg text-sm hover:bg-amber-200 transition">
                                                Reschedule
                                            </button>
                                            <button onClick={() => handleCancel(app.id)} className="flex-1 bg-red-100 text-red-800 font-semibold px-3 py-2 rounded-lg text-sm hover:bg-red-200 transition">
                                                Cancel
                                            </button>
                                        </div>
                                    )}

                                    {view === 'past' && (
                                       <div className="mt-4 pt-4 border-t">
                                           <h4 className="font-semibold text-slate-700 mb-2">Prescriptions</h4>
                                           {appPrescriptions.length > 0 ? (
                                                appPrescriptions.map(p => {
                                                    const shopItem = MOCK_SHOP_ITEMS.find(i => i.id === p.itemId);
                                                    return (
                                                       <div key={p.id} className="bg-amber-50 p-3 rounded-lg mb-2 flex justify-between items-center">
                                                           <div>
                                                               <p className="font-bold">{p.medication}</p>
                                                               <p className="text-sm text-slate-600">{p.dosage} - {p.instructions}</p>
                                                           </div>
                                                           {shopItem && (
                                                               <button onClick={() => onAddToCart(shopItem, p.quantity)} className="text-sm text-teal-600 font-semibold mt-1 bg-teal-100 px-3 py-1 rounded-full hover:bg-teal-200 transition">
                                                                   Add to Cart
                                                               </button>
                                                           )}
                                                       </div>
                                                    )
                                                })
                                           ) : <p className="text-sm text-slate-500 italic">No prescriptions for this visit.</p>}
                                       </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
             {appointmentToReschedule && (
                <RescheduleModal 
                    appointment={appointmentToReschedule}
                    onClose={() => setAppointmentToReschedule(null)}
                    onConfirm={handleRescheduleConfirm}
                />
             )}
        </div>
    );
}

const PetsScreen: React.FC<{ pets: Pet[]; selectedPet: Pet | null; onSelectPet: (pet: Pet) => void; }> = ({ pets, selectedPet, onSelectPet }) => {
    return (
        <div className="p-4 space-y-4">
             <h1 className="text-3xl font-bold text-slate-800">My Pets</h1>
             <div className="space-y-3">
                {pets.map(pet => (
                    <PetProfileCard key={pet.id} pet={pet} onSelect={() => onSelectPet(pet)} isSelected={selectedPet?.id === pet.id} />
                ))}
             </div>
             {selectedPet && (
                <div className="bg-white p-4 rounded-xl shadow-lg mt-4 animate-fade-in">
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Medical History for {selectedPet.name}</h2>
                    <ul className="list-disc list-inside space-y-1 text-slate-600">
                        {selectedPet.history.map((item, index) => <li key={index}>{item}</li>)}
                    </ul>
                </div>
             )}
        </div>
    )
}

const ShopItemCard: React.FC<{ item: ShopItem; onAddToCart: () => void; }> = ({ item, onAddToCart }) => (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden flex flex-col">
        <img src={item.imageUrl} alt={item.name} className="w-full h-32 object-cover bg-gray-100" />
        <div className="p-4 flex flex-col flex-grow">
            <h3 className="font-bold text-md text-slate-800 flex-grow">{item.name}</h3>
            <p className="text-sm text-slate-500 mt-1 line-clamp-2">{item.description}</p>
            <div className="flex justify-between items-center mt-4">
                <p className="font-extrabold text-slate-800 text-lg">${item.price.toFixed(2)}</p>
                <button onClick={onAddToCart} className="bg-amber-500 text-white font-semibold px-4 py-2 rounded-lg text-sm hover:bg-amber-600 transition">
                    Add
                </button>
            </div>
        </div>
    </div>
);

const ShopScreen: React.FC<{
    shopItems: ShopItem[];
    prescriptions: Prescription[];
    onAddToCart: (item: ShopItem, quantity?: number) => void;
}> = ({ shopItems, prescriptions, onAddToCart }) => {
    const categories = ['All', 'Food', 'Accessory', 'Grooming', 'Pharmacy'] as const;
    type Category = typeof categories[number];
    const [selectedCategory, setSelectedCategory] = useState<Category>('All');
    const [searchTerm, setSearchTerm] = useState('');
    
    const filteredItems = useMemo(() => {
        const pharmacyItems = new Set(prescriptions.map(p => p.itemId));
        let items = shopItems;
        if (selectedCategory === 'Pharmacy') {
            items = shopItems.filter(item => pharmacyItems.has(item.id));
        } else if (selectedCategory !== 'All') {
            items = shopItems.filter(item => item.category === selectedCategory);
        }

        return items.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [shopItems, selectedCategory, searchTerm, prescriptions]);

    const handleAddAllPrescriptions = () => {
        prescriptions.forEach(p => {
            const item = shopItems.find(i => i.id === p.itemId);
            if (item) {
                onAddToCart(item, p.quantity);
            }
        });
    };

    return (
        <div className="p-4 space-y-4">
            <h1 className="text-3xl font-bold text-slate-800">Pet Shop</h1>
            <div className="relative">
                <input
                    type="text"
                    placeholder="Search for products..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full p-3 pl-10 rounded-lg border bg-white border-slate-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
                />
                <Icon name="SearchIcon" className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
            <div className="flex space-x-2 overflow-x-auto pb-2 -mx-4 px-4">
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-4 py-2 rounded-full font-semibold text-sm whitespace-nowrap transition ${selectedCategory === cat ? 'bg-teal-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {selectedCategory === 'Pharmacy' ? (
                <div className="space-y-4">
                    <div className="bg-white p-4 rounded-xl shadow">
                         <div className="flex justify-between items-center mb-2">
                             <h2 className="text-xl font-bold text-slate-800">Your Prescriptions</h2>
                             <button onClick={handleAddAllPrescriptions} className="bg-teal-100 text-teal-800 font-semibold px-3 py-1 rounded-full text-sm hover:bg-teal-200 transition">
                                 Add All to Cart
                             </button>
                         </div>
                        {prescriptions.length > 0 ? (prescriptions.map(p => {
                            const item = shopItems.find(i => i.id === p.itemId);
                            if (!item) return null;
                            return (
                                <div key={p.id} className="border-t py-3 flex items-center space-x-4">
                                    <img src={item.imageUrl} alt={item.name} className="w-16 h-16 rounded-lg object-cover bg-gray-100" />
                                    <div className="flex-grow">
                                        <p className="font-bold">{item.name}</p>
                                        <p className="text-sm text-slate-600">{p.instructions}</p>
                                        <p className="font-semibold text-slate-800 mt-1">${item.price.toFixed(2)}</p>
                                    </div>
                                    <button onClick={() => onAddToCart(item, p.quantity)} className="bg-amber-500 text-white font-semibold px-3 py-1.5 rounded-lg text-sm hover:bg-amber-600 transition">
                                        Add
                                    </button>
                                </div>
                            )
                        })) : (
                            <p className="text-center text-slate-500 py-4 border-t">No active prescriptions.</p>
                        )}
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-4">
                    {filteredItems.length > 0 ? filteredItems.map(item => (
                        <ShopItemCard key={item.id} item={item} onAddToCart={() => onAddToCart(item, 1)} />
                    )) : (
                        <p className="col-span-2 text-center text-slate-500 py-8">No products found.</p>
                    )}
                </div>
            )}
        </div>
    );
};

const MenuItem: React.FC<{ icon: string; text: string; onClick?: () => void; isDanger?: boolean }> = ({ icon, text, onClick, isDanger }) => (
    <button 
        onClick={onClick}
        className={`w-full flex items-center space-x-4 p-3 rounded-lg text-left transition-colors ${
            isDanger 
            ? 'text-red-600 hover:bg-red-50'
            : 'text-slate-700 hover:bg-amber-100'
        }`}
    >
        <Icon name={icon} className="w-6 h-6 flex-shrink-0" />
        <span className="font-semibold">{text}</span>
    </button>
);


const SideMenu: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    pets: Pet[];
    setActiveNav: (nav: NavItemName) => void;
    onSelectPet: (pet: Pet) => void;
}> = ({ isOpen, onClose, pets, setActiveNav, onSelectPet }) => {
    const handlePetClick = (pet: Pet) => {
        onSelectPet(pet);
        setActiveNav('My Pets');
        onClose();
    };
    
    return (
        <div 
            className={`fixed inset-0 z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="menu-title"
        >
            <div className="absolute inset-0 bg-black bg-opacity-50"></div>
            <div 
                className={`relative bg-amber-50 w-80 h-full shadow-xl transition-transform duration-300 flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Profile Section */}
                <div className="p-6 bg-white border-b border-amber-200">
                    <div className="flex items-center space-x-4">
                        <img src="https://picsum.photos/seed/user/200" className="w-16 h-16 rounded-full" alt="User profile picture"/>
                        <div>
                            <p id="menu-title" className="text-xl font-bold">Alex Doe</p>
                            <p className="text-slate-500 text-sm">alex.doe@example.com</p>
                        </div>
                    </div>
                    {/* Pet Previews */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                         <h4 className="text-sm font-semibold text-slate-500 mb-2">Your Pets</h4>
                         <div className="flex items-center space-x-2">
                            {pets.map(pet => (
                                <button key={pet.id} onClick={() => handlePetClick(pet)} className="rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500" title={`View ${pet.name}'s profile`}>
                                    <PetImage petName={pet.name} petBreed={pet.breed} fallbackUrl={pet.imageUrl} className="w-10 h-10 rounded-full object-cover ring-2 ring-white" />
                                </button>
                            ))}
                         </div>
                    </div>
                </div>

                {/* Menu Items */}
                <nav className="p-4 space-y-1 flex-grow">
                    <MenuItem icon="CreditCardIcon" text="Payment Methods" />
                    <MenuItem icon="AdjustmentsHorizontalIcon" text="User Preferences" />
                    <MenuItem icon="QuestionMarkCircleIcon" text="Help & Support" />
                </nav>

                 {/* Log Out Button at the bottom */}
                <div className="p-4 border-t border-amber-200/80">
                    <MenuItem icon="ArrowRightOnRectangleIcon" text="Log Out" isDanger />
                </div>
            </div>
        </div>
    );
};

const ConfirmationBanner: React.FC<{ message: string; onDismiss: () => void }> = ({ message, onDismiss }) => {
    useEffect(() => {
        const timer = setTimeout(onDismiss, 5000); // Auto-dismiss after 5 seconds
        return () => clearTimeout(timer);
    }, [onDismiss]);

    return (
        <div className="sticky top-[73px] z-20 p-2 -mb-2">
            <div className="bg-teal-500 text-white p-3 rounded-lg shadow-lg flex items-center justify-between animate-fade-in-down">
                <div className="flex items-center space-x-3">
                    <Icon name="CheckCircleIcon" className="w-6 h-6" filled />
                    <p className="font-semibold text-sm">{message}</p>
                </div>
                <button onClick={onDismiss} className="text-teal-100 hover:text-white">
                    <Icon name="XIcon" className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};


// -- Main App --

export default function App() {
  // Navigation & Modals
  const [activeNav, setActiveNav] = useState<NavItemName>('Home');
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null);

  // Data State
  const [pets, setPets] = useState<Pet[]>(MOCK_PETS);
  const [clinics, setClinics] = useState<Clinic[]>(MOCK_CLINICS);
  const [appointments, setAppointments] = useState<Appointment[]>(MOCK_APPOINTMENTS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [addresses, setAddresses] = useState<Address[]>(MOCK_ADDRESSES);
  
  // Selection State
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(MOCK_PETS[0] || null);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(MOCK_ADDRESSES[0]?.id || null);
  
  const [highlightedAppointmentId, setHighlightedAppointmentId] = useState<number | null>(null);

  // AI Assistant State
  const [aiChat, setAiChat] = useState<Chat | null>(null);
  const [aiMessages, setAiMessages] = useState<ChatMessage[]>([
    { sender: 'ai', text: "Hello! I'm your AI Concierge. How can I assist you with your pet's needs today? You can ask me about symptoms, appointments, or product recommendations." }
  ]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Derived State
  const selectedAddress = useMemo(() => addresses.find(a => a.id === selectedAddressId), [addresses, selectedAddressId]);
  const upcomingAppointment = useMemo(() => appointments.slice().sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).find(a => a.status === 'upcoming'), [appointments]);
  const cartItemCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

  // -- Handlers --
  
  const handleModalOpen = useCallback((modal: string) => {
    setActiveModal(modal);
  }, []);

  const handleBookAppointment = useCallback((clinic: Clinic) => {
    setSelectedClinic(clinic);
    setActiveModal('appointment');
  }, []);

  const handleBookingConfirm = useCallback((details: { clinic: Clinic; pets: Pet[]; time: string; reasons: { petId: number; reason: string }[] }) => {
    const newAppointments = details.pets.map((pet, index) => {
        const reasonInfo = details.reasons.find(r => r.petId === pet.id);
        return {
            id: Date.now() + index,
            clinic: details.clinic,
            pet: pet,
            date: new Date().toISOString().split('T')[0],
            time: details.time,
            reason: reasonInfo ? reasonInfo.reason : 'N/A',
            status: 'upcoming' as const,
            type: Math.random() > 0.5 ? 'in-person' as const : 'video' as const,
            doctorId: details.clinic.doctors[0]?.id || 0
        };
    });
    setAppointments(prev => [...prev, ...newAppointments]);
    setActiveModal(null);
    setConfirmationMessage(`Appointment booked at ${details.clinic.name} for ${details.time}!`);
  }, []);
  
  const handlePinToggle = useCallback((clinicId: number) => {
    setClinics(prev => prev.map(c => c.id === clinicId ? { ...c, isPinned: !c.isPinned } : c));
  }, []);

  const handleNavigateToAppointment = (appointmentId: number) => {
    setActiveNav('Appointments');
    setHighlightedAppointmentId(appointmentId);
  };

  const handleAddToCart = useCallback((item: ShopItem, quantity = 1) => {
    setCart(prevCart => {
        const existingItem = prevCart.find(cartItem => cartItem.id === item.id);
        if (existingItem) {
            return prevCart.map(cartItem => 
                cartItem.id === item.id ? { ...cartItem, quantity: cartItem.quantity + quantity } : cartItem
            );
        }
        return [...prevCart, { ...item, quantity }];
    });
    setConfirmationMessage(`${item.name} added to cart!`);
  }, []);
  
  const handleUpdateCartQuantity = useCallback((itemId: number, newQuantity: number) => {
      if (newQuantity <= 0) {
          setCart(prev => prev.filter(item => item.id !== itemId));
      } else {
          setCart(prev => prev.map(item => item.id === itemId ? { ...item, quantity: newQuantity } : item));
      }
  }, []);

  const handleRemoveFromCart = useCallback((itemId: number) => {
      setCart(prev => prev.filter(item => item.id !== itemId));
  }, []);

  const handleAddAddress = useCallback((address: Omit<Address, 'id'>) => {
      const newAddress = { ...address, id: Date.now() };
      setAddresses(prev => [...prev, newAddress]);
      setSelectedAddressId(newAddress.id);
  }, []);

  const handleRemoveAddress = useCallback((id: number) => {
      setAddresses(prev => prev.filter(addr => addr.id !== id));
      if (selectedAddressId === id) {
          setSelectedAddressId(prevId => {
              const remaining = addresses.filter(addr => addr.id !== id);
              return remaining.length > 0 ? remaining[0].id : null;
          });
      }
  }, [addresses, selectedAddressId]);
  
  const handleAiInit = useCallback(async () => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const chat = ai.chats.create({ model: 'gemini-2.5-flash' });
        setAiChat(chat);
    } catch (e) {
        console.error("Failed to initialize AI Chat:", e);
        setAiMessages(prev => [...prev, { sender: 'ai', text: "Sorry, I couldn't connect to the AI service. Please try again later." }]);
    }
  }, []);

  const handleAiSendMessage = useCallback(async (message: string) => {
    if (!aiChat) {
        console.error("AI Chat not initialized.");
        return;
    }
    setAiMessages(prev => [...prev, { sender: 'user', text: message }]);
    setIsAiLoading(true);
    
    try {
        const response = await aiChat.sendMessage({ message });
        const text = response.text;
        setAiMessages(prev => [...prev, { sender: 'ai', text }]);
    } catch (e) {
        console.error("AI message failed:", e);
        setAiMessages(prev => [...prev, { sender: 'ai', text: "I'm having trouble responding right now." }]);
    } finally {
        setIsAiLoading(false);
    }
  }, [aiChat]);

  const openAiAssistant = useCallback(() => {
    setActiveModal('ai');
    if (!aiChat) {
      handleAiInit();
    }
  }, [aiChat, handleAiInit]);

  // -- Render Logic --

  const renderScreen = () => {
    switch(activeNav) {
      case 'Home':
        return <HomeScreen 
            clinics={clinics.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0) || a.distance - b.distance)} 
            onBook={handleBookAppointment} 
            onModalOpen={handleModalOpen}
            selectedAddress={selectedAddress}
            onPinToggle={handlePinToggle}
            upcomingAppointment={upcomingAppointment}
            onNavigateToAppointment={handleNavigateToAppointment}
        />;
      case 'Appointments':
        return <AppointmentsScreen 
            appointments={appointments}
            onAddToCart={handleAddToCart}
            highlightedAppointmentId={highlightedAppointmentId}
            onHighlightDone={() => setHighlightedAppointmentId(null)}
        />;
      case 'My Pets':
        return <PetsScreen pets={pets} selectedPet={selectedPet} onSelectPet={setSelectedPet} />;
      case 'Shop':
        return <ShopScreen shopItems={MOCK_SHOP_ITEMS} prescriptions={MOCK_PRESCRIPTIONS} onAddToCart={handleAddToCart} />;
      default:
        return <HomeScreen clinics={clinics} onBook={handleBookAppointment} onModalOpen={handleModalOpen} selectedAddress={selectedAddress} onPinToggle={handlePinToggle} upcomingAppointment={upcomingAppointment} onNavigateToAppointment={handleNavigateToAppointment} />;
    }
  }

  return (
    <div className="min-h-screen w-full max-w-2xl mx-auto bg-amber-50 flex flex-col font-sans">
        <header className="sticky top-0 bg-amber-50/80 backdrop-blur-lg z-30 flex items-center justify-between p-4 border-b border-amber-200/80">
            <button onClick={() => setIsMenuOpen(true)} className="p-2 -ml-2 text-slate-600 hover:text-amber-600">
                <Icon name="MenuIcon" className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold text-amber-900 tracking-tight">Paws & Care</h1>
            <div className="flex items-center space-x-2">
                <button onClick={() => setActiveModal('cart')} className="relative p-2 text-slate-600 hover:text-amber-600">
                    <Icon name="ShoppingBagIcon" className="w-6 h-6" filled={cartItemCount > 0} />
                    {cartItemCount > 0 && (
                        <span className="absolute top-0 right-0 block h-4 w-4 rounded-full bg-red-500 text-white text-xs font-bold ring-2 ring-amber-50">{cartItemCount}</span>
                    )}
                </button>
            </div>
        </header>
        
        <SideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} pets={pets} setActiveNav={setActiveNav} onSelectPet={setSelectedPet} />

        <main className="flex-grow overflow-y-auto pb-24 relative">
             {confirmationMessage && (
                <ConfirmationBanner message={confirmationMessage} onDismiss={() => setConfirmationMessage(null)} />
             )}
            {renderScreen()}
        </main>
        
        {/* Floating AI Assistant Button */}
        <button 
            onClick={openAiAssistant}
            className="fixed bottom-24 right-4 z-20 w-16 h-16 bg-teal-500 rounded-full shadow-lg flex items-center justify-center text-white hover:bg-teal-600 transition-transform transform hover:scale-110"
            aria-label="Open AI Assistant"
        >
            <Icon name="SparklesIcon" className="w-8 h-8"/>
        </button>

        <nav className="fixed bottom-0 left-0 right-0 w-full max-w-2xl mx-auto bg-white/80 backdrop-blur-lg border-t border-gray-200 shadow-t-lg z-30">
            <div className="flex justify-around items-center h-20">
                {NAV_ITEMS.map(({ name, icon }) => (
                    <button 
                        key={name}
                        onClick={() => setActiveNav(name)}
                        className={`flex flex-col items-center justify-center w-full transition-colors duration-200 ${activeNav === name ? 'text-teal-600' : 'text-slate-500 hover:text-teal-500'}`}
                    >
                        <Icon name={icon} className="w-7 h-7" filled={activeNav === name} />
                        <span className={`text-xs mt-1 font-semibold ${activeNav === name ? 'font-bold' : ''}`}>{name}</span>
                    </button>
                ))}
            </div>
        </nav>
        
        {/* Modals */}
        {activeModal === 'appointment' && selectedClinic && (
            <AppointmentModal
                clinic={selectedClinic}
                pets={pets}
                onClose={() => setActiveModal(null)}
                onBook={handleBookingConfirm}
            />
        )}
        {activeModal === 'video' && <VideoConsultationModal onClose={() => setActiveModal(null)} />}
        {activeModal === 'lostPet' && selectedPet && <LostPetModal pet={selectedPet} onClose={() => setActiveModal(null)} />}
        {activeModal === 'cart' && <CartModal cart={cart} onClose={() => setActiveModal(null)} onUpdateQuantity={handleUpdateCartQuantity} onRemove={handleRemoveFromCart} onCheckout={() => alert('Checkout not implemented.')} />}
        {activeModal === 'address' && <AddressModal addresses={addresses} selectedId={selectedAddressId} onClose={() => setActiveModal(null)} onSelect={setSelectedAddressId} onAdd={handleAddAddress} onRemove={handleRemoveAddress} />}
        {activeModal === 'ai' && <AiAssistantModal messages={aiMessages} onClose={() => setActiveModal(null)} onSendMessage={handleAiSendMessage} isLoading={isAiLoading} />}
    </div>
  );
}