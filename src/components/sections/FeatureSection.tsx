import React from 'react';
import SectionContainer from '../layout/SectionContainer';
import SectionHeader from '../ui/SectionHeader';
import GridContainer from '../layout/GridContainer';
import FeatureCard from '../ui/FeatureCard';
import { FeatureCard as FeatureCardType } from '../../types';

interface FeatureSectionProps {
  features: FeatureCardType[];
}

const FeatureSection: React.FC<FeatureSectionProps> = ({ features }) => {
  return (
    <SectionContainer background="cream">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="Why SketchyAF?"
          subtitle="Because drawing with stick figures and boosters has never been this entertaining. Or this profitable for our shareholders."
        />
        
        <GridContainer
          columns={{ default: 1, md: 2, lg: 3 }}
          gap="lg"
        >
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              title={feature.title}
              description={feature.description}
              icon={feature.icon}
              color={feature.color}
              isComingSoon={feature.isComingSoon}
              isSubscriberPerk={feature.isSubscriberPerk}
            />
          ))}
        </GridContainer>
      </div>
    </SectionContainer>
  );
};

export default FeatureSection;