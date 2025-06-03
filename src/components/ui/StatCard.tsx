import React from 'react';
import { motion } from 'framer-motion';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, color }) => {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="bg-white p-4 rounded-lg shadow-md border-2 border-dark hand-drawn"
    >
      <div className="flex items-center">
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center mr-4 flex-shrink-0"
          style={{ backgroundColor: color }}
        >
          {icon}
        </div>
        <div>
          <p className="text-medium-gray text-sm">{label}</p>
          <p className="font-heading font-bold text-2xl">{value}</p>
        </div>
      </div>
    </motion.div>
  );
};

export default StatCard;