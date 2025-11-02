import React from 'react';

interface ClinicImageProps {
  clinicName: string;
  clinicAddress: string; 
  fallbackUrl: string;
  className?: string;
}

const ClinicImage: React.FC<ClinicImageProps> = ({ clinicName, clinicAddress, fallbackUrl, className }) => {
  return (
    <img 
      loading="lazy"
      src={fallbackUrl} 
      alt={`Image of ${clinicName}`}
      className={`${className} transition-opacity duration-500 opacity-100`}
    />
  );
};

export default React.memo(ClinicImage);