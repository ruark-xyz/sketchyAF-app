import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Trophy, Award, Medal } from 'lucide-react';
import { LeaderboardEntry } from '../../types';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
}

const LeaderboardTable: React.FC<LeaderboardTableProps> = ({ entries }) => {
  // Custom rank icon for top 3
  const RankIcon = ({ rank }: { rank: number }) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-6 w-6 text-accent" />;
      case 2:
        return <Award className="h-6 w-6 text-secondary" />;
      case 3:
        return <Medal className="h-6 w-6 text-primary" />;
      default:
        return <span className="font-semibold">{rank}</span>;
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.05 
      } 
    }
  };
  
  const rowVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3 } }
  };

  return (
    <div className="overflow-x-auto rounded-lg shadow">
      <motion.table 
        className="min-w-full divide-y divide-light-gray"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <thead className="bg-primary/10">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-heading font-semibold text-primary uppercase tracking-wider">
              Rank
            </th>
            <th className="px-6 py-3 text-left text-xs font-heading font-semibold text-primary uppercase tracking-wider">
              Username
            </th>
            <th className="px-6 py-3 text-left text-xs font-heading font-semibold text-primary uppercase tracking-wider">
              Score
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-light-gray">
          {entries.map((entry) => (
            <motion.tr 
              key={entry.id}
              variants={rowVariants}
              className={`${
                entry.rank <= 3 ? 'bg-off-white' : 'hover:bg-off-white'
              } transition-colors duration-150`}
            >
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center justify-center w-8">
                  <RankIcon rank={entry.rank} />
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="font-medium text-dark-gray">
                  <Link 
                    to={`/user/${entry.username}`}
                    className="hover:text-primary transition-colors hover:underline"
                  >
                    {entry.username}
                  </Link>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="font-heading font-semibold text-primary">
                  {entry.score.toLocaleString()}
                </div>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </motion.table>
    </div>
  );
};

export default LeaderboardTable;