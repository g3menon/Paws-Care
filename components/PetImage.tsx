import React from 'react';

interface PetImageProps {
  petName: string;
  petBreed: string;
  fallbackUrl: string;
  className?: string;
}

const PetImage: React.FC<PetImageProps> = ({ petName, petBreed, fallbackUrl, className }) => {
  return (
    <img 
      loading="lazy"
      src={fallbackUrl} 
      alt={`A cute ${petBreed} named ${petName}`}
      className={`${className} transition-opacity duration-500 opacity-100`}
    />
  );
};

export default React.memo(PetImage);