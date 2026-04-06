
import React from 'react';
import { motion } from 'framer-motion';
import { Heart, Search } from 'lucide-react';
import { UserRole } from '../types';

interface RoleToggleProps {
    role: UserRole;
    onRoleChange: (role: UserRole) => void;
}

const RoleToggle: React.FC<RoleToggleProps> = ({ role, onRoleChange }) => {
    return (
        <div className="relative flex items-center glass-panel rounded-[2rem] p-1.5 shadow-lg shadow-black/5 w-full max-w-[320px] mx-auto">
            {/* Sliding Indicator */}
            <motion.div
                layout
                transition={{ type: 'spring', stiffness: 500, damping: 35, mass: 0.8 }}
                className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] rounded-[1.5rem] shadow-lg ${role === 'donor'
                        ? 'left-1.5 bg-gradient-to-r from-emerald-500 to-emerald-400'
                        : 'left-[calc(50%+3px)] bg-gradient-to-r from-blue-500 to-blue-400'
                    }`}
            />

            {/* Donor Button */}
            <button
                onClick={() => onRoleChange('donor')}
                className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-3 rounded-[1.5rem] text-[13px] font-black uppercase tracking-wider transition-colors duration-300 ${role === 'donor' ? 'text-white' : 'text-ios-systemGray'
                    }`}
            >
                <Heart size={16} className={role === 'donor' ? 'fill-white/30' : ''} />
                Donor
            </button>

            {/* Receiver Button */}
            <button
                onClick={() => onRoleChange('receiver')}
                className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-3 rounded-[1.5rem] text-[13px] font-black uppercase tracking-wider transition-colors duration-300 ${role === 'receiver' ? 'text-white' : 'text-ios-systemGray'
                    }`}
            >
                <Search size={16} />
                Receiver
            </button>
        </div>
    );
};

export default RoleToggle;
