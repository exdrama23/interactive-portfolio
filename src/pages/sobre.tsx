import React from 'react';
import { ImageSlider } from '../components/ImageSlider';

export function Sobre() {
  return (
    <div className="fadeable relative z-10 w-full text-black font-sans pt-[140px] md:pt-[140px]">
      <ImageSlider />
    </div>
  );
}

export default Sobre;
